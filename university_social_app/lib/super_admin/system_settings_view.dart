

import 'package:flutter/material.dart';
import 'category_management_screen.dart';
import 'building_management_screen.dart'; // 🌟 นำเข้าหน้าจัดการอาคาร

class SystemSettingsView extends StatelessWidget {
  const SystemSettingsView({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('⚙️ ตั้งค่าส่วนกลาง (Master Data)', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87)),
            const SizedBox(height: 8),
            const Text('จัดการข้อมูลกลางของระบบมหาวิทยาลัย', style: TextStyle(fontSize: 13, color: Colors.grey)),
            const SizedBox(height: 20),
            
            Column(
              children: [
                Card(
                  elevation: 1,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  child: ListTile(
                    contentPadding: const EdgeInsets.all(16),
                    leading: const Icon(Icons.category, color: Color(0xFF2B164D), size: 30),
                    title: const Text('จัดการหมวดหมู่ปัญหา', style: TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: const Text('เพิ่ม/แก้ไข/ลบ หมวดหมู่'),
                    trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (context) => const CategoryManagementScreen()),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 12),
                Card(
                  elevation: 1,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  child: ListTile(
                    contentPadding: const EdgeInsets.all(16),
                    leading: const Icon(Icons.apartment, color: Color(0xFF2B164D), size: 30),
                    title: const Text('จัดการอาคารสถานที่', style: TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: const Text('เพิ่ม/แก้ไข รายชื่ออาคาร'),
                    trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                    onTap: () {
                      // 🌟 สั่งนำทางไปยังหน้า BuildingManagementScreen เมื่อกดปุ่มนี้
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (context) => const BuildingManagementScreen()),
                      );
                    },
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}