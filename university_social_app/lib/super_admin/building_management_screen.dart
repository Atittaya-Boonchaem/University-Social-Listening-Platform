
import 'package:flutter/material.dart';

class BuildingManagementScreen extends StatefulWidget {
  const BuildingManagementScreen({super.key});

  @override
  State<BuildingManagementScreen> createState() => _BuildingManagementScreenState();
}

class _BuildingManagementScreenState extends State<BuildingManagementScreen> {
  final Color upPurple = const Color(0xFF2B164D);
  
  // 📋 ข้อมูลจำลองรายชื่ออาคาร (เพิ่มสี ไอคอน และปัญหาล่าสุดให้ดูสมจริงขึ้น)
  List<Map<String, dynamic>> _buildings = [
    {
      'name': 'อาคารเทคโนโลยีสารสนเทศ (IT)', 
      'total_reports': 45, 
      'latest_issue': 'แอร์ห้อง 204 ไม่เย็น มีน้ำหยด',
      'color': const Color(0xFF3B82F6), // สีฟ้า
      'icon': Icons.computer
    },
    {
      'name': 'อาคารเรียนรวม (CE)', 
      'total_reports': 12, 
      'latest_issue': 'โปรเจคเตอร์ห้อง CE1409 เสีย',
      'color': const Color(0xFF10B981), // สีเขียว
      'icon': Icons.menu_book
    },
    {
      'name': 'หอพัก UP Dorm', 
      'total_reports': 28, 
      'latest_issue': 'น้ำประปาตึก 4 ไหลอ่อนมาก',
      'color': const Color(0xFFF59E0B), // สีส้ม
      'icon': Icons.hotel
    },
    {
      'name': 'โรงอาหารกลาง', 
      'total_reports': 5, 
      'latest_issue': 'โต๊ะไม่เพียงพอในช่วงเที่ยง',
      'color': const Color(0xFFEF4444), // สีแดง
      'icon': Icons.restaurant
    },
  ];

  final TextEditingController _buildingController = TextEditingController();

  // ➕ ฟังก์ชันเปิดป๊อปอัปเพิ่มอาคาร
  void _showAddBuildingDialog() {
    _buildingController.clear();
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text('เพิ่มอาคาร/สถานที่', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          content: TextField(
            controller: _buildingController,
            decoration: InputDecoration(
              hintText: 'เช่น อาคาร PKY, สนามกีฬา...',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('ยกเลิก', style: TextStyle(color: Colors.grey)),
            ),
            ElevatedButton(
              onPressed: () {
                if (_buildingController.text.trim().isNotEmpty) {
                  setState(() {
                    // แอดอาคารใหม่แบบ Default Style
                    _buildings.add({
                      'name': _buildingController.text.trim(),
                      'total_reports': 0,
                      'latest_issue': 'ยังไม่มีการแจ้งปัญหา',
                      'color': upPurple,
                      'icon': Icons.apartment
                    });
                  });
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('เพิ่มอาคารเรียบร้อยแล้ว'), backgroundColor: Colors.green),
                  );
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: upPurple, foregroundColor: Colors.white),
              child: const Text('บันทึก'),
            ),
          ],
        );
      },
    );
  }

  // 🗑️ ฟังก์ชันลบอาคาร
  void _deleteBuilding(int index) {
    setState(() {
      _buildings.removeAt(index);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(
        title: const Text('จัดการอาคารสถานที่', style: TextStyle(color: Colors.black87, fontWeight: FontWeight.bold, fontSize: 18)),
        backgroundColor: Colors.white,
        elevation: 1,
        iconTheme: const IconThemeData(color: Colors.black87),
      ),
      body: _buildings.isEmpty
          ? const Center(child: Text('ไม่มีข้อมูลอาคารในระบบ', style: TextStyle(color: Colors.grey)))
          : ListView.builder(
              padding: const EdgeInsets.all(20),
              itemCount: _buildings.length,
              itemBuilder: (context, index) {
                final building = _buildings[index];
                final color = building['color'] as Color;
                
                return Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.grey.shade100),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.02),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      )
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // 📌 Header ของการ์ด (รูปไอคอน + ชื่ออาคาร)
                      Row(
                        children: [
                          CircleAvatar(
                            radius: 24,
                            backgroundColor: color.withOpacity(0.1),
                            child: Icon(building['icon'], color: color, size: 24),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(building['name'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF1E293B))),
                                const SizedBox(height: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: Colors.grey.shade100,
                                    borderRadius: BorderRadius.circular(12)
                                  ),
                                  child: Text('สถิติแจ้งปัญหา: ${building['total_reports']} ครั้ง', style: const TextStyle(fontSize: 11, color: Colors.black87, fontWeight: FontWeight.bold)),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      const Divider(height: 1, color: Color(0xFFF1F5F9)),
                      const SizedBox(height: 12),
                      
                      // 📋 แสดงรายละเอียดปัญหาล่าสุด
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.info_outline, size: 16, color: Colors.grey),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text('ปัญหาล่าสุด: ${building['latest_issue']}', 
                              style: const TextStyle(fontSize: 13, color: Colors.grey), 
                              maxLines: 1, 
                              overflow: TextOverflow.ellipsis
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      
                      // 🔘 ส่วนปุ่ม Action สำหรับแอดมิน
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () {},
                              icon: const Icon(Icons.edit, size: 16),
                              label: const Text('แก้ไข'),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: Colors.blueGrey,
                                side: BorderSide(color: Colors.grey.shade300),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: () => _deleteBuilding(index),
                              icon: const Icon(Icons.delete_outline, size: 16),
                              label: const Text('ลบอาคาร'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFFFEF2F2), 
                                foregroundColor: const Color(0xFFEF4444), 
                                elevation: 0,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                            ),
                          ),
                        ],
                      )
                    ],
                  ),
                );
              },
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddBuildingDialog,
        backgroundColor: upPurple,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('เพิ่มอาคาร', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
    );
  }
}