import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'problem_detail_screen.dart';
import '../../services/problem_service.dart'; 

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
  int? _userId;
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
    final dynamic userIdObj = prefs.get('user_id');
    
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
      if (userIdObj is int) {
        _userId = userIdObj;
      } else if (userIdObj is String) {
        _userId = int.tryParse(userIdObj);
      }
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
      // 🌟 ทริค: เติม 'Z' เข้าไปข้างหลัง เพื่อบังคับให้แอปมองว่าเป็นเวลา UTC
      String dateString = rawDate;
      if (!dateString.endsWith('Z')) {
        // บางทีหลังบ้านส่งมาแค่ "2026-07-02T13:55:00" เราเลยต้องเติม Z ให้มัน
        dateString += 'Z'; 
      }
      
      // พอเราบังคับเป็น UTC แล้ว คำสั่ง .toLocal() จะบวกเวลาไทยให้ (+7 ชั่วโมง) อัตโนมัติครับ
      final date = DateTime.parse(dateString).toLocal();
      
      final thaiMonths = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
      ];
      
      final day = date.day;
      final month = thaiMonths[date.month - 1];
      final year = date.year + 543; // แปลง ค.ศ. เป็น พ.ศ.
      
      // ดึงเฉพาะเวลา ชั่วโมง:นาที
      final timeStr = DateFormat('HH:mm').format(date);
      
      return '$day $month $year เวลา $timeStr น.';
    } catch (e) { 
      return ''; 
    }
  }

  @override
  Widget build(BuildContext context) {
    // 🌟 ดึงสิทธิ์ผู้ใช้ปัจจุบันมาใช้งาน (รองรับเฉพาะ roleId == 2 หรือ 4 สำหรับบุคลากรและแอดมิน)
    final bool isStaff = _userRole == 2 || _userRole == 4;

    // 🌟 ระบบคัดกรองโพสต์ (สิทธิ์การมองเห็น + หมวดหมู่)
    List<dynamic> displayProblems = _problems.where((p) {
      bool passCategory = true;
      if (_selectedCategoryId != 0) {
        passCategory = (p['category_id'] == _selectedCategoryId) || 
                       (p['category'] != null && p['category']['id'] == _selectedCategoryId);
      }

      return passCategory;
    }).toList();

    // 🌟 นับจำนวนโพสต์แต่ละหมวดหมู่และกรองหมวดหมู่ที่ไม่มีโพสต์
    int getCategoryCount(int categoryId) {
      if (categoryId == 0) return _problems.length;
      return _problems.where((p) {
        return (p['category_id'] == categoryId) || 
               (p['category'] != null && p['category']['id'] == categoryId);
      }).length;
    }

    final List<Map<String, dynamic>> visibleCategories = _categories.where((cat) {
      if (cat['id'] == 0) return true;
      return getCategoryCount(cat['id']) > 0;
    }).toList();

    // 🌟 รีเซ็ต _selectedCategoryId กลับเป็นทั้งหมด หากหมวดหมู่ที่เลือกไว้ไม่มีโพสต์แล้ว
    if (_selectedCategoryId != 0 && !visibleCategories.any((c) => c['id'] == _selectedCategoryId)) {
      // ใช้ Future.microtask เพื่อหลีกเลี่ยงการเรียก setState ในช่วง build
      Future.microtask(() {
        if (mounted) setState(() => _selectedCategoryId = 0);
      });
    }

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
                        itemCount: visibleCategories.length,
                        itemBuilder: (context, catIndex) {
                          final category = visibleCategories[catIndex];
                          final isSelected = _selectedCategoryId == category['id'];
                          final count = getCategoryCount(category['id']);

                          return Padding(
                            padding: const EdgeInsets.only(right: 10),
                            child: ChoiceChip(
                              label: Text('${category['icon']} ${category['name']} ($count)'),
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
                              child: Builder(builder: (_) {
                                const String roleName = 'ไม่ระบุตัวตน';
                                const IconData roleIcon = Icons.visibility_off;
                                
                                return const Row(
                                  children: [
                                    Icon(roleIcon, size: 14, color: Color(0xFF2B164D)),
                                    SizedBox(width: 4),
                                    Text(roleName, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF2B164D))),
                                  ],
                                );
                              }),
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
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                IconButton(
                                  icon: Icon(
                                    problem['is_upvoted_by_me'] == true ? Icons.favorite : Icons.favorite_border,
                                    color: problem['is_upvoted_by_me'] == true ? const Color(0xFFE11D48) : Colors.grey.shade600,
                                    size: 24,
                                  ),
                                  onPressed: () async {
                                    final problemId = problem['id'];
                                    setState(() {
                                      bool isUpvoted = problem['is_upvoted_by_me'] == true;
                                      problem['is_upvoted_by_me'] = !isUpvoted;
                                      problem['upvote_count'] = (problem['upvote_count'] ?? 0) + (isUpvoted ? -1 : 1);
                                    });
                                    final result = await ProblemService.toggleUpvote(problemId);
                                    if (result['success'] == true) {
                                      setState(() {
                                        problem['is_upvoted_by_me'] = result['is_upvoted_by_me'];
                                        problem['upvote_count'] = result['upvote_count'];
                                      });
                                    } else {
                                      setState(() {
                                        bool isUpvoted = problem['is_upvoted_by_me'] == true;
                                        problem['is_upvoted_by_me'] = !isUpvoted;
                                        problem['upvote_count'] = (problem['upvote_count'] ?? 0) + (isUpvoted ? -1 : 1);
                                      });
                                      if (mounted) {
                                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(result['message'] ?? 'โหวตไม่สำเร็จ'), backgroundColor: Colors.red));
                                      }
                                    }
                                  },
                                ),
                                Text('${problem['upvote_count'] ?? 0}', style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF475569))),
                              ],
                            ),
                            
                            if (problem['author_id'] != null && _userId != null && problem['author_id'] == _userId)
                              IconButton(
                                icon: const Icon(Icons.delete_outline, color: Colors.grey),
                                onPressed: () {
                                  showDialog(
                                    context: context,
                                    builder: (context) => AlertDialog(
                                      title: const Text('ยืนยันการลบโพสต์'),
                                      content: const Text('คุณแน่ใจหรือไม่ว่าต้องการลบโพสต์นี้?'),
                                      actions: [
                                        TextButton(onPressed: () => Navigator.pop(context), child: const Text('ยกเลิก', style: TextStyle(color: Colors.grey))),
                                        TextButton(
                                          onPressed: () async {
                                            Navigator.pop(context);
                                            setState(() => _isLoading = true);
                                            final result = await ProblemService.deleteProblem(problem['id']);
                                            if (result['success'] == true) {
                                              _fetchProblems();
                                              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('ลบโพสต์สำเร็จ'), backgroundColor: Colors.green));
                                            } else {
                                              setState(() => _isLoading = false);
                                              if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(result['message'] ?? 'เกิดข้อผิดพลาด'), backgroundColor: Colors.red));
                                            }
                                          }, 
                                          child: const Text('ลบ', style: TextStyle(color: Colors.red))
                                        ),
                                      ],
                                    )
                                  );
                                },
                              )
                          ],
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