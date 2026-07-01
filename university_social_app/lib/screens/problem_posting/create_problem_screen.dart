import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'dart:typed_data';
import 'package:image_picker/image_picker.dart';
import '../../services/problem_service.dart';
import '../auth/login_screen.dart';

class CreateProblemScreen extends StatefulWidget {
  final int roleId; 
  const CreateProblemScreen({super.key, this.roleId = 0});

  @override
  State<CreateProblemScreen> createState() => _CreateProblemScreenState();
}

class _CreateProblemScreenState extends State<CreateProblemScreen> {
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  bool _isLoading = false;
  
  final Color upPurple = const Color(0xFF2B164D);
  
  String? _selectedCategory; 
  String? _selectedBuilding; 
  String _visibility = 'public';
  int? _roleId;

  Uint8List? _imageBytes;
  String? _imageName;
  LatLng? _selectedLocation;
  final ImagePicker _picker = ImagePicker();

  List<dynamic> _categories = [];
  List<dynamic> _buildings = [];
  final MapController _mapController = MapController();

  @override
  void initState() {
    super.initState();
    _roleId = widget.roleId;
    _fetchDropdownData();
  }

  Future<void> _fetchDropdownData() async {
    try {
      setState(() => _isLoading = true);
      
      final prefs = await SharedPreferences.getInstance();
      final savedRoleId = prefs.getInt('role_id');
      if (savedRoleId != null && mounted) {
        setState(() {
          _roleId = savedRoleId;
        });
      }
      final catResponse = await http.get(Uri.parse('http://127.0.0.1:8000/api/v1/problems/categories'));
      final bldResponse = await http.get(Uri.parse('http://127.0.0.1:8000/api/v1/problems/buildings'));

      if (catResponse.statusCode == 200) {
        final decoded = jsonDecode(utf8.decode(catResponse.bodyBytes));
        setState(() {
          if (decoded['data'] != null && decoded['data']['items'] is List) {
            _categories = decoded['data']['items'];
          } else if (decoded['data'] is List) {
            _categories = decoded['data'];
          }
          if (_categories.isNotEmpty) {
            _selectedCategory = _categories[0]['id'].toString();
          }
        });
      }
      if (bldResponse.statusCode == 200) {
        final decoded = jsonDecode(utf8.decode(bldResponse.bodyBytes));
        setState(() {
          if (decoded['data'] != null && decoded['data']['items'] is List) {
            _buildings = decoded['data']['items'];
          } else if (decoded['data'] is List) {
            _buildings = decoded['data'];
          }
          if (_buildings.isNotEmpty) {
            _selectedBuilding = _buildings[0]['id'].toString();
          }
        });
      }
    } catch (e) {
      debugPrint("🚨 ดึงข้อมูลดรอปดาวน์ไม่ได้: $e");
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _pickImage() async {
    try {
      final XFile? image = await _picker.pickImage(source: ImageSource.gallery, imageQuality: 80);
      if (image != null) {
        final bytes = await image.readAsBytes();
        setState(() {
          _imageBytes = bytes;
          _imageName = image.name;
        });
      }
    } catch (e) {
      debugPrint("🚨 เลือกรูปภาพไม่ได้: $e");
    }
  }

  Future<void> _submitProblem() async {
    // --- Sync validation (safe to use context here — no async gap yet) ---
    final scaffoldMessenger = ScaffoldMessenger.of(context);
    
    if (_titleController.text.length < 5) {
      scaffoldMessenger.showSnackBar(
        const SnackBar(
          content: Text('กรุณาระบุหัวข้อปัญหาอย่างน้อย 5 ตัวอักษร'),
          backgroundColor: Colors.orange,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }
    
    if (_descController.text.length < 10) {
      scaffoldMessenger.showSnackBar(
        const SnackBar(
          content: Text('กรุณาอธิบายรายละเอียดอย่างน้อย 10 ตัวอักษร'),
          backgroundColor: Colors.orange,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    if (_selectedCategory == null || _selectedBuilding == null) {
      scaffoldMessenger.showSnackBar(
        const SnackBar(
          content: Text('กำลังโหลดข้อมูลหมวดหมู่หรือสถานที่ กรุณารอสักครู่...'),
          backgroundColor: Colors.orange,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final result = await ProblemService.createProblem(
        categoryId: int.parse(_selectedCategory!),
        buildingId: int.parse(_selectedBuilding!),
        title: _titleController.text,
        description: _descController.text,
        imageBytes: _imageBytes,
        imageName: _imageName,
        latitude: _selectedLocation?.latitude,
        longitude: _selectedLocation?.longitude,
        visibility: _visibility,
      );

      if (!mounted) return;

      if (result['success'] == true) {
        _titleController.clear();
        _descController.clear();
        setState(() {
          _isLoading = false;
          _imageBytes = null;
          _imageName = null;
          _selectedLocation = null;
          if (_categories.isNotEmpty) _selectedCategory = _categories[0]['id'].toString();
          if (_buildings.isNotEmpty) _selectedBuilding = _buildings[0]['id'].toString();
        });
        scaffoldMessenger.showSnackBar(
          const SnackBar(
            content: Text('ส่งรายงานปัญหาสำเร็จ! 🎉'),
            backgroundColor: Colors.green,
            behavior: SnackBarBehavior.floating,
          ),
        );
      } else {
        scaffoldMessenger.showSnackBar(
          SnackBar(
            content: Text(result['message'] ?? 'เกิดข้อผิดพลาดในการส่งข้อมูล'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
        setState(() => _isLoading = false);
      }
    } catch (e) {
      if (!mounted) return;
      if (e.toString().contains('unauthorized')) {
        scaffoldMessenger.showSnackBar(
          const SnackBar(
            content: Text('หมดอายุการเชื่อมต่อ กรุณาเข้าสู่ระบบใหม่เพื่อทำรายการ'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
        final prefs = await SharedPreferences.getInstance();
        await prefs.clear();
        if (mounted) {
          Navigator.pushAndRemoveUntil(
            context,
            MaterialPageRoute(builder: (context) => const LoginScreen()),
            (route) => false,
          );
        }
        return;
      }

      scaffoldMessenger.showSnackBar(
        SnackBar(
          content: Text('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้: $e'),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating,
        ),
      );
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    int currentRoleId = _roleId ?? widget.roleId;
    
    String roleText = 'บุคคลทั่วไป';
    IconData roleIcon = Icons.person;
    if (currentRoleId == 1) {
      roleText = 'นิสิต มพ.';
      roleIcon = Icons.school;
    } else if (currentRoleId == 2) {
      roleText = 'บุคลากร มพ.';
      roleIcon = Icons.badge;
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('📝 ', style: TextStyle(fontSize: 22)),
            Text('สร้างโพสต์แจ้งปัญหา', style: TextStyle(color: upPurple, fontWeight: FontWeight.bold, fontSize: 18)),
          ],
        ),
        backgroundColor: Colors.white,
        elevation: 0.5,
        iconTheme: IconThemeData(color: upPurple),
        centerTitle: true,
      ),
      body: _isLoading && (_categories.isEmpty || _buildings.isEmpty)
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF2B164D)))
          : Center(
              child: Container(
                constraints: const BoxConstraints(maxWidth: 550),
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(20.0),
                  child: Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 15, offset: const Offset(0, 5))
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Center(
                          child: Text('กรุณากรอกข้อมูลและสถานที่ให้ชัดเจนเพื่อการแก้ไขที่รวดเร็ว', 
                            style: TextStyle(color: Colors.grey, fontSize: 13, fontWeight: FontWeight.w500)),
                        ),
                        const SizedBox(height: 20),
                        
                        Row(
                          children: [
                            const Text('บทบาทของคุณ:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF3E8FF), 
                                borderRadius: BorderRadius.circular(20)
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(roleIcon, size: 16, color: upPurple),
                                  const SizedBox(width: 6),
                                  Text(
                                    roleText, 
                                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: upPurple)
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),
                        const Divider(color: Color(0xFFE2E8F0)),
                        const SizedBox(height: 10),
                        
                        const SizedBox(height: 20),
                        
                        if (currentRoleId == 2 || currentRoleId == 4) ...[
                          const Text('ระดับการมองเห็น', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF8F9FA),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                            ),
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<String>(
                                isExpanded: true,
                                value: _visibility,
                                items: const [
                                  DropdownMenuItem(value: 'public', child: Text('ฟีดสาธารณะ', style: TextStyle(fontSize: 14))),
                                  DropdownMenuItem(value: 'internal', child: Text('ข่าวสารภายใน', style: TextStyle(fontSize: 14))),
                                ],
                                onChanged: (value) {
                                  if (value != null) {
                                    setState(() => _visibility = value);
                                  }
                                },
                              ),
                            ),
                          ),
                          const SizedBox(height: 18),
                        ],
                        
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('หัวข้อปัญหา', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                  const SizedBox(height: 8),
                                  TextField(
                                    controller: _titleController,
                                    decoration: InputDecoration(
                                      hintText: 'ระบุหัวข้อปัญหาที่ต้องการแจ้ง',
                                      hintStyle: const TextStyle(color: Colors.grey, fontSize: 13),
                                      filled: true, 
                                      fillColor: const Color(0xFFF8F9FA),
                                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                                      border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(12), 
                                        borderSide: const BorderSide(color: Color(0xFFE2E8F0))
                                      ),
                                      enabledBorder: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(12), 
                                        borderSide: const BorderSide(color: Color(0xFFE2E8F0))
                                      ),
                                      focusedBorder: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(12), 
                                        borderSide: BorderSide(color: upPurple, width: 1.5)
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 18),
                        
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('หมวดหมู่ปัญหา', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                  const SizedBox(height: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 12),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF8F9FA),
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(color: const Color(0xFFE2E8F0))
                                    ),
                                    child: DropdownButtonHideUnderline(
                                      child: DropdownButton<String>(
                                        value: _selectedCategory,
                                        isExpanded: true,
                                        icon: const Icon(Icons.keyboard_arrow_down, color: Colors.grey),
                                        items: _categories.map((e) => DropdownMenuItem<String>(
                                          value: e['id'].toString(), 
                                          child: Text(e['name'] ?? '', style: const TextStyle(fontSize: 13))
                                        )).toList(),
                                        onChanged: (val) => setState(() => _selectedCategory = val!),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 18),
                        
                        const Text('สถานที่ / อาคาร', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8F9FA),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFFE2E8F0))
                          ),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              value: _selectedBuilding,
                              isExpanded: true,
                              icon: const Icon(Icons.keyboard_arrow_down, color: Colors.grey),
                              items: _buildings.map((e) => DropdownMenuItem<String>(
                                value: e['id'].toString(), 
                                child: Text(e['name'] ?? '', style: const TextStyle(fontSize: 13))
                              )).toList(),
                              onChanged: (val) {
                                setState(() => _selectedBuilding = val!);
                                final b = _buildings.firstWhere((e) => e['id'].toString() == val, orElse: () => null);
                                if (b != null && b['latitude'] != null && b['longitude'] != null) {
                                  final lat = double.tryParse(b['latitude'].toString());
                                  final lng = double.tryParse(b['longitude'].toString());
                                  if (lat != null && lng != null) {
                                    final point = LatLng(lat, lng);
                                    setState(() => _selectedLocation = point);
                                    _mapController.move(point, 16.0);
                                  }
                                }
                              },
                            ),
                          ),
                        ),
                        const SizedBox(height: 18),
                        
                        const Text('รายละเอียดปัญหาที่พบเจอ', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _descController,
                          maxLines: 4,
                          decoration: InputDecoration(
                            hintText: 'พิมพ์ข้อความบรรยายปัญหาของคุณ...',
                            hintStyle: const TextStyle(color: Colors.grey, fontSize: 13),
                            filled: true, 
                            fillColor: const Color(0xFFF8F9FA),
                            contentPadding: const EdgeInsets.all(16),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12), 
                              borderSide: const BorderSide(color: Color(0xFFE2E8F0))
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12), 
                              borderSide: const BorderSide(color: Color(0xFFE2E8F0))
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12), 
                              borderSide: BorderSide(color: upPurple, width: 1.5)
                            ),
                          ),
                        ),
                        const SizedBox(height: 18),
                        
                        // 📸 Image Picker UI
                        const Text('รูปภาพประกอบ (ไม่บังคับ)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        const SizedBox(height: 8),
                        GestureDetector(
                          onTap: _isLoading ? null : _pickImage,
                          child: Container(
                            width: double.infinity,
                            height: _imageBytes == null ? 120 : null,
                            decoration: BoxDecoration(
                              color: const Color(0xFFF8F9FA),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: const Color(0xFFE2E8F0), style: BorderStyle.solid),
                            ),
                            child: _imageBytes == null
                                ? Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(Icons.cloud_upload_outlined, size: 40, color: Colors.grey.shade400),
                                      const SizedBox(height: 8),
                                      Text('คลิกเพื่ออัพโหลดรูปภาพ', style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                                    ],
                                  )
                                : Stack(
                                    children: [
                                      ClipRRect(
                                        borderRadius: BorderRadius.circular(12),
                                        child: Image.memory(_imageBytes!, width: double.infinity, fit: BoxFit.cover),
                                      ),
                                      Positioned(
                                        top: 8,
                                        right: 8,
                                        child: GestureDetector(
                                          onTap: () => setState(() => _imageBytes = null),
                                          child: Container(
                                            padding: const EdgeInsets.all(4),
                                            decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
                                            child: const Icon(Icons.close, color: Colors.white, size: 18),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                          ),
                        ),
                        const SizedBox(height: 18),

                        // 🗺️ Map Picker UI
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('พิกัดสถานที่ (ไม่บังคับ)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                            if (_selectedLocation != null)
                              TextButton(
                                onPressed: () => setState(() => _selectedLocation = null),
                                child: const Text('ล้างพิกัด', style: TextStyle(fontSize: 12, color: Colors.red)),
                              )
                          ],
                        ),
                        const SizedBox(height: 4),
                        Container(
                          height: 200,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: FlutterMap(
                              mapController: _mapController,
                              options: MapOptions(
                                initialCenter: const LatLng(19.0289, 99.8973), // มหาวิทยาลัยพะเยา
                                initialZoom: 14,
                                onTap: (tapPosition, point) {
                                  setState(() {
                                    _selectedLocation = point;
                                  });
                                },
                              ),
                              children: [
                                TileLayer(
                                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                                  userAgentPackageName: 'com.university_social_app',
                                ),
                                if (_selectedLocation != null)
                                  MarkerLayer(
                                    markers: [
                                      Marker(
                                        point: _selectedLocation!,
                                        width: 40,
                                        height: 40,
                                        child: const Icon(Icons.location_on, color: Colors.red, size: 40),
                                      ),
                                    ],
                                  ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _selectedLocation != null 
                            ? 'พิกัดที่เลือก: ${_selectedLocation!.latitude.toStringAsFixed(4)}, ${_selectedLocation!.longitude.toStringAsFixed(4)}'
                            : '📍 แตะบนแผนที่เพื่อระบุตำแหน่ง',
                          style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                        ),
                        const SizedBox(height: 18),
                        

                        
                        SizedBox(
                          width: double.infinity,
                          height: 50,
                          child: ElevatedButton(
                            onPressed: _isLoading ? null : _submitProblem,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: upPurple,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              elevation: 2,
                            ),
                            child: _isLoading 
                              ? const SizedBox(
                                  width: 24,
                                  height: 24,
                                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 3),
                                )
                              : const Text('ส่งโพสต์แจ้งปัญหา', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white)),
                          ),
                        )
                      ],
                    ),
                  ),
                ),
              ),
            ),
    );
  }
}