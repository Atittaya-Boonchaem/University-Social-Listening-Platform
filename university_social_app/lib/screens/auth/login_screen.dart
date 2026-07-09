import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../navigation/main_navigation_screen.dart'; 
import '../../services/auth_service.dart'; 
import '../../super_admin/super_admin_screen.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final Color upPurple = const Color(0xFF2B164D);

  Future<void> _handleAnonymousLogin() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear(); // Clear old tokens
    await prefs.setInt('role_id', 5); // 5 for Anonymous / Guest
    await prefs.setString('display_name', 'ผู้เยี่ยมชม (Guest)');
    
    if (mounted) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const MainNavigationScreen(roleId: 5)),
      );
    }
  }

  void _showPublicUserLoginModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _PublicLoginModal(upPurple: upPurple),
    );
  }

  void _showSSOLoginModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _SSOLoginModal(upPurple: upPurple),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
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
                  color: Colors.white.withOpacity(0.95),
                  borderRadius: BorderRadius.circular(35),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 20, offset: const Offset(0, 10))
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Header
                    const Text('📣 UP', style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Color(0xFF2B164D))),
                    const SizedBox(height: 10),
                    const Text('ระบบรับฟังเสียงและวิเคราะห์ปัญหาของชุมชนมหาวิทยาลัยพะเยา', 
                      textAlign: TextAlign.center, style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF555555))),
                    const SizedBox(height: 5),
                    const Text('เข้าสู่ระบบเพื่อดำเนินการต่อ', 
                      textAlign: TextAlign.center, style: TextStyle(fontSize: 14, color: Colors.grey)),
                    const SizedBox(height: 35),

                    // Primary Section (University Users)
                    SizedBox(
                      width: double.infinity,
                      height: 55,
                      child: ElevatedButton(
                        onPressed: _showSSOLoginModal,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: upPurple,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          elevation: 5,
                        ),
                        child: const Text('เข้าสู่ระบบด้วยบัญชีมหาวิทยาลัย (SSO)', style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
                      ),
                    ),

                    const SizedBox(height: 25),

                    // Divider
                    Row(
                      children: [
                        const Expanded(child: Divider(color: Color(0xFFE0E0E0), thickness: 1)),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                          child: Text('หรือ', style: TextStyle(color: Colors.grey.shade600, fontSize: 12, fontWeight: FontWeight.bold)),
                        ),
                        const Expanded(child: Divider(color: Color(0xFFE0E0E0), thickness: 1)),
                      ],
                    ),

                    const SizedBox(height: 25),

                    // Secondary Section (Other Users)
                    Row(
                      children: [
                        Expanded(
                          child: SizedBox(
                            height: 50,
                            child: ElevatedButton(
                              onPressed: _showPublicUserLoginModal,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFFF1F5F9),
                                foregroundColor: upPurple,
                                elevation: 0,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10),
                                ),
                              ),
                              child: const Text('บุคคลทั่วไป', style: TextStyle(fontWeight: FontWeight.bold)),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: SizedBox(
                            height: 50,
                            child: OutlinedButton(
                              onPressed: _handleAnonymousLogin,
                              style: OutlinedButton.styleFrom(
                                foregroundColor: Colors.grey.shade700,
                                side: BorderSide(color: Colors.grey.shade300),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10),
                                ),
                              ),
                              child: const Text('ไม่ระบุตัวตน', style: TextStyle(fontWeight: FontWeight.bold)),
                            ),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 30),
                    
                    // Register Link
                    TextButton(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (context) => const RegisterScreen()),
                        );
                      },
                      child: Text(
                        'ยังไม่มีบัญชีบุคคลทั่วไป? สมัครสมาชิก',
                        style: TextStyle(color: upPurple, fontWeight: FontWeight.bold),
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
}

// ----------------------------------------------------
// Modal for Public User Login
// ----------------------------------------------------
class _PublicLoginModal extends StatefulWidget {
  final Color upPurple;
  const _PublicLoginModal({required this.upPurple});

  @override
  State<_PublicLoginModal> createState() => _PublicLoginModalState();
}

class _PublicLoginModalState extends State<_PublicLoginModal> {
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscure = true;
  bool _isLoading = false;

  Future<void> _login() async {
    final phone = _phoneController.text.trim();
    final pwd = _passwordController.text;
    if (phone.isEmpty || pwd.isEmpty) return;

    setState(() => _isLoading = true);
    try {
      final result = await AuthService.login(phoneNumber: phone, password: pwd, expectedRoleId: 3);
      if (!mounted) return;

      if (result['success'] == true) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const MainNavigationScreen(roleId: 3)),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(result['message'] ?? 'เข้าสู่ระบบล้มเหลว'), backgroundColor: Colors.red));
        setState(() => _isLoading = false);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('เกิดข้อผิดพลาด: $e'), backgroundColor: Colors.red));
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('เข้าสู่ระบบสำหรับบุคคลทั่วไป', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: widget.upPurple)),
                IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
              ],
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(
                hintText: 'เบอร์โทรศัพท์',
                filled: true,
                fillColor: const Color(0xFFF8F9FA),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _passwordController,
              obscureText: _obscure,
              decoration: InputDecoration(
                hintText: 'รหัสผ่าน',
                filled: true,
                fillColor: const Color(0xFFF8F9FA),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                suffixIcon: IconButton(
                  icon: Icon(_obscure ? Icons.visibility : Icons.visibility_off, color: Colors.grey),
                  onPressed: () => setState(() => _obscure = !_obscure),
                ),
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _login,
                style: ElevatedButton.styleFrom(backgroundColor: widget.upPurple, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                child: _isLoading 
                  ? const CircularProgressIndicator(color: Colors.white)
                  : const Text('เข้าสู่ระบบ', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ----------------------------------------------------
// Modal for SSO Login (Student & Staff)
// ----------------------------------------------------
class _SSOLoginModal extends StatefulWidget {
  final Color upPurple;
  const _SSOLoginModal({required this.upPurple});

  @override
  State<_SSOLoginModal> createState() => _SSOLoginModalState();
}

class _SSOLoginModalState extends State<_SSOLoginModal> {
  final _idController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscure = true;
  bool _isLoading = false;
  int _selectedRole = 0; // 0 = Student, 1 = Staff

  Future<void> _login() async {
    final idText = _idController.text.trim();
    final pwdText = _passwordController.text;
    if (idText.isEmpty || pwdText.isEmpty) return;

    setState(() => _isLoading = true);
    try {
      Map<String, dynamic> result;
      if (_selectedRole == 0) {
        result = await AuthService.loginStudent(idText, pwdText);
      } else {
        result = await AuthService.loginStaff(idText, pwdText);
      }

      if (!mounted) return;

      if (result['success'] == true) {
        final actualRoleId = result['role_id'] ?? 1;
        if (actualRoleId.toString() == '4') {
          Navigator.pushReplacement(context, MaterialPageRoute(builder: (context) => const SuperAdminScreen()));
        } else {
          Navigator.pushReplacement(context, MaterialPageRoute(builder: (context) => MainNavigationScreen(roleId: actualRoleId as int?)));
        }
      } else {
        String errorMessage = result['message'] ?? 'เกิดข้อผิดพลาด';
        if (errorMessage == 'บัญชีนี้ไม่มีสิทธิ์เข้าใช้งานในบทบาทนี้') {
          errorMessage = 'ไม่สามารถเข้าสู่ระบบได้ กรุณาตรวจสอบสิทธิ์การใช้งาน';
        }
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(errorMessage), backgroundColor: Colors.red));
        setState(() => _isLoading = false);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('เกิดข้อผิดพลาด: $e'), backgroundColor: Colors.red));
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('เข้าสู่ระบบด้วยบัญชีมหาวิทยาลัย', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: widget.upPurple)),
                IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
              ],
            ),
            const SizedBox(height: 16),
            
            // Toggle for Student / Staff
            Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _selectedRole = 0),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        color: _selectedRole == 0 ? widget.upPurple : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      alignment: Alignment.center,
                      child: Text('นิสิต มพ.', style: TextStyle(fontWeight: FontWeight.bold, color: _selectedRole == 0 ? Colors.white : Colors.grey.shade600)),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _selectedRole = 1),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        color: _selectedRole == 1 ? widget.upPurple : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      alignment: Alignment.center,
                      child: Text('บุคลากร', style: TextStyle(fontWeight: FontWeight.bold, color: _selectedRole == 1 ? Colors.white : Colors.grey.shade600)),
                    ),
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 20),
            
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _idController,
                    keyboardType: _selectedRole == 0 ? TextInputType.number : TextInputType.text,
                    decoration: InputDecoration(
                      hintText: _selectedRole == 0 ? 'รหัสนิสิต (เช่น 66xxxx)' : 'บัญชีบุคลากร',
                      filled: true,
                      fillColor: const Color(0xFFF8F9FA),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 16),
                  decoration: BoxDecoration(color: const Color(0xFFE9E9FF), borderRadius: BorderRadius.circular(10)),
                  child: Text('@up.ac.th', style: TextStyle(fontWeight: FontWeight.bold, color: widget.upPurple)),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _passwordController,
              obscureText: _obscure,
              decoration: InputDecoration(
                hintText: 'รหัสผ่าน',
                filled: true,
                fillColor: const Color(0xFFF8F9FA),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                suffixIcon: IconButton(
                  icon: Icon(_obscure ? Icons.visibility : Icons.visibility_off, color: Colors.grey),
                  onPressed: () => setState(() => _obscure = !_obscure),
                ),
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _login,
                style: ElevatedButton.styleFrom(backgroundColor: widget.upPurple, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                child: _isLoading 
                  ? const CircularProgressIndicator(color: Colors.white)
                  : const Text('เข้าสู่ระบบ', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}