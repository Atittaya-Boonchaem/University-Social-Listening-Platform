// import 'package:flutter/material.dart';

// class StudentForm extends StatelessWidget {
//   final TextEditingController idController;
//   final TextEditingController passwordController;
//   final bool obscurePassword;
//   final VoidCallback onTogglePassword;
//   final Color upPurple;

//   const StudentForm({
//     super.key,
//     required this.idController,
//     required this.passwordController,
//     required this.obscurePassword,
//     required this.onTogglePassword,
//     required this.upPurple,
//   });

//   @override
//   Widget build(BuildContext context) {
//     return Column(
//       crossAxisAlignment: CrossAxisAlignment.start,
//       children: [
//         const Text('รหัสนิสิต', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
//         const SizedBox(height: 8),
//         TextField(
//           controller: idController,
//           keyboardType: TextInputType.number,
//           decoration: InputDecoration(
//             prefixIcon: const Icon(Icons.person_outline),
//             hintText: 'กรอกรหัสนิสิต',
//             border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
//             filled: true,
//             fillColor: Colors.white,
//           ),
//         ),
//         const SizedBox(height: 16),
//         const Text('รหัสผ่าน', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
//         const SizedBox(height: 8),
//         TextField(
//           controller: passwordController,
//           obscureText: obscurePassword,
//           decoration: InputDecoration(
//             prefixIcon: const Icon(Icons.lock_outline),
//             suffixIcon: IconButton(
//               icon: Icon(obscurePassword ? Icons.visibility_off : Icons.visibility),
//               onPressed: onTogglePassword,
//             ),
//             hintText: 'กรอกรหัสผ่าน',
//             border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
//             filled: true,
//             fillColor: Colors.white,
//           ),
//         ),
//       ],
//     );
//   }
// }


import 'package:flutter/material.dart';

class StudentForm extends StatelessWidget {
  final TextEditingController idController;
  final TextEditingController passwordController;
  final TextEditingController ageController;
  final bool obscurePassword;
  final VoidCallback onTogglePassword;

  const StudentForm({
    super.key, required this.idController, required this.passwordController,
    required this.ageController, required this.obscurePassword, required this.onTogglePassword,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildLabel('บัญชีนิสิต'),
        Row(
          children: [
            Expanded(child: _buildTextField('69xxxxxx', controller: idController)),
            const SizedBox(width: 10),
            _buildSuffixBox('@up.ac.th'),
          ],
        ),
        const SizedBox(height: 18),
        _buildLabel('รหัสผ่าน'),
        _buildTextField('รหัสผ่าน', controller: passwordController, isPassword: true),
        const SizedBox(height: 18),
        _buildLabel('คณะ'),
        _buildDropdown('คณะเกษตรศาสตร์และทรัพยากรธรรมชาติ', ['คณะเกษตรศาสตร์และทรัพยากรธรรมชาติ', 'คณะเทคโนโลยีสารสนเทศ', 'คณะวิศวกรรมศาสตร์']),
        const SizedBox(height: 18),
        Row(
          children: [
            Expanded(flex: 2, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              _buildLabel('ระดับการศึกษา'),
              _buildDropdown('ปริญญาตรี', ['ปริญญาตรี', 'ปริญญาโท', 'ปริญญาเอก']),
            ])),
            const SizedBox(width: 10),
            Expanded(flex: 1, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              _buildLabel('อายุ'),
              _buildTextField('อายุ', controller: ageController),
            ])),
            const SizedBox(width: 10),
            Expanded(flex: 1, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              _buildLabel('เพศ'),
              _buildDropdown('ชาย', ['ชาย', 'หญิง', 'ไม่ระบุ']),
            ])),
          ],
        ),
      ],
    );
  }

  Widget _buildLabel(String text) => Padding(
    padding: const EdgeInsets.only(bottom: 8, left: 4),
    child: Text(text, style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF333333))),
  );

  Widget _buildTextField(String hint, {TextEditingController? controller, bool isPassword = false}) {
    return TextField(
      controller: controller,
      obscureText: isPassword && obscurePassword,
      decoration: InputDecoration(
        hintText: hint,
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE0E0E0))),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE0E0E0))),
        suffixIcon: isPassword ? IconButton(icon: Icon(obscurePassword ? Icons.visibility : Icons.visibility_off, size: 20), onPressed: onTogglePassword) : null,
      ),
    );
  }

  Widget _buildSuffixBox(String text) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 14),
    decoration: BoxDecoration(color: const Color(0xFFE9E9FF), borderRadius: BorderRadius.circular(10)),
    child: Text(text, style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF2B164D))),
  );

  Widget _buildDropdown(String value, List<String> items) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 12),
    decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFFE0E0E0))),
    child: DropdownButtonHideUnderline(
      child: DropdownButton<String>(
        value: value, isExpanded: true, icon: const Icon(Icons.keyboard_arrow_down),
        items: items.map((e) => DropdownMenuItem(value: e, child: Text(e, style: const TextStyle(fontSize: 14)))).toList(),
        onChanged: (v) {},
      ),
    ),
  );
}