// import 'package:flutter/material.dart';
// import '../../navigation/main_navigation_screen.dart'; 
// import '../../super_admin/super_admin_screen.dart'; 
// import '../../services/auth_service.dart'; 

// // 🌟 Import ฟอร์มย่อยที่เราแยกไฟล์ไว้
// import 'student_form.dart';
// import 'staff_form.dart';
// import 'public_form.dart';

// class LoginScreen extends StatefulWidget {
//   const LoginScreen({super.key});

//   @override
//   State<LoginScreen> createState() => _LoginScreenState();
// }

// class _LoginScreenState extends State<LoginScreen> {
//   int _selectedRole = 0; 
//   final Color upPurple = const Color(0xFF2B164D);
//   bool _obscurePassword = true;
//   bool _isPublicRegisterMode = false;
//   bool _isLoading = false;

//   final TextEditingController _studentIdController = TextEditingController();
//   final TextEditingController _studentPasswordController = TextEditingController();
  
//   final TextEditingController _staffIdController = TextEditingController();
//   final TextEditingController _staffPasswordController = TextEditingController();

//   final TextEditingController _publicPhoneController = TextEditingController();
//   final TextEditingController _publicPasswordController = TextEditingController();
//   final TextEditingController _publicConfirmPasswordController = TextEditingController();

//   @override
//   void dispose() {
//     _studentIdController.dispose();
//     _studentPasswordController.dispose();
//     _staffIdController.dispose();
//     _staffPasswordController.dispose();
//     _publicPhoneController.dispose();
//     _publicPasswordController.dispose();
//     _publicConfirmPasswordController.dispose();
//     super.dispose();
//   }

//   void _resetPublicForms() {
//     setState(() {
//       _isPublicRegisterMode = false;
//       _publicPhoneController.clear();
//       _publicPasswordController.clear();
//       _publicConfirmPasswordController.clear();
//     });
//   }

//   @override
//   Widget build(BuildContext context) {
//     String titleText = 'นิสิต มพ.';
//     String buttonText = 'เข้าสู่ระบบ';

//     if (_selectedRole == 1) {
//       titleText = 'บุคลากร มพ.';
//     } else if (_selectedRole == 2) {
//       titleText = 'บุคคลทั่วไป';
//       buttonText = _isPublicRegisterMode ? 'ลงทะเบียน' : 'ถัดไป';
//     }

//     return Scaffold(
//       backgroundColor: const Color(0xFFF8FAFC),
//       body: Center(
//         child: SingleChildScrollView(
//           child: Padding(
//             padding: const EdgeInsets.symmetric(horizontal: 24.0),
//             child: Card(
//               elevation: 4,
//               shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
//               child: Container(
//                 width: 400,
//                 padding: const EdgeInsets.all(32.0),
//                 child: Column(
//                   mainAxisSize: MainAxisSize.min,
//                   crossAxisAlignment: CrossAxisAlignment.start,
//                   children: [
//                     Center(
//                       child: Column(
//                         children: [
//                           Image.asset('assets/images/up_logo.png', height: 65, errorBuilder: (context, error, stackTrace) {
//                             return const Icon(Icons.school, size: 55, color: Color(0xFF2B164D));
//                           }),
//                           const SizedBox(height: 16),
//                           Text('UP Voice Feed', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: upPurple)),
//                           const SizedBox(height: 4),
//                           const Text('กระดานรับฟังเสียงและปัญหา มพ.', style: TextStyle(fontSize: 13, color: Colors.grey)),
//                         ],
//                       ),
//                     ),
//                     const SizedBox(height: 32),

//                     // 🌟 แถบเลือกสถานะ (นิสิต / บุคลากร / บุคคลทั่วไป)
//                     if (!_isPublicRegisterMode) ...[
//                       Row(
//                         mainAxisAlignment: MainAxisAlignment.center,
//                         children: [
//                           ChoiceChip(
//                             label: const Text('นิสิต', style: TextStyle(fontSize: 12)),
//                             selected: _selectedRole == 0,
//                             selectedColor: upPurple.withOpacity(0.15),
//                             onSelected: (selected) {
//                               if (selected) setState(() => _selectedRole = 0);
//                             },
//                           ),
//                           const SizedBox(width: 8),
//                           ChoiceChip(
//                             label: const Text('บุคลากร', style: TextStyle(fontSize: 12)),
//                             selected: _selectedRole == 1,
//                             selectedColor: upPurple.withOpacity(0.15),
//                             onSelected: (selected) {
//                               if (selected) setState(() => _selectedRole = 1);
//                             },
//                           ),
//                           const SizedBox(width: 8),
//                           ChoiceChip(
//                             label: const Text('บุคคลทั่วไป', style: TextStyle(fontSize: 12)),
//                             selected: _selectedRole == 2,
//                             selectedColor: upPurple.withOpacity(0.15),
//                             onSelected: (selected) {
//                               if (selected) setState(() => _selectedRole = 2);
//                             },
//                           ),
//                         ],
//                       ),
//                       const SizedBox(height: 24),
//                     ],

//                     Row(
//                       children: [
//                         if (_isPublicRegisterMode) 
//                           IconButton(
//                             icon: const Icon(Icons.arrow_back),
//                             onPressed: _resetPublicForms,
//                           ),
//                         Text('เข้าสู่ระบบ : $titleText', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
//                       ],
//                     ),
//                     const SizedBox(height: 20),

//                     // 🌟 เรียกใช้งานฟอร์มย่อยตามประเภทที่ผู้ใช้เลือก
//                     if (_selectedRole == 0) ...[
//                       StudentForm(
//                         idController: _studentIdController,
//                         passwordController: _studentPasswordController,
//                         obscurePassword: _obscurePassword,
//                         onTogglePassword: () => setState(() => _obscurePassword = !_obscurePassword),
//                         upPurple: upPurple,
//                       ),
//                     ] else if (_selectedRole == 1) ...[
//                       StaffForm(
//                         emailController: _staffIdController,
//                         passwordController: _staffPasswordController,
//                         obscurePassword: _obscurePassword,
//                         onTogglePassword: () => setState(() => _obscurePassword = !_obscurePassword),
//                         upPurple: upPurple,
//                       ),
//                     ] else if (_selectedRole == 2) ...[
//                       PublicForm(
//                         phoneController: _publicPhoneController,
//                         isRegisterMode: _isPublicRegisterMode,
//                         passwordController: _publicPasswordController,
//                         confirmPasswordController: _publicConfirmPasswordController,
//                         obscurePassword: _obscurePassword,
//                         onTogglePassword: () => setState(() => _obscurePassword = !_obscurePassword),
//                       ),
//                     ],

//                     const SizedBox(height: 24),

//                     SizedBox(
//                       width: double.infinity,
//                       height: 45,
//                       child: ElevatedButton(
//                         onPressed: _isLoading ? null : () async {
//                           setState(() => _isLoading = true);

//                           if (_selectedRole == 0) {
//                             final result = await AuthService.loginStudent(
//                               _studentIdController.text, 
//                               _studentPasswordController.text
//                             );
//                             setState(() => _isLoading = false);

//                             if (result['success']) {
//                               Navigator.pushReplacement(context, MaterialPageRoute(builder: (context) => MainNavigationScreen(roleId: 0)));
//                             } else {
//                               ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(result['message']), backgroundColor: Colors.red));
//                             }
//                           } 
//                           else if (_selectedRole == 1) {
//                             if (_staffIdController.text == 'admin@up.ac.th' && _staffPasswordController.text == 'admin1234') {
//                               setState(() => _isLoading = false);
//                               Navigator.pushReplacement(context, MaterialPageRoute(builder: (context) => const SuperAdminScreen()));
//                               return;
//                             }
                            
//                             final result = await AuthService.loginStaff(
//                               _staffIdController.text, 
//                               _staffPasswordController.text
//                             );
//                             setState(() => _isLoading = false);

//                             if (result['success']) {
//                               Navigator.pushReplacement(context, MaterialPageRoute(builder: (context) => MainNavigationScreen(roleId: 1)));
//                             } else {
//                               ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(result['message']), backgroundColor: Colors.red));
//                             }
//                           } 
//                           else if (_selectedRole == 2) {
//                             if (!_isPublicRegisterMode) {
//                               setState(() => _isLoading = false);
//                               if (_publicPhoneController.text.isNotEmpty) {
//                                 setState(() => _isPublicRegisterMode = true); // เปิดโหมดตั้งรหัสผ่าน
//                               } else {
//                                 ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('กรุณากรอกเบอร์โทรศัพท์'), backgroundColor: Colors.orange));
//                               }
//                             } else {
//                               if (_publicPasswordController.text != _publicConfirmPasswordController.text) {
//                                 setState(() => _isLoading = false);
//                                 ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('รหัสผ่านไม่ตรงกัน'), backgroundColor: Colors.red));
//                                 return;
//                               }
                              
//                               final result = await AuthService.registerPublic(
//                                 _publicPhoneController.text, 
//                                 _publicPasswordController.text
//                               );
//                               setState(() => _isLoading = false);

//                               if (result['success']) {
//                                 ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(result['message']), backgroundColor: Colors.green));
//                                 Navigator.pushReplacement(context, MaterialPageRoute(builder: (context) => MainNavigationScreen(roleId: 2)));
//                               } else {
//                                 ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(result['message']), backgroundColor: Colors.red));
//                               }
//                             }
//                           }
//                         },
//                         style: ElevatedButton.styleFrom(
//                           backgroundColor: upPurple,
//                           shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
//                           elevation: 0,
//                         ),
//                         child: _isLoading 
//                             ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
//                             : Text(buttonText, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white)),
//                       ),
//                     ),
//                   ],
//                 ),
//               ),
//             ),
//           ),
//         ),
//       ),
//     );
//   }
  
//   // Helper สำหรับเปลี่ยนสถานะ Register Mode
//   set _isRegisterMode(bool value) {
//     setState(() {
//       _isPublicRegisterMode = value;
//     });
//   }
// }




import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../navigation/main_navigation_screen.dart'; 
import '../../super_admin/super_admin_screen.dart'; 
import '../../services/auth_service.dart'; 

import 'student_form.dart';
import 'staff_form.dart';
import 'public_form.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  int _selectedRole = 0; 
  final Color upPurple = const Color(0xFF2B164D);
  bool _obscurePassword = true;
  bool _isPublicRegisterMode = false;
  bool _isLoading = false;

  // Controllers
  final TextEditingController _studentIdController = TextEditingController();
  final TextEditingController _studentPasswordController = TextEditingController();
  final TextEditingController _studentAgeController = TextEditingController();
  
  final TextEditingController _staffIdController = TextEditingController();
  final TextEditingController _staffPasswordController = TextEditingController();
  final TextEditingController _staffAgeController = TextEditingController();

  final TextEditingController _publicPhoneController = TextEditingController();
  final TextEditingController _publicPasswordController = TextEditingController();
  final TextEditingController _publicConfirmPasswordController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    String buttonText = 'เข้าสู่ระบบในฐานะนิสิต';
    if (_selectedRole == 1) buttonText = 'เข้าสู่ระบบในฐานะบุคลากร';
    if (_selectedRole == 2) buttonText = _isPublicRegisterMode ? 'สร้างบัญชีและล็อกอิน' : 'เข้าสู่ระบบในฐานะบุคคลทั่วไป';

    return Scaffold(
      body: Container(
        // 🌟 พื้นหลัง Gradient ม่วง-ทองตามรูป
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFFD8B4E2), Color(0xFFF1DFA8)],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 30),
              child: Container(
                constraints: const BoxConstraints(maxWidth: 450),
                padding: const EdgeInsets.all(28),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.9),
                  borderRadius: BorderRadius.circular(35),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 20, offset: const Offset(0, 10))
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // 📣 ส่วนหัว Header
                    const Text('📣 UP', style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Color(0xFF2B164D))),
                    const SizedBox(height: 10),
                    const Text('ระบบรับฟังเสียงและวิเคราะห์ปัญหาของชุมชนมหาวิทยาลัยพะเยา', 
                      textAlign: TextAlign.center, style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF555555))),
                    const Text('เลือกสถานะของคุณเพื่อเริ่มใช้งาน (ระบบปกปิดตัวตนของคุณ)', 
                      textAlign: TextAlign.center, style: TextStyle(fontSize: 11, color: Colors.grey)),
                    const SizedBox(height: 25),

                    // 📑 แถบเลือก Role
                    Row(
                      children: [
                        _buildRoleTab('นิสิต มพ.', 0),
                        const SizedBox(width: 10),
                        _buildRoleTab('บุคลากร', 1),
                        const SizedBox(width: 10),
                        _buildRoleTab('บุคคลทั่วไป', 2),
                      ],
                    ),
                    const SizedBox(height: 30),

                    // 📝 แสดงฟอร์มตาม Role
                    if (_selectedRole == 0) StudentForm(
                      idController: _studentIdController, 
                      passwordController: _studentPasswordController,
                      ageController: _studentAgeController,
                      obscurePassword: _obscurePassword,
                      onTogglePassword: () => setState(() => _obscurePassword = !_obscurePassword)
                    ),
                    if (_selectedRole == 1) StaffForm(
                      emailController: _staffIdController, 
                      passwordController: _staffPasswordController,
                      ageController: _staffAgeController,
                      obscurePassword: _obscurePassword,
                      onTogglePassword: () => setState(() => _obscurePassword = !_obscurePassword)
                    ),
                    if (_selectedRole == 2) PublicForm(
                      phoneController: _publicPhoneController, 
                      isRegisterMode: _isPublicRegisterMode,
                      passwordController: _publicPasswordController,
                      confirmPasswordController: _publicConfirmPasswordController,
                      obscurePassword: _obscurePassword,
                      onTogglePassword: () => setState(() => _obscurePassword = !_obscurePassword),
                      onBack: () => setState(() => _isPublicRegisterMode = false),
                    ),

                    const SizedBox(height: 35),

                    // 🚀 ปุ่มดำเนินการหลัก
                    if (!(_selectedRole == 2 && _isPublicRegisterMode == false && false)) // เงื่อนไขซ่อนปุ่มถ้าต้องการ
                    SizedBox(
                      width: double.infinity,
                      height: 55,
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _handleLogin,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: upPurple,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          elevation: 5,
                        ),
                        child: _isLoading 
                          ? const CircularProgressIndicator(color: Colors.white)
                          : Text(buttonText, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildRoleTab(String label, int index) {
    bool isSelected = _selectedRole == index;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() { _selectedRole = index; _isPublicRegisterMode = false; }),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isSelected ? upPurple : Colors.white,
            borderRadius: BorderRadius.circular(10),
            border: isSelected ? Border(bottom: BorderSide(color: Colors.orange.shade400, width: 4)) : Border.all(color: Colors.grey.shade200),
          ),
          child: Center(
            child: Text(label, style: TextStyle(color: isSelected ? Colors.white : Colors.grey.shade700, fontWeight: FontWeight.bold, fontSize: 13)),
          ),
        ),
      ),
    );
  }

  Future<void> _handleLogin() async {
    final scaffoldMessenger = ScaffoldMessenger.of(context);

    // กรณีบุคคลทั่วไป: กดครั้งแรก = เปิดโหมดตั้งรหัสผ่าน
    if (_selectedRole == 2 && !_isPublicRegisterMode) {
      if (_publicPhoneController.text.trim().isEmpty) {
        scaffoldMessenger.showSnackBar(const SnackBar(
          content: Text('กรุณากรอกเบอร์โทรศัพท์'),
          backgroundColor: Colors.orange,
        ));
        return;
      }
      setState(() => _isPublicRegisterMode = true);
      return;
    }

    setState(() => _isLoading = true);

    try {
      Map<String, dynamic> result;

      if (_selectedRole == 0) {
        // 🎓 นิสิต: login ด้วย studentId@up.ac.th
        if (_studentIdController.text.trim().isEmpty || _studentPasswordController.text.isEmpty) {
          scaffoldMessenger.showSnackBar(const SnackBar(content: Text('กรุณากรอกรหัสนิสิตและรหัสผ่าน'), backgroundColor: Colors.orange));
          setState(() => _isLoading = false);
          return;
        }
        result = await AuthService.loginStudent(
          _studentIdController.text.trim(),
          _studentPasswordController.text,
        );
      } else if (_selectedRole == 1) {
        // 💼 บุคลากร: login ด้วย email@up.ac.th
        if (_staffIdController.text.trim().isEmpty || _staffPasswordController.text.isEmpty) {
          scaffoldMessenger.showSnackBar(const SnackBar(content: Text('กรุณากรอกบัญชีบุคลากรและรหัสผ่าน'), backgroundColor: Colors.orange));
          setState(() => _isLoading = false);
          return;
        }
        result = await AuthService.loginStaff(
          _staffIdController.text.trim(),
          _staffPasswordController.text,
        );
      } else {
        // 🌍 บุคคลทั่วไป: สมัครสมาชิกก่อน แล้ว login
        if (_publicPasswordController.text.isEmpty) {
          scaffoldMessenger.showSnackBar(const SnackBar(content: Text('กรุณาตั้งรหัสผ่าน'), backgroundColor: Colors.orange));
          setState(() => _isLoading = false);
          return;
        }
        // สมัครสมาชิกก่อน (ถ้า error = อาจมีบัญชีอยู่แล้ว ลอง login ต่อ)
        await AuthService.registerPublic(
          _publicPhoneController.text.trim(),
          _publicPasswordController.text,
        );
        // Login ด้วยเบอร์โทรศัพท์
        result = await AuthService.login(
          phoneNumber: _publicPhoneController.text.trim(),
          password: _publicPasswordController.text,
        );
      }

      if (!mounted) return;

      if (result['success'] == true) {
        // ✅ บันทึก email ไว้แสดงในหน้า Profile
        final prefs = await SharedPreferences.getInstance();
        if (_selectedRole == 0) {
          String email = _studentIdController.text.trim();
          if (!email.contains('@')) email += '@up.ac.th';
          await prefs.setString('email', email);
        } else if (_selectedRole == 1) {
          String email = _staffIdController.text.trim();
          if (!email.contains('@')) email += '@up.ac.th';
          await prefs.setString('email', email);
        } else {
          await prefs.setString('email', _publicPhoneController.text.trim());
        }

        // ✅ อ่าน roleId จริงจาก SharedPreferences (บันทึกโดย AuthService)
        final roleId = prefs.getInt('role_id') ?? _selectedRole;

        if (!mounted) return;
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => MainNavigationScreen(roleId: roleId)),
        );
      } else {
        setState(() => _isLoading = false);
        scaffoldMessenger.showSnackBar(SnackBar(
          content: Text(result['message'] ?? 'เข้าสู่ระบบไม่สำเร็จ'),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating,
        ));
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoading = false);
      scaffoldMessenger.showSnackBar(SnackBar(
        content: Text('เกิดข้อผิดพลาด: $e'),
        backgroundColor: Colors.red,
        behavior: SnackBarBehavior.floating,
      ));
    }
  }
}