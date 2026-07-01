import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../services/auth_service.dart';
import '../../navigation/main_navigation_screen.dart';

class OnboardingScreen extends StatefulWidget {
  final int roleId;
  final String token;

  const OnboardingScreen({
    Key? key,
    required this.roleId,
    required this.token,
  }) : super(key: key);

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _formKey = GlobalKey<FormState>();
  
  // Controllers & Form Data
  final _prefixController = TextEditingController();
  final _ageController = TextEditingController();
  
  String? _selectedFaculty;
  String? _selectedGender;
  
  bool _isLoading = false;

  final Color upPurple = const Color(0xFF2B164D);
  
  final List<String> _faculties = [
    'คณะเกษตรศาสตร์และทรัพยากรธรรมชาติ',
    'คณะเทคโนโลยีสารสนเทศและการสื่อสาร',
    'คณะนิติศาสตร์',
    'คณะพยาบาลศาสตร์',
    'คณะแพทยศาสตร์',
    'คณะเภสัชศาสตร์',
    'คณะรัฐศาสตร์และสังคมศาสตร์',
    'คณะวิทยาศาสตร์',
    'คณะวิทยาศาสตร์การแพทย์',
    'คณะวิศวกรรมศาสตร์',
    'คณะศิลปศาสตร์',
    'คณะสถาปัตยกรรมศาสตร์และศิลปกรรมศาสตร์',
    'คณะสาธารณสุขศาสตร์',
    'วิทยาลัยการจัดการ',
    'วิทยาลัยการศึกษา',
    'วิทยาลัยพลังงานและสิ่งแวดล้อม',
    'อื่นๆ',
  ];

  @override
  void dispose() {
    _prefixController.dispose();
    _ageController.dispose();
    super.dispose();
  }

  Future<void> _submitForm() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() => _isLoading = true);

    final result = await AuthService.completeOnboarding(
      token: widget.token,
      studentIdPrefix: _prefixController.text.trim(),
      faculty: _selectedFaculty,
      age: _ageController.text.isNotEmpty ? int.tryParse(_ageController.text) : null,
      gender: _selectedGender,
    );

    if (!mounted) return;

    if (result['success'] == true) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('บันทึกข้อมูลเรียบร้อยแล้ว ยินดีต้อนรับ!'),
          backgroundColor: Colors.green,
          behavior: SnackBarBehavior.floating,
        ),
      );
      
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => MainNavigationScreen(roleId: widget.roleId)),
      );
    } else {
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result['message'] ?? 'เกิดข้อผิดพลาดในการบันทึกข้อมูล'),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(
        title: Text(
          'ข้อมูลเบื้องต้น',
          style: TextStyle(color: upPurple, fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: Colors.white,
        elevation: 0.5,
        centerTitle: true,
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Container(
            constraints: const BoxConstraints(maxWidth: 500),
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 15, offset: const Offset(0, 5))
              ],
            ),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    '🎉 ยินดีต้อนรับสู่ UP Voice Feed',
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'กรุณากรอกข้อมูลเบื้องต้นเพื่อใช้ในการสร้างนามแฝงของคุณ ข้อมูลเหล่านี้จะไม่เปิดเผยชื่อจริงของคุณ',
                    style: TextStyle(fontSize: 14, color: Colors.grey.shade600),
                  ),
                  const SizedBox(height: 32),
                  
                  // Role 1 = Student needs Prefix
                  if (widget.roleId == 1) ...[
                    const Text('รหัสนิสิต (2 ตัวแรก)', style: TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: _prefixController,
                      keyboardType: TextInputType.number,
                      maxLength: 2,
                      decoration: InputDecoration(
                        hintText: 'เช่น 66, 65',
                        counterText: '',
                        filled: true,
                        fillColor: Colors.grey.shade50,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty) return 'กรุณากรอกรหัสนิสิต 2 ตัวแรก';
                        if (value.length != 2) return 'ต้องมี 2 หลัก';
                        return null;
                      },
                    ),
                    const SizedBox(height: 20),
                  ],

                  // Faculty Dropdown (Students and Staff)
                  if (widget.roleId == 1 || widget.roleId == 2) ...[
                    const Text('คณะ / หน่วยงาน', style: TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      value: _selectedFaculty,
                      decoration: InputDecoration(
                        filled: true,
                        fillColor: Colors.grey.shade50,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                      ),
                      hint: const Text('เลือกคณะของคุณ'),
                      items: _faculties.map((f) => DropdownMenuItem(value: f, child: Text(f))).toList(),
                      onChanged: (val) => setState(() => _selectedFaculty = val),
                    ),
                    const SizedBox(height: 20),
                  ],

                  // Age
                  const Text('อายุ', style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _ageController,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      hintText: 'กรอกอายุของคุณ',
                      filled: true,
                      fillColor: Colors.grey.shade50,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Gender
                  const Text('เพศ', style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    value: _selectedGender,
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: Colors.grey.shade50,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                    ),
                    hint: const Text('ระบุเพศ'),
                    items: const [
                      DropdownMenuItem(value: 'M', child: Text('ชาย (Male)')),
                      DropdownMenuItem(value: 'F', child: Text('หญิง (Female)')),
                      DropdownMenuItem(value: 'Other', child: Text('อื่นๆ (Other)')),
                    ],
                    onChanged: (val) => setState(() => _selectedGender = val),
                  ),
                  const SizedBox(height: 40),

                  // Submit Button
                  SizedBox(
                    width: double.infinity,
                    height: 55,
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _submitForm,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: upPurple,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 2,
                      ),
                      child: _isLoading
                          ? const CircularProgressIndicator(color: Colors.white)
                          : const Text(
                              'เริ่มใช้งาน',
                              style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
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
