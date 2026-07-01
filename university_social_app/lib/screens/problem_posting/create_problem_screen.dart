

import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class CreateProblemScreen extends StatefulWidget {
  final int roleId; 
  const CreateProblemScreen({super.key, this.roleId = 0});

  @override
  State<CreateProblemScreen> createState() => _CreateProblemScreenState();
}

class _CreateProblemScreenState extends State<CreateProblemScreen> {
  final _descController = TextEditingController();
  bool _isLoading = false;
  
  final Color upPurple = const Color(0xFF2B164D);
  
  String? _selectedCategory; 
  String? _selectedBuilding; 
  String _selectedTime = '06:00 - 08:00 น.';
  bool _isStaffOnly = false; 

  List<dynamic> _categories = [];
  List<dynamic> _buildings = [];

  @override
  void initState() {
    super.initState();
    _fetchDropdownData();
  }

  Future<void> _fetchDropdownData() async {
    try {
      setState(() => _isLoading = true);
      final catResponse = await http.get(Uri.parse('http://127.0.0.1:8000/api/v1/problems/categories'));
      final bldResponse = await http.get(Uri.parse('http://127.0.0.1:8000/api/v1/problems/buildings'));

      if (catResponse.statusCode == 200) {
        final decoded = jsonDecode(utf8.decode(catResponse.bodyBytes));
        setState(() {
          if (decoded['data'] != null && decoded['data']['items'] is List) {
            _categories = decoded['data']['items'];
          } else if (decoded['data'] is List) {
            _categories = decoded['data'];
          }
          if (_categories.isNotEmpty) {
            _selectedCategory = _categories[0]['id'].toString();
          }
        });
      }
      if (bldResponse.statusCode == 200) {
        final decoded = jsonDecode(utf8.decode(bldResponse.bodyBytes));
        setState(() {
          if (decoded['data'] != null && decoded['data']['items'] is List) {
            _buildings = decoded['data']['items'];
          } else if (decoded['data'] is List) {
            _buildings = decoded['data'];
          }
          if (_buildings.isNotEmpty) {
            _selectedBuilding = _buildings[0]['id'].toString();
          }
        });
      }
    } catch (e) {
      print("🚨 ดึงข้อมูลดรอปดาวน์ไม่ได้: $e");
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _submitProblem() async {
    // --- Sync validation (safe to use context here — no async gap yet) ---
    if (_descController.text.length < 10) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('กรุณาอธิบายรายละเอียดอย่างน้อย 10 ตัวอักษร'),
          backgroundColor: Colors.orange,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    if (_selectedCategory == null || _selectedBuilding == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('กำลังโหลดข้อมูลหมวดหมู่หรือสถานที่ กรุณารอสักครู่...'),
          backgroundColor: Colors.orange,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    // --- Capture ScaffoldMessenger BEFORE any async gap ---
    // After the first `await`, `context` may no longer be safe to use.
    final scaffoldMessenger = ScaffoldMessenger.of(context);

    // Start loading — still synchronous at this point, so setState is safe.
    setState(() => _isLoading = true);

    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('access_token');

      // 🔍 DEBUG: ตรวจสอบ token (ลบออกหลัง debug เสร็จ)
      print('🔑 Token in SharedPrefs: ${token != null ? "FOUND (${token.length} chars)" : "NULL - not logged in!"}');

      final response = await http.post(
        Uri.parse('http://127.0.0.1:8000/api/v1/problems/create'),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          "category_id": int.parse(_selectedCategory!),
          "building_id": int.parse(_selectedBuilding!),
          "title": "แจ้งปัญหาจากแอปพลิเคชัน",
          "description": _descController.text,
          "incident_date": DateTime.now().toIso8601String(),
          "incident_time_range": _selectedTime,
          "is_anonymous": false,
          "is_staff_only": widget.roleId == 1 ? _isStaffOnly : false,
        }),
      );

      // Guard: widget may have been unmounted while awaiting the HTTP response.
      if (!mounted) return;

      if (response.statusCode == 201 || response.statusCode == 200) {
        // ✅ สำเร็จ: ล้างฟอร์มและ reset state อยู่ใน tab เดิม
        // ไม่ใช้ navigator.pop() เพราะหน้านี้เป็น tab ไม่ใช่ route แยก
        _descController.clear();
        setState(() {
          _isLoading = false;
          _isStaffOnly = false;
          _selectedTime = '06:00 - 08:00 น.';
          // reset dropdown กลับไปค่าแรก (ถ้ามีข้อมูล)
          if (_categories.isNotEmpty) {
            _selectedCategory = _categories[0]['id'].toString();
          }
          if (_buildings.isNotEmpty) {
            _selectedBuilding = _buildings[0]['id'].toString();
          }
        });
        scaffoldMessenger.showSnackBar(
          const SnackBar(
            content: Text('ส่งรายงานปัญหาสำเร็จ! 🎉'),
            backgroundColor: Colors.green,
            behavior: SnackBarBehavior.floating,
          ),
        );
      } else {
        // ❌ ล้มเหลว: reset loading ให้ผู้ใช้ลองใหม่
        final data = jsonDecode(utf8.decode(response.bodyBytes));
        scaffoldMessenger.showSnackBar(
          SnackBar(
            content: Text(data['message'] ?? 'เกิดข้อผิดพลาดในการส่งข้อมูล'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
        setState(() => _isLoading = false);
      }
    } catch (e) {
      // Guard again: the widget could have unmounted during an error throw.
      if (!mounted) return;
      scaffoldMessenger.showSnackBar(
        SnackBar(
          content: Text('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้: $e'),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating,
        ),
      );
      setState(() => _isLoading = false);
    }
    // ✅ ไม่มี finally block — ป้องกันการ setState บน widget ที่ถูก dispose แล้ว
    // has disposed the widget, which is exactly what caused the original crash.
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('📝 ', style: TextStyle(fontSize: 22)),
            Text('สร้างโพสต์แจ้งปัญหา', style: TextStyle(color: upPurple, fontWeight: FontWeight.bold, fontSize: 18)),
          ],
        ),
        backgroundColor: Colors.white,
        elevation: 0.5,
        iconTheme: IconThemeData(color: upPurple),
        centerTitle: true,
      ),
      body: _isLoading && (_categories.isEmpty || _buildings.isEmpty)
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF2B164D)))
          : Center(
              child: Container(
                constraints: const BoxConstraints(maxWidth: 550),
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(20.0),
                  child: Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 15, offset: const Offset(0, 5))
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Center(
                          child: Text('กรุณากรอกข้อมูลและสถานที่ให้ชัดเจนเพื่อการแก้ไขที่รวดเร็ว', 
                            style: TextStyle(color: Colors.grey, fontSize: 13, fontWeight: FontWeight.w500)),
                        ),
                        const SizedBox(height: 20),
                        
                        Row(
                          children: [
                            const Text('บทบาทของคุณ:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF3E8FF), 
                                borderRadius: BorderRadius.circular(20)
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(widget.roleId == 1 ? Icons.badge : Icons.school, size: 16, color: upPurple),
                                  const SizedBox(width: 6),
                                  Text(
                                    widget.roleId == 1 ? 'บุคลากร มพ.' : 'นิสิต มพ.', 
                                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: upPurple)
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),
                        const Divider(color: Color(0xFFE2E8F0)),
                        const SizedBox(height: 10),
                        
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('หมวดหมู่ปัญหา', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                  const SizedBox(height: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 12),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF8F9FA),
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(color: const Color(0xFFE2E8F0))
                                    ),
                                    child: DropdownButtonHideUnderline(
                                      child: DropdownButton<String>(
                                        value: _selectedCategory,
                                        isExpanded: true,
                                        icon: const Icon(Icons.keyboard_arrow_down, color: Colors.grey),
                                        items: _categories.map((e) => DropdownMenuItem<String>(
                                          value: e['id'].toString(), 
                                          child: Text(e['name'] ?? '', style: const TextStyle(fontSize: 13))
                                        )).toList(),
                                        onChanged: (val) => setState(() => _selectedCategory = val!),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('ช่วงเวลาที่พบ', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                  const SizedBox(height: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 12),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF8F9FA),
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(color: const Color(0xFFE2E8F0))
                                    ),
                                    child: DropdownButtonHideUnderline(
                                      child: DropdownButton<String>(
                                        value: _selectedTime, 
                                        isExpanded: true,
                                        icon: const Icon(Icons.keyboard_arrow_down, color: Colors.grey),
                                        items: <String>[
                                          '06:00 - 08:00 น.', 
                                          '08:00 - 10:00 น.', 
                                          '10:00 - 12:00 น.', 
                                          '12:00 - 14:00 น.', 
                                          '14:00 - 16:00 น.', 
                                          '16:00 - 18:00 น.',
                                          '18:00 - 20:00 น.',
                                          '20:00 - 22:00 น.',
                                        ].map((e) => DropdownMenuItem<String>(
                                          value: e, 
                                          child: Text(e, style: const TextStyle(fontSize: 13))
                                        )).toList(),
                                        onChanged: (val) => setState(() => _selectedTime = val!), 
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 18),
                        
                        const Text('สถานที่ / อาคาร', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8F9FA),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFFE2E8F0))
                          ),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              value: _selectedBuilding,
                              isExpanded: true,
                              icon: const Icon(Icons.keyboard_arrow_down, color: Colors.grey),
                              items: _buildings.map((e) => DropdownMenuItem<String>(
                                value: e['id'].toString(), 
                                child: Text(e['name'] ?? '', style: const TextStyle(fontSize: 13))
                              )).toList(),
                              onChanged: (val) => setState(() => _selectedBuilding = val!),
                            ),
                          ),
                        ),
                        const SizedBox(height: 18),
                        
                        const Text('รายละเอียดปัญหาที่พบเจอ', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _descController,
                          maxLines: 4,
                          decoration: InputDecoration(
                            hintText: 'พิมพ์ข้อความบรรยายปัญหาของคุณ...',
                            hintStyle: const TextStyle(color: Colors.grey, fontSize: 13),
                            filled: true, 
                            fillColor: const Color(0xFFF8F9FA),
                            contentPadding: const EdgeInsets.all(16),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12), 
                              borderSide: const BorderSide(color: Color(0xFFE2E8F0))
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12), 
                              borderSide: const BorderSide(color: Color(0xFFE2E8F0))
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12), 
                              borderSide: BorderSide(color: upPurple, width: 1.5)
                            ),
                          ),
                        ),
                        const SizedBox(height: 18),
                        
                        if (widget.roleId == 1) ...[
                          const Text('สิทธิ์การมองเห็นโพสต์:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          const SizedBox(height: 4),
                          Container(
                            decoration: BoxDecoration(
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                              borderRadius: BorderRadius.circular(12),
                              color: const Color(0xFFF8F9FA)
                            ),
                            child: Column(
                              children: [
                                RadioListTile<bool>(
                                  title: const Text('โพสต์สาธารณะ (ทุกคนเห็นได้)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                                  value: false,
                                  groupValue: _isStaffOnly,
                                  activeColor: upPurple,
                                  dense: true,
                                  onChanged: (val) => setState(() => _isStaffOnly = val!),
                                ),
                                const Divider(height: 1, color: Color(0xFFE2E8F0)),
                                RadioListTile<bool>(
                                  title: const Text('เฉพาะบุคลากร (เห็นเฉพาะภายใน)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                                  value: true,
                                  groupValue: _isStaffOnly,
                                  activeColor: upPurple,
                                  dense: true,
                                  onChanged: (val) => setState(() => _isStaffOnly = val!),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 24),
                        ],
                        
                        SizedBox(
                          width: double.infinity,
                          height: 50,
                          child: ElevatedButton(
                            onPressed: _isLoading ? null : _submitProblem,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: upPurple,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              elevation: 2,
                            ),
                            child: _isLoading 
                              ? const CircularProgressIndicator(color: Colors.white)
                              : const Text('ส่งโพสต์แจ้งปัญหา', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white)),
                          ),
                        )
                      ],
                    ),
                  ),
                ),
              ),
            ),
    );
  }
}