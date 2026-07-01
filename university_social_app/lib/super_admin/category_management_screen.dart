

import 'package:flutter/material.dart';

class CategoryManagementScreen extends StatefulWidget {
  const CategoryManagementScreen({super.key});

  @override
  State<CategoryManagementScreen> createState() => _CategoryManagementScreenState();
}

class _CategoryManagementScreenState extends State<CategoryManagementScreen> {
  final Color upPurple = const Color(0xFF2B164D);
  
  // 📋 ข้อมูลจำลองหมวดหมู่พร้อมสถิติจำลอง
  List<Map<String, dynamic>> _categories = [
    {'name': 'อาคารสถานที่', 'icon': Icons.domain, 'resolved': 8, 'pending': 4, 'total': 12, 'color': const Color(0xFF10B981)}, // เขียว
    {'name': 'ความสะอาด', 'icon': Icons.cleaning_services, 'resolved': 6, 'pending': 2, 'total': 8, 'color': const Color(0xFF3B82F6)}, // ฟ้า
    {'name': 'ระบบ IT', 'icon': Icons.category, 'resolved': 5, 'pending': 2, 'total': 7, 'color': const Color(0xFFF59E0B)}, // ส้ม
    {'name': 'รถเมล์ มพ.', 'icon': Icons.directions_bus, 'resolved': 10, 'pending': 2, 'total': 12, 'color': const Color(0xFFEF4444)}, // แดง
  ];

  final TextEditingController _categoryController = TextEditingController();

  void _showAddCategoryDialog() {
    _categoryController.clear();
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text('เพิ่มหมวดหมู่ปัญหา', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          content: TextField(
            controller: _categoryController,
            decoration: InputDecoration(
              hintText: 'เช่น โรงอาหาร, หอพัก...',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('ยกเลิก', style: TextStyle(color: Colors.grey)),
            ),
            ElevatedButton(
              onPressed: () {
                if (_categoryController.text.trim().isNotEmpty) {
                  setState(() {
                    _categories.add({
                      'name': _categoryController.text.trim(),
                      'icon': Icons.category, 
                      'resolved': 0, 'pending': 0, 'total': 0,
                      'color': upPurple
                    });
                  });
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('เพิ่มหมวดหมู่เรียบร้อยแล้ว'), backgroundColor: Colors.green),
                  );
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: upPurple, foregroundColor: Colors.white),
              child: const Text('บันทึก'),
            ),
          ],
        );
      },
    );
  }

  void _deleteCategory(int index) {
    setState(() {
      _categories.removeAt(index);
    });
  }

  // 🌟 ฟังก์ชันช่วยสร้างการ์ดหมวดหมู่แบบใหม่
  Widget _buildCategoryCard(int index) {
    final category = _categories[index];
    final color = category['color'] as Color;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
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
          // 👤 Header ของการ์ด (ไอคอนและชื่อ)
          Row(
            children: [
              CircleAvatar(
                radius: 22,
                backgroundColor: color.withOpacity(0.1), 
                child: Icon(category['icon'], color: color, size: 24),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(category['name'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF1E293B))),
                    const SizedBox(height: 4),
                    Text('มีเรื่องร้องเรียน ${category['total']} เรื่อง', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                  ],
                ),
              ),
              // 🏷️ ไอคอน UP ที่มุมขวาบน
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: upPurple.withOpacity(0.06),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text('UP Voice', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: upPurple)),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Divider(height: 1, color: Color(0xFFF1F5F9)),
          const SizedBox(height: 12),
          
          // 🔘 ส่วนปุ่ม Action
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {
                    // TODO: ปุ่มแก้ไขหมวดหมู่
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
                  onPressed: () => _deleteCategory(index),
                  icon: const Icon(Icons.delete_outline, size: 16),
                  label: const Text('ลบหมวดหมู่'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFFEF2F2), 
                    foregroundColor: const Color(0xFFEF4444), 
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
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(
        title: const Text('จัดการหมวดหมู่ปัญหา', style: TextStyle(color: Colors.black87, fontWeight: FontWeight.bold, fontSize: 18)),
        backgroundColor: Colors.white,
        elevation: 1,
        iconTheme: const IconThemeData(color: Colors.black87),
      ),
      body: _categories.isEmpty
          ? const Center(child: Text('ไม่มีหมวดหมู่ในระบบ', style: TextStyle(color: Colors.grey)))
          : ListView.builder(
              padding: const EdgeInsets.all(20),
              itemCount: _categories.length,
              itemBuilder: (context, index) {
                return _buildCategoryCard(index); // 🌟 ใช้การ์ดแบบใหม่
              },
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddCategoryDialog,
        backgroundColor: upPurple,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('เพิ่มหมวดหมู่', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
    );
  }
}