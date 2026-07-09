import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:university_social_app/services/problem_service.dart';

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
                              child: Builder(builder: (_) {
                                final author = widget.problem['author'];
                                String roleName = 'ผู้ใช้งานทั่วไป';
                                IconData roleIcon = Icons.person;
                                
                                if (author != null) {
                                  final roleId = author['role_id'];
                                  if (roleId == 1) {
                                    roleName = 'นิสิต มพ.';
                                    roleIcon = Icons.school;
                                  } else if (roleId == 2) {
                                    roleName = 'บุคลากร มพ.';
                                    roleIcon = Icons.work;
                                  } else if (roleId == 4) {
                                    roleName = 'ผู้ดูแลระบบ (Admin)';
                                    roleIcon = Icons.admin_panel_settings;
                                  }
                                }
                                
                                return Row(
                                  children: [
                                    Icon(roleIcon, size: 14, color: upPurple),
                                    const SizedBox(width: 4),
                                    Text(roleName, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: upPurple)),
                                  ],
                                );
                              }),
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
                        
                        if (widget.problem['image_url'] != null && widget.problem['image_url'].isNotEmpty) ...[
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Image.network(
                              widget.problem['image_url'].startsWith('http') 
                                ? widget.problem['image_url'] 
                                : 'http://127.0.0.1:8000/${widget.problem['image_url'].replaceFirst(RegExp(r'^/+'), '').replaceFirst('uploads/', 'uploads/images/').replaceAll('images/images/', 'images/')}',
                              width: double.infinity,
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) => Container(
                                height: 200,
                                width: double.infinity,
                                color: Colors.grey.shade200,
                                child: const Icon(Icons.broken_image, size: 50, color: Colors.grey),
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                        ],
                        
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
                        GestureDetector(
                          onTap: () async {
                            final problemId = widget.problem['id'];
                            setState(() {
                              bool isUpvoted = widget.problem['is_upvoted_by_me'] == true;
                              widget.problem['is_upvoted_by_me'] = !isUpvoted;
                              widget.problem['upvote_count'] = (widget.problem['upvote_count'] ?? 0) + (isUpvoted ? -1 : 1);
                            });
                            final result = await ProblemService.toggleUpvote(problemId);
                            if (result['success'] == true) {
                              setState(() {
                                widget.problem['is_upvoted_by_me'] = result['is_upvoted_by_me'];
                                widget.problem['upvote_count'] = result['upvote_count'];
                              });
                            } else {
                              setState(() {
                                bool isUpvoted = widget.problem['is_upvoted_by_me'] == true;
                                widget.problem['is_upvoted_by_me'] = !isUpvoted;
                                widget.problem['upvote_count'] = (widget.problem['upvote_count'] ?? 0) + (isUpvoted ? -1 : 1);
                              });
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(result['message'] ?? 'โหวตไม่สำเร็จ'), backgroundColor: Colors.red));
                              }
                            }
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: widget.problem['is_upvoted_by_me'] == true ? upPurple.withOpacity(0.1) : Colors.transparent,
                              border: Border.all(color: widget.problem['is_upvoted_by_me'] == true ? upPurple : const Color(0xFFE2E8F0)),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  widget.problem['is_upvoted_by_me'] == true ? Icons.thumb_up : Icons.thumb_up_alt_outlined, 
                                  size: 18, 
                                  color: widget.problem['is_upvoted_by_me'] == true ? upPurple : Colors.grey
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  'มีคนพบปัญหานี้เหมือนกัน ${widget.problem['upvote_count'] ?? 0} คน', 
                                  style: TextStyle(
                                    fontSize: 13, 
                                    fontWeight: FontWeight.bold, 
                                    color: widget.problem['is_upvoted_by_me'] == true ? upPurple : Colors.grey
                                  )
                                ),
                              ],
                            ),
                          ),
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