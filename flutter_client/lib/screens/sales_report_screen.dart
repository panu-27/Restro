import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/api_service.dart';

class SalesReportScreen extends StatefulWidget {
  const SalesReportScreen({Key? key}) : super(key: key);

  @override
  State<SalesReportScreen> createState() => _SalesReportScreenState();
}

class _SalesReportScreenState extends State<SalesReportScreen> {
  String _selectedPeriod = 'week'; // 'today', 'yesterday', 'week', 'month', 'custom'
  DateTime? _customFrom;
  DateTime? _customTo;
  Map<String, dynamic>? _analyticsData;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _fetchAnalytics();
  }

  Future<void> _fetchAnalytics() async {
    setState(() => _loading = true);
    try {
      String? fromStr;
      String? toStr;
      if (_selectedPeriod == 'custom' && _customFrom != null && _customTo != null) {
        fromStr = DateFormat('yyyy-MM-dd').format(_customFrom!);
        toStr = DateFormat('yyyy-MM-dd').format(_customTo!);
      }
      final data = await ApiService.getSalesAnalytics(_selectedPeriod, from: fromStr, to: toStr);
      setState(() {
        _analyticsData = data;
      });
    } catch (e) {
      print('Analytics error: $e');
    } finally {
      setState(() => _loading = false);
    }
  }

  void _triggerExport() async {
    String exportUrl = '${ApiService.baseUrl}/api/analytics/export?period=$_selectedPeriod';
    if (_selectedPeriod == 'custom' && _customFrom != null && _customTo != null) {
      final fromStr = DateFormat('yyyy-MM-dd').format(_customFrom!);
      final toStr = DateFormat('yyyy-MM-dd').format(_customTo!);
      exportUrl += '&from=$fromStr&to=$toStr';
    }
    
    final uri = Uri.parse(exportUrl);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not open download link.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    // Derive stats
    double totalRevenue = 0.0;
    int totalOrders = 0;
    double aov = 0.0;
    double cashSales = 0.0;
    double onlineSales = 0.0;
    List<dynamic> topItems = [];
    List<dynamic> chartBreakdown = [];

    if (_analyticsData != null) {
      totalRevenue = (_analyticsData!['totalSales'] ?? 0.0).toDouble();
      totalOrders = (_analyticsData!['totalOrders'] ?? 0).toInt();
      if (totalOrders > 0) {
        aov = totalRevenue / totalOrders;
      }
      
      final paymentSplit = _analyticsData!['paymentSplit'] ?? {};
      cashSales = (paymentSplit['Cash'] ?? 0.0).toDouble();
      onlineSales = (paymentSplit['Online'] ?? 0.0).toDouble();
      
      topItems = _analyticsData!['topItems'] as List? ?? [];
      chartBreakdown = _analyticsData!['dailyBreakdown'] as List? ?? [];
    }

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        title: Text(
          'Reports & Analytics',
          style: GoogleFonts.outfit(
            color: Colors.black87,
            fontWeight: FontWeight.bold,
            fontSize: 17,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.download_rounded, color: Colors.blue),
            tooltip: 'Export CSV',
            onPressed: _triggerExport,
          ),
          const SizedBox(width: 4),
          DropdownButton<String>(
            value: _selectedPeriod,
            underline: const SizedBox.shrink(),
            icon: const Icon(Icons.arrow_drop_down, color: Colors.blue),
            style: GoogleFonts.outfit(color: Colors.blue, fontWeight: FontWeight.bold, fontSize: 13),
            items: const [
              DropdownMenuItem(value: 'today', child: Text('Today')),
              DropdownMenuItem(value: 'yesterday', child: Text('Yesterday')),
              DropdownMenuItem(value: 'week', child: Text('This Week')),
              DropdownMenuItem(value: 'month', child: Text('This Month')),
              DropdownMenuItem(value: 'custom', child: Text('Custom Range')),
            ],
            onChanged: (val) async {
              if (val == null) return;
              if (val == 'custom') {
                final range = await showDateRangePicker(
                  context: context,
                  firstDate: DateTime(2020),
                  lastDate: DateTime.now(),
                  initialDateRange: _customFrom != null && _customTo != null
                      ? DateTimeRange(start: _customFrom!, end: _customTo!)
                      : DateTimeRange(
                          start: DateTime.now().subtract(const Duration(days: 7)),
                          end: DateTime.now(),
                        ),
                );
                if (range != null) {
                  setState(() {
                    _selectedPeriod = 'custom';
                    _customFrom = range.start;
                    _customTo = range.end;
                  });
                  _fetchAnalytics();
                }
              } else {
                setState(() {
                  _selectedPeriod = val;
                });
                _fetchAnalytics();
              }
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (_selectedPeriod == 'custom' && _customFrom != null && _customTo != null) ...[
                    Container(
                      margin: const EdgeInsets.only(bottom: 16),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      decoration: BoxDecoration(
                        color: Colors.blue[50],
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.blue[100]!),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.date_range_rounded, color: Color(0xFF3B82F6), size: 16),
                          const SizedBox(width: 8),
                          Text(
                            "Range: ${DateFormat('dd MMM yyyy').format(_customFrom!)} to ${DateFormat('dd MMM yyyy').format(_customTo!)}",
                            style: GoogleFonts.outfit(
                              color: Colors.blue[800],
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  // Numeric Key Metric Cards
                  Row(
                    children: [
                      Expanded(
                        child: _buildMetricCard(
                          'TOTAL REVENUE',
                          '₹${totalRevenue.toStringAsFixed(2)}',
                          const Color(0xFF3B82F6),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildMetricCard(
                          'TOTAL ORDERS',
                          '$totalOrders',
                          const Color(0xFF10B981),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: _buildMetricCard(
                          'AVG ORDER VALUE (AOV)',
                          '₹${aov.toStringAsFixed(2)}',
                          const Color(0xFFF59E0B),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Sales Trends Chart element
                  if (chartBreakdown.isNotEmpty) ...[
                    Text(
                      'DAILY REVENUE TREND',
                      style: GoogleFonts.outfit(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey[600],
                        letterSpacing: 1.5,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Container(
                      height: 180,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.grey[50],
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.grey[200]!),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: chartBreakdown.map((day) {
                          final double amt = (day['total'] ?? 0.0).toDouble();
                          final String date = (day['date'] ?? '').toString();
                          final String dayLabel = date.length > 5 ? date.substring(date.length - 5) : '';
                          
                          // Calculate ratio height
                          final maxAmt = chartBreakdown
                              .map((d) => (d['total'] ?? 0.0).toDouble())
                              .reduce((a, b) => a > b ? a : b);
                          final heightPct = maxAmt > 0 ? (amt / maxAmt) * 100 : 0.0;

                          return Column(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              Text(
                                '₹${amt.round()}',
                                style: GoogleFonts.outfit(fontSize: 8, fontWeight: FontWeight.bold, color: Colors.blue[600]),
                              ),
                              const SizedBox(height: 4),
                              Container(
                                width: 14,
                                height: heightPct.clamp(4.0, 100.0),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF3B82F6),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                dayLabel,
                                style: GoogleFonts.outfit(fontSize: 8, color: Colors.grey[550]),
                              ),
                            ],
                          );
                        }).toList(),
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],

                  // Payment Mode Split
                  Text(
                    'PAYMENT MODES SPLIT',
                    style: GoogleFonts.outfit(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: Colors.grey[600],
                      letterSpacing: 1.5,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.grey[200]!),
                    ),
                    child: Column(
                      children: [
                        _buildPaymentRow('Cash Sales', cashSales, totalRevenue, Colors.green),
                        const SizedBox(height: 12),
                        _buildPaymentRow('Online Sales', onlineSales, totalRevenue, Colors.blue),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Top Dishes Sold List
                  Text(
                    'TOP SELLING FOOD DISHES',
                    style: GoogleFonts.outfit(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: Colors.grey[600],
                      letterSpacing: 1.5,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.grey[200]!),
                    ),
                    child: topItems.isEmpty
                        ? Padding(
                            padding: const EdgeInsets.all(32.0),
                            child: Center(
                              child: Text(
                                'No dishes logged in this period',
                                style: GoogleFonts.outfit(color: Colors.grey, fontWeight: FontWeight.bold),
                              ),
                            ),
                          )
                        : ListView.separated(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: topItems.length.clamp(0, 5),
                            separatorBuilder: (context, idx) => const Divider(height: 1),
                            itemBuilder: (context, idx) {
                              final item = topItems[idx];
                              final String name = item['name'] ?? 'Dish Item';
                              final int qty = (item['quantity'] ?? item['qty'] ?? 0).toInt();
                              final double rev = (item['revenue'] ?? item['total'] ?? 0.0).toDouble();

                              return ListTile(
                                leading: CircleAvatar(
                                  backgroundColor: Colors.blue[50],
                                  child: Text('${idx + 1}', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: Colors.blue[700])),
                                ),
                                title: Text(name, style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 13)),
                                subtitle: Text('$qty portions sold', style: GoogleFonts.outfit(fontSize: 11, color: Colors.grey)),
                                trailing: Text(
                                  '₹${rev.round()}',
                                  style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.black87),
                                ),
                              );
                            },
                          ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildMetricCard(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: GoogleFonts.outfit(
              fontSize: 9,
              fontWeight: FontWeight.bold,
              color: Colors.grey[600],
              letterSpacing: 1.0,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: GoogleFonts.outfit(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentRow(String label, double amt, double total, Color color) {
    final double pct = total > 0 ? (amt / total) : 0.0;
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.grey[700])),
            Text(
              '₹${amt.round()} (${(pct * 100).toStringAsFixed(0)}%)',
              style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.black87),
            ),
          ],
        ),
        const SizedBox(height: 6),
        LinearProgressIndicator(
          value: pct,
          backgroundColor: Colors.grey[100],
          valueColor: AlwaysStoppedAnimation<Color>(color),
          minHeight: 6,
          borderRadius: BorderRadius.circular(4),
        ),
      ],
    );
  }
}

