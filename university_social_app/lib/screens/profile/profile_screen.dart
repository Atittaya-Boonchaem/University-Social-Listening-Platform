
// import 'package:flutter/material.dart';
// import 'package:shared_preferences/shared_preferences.dart';
// import '../auth/login_screen.dart'; // สำหรับนำทางกลับไปหน้า Login เมื่อกด Logout
// // 🌟 นำเข้า API Service (ปรับ Path ให้ถูกต้อง)
// import '../../services/problem_service.dart';

// class ProfileScreen extends StatefulWidget {
//   final int? roleId; // อนุญาตให้เป็น null ได้ป้องกัน Error

//   const ProfileScreen({super.key, this.roleId});

//   @override
//   State<ProfileScreen> createState() => _ProfileScreenState();
// }

// class _ProfileScreenState extends State<ProfileScreen> {
//   final Color upPurple = const Color(0xFF2B164D);
  
//   // 🌟 ตัวแปรเก็บสถิติและข้อมูลผู้ใช้จาก Backend
//   int _totalProblems = 0;
//   int _resolvedProblems = 0;
//   bool _isLoading = true;
//   String _userIdentifier = "กำลังโหลดข้อมูล...";

//   @override
//   void initState() {
//     super.initState();
//     _loadProfileData();
//   }

//   // 🌟 ฟังก์ชันดึงข้อมูลจาก API และ SharedPreferences
//   Future<void> _loadProfileData() async {
//     try {
//       // 1. ดึงข้อมูลประจำตัวจากที่เครื่องเคยบันทึกไว้ตอน Login
//       final prefs = await SharedPreferences.getInstance();
//       final savedEmail = prefs.getString('email');
      
//       // กำหนดค่า Default ตาม Role หากไม่มีข้อมูลในเครื่อง
//       String defaultId = widget.roleId == 0 
//           ? 'รหัสนิสิต: 66000000' 
//           : widget.roleId == 1 
//               ? 'รหัสบุคลากร: ST0000' 
//               : 'เบอร์โทรศัพท์: 0800000000';

//       // 2. ดึงข้อมูลปัญหาจาก Backend
//       final problemsData = await ProblemService.getProblems();

//       if (mounted) {
//         setState(() {
//           _userIdentifier = savedEmail ?? defaultId;
          
//           // นับจำนวนปัญหาทั้งหมด
//           _totalProblems = problemsData.length;
          
//           // นับจำนวนปัญหาที่แก้ไขแล้ว (RESOLVED หรือ CLOSED)
//           _resolvedProblems = problemsData.where((p) {
//             final status = p['status']?.toString().toUpperCase() ?? '';
//             return status == 'RESOLVED' || status == 'CLOSED';
//           }).length;
          
//           _isLoading = false;
//         });
//       }
//     } catch (e) {
//       if (mounted) setState(() => _isLoading = false);
//     }
//   }

//   // 🏷️ แปลง roleId เป็นข้อความสถานะ
//   String _getRoleName(int roleId) {
//     switch (roleId) {
//       case 0:
//         return 'นิสิตมหาวิทยาลัยพะเยา';
//       case 1:
//         return 'บุคลากร / เจ้าหน้าที่';
//       case 2:
//         return 'บุคคลทั่วไป / ผู้ปกครอง';
//       default:
//         return 'ผู้ใช้งานทั่วไป';
//     }
//   }

//   // 🎨 ไอคอนประจำสถานะ
//   IconData _getRoleIcon(int roleId) {
//     switch (roleId) {
//       case 0:
//         return Icons.school;
//       case 1:
//         return Icons.badge;
//       case 2:
//         return Icons.public;
//       default:
//         return Icons.person;
//     }
//   }

//   // 🚪 ฟังก์ชันออกจากระบบ
//   void _showLogoutDialog(BuildContext context) {
//     showDialog(
//       context: context,
//       builder: (BuildContext context) {
//         return AlertDialog(
//           shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
//           title: const Text('ออกจากระบบ', style: TextStyle(fontWeight: FontWeight.bold)),
//           content: const Text('คุณต้องการออกจากระบบใช่หรือไม่?'),
//           actions: [
//             TextButton(
//               onPressed: () => Navigator.of(context).pop(),
//               child: const Text('ยกเลิก', style: TextStyle(color: Colors.grey)),
//             ),
//             TextButton(
//               onPressed: () async {
//                 // ล้างข้อมูลใน SharedPreferences ก่อนออก
//                 final prefs = await SharedPreferences.getInstance();
//                 await prefs.clear();
                
//                 if (!context.mounted) return;
//                 // นำทางกลับไปหน้า Login และเคลียร์ Stack ทั้งหมด
//                 Navigator.pushAndRemoveUntil(
//                   context,
//                   MaterialPageRoute(builder: (context) => const LoginScreen()),
//                   (Route<dynamic> route) => false,
//                 );
//               },
//               child: const Text('ออกจากระบบ', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
//             ),
//           ],
//         );
//       },
//     );
//   }

//   @override
//   Widget build(BuildContext context) {
//     final int safeRoleId = widget.roleId ?? 0;

//     return Scaffold(
//       extendBodyBehindAppBar: true, 
//       appBar: AppBar(
//         title: const Text(
//           '👤 ข้อมูลส่วนตัว',
//           style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF2B164D), fontSize: 20),
//         ),
//         backgroundColor: Colors.transparent, 
//         elevation: 0,
//         centerTitle: true,
//       ),
//       body: Container(
//         width: double.infinity,
//         height: double.infinity,
//         decoration: const BoxDecoration(
//           gradient: LinearGradient(
//             begin: Alignment.topLeft,
//             end: Alignment.bottomRight,
//             colors: [Color(0xFFD8B4E2), Color(0xFFF1DFA8)],
//           ),
//         ),
//         child: SafeArea(
//           child: SingleChildScrollView(
//             padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
//             child: Container(
//               padding: const EdgeInsets.all(24),
//               decoration: BoxDecoration(
//                 color: Colors.white.withOpacity(0.95), 
//                 borderRadius: BorderRadius.circular(24),
//                 boxShadow: [
//                   BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 20, offset: const Offset(0, 10))
//                 ],
//               ),
//               child: Column(
//                 children: [
//                   // 🖼️ รูปโปรไฟล์ดีไซน์ใหม่ ลอยขึ้นมานิดๆ
//                   Container(
//                     padding: const EdgeInsets.all(4),
//                     decoration: BoxDecoration(
//                       color: Colors.white,
//                       shape: BoxShape.circle,
//                       boxShadow: [
//                         BoxShadow(color: upPurple.withOpacity(0.2), blurRadius: 10, offset: const Offset(0, 5))
//                       ]
//                     ),
//                     child: CircleAvatar(
//                       radius: 45,
//                       backgroundColor: const Color(0xFFF3E8FF),
//                       child: Icon(_getRoleIcon(safeRoleId), size: 45, color: upPurple),
//                     ),
//                   ),
//                   const SizedBox(height: 16),
                  
//                   // 📝 ข้อมูลชื่อและสถานะ
//                   Text(
//                     _userIdentifier, // 🌟 แสดงอีเมลหรือรหัสประจำตัวที่ดึงมา
//                     style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
//                   ),
//                   const SizedBox(height: 8),
//                   Container(
//                     padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
//                     decoration: BoxDecoration(
//                       color: upPurple.withOpacity(0.1),
//                       borderRadius: BorderRadius.circular(20),
//                     ),
//                     child: Text(
//                       _getRoleName(safeRoleId),
//                       style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: upPurple),
//                     ),
//                   ),
//                   const SizedBox(height: 32),

//                   // 📋 เมนูรายการต่างๆ
//                   Container(
//                     decoration: BoxDecoration(
//                       color: const Color(0xFFF8FAFC),
//                       borderRadius: BorderRadius.circular(16),
//                       border: Border.all(color: Colors.grey.shade200),
//                     ),
//                     child: Column(
//                       children: [
//                         ListTile(
//                           leading: CircleAvatar(
//                             backgroundColor: Colors.amber.shade50,
//                             child: const Icon(Icons.assignment, color: Colors.amber),
//                           ),
//                           title: const Text('ปัญหาที่เคยแจ้งทั้งหมด', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
//                           trailing: _isLoading 
//                             ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
//                             : Text('$_totalProblems เรื่อง', style: const TextStyle(color: Colors.grey, fontSize: 13, fontWeight: FontWeight.bold)),
//                         ),
//                         const Divider(height: 1, color: Color(0xFFE2E8F0)),
//                         ListTile(
//                           leading: CircleAvatar(
//                             backgroundColor: Colors.green.shade50,
//                             child: const Icon(Icons.check_circle, color: Colors.green),
//                           ),
//                           title: const Text('เรื่องที่ได้รับการแก้ไขแล้ว', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
//                           trailing: _isLoading 
//                             ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
//                             : Text('$_resolvedProblems เรื่อง', style: const TextStyle(color: Colors.grey, fontSize: 13, fontWeight: FontWeight.bold)),
//                         ),
//                         const Divider(height: 1, color: Color(0xFFE2E8F0)),
//                         ListTile(
//                           leading: CircleAvatar(
//                             backgroundColor: Colors.blue.shade50,
//                             child: const Icon(Icons.help_outline, color: Colors.blue),
//                           ),
//                           title: const Text('คู่มือการใช้งานระบบ', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
//                           trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: Colors.grey),
//                           onTap: () {},
//                         ),
//                       ],
//                     ),
//                   ),
//                   const SizedBox(height: 32),

//                   // 🔴 ปุ่มออกจากระบบ
//                   SizedBox(
//                     width: double.infinity,
//                     height: 50,
//                     child: ElevatedButton.icon(
//                       onPressed: () => _showLogoutDialog(context),
//                       style: ElevatedButton.styleFrom(
//                         backgroundColor: const Color(0xFFFEF2F2), 
//                         foregroundColor: const Color(0xFFDC2626), 
//                         elevation: 0,
//                         shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
//                       ),
//                       icon: const Icon(Icons.logout, size: 20),
//                       label: const Text(
//                         'ออกจากระบบ (Logout)',
//                         style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
//                       ),
//                     ),
//                   ),
//                 ],
//               ),
//             ),
//           ),
//         ),
//       ),
//     );
//   }
// }



















import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../auth/login_screen.dart'; 
import '../../services/problem_service.dart';

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

  @override
  void initState() {
    super.initState();
    _loadProfileData();
  }

  Future<void> _loadProfileData() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedEmail = prefs.getString('email');
      
      // 🌟 แก้ไข: จับคู่ ID ให้ตรงกับ Database (1=นิสิต, 2=บุคลากร, 3=ทั่วไป)
      String defaultId = widget.roleId == 1 
          ? 'รหัสนิสิต: 66000000' 
          : widget.roleId == 2 
              ? 'รหัสบุคลากร: ST0000' 
              : 'เบอร์โทรศัพท์: 0800000000';

      // ดึงเฉพาะปัญหาของผู้ใช้ปัจจุบัน (กรองตาม JWT)
      final problemsData = await ProblemService.getMyProblems();

      if (mounted) {
        setState(() {
          _userIdentifier = savedEmail ?? defaultId;
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
      case 1: return 'นิสิตมหาวิทยาลัยพะเยา';
      case 2: return 'บุคลากร / เจ้าหน้าที่';
      case 3: return 'บุคคลทั่วไป / ผู้ปกครอง';
      default: return 'ผู้ใช้งานทั่วไป';
    }
  }

  // 🌟 แก้ไข: จับคู่ไอคอนให้ตรงกับ Database
  IconData _getRoleIcon(int roleId) {
    switch (roleId) {
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
    // 🌟 รับค่า roleId ที่ถูกต้อง (ถ้าไม่มีค่าจะให้เป็น 1 คือนิสิต)
    final int safeRoleId = widget.roleId ?? 1;

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
                  const SizedBox(height: 32),

                  Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
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
                          title: const Text('คู่มือการใช้งานระบบ', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                          trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: Colors.grey),
                          onTap: () {},
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),

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
}