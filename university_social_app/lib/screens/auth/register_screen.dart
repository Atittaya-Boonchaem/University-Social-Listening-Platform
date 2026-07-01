import 'package:flutter/material.dart';
import '../../services/auth_service.dart';
import '../../navigation/main_navigation_screen.dart';
import '../../super_admin/super_admin_screen.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  int _selectedRole = 0; // 0 = Student, 1 = Staff, 2 = Public
  bool _obscurePassword = true;
  bool _isLoading = false;

  final Color upPurple = const Color(0xFF2B164D);

  // Controllers
  final TextEditingController _idController = TextEditingController(); // ID or Email or Phone
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _confirmPasswordController = TextEditingController();
  final TextEditingController _ageController = TextEditingController();

  // Dropdown states
  String? _selectedFaculty;
  String? _selectedEducationLevel;
  String? _selectedGender;
  String? _selectedRelationship;

  final List<String> _faculties = [
    "คณะเกษตรศาสตร์และทรัพยากรธรรมชาติ",
    "คณะทันตแพทยศาสตร์",
    "คณะเทคโนโลยีสารสนเทศและการสื่อสาร",
    "คณะนิติศาสตร์",
    "คณะบริหารธุรกิจและนิเทศศาสตร์",
    "คณะพยาบาลศาสตร์",
    "คณะพลังงานและสิ่งแวดล้อม",
    "คณะแพทยศาสตร์",
    "คณะเภสัชศาสตร์",
    "คณะรัฐศาสตร์และสังคมศาสตร์",
    "คณะวิทยาศาสตร์",
    "คณะวิทยาศาสตร์การแพทย์",
    "คณะวิศวกรรมศาสตร์",
    "คณะศิลปศาสตร์",
    "คณะสถาปัตยกรรมศาสตร์และศิลปกรรมศาสตร์",
    "คณะสหเวชศาสตร์",
    "คณะสาธารณสุขศาสตร์",
    "วิทยาลัยการศึกษา",
    "วิทยาลัยการจัดการ",
  ];

  final List<String> _educationLevels = ["ปริญญาตรี", "ปริญญาโท", "ปริญญาเอก"];
  final List<String> _genders = ["ชาย", "หญิง", "ไม่ระบุ"];
  final List<String> _relationships = ["ผู้ปกครอง", "ศิษย์เก่า", "บุคคลภายนอก"];

  @override
  void dispose() {
    _idController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _ageController.dispose();
    super.dispose();
  }

  void _resetForm() {
    _idController.clear();
    _passwordController.clear();
    _confirmPasswordController.clear();
    _ageController.clear();
    _selectedFaculty = null;
    _selectedEducationLevel = null;
    _selectedGender = null;
    _selectedRelationship = null;
    setState(() {});
  }

  Future<void> _handleRegister() async {
    final scaffoldMessenger = ScaffoldMessenger.of(context);
    final idText = _idController.text.trim();
    final pwdText = _passwordController.text;
    final confirmPwdText = _confirmPasswordController.text;
    final ageText = _ageController.text.trim();

    if (idText.isEmpty || pwdText.isEmpty) {
      scaffoldMessenger.showSnackBar(const SnackBar(content: Text('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน'), backgroundColor: Colors.orange));
      return;
    }

    if ((_selectedRole == 0 || _selectedRole == 1 || _selectedRole == 2) && pwdText != confirmPwdText) {
      scaffoldMessenger.showSnackBar(const SnackBar(content: Text('รหัสผ่านไม่ตรงกัน'), backgroundColor: Colors.red));
      return;
    }

    setState(() => _isLoading = true);

    try {
      Map<String, dynamic> result;
      int? parsedAge = ageText.isNotEmpty ? int.tryParse(ageText) : null;

      if (_selectedRole == 0) {
        result = await AuthService.registerStudent(
          studentId: idText,
          password: pwdText,
          faculty: _selectedFaculty,
          educationLevel: _selectedEducationLevel,
          age: parsedAge,
          gender: _selectedGender,
        );
      } else if (_selectedRole == 1) {
        result = await AuthService.registerStaff(
          email: idText,
          password: pwdText,
          age: parsedAge,
        );
      } else {
        result = await AuthService.registerPublic(
          phoneNumber: idText,
          password: pwdText,
          relationship: _selectedRelationship,
        );
      }

      // Auto login after successful register
      if (result['success'] == true) {
        if (_selectedRole == 0) {
          result = await AuthService.loginStudent(idText, pwdText);
        } else if (_selectedRole == 1) {
          result = await AuthService.loginStaff(idText, pwdText);
        } else {
          result = await AuthService.login(phoneNumber: idText, password: pwdText, expectedRoleId: 3);
        }
      }

      if (!mounted) return;

      if (result['success'] == true) {
        final actualRoleId = result['role_id'] ?? (_selectedRole == 0 ? 1 : (_selectedRole == 1 ? 2 : 3));
        if (actualRoleId.toString() == '4') {
          Navigator.pushAndRemoveUntil(
            context,
            MaterialPageRoute(builder: (context) => const SuperAdminScreen()),
            (route) => false,
          );
        } else {
          Navigator.pushAndRemoveUntil(
            context,
            MaterialPageRoute(builder: (context) => MainNavigationScreen(roleId: actualRoleId as int?)),
            (route) => false,
          );
        }
      } else {
        scaffoldMessenger.showSnackBar(SnackBar(content: Text(result['message'] ?? 'เกิดข้อผิดพลาด'), backgroundColor: Colors.red));
        setState(() => _isLoading = false);
      }
    } catch (e) {
      if (!mounted) return;
      scaffoldMessenger.showSnackBar(SnackBar(content: Text('เกิดข้อผิดพลาด: $e'), backgroundColor: Colors.red));
      setState(() => _isLoading = false);
    }
  }

  Widget _buildRoleTab(String label, int index) {
    bool isSelected = _selectedRole == index;
    return Expanded(
      child: InkWell(
        onTap: () {
          setState(() {
            _selectedRole = index;
            _resetForm();
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
            child: Text(label, style: TextStyle(color: isSelected ? Colors.white : Colors.grey.shade700, fontWeight: FontWeight.bold, fontSize: 13)),
          ),
        ),
      ),
    );
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
        suffixIcon: isPassword 
            ? IconButton(icon: Icon(_obscurePassword ? Icons.visibility : Icons.visibility_off, size: 20), onPressed: () => setState(() => _obscurePassword = !_obscurePassword)) 
            : null,
      ),
    );
  }

  Widget _buildDropdown(String hint, String? value, List<String> items, Function(String?) onChanged) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFE0E0E0)),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          isExpanded: true,
          hint: Text(hint, style: const TextStyle(color: Colors.grey, fontSize: 14)),
          value: value,
          items: items.map((e) => DropdownMenuItem(value: e, child: Text(e, style: const TextStyle(fontSize: 14)))).toList(),
          onChanged: onChanged,
        ),
      ),
    );
  }

  Widget _buildSuffixBox(String text) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 14),
    decoration: BoxDecoration(color: const Color(0xFFE9E9FF), borderRadius: BorderRadius.circular(10)),
    child: Text(text, style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF2B164D))),
  );

  Widget _buildDynamicForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (_selectedRole == 0) ...[
          // Student Form
          _buildLabel('บัญชีนิสิต'),
          Row(
            children: [
              Expanded(child: _buildTextField('เช่น 66xxxx', controller: _idController, isNumber: true)),
              const SizedBox(width: 10),
              _buildSuffixBox('@up.ac.th'),
            ],
          ),
          const SizedBox(height: 16),
          _buildLabel('รหัสผ่าน'),
          _buildTextField('รหัสผ่าน', controller: _passwordController, isPassword: true),
          const SizedBox(height: 16),
          _buildLabel('ยืนยันรหัสผ่าน'),
          _buildTextField('ยืนยันรหัสผ่าน', controller: _confirmPasswordController, isPassword: true),
          const SizedBox(height: 16),
          _buildLabel('คณะ'),
          _buildDropdown('เลือกคณะ', _selectedFaculty, _faculties, (v) => setState(() => _selectedFaculty = v)),
          const SizedBox(height: 16),
          _buildLabel('ระดับการศึกษา'),
          _buildDropdown('เลือกระดับการศึกษา', _selectedEducationLevel, _educationLevels, (v) => setState(() => _selectedEducationLevel = v)),
          const SizedBox(height: 16),
          _buildLabel('อายุ'),
          _buildTextField('อายุ', controller: _ageController, isNumber: true),
          const SizedBox(height: 16),
          _buildLabel('เพศ'),
          _buildDropdown('เลือกเพศ', _selectedGender, _genders, (v) => setState(() => _selectedGender = v)),
        ] else if (_selectedRole == 1) ...[
          // Staff Form
          _buildLabel('บัญชีบุคลากร'),
          Row(
            children: [
              Expanded(child: _buildTextField('อีเมล', controller: _idController)),
              const SizedBox(width: 10),
              _buildSuffixBox('@up.ac.th'),
            ],
          ),
          const SizedBox(height: 16),
          _buildLabel('รหัสผ่าน'),
          _buildTextField('รหัสผ่าน', controller: _passwordController, isPassword: true),
          const SizedBox(height: 16),
          _buildLabel('ยืนยันรหัสผ่าน'),
          _buildTextField('ยืนยันรหัสผ่าน', controller: _confirmPasswordController, isPassword: true),
          const SizedBox(height: 16),
          _buildLabel('อายุ'),
          _buildTextField('อายุ', controller: _ageController, isNumber: true),
        ] else if (_selectedRole == 2) ...[
          // Public Form
          _buildLabel('เบอร์โทรศัพท์'),
          _buildTextField('เบอร์โทรศัพท์', controller: _idController, isNumber: true),
          const SizedBox(height: 16),
          _buildLabel('รหัสผ่าน'),
          _buildTextField('รหัสผ่าน', controller: _passwordController, isPassword: true),
          const SizedBox(height: 16),
          _buildLabel('ยืนยันรหัสผ่าน'),
          _buildTextField('ยืนยันรหัสผ่าน', controller: _confirmPasswordController, isPassword: true),
          const SizedBox(height: 16),
          _buildLabel('ความสัมพันธ์กับมหาวิทยาลัย'),
          _buildDropdown('เลือกความสัมพันธ์', _selectedRelationship, _relationships, (v) => setState(() => _selectedRelationship = v)),
        ],
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    String roleName = _selectedRole == 0 ? "นิสิต" : (_selectedRole == 1 ? "บุคลากร" : "บุคคลทั่วไป");
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
                    const Text('สมัครสมาชิก', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Color(0xFF2B164D))),
                    const SizedBox(height: 10),
                    const Text('ลงทะเบียนบัญชีใหม่เพื่อเข้าใช้งานระบบ', 
                      textAlign: TextAlign.center, style: TextStyle(fontSize: 14, color: Colors.grey)),
                    const SizedBox(height: 25),

                    // Role Tabs
                    Row(
                      children: [
                        _buildRoleTab('นิสิต มพ.', 0),
                        const SizedBox(width: 5),
                        _buildRoleTab('บุคลากร', 1),
                        const SizedBox(width: 5),
                        _buildRoleTab('บุคคลทั่วไป', 2),
                      ],
                    ),
                    const SizedBox(height: 25),

                    // Form
                    _buildDynamicForm(),

                    const SizedBox(height: 30),

                    // Action Button
                    SizedBox(
                      width: double.infinity,
                      height: 55,
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _handleRegister,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: upPurple,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          elevation: 5,
                        ),
                        child: _isLoading 
                          ? const CircularProgressIndicator(color: Colors.white)
                          : Text('สมัครสมาชิกในฐานะ $roleName', style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                      ),
                    ),

                    const SizedBox(height: 20),
                    
                    // Toggle Mode Button
                    TextButton(
                      onPressed: () {
                        Navigator.pop(context);
                      },
                      child: Text(
                        'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ',
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
