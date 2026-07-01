

import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;

class UserManagementView extends StatefulWidget {
  const UserManagementView({super.key});

  @override
  State<UserManagementView> createState() => _UserManagementViewState();
}

class _UserManagementViewState extends State<UserManagementView> {
  final Color upPurple = const Color(0xFF2B164D);
  List<dynamic> _users = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchUsers();
  }

  // 🌟 ฟังก์ชันดึงข้อมูลผู้ใช้งานจาก Backend
  Future<void> _fetchUsers() async {
    setState(() { _isLoading = true; });
    try {
      final response = await http.get(
        Uri.parse('http://localhost:8000/api/v1/users/list'), 
      );

      if (response.statusCode == 200) {
        final dynamic decodedData = jsonDecode(utf8.decode(response.bodyBytes));
        setState(() {
          if (decodedData is List) {
            _users = decodedData;
          } else if (decodedData is Map) {
            _users = decodedData['items'] ?? decodedData['data'] ?? [];
          } else {
            _users = [];
          }
          _isLoading = false;
        });
      } else {
        throw Exception('Failed to load users');
      }
    } catch (e) {
      print("🚨 ดึงข้อมูลผู้ใช้ไม่ได้: $e");
      setState(() { _isLoading = false; });
    }
  }

  // 🌟 ฟังก์ชันจำลองการระงับ/แบนผู้ใช้งาน
  Future<void> _banUser(int userId, String userName) async {
    // 🛠️ เพิ่ม Dialog ยืนยันก่อนแบน ป้องกันการกดผิด
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text('ยืนยันการระงับบัญชี', style: TextStyle(fontWeight: FontWeight.bold)),
          content: Text('คุณแน่ใจหรือไม่ว่าต้องการระงับบัญชี "$userName"? ผู้ใช้นี้จะไม่สามารถเข้าสู่ระบบได้อีก'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('ยกเลิก', style: TextStyle(color: Colors.grey)),
            ),
            TextButton(
              onPressed: () async {
                Navigator.of(context).pop();
                // TODO: ยิง API ระงับบัญชีตรงนี้
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('ระงับบัญชี $userName เรียบร้อยแล้ว'), backgroundColor: Colors.green),
                );
                _fetchUsers(); // รีเฟรชข้อมูล
              },
              child: const Text('ยืนยัน (Ban)', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC), // สีพื้นหลังเทาอ่อนสบายตา
      body: RefreshIndicator(
        onRefresh: _fetchUsers,
        color: upPurple,
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 📝 Header Section
              const Text('🛑 ระบบจัดการผู้ใช้งาน', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
              const SizedBox(height: 8),
              const Text(
                'ประเมินความน่าเชื่อถือ ตักเตือน หรือระงับบัญชี (Ban) ผู้ใช้งานที่มีพฤติกรรมสแปมหรือใช้คำหยาบคาย', 
                style: TextStyle(fontSize: 13, color: Colors.grey, height: 1.4)
              ),
              const SizedBox(height: 20),
              
              // 📋 รายชื่อผู้ใช้งาน
              Expanded(
                child: _isLoading 
                  ? Center(child: CircularProgressIndicator(color: upPurple))
                  : _users.isEmpty 
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.group_off_outlined, size: 60, color: Colors.grey.shade400),
                              const SizedBox(height: 12),
                              const Text('ไม่พบข้อมูลผู้ใช้งานในระบบ', style: TextStyle(color: Colors.grey)),
                            ],
                          ),
                        )
                      : ListView.builder(
                          physics: const AlwaysScrollableScrollPhysics(),
                          itemCount: _users.length,
                          itemBuilder: (context, index) {
                            final user = _users[index];
                            
                            // จำลองตัวแปรสถานะ
                            final isSpam = user['is_spam'] ?? false; 
                            final userName = user['email'] ?? user['username'] ?? 'ไม่ระบุชื่อ';
                            final userRole = user['role'] ?? 'ผู้ใช้งานทั่วไป';

                            return Container(
                              margin: const EdgeInsets.only(bottom: 16),
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: Colors.grey.shade100),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.02),
                                    blurRadius: 10,
                                    offset: const Offset(0, 4),
                                  )
                                ],
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // 👤 ส่วนข้อมูลโปรไฟล์
                                  Row(
                                    children: [
                                      CircleAvatar(
                                        radius: 22,
                                        backgroundColor: isSpam ? const Color(0xFFFEE2E2) : const Color(0xFFF3E8FF), 
                                        child: Icon(isSpam ? Icons.person_off : Icons.person, 
                                          color: isSpam ? const Color(0xFFEF4444) : upPurple),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(userName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF1E293B))),
                                            const SizedBox(height: 4),
                                            Text('สถานะ: $userRole', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                                          ],
                                        ),
                                      ),
                                      // 🏷️ ป้าย Badge มุมขวาบน
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: isSpam ? Colors.red.shade50 : Colors.green.shade50,
                                          borderRadius: BorderRadius.circular(20),
                                          border: Border.all(color: isSpam ? Colors.red.shade100 : Colors.green.shade100)
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(isSpam ? Icons.warning_rounded : Icons.check_circle, 
                                              size: 12, color: isSpam ? Colors.red : Colors.green),
                                            const SizedBox(width: 4),
                                            Text(isSpam ? 'ต้องสงสัย' : 'ปกติ', 
                                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: isSpam ? Colors.red : Colors.green)),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 16),
                                  const Divider(height: 1, color: Color(0xFFF1F5F9)),
                                  const SizedBox(height: 12),
                                  
                                  // 🔘 ส่วนปุ่มเครื่องมือ (จัดวางให้เต็มความกว้างและกดง่ายบนมือถือ)
                                  Row(
                                    children: [
                                      Expanded(
                                        child: OutlinedButton.icon(
                                          onPressed: () {
                                            // TODO: ปุ่มดูประวัติการโพสต์ของผู้ใช้นี้
                                          },
                                          icon: const Icon(Icons.history, size: 16),
                                          label: const Text('ดูประวัติ'),
                                          style: OutlinedButton.styleFrom(
                                            foregroundColor: Colors.blueGrey,
                                            side: BorderSide(color: Colors.grey.shade300),
                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: ElevatedButton.icon(
                                          onPressed: () => _banUser(user['id'] ?? 0, userName),
                                          icon: const Icon(Icons.block, size: 16),
                                          label: const Text('ระงับบัญชี'),
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: const Color(0xFFFEF2F2), // แดงอ่อน
                                            foregroundColor: const Color(0xFFEF4444), // สีตัวหนังสือแดง
                                            elevation: 0,
                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                          ),
                                        ),
                                      ),
                                    ],
                                  )
                                ],
                              ),
                            );
                          },
                        ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}