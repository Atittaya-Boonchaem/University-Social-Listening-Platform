
// import 'package:flutter/material.dart';
// import 'package:intl/intl.dart';
// import 'problem_detail_screen.dart';
// import '../../services/problem_service.dart'; // 🌟 ดึงไฟล์ API Service เข้ามาใช้งาน

// class HomeScreen extends StatefulWidget {
//   const HomeScreen({super.key});

//   @override
//   State<HomeScreen> createState() => _HomeScreenState();
// }

// class _HomeScreenState extends State<HomeScreen> {
//   List<dynamic> _problems = [];
//   bool _isLoading = true;
//   final Color upPurple = const Color(0xFF2B164D);
  
//   int _activeTab = 0; 
//   int _userRole = 0; 
//   int _selectedCategoryId = 0;

//   final List<Map<String, dynamic>> _categories = [
//     {'id': 0, 'name': 'ทั้งหมด', 'icon': '📋'},
//     {'id': 1, 'name': 'สถานที่/อาคาร', 'icon': '🏢'},
//     {'id': 2, 'name': 'รถเมล์', 'icon': '🚌'},
//     {'id': 3, 'name': 'ความสะอาด', 'icon': '🧹'},
//     {'id': 4, 'name': 'ระบบ IT', 'icon': '💻'},
//   ];

//   @override
//   void initState() {
//     super.initState();
//     _fetchProblems();
//   }

//   @override
//   void didChangeDependencies() {
//     super.didChangeDependencies();
//     final args = ModalRoute.of(context)?.settings.arguments;
//     if (args != null && args is int) {
//       _userRole = args;
//     }
//   }

//   // 🌟 อัปเดตฟังก์ชันดึงข้อมูล ให้เรียกผ่าน ProblemService 
//   Future<void> _fetchProblems() async {
//     setState(() { _isLoading = true; });
//     try {
//       final fetchedProblems = await ProblemService.getProblems();
      
//       if (mounted) {
//         setState(() {
//           _problems = fetchedProblems;
//           _isLoading = false;
//         });
//       }
//     } catch (e) {
//       print("🚨 ดึงข้อมูลไม่ได้: $e");
//       if (mounted) {
//         setState(() { _isLoading = false; });
//       }
//     }
//   }

//   String _formatDateTime(String? rawDate) {
//     if (rawDate == null || rawDate.isEmpty) return '';
//     try {
//       return DateFormat('HH:mm น. (dd/MM/yyyy)').format(DateTime.parse(rawDate));
//     } catch (e) { return ''; }
//   }

//   @override
//   Widget build(BuildContext context) {
//     List<dynamic> displayProblems = _problems.where((p) {
//       bool isStaffPost = p['is_staff_only'] == true;
//       bool passPrivacy = false;
//       if (_userRole == 1) {
//         passPrivacy = _activeTab == 0 ? !isStaffPost : isStaffPost;
//       } else {
//         passPrivacy = !isStaffPost;
//       }

//       bool passCategory = true;
//       if (_selectedCategoryId != 0) {
//         passCategory = (p['category_id'] == _selectedCategoryId) || 
//                        (p['category'] != null && p['category']['id'] == _selectedCategoryId);
//       }

//       return passPrivacy && passCategory;
//     }).toList();

//     return Scaffold(
//       backgroundColor: const Color(0xFFF9FAFB),
//       body: SafeArea(
//         child: RefreshIndicator(
//           onRefresh: _fetchProblems,
//           color: upPurple,
//           child: ListView.builder(
//             padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
//             itemCount: displayProblems.isEmpty ? 2 : displayProblems.length + 1, 
//             itemBuilder: (context, index) {
              
//               if (index == 0) {
//                 return Column(
//                   crossAxisAlignment: CrossAxisAlignment.center,
//                   children: [
//                     Row(
//                       mainAxisAlignment: MainAxisAlignment.center,
//                       children: [
//                         const Text('📣 ', style: TextStyle(fontSize: 24)),
//                         Text('UP Voice Feed', style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: upPurple)),
//                       ],
//                     ),
//                     const SizedBox(height: 8),
//                     const Text('กระดานรับฟังเสียงและปัญหาของชุมชนมหาวิทยาลัยพะเยา', style: TextStyle(fontSize: 13, color: Colors.grey)),
//                     const SizedBox(height: 24),
                    
//                     // ❌ ลบปุ่ม "แจ้งปัญหาใหม่" ออกไปแล้วจากตรงนี้
                    
//                     if (_userRole == 1) ...[
//                       Row(
//                         children: [
//                           GestureDetector(
//                             onTap: () => setState(() => _activeTab = 0),
//                             child: Container(
//                               padding: const EdgeInsets.only(bottom: 8),
//                               decoration: BoxDecoration(border: Border(bottom: BorderSide(color: _activeTab == 0 ? const Color(0xFF0EA5E9) : Colors.transparent, width: 2))),
//                               child: Text('🌐 ฟีดสาธารณะ', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: _activeTab == 0 ? const Color(0xFF0EA5E9) : Colors.grey)),
//                             ),
//                           ),
//                           const SizedBox(width: 24),
//                           GestureDetector(
//                             onTap: () => setState(() => _activeTab = 1),
//                             child: Container(
//                               padding: const EdgeInsets.only(bottom: 8),
//                               decoration: BoxDecoration(border: Border(bottom: BorderSide(color: _activeTab == 1 ? const Color(0xFFE11D48) : Colors.transparent, width: 2))),
//                               child: Text('🔒 ข่าวสารภายใน', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: _activeTab == 1 ? const Color(0xFFE11D48) : Colors.grey)),
//                             ),
//                           ),
//                         ],
//                       ),
//                       const Divider(height: 1, color: Color(0xFFE2E8F0)),
//                       const SizedBox(height: 16),
//                     ],

//                     SizedBox(
//                       height: 50, 
//                       child: ListView.builder(
//                         scrollDirection: Axis.horizontal,
//                         itemCount: _categories.length,
//                         itemBuilder: (context, catIndex) {
//                           final category = _categories[catIndex];
//                           final isSelected = _selectedCategoryId == category['id'];

//                           return Padding(
//                             padding: const EdgeInsets.only(right: 12),
//                             child: ChoiceChip(
//                               label: Text('${category['icon']} ${category['name']}'),
//                               selected: isSelected,
//                               onSelected: (selected) {
//                                 setState(() {
//                                   _selectedCategoryId = category['id'];
//                                 });
//                               },
//                               selectedColor: upPurple.withOpacity(0.15),
//                               backgroundColor: Colors.white,
//                               labelStyle: TextStyle(
//                                 color: isSelected ? upPurple : Colors.grey.shade600,
//                                 fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
//                                 fontSize: 13,
//                               ),
//                               shape: RoundedRectangleBorder(
//                                 borderRadius: BorderRadius.circular(20),
//                                 side: BorderSide(color: isSelected ? upPurple : Colors.grey.shade300), 
//                               ),
//                               showCheckmark: false,
//                             ),
//                           );
//                         },
//                       ),
//                     ),
//                     const SizedBox(height: 20),

//                     const Row(
//                       children: [
//                         Text('📌 ปัญหาล่าสุดบนกระดาน', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF334155))),
//                       ],
//                     ),
//                     const SizedBox(height: 16),
//                   ],
//                 );
//               }

//               if (displayProblems.isEmpty) {
//                 return Padding(
//                   padding: const EdgeInsets.only(top: 80),
//                   child: Center(child: _isLoading ? CircularProgressIndicator(color: upPurple) : const Text('ไม่พบปัญหาในหมวดหมู่นี้', style: TextStyle(color: Colors.grey))),
//                 );
//               }

//               final problem = displayProblems[index - 1];
//               final category = problem['category'];
//               final building = problem['building'];
//               final isStaffPost = problem['is_staff_only'] == true;

//               return GestureDetector(
//                 onTap: () {
//                   Navigator.push(
//                     context,
//                     MaterialPageRoute(
//                       builder: (context) => ProblemDetailScreen(
//                         problem: problem, 
//                         roleId: _userRole,
//                       ),
//                     ),
//                   );
//                 },
//                 child: Container(
//                   margin: const EdgeInsets.only(bottom: 16),
//                   decoration: BoxDecoration(
//                     color: Colors.white,
//                     borderRadius: BorderRadius.circular(12),
//                     boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8, offset: const Offset(0, 2))],
//                   ),
//                   clipBehavior: Clip.antiAlias,
//                   child: Container(
//                     decoration: BoxDecoration(
//                       border: Border(left: BorderSide(color: upPurple, width: 6)),
//                     ),
//                     padding: const EdgeInsets.all(16.0),
//                     child: Column(
//                       crossAxisAlignment: CrossAxisAlignment.start,
//                       mainAxisSize: MainAxisSize.min,
//                       children: [
//                         Row(
//                           mainAxisAlignment: MainAxisAlignment.spaceBetween,
//                           children: [
//                             Container(
//                               padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
//                               decoration: BoxDecoration(color: const Color(0xFFF3E8FF), borderRadius: BorderRadius.circular(20)),
//                               child: Row(
//                                 children: [
//                                   Icon(isStaffPost ? Icons.badge : Icons.school, size: 14, color: upPurple),
//                                   const SizedBox(width: 4),
//                                   Text(isStaffPost ? 'บุคลากร มพ.' : 'นิสิต มพ.', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: upPurple)),
//                                 ],
//                               ),
//                             ),
//                             if (isStaffPost) 
//                               Container(
//                                 padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
//                                 decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(8)),
//                                 child: const Text('🔒 แจ้งข่าวสารภายใน', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF475569))),
//                               )
//                             else
//                               Container(
//                                 padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
//                                 decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(8)),
//                                 child: Text(category?['name'] ?? problem['category'] ?? 'ทั่วไป', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFFD97706))),
//                               ),
//                           ],
//                         ),
//                         const SizedBox(height: 12),
//                         Text('โพสต์เมื่อ: ${_formatDateTime(problem['created_at'])}', style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
//                         const SizedBox(height: 8),
//                         Text(
//                           problem['description'] ?? problem['title'] ?? 'ไม่มีรายละเอียด',
//                           style: const TextStyle(fontSize: 15, color: Color(0xFF1E293B), height: 1.5),
//                         ),
//                         const SizedBox(height: 12),
//                         if (building != null || problem['location'] != null)
//                           Container(
//                             padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
//                             decoration: BoxDecoration(color: const Color(0xFFF8F9FA), borderRadius: BorderRadius.circular(6)),
//                             child: Row(
//                               mainAxisSize: MainAxisSize.min,
//                               children: [
//                                 const Icon(Icons.push_pin, size: 14, color: Color(0xFFE11D48)),
//                                 const SizedBox(width: 6),
//                                 Expanded(
//                                   child: Text('พิกัด: ${building?['name'] ?? problem['location'] ?? ''}', 
//                                     style: const TextStyle(fontSize: 12, color: Color(0xFF475569)),
//                                     maxLines: 1,
//                                     overflow: TextOverflow.ellipsis,
//                                   ),
//                                 ),
//                               ],
//                             ),
//                           ),
//                         const SizedBox(height: 16),
//                         const Divider(height: 1, color: Color(0xFFF1F5F9)),
//                         const SizedBox(height: 12),
//                         Container(
//                           padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
//                           decoration: BoxDecoration(border: Border.all(color: const Color(0xFFE2E8F0)), borderRadius: BorderRadius.circular(20)),
//                           child: const Row(
//                             mainAxisSize: MainAxisSize.min,
//                             children: [
//                               Icon(Icons.arrow_drop_up, size: 20, color: Color(0xFFE11D48)),
//                               SizedBox(width: 4),
//                               Text('เห็นด้วย (0)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
//                             ],
//                           ),
//                         )
//                       ],
//                     ),
//                   ),
//                 ),
//               );
//             },
//           ),
//         ),
//       ),
//     );
//   }
// }











import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'problem_detail_screen.dart';
import '../../services/problem_service.dart'; 
import '../problem_posting/create_problem_screen.dart'; 

class HomeScreen extends StatefulWidget {
  // 🌟 1. เปิดรับค่า roleId จาก MainNavigationScreen
  final int roleId; 
  const HomeScreen({super.key, this.roleId = 0});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<dynamic> _problems = [];
  bool _isLoading = true;
  int _userRole = 0;
  final Color upPurple = const Color(0xFF2B164D);
  
  int _activeTab = 0; // 0 = สาธารณะ, 1 = ภายใน
  int _selectedCategoryId = 0;

  final List<Map<String, dynamic>> _categories = [
    {'id': 0, 'name': 'ทั้งหมด', 'icon': '📋'},
    {'id': 1, 'name': 'สถานที่/อาคาร', 'icon': '🏢'},
    {'id': 2, 'name': 'รถเมล์', 'icon': '🚌'},
    {'id': 3, 'name': 'ความสะอาด', 'icon': '🧹'},
    {'id': 4, 'name': 'ระบบ IT', 'icon': '💻'},
  ];

  @override
  void initState() {
    super.initState();
    _loadRoleAndFetchProblems();
  }

  Future<void> _loadRoleAndFetchProblems() async {
    final prefs = await SharedPreferences.getInstance();
    final dynamic roleObj = prefs.get('role_id');
    int roleId = widget.roleId;
    if (roleObj != null) {
      if (roleObj is int) {
        roleId = roleObj;
      } else if (roleObj is String) {
        roleId = int.tryParse(roleObj) ?? roleId;
      }
    }
    setState(() {
      _userRole = roleId;
    });
    _fetchProblems();
  }

  // ลบ didChangeDependencies ออก เพราะเราใช้ widget.roleId แทนแล้ว

  Future<void> _fetchProblems() async {
    setState(() { _isLoading = true; });
    try {
      String feedType = _activeTab == 0 ? 'public' : 'internal';
      final fetchedProblems = await ProblemService.getProblems(feedType: feedType);
      
      if (mounted) {
        setState(() {
          _problems = fetchedProblems;
          _isLoading = false;
        });
      }
    } catch (e) {
      print("🚨 ดึงข้อมูลไม่ได้: $e");
      if (mounted) {
        setState(() { _isLoading = false; });
      }
    }
  }

  String _formatDateTime(String? rawDate) {
    if (rawDate == null || rawDate.isEmpty) return '';
    try {
      final date = DateTime.parse(rawDate).toLocal();
      final now = DateTime.now();
      final diff = now.difference(date);
      
      if (diff.inMinutes < 60) {
        return '${diff.inMinutes} นาทีที่แล้ว';
      } else if (diff.inHours < 24) {
        return '${diff.inHours} ชั่วโมงที่แล้ว';
      } else if (diff.inDays < 7) {
        return '${diff.inDays} วันที่แล้ว';
      }
      return DateFormat('dd/MM/yyyy HH:mm').format(date);
    } catch (e) { return ''; }
  }

  @override
  Widget build(BuildContext context) {
    // 🌟 ดึงสิทธิ์ผู้ใช้ปัจจุบันมาใช้งาน (รองรับเฉพาะ roleId == 2 สำหรับบุคลากร)
    final bool isStaff = _userRole == 2;

    // 🌟 ระบบคัดกรองโพสต์ (สิทธิ์การมองเห็น + หมวดหมู่)
    List<dynamic> displayProblems = _problems.where((p) {
      bool passCategory = true;
      if (_selectedCategoryId != 0) {
        passCategory = (p['category_id'] == _selectedCategoryId) || 
                       (p['category'] != null && p['category']['id'] == _selectedCategoryId);
      }

      return passCategory;
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _fetchProblems,
          color: upPurple,
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
            itemCount: displayProblems.isEmpty ? 2 : displayProblems.length + 1, 
            itemBuilder: (context, index) {
              
              if (index == 0) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Text('📣 ', style: TextStyle(fontSize: 26)),
                        Text('UP Voice Feed', style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: upPurple)),
                      ],
                    ),
                    const SizedBox(height: 6),
                    const Text('กระดานรับฟังเสียงและปัญหาของชุมชนมหาวิทยาลัยพะเยา', style: TextStyle(fontSize: 13, color: Colors.grey)),
                    const SizedBox(height: 20),
                    
                    // 🌟 ปุ่ม "+ แจ้งปัญหาใหม่"
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton.icon(
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (context) => CreateProblemScreen(roleId: _userRole)),
                          ).then((_) => _fetchProblems());
                        },
                        icon: const Icon(Icons.add, color: Colors.white, size: 20),
                        label: const Text('แจ้งปัญหาใหม่', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: upPurple,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          elevation: 2,
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    
                    // 🌟 2. โชว์ Tab บาร์เฉพาะเมื่อ isStaff เป็นจริง
                    if (isStaff) ...[
                      Row(
                        mainAxisAlignment: MainAxisAlignment.start,
                        children: [
                          GestureDetector(
                            onTap: () {
                              setState(() {
                                _activeTab = 0;
                                _problems.clear();
                              });
                              _fetchProblems();
                            },
                            child: Container(
                              padding: const EdgeInsets.only(bottom: 8, right: 8, left: 8),
                              decoration: BoxDecoration(border: Border(bottom: BorderSide(color: _activeTab == 0 ? const Color(0xFF0EA5E9) : Colors.transparent, width: 2))),
                              child: Text('🌐 ฟีดสาธารณะ', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: _activeTab == 0 ? const Color(0xFF0EA5E9) : Colors.grey)),
                            ),
                          ),
                          const SizedBox(width: 16),
                          GestureDetector(
                            onTap: () {
                              setState(() {
                                _activeTab = 1;
                                _problems.clear();
                              });
                              _fetchProblems();
                            },
                            child: Container(
                              padding: const EdgeInsets.only(bottom: 8, right: 8, left: 8),
                              decoration: BoxDecoration(border: Border(bottom: BorderSide(color: _activeTab == 1 ? const Color(0xFFE11D48) : Colors.transparent, width: 2))),
                              child: Text('🔒 ข่าวสารภายใน', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: _activeTab == 1 ? const Color(0xFFE11D48) : Colors.grey)),
                            ),
                          ),
                        ],
                      ),
                      const Divider(height: 1, color: Color(0xFFE2E8F0)),
                      const SizedBox(height: 16),
                    ],

                    // แถบหมวดหมู่
                    SizedBox(
                      height: 40, 
                      child: ListView.builder(
                        scrollDirection: Axis.horizontal,
                        itemCount: _categories.length,
                        itemBuilder: (context, catIndex) {
                          final category = _categories[catIndex];
                          final isSelected = _selectedCategoryId == category['id'];

                          return Padding(
                            padding: const EdgeInsets.only(right: 10),
                            child: ChoiceChip(
                              label: Text('${category['icon']} ${category['name']}'),
                              selected: isSelected,
                              onSelected: (selected) {
                                setState(() {
                                  _selectedCategoryId = category['id'];
                                });
                              },
                              selectedColor: upPurple.withOpacity(0.12),
                              backgroundColor: Colors.white,
                              labelStyle: TextStyle(
                                color: isSelected ? upPurple : Colors.grey.shade600,
                                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                fontSize: 13,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(20),
                                side: BorderSide(color: isSelected ? upPurple : Colors.grey.shade300), 
                              ),
                              showCheckmark: false,
                            ),
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],
                );
              }

              if (displayProblems.isEmpty) {
                return Padding(
                  padding: const EdgeInsets.only(top: 80),
                  child: Center(
                    child: _isLoading 
                      ? CircularProgressIndicator(color: upPurple) 
                      : Column(
                          children: [
                            Icon(Icons.feed_outlined, size: 60, color: Colors.grey.shade400),
                            const SizedBox(height: 12),
                            const Text('ไม่พบโพสต์ในหมวดหมู่นี้', style: TextStyle(color: Colors.grey, fontSize: 15)),
                          ],
                        )
                  ),
                );
              }

              final problem = displayProblems[index - 1];
              final category = problem['category'];
              final building = problem['building'];
              final isStaffPost = problem['is_staff_only'] == true;

              return GestureDetector(
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => ProblemDetailScreen(
                        problem: problem, 
                        roleId: _userRole,
                      ),
                    ),
                  );
                },
                child: Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 4))],
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: Container(
                    decoration: BoxDecoration(
                      border: Border(left: BorderSide(color: isStaffPost ? const Color(0xFFE11D48) : upPurple, width: 6)),
                    ),
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(color: const Color(0xFFF3E8FF), borderRadius: BorderRadius.circular(20)),
                              child: Row(
                                children: [
                                  Icon(isStaffPost ? Icons.badge : Icons.school, size: 14, color: upPurple),
                                  const SizedBox(width: 4),
                                  // ✅ แสดงชื่อผู้โพสต์จริงจาก API
                                  Builder(builder: (_) {
                                    final user = problem['user'];
                                    String displayName = 'ผู้ใช้งานทั่วไป';
                                    if (user != null) {
                                      displayName = user['display_name'] ?? 'ผู้ใช้งานทั่วไป';
                                    }
                                    return Text(displayName, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: upPurple));
                                  }),
                                ],
                              ),
                            ),
                            if (isStaffPost) 
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(8)),
                                child: const Row(
                                  children: [
                                    Icon(Icons.lock, size: 12, color: Color(0xFF475569)),
                                    SizedBox(width: 4),
                                    Text('แจ้งข่าวสารภายใน', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF475569))),
                                  ],
                                ),
                              )
                            else
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(8)),
                                child: Text(category?['name'] ?? problem['category'] ?? 'ทั่วไป', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFFD97706))),
                              ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Text('โพสต์เมื่อ: ${_formatDateTime(problem['created_at'])}', style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
                        const SizedBox(height: 12),
                        Text(
                          problem['description'] ?? problem['title'] ?? 'ไม่มีรายละเอียด',
                          style: const TextStyle(fontSize: 15, color: Color(0xFF1E293B), height: 1.5),
                        ),
                        const SizedBox(height: 16),
                        
                        if (problem['image_url'] != null && problem['image_url'].isNotEmpty) ...[
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Image.network(
                              problem['image_url'].startsWith('http') 
                                ? problem['image_url'] 
                                : 'http://127.0.0.1:8000/${problem['image_url'].replaceFirst(RegExp(r'^/+'), '').replaceFirst('uploads/', 'uploads/images/').replaceAll('images/images/', 'images/')}',
                              width: double.infinity,
                              height: 180,
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) => Container(
                                height: 180,
                                width: double.infinity,
                                color: Colors.grey.shade200,
                                child: const Icon(Icons.broken_image, size: 50, color: Colors.grey),
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                        ],
                        
                        if (building != null || problem['location'] != null)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(color: const Color(0xFFF8F9FA), borderRadius: BorderRadius.circular(8)),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.push_pin, size: 14, color: Color(0xFFE11D48)),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text('พิกัด: ${building?['name'] ?? problem['location'] ?? ''}', 
                                    style: const TextStyle(fontSize: 13, color: Color(0xFF475569)),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        const SizedBox(height: 16),
                        const Divider(height: 1, color: Color(0xFFF1F5F9)),
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(border: Border.all(color: const Color(0xFFE2E8F0)), borderRadius: BorderRadius.circular(20)),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.arrow_drop_up, size: 20, color: Color(0xFFE11D48)),
                              const SizedBox(width: 4),
                              Text('เห็นด้วย (${problem['upvote_count'] ?? 0})', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
                            ],
                          ),
                        )
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}