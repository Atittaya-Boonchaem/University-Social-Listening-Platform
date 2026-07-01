import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class AuthService {
  static const String baseUrl = 'http://127.0.0.1:8000/api/v1/auth';

  // ==========================================
  // 1. ฟังก์ชันเข้าสู่ระบบหลัก (Login)
  // ==========================================
  static Future<Map<String, dynamic>> login({
    String? email,
    String? phoneNumber,
    required String password,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          if (email != null) 'email': email,
          if (phoneNumber != null) 'phone_number': phoneNumber,
          'password': password,
        }),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('access_token', data['data']['access_token']);
        await prefs.setInt('role_id', data['data']['user']['role_id']);
        
        return {'success': true, 'message': 'เข้าสู่ระบบสำเร็จ'};
      } else {
        return {'success': false, 'message': data['message'] ?? 'เข้าสู่ระบบไม่สำเร็จ'};
      }
    } catch (e) {
      return {'success': false, 'message': 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้: $e'};
    }
  }

  // ==========================================
  // 2. เมธอดสำหรับเข้าสู่ระบบของนิสิต (เติม @up.ac.th ให้อัตโนมัติ)
  // ==========================================
  static Future<Map<String, dynamic>> loginStudent(String studentId, String password) async {
    String email = studentId.trim();
    if (!email.contains('@')) {
      email += '@up.ac.th';
    }
    return login(email: email, password: password);
  }

  // ==========================================
  // 3. เมธอดสำหรับเข้าสู่ระบบของบุคลากร
  // ==========================================
  static Future<Map<String, dynamic>> loginStaff(String staffAccount, String password) async {
    String email = staffAccount.trim();
    if (!email.contains('@')) {
      email += '@up.ac.th';
    }
    return login(email: email, password: password);
  }

  // ==========================================
  // 4. เมธอดสำหรับสมัครสมาชิกบุคคลทั่วไป
  // ==========================================
  static Future<Map<String, dynamic>> registerPublic(String phone, String password) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/register/public'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'phone_number': phone,
          'password': password,
          'relationship_to_university': 'บุคคลทั่วไป',
          'age': 0, 
          'gender': 'Other', 
        }),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 201 && data['success'] == true) {
        return {'success': true, 'message': 'สร้างบัญชีสำเร็จ'};
      } else {
        return {'success': false, 'message': data['message'] ?? 'เกิดข้อผิดพลาด'};
      }
    } catch (e) {
      return {'success': false, 'message': 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'};
    }
  }
}