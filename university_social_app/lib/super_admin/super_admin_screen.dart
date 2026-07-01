
import 'package:flutter/material.dart';
import 'dashboard_view.dart';
import 'user_management_view.dart';
import 'system_settings_view.dart';

class SuperAdminScreen extends StatefulWidget {
  const SuperAdminScreen({super.key});

  @override
  State<SuperAdminScreen> createState() => _SuperAdminScreenState();
}

class _SuperAdminScreenState extends State<SuperAdminScreen> {
  final Color upPurple = const Color(0xFF2B164D);
  int _selectedIndex = 0;

  final List<Widget> _pages = [
    const DashboardView(),
    const UserManagementView(),
    const SystemSettingsView(),
  ];

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
    Navigator.pop(context); // ปิดเมนูสไลด์ (Drawer) อัตโนมัติเมื่อกดเลือกเมนู
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      // 🌟 ใช้ AppBar เพื่อให้มีปุ่ม Hamburger Menu บนมือถือ
      appBar: AppBar(
        title: const Text('Super Admin Center', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.white)),
        backgroundColor: upPurple,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      // 🚪 เปลี่ยน Sidebar เป็น Drawer ที่สไลด์ออกมาได้
      drawer: Drawer(
        child: Column(
          children: [
            DrawerHeader(
              decoration: BoxDecoration(color: upPurple),
              child: const Row(
                children: [
                  Text('👑', style: TextStyle(fontSize: 32)),
                  SizedBox(width: 12),
                  Text(
                    'Super Admin\nCommand Center',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16, height: 1.3),
                  ),
                ],
              ),
            ),
            ListTile(
              leading: const Icon(Icons.dashboard_outlined),
              title: const Text('แดชบอร์ดภาพรวม'),
              selected: _selectedIndex == 0,
              selectedTileColor: upPurple.withOpacity(0.08),
              selectedColor: upPurple,
              onTap: () => _onItemTapped(0),
            ),
            ListTile(
              leading: const Icon(Icons.gavel_outlined),
              title: const Text('คัดกรองผู้ใช้งาน'),
              selected: _selectedIndex == 1,
              selectedTileColor: upPurple.withOpacity(0.08),
              selectedColor: upPurple,
              onTap: () => _onItemTapped(1),
            ),
            ListTile(
              leading: const Icon(Icons.settings_outlined),
              title: const Text('ตั้งค่าระบบ'),
              selected: _selectedIndex == 2,
              selectedTileColor: upPurple.withOpacity(0.08),
              selectedColor: upPurple,
              onTap: () => _onItemTapped(2),
            ),
            
            const Spacer(),
            const Divider(height: 1),
            ListTile(
              leading: const Icon(Icons.logout, color: Colors.redAccent),
              title: const Text('ออกจากระบบแอดมิน', style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold)),
              onTap: () {
                Navigator.of(context).pushNamedAndRemoveUntil('/login', (route) => false);
              },
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
      // 🖥️ Content Area
      body: _pages[_selectedIndex],
    );
  }
}