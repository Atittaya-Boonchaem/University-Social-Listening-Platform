import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class UserManagementView extends StatefulWidget {
  const UserManagementView({super.key});

  @override
  State<UserManagementView> createState() => _UserManagementViewState();
}

class _UserManagementViewState extends State<UserManagementView> {
  final Color upPurple = const Color(0xFF2B164D);
  List<dynamic> _users = [];
  bool _isLoading = true;

  static const String _baseUrl = 'http://127.0.0.1:8000/api/v1/users';

  // Role labels for display
  static const Map<int, String> _roleLabels = {
    1: 'Student',
    2: 'Staff',
    3: 'Public',
    4: 'Admin',
  };

  static const Map<int, Color> _roleColors = {
    1: Colors.blue,
    2: Color(0xFF2B164D),
    3: Colors.teal,
    4: Colors.deepOrange,
  };

  @override
  void initState() {
    super.initState();
    _fetchUsers();
  }

  Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('access_token');
  }

  Future<Map<String, String>> _authHeaders() async {
    final token = await _getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // ── Fetch ──────────────────────────────────────────────────────────────────
  Future<void> _fetchUsers() async {
    setState(() => _isLoading = true);
    try {
      final response = await http.get(
        Uri.parse('$_baseUrl/list'),
        headers: await _authHeaders(),
      );
      debugPrint('👥 Fetch Users Status: ${response.statusCode}');

      if (response.statusCode == 200) {
        final decoded = jsonDecode(utf8.decode(response.bodyBytes));
        final List<dynamic> items;
        if (decoded is List) {
          items = decoded;
        } else if (decoded is Map) {
          items = (decoded['data']?['items'] ?? decoded['items'] ?? decoded['data'] ?? []) as List<dynamic>;
        } else {
          items = [];
        }
        setState(() {
          _users = items;
          _isLoading = false;
        });
      } else {
        debugPrint('❌ Failed to load users: ${response.statusCode} ${response.body}');
        setState(() => _isLoading = false);
      }
    } catch (e) {
      debugPrint('🚨 Fetch users exception: $e');
      setState(() => _isLoading = false);
    }
  }

  // ── Edit Role Dialog ───────────────────────────────────────────────────────
  Future<void> _showEditRoleDialog(dynamic user) async {
    int selectedRoleId = user['role_id'] ?? 1;
    final userName = user['email'] ?? user['display_name'] ?? '#${user['id']}';

    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(
            children: [
              const Icon(Icons.admin_panel_settings, color: Color(0xFF2B164D)),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Edit Role — $userName',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          content: SizedBox(
            width: 380,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Current Role:', style: TextStyle(color: Colors.grey, fontSize: 13)),
                const SizedBox(height: 4),
                _roleBadge(user['role_id'] ?? 1),
                const SizedBox(height: 20),
                const Text('New Role:', style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey.shade300),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<int>(
                      value: selectedRoleId,
                      isExpanded: true,
                      items: _roleLabels.entries.map((e) => DropdownMenuItem(
                        value: e.key,
                        child: Text('${e.key} — ${e.value}'),
                      )).toList(),
                      onChanged: (v) => setDialogState(() => selectedRoleId = v!),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.amber.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.amber.shade200),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.warning_amber, size: 16, color: Colors.amber),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Changing role affects permissions immediately after next login.',
                          style: TextStyle(fontSize: 12, color: Colors.black87),
                        ),
                      ),
                    ],
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
                await _submitRoleChange(user['id'], selectedRoleId, userName);
              },
              style: ElevatedButton.styleFrom(backgroundColor: upPurple, foregroundColor: Colors.white),
              child: const Text('Update Role'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _submitRoleChange(int userId, int newRoleId, String userName) async {
    try {
      final response = await http.patch(
        Uri.parse('$_baseUrl/$userId/role').replace(queryParameters: {'new_role_id': newRoleId.toString()}),
        headers: await _authHeaders(),
      );
      if (mounted) {
        if (response.statusCode == 200) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('✅ $userName role updated to ${_roleLabels[newRoleId]}'),
              backgroundColor: Colors.green,
            ),
          );
          _fetchUsers();
        } else {
          final err = jsonDecode(response.body);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('❌ ${err['message'] ?? 'Failed to update role'}'), backgroundColor: Colors.red),
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

  // ── Ban / Unban ────────────────────────────────────────────────────────────
  Future<void> _showBanConfirmDialog(dynamic user) async {
    final isBanned = !(user['is_active'] ?? true);
    final userName = user['email'] ?? user['display_name'] ?? '#${user['id']}';
    final action = isBanned ? 'unban' : 'ban';
    final actionThai = isBanned ? 'ปลดแบน' : 'แบน';

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Icon(isBanned ? Icons.check_circle : Icons.block,
                color: isBanned ? Colors.green : Colors.red),
            const SizedBox(width: 8),
            Text(
              '${isBanned ? 'Unban' : 'Ban'} User',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('คุณต้องการ$actionThai\u0020"$userName" ใช่หรือไม่?'),
            const SizedBox(height: 12),
            if (!isBanned)
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red.shade100),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.warning, size: 16, color: Colors.red),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'การแบนจะป้องกันไม่ให้ผู้ใช้เข้าสู่ระบบได้ทันที',
                        style: TextStyle(fontSize: 12, color: Colors.red),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: isBanned ? Colors.green : Colors.red,
              foregroundColor: Colors.white,
            ),
            child: Text(isBanned ? 'Unban User' : 'Ban User'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await _submitBanToggle(user['id'], userName, isBanned);
    }
  }

  Future<void> _submitBanToggle(int userId, String userName, bool wasBanned) async {
    try {
      final response = await http.patch(
        Uri.parse('$_baseUrl/$userId/ban'),
        headers: await _authHeaders(),
      );
      if (mounted) {
        if (response.statusCode == 200) {
          final action = wasBanned ? 'unbanned' : 'banned';
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('✅ $userName has been $action'),
              backgroundColor: wasBanned ? Colors.green : Colors.orange,
            ),
          );
          _fetchUsers();
        } else {
          final err = jsonDecode(response.body);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('❌ ${err['message'] ?? 'Failed'}'), backgroundColor: Colors.red),
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

  // ── Helpers ────────────────────────────────────────────────────────────────
  Widget _roleBadge(int roleId) {
    final label = _roleLabels[roleId] ?? 'Unknown';
    final color = _roleColors[roleId] ?? Colors.grey;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(
        label,
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: color),
      ),
    );
  }

  // ── Build ──────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: Column(
        children: [
          // Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            color: Colors.white,
            child: Row(
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('User Management',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
                    Text('${_users.length} total users',
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                  ],
                ),
                const Spacer(),
                ElevatedButton.icon(
                  onPressed: _fetchUsers,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Refresh'),
                  style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.grey.shade200, foregroundColor: Colors.black87),
                ),
              ],
            ),
          ),

          // Table
          Expanded(
            child: _isLoading
                ? Center(child: CircularProgressIndicator(color: upPurple))
                : _users.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.group_off_outlined, size: 60, color: Colors.grey.shade400),
                            const SizedBox(height: 12),
                            const Text('No users found', style: TextStyle(color: Colors.grey)),
                          ],
                        ),
                      )
                    : SingleChildScrollView(
                        padding: const EdgeInsets.all(24),
                        child: Container(
                          width: double.infinity,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.grey.shade200),
                            boxShadow: [
                              BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10)
                            ],
                          ),
                          child: Theme(
                            data: Theme.of(context).copyWith(
                              dataTableTheme: DataTableThemeData(
                                headingRowColor: MaterialStateProperty.all(Colors.grey.shade50),
                              ),
                            ),
                            child: DataTable(
                              columnSpacing: 20,
                              columns: const [
                                DataColumn(label: Text('ID', style: TextStyle(fontWeight: FontWeight.bold))),
                                DataColumn(label: Text('Name / Email', style: TextStyle(fontWeight: FontWeight.bold))),
                                DataColumn(label: Text('Role', style: TextStyle(fontWeight: FontWeight.bold))),
                                DataColumn(label: Text('Status', style: TextStyle(fontWeight: FontWeight.bold))),
                                DataColumn(label: Text('Actions', style: TextStyle(fontWeight: FontWeight.bold))),
                              ],
                              rows: _users.map((user) {
                                final isActive = user['is_active'] ?? true;
                                final isBanned = !isActive;
                                final roleId = user['role_id'] as int? ?? 1;
                                final displayName = user['display_name'] ?? '';
                                final email = user['email'] ?? '';
                                final userName = displayName.isNotEmpty ? displayName : email;
                                final subLabel = displayName.isNotEmpty ? email : '';

                                return DataRow(
                                  color: MaterialStateProperty.resolveWith<Color?>((states) {
                                    return isBanned ? Colors.red.shade50.withOpacity(0.4) : null;
                                  }),
                                  cells: [
                                    DataCell(Text('#${user['id']}',
                                        style: TextStyle(color: Colors.grey.shade500, fontSize: 12))),

                                    // Name + email sub-label
                                    DataCell(
                                      Row(
                                        children: [
                                          CircleAvatar(
                                            radius: 16,
                                            backgroundColor: isBanned
                                                ? Colors.red.shade100
                                                : upPurple.withOpacity(0.1),
                                            child: Icon(
                                              isBanned ? Icons.person_off : Icons.person,
                                              size: 16,
                                              color: isBanned ? Colors.red : upPurple,
                                            ),
                                          ),
                                          const SizedBox(width: 10),
                                          Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            mainAxisAlignment: MainAxisAlignment.center,
                                            children: [
                                              Text(userName.isNotEmpty ? userName : 'Unknown',
                                                  style: TextStyle(
                                                    fontWeight: FontWeight.w500,
                                                    color: isBanned ? Colors.red.shade400 : Colors.black87,
                                                  )),
                                              if (subLabel.isNotEmpty)
                                                Text(subLabel,
                                                    style: TextStyle(
                                                        fontSize: 11, color: Colors.grey.shade500)),
                                            ],
                                          ),
                                        ],
                                      ),
                                    ),

                                    // Role badge
                                    DataCell(_roleBadge(roleId)),

                                    // Status badge
                                    DataCell(
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: isBanned ? Colors.red.shade50 : Colors.green.shade50,
                                          borderRadius: BorderRadius.circular(20),
                                          border: Border.all(
                                            color: isBanned ? Colors.red.shade100 : Colors.green.shade100,
                                          ),
                                        ),
                                        child: Text(
                                          isBanned ? '🚫 Banned' : '✅ Active',
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                            color: isBanned ? Colors.red : Colors.green,
                                          ),
                                        ),
                                      ),
                                    ),

                                    // Action buttons
                                    DataCell(
                                      Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          // Edit Role
                                          Tooltip(
                                            message: 'Edit Role',
                                            child: IconButton(
                                              icon: const Icon(Icons.admin_panel_settings,
                                                  color: Color(0xFF2B164D)),
                                              onPressed: () => _showEditRoleDialog(user),
                                            ),
                                          ),
                                          // Ban / Unban
                                          Tooltip(
                                            message: isBanned ? 'Unban User' : 'Ban User',
                                            child: IconButton(
                                              icon: Icon(
                                                isBanned ? Icons.check_circle : Icons.block,
                                                color: isBanned ? Colors.green : Colors.red,
                                              ),
                                              onPressed: () => _showBanConfirmDialog(user),
                                            ),
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