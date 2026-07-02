import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:intl/intl.dart';

class ProblemsManagementView extends StatefulWidget {
  const ProblemsManagementView({super.key});

  @override
  State<ProblemsManagementView> createState() => _ProblemsManagementViewState();
}

class _ProblemsManagementViewState extends State<ProblemsManagementView> {
  final Color upPurple = const Color(0xFF2B164D);
  List<dynamic> _problems = [];
  bool _isLoading = true;
  final Set<int> _selectedIds = {};
  String _selectedStatusToUpdate = 'IN_PROGRESS';

  static const String _baseUrl = 'https://university-social-listening-platform.onrender.com/api/v1/problems';

  @override
  void initState() {
    super.initState();
    _fetchProblems();
  }

  Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('access_token');
  }

  Future<void> _fetchProblems() async {
    setState(() {
      _isLoading = true;
      _selectedIds.clear();
    });
    try {
      final token = await _getToken();
      final response = await http.get(
        Uri.parse('$_baseUrl/list'),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
      );

      debugPrint('📋 Fetch Problems Status: ${response.statusCode} — Body: ${response.body}');

      if (response.statusCode == 200) {
        final decodedData = jsonDecode(utf8.decode(response.bodyBytes));
        final List<dynamic> items;
        if (decodedData is List) {
          items = decodedData;
        } else if (decodedData is Map) {
          items = (decodedData['data']?['items'] ?? decodedData['items'] ?? decodedData['data'] ?? []) as List<dynamic>;
        } else {
          items = [];
        }
        setState(() {
          _problems = items;
          _isLoading = false;
        });
      } else {
        debugPrint('❌ Failed to load problems: ${response.statusCode}');
        setState(() => _isLoading = false);
      }
    } catch (e) {
      debugPrint('🚨 Fetch problems exception: $e');
      setState(() => _isLoading = false);
    }
  }

  Future<void> _bulkUpdateStatus() async {
    if (_selectedIds.isEmpty) return;

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('ยืนยันการอัพเดทสถานะ'),
        content: Text('คุณต้องการเปลี่ยนสถานะของปัญหาที่เลือก ${_selectedIds.length} รายการ หรือไม่?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('ยกเลิก')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('ยืนยัน', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blue)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isLoading = true);
    try {
      final token = await _getToken();
      final response = await http.patch(
        Uri.parse('$_baseUrl/bulk-update'),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          "problem_ids": _selectedIds.toList(),
          "new_status": _selectedStatusToUpdate,
        }),
      );

      if (response.statusCode == 200) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('อัพเดทสถานะสำเร็จ'), backgroundColor: Colors.green),
          );
        }
        _fetchProblems();
      } else {
        throw Exception('Failed to bulk update: ${response.body}');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('เกิดข้อผิดพลาด: $e'), backgroundColor: Colors.red),
        );
      }
      setState(() => _isLoading = false);
    }
  }

  // ── Status Update Dialog ──────────────────────────────────────────────────
  Future<void> _showStatusDialog(dynamic problem) async {
    String selectedStatus = problem['status'] ?? 'OPEN';
    final commentController = TextEditingController();

    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(
            children: [
              const Icon(Icons.edit_note, color: Colors.blue),
              const SizedBox(width: 8),
              Expanded(child: Text('Update Status — #${problem['id']}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold))),
            ],
          ),
          content: SizedBox(
            width: 400,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  problem['title'] ?? '',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.grey, fontSize: 13),
                ),
                const SizedBox(height: 16),
                const Text('New Status:', style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey.shade300),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: selectedStatus,
                      isExpanded: true,
                      items: const [
                        DropdownMenuItem(value: 'OPEN', child: Text('🟠 OPEN')),
                        DropdownMenuItem(value: 'IN_PROGRESS', child: Text('🔵 IN PROGRESS')),
                        DropdownMenuItem(value: 'RESOLVED', child: Text('🟢 RESOLVED')),
                        DropdownMenuItem(value: 'CLOSED', child: Text('⚫ CLOSED')),
                      ],
                      onChanged: (v) => setDialogState(() => selectedStatus = v!),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                const Text('Comment (optional):', style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                TextField(
                  controller: commentController,
                  maxLines: 3,
                  decoration: InputDecoration(
                    hintText: 'เหตุผลหรือหมายเหตุในการเปลี่ยนสถานะ...',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    contentPadding: const EdgeInsets.all(12),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                Navigator.pop(ctx);
                await _submitStatusUpdate(problem['id'], selectedStatus, commentController.text.trim());
              },
              style: ElevatedButton.styleFrom(backgroundColor: upPurple, foregroundColor: Colors.white),
              child: const Text('Update Status'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _submitStatusUpdate(int problemId, String newStatus, String comment) async {
    try {
      final token = await _getToken();
      final uri = Uri.parse('$_baseUrl/$problemId/status').replace(
        queryParameters: {
          'new_status': newStatus,
          if (comment.isNotEmpty) 'comment': comment,
        },
      );
      final response = await http.patch(
        uri,
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
      );

      if (mounted) {
        if (response.statusCode == 200) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('✅ Status updated to $newStatus'), backgroundColor: Colors.green),
          );
          _fetchProblems();
        } else {
          final errData = jsonDecode(response.body);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('❌ ${errData['message'] ?? 'Failed to update'}'), backgroundColor: Colors.red),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('❌ Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  // ── Reply / Comment Dialog ─────────────────────────────────────────────────
  Future<void> _showCommentDialog(dynamic problem) async {
    final commentController = TextEditingController();

    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            const Icon(Icons.comment, color: Colors.green),
            const SizedBox(width: 8),
            Expanded(child: Text('Official Reply — #${problem['id']}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold))),
          ],
        ),
        content: SizedBox(
          width: 400,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                problem['title'] ?? '',
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: Colors.grey, fontSize: 13),
              ),
              const SizedBox(height: 16),
              const Text('Admin Response:', style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              TextField(
                controller: commentController,
                maxLines: 5,
                autofocus: true,
                decoration: InputDecoration(
                  hintText: 'พิมพ์การตอบกลับอย่างเป็นทางการของคุณที่นี่...',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  contentPadding: const EdgeInsets.all(12),
                ),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.green.shade50,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: Colors.green.shade100),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.verified_user, size: 14, color: Colors.green),
                    SizedBox(width: 6),
                    Text('จะแสดงเป็น Admin Reply', style: TextStyle(fontSize: 12, color: Colors.green, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton.icon(
            onPressed: () async {
              final text = commentController.text.trim();
              if (text.isEmpty) return;
              Navigator.pop(ctx);
              await _submitComment(problem['id'], text);
            },
            icon: const Icon(Icons.send, size: 16),
            label: const Text('Send Reply'),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white),
          ),
        ],
      ),
    );
  }

  Future<void> _submitComment(int problemId, String content) async {
    try {
      final token = await _getToken();
      final response = await http.post(
        Uri.parse('$_baseUrl/$problemId/comments'),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
        body: jsonEncode({'content': content}),
      );

      if (mounted) {
        if (response.statusCode == 201) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('✅ Reply sent successfully'), backgroundColor: Colors.green),
          );
        } else {
          final errData = jsonDecode(response.body);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('❌ ${errData['message'] ?? 'Failed to send reply'}'), backgroundColor: Colors.red),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('❌ Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  void _toggleSelection(int id, bool? selected) {
    setState(() {
      if (selected == true) {
        _selectedIds.add(id);
      } else {
        _selectedIds.remove(id);
      }
    });
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'OPEN': return Colors.orange;
      case 'IN_PROGRESS': return Colors.blue;
      case 'RESOLVED': return Colors.green;
      case 'CLOSED': return Colors.grey;
      default: return Colors.black;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: Column(
        children: [
          // Header & Bulk Update
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            color: Colors.white,
            child: Row(
              children: [
                if (_selectedIds.isNotEmpty) ...[
                  Text('${_selectedIds.length} Selected', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.blue)),
                  const SizedBox(width: 24),
                  DropdownButton<String>(
                    value: _selectedStatusToUpdate,
                    items: const [
                      DropdownMenuItem(value: 'OPEN', child: Text('OPEN')),
                      DropdownMenuItem(value: 'IN_PROGRESS', child: Text('IN_PROGRESS')),
                      DropdownMenuItem(value: 'RESOLVED', child: Text('RESOLVED')),
                      DropdownMenuItem(value: 'CLOSED', child: Text('CLOSED')),
                    ],
                    onChanged: (v) => setState(() => _selectedStatusToUpdate = v!),
                  ),
                  const SizedBox(width: 16),
                  ElevatedButton.icon(
                    onPressed: _bulkUpdateStatus,
                    icon: const Icon(Icons.update),
                    label: const Text('Bulk Update'),
                    style: ElevatedButton.styleFrom(backgroundColor: upPurple, foregroundColor: Colors.white),
                  ),
                ] else ...[
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Problems Management', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
                      Text('${_problems.length} total records', style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                    ],
                  ),
                ],
                const Spacer(),
                ElevatedButton.icon(
                  onPressed: _fetchProblems,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Refresh'),
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.grey.shade200, foregroundColor: Colors.black87),
                ),
              ],
            ),
          ),

          // Data Table
          Expanded(
            child: _isLoading
                ? Center(child: CircularProgressIndicator(color: upPurple))
                : _problems.isEmpty
                    ? const Center(child: Text('No problems found.'))
                    : SingleChildScrollView(
                        padding: const EdgeInsets.all(24),
                        child: Container(
                          width: double.infinity,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.grey.shade200),
                            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10)],
                          ),
                          child: Theme(
                            data: Theme.of(context).copyWith(
                              dataTableTheme: DataTableThemeData(
                                headingRowColor: MaterialStateProperty.all(Colors.grey.shade50),
                              ),
                            ),
                            child: DataTable(
                              showCheckboxColumn: true,
                              columnSpacing: 20,
                              columns: const [
                                DataColumn(label: Text('ID', style: TextStyle(fontWeight: FontWeight.bold))),
                                DataColumn(label: Text('Title', style: TextStyle(fontWeight: FontWeight.bold))),
                                DataColumn(label: Text('Category', style: TextStyle(fontWeight: FontWeight.bold))),
                                DataColumn(label: Text('Date', style: TextStyle(fontWeight: FontWeight.bold))),
                                DataColumn(label: Text('Status', style: TextStyle(fontWeight: FontWeight.bold))),
                                DataColumn(label: Text('Actions', style: TextStyle(fontWeight: FontWeight.bold))),
                              ],
                              rows: _problems.map((problem) {
                                final isSelected = _selectedIds.contains(problem['id']);
                                String formattedDate = '—';
                                if (problem['created_at'] != null) {
                                  try {
                                    final d = DateTime.parse(problem['created_at']);
                                    formattedDate = DateFormat('dd/MM/yy').format(d);
                                  } catch (_) {}
                                }
                                final categoryName = problem['category'] != null
                                    ? (problem['category']['name'] ?? problem['category_id']?.toString() ?? 'N/A')
                                    : (problem['category_id']?.toString() ?? 'N/A');

                                return DataRow(
                                  selected: isSelected,
                                  onSelectChanged: (val) => _toggleSelection(problem['id'], val),
                                  cells: [
                                    DataCell(Text('#${problem['id']}', style: TextStyle(color: Colors.grey.shade500, fontSize: 12))),
                                    DataCell(
                                      SizedBox(
                                        width: 220,
                                        child: Text(
                                          problem['title'] ?? 'N/A',
                                          maxLines: 2,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(fontWeight: FontWeight.w500),
                                        ),
                                      ),
                                    ),
                                    DataCell(Text(categoryName, style: const TextStyle(fontSize: 13))),
                                    DataCell(Text(formattedDate, style: const TextStyle(fontSize: 13))),
                                    DataCell(
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: _getStatusColor(problem['status'] ?? 'OPEN').withOpacity(0.1),
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                          problem['status'] ?? 'OPEN',
                                          style: TextStyle(
                                            color: _getStatusColor(problem['status'] ?? 'OPEN'),
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                    ),
                                    DataCell(
                                      Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          IconButton(
                                            icon: const Icon(Icons.edit_note, color: Colors.blue),
                                            tooltip: 'Update Status',
                                            onPressed: () => _showStatusDialog(problem),
                                          ),
                                          IconButton(
                                            icon: const Icon(Icons.comment, color: Colors.green),
                                            tooltip: 'Official Reply',
                                            onPressed: () => _showCommentDialog(problem),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                );
                              }).toList(),
                            ),
                          ),
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}
