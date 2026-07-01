
import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;

class DashboardView extends StatefulWidget {
  const DashboardView({super.key});

  @override
  State<DashboardView> createState() => _DashboardViewState();
}

class _DashboardViewState extends State<DashboardView> {
  final Color upPurple = const Color(0xFF2B164D);
  int _totalProblems = 0;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchProblemStats();
  }

  Future<void> _fetchProblemStats() async {
    setState(() { _isLoading = true; });
    try {
      final response = await http.get(Uri.parse('http://localhost:8000/api/v1/problems/problems/list'));
      if (response.statusCode == 200) {
        final dynamic decodedData = jsonDecode(utf8.decode(response.bodyBytes));
        List items = [];
        if (decodedData is List) items = decodedData;
        else if (decodedData is Map) {
          if (decodedData['data'] is List) items = decodedData['data'];
          else if (decodedData['items'] is List) items = decodedData['items'];
          else if (decodedData['data'] != null && decodedData['data']['items'] is List) items = decodedData['data']['items'];
        }
        setState(() {
          _totalProblems = items.length;
          _isLoading = false;
        });
      } else {
        throw Exception('Failed to load stats');
      }
    } catch (e) {
      setState(() { _isLoading = false; });
    }
  }

  // 🌟 ฟังก์ชันนี้ถูกแก้บั๊ก Layout แล้ว โดยกำหนดความสูงคงที่และเอา Spacer ออก
  Widget _buildGridStatCard(String title, String value, IconData icon, Color color) {
    return Expanded(
      child: Container(
        height: 140, // 🛠️ บังคับความสูงแก้บั๊ก Layout พัง
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.grey.shade100),
          boxShadow: [
            BoxShadow(
              color: color.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, 4),
            )
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween, // 🛠️ จัดช่องว่างระหว่างบน-ล่างอัตโนมัติ
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                CircleAvatar(
                  backgroundColor: color.withOpacity(0.1),
                  radius: 18,
                  child: Icon(icon, color: color, size: 20),
                ),
                Icon(Icons.arrow_forward_ios, size: 12, color: Colors.grey.shade300),
              ],
            ),
            // 🛠️ จับกลุ่ม Text ไว้ด้วยกันด้านล่าง
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _isLoading 
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : Text(value, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
                const SizedBox(height: 4),
                Text(title, style: const TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.w500)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // 🌟 สร้างบาร์สถิติหมวดหมู่แบบ Visual
  Widget _buildCategoryBar(String title, double percent, Color color) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          SizedBox(width: 80, child: Text(title, style: const TextStyle(fontSize: 12, color: Color(0xFF475569)))),
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: LinearProgressIndicator(
                value: percent,
                backgroundColor: color.withOpacity(0.1),
                color: color,
                minHeight: 8,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Text('${(percent * 100).toInt()}%', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: RefreshIndicator(
        onRefresh: _fetchProblemStats,
        color: upPurple,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 🧑‍💼 Header ส่วนต้อนรับ
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('ยินดีต้อนรับกลับ,', style: TextStyle(fontSize: 14, color: Colors.grey)),
                      const SizedBox(height: 4),
                      Text('Super Admin 👋', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: upPurple)),
                    ],
                  ),
                  CircleAvatar(
                    backgroundColor: upPurple.withOpacity(0.1),
                    child: const Icon(Icons.admin_panel_settings, color: Color(0xFF2B164D)),
                  )
                ],
              ),
              const SizedBox(height: 24),

              // 📊 2x2 Grid สถิติ
              Row(
                children: [
                  _buildGridStatCard('เรื่องทั้งหมด', '$_totalProblems', Icons.assignment_outlined, const Color(0xFF3B82F6)),
                  const SizedBox(width: 16),
                  _buildGridStatCard('รอรับเรื่อง', '12', Icons.pending_actions, const Color(0xFFF59E0B)),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  _buildGridStatCard('กำลังดำเนินการ', '4', Icons.handyman_outlined, upPurple),
                  const SizedBox(width: 16),
                  _buildGridStatCard('เสร็จสิ้นแล้ว', '8', Icons.check_circle_outline, const Color(0xFF10B981)),
                ],
              ),
              const SizedBox(height: 32),

              // 📈 สัดส่วนหมวดหมู่ปัญหา
              const Text('สัดส่วนหมวดหมู่ปัญหา', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey.shade100),
                ),
                child: Column(
                  children: [
                    _buildCategoryBar('อาคารสถานที่', 0.65, const Color(0xFF3B82F6)),
                    _buildCategoryBar('ความสะอาด', 0.20, const Color(0xFF10B981)),
                    _buildCategoryBar('ระบบ IT', 0.10, const Color(0xFFF59E0B)),
                    _buildCategoryBar('รถเมล์', 0.05, const Color(0xFFEF4444)),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // 📍 กราฟ/แผนที่แบบย่อ
              const Text('พื้นที่เกิดเหตุบ่อย (Hotspots)', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
              const SizedBox(height: 16),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [const Color(0xFF1E293B), upPurple],
                  ),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [BoxShadow(color: upPurple.withOpacity(0.2), blurRadius: 10, offset: const Offset(0, 4))],
                ),
                child: const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.location_on, color: Colors.white, size: 20),
                        SizedBox(width: 8),
                        Text('3 อันดับพื้นที่ที่มีการแจ้งเตือนสูงสุด', style: TextStyle(color: Colors.white70, fontSize: 13)),
                      ],
                    ),
                    SizedBox(height: 20),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('1. อาคารเทคโนโลยีสารสนเทศ', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                        Text('45 เรื่อง', style: TextStyle(color: Color(0xFFFCD34D), fontWeight: FontWeight.bold)),
                      ],
                    ),
                    Divider(color: Colors.white24, height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('2. หอพัก UP Dorm', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                        Text('28 เรื่อง', style: TextStyle(color: Color(0xFFFCD34D), fontWeight: FontWeight.bold)),
                      ],
                    ),
                    Divider(color: Colors.white24, height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('3. โรงอาหารกลาง', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                        Text('12 เรื่อง', style: TextStyle(color: Color(0xFFFCD34D), fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }
}