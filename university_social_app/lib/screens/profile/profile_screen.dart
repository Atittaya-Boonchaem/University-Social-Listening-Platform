import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../auth/login_screen.dart'; 
import '../../services/problem_service.dart';
import '../../super_admin/super_admin_screen.dart';

class ProfileScreen extends StatefulWidget {
  final int? roleId; 

  const ProfileScreen({super.key, this.roleId});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final Color upPurple = const Color(0xFF2B164D);
  
  int _totalProblems = 0;
  int _resolvedProblems = 0;
  bool _isLoading = true;
  String _userIdentifier = "กำลังโหลดข้อมูล...";
  String _userEmail = "";
  String? _studentId;
  int? _roleId;
  
  String? _faculty;
  String? _educationLevel;
  int? _age;
  String? _gender;
  String? _phoneNumber;
  String? _relationship;

  @override
  void initState() {
    super.initState();
    _loadProfileData();
  }

  Future<void> _loadProfileData() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedEmail = prefs.getString('email');
      final savedDisplayName = prefs.getString('display_name');
      final savedRoleId = prefs.getInt('role_id');
      final savedStudentId = prefs.getString('student_id');
      
      final savedFaculty = prefs.getString('faculty');
      final savedEducationLevel = prefs.getString('education_level');
      final savedAge = prefs.getInt('age');
      final savedGender = prefs.getString('gender');
      final savedPhoneNumber = prefs.getString('phone_number');
      final savedRelationship = prefs.getString('relationship');
      
      int currentRoleId = savedRoleId ?? widget.roleId ?? 1;
      
      String defaultId = currentRoleId == 1 
          ? 'รหัสนิสิต: 66000000' 
          : currentRoleId == 2 
              ? 'รหัสบุคลากร: ST0000' 
              : 'เบอร์โทรศัพท์: 0800000000';

      // ดึงเฉพาะปัญหาของผู้ใช้ปัจจุบัน (กรองตาม JWT)
      List<dynamic> problemsData = [];
      if (currentRoleId != 5 && currentRoleId != 4) {
        problemsData = await ProblemService.getMyProblems();
      }

      if (mounted) {
        setState(() {
          _roleId = currentRoleId;
          _userIdentifier = savedDisplayName ?? 'ผู้ใช้งานทั่วไป';
          _userEmail = savedEmail ?? defaultId;
          _studentId = savedStudentId;
          
          _faculty = savedFaculty;
          _educationLevel = savedEducationLevel;
          _age = savedAge;
          _gender = savedGender;
          _phoneNumber = savedPhoneNumber;
          _relationship = savedRelationship;

          _totalProblems = problemsData.length;
          
          _resolvedProblems = problemsData.where((p) {
            final status = p['status']?.toString().toUpperCase() ?? '';
            return status == 'RESOLVED' || status == 'CLOSED';
          }).length;
          
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // 🌟 แก้ไข: จับคู่ชื่อสถานะให้ตรงกับ Database
  String _getRoleName(int roleId) {
    switch (roleId) {
      case 4: return 'ผู้ดูแลระบบ (Super Admin)';
      case 5: return 'ผู้เยี่ยมชม (Guest)';
      case 1:
        String studentPrefix = '';
        if (_studentId != null && _studentId!.length >= 2) {
          studentPrefix = ' ${_studentId!.substring(0, 2)}';
        }
        return 'นิสิต มพ.$studentPrefix';
      case 2: return 'บุคลากร / เจ้าหน้าที่';
      case 3: return 'บุคคลทั่วไป / ผู้ปกครอง';
      default: return 'ผู้ใช้งานทั่วไป';
    }
  }

  // 🌟 แก้ไข: จับคู่ไอคอนให้ตรงกับ Database
  IconData _getRoleIcon(int roleId) {
    switch (roleId) {
      case 4: return Icons.admin_panel_settings;
      case 1: return Icons.school;
      case 2: return Icons.badge;
      case 3: return Icons.public;
      default: return Icons.person;
    }
  }

  void _showLogoutDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text('ออกจากระบบ', style: TextStyle(fontWeight: FontWeight.bold)),
          content: const Text('คุณต้องการออกจากระบบใช่หรือไม่?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('ยกเลิก', style: TextStyle(color: Colors.grey)),
            ),
            TextButton(
              onPressed: () async {
                final prefs = await SharedPreferences.getInstance();
                await prefs.clear();
                
                if (!context.mounted) return;
                Navigator.pushAndRemoveUntil(
                  context,
                  MaterialPageRoute(builder: (context) => const LoginScreen()),
                  (Route<dynamic> route) => false,
                );
              },
              child: const Text('ออกจากระบบ', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    // 🌟 รับค่า _roleId ที่โหลดมา หรือใช้ widget.roleId เป็น fallback
    final int safeRoleId = _roleId ?? widget.roleId ?? 1;

    return Scaffold(
      extendBodyBehindAppBar: true, 
      appBar: AppBar(
        title: const Text(
          '👤 ข้อมูลส่วนตัว',
          style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF2B164D), fontSize: 20),
        ),
        backgroundColor: Colors.transparent, 
        elevation: 0,
        centerTitle: true,
      ),
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFFD8B4E2), Color(0xFFF1DFA8)],
          ),
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.95), 
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 20, offset: const Offset(0, 10))
                ],
              ),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(color: upPurple.withOpacity(0.2), blurRadius: 10, offset: const Offset(0, 5))
                      ]
                    ),
                    child: CircleAvatar(
                      radius: 45,
                      backgroundColor: const Color(0xFFF3E8FF),
                      child: Icon(_getRoleIcon(safeRoleId), size: 45, color: upPurple),
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  Text(
                    _userIdentifier, 
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                  ),
                  const SizedBox(height: 4),
                  if (_userEmail.isNotEmpty)
                    Text(
                      _userEmail, 
                      style: const TextStyle(fontSize: 14, color: Colors.grey),
                    ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                    decoration: BoxDecoration(
                      color: upPurple.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      _getRoleName(safeRoleId),
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: upPurple),
                    ),
                  ),
                  const SizedBox(height: 24),

                  if (_faculty != null || _educationLevel != null || _age != null || _gender != null || _phoneNumber != null || _relationship != null)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.grey.shade200),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('ข้อมูลเพิ่มเติม', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF1E293B))),
                          const SizedBox(height: 12),
                          if (_faculty != null) _buildProfileField('คณะ', _faculty!),
                          if (_educationLevel != null) _buildProfileField('ระดับการศึกษา', _educationLevel!),
                          if (_age != null) _buildProfileField('อายุ', '$_age ปี'),
                          if (_gender != null) _buildProfileField('เพศ', _gender!),
                          if (_phoneNumber != null) _buildProfileField('เบอร์โทรศัพท์', _phoneNumber!),
                          if (_relationship != null) _buildProfileField('ความสัมพันธ์', _relationship!),
                        ],
                      ),
                    ),

                  const SizedBox(height: 24),

                  Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Material(
                      color: Colors.transparent,
                      child: Column(
                        children: [
                          ListTile(
                          leading: CircleAvatar(
                            backgroundColor: Colors.amber.shade50,
                            child: const Icon(Icons.assignment, color: Colors.amber),
                          ),
                          title: const Text('ปัญหาที่เคยแจ้งทั้งหมด', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                          trailing: _isLoading 
                            ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                            : Text('$_totalProblems เรื่อง', style: const TextStyle(color: Colors.grey, fontSize: 13, fontWeight: FontWeight.bold)),
                        ),
                        const Divider(height: 1, color: Color(0xFFE2E8F0)),
                        ListTile(
                          leading: CircleAvatar(
                            backgroundColor: Colors.green.shade50,
                            child: const Icon(Icons.check_circle, color: Colors.green),
                          ),
                          title: const Text('เรื่องที่ได้รับการแก้ไขแล้ว', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                          trailing: _isLoading 
                            ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                            : Text('$_resolvedProblems เรื่อง', style: const TextStyle(color: Colors.grey, fontSize: 13, fontWeight: FontWeight.bold)),
                        ),
                        const Divider(height: 1, color: Color(0xFFE2E8F0)),
                        ListTile(
                          leading: CircleAvatar(
                            backgroundColor: Colors.blue.shade50,
                            child: const Icon(Icons.help_outline, color: Colors.blue),
                          ),
                          title: const Text('ช่วยเหลือ', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                          trailing: const Icon(Icons.arrow_forward_ios, size: 16, color: Colors.grey),
                          onTap: () {},
                        ),
                      ],
                    ),
                  ),
                ),
                  const SizedBox(height: 32),

                  // if (['2', '4'].contains(_roleId.toString()))
                  //   Padding(
                  //     padding: const EdgeInsets.only(bottom: 16.0),
                  //     child: ElevatedButton.icon(
                  //       onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (context) => const SuperAdminScreen())),
                  //       icon: const Icon(Icons.rocket_launch, color: Colors.white),
                  //       label: const Text('🚀 เข้าสู่ระบบ Super Admin Dashboard', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                  //       style: ElevatedButton.styleFrom(
                  //         backgroundColor: _roleId.toString() == '4' ? Colors.orange.shade700 : const Color(0xFF2B164D),
                  //         minimumSize: const Size(double.infinity, 55),
                  //         shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  //       ),
                  //     ),
                  //   ),

                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton.icon(
                      onPressed: () => _showLogoutDialog(context),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFFEF2F2), 
                        foregroundColor: const Color(0xFFDC2626), 
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: const Icon(Icons.logout, size: 20),
                      label: const Text(
                        'ออกจากระบบ (Logout)',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildProfileField(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(label, style: const TextStyle(color: Colors.grey, fontSize: 13, fontWeight: FontWeight.w600)),
          ),
          Expanded(
            child: Text(value, style: const TextStyle(color: Color(0xFF333333), fontSize: 13, fontWeight: FontWeight.w500)),
          ),
        ],
      ),
    );
  }
}