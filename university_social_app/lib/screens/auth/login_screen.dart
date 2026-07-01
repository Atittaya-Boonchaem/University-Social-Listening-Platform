import 'package:flutter/material.dart';
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
  int _selectedRole = 0; // 0 = Student, 1 = Staff, 2 = Public
  bool _obscurePassword = true;
  bool _isLoading = false;

  final Color upPurple = const Color(0xFF2B164D);

  // Controllers
  final TextEditingController _idController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  @override
  void dispose() {
    _idController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    final scaffoldMessenger = ScaffoldMessenger.of(context);
    String idText = _idController.text.trim();
    final pwdText = _passwordController.text;

    if (idText.isEmpty || pwdText.isEmpty) {
      scaffoldMessenger.showSnackBar(const SnackBar(content: Text('กรุณากรอกข้อมูลให้ครบถ้วน'), backgroundColor: Colors.orange));
      return;
    }

    setState(() => _isLoading = true);

    try {
      Map<String, dynamic> result;

      if (_selectedRole == 0) {
        result = await AuthService.loginStudent(idText, pwdText);
      } else if (_selectedRole == 1) {
        result = await AuthService.loginStaff(idText, pwdText);
      } else {
        result = await AuthService.login(phoneNumber: idText, password: pwdText, expectedRoleId: 3);
      }

      if (!mounted) return;

      if (result['success'] == true) {
        final actualRoleId = result['role_id'] ?? 1;
        if (actualRoleId.toString() == '4') {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (context) => const SuperAdminScreen()),
          );
        } else {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (context) => MainNavigationScreen(roleId: actualRoleId as int?)),
          );
        }
      } else {
        String errorMessage = result['message'] ?? 'เกิดข้อผิดพลาด';
        if (errorMessage == 'บัญชีนี้ไม่มีสิทธิ์เข้าใช้งานในบทบาทนี้') {
          errorMessage = 'ไม่สามารถเข้าสู่ระบบได้ กรุณาตรวจสอบสิทธิ์การใช้งานหรือบัญชีของคุณอีกครั้ง';
        }
        scaffoldMessenger.showSnackBar(SnackBar(content: Text(errorMessage), backgroundColor: Colors.red));
        setState(() => _isLoading = false);
      }
    } catch (e) {
      if (!mounted) return;
      scaffoldMessenger.showSnackBar(SnackBar(content: Text('เกิดข้อผิดพลาด: $e'), backgroundColor: Colors.red));
      setState(() => _isLoading = false);
    }
  }

  Widget _buildLabel(String text) => Padding(
    padding: const EdgeInsets.only(bottom: 8, left: 4),
    child: Text(text, style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF333333))),
  );

  Widget _buildTextField(String hint, {TextEditingController? controller, bool isPassword = false, bool isNumber = false}) {
    return TextField(
      controller: controller,
      obscureText: isPassword && _obscurePassword,
      keyboardType: isNumber ? TextInputType.number : TextInputType.text,
      decoration: InputDecoration(
        hintText: hint,
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE0E0E0))),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE0E0E0))),
        suffixIcon: isPassword ? IconButton(icon: Icon(_obscurePassword ? Icons.visibility : Icons.visibility_off, size: 20), onPressed: () => setState(() => _obscurePassword = !_obscurePassword)) : null,
      ),
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
                    const SizedBox(height: 25),

                    // Role Tabs
                    Row(
                      children: [
                        _buildRoleTab('นิสิต มพ.', 0),
                        const SizedBox(width: 10),
                        _buildRoleTab('บุคลากร', 1),
                        const SizedBox(width: 10),
                        _buildRoleTab('บุคคลทั่วไป', 2),
                      ],
                    ),
                    const SizedBox(height: 25),

                    // Form
                    _buildDynamicForm(),

                    const SizedBox(height: 35),

                    // Action Button
                    SizedBox(
                      width: double.infinity,
                      height: 55,
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _handleSubmit,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: upPurple,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          elevation: 5,
                        ),
                        child: _isLoading 
                          ? const CircularProgressIndicator(color: Colors.white)
                          : const Text('เข้าสู่ระบบ', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                      ),
                    ),

                    const SizedBox(height: 20),
                    
                    // Toggle Mode Button
                    TextButton(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (context) => const RegisterScreen()),
                        );
                      },
                      child: Text(
                        'ยังไม่มีบัญชี? สมัครสมาชิก',
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

  Widget _buildRoleTab(String label, int index) {
    bool isSelected = _selectedRole == index;
    return Expanded(
      child: InkWell(
        onTap: () {
          setState(() {
            _selectedRole = index;
            _idController.clear();
            _passwordController.clear();
          });
        },
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isSelected ? upPurple : Colors.white,
            borderRadius: BorderRadius.circular(10),
            border: isSelected ? Border(bottom: BorderSide(color: Colors.orange.shade400, width: 4)) : Border.all(color: Colors.grey.shade200),
          ),
          child: Center(
            child: Text(label, style: TextStyle(color: isSelected ? Colors.white : Colors.grey.shade700, fontWeight: FontWeight.bold, fontSize: 12)),
          ),
        ),
      ),
    );
  }

  Widget _buildDynamicForm() {
    String idHint = 'รหัสนิสิต (เช่น 66xxxx)';
    String idLabel = 'บัญชีนิสิต';
    String suffix = '@up.ac.th';
    bool useSuffix = true;

    if (_selectedRole == 1) {
      idHint = 'บัญชีบุคลากร';
      idLabel = 'บัญชีบุคลากร';
    } else if (_selectedRole == 2) {
      idHint = 'เบอร์โทรศัพท์';
      idLabel = 'เบอร์โทรศัพท์';
      useSuffix = false;
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildLabel(idLabel),
        if (useSuffix)
          Row(
            children: [
              Expanded(child: _buildTextField(idHint, controller: _idController, isNumber: _selectedRole == 0)),
              const SizedBox(width: 10),
              _buildSuffixBox(suffix),
            ],
          )
        else
          _buildTextField(idHint, controller: _idController, isNumber: true),

        const SizedBox(height: 16),
        _buildLabel('รหัสผ่าน'),
        _buildTextField('รหัสผ่าน', controller: _passwordController, isPassword: true),
      ],
    );
  }

  Widget _buildSuffixBox(String text) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 14),
    decoration: BoxDecoration(color: const Color(0xFFE9E9FF), borderRadius: BorderRadius.circular(10)),
    child: Text(text, style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF2B164D))),
  );
}