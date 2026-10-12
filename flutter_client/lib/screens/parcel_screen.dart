import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../models/models.dart';
import '../providers/order_provider.dart';
import 'table_view_overlay.dart';

class ParcelScreen extends StatefulWidget {
  final Function(String) onTabChange;
  const ParcelScreen({Key? key, required this.onTabChange}) : super(key: key);

  @override
  State<ParcelScreen> createState() => _ParcelScreenState();
}

class _ParcelScreenState extends State<ParcelScreen> {
  String _search = '';
  String _statusFilter = 'All'; // 'All', 'Pending', 'Ready'

  @override
  Widget build(BuildContext context) {
    final orderProvider = Provider.of<OrderProvider>(context);
    final activeOrders = orderProvider.activeOrders;
    
    // Filter parcel orders that are active (not paid, not cancelled)
    final parcels = activeOrders.where((o) =>
      o.orderType == 'Parcel' && o.status != 'Paid' && o.status != 'Cancelled'
    ).toList();

    // Stats calculations
    final readyParcels = parcels.where((o) => o.items.isNotEmpty && o.items.every((i) => i.isServed)).length;
    final pendingParcels = parcels.where((o) => o.items.any((i) => !i.isServed)).length;

    // Search & Filter
    final filtered = parcels.where((o) {
      final isAllServed = o.items.isNotEmpty && o.items.every((i) => i.isServed);

      if (_statusFilter == 'Ready' && !isAllServed) return false;
      if (_statusFilter == 'Pending' && isAllServed) return false;

      if (_search.isNotEmpty) {
        final q = _search.toLowerCase();
        final nameMatches = o.customerName.toLowerCase().contains(q);
        final numMatches = o.orderNumber.toString().contains(q);
        final phoneMatches = o.customerPhone.contains(q);
        return nameMatches || numMatches || phoneMatches;
      }
      return true;
    }).toList();

    // Latest first
    filtered.sort((a, b) => DateTime.parse(b.createdAt).compareTo(DateTime.parse(a.createdAt)));

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        title: Text(
          'Parcels Display',
          style: GoogleFonts.outfit(
            color: Colors.black87,
            fontWeight: FontWeight.bold,
            fontSize: 17,
          ),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 8.0),
            child: ElevatedButton.icon(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => TableViewOverlay(
                      onClose: () {
                        Navigator.pop(context);
                        orderProvider.fetchData();
                      },
                    ),
                  ),
                );
              },
              icon: const Icon(Icons.add, size: 16, color: Colors.white),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1D4ED8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              label: Text('New Parcel', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 12)),
            ),
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
                onChanged: (val) => setState(() => _search = val),
                decoration: InputDecoration(
                  hintText: 'Search name, phone, order...',
                  hintStyle: GoogleFonts.outfit(color: Colors.grey),
                  prefixIcon: const Icon(Icons.search, color: Colors.grey),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
          ),

          // Filters row
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Row(
              children: [
                _buildStatusChip('All', parcels.length),
                const SizedBox(width: 8),
                _buildStatusChip('Pending', pendingParcels),
                const SizedBox(width: 8),
                _buildStatusChip('Ready', readyParcels),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // Parcels List
          Expanded(
            child: filtered.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 56,
                          height: 56,
                          decoration: BoxDecoration(
                            color: Colors.grey[50],
                            border: Border.all(color: Colors.grey[200]!),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: const Icon(Icons.inventory_2_outlined, color: Colors.grey, size: 28),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          _search.isNotEmpty || _statusFilter != 'All'
                              ? 'No matching parcels'
                              : 'No active parcels',
                          style: GoogleFonts.outfit(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: Colors.grey[600],
                            letterSpacing: 1.2,
                          ),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    itemCount: filtered.length,
                    itemBuilder: (context, idx) {
                      final order = filtered[idx];
                      return _buildParcelRow(order, orderProvider);
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusChip(String filterName, int count) {
    final isSelected = _statusFilter == filterName;
    return ChoiceChip(
      label: Text(
        '$filterName ($count)'.toUpperCase(),
        style: GoogleFonts.outfit(
          fontSize: 11,
          fontWeight: FontWeight.bold,
          color: isSelected ? const Color(0xFF3B82F6) : Colors.grey[700],
        ),
      ),
      selected: isSelected,
      onSelected: (val) {
        if (val) {
          setState(() {
            _statusFilter = filterName;
          });
        }
      },
      backgroundColor: Colors.white,
      selectedColor: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(
          color: isSelected ? const Color(0xFF3B82F6) : Colors.grey[300]!,
        ),
      ),
    );
  }

  Widget _buildParcelRow(Order order, OrderProvider provider) {
    final date = DateTime.parse(order.createdAt).toLocal();
    final timeStr = DateFormat('hh:mm a').format(date);
    final isAllServed = order.items.isNotEmpty && order.items.every((i) => i.isServed);

    final String displayName = order.customerName.isNotEmpty
        ? order.customerName
        : 'Parcel #${order.orderNumber.toString().padLeft(4, '0')}';

    return InkWell(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => TableViewOverlay(
              orderId: order.id,
              onClose: () {
                Navigator.pop(context);
                provider.fetchData();
              },
            ),
          ),
        );
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: Colors.grey[200]!)),
        ),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    displayName,
                    style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.black87),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Text(
                  timeStr,
                  style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey[600], fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Text(
                      '#${order.orderNumber.toString().padLeft(4, '0')}',
                      style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey[700]),
                    ),
                    if (order.customerPhone.isNotEmpty) ...[
                      const SizedBox(width: 8),
                      Text('·', style: GoogleFonts.outfit(color: Colors.grey[300])),
                      const SizedBox(width: 8),
                      const Icon(Icons.phone, size: 12, color: Colors.grey),
                      const SizedBox(width: 4),
                      Text(
                        order.customerPhone,
                        style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey[700]),
                      ),
                    ],
                    const SizedBox(width: 8),
                    Text('·', style: GoogleFonts.outfit(color: Colors.grey[300])),
                    const SizedBox(width: 8),
                    Text(
                      '${order.items.length} items',
                      style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey[700]),
                    ),
                  ],
                ),
                Row(
                  children: [
                    if (isAllServed)
                      Text(
                        'Ready',
                        style: GoogleFonts.outfit(fontSize: 11, color: Colors.green, fontWeight: FontWeight.bold),
                      ),
                    const SizedBox(width: 6),
                    const Icon(Icons.arrow_outward, size: 14, color: Colors.grey),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

