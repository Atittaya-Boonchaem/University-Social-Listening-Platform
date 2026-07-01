import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class ProblemDetailScreen extends StatefulWidget {
  final dynamic problem; // รับข้อมูลปัญหามาจากการ์ดที่กด
  final int roleId;      // รับ Role เพื่อเช็คว่าเป็นเจ้าหน้าที่ไหม

  const ProblemDetailScreen({super.key, required this.problem, required this.roleId});

  @override
  State<ProblemDetailScreen> createState() => _ProblemDetailScreenState();
}

class _ProblemDetailScreenState extends State<ProblemDetailScreen> {
  final Color upPurple = const Color(0xFF2B164D);
  final _commentController = TextEditingController();

  String _formatDateTime(String? rawDate) {
    if (rawDate == null || rawDate.isEmpty) return '';
    try {
      return DateFormat('HH:mm น. (dd/MM/yyyy)').format(DateTime.parse(rawDate));
    } catch (e) { return ''; }
  }

  // ฟังก์ชันแปลงสถานะเป็นสี
  Color _getStatusColor(String status) {
    switch (status.toUpperCase()) {
      case 'OPEN': return const Color(0xFFF59E0B); // สีส้ม
      case 'IN_PROGRESS': return const Color(0xFF3B82F6); // สีฟ้า
      case 'RESOLVED': return const Color(0xFF10B981); // สีเขียว
      default: return Colors.grey;
    }
  }

  String _getStatusText(String status) {
    switch (status.toUpperCase()) {
      case 'OPEN': return 'รอรับเรื่อง';
      case 'IN_PROGRESS': return 'กำลังดำเนินการ';
      case 'RESOLVED': return 'แก้ไขเรียบร้อย';
      default: return status;
    }
  }

  @override
  Widget build(BuildContext context) {
    final category = widget.problem['category'];
    final building = widget.problem['building'];
    final status = widget.problem['status'] ?? 'OPEN';
    final isStaffPost = widget.problem['is_staff_only'] == true;

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(
        title: const Text('รายละเอียดปัญหา', style: TextStyle(color: Colors.black87, fontWeight: FontWeight.bold, fontSize: 18)),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.black87),
        centerTitle: true,
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 1. กล่องเนื้อหาปัญหา
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10, offset: const Offset(0, 4))],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(color: const Color(0xFFF3E8FF), borderRadius: BorderRadius.circular(20)),
                              child: Row(
                                children: [
                                  Icon(isStaffPost ? Icons.badge : Icons.school, size: 14, color: upPurple),
                                  const SizedBox(width: 4),
                                  Text(isStaffPost ? 'บุคลากร มพ.' : 'นิสิต มพ.', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: upPurple)),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: _getStatusColor(status).withOpacity(0.1), 
                                borderRadius: BorderRadius.circular(8)
                              ),
                              child: Text(_getStatusText(status), style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: _getStatusColor(status))),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        
                        Text(widget.problem['description'] ?? 'ไม่มีรายละเอียด', style: const TextStyle(fontSize: 16, color: Color(0xFF1E293B), height: 1.6)),
                        const SizedBox(height: 16),
                        
                        if (building != null) ...[
                          Row(
                            children: [
                              const Icon(Icons.push_pin, size: 16, color: Color(0xFFE11D48)),
                              const SizedBox(width: 8),
                              Text('พิกัด: ${building['name']}', style: const TextStyle(fontSize: 13, color: Color(0xFF475569))),
                            ],
                          ),
                          const SizedBox(height: 8),
                        ],
                        
                        Row(
                          children: [
                            const Icon(Icons.access_time, size: 16, color: Colors.grey),
                            const SizedBox(width: 8),
                            Text('แจ้งเมื่อ: ${_formatDateTime(widget.problem['created_at'])}', style: const TextStyle(fontSize: 13, color: Colors.grey)),
                          ],
                        ),
                        const SizedBox(height: 16),
                        const Divider(color: Color(0xFFF1F5F9)),
                        const SizedBox(height: 8),
                        
                        // ปุ่มเห็นด้วย
                        Row(
                          children: [
                            Icon(Icons.thumb_up_alt_outlined, size: 18, color: upPurple),
                            const SizedBox(width: 8),
                            Text('มีคนพบปัญหานี้เหมือนกัน ${widget.problem['upvote_count'] ?? 0} คน', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: upPurple)),
                          ],
                        )
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // 2. กล่อง Timeline สถานะ & คอมเมนต์
                  const Text('อัปเดตสถานะจากเจ้าหน้าที่', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF334155))),
                  const SizedBox(height: 12),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10, offset: const Offset(0, 4))],
                    ),
                    child: Column(
                      children: [
                        // จำลองข้อความตอบกลับจากเจ้าหน้าที่ (เดี๋ยวอนาคตต่อ API ดึงจาก Backend ได้)
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            CircleAvatar(backgroundColor: const Color(0xFFE0F2FE), radius: 16, child: Icon(Icons.support_agent, size: 18, color: upPurple)),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      const Text('กองอาคารสถานที่', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                      Text('เพิ่งอัปเดต', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(8)),
                                    child: const Text('รับทราบปัญหาครับ ตอนนี้ได้ส่งทีมช่างเข้าไปตรวจสอบและเตรียมดำเนินการแก้ไขแล้วครับ', style: TextStyle(fontSize: 13, height: 1.5)),
                                  ),
                                ],
                              ),
                            )
                          ],
                        )
                      ],
                    ),
                  )
                ],
              ),
            ),
          ),
          
          // 3. พื้นที่พิมพ์ตอบกลับ (เฉพาะเจ้าหน้าที่/บุคลากรเท่านั้นที่เห็น)
          if (widget.roleId == 1)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, -4))],
              ),
              child: SafeArea(
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _commentController,
                        decoration: InputDecoration(
                          hintText: 'อัปเดตความคืบหน้าให้ผู้แจ้งทราบ...',
                          hintStyle: const TextStyle(fontSize: 13),
                          filled: true,
                          fillColor: const Color(0xFFF1F5F9),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: BorderSide.none),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    CircleAvatar(
                      backgroundColor: upPurple,
                      radius: 22,
                      child: IconButton(
                        icon: const Icon(Icons.send, color: Colors.white, size: 18),
                        onPressed: () {
                          // TODO: อนาคตใส่ฟังก์ชันยิง API อัปเดตสถานะตรงนี้
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('อัปเดตสถานะสำเร็จ!'), backgroundColor: Colors.green));
                          _commentController.clear();
                        },
                      ),
                    )
                  ],
                ),
              ),
            )
        ],
      ),
    );
  }
}