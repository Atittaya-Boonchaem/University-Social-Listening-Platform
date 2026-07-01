

import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ProblemService {
  // URL หลักของระบบปัญหา (ตรงกับที่ระบุใน FastAPI)
  static const String baseUrl = 'http://127.0.0.1:8000/api/v1/problems';

  // 1. ดึงรายการปัญหา (เรียกไปที่ /list ตามไฟล์ problems.py)
  static Future<List<dynamic>> getProblems() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('access_token');

      final response = await http.get(
        Uri.parse('$baseUrl/list'), 
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final decodedBody = jsonDecode(utf8.decode(response.bodyBytes));
        
        // ตรวจสอบโครงสร้าง response ที่ส่งกลับมา
        if (decodedBody is Map && decodedBody['success'] == true) {
          final data = decodedBody['data'];
          if (data is Map && data['items'] is List) {
            return data['items'];
          }
        }
        return [];
      } else {
        print('Failed to load problems: ${response.statusCode} - ${response.body}');
        return [];
      }
    } catch (e) {
      print('Error connecting to server: $e');
      return [];
    }
  }

  // 2. ดึงเฉพาะปัญหาของผู้ใช้ที่ล็อกอินอยู่ (เรียกไปที่ /my-problems)
  static Future<List<dynamic>> getMyProblems() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('access_token');

      final response = await http.get(
        Uri.parse('$baseUrl/my-problems'),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final decodedBody = jsonDecode(utf8.decode(response.bodyBytes));
        if (decodedBody is Map && decodedBody['success'] == true) {
          final data = decodedBody['data'];
          if (data is Map && data['items'] is List) {
            return data['items'];
          }
        }
        return [];
      } else {
        print('Failed to load my problems: ${response.statusCode} - ${response.body}');
        return [];
      }
    } catch (e) {
      print('Error connecting to server: $e');
      return [];
    }
  }

  // 3. แจ้งปัญหาใหม่ (เรียกไปที่ /create ตามไฟล์ problems.py)
  static Future<Map<String, dynamic>> createProblem({
    required int categoryId,
    required int buildingId,
    required String description,
    required String incidentTimeRange,
    bool isStaffOnly = false,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('access_token');

      final response = await http.post(
        Uri.parse('$baseUrl/create'),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          "category_id": categoryId,
          "building_id": buildingId,
          "title": "แจ้งปัญหาจากแอปพลิเคชัน",
          "description": description,
          "incident_date": DateTime.now().toIso8601String(),
          "incident_time_range": incidentTimeRange,
          "is_anonymous": false,
          "is_staff_only": isStaffOnly
        }),
      );

      final data = jsonDecode(utf8.decode(response.bodyBytes));

      if (response.statusCode == 201 || response.statusCode == 200) {
        return {'success': true, 'message': 'แจ้งปัญหาสำเร็จ'};
      } else {
        return {'success': false, 'message': data['message'] ?? 'ไม่สามารถแจ้งปัญหาได้'};
      }
    } catch (e) {
      return {'success': false, 'message': 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้: $e'};
    }
  }
}