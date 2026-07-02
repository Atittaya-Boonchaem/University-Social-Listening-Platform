import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class AuthService {
  static const String baseUrl = 'https://university-social-listening-platform.onrender.com/api/v1/auth';

  static String _parseErrorMessage(Map<String, dynamic> data) {
    if (data['message'] != null) return data['message'];
    if (data['detail'] != null) {
      if (data['detail'] is List && data['detail'].isNotEmpty) {
        return data['detail'][0]['msg'] ?? 'ข้อมูลไม่ถูกต้อง';
      }
      if (data['detail'] is String) {
        return data['detail'];
      }
    }
    return 'เกิดข้อผิดพลาด';
  }

  // ==========================================
  // 1. ฟังก์ชันเข้าสู่ระบบหลัก (Login)
  // ==========================================
  static Future<Map<String, dynamic>> login({
    String? email,
    String? phoneNumber,
    required String password,
    int? expectedRoleId,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          if (email != null) 'email': email,
          if (phoneNumber != null) 'phone_number': phoneNumber,
          'password': password,
          if (expectedRoleId != null) 'expected_role_id': expectedRoleId,
        }),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('access_token', data['data']['access_token']);
        
        int actualRoleId = int.tryParse(data['data']['user']['role_id'].toString()) ?? 1;
        await prefs.setInt('role_id', actualRoleId);
        
        if (data['data']['user']['email'] != null) {
          await prefs.setString('email', data['data']['user']['email']);
        }
        
        if (data['data']['user']['display_name'] != null) {
          await prefs.setString('display_name', data['data']['user']['display_name']);
        }

        if (data['data']['user']['student_id'] != null) {
          await prefs.setString('student_id', data['data']['user']['student_id']);
        }

        if (data['data']['user']['faculty'] != null) {
          await prefs.setString('faculty', data['data']['user']['faculty']);
        }

        if (data['data']['user']['education_level'] != null) {
          await prefs.setString('education_level', data['data']['user']['education_level']);
        }

        if (data['data']['user']['age'] != null) {
          await prefs.setInt('age', data['data']['user']['age']);
        }

        if (data['data']['user']['gender'] != null) {
          await prefs.setString('gender', data['data']['user']['gender']);
        }

        if (data['data']['user']['phone_number'] != null) {
          await prefs.setString('phone_number', data['data']['user']['phone_number']);
        }

        if (data['data']['user']['relationship'] != null) {
          await prefs.setString('relationship', data['data']['user']['relationship']);
        }
        
        return {'success': true, 'message': 'เข้าสู่ระบบสำเร็จ', 'role_id': actualRoleId};
      } else {
        return {'success': false, 'message': _parseErrorMessage(data)};
      }
    } catch (e) {
      return {'success': false, 'message': 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้: $e'};
    }
  }

  static Future<Map<String, dynamic>> loginStudent(String studentId, String password) async {
    String email = studentId.trim();
    if (!email.contains('@')) {
      email += '@up.ac.th';
    }
    return login(email: email, password: password, expectedRoleId: 1);
  }

  static Future<Map<String, dynamic>> loginStaff(String staffAccount, String password) async {
    String email = staffAccount.trim();
    if (!email.contains('@')) {
      email += '@up.ac.th';
    }
    return login(email: email, password: password, expectedRoleId: 2);
  }

  // ==========================================
  // 4. เมธอดสำหรับสมัครสมาชิกนิสิต
  // ==========================================
  static Future<Map<String, dynamic>> registerStudent({
    required String studentId,
    required String password,
    String? displayName,
    String? faculty,
    String? educationLevel,
    int? age,
    String? gender,
  }) async {
    try {
      final email = studentId.contains('@') ? studentId : '$studentId@up.ac.th';
      final response = await http.post(
        Uri.parse('$baseUrl/register/student'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
          'password': password,
          'student_id': studentId,
          if (displayName != null) 'display_name': displayName,
          if (faculty != null) 'faculty': faculty,
          if (educationLevel != null) 'education_level': educationLevel,
          if (age != null) 'age': age,
          if (gender != null) 'gender': gender,
        }),
      );
      final data = jsonDecode(response.body);
      if (response.statusCode == 201 && data['success'] == true) {
        return {'success': true, 'message': 'สร้างบัญชีนิสิตสำเร็จ'};
      } else {
        return {'success': false, 'message': _parseErrorMessage(data)};
      }
    } catch (e) {
      return {'success': false, 'message': 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'};
    }
  }

  // ==========================================
  // 5. เมธอดสำหรับสมัครสมาชิกบุคลากร
  // ==========================================
  static Future<Map<String, dynamic>> registerStaff({
    required String email,
    required String password,
    String? displayName,
    int? age,
  }) async {
    try {
      if (!email.contains('@')) {
        email += '@up.ac.th';
      }
      final response = await http.post(
        Uri.parse('$baseUrl/register/staff'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
          'password': password,
          if (displayName != null) 'display_name': displayName,
          if (age != null) 'age': age,
        }),
      );
      final data = jsonDecode(response.body);
      if (response.statusCode == 201 && data['success'] == true) {
        return {'success': true, 'message': 'สร้างบัญชีบุคลากรสำเร็จ'};
      } else {
        return {'success': false, 'message': _parseErrorMessage(data)};
      }
    } catch (e) {
      return {'success': false, 'message': 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'};
    }
  }

  // ==========================================
  // 6. เมธอดสำหรับสมัครสมาชิกบุคคลทั่วไป
  // ==========================================
  static Future<Map<String, dynamic>> registerPublic({
    required String phoneNumber,
    required String password,
    String? displayName,
    String? relationship,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/register/public'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'phone_number': phoneNumber,
          'password': password,
          if (displayName != null) 'display_name': displayName,
          if (relationship != null) 'relationship': relationship,
        }),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 201 && data['success'] == true) {
        return {'success': true, 'message': 'สร้างบัญชีสำเร็จ'};
      } else {
        return {'success': false, 'message': _parseErrorMessage(data)};
      }
    } catch (e) {
      return {'success': false, 'message': 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'};
    }
  }

  // ==========================================
  // 5. เมธอดสำหรับ Onboarding
  // ==========================================
  static Future<Map<String, dynamic>> completeOnboarding({
    required String token,
    String? displayName,
  }) async {
    try {
      final response = await http.patch(
        Uri.parse('$baseUrl/onboarding'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          if (displayName != null && displayName.isNotEmpty) 'display_name': displayName,
        }),
      );

      final data = jsonDecode(response.body);

      if ((response.statusCode == 200 || response.statusCode == 201) && data['success'] == true) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setBool('onboarding_complete', true);
        if (data['data']?['display_name'] != null) {
          await prefs.setString('display_name', data['data']['display_name']);
        }
        return {'success': true, 'message': 'อัพเดตข้อมูลสำเร็จ'};
      } else {
        return {'success': false, 'message': _parseErrorMessage(data)};
      }
    } catch (e) {
      return {'success': false, 'message': 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'};
    }
  }
}
