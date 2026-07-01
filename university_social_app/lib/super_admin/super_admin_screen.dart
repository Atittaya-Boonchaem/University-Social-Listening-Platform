import 'package:flutter/material.dart';
import 'dashboard_view.dart';
import 'user_management_view.dart';
import 'system_settings_view.dart';
import 'problems_management_view.dart';

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
    const ProblemsManagementView(),
    const UserManagementView(),
    const SystemSettingsView(),
  ];

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      body: Row(
        children: [
          // 🖥️ Persistent Fixed Sidebar
          Container(
            width: 260,
            color: upPurple,
            child: Column(
              children: [
                const SizedBox(height: 40),
                const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text('👑', style: TextStyle(fontSize: 32)),
                    SizedBox(width: 12),
                    Text(
                      'Super Admin\nDashboard',
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18, height: 1.3),
                    ),
                  ],
                ),
                const SizedBox(height: 40),
                _buildNavItem(Icons.dashboard_outlined, 'Dashboard', 0),
                _buildNavItem(Icons.list_alt_outlined, 'Problems Management', 1),
                _buildNavItem(Icons.people_alt_outlined, 'User Management', 2),
                _buildNavItem(Icons.settings_outlined, 'System Settings', 3),
                
                const Spacer(),
                const Divider(color: Colors.white24, height: 1),
                ListTile(
                  leading: const Icon(Icons.logout, color: Colors.redAccent),
                  title: const Text('Logout', style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold)),
                  onTap: () {
                    Navigator.of(context).pushNamedAndRemoveUntil('/login', (route) => false);
                  },
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
          
          // 🖥️ Content Area
          Expanded(
            child: Column(
              children: [
                // Top Header Bar
                Container(
                  height: 60,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    boxShadow: [
                      BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 2))
                    ]
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Row(
                    children: [
                      Text(
                        _getPageTitle(_selectedIndex),
                        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                      ),
                      const Spacer(),
                      const CircleAvatar(
                        backgroundColor: Color(0xFFF1F5F9),
                        child: Icon(Icons.person, color: Color(0xFF64748B)),
                      )
                    ],
                  ),
                ),
                // Main Content
                Expanded(
                  child: _pages[_selectedIndex],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _getPageTitle(int index) {
    switch(index) {
      case 0: return 'Overview Dashboard';
      case 1: return 'Problems Management';
      case 2: return 'User Management';
      case 3: return 'System Settings';
      default: return 'Dashboard';
    }
  }

  Widget _buildNavItem(IconData icon, String title, int index) {
    final bool isSelected = _selectedIndex == index;
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: isSelected ? Colors.white.withOpacity(0.15) : Colors.transparent,
        borderRadius: BorderRadius.circular(8),
      ),
      child: ListTile(
        leading: Icon(icon, color: isSelected ? Colors.white : Colors.white70),
        title: Text(title, style: TextStyle(color: isSelected ? Colors.white : Colors.white70, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
        onTap: () => _onItemTapped(index),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    );
  }
}