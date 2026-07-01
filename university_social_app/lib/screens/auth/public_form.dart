// import 'package:flutter/material.dart';

// class PublicForm extends StatelessWidget {
//   final TextEditingController phoneController;
//   final bool isRegisterMode;
//   final TextEditingController passwordController;
//   final TextEditingController confirmPasswordController;
//   final bool obscurePassword;
//   final VoidCallback onTogglePassword;

//   const PublicForm({
//     super.key,
//     required this.phoneController,
//     required this.isRegisterMode,
//     required this.passwordController,
//     required this.confirmPasswordController,
//     required this.obscurePassword,
//     required this.onTogglePassword,
//   });

//   @override
//   Widget build(BuildContext context) {
//     return Column(
//       crossAxisAlignment: CrossAxisAlignment.start,
//       children: [
//         const Text('เบอร์โทรศัพท์', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
//         const SizedBox(height: 8),
//         TextField(
//           controller: phoneController,
//           keyboardType: TextInputType.phone,
//           enabled: !isRegisterMode, // ล็อกเบอร์โทรศัพท์ไม่ให้แก้ตอนกรอกรหัสผ่าน
//           decoration: InputDecoration(
//             prefixIcon: const Icon(Icons.phone_outlined),
//             hintText: '08XXXXXXXX',
//             border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
//             filled: true,
//             fillColor: isRegisterMode ? Colors.grey.shade100 : Colors.white,
//           ),
//         ),
//         if (isRegisterMode) ...[
//           const SizedBox(height: 16),
//           const Text('ตั้งรหัสผ่านใหม่', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
//           const SizedBox(height: 8),
//           TextField(
//             controller: passwordController,
//             obscureText: obscurePassword,
//             decoration: InputDecoration(
//               prefixIcon: const Icon(Icons.lock_outline),
//               suffixIcon: IconButton(
//                 icon: Icon(obscurePassword ? Icons.visibility_off : Icons.visibility),
//                 onPressed: onTogglePassword,
//               ),
//               hintText: 'รหัสผ่าน (อย่างน้อย 6 ตัว)',
//               border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
//               filled: true,
//               fillColor: Colors.white,
//             ),
//           ),
//           const SizedBox(height: 16),
//           const Text('ยืนยันรหัสผ่าน', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
//           const SizedBox(height: 8),
//           TextField(
//             controller: confirmPasswordController,
//             obscureText: obscurePassword,
//             decoration: InputDecoration(
//               prefixIcon: const Icon(Icons.lock_outline),
//               hintText: 'กรอกรหัสผ่านอีกครั้ง',
//               border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
//               filled: true,
//               fillColor: Colors.white,
//             ),
//           ),
//         ],
//       ],
//     );
//   }
// }



import 'package:flutter/material.dart';

class PublicForm extends StatelessWidget {
  final TextEditingController phoneController;
  final bool isRegisterMode;
  final TextEditingController passwordController;
  final TextEditingController confirmPasswordController;
  final bool obscurePassword;
  final VoidCallback onTogglePassword;
  final VoidCallback onBack;

  const PublicForm({
    super.key, required this.phoneController, required this.isRegisterMode,
    required this.passwordController, required this.confirmPasswordController,
    required this.obscurePassword, required this.onTogglePassword, required this.onBack,
  });

  @override
  Widget build(BuildContext context) {
    if (isRegisterMode) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            const Icon(Icons.contact_phone, size: 18, color: Color(0xFF2B164D)),
            const SizedBox(width: 8),
            Text('เบอร์โทรศัพท์ของผู้ใช้: ${phoneController.text}', style: const TextStyle(fontWeight: FontWeight.bold)),
          ]),
          const SizedBox(height: 15),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: const Color(0xFFE3F2FD), borderRadius: BorderRadius.circular(10)),
            child: const Row(children: [
              Icon(Icons.lightbulb, color: Colors.amber, size: 20),
              SizedBox(width: 10),
              Expanded(child: Text('ไม่พบเบอร์นี้ในระบบ มีการบันทึกข้อมูลเพื่อเข้าใช้งานครั้งแรก กรุณาตั้งรหัสผ่านสำหรับใช้งานในครั้งถัดไป', 
                style: TextStyle(fontSize: 11, color: Color(0xFF1565C0), fontWeight: FontWeight.bold))),
            ]),
          ),
          const SizedBox(height: 20),
          _buildLabel('ตั้งรหัสผ่านใหม่'),
          _buildTextField('กำหนดรหัสผ่าน', controller: passwordController, isPassword: true),
          const SizedBox(height: 15),
          _buildLabel('ยืนยันรหัสผ่านอีกครั้ง'),
          _buildTextField('กรอกรหัสผ่านซ้ำอีกครั้ง', controller: confirmPasswordController, isPassword: true),
          const SizedBox(height: 20),
          OutlinedButton(onPressed: onBack, style: OutlinedButton.styleFrom(minimumSize: const Size(double.infinity, 50)), child: const Text('ย้อนกลับ')),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildLabel('เบอร์โทรศัพท์ (ใช้เพื่อเข้าสู่ระบบ)'),
        _buildTextField('08xxxxxxxx', controller: phoneController),
        const SizedBox(height: 20),
        _buildLabel('ความเกี่ยวข้อง'),
        _buildDropdown('ผู้ปกครองนิสิต', ['ผู้ปกครองนิสิต', 'ศิษย์เก่า', 'บุคคลภายนอก']),
      ],
    );
  }

  Widget _buildLabel(String text) => Padding(padding: const EdgeInsets.only(bottom: 8, left: 4), child: Text(text, style: const TextStyle(fontWeight: FontWeight.bold)));

  Widget _buildTextField(String hint, {TextEditingController? controller, bool isPassword = false}) {
    return TextField(
      controller: controller, obscureText: isPassword && obscurePassword,
      decoration: InputDecoration(
        hintText: hint, filled: true, fillColor: Colors.white, contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE0E0E0))),
        suffixIcon: isPassword ? IconButton(icon: Icon(obscurePassword ? Icons.visibility : Icons.visibility_off, size: 20), onPressed: onTogglePassword) : null,
      ),
    );
  }

  Widget _buildDropdown(String value, List<String> items) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 12),
    decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFFE0E0E0))),
    child: DropdownButtonHideUnderline(
      child: DropdownButton<String>(
        value: value, isExpanded: true, items: items.map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(), onChanged: (v) {},
      ),
    ),
  );
}