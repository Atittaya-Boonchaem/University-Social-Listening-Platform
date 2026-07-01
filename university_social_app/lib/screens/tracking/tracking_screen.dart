



import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
// 🌟 แก้ไข Path การ Import ให้ถูกต้อง (ถอยหลัง 2 โฟลเดอร์)
import '../../services/problem_service.dart'; 

class TrackingScreen extends StatefulWidget {
  const TrackingScreen({super.key});

  @override
  State<TrackingScreen> createState() => _TrackingScreenState();
}

class _TrackingScreenState extends State<TrackingScreen> {
  final Color upPurple = const Color(0xFF2B164D);

  // 📌 ตัวกรองสถานะปัจจุบัน (0 = ทั้งหมด, 1 = รอรับเรื่อง, 2 = กำลังดำเนินการ, 3 = แก้ไขเรียบร้อย)
  int _selectedFilterIndex = 0;

  // 🌟 ตัวแปรเก็บข้อมูลจริงจาก API และสถานะการโหลด
  List<dynamic> _myReports = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchReports();
  }

  // 🌟 ฟังก์ชันดึงข้อมูลปัญหาทั้งหมดจาก Backend
  Future<void> _fetchReports() async {
    try {
      setState(() => _isLoading = true);
      
      // เรียกใช้ API เฉพาะปัญหาของผู้ใช้ที่ล็อกอินอยู่
      final data = await ProblemService.getMyProblems();
      
      if (mounted) {
        setState(() {
          _myReports = data;
        });
      }
    } catch (e) {
      print("🚨 ดึงข้อมูลรายงานปัญหาไม่ได้: $e");
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  String _formatDateTime(String rawDate) {
    if (rawDate.isEmpty) return 'ไม่ระบุเวลา';
    try {
      // แปลงเวลาให้เป็นโซนเวลาท้องถิ่น
      final parsedDate = DateTime.parse(rawDate).toLocal();
      return DateFormat('dd/MM/yyyy HH:mm').format(parsedDate);
    } catch (e) {
      return rawDate;
    }
  }

  Color _getStatusColor(String status) {
    switch (status.toUpperCase()) {
      case 'OPEN':
        return const Color(0xFFF59E0B); 
      case 'IN_PROGRESS':
        return const Color(0xFF0EA5E9); 
      case 'RESOLVED':
        return const Color(0xFF10B981); 
      case 'CLOSED':
        return Colors.grey.shade600;
      default:
        return Colors.grey;
    }
  }

  String _getStatusText(String status) {
    switch (status.toUpperCase()) {
      case 'OPEN':
        return 'รอรับเรื่อง';
      case 'IN_PROGRESS':
        return 'กำลังดำเนินการ';
      case 'RESOLVED':
        return 'แก้ไขเรียบร้อย';
      case 'CLOSED':
        return 'ปิดงานแล้ว';
      default:
        return 'ไม่ระบุ';
    }
  }

  IconData _getCategoryIcon(String category) {
    if (category.contains('สถานที่') || category.contains('อาคาร')) return Icons.apartment;
    if (category.contains('รถเมล์')) return Icons.directions_bus;
    if (category.contains('ความสะอาด')) return Icons.cleaning_services;
    if (category.contains('IT') || category.contains('ไอที')) return Icons.computer;
    return Icons.report_problem;
  }

  @override
  Widget build(BuildContext context) {
    // 🌟 ฟิลเตอร์ข้อมูลตามสถานะที่รับมาจากฐานข้อมูลจริง
    List<dynamic> filteredReports = _myReports.where((report) {
      final status = report['status']?.toString().toUpperCase() ?? '';
      if (_selectedFilterIndex == 1) return status == 'OPEN';
      if (_selectedFilterIndex == 2) return status == 'IN_PROGRESS';
      if (_selectedFilterIndex == 3) return status == 'RESOLVED' || status == 'CLOSED';
      return true; // กรณีเลือก "ทั้งหมด" (index == 0)
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(
        title: const Text('🔔 ติดตามสถานะปัญหา',
            style: TextStyle(
                fontWeight: FontWeight.bold,
                color: Colors.black87,
                fontSize: 18)),
        backgroundColor: Colors.white,
        elevation: 1,
        centerTitle: true,
      ),
      body: Column(
        children: [
          // 🎛️ แถบ Filter การกรองข้อมูล
          Container(
            height: 60,
            color: Colors.white,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: [
                _buildFilterChip('ทั้งหมด', 0),
                const SizedBox(width: 8),
                _buildFilterChip('รอรับเรื่อง', 1, const Color(0xFFF59E0B)),
                const SizedBox(width: 8),
                _buildFilterChip('กำลังดำเนินการ', 2, const Color(0xFF0EA5E9)),
                const SizedBox(width: 8),
                _buildFilterChip('แก้ไขเรียบร้อย', 3, const Color(0xFF10B981)),
              ],
            ),
          ),
          
          // 📜 รายการแสดงผล
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF2B164D)))
                : filteredReports.isEmpty
                    ? const Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.assignment_outlined, size: 60, color: Colors.grey),
                            SizedBox(height: 12),
                            Text('ไม่พบรายการแจ้งปัญหาในสถานะนี้',
                                style: TextStyle(color: Colors.grey, fontSize: 15)),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(20),
                        itemCount: filteredReports.length,
                        itemBuilder: (context, index) {
                          final report = filteredReports[index];
                          final status = report['status']?.toString() ?? 'OPEN';
                          
                          // 🌟 ดึงข้อมูลหมวดหมู่ (รองรับโครงสร้างแบบ Nested JSON)
                          final categoryData = report['category'];
                          final categoryName = categoryData != null ? categoryData['name'] : 'หมวดหมู่ทั่วไป';
                          
                          final description = report['description'] ?? 'ไม่มีรายละเอียด';
                          final createdAt = report['created_at'] ?? '';
                          final staffReply = report['staff_reply'];

                          return Container(
                            margin: const EdgeInsets.only(bottom: 20),
                            padding: const EdgeInsets.all(20),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: Colors.grey.shade200),
                              boxShadow: [
                                BoxShadow(
                                    color: Colors.black.withOpacity(0.03),
                                    blurRadius: 8,
                                    offset: const Offset(0, 2))
                              ],
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Row(
                                      children: [
                                        CircleAvatar(
                                          backgroundColor: upPurple.withOpacity(0.08),
                                          radius: 18,
                                          child: Icon(
                                              _getCategoryIcon(categoryName),
                                              color: upPurple,
                                              size: 18),
                                        ),
                                        const SizedBox(width: 10),
                                        Text(
                                          categoryName.replaceAll(RegExp(r'[^\w\sก-๙/]'), '').trim(), // ลบ Emoji ออกถ้ามี
                                          style: TextStyle(
                                              fontWeight: FontWeight.bold,
                                              fontSize: 14,
                                              color: upPurple),
                                        ),
                                      ],
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 12, vertical: 6),
                                      decoration: BoxDecoration(
                                        color: _getStatusColor(status).withOpacity(0.12),
                                        borderRadius: BorderRadius.circular(20),
                                      ),
                                      child: Text(
                                        _getStatusText(status),
                                        style: TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.bold,
                                            color: _getStatusColor(status)),
                                      ),
                                    ),
                                  ],
                                ),
                                const Divider(height: 24, color: Color(0xFFF1F5F9)),
                                Text(
                                  description,
                                  style: const TextStyle(
                                      fontSize: 14,
                                      height: 1.5,
                                      color: Color(0xFF334155)),
                                ),
                                const SizedBox(height: 12),
                                Row(
                                  children: [
                                    const Icon(Icons.access_time,
                                        size: 14, color: Colors.grey),
                                    const SizedBox(width: 6),
                                    Text(
                                      'แจ้งเมื่อ: ${_formatDateTime(createdAt)}',
                                      style: const TextStyle(
                                          fontSize: 11, color: Colors.grey),
                                    ),
                                  ],
                                ),
                                if (staffReply != null && staffReply.toString().isNotEmpty) ...[
                                  const SizedBox(height: 12),
                                  const Divider(height: 16, color: Color(0xFFF1F5F9)),
                                  Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF8FAFC),
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(color: Colors.grey.shade100),
                                    ),
                                    child: Row(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Icon(Icons.support_agent,
                                            size: 16, color: Color(0xFF0EA5E9)),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              const Text('เจ้าหน้าที่ดูแลระบบ:',
                                                  style: TextStyle(
                                                      fontSize: 11,
                                                      fontWeight: FontWeight.bold,
                                                      color: Colors.grey)),
                                              const SizedBox(height: 2),
                                              Text(
                                                staffReply.toString(),
                                                style: const TextStyle(
                                                    fontSize: 13,
                                                    height: 1.4,
                                                    color: Color(0xFF475569)),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ]
                              ],
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
      // 🌟 ปุ่มรีเฟรชข้อมูล (ให้ผู้ใช้กดโหลดข้อมูลใหม่ได้)
      floatingActionButton: FloatingActionButton(
        onPressed: _fetchReports,
        backgroundColor: upPurple,
        mini: true,
        child: const Icon(Icons.refresh, color: Colors.white),
      ),
    );
  }

  // 🏷️ ชิปปุ่มกดเลือกสถานะการกรอง
  Widget _buildFilterChip(String label, int index, [Color? activeColor]) {
    final isSelected = _selectedFilterIndex == index;
    final colorToUse = activeColor ?? upPurple;

    return Center(
      child: ChoiceChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (selected) {
          setState(() {
            _selectedFilterIndex = index;
          });
        },
        selectedColor: colorToUse.withOpacity(0.15),
        backgroundColor: Colors.white,
        labelStyle: TextStyle(
          color: isSelected ? colorToUse : Colors.grey.shade600,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          fontSize: 13,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(
            color: isSelected ? colorToUse : Colors.grey.shade300,
          ), 
        ),
        showCheckmark: false,
      ),
    );
  }
}