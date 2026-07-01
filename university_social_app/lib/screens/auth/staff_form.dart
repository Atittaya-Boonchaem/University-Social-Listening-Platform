// import 'package:flutter/material.dart';

// class StaffForm extends StatelessWidget {
//   final TextEditingController emailController;
//   final TextEditingController passwordController;
//   final bool obscurePassword;
//   final VoidCallback onTogglePassword;
//   final Color upPurple;

//   const StaffForm({
//     super.key,
//     required this.emailController,
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
//         const Text('อีเมลบุคลากร', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
//         const SizedBox(height: 8),
//         TextField(
//           controller: emailController,
//           keyboardType: TextInputType.emailAddress,
//           decoration: InputDecoration(
//             prefixIcon: const Icon(Icons.email_outlined),
//             hintText: 'example@up.ac.th',
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
//             hintText: 'กรอกรหัสผ่านบุคลากร',
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

class StaffForm extends StatelessWidget {
  final TextEditingController emailController;
  final TextEditingController passwordController;
  final TextEditingController ageController;
  final bool obscurePassword;
  final VoidCallback onTogglePassword;

  const StaffForm({
    super.key, required this.emailController, required this.passwordController,
    required this.ageController, required this.obscurePassword, required this.onTogglePassword,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildLabel('บัญชีบุคลากร'),
        Row(
          children: [
            Expanded(child: _buildTextField('xxxxx', controller: emailController)),
            const SizedBox(width: 10),
            _buildSuffixBox('@up.ac.th'),
          ],
        ),
        const SizedBox(height: 18),
        _buildLabel('รหัสผ่าน'),
        _buildTextField('รหัสผ่าน', controller: passwordController, isPassword: true),
        const SizedBox(height: 18),
        _buildLabel('อายุ'),
        _buildTextField('กรอกอายุ', controller: ageController),
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
        hintText: hint, filled: true, fillColor: Colors.white,
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
}