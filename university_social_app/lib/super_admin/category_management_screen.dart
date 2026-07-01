import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class CategoryManagementScreen extends StatefulWidget {
  const CategoryManagementScreen({super.key});

  @override
  State<CategoryManagementScreen> createState() => _CategoryManagementScreenState();
}

class _CategoryManagementScreenState extends State<CategoryManagementScreen> {
  final Color upPurple = const Color(0xFF2B164D);
  List<dynamic> _categories = [];
  bool _isLoading = true;

  static const String _baseUrl = 'http://127.0.0.1:8000/api/v1/problems/categories';

  @override
  void initState() {
    super.initState();
    _fetchCategories();
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

  Future<void> _fetchCategories() async {
    setState(() => _isLoading = true);
    try {
      final response = await http.get(Uri.parse(_baseUrl));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(utf8.decode(response.bodyBytes));
        setState(() {
          if (decoded is List) {
            _categories = decoded;
          } else if (decoded is Map) {
            _categories = (decoded['data']?['items'] ?? decoded['items'] ?? decoded['data'] ?? []) as List<dynamic>;
          } else {
            _categories = [];
          }
          _isLoading = false;
        });
      } else {
        throw Exception('Failed to load categories');
      }
    } catch (e) {
      debugPrint('🚨 Fetch categories error: $e');
      setState(() => _isLoading = false);
    }
  }

  // ── Show Add/Edit Dialog ───────────────────────────────────────────────────
  Future<void> _showCategoryDialog({dynamic category}) async {
    final isEdit = category != null;
    final nameController = TextEditingController(text: isEdit ? category['name'] : '');

    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(isEdit ? 'Edit Category' : 'Add New Category', style: const TextStyle(fontWeight: FontWeight.bold)),
        content: SizedBox(
          width: 400,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Category Name *', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              const SizedBox(height: 8),
              TextField(
                controller: nameController,
                decoration: InputDecoration(
                  hintText: 'e.g., Facility Issue',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              final name = nameController.text.trim();
              if (name.isEmpty) return;
              Navigator.pop(ctx);
              if (isEdit) {
                await _updateCategory(category['id'], name);
              } else {
                await _createCategory(name);
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: upPurple, foregroundColor: Colors.white),
            child: Text(isEdit ? 'Save Changes' : 'Add Category'),
          ),
        ],
      ),
    );
  }

  Future<void> _createCategory(String name) async {
    try {
      final response = await http.post(
        Uri.parse(_baseUrl),
        headers: await _authHeaders(),
        body: jsonEncode({
          'name': name,
        }),
      );
      if (mounted) {
        if (response.statusCode == 201) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('✅ Category created'), backgroundColor: Colors.green));
          _fetchCategories();
        } else {
          final err = jsonDecode(response.body);
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('❌ ${err['message'] ?? 'Failed to create'}'), backgroundColor: Colors.red));
        }
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('❌ Error: $e'), backgroundColor: Colors.red));
    }
  }

  Future<void> _updateCategory(int id, String name) async {
    try {
      final response = await http.put(
        Uri.parse('$_baseUrl/$id'),
        headers: await _authHeaders(),
        body: jsonEncode({
          'name': name,
        }),
      );
      if (mounted) {
        if (response.statusCode == 200) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('✅ Category updated'), backgroundColor: Colors.green));
          _fetchCategories();
        } else {
          final err = jsonDecode(response.body);
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('❌ ${err['message'] ?? 'Failed to update'}'), backgroundColor: Colors.red));
        }
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('❌ Error: $e'), backgroundColor: Colors.red));
    }
  }

  Future<void> _deleteCategory(int id, String name) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Category', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.red)),
        content: Text('Are you sure you want to delete the category "$name"? This action cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      final response = await http.delete(
        Uri.parse('$_baseUrl/$id'),
        headers: await _authHeaders(),
      );
      if (mounted) {
        if (response.statusCode == 200) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('✅ Category deleted'), backgroundColor: Colors.green));
          _fetchCategories();
        } else {
          final err = jsonDecode(response.body);
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('❌ ${err['message'] ?? 'Failed to delete'}'), backgroundColor: Colors.red));
        }
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('❌ Error: $e'), backgroundColor: Colors.red));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.black87),
        title: const Text('Categories Management', style: TextStyle(color: Colors.black87, fontWeight: FontWeight.bold)),
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Actions
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            color: Colors.white,
            child: Row(
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${_categories.length} Categories', style: TextStyle(fontSize: 14, color: Colors.grey.shade600)),
                  ],
                ),
                const Spacer(),
                ElevatedButton.icon(
                  onPressed: _fetchCategories,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Refresh'),
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.grey.shade200, foregroundColor: Colors.black87),
                ),
                const SizedBox(width: 16),
                ElevatedButton.icon(
                  onPressed: () => _showCategoryDialog(),
                  icon: const Icon(Icons.add),
                  label: const Text('Add New'),
                  style: ElevatedButton.styleFrom(backgroundColor: upPurple, foregroundColor: Colors.white),
                ),
              ],
            ),
          ),
          
          // Data Table
          Expanded(
            child: _isLoading
                ? Center(child: CircularProgressIndicator(color: upPurple))
                : _categories.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.category_outlined, size: 60, color: Colors.grey.shade400),
                            const SizedBox(height: 12),
                            const Text('No categories found', style: TextStyle(color: Colors.grey)),
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
                            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10)],
                          ),
                          child: Theme(
                            data: Theme.of(context).copyWith(
                              dataTableTheme: DataTableThemeData(headingRowColor: MaterialStateProperty.all(Colors.grey.shade50)),
                            ),
                            child: DataTable(
                              columnSpacing: 20,
                              columns: const [
                                DataColumn(label: Text('ID', style: TextStyle(fontWeight: FontWeight.bold))),
                                DataColumn(label: Text('Name', style: TextStyle(fontWeight: FontWeight.bold))),
                                DataColumn(label: Text('Actions', style: TextStyle(fontWeight: FontWeight.bold))),
                              ],
                              rows: _categories.map((cat) {
                                return DataRow(
                                  cells: [
                                    DataCell(Text('#${cat['id']}', style: TextStyle(color: Colors.grey.shade500, fontSize: 12))),
                                    DataCell(Text(cat['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w500))),
                                    DataCell(
                                      Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          IconButton(
                                            icon: const Icon(Icons.edit, color: Colors.blue),
                                            tooltip: 'Edit Category',
                                            onPressed: () => _showCategoryDialog(category: cat),
                                          ),
                                          IconButton(
                                            icon: const Icon(Icons.delete, color: Colors.red),
                                            tooltip: 'Delete Category',
                                            onPressed: () => _deleteCategory(cat['id'], cat['name']),
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