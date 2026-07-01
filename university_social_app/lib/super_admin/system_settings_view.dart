import 'package:flutter/material.dart';
import 'category_management_screen.dart';
import 'building_management_screen.dart'; // 🌟 นำเข้าหน้าจัดการอาคาร

class SystemSettingsView extends StatelessWidget {
  const SystemSettingsView({super.key});

  final Color upPurple = const Color(0xFF2B164D);

  Widget _buildSettingsCard(BuildContext context, String title, String subtitle, IconData icon, Widget targetScreen) {
    return InkWell(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => targetScreen),
        );
      },
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.grey.shade200),
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
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: upPurple.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: upPurple, size: 32),
            ),
            const Spacer(),
            Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
            const SizedBox(height: 8),
            Text(subtitle, style: const TextStyle(fontSize: 13, color: Colors.grey)),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('System Settings', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
            const SizedBox(height: 8),
            Text('Manage master data and application-wide configurations.', style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
            const SizedBox(height: 32),
            
            Expanded(
              child: GridView.count(
                crossAxisCount: 3,
                crossAxisSpacing: 24,
                mainAxisSpacing: 24,
                childAspectRatio: 1.2,
                children: [
                  _buildSettingsCard(
                    context, 
                    'Categories Management', 
                    'Add, edit, or remove problem categories.', 
                    Icons.category, 
                    const CategoryManagementScreen()
                  ),
                  _buildSettingsCard(
                    context, 
                    'Building Management', 
                    'Add, edit, or remove buildings and locations.', 
                    Icons.apartment, 
                    const BuildingManagementScreen()
                  ),
                  // Mockup cards for future features
                  Opacity(
                    opacity: 0.5,
                    child: _buildSettingsCard(
                      context, 
                      'Email Templates', 
                      'Configure automated email responses (Coming Soon).', 
                      Icons.email_outlined, 
                      const Placeholder()
                    ),
                  ),
                  Opacity(
                    opacity: 0.5,
                    child: _buildSettingsCard(
                      context, 
                      'API Integrations', 
                      'Manage webhook integrations (Coming Soon).', 
                      Icons.api_outlined, 
                      const Placeholder()
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}