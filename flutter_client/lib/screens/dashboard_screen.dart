import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/order_provider.dart';
import '../services/api_service.dart';
import '../widgets/skeleton_loaders.dart';

class DashboardScreen extends StatefulWidget {
  final Function(String) onTabChange;
  const DashboardScreen({Key? key, required this.onTabChange}) : super(key: key);

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Map<String, dynamic>? _salesData;
  bool _isLoadingAnalytics = false;
  bool _showFeedback = true;
  String _greeting = '';

  @override
  void initState() {
    super.initState();
    _setGreeting();
    _fetchAnalytics();
  }

  void _setGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) {
      _greeting = 'Good Morning';
    } else if (hour < 17) {
      _greeting = 'Good Afternoon';
    } else {
      _greeting = 'Good Evening';
    }
  }

  Future<void> _fetchAnalytics() async {
    setState(() {
      _isLoadingAnalytics = true;
    });
    try {
      final data = await ApiService.getSalesAnalytics('week');
      setState(() {
        _salesData = data;
      });
    } catch (e) {
      print('Dashboard analytics fetch failed: $e');
    } finally {
      setState(() {
        _isLoadingAnalytics = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.user;
    final orderProvider = Provider.of<OrderProvider>(context);

    // Derive active orders stats
    final activeCount = orderProvider.activeOrders.where((o) => o.status != 'Paid' && o.status != 'Cancelled').length;
    final closedToday = orderProvider.activeOrders.where((o) => o.status == 'Paid').length;
    final onHold = orderProvider.activeOrders.where((o) => o.status == 'Pending' || o.status == 'Preparing').length;

    // Analytics calculations
    double todaySales = 0.0;
    int todayOrders = 0;
    double yesterdaySales = 0.0;
    int yesterdayOrders = 0;

    if (_salesData != null && _salesData!['dailyBreakdown'] != null) {
      final list = _salesData!['dailyBreakdown'] as List;
      final todayStr = DateTime.now().toIso8601String().substring(0, 10);
      final yesterdayStr = DateTime.now().subtract(const Duration(days: 1)).toIso8601String().substring(0, 10);

      for (var day in list) {
        final date = (day['date'] ?? '').toString().substring(0, 10);
        if (date == todayStr) {
          todaySales = (day['total'] ?? 0.0).toDouble();
          todayOrders = (day['orders'] ?? 0).toInt();
        } else if (date == yesterdayStr) {
          yesterdaySales = (day['total'] ?? 0.0).toDouble();
          yesterdayOrders = (day['orders'] ?? 0).toInt();
        }
      }
    }

    final String restName = user?.restaurantName ?? 'My Restaurant';
    final String displayRestName = restName.length > 15 ? '${restName.substring(0, 15)}..' : restName;

    return RefreshIndicator(
      onRefresh: () async {
        await _fetchAnalytics();
        await orderProvider.fetchData();
      },
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.only(bottom: 48),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Sticky-like Header
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border(bottom: BorderSide(color: Colors.grey[100]!)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Text(
                        displayRestName,
                        style: GoogleFonts.outfit(
                          fontSize: 17,
                          fontWeight: FontWeight.bold,
                          color: Colors.black87,
                        ),
                      ),
                      const Icon(Icons.keyboard_arrow_down, size: 16, color: Colors.grey),
                    ],
                  ),
                  CircleAvatar(
                    backgroundColor: Colors.grey[200],
                    backgroundImage: user?.restaurantLogo != null && user!.restaurantLogo.isNotEmpty
                        ? NetworkImage(user.restaurantLogo)
                        : null,
                    child: user?.restaurantLogo == null || user!.restaurantLogo.isEmpty
                        ? Text(
                            restName.isNotEmpty ? restName[0].toUpperCase() : 'A',
                            style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: Colors.black54),
                          )
                        : null,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Greeting banner
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Text(
                "$_greeting, ${user?.name ?? 'User'}",
                style: GoogleFonts.outfit(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Quick Actions
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'QUICK ACTIONS',
                    style: GoogleFonts.outfit(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: Colors.grey[600],
                      letterSpacing: 1.5,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      _buildQuickActionItem('Ongoing Orders', Icons.shopping_bag, () => widget.onTabChange('pos')),
                      const SizedBox(width: 16),
                      _buildQuickActionItem('Tables Grid', Icons.grid_view, () => widget.onTabChange('tables')),
                      const SizedBox(width: 16),
                      _buildQuickActionItem('View Reports', Icons.bar_chart, () => widget.onTabChange('sales')),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Business Overview Card
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'BUSINESS OVERVIEW',
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
                    clipBehavior: Clip.antiAlias,
                    child: Column(
                      children: [
                        // Store Icon Header
                        Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Align(
                            alignment: Alignment.centerLeft,
                            child: Container(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                color: Colors.grey[50],
                                border: Border.all(color: Colors.grey[200]!),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Icon(Icons.store, color: Colors.grey[600]),
                            ),
                          ),
                        ),

                        // Stats row
                        Container(
                          decoration: BoxDecoration(
                            border: Border(
                              top: BorderSide(color: Colors.grey[100]!),
                              bottom: BorderSide(color: Colors.grey[100]!),
                            ),
                          ),
                          child: Row(
                            children: [
                              // Today's Sales
                              Expanded(
                                child: Container(
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    border: Border(right: BorderSide(color: Colors.grey[100]!)),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        "TODAY'S SALES",
                                        style: GoogleFonts.outfit(
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                          color: Colors.grey[600],
                                          letterSpacing: 1.0,
                                        ),
                                      ),
                                      const SizedBox(height: 6),
                                      _isLoadingAnalytics
                                          ? const DashboardStatsSkeleton()
                                          : Text(
                                              "₹ ${todaySales.toStringAsFixed(2)}",
                                              style: GoogleFonts.outfit(
                                                fontSize: 20,
                                                fontWeight: FontWeight.bold,
                                                color: const Color(0xFF4B6FFF),
                                              ),
                                            ),
                                      const SizedBox(height: 4),
                                      Text(
                                        "₹ ${yesterdaySales.toStringAsFixed(0)} (Yesterday)",
                                        style: GoogleFonts.outfit(fontSize: 10, color: Colors.grey[600], fontWeight: FontWeight.bold),
                                      ),
                                    ],
                                  ),
                                ),
                              ),

                              // Today's Orders
                              Expanded(
                                child: Container(
                                  padding: const EdgeInsets.all(16),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        "TODAY'S ORDERS",
                                        style: GoogleFonts.outfit(
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                          color: Colors.grey[600],
                                          letterSpacing: 1.0,
                                        ),
                                      ),
                                      const SizedBox(height: 6),
                                      _isLoadingAnalytics
                                          ? const DashboardStatsSkeleton()
                                          : Text(
                                              "$todayOrders",
                                              style: GoogleFonts.outfit(
                                                fontSize: 20,
                                                fontWeight: FontWeight.bold,
                                                color: const Color(0xFF4B6FFF),
                                              ),
                                            ),
                                      const SizedBox(height: 4),
                                      Text(
                                        "$yesterdayOrders (Yesterday)",
                                        style: GoogleFonts.outfit(fontSize: 10, color: Colors.grey[600], fontWeight: FontWeight.bold),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),

                        // Analytics bottom link
                        InkWell(
                          onTap: () => widget.onTabChange('sales'),
                          child: Padding(
                            padding: const EdgeInsets.all(16.0),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  "Top selling items & more insights!",
                                  style: GoogleFonts.outfit(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.black87,
                                  ),
                                ),
                                const Icon(Icons.chevron_right, size: 18, color: Colors.grey),
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
            const SizedBox(height: 24),

            // Active Orders Summary Card
            if (activeCount > 0)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.grey[200]!),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                border: Border(
                                  right: BorderSide(color: Colors.grey[100]!),
                                  bottom: BorderSide(color: Colors.grey[100]!),
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text("Active Now", style: GoogleFonts.outfit(fontSize: 11, color: Colors.grey[700], fontWeight: FontWeight.bold)),
                                  const SizedBox(height: 4),
                                  Text("$activeCount", style: GoogleFonts.outfit(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.black87)),
                                  Text("orders live", style: GoogleFonts.outfit(fontSize: 10, color: Colors.grey[600])),
                                ],
                              ),
                            ),
                          ),
                          Expanded(
                            child: Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                border: Border(
                                  right: BorderSide(color: Colors.grey[100]!),
                                  bottom: BorderSide(color: Colors.grey[100]!),
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text("On Hold", style: GoogleFonts.outfit(fontSize: 11, color: Colors.grey[700], fontWeight: FontWeight.bold)),
                                  const SizedBox(height: 4),
                                  Text("$onHold", style: GoogleFonts.outfit(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.orange)),
                                  Text("pending KOT", style: GoogleFonts.outfit(fontSize: 10, color: Colors.grey[600])),
                                ],
                              ),
                            ),
                          ),
                          Expanded(
                            child: Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                border: Border(bottom: BorderSide(color: Colors.grey[100]!)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text("Closed", style: GoogleFonts.outfit(fontSize: 11, color: Colors.grey[700], fontWeight: FontWeight.bold)),
                                  const SizedBox(height: 4),
                                  Text("$closedToday", style: GoogleFonts.outfit(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.green)),
                                  Text("paid today", style: GoogleFonts.outfit(fontSize: 10, color: Colors.grey[600])),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                      InkWell(
                        onTap: () => widget.onTabChange('pos'),
                        child: Padding(
                          padding: const EdgeInsets.all(14.0),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text("View all active orders", style: GoogleFonts.outfit(fontSize: 13, color: Colors.grey[700], fontWeight: FontWeight.w600)),
                              const Icon(Icons.chevron_right, size: 16, color: Colors.grey),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

            // Feedback Banner
            if (_showFeedback) ...[
              const SizedBox(height: 24),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.grey[50],
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.grey[200]!),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              "We want to improve Table, with your help!",
                              style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.black87),
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close, size: 16, color: Colors.grey),
                            onPressed: () => setState(() => _showFeedback = false),
                          ),
                        ],
                      ),
                      Text(
                        "Tell us what's working and what's not",
                        style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey[600]),
                      ),
                      const SizedBox(height: 12),
                      OutlinedButton(
                        onPressed: () {},
                        style: OutlinedButton.styleFrom(
                          backgroundColor: Colors.white,
                          side: const BorderSide(color: Colors.blue),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        child: Text("Share Feedback", style: GoogleFonts.outfit(color: Colors.blue, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ),
              ),
            ],

            // Connectivity Config
            const SizedBox(height: 24),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'PRINTER CONNECTIVITY',
                    style: GoogleFonts.outfit(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: Colors.grey[600],
                      letterSpacing: 1.5,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: _buildPrinterCard(
                          'Connect USB',
                          Icons.print,
                          Colors.blue[50]!,
                          Colors.blue[700]!,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildPrinterCard(
                          'Bluetooth',
                          Icons.bluetooth,
                          Colors.indigo[50]!,
                          Colors.indigo[700]!,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Recent Reviews
            const SizedBox(height: 24),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'RECENT REVIEWS',
                        style: GoogleFonts.outfit(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: Colors.grey[600],
                          letterSpacing: 1.5,
                        ),
                      ),
                      Text("VIEW ALL", style: GoogleFonts.outfit(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.blue)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.grey[200]!),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        CircleAvatar(
                          backgroundColor: Colors.amber[50],
                          child: Icon(Icons.people, color: Colors.amber[700], size: 18),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Row(
                                    children: List.generate(
                                      5,
                                      (index) => const Icon(Icons.star, color: Colors.amber, size: 12),
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Text("5.0", style: GoogleFonts.outfit(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey[600])),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text(
                                '"Excellent food and quick service. The digital billing was very smooth!"',
                                style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey[600], fontStyle: FontStyle.italic),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                "Rahul S. • 2 hours ago",
                                style: GoogleFonts.outfit(fontSize: 10, color: Colors.grey[600], fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                        ),
                      ],
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

  Widget _buildQuickActionItem(String label, IconData icon, VoidCallback action) {
    return Expanded(
      child: InkWell(
        onTap: action,
        borderRadius: BorderRadius.circular(16),
        child: Column(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: const BoxDecoration(
                color: Color(0xFF4B6FFF),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: Colors.white, size: 24),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              textAlign: TextAlign.center,
              style: GoogleFonts.outfit(
                fontSize: 11,
                color: Colors.grey[700],
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPrinterCard(String label, IconData icon, Color bgColor, Color iconColor) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey[150] ?? Colors.grey[200]!),
      ),
      child: Column(
        children: [
          CircleAvatar(
            backgroundColor: bgColor,
            child: Icon(icon, color: iconColor),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: GoogleFonts.outfit(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey[700]),
          ),
        ],
      ),
    );
  }
}

