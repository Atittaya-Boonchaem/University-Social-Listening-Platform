import re

with open(r'd:\mint\app\university_social_app\lib\services\problem_service.dart', 'r', encoding='utf-8') as f:
    content = f.read()

old_func = """  static Future<Map<String, dynamic>> createProblem({
    required int categoryId,
    required int buildingId,
    required String description,
    required String incidentTimeRange,
    bool isStaffOnly = false,
    Uint8List? imageBytes,
    String? imageName,
    double? latitude,
    double? longitude,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('access_token');
      
      String? imageUrl;

      // Handle Image Upload using MultipartRequest
      if (imageBytes != null && token != null) {
        final uri = Uri.parse('$baseUrl/upload');
        final request = http.MultipartRequest('POST', uri)
          ..headers['Authorization'] = 'Bearer $token'
          ..files.add(http.MultipartFile.fromBytes(
            'file',
            imageBytes,
            filename: imageName ?? 'upload.jpg',
          ));
        final response = await request.send();
        
        if (response.statusCode == 401) {
          throw Exception('unauthorized');
        }
        
        if (response.statusCode == 200) {
          final respStr = await response.stream.bytesToString();
          final decoded = jsonDecode(respStr);
          if (decoded['success'] == true) {
            imageUrl = decoded['data']['image_url'];
          }
        }
      }

      // Handle Problem Creation
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
          "is_staff_only": isStaffOnly,
          "image_url": imageUrl,
          "latitude": latitude,
          "longitude": longitude,
        }),
      );

      if (response.statusCode == 401) {
        throw Exception('unauthorized');
      }

      final data = jsonDecode(utf8.decode(response.bodyBytes));

      if (response.statusCode == 201 && data['success'] == true) {
        return {'success': true, 'message': 'แจ้งปัญหาสำเร็จ'};
      } else {
        return {'success': false, 'message': data['message'] ?? 'เกิดข้อผิดพลาด'};
      }
    } catch (e) {
      if (e.toString() == 'Exception: unauthorized') {
        rethrow;
      }
      return {'success': false, 'message': 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'};
    }
  }"""

new_func = """  static Future<Map<String, dynamic>> createProblem({
    required int categoryId,
    required int buildingId,
    required String description,
    required String incidentTimeRange,
    bool isStaffOnly = false,
    Uint8List? imageBytes,
    String? imageName,
    double? latitude,
    double? longitude,
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
      request.fields['title'] = "แจ้งปัญหาจากแอปพลิเคชัน";
      request.fields['description'] = description;
      request.fields['incident_date'] = DateTime.now().toIso8601String();
      request.fields['incident_time_range'] = incidentTimeRange;
      request.fields['is_anonymous'] = "false";
      request.fields['is_staff_only'] = isStaffOnly.toString();
      
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

      if (response.statusCode == 201 && data['success'] == true) {
        return {'success': true, 'message': 'แจ้งปัญหาสำเร็จ'};
      } else {
        return {'success': false, 'message': data['message'] ?? 'เกิดข้อผิดพลาด'};
      }
    } catch (e) {
      if (e.toString() == 'Exception: unauthorized') {
        rethrow;
      }
      return {'success': false, 'message': 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'};
    }
  }"""

content = content.replace(old_func, new_func)

with open(r'd:\mint\app\university_social_app\lib\services\problem_service.dart', 'w', encoding='utf-8') as f:
    f.write(content)

print("Replaced createProblem in problem_service.dart")
