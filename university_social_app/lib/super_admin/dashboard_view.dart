import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:fl_chart/fl_chart.dart';

class DashboardView extends StatefulWidget {
  const DashboardView({super.key});

  @override
  State<DashboardView> createState() => _DashboardViewState();
}

class _DashboardViewState extends State<DashboardView> {
  final Color upPurple = const Color(0xFF2B164D);
  int _totalProblems = 0;
  int _openCount = 0;
  int _inProgressCount = 0;
  int _resolvedCount = 0;
  List<dynamic> _categories = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchProblemStats();
  }

  Future<void> _fetchProblemStats() async {
    setState(() { _isLoading = true; });
    try {
      final response = await http.get(Uri.parse('https://university-social-listening-platform.onrender.com/api/v1/problems/analytics'));
      if (response.statusCode == 200) {
        final decodedData = jsonDecode(utf8.decode(response.bodyBytes));
        if (decodedData['success'] == true) {
          final data = decodedData['data'];
          setState(() {
            _totalProblems = data['total'] ?? 0;
            _openCount = data['by_status']['OPEN'] ?? 0;
            _inProgressCount = data['by_status']['IN_PROGRESS'] ?? 0;
            _resolvedCount = data['by_status']['RESOLVED'] ?? 0;
            _categories = data['by_category'] ?? [];
            _isLoading = false;
          });
        }
      } else {
        throw Exception('Failed to load stats');
      }
    } catch (e) {
      print("🚨 Error fetching analytics: $e");
      setState(() { _isLoading = false; });
    }
  }

  Widget _buildKpiCard(String title, String value, IconData icon, Color color) {
    return Expanded(
      child: Container(
        height: 120,
        margin: const EdgeInsets.symmetric(horizontal: 8),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.grey.shade200),
          boxShadow: [BoxShadow(color: color.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4))],
        ),
        child: Row(
          children: [
            CircleAvatar(
              backgroundColor: color.withOpacity(0.1),
              radius: 28,
              child: Icon(icon, color: color, size: 28),
            ),
            const SizedBox(width: 16),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(title, style: const TextStyle(fontSize: 14, color: Colors.grey, fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                _isLoading 
                  ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2))
                  : Text(value, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPieChart() {
    if (_isLoading) return const Center(child: CircularProgressIndicator());
    if (_categories.isEmpty) return const Center(child: Text("ไม่มีข้อมูล", style: TextStyle(color: Colors.grey)));

    List<Color> colors = [upPurple, Colors.blue, Colors.orange, Colors.green, Colors.red, Colors.teal];
    
    List<PieChartSectionData> sections = [];
    for (int i = 0; i < _categories.length; i++) {
      final c = _categories[i];
      final count = c['count'] as int? ?? 0;
      if (count == 0) continue;
      
      sections.add(PieChartSectionData(
        color: colors[i % colors.length],
        value: count.toDouble(),
        title: '${c['category_name']}\n($count)',
        radius: 80,
        titleStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
      ));
    }

    return PieChart(
      PieChartData(
        sections: sections,
        centerSpaceRadius: 40,
        sectionsSpace: 2,
      ),
    );
  }

  Widget _buildBarChart() {
    return BarChart(
      BarChartData(
        alignment: BarChartAlignment.spaceAround,
        maxY: 20,
        barTouchData: BarTouchData(enabled: false),
        titlesData: FlTitlesData(
          show: true,
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              getTitlesWidget: (value, meta) {
                const style = TextStyle(color: Colors.grey, fontWeight: FontWeight.bold, fontSize: 14);
                Widget text;
                switch (value.toInt()) {
                  case 0: text = const Text('Mon', style: style); break;
                  case 1: text = const Text('Tue', style: style); break;
                  case 2: text = const Text('Wed', style: style); break;
                  case 3: text = const Text('Thu', style: style); break;
                  case 4: text = const Text('Fri', style: style); break;
                  case 5: text = const Text('Sat', style: style); break;
                  case 6: text = const Text('Sun', style: style); break;
                  default: text = const Text('', style: style); break;
                }
                return SideTitleWidget(meta: meta, child: text);
              },
            ),
          ),
          leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
          topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
        ),
        gridData: FlGridData(show: false),
        borderData: FlBorderData(show: false),
        barGroups: [
          BarChartGroupData(x: 0, barRods: [BarChartRodData(toY: 8, color: upPurple)]),
          BarChartGroupData(x: 1, barRods: [BarChartRodData(toY: 10, color: upPurple)]),
          BarChartGroupData(x: 2, barRods: [BarChartRodData(toY: 14, color: upPurple)]),
          BarChartGroupData(x: 3, barRods: [BarChartRodData(toY: 15, color: upPurple)]),
          BarChartGroupData(x: 4, barRods: [BarChartRodData(toY: 13, color: upPurple)]),
          BarChartGroupData(x: 5, barRods: [BarChartRodData(toY: 10, color: upPurple)]),
          BarChartGroupData(x: 6, barRods: [BarChartRodData(toY: 16, color: upPurple)]),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // KPI Row
            Row(
              children: [
                _buildKpiCard('Total Problems', '$_totalProblems', Icons.assignment_outlined, const Color(0xFF3B82F6)),
                _buildKpiCard('Pending', '$_openCount', Icons.pending_actions, const Color(0xFFF59E0B)),
                _buildKpiCard('In Progress', '$_inProgressCount', Icons.handyman_outlined, upPurple),
                _buildKpiCard('Resolved', '$_resolvedCount', Icons.check_circle_outline, const Color(0xFF10B981)),
              ],
            ),
            const SizedBox(height: 24),
            
            // Charts Row
            Expanded(
              child: Row(
                children: [
                  // Pie Chart (Categories)
                  Expanded(
                    flex: 1,
                    child: Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.grey.shade200),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Problems by Category', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
                          const SizedBox(height: 24),
                          Expanded(child: _buildPieChart()),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 24),
                  
                  // Bar Chart (Trends)
                  Expanded(
                    flex: 2,
                    child: Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.grey.shade200),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Problem Trends (This Week)', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
                          const SizedBox(height: 24),
                          Expanded(child: _buildBarChart()),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}