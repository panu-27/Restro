import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../models/models.dart';
import '../providers/order_provider.dart';
import '../services/api_service.dart';
import 'table_view_overlay.dart';

class OrderHistoryScreen extends StatefulWidget {
  const OrderHistoryScreen({Key? key}) : super(key: key);

  @override
  State<OrderHistoryScreen> createState() => _OrderHistoryScreenState();
}

class _OrderHistoryScreenState extends State<OrderHistoryScreen> {
  List<Order> _historyOrders = [];
  bool _loading = true;
  String _searchQuery = '';
  String _statusFilter = 'All'; // 'All', 'Paid', 'Cancelled', 'Dine-in', 'Parcel'
  String _dateRangeFilter = 'Today'; // 'Today', 'Yesterday', 'Week', 'All'

  @override
  void initState() {
    super.initState();
    _fetchHistory();
  }

  Future<void> _fetchHistory() async {
    setState(() => _loading = true);
    try {
      final data = await ApiService.getOrderHistory();
      setState(() {
        _historyOrders = data;
      });
    } catch (e) {
      print('History fetch error: $e');
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    // Filter logic
    final filtered = _historyOrders.where((o) {
      // 1. Search Query
      if (_searchQuery.isNotEmpty) {
        final query = _searchQuery.toLowerCase();
        final matchesNum = o.orderNumber.toString().contains(query);
        final matchesTable = o.tableId.toLowerCase().contains(query);
        final matchesName = o.customerName.toLowerCase().contains(query);
        if (!matchesNum && !matchesTable && !matchesName) return false;
      }

      // 2. Status / Type Filter
      if (_statusFilter == 'Paid' && o.status != 'Paid') return false;
      if (_statusFilter == 'Cancelled' && o.status != 'Cancelled') return false;
      if (_statusFilter == 'Dine-in' && o.orderType != 'Dine-in') return false;
      if (_statusFilter == 'Parcel' && o.orderType != 'Parcel') return false;

      // 3. Date Filter
      final orderDate = DateTime.parse(o.createdAt);
      final now = DateTime.now();
      if (_dateRangeFilter == 'Today') {
        if (orderDate.year != now.year || orderDate.month != now.month || orderDate.day != now.day) return false;
      } else if (_dateRangeFilter == 'Yesterday') {
        final yest = now.subtract(const Duration(days: 1));
        if (orderDate.year != yest.year || orderDate.month != yest.month || orderDate.day != yest.day) return false;
      } else if (_dateRangeFilter == 'Week') {
        final sevenDaysAgo = now.subtract(const Duration(days: 7));
        if (orderDate.isBefore(sevenDaysAgo)) return false;
      }

      return true;
    }).toList();

    // Sort by latest first
    filtered.sort((a, b) => DateTime.parse(b.createdAt).compareTo(DateTime.parse(a.createdAt)));

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        title: Text(
          'Order History',
          style: GoogleFonts.outfit(
            color: Colors.black87,
            fontWeight: FontWeight.bold,
            fontSize: 17,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.blue),
            onPressed: _fetchHistory,
          ),
        ],
      ),
      body: Column(
        children: [
          // Search input
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Container(
              decoration: BoxDecoration(
                color: const Color(0xFFF2F2F7),
                borderRadius: BorderRadius.circular(12),
              ),
              child: TextField(
                onChanged: (val) => setState(() => _searchQuery = val),
                decoration: InputDecoration(
                  hintText: 'Search order number, tables...',
                  hintStyle: GoogleFonts.outfit(color: Colors.grey),
                  prefixIcon: const Icon(Icons.search, color: Colors.grey),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
          ),

          // Date & Status Chips
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                DropdownButton<String>(
                  value: _dateRangeFilter,
                  underline: const SizedBox.shrink(),
                  icon: const Icon(Icons.calendar_month, color: Colors.blue, size: 18),
                  style: GoogleFonts.outfit(color: Colors.blue, fontWeight: FontWeight.bold, fontSize: 13),
                  items: ['Today', 'Yesterday', 'Week', 'All'].map((d) {
                    return DropdownMenuItem(value: d, child: Text(d));
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) {
                      setState(() => _dateRangeFilter = val);
                    }
                  },
                ),
                
                // Status Filter Dropdown
                DropdownButton<String>(
                  value: _statusFilter,
                  underline: const SizedBox.shrink(),
                  icon: const Icon(Icons.filter_list, color: Colors.blue, size: 18),
                  style: GoogleFonts.outfit(color: Colors.blue, fontWeight: FontWeight.bold, fontSize: 13),
                  items: ['All', 'Paid', 'Cancelled', 'Dine-in', 'Parcel'].map((s) {
                    return DropdownMenuItem(value: s, child: Text(s));
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) {
                      setState(() => _statusFilter = val);
                    }
                  },
                ),
              ],
            ),
          ),
          const Divider(),

          // Orders List
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : filtered.isEmpty
                    ? Center(
                        child: Text(
                          'No orders found',
                          style: GoogleFonts.outfit(color: Colors.grey, fontWeight: FontWeight.bold),
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        itemCount: filtered.length,
                        itemBuilder: (context, idx) {
                          final order = filtered[idx];
                          return _buildOrderRow(order);
                        },
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildOrderRow(Order order) {
    final date = DateTime.parse(order.createdAt).toLocal();
    final timeStr = DateFormat('hh:mm a').format(date);
    final isPaid = order.status == 'Paid';
    final isCancelled = order.status == 'Cancelled';
    
    Color statusColor = Colors.orange;
    if (isPaid) statusColor = Colors.green;
    if (isCancelled) statusColor = Colors.red;

    final label = order.orderType == 'Parcel'
        ? (order.customerName.isNotEmpty ? order.customerName : (order.partLabel.isNotEmpty ? order.partLabel : 'Parcel Order'))
        : 'Table ${order.tableId}';

    return Card(
      color: Colors.white,
      surfaceTintColor: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.grey[150] ?? Colors.grey[200]!),
      ),
      margin: const EdgeInsets.only(bottom: 12),
      child: ExpansionTile(
        title: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.bold),
                ),
                Text(
                  '#${order.orderNumber.toString().padLeft(4, '0')} · $timeStr',
                  style: GoogleFonts.outfit(fontSize: 11, color: Colors.grey),
                ),
              ],
            ),
            Text(
              '₹${order.totalAmount.round()}',
              style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.black87),
            ),
          ],
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 6.0),
          child: Row(
            children: [
              Container(
                width: 6,
                height: 6,
                decoration: BoxDecoration(color: statusColor, shape: BoxShape.circle),
              ),
              const SizedBox(width: 6),
              Text(
                order.status.toUpperCase(),
                style: GoogleFonts.outfit(fontSize: 9, fontWeight: FontWeight.bold, color: statusColor),
              ),
            ],
          ),
        ),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.grey[50],
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('ORDER ITEMS', style: GoogleFonts.outfit(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey)),
                const SizedBox(height: 8),
                ...order.items.map((i) => Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4.0),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              i.name,
                              style: GoogleFonts.outfit(fontSize: 12, fontWeight: FontWeight.w500),
                            ),
                          ),
                          Text(
                            '${i.qty}x  ₹${(i.price * i.qty).round()}',
                            style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey[600]),
                          ),
                        ],
                      ),
                    )),
                const Divider(),
                if (order.guestNote.isNotEmpty) ...[
                  Text(
                    'Note: ${order.guestNote}',
                    style: GoogleFonts.outfit(fontSize: 11, color: Colors.grey[600], fontStyle: FontStyle.italic),
                  ),
                  const SizedBox(height: 12),
                ],
                ElevatedButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => TableViewOverlay(
                          tableId: order.tableId.isNotEmpty ? order.tableId : null,
                          orderId: order.id,
                          onClose: () {
                            Navigator.pop(context);
                            _fetchHistory();
                          },
                        ),
                      ),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    side: const BorderSide(color: Colors.blue),
                    minimumSize: const Size(double.infinity, 38),
                    elevation: 0,
                  ),
                  child: Text('View Details Overlay', style: GoogleFonts.outfit(color: Colors.blue, fontWeight: FontWeight.bold, fontSize: 12)),
                )
              ],
            ),
          )
        ],
      ),
    );
  }
}

