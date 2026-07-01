import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:typed_data';

class ProblemService {
  // URL หลักของระบบปัญหา (ตรงกับที่ระบุใน FastAPI)
  static const String baseUrl = 'http://127.0.0.1:8000/api/v1/problems';

  // 1. ดึงรายการปัญหา (เรียกไปที่ /list ตามไฟล์ problems.py)
  static Future<List<dynamic>> getProblems({String? feedType}) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('access_token');

      String url = '$baseUrl/list';
      if (feedType != null) {
        url += '?visibility=$feedType';
      }

      final response = await http.get(
        Uri.parse(url), 
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
    required String title,
    required String description,
    Uint8List? imageBytes,
    String? imageName,
    double? latitude,
    double? longitude,
    String visibility = 'public',
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('access_token');
      
      final uri = Uri.parse('$baseUrl/create');
      final request = http.MultipartRequest('POST', uri);
      
      if (token != null) {
        request.headers['Authorization'] = 'Bearer $token';
      }
      
      request.fields['category_id'] = categoryId.toString();
      request.fields['building_id'] = buildingId.toString();
      request.fields['title'] = title;
      request.fields['description'] = description;
      request.fields['visibility'] = visibility;
      
      if (latitude != null) {
        request.fields['latitude'] = latitude.toString();
      }
      if (longitude != null) {
        request.fields['longitude'] = longitude.toString();
      }
      
      if (imageBytes != null) {
        request.files.add(http.MultipartFile.fromBytes(
          'image',
          imageBytes,
          filename: imageName ?? 'upload.jpg',
        ));
      }

      final response = await request.send();
      
      if (response.statusCode == 401) {
        throw Exception('unauthorized');
      }
      
      final respStr = await response.stream.bytesToString();
      final data = jsonDecode(respStr);

      if (response.statusCode == 201 || response.statusCode == 200) {
        if (data['success'] == true) {
          return {'success': true, 'message': 'แจ้งปัญหาสำเร็จ'};
        } else {
           return {'success': false, 'message': data['message'] ?? 'เกิดข้อผิดพลาด'};
        }
      } else {
        return {'success': false, 'message': data['message'] ?? 'ไม่สามารถแจ้งปัญหาได้ (Error ${response.statusCode})'};
      }
    } catch (e) {
      if (e.toString().contains('unauthorized')) {
        rethrow;
      }
      return {'success': false, 'message': 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้: $e'};
    }
  }

  // 4. Toggle Upvote (เรียกไปที่ /{problem_id}/upvote ตามไฟล์ problems.py)
  static Future<Map<String, dynamic>> toggleUpvote(int problemId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('access_token');
      if (token == null) {
        return {'success': false, 'message': 'กรุณาเข้าสู่ระบบก่อน'};
      }

      final response = await http.post(
        Uri.parse('$baseUrl/$problemId/upvote'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final decodedBody = jsonDecode(utf8.decode(response.bodyBytes));
        if (decodedBody is Map && decodedBody['success'] == true) {
          return {
            'success': true,
            'is_upvoted_by_me': decodedBody['data']['is_upvoted_by_me'],
            'upvote_count': decodedBody['data']['upvote_count'],
          };
        }
      }
      return {'success': false, 'message': 'เกิดข้อผิดพลาดในการโหวต'};
    } catch (e) {
      return {'success': false, 'message': 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้: $e'};
    }
  }
}