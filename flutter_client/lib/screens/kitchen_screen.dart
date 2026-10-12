import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../models/models.dart';
import '../providers/order_provider.dart';
import 'table_view_overlay.dart';

class KitchenScreen extends StatefulWidget {
  final Function(String) onTabChange;
  const KitchenScreen({Key? key, required this.onTabChange}) : super(key: key);

  @override
  State<KitchenScreen> createState() => _KitchenScreenState();
}

class _KitchenScreenState extends State<KitchenScreen> {
  String _searchTerm = '';
  String _statusFilter = 'All';

  // For tracking which items are currently hitting API serve toggle
  final Set<String> _updatingItems = {};

  @override
  Widget build(BuildContext context) {
    final orderProvider = Provider.of<OrderProvider>(context);
    final activeOrders = orderProvider.activeOrders.where((o) => o.status != 'Paid' && o.status != 'Cancelled').toList();
    activeOrders.sort((a, b) => DateTime.parse(a.createdAt).compareTo(DateTime.parse(b.createdAt)));

    // Urgency helper
    String getUrgency(String createdAt) {
      final diff = DateTime.now().difference(DateTime.parse(createdAt));
      if (diff.inMinutes >= 20) return 'critical';
      if (diff.inMinutes >= 10) return 'warn';
      return 'ok';
    }

    // Filters logic
    final filteredOrders = activeOrders.where((o) {
      final items = o.items;
      final servedCount = items.where((i) => i.isServed).length;
      final isAllServed = items.isNotEmpty && servedCount == items.length;

      if (_statusFilter == 'Pending' && isAllServed) return false;
      if (_statusFilter == 'Done' && !isAllServed) return false;
      if (_statusFilter == 'Late') {
        if (isAllServed) return false;
        if (getUrgency(o.createdAt) != 'critical') return false;
      }

      if (_searchTerm.isNotEmpty) {
        final query = _searchTerm.toLowerCase();
        final matchesNum = o.orderNumber.toString().contains(query);
        final matchesTable = o.tableId.toLowerCase().contains(query);
        final matchesName = o.customerName.toLowerCase().contains(query);
        final hasItem = o.items.any((item) => !item.isServed && item.name.toLowerCase().contains(query));
        
        return matchesNum || matchesTable || matchesName || hasItem;
      }
      return true;
    }).toList();

    // Stats calculations
    final allActive = activeOrders;
    final doneOrders = allActive.where((o) => o.items.isNotEmpty && o.items.every((i) => i.isServed)).length;
    final pendingOrders = allActive.where((o) => o.items.any((i) => !i.isServed)).length;
    final lateOrders = allActive.where((o) => !o.items.every((i) => i.isServed) && getUrgency(o.createdAt) == 'critical').length;

    final List<String> statusChips = ['All', 'Pending', 'Done'];
    if (lateOrders > 0) statusChips.add('Late');

    final Map<String, String> labelMap = {
      'All': 'All (${allActive.length})',
      'Pending': 'Pending ($pendingOrders)',
      'Done': 'Delivered ($doneOrders)',
      'Late': 'Late ($lateOrders)',
    };

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        title: Text(
          'Kitchen Display',
          style: GoogleFonts.outfit(
            color: Colors.black87,
            fontWeight: FontWeight.bold,
            fontSize: 17,
          ),
        ),
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
                onChanged: (val) => setState(() => _searchTerm = val),
                decoration: InputDecoration(
                  hintText: 'Search tables, items...',
                  hintStyle: GoogleFonts.outfit(color: Colors.grey),
                  prefixIcon: const Icon(Icons.search, color: Colors.grey),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
          ),

          // Status Chips Filters
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Row(
              children: statusChips.map((status) {
                final isSelected = _statusFilter == status;
                return Padding(
                  padding: const EdgeInsets.only(right: 8.0),
                  child: ChoiceChip(
                    label: Text(
                      labelMap[status] ?? status,
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
                          _statusFilter = status;
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
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 10),

          // Orders Grid
          Expanded(
            child: filteredOrders.isEmpty
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
                          child: const Icon(Icons.check_circle_outline, color: Colors.green, size: 28),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          _searchTerm.isNotEmpty || _statusFilter != 'All'
                              ? 'No matching orders'
                              : 'Kitchen is clear!',
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
                : GridView.builder(
                    padding: const EdgeInsets.all(16),
                    gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                      maxCrossAxisExtent: 380,
                      mainAxisSpacing: 16,
                      crossAxisSpacing: 16,
                      childAspectRatio: 1.0,
                    ),
                    itemCount: filteredOrders.length,
                    itemBuilder: (context, idx) {
                      final order = filteredOrders[idx];
                      return _buildOrderCard(order, orderProvider, getUrgency(order.createdAt));
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildOrderCard(Order order, OrderProvider provider, String urgency) {
    final isParcel = order.orderType == 'Parcel';
    final label = isParcel 
        ? (order.customerName.isNotEmpty ? order.customerName : (order.partLabel.isNotEmpty ? order.partLabel : 'Walk-in'))
        : order.tableId;
        
    final items = order.items;
    final servedCount = items.where((i) => i.isServed).length;
    final totalCount = items.length;
    final isAllServed = totalCount > 0 && servedCount == totalCount;

    // Part designation
    int partNumber = 1;
    if (order.tableId.isNotEmpty) {
      final tableOrders = provider.activeOrders
          .where((o) => o.tableId == order.tableId && o.status != 'Paid' && o.status != 'Cancelled')
          .toList();
      tableOrders.sort((a, b) => DateTime.parse(a.createdAt).compareTo(DateTime.parse(b.createdAt)));
      partNumber = tableOrders.indexWhere((o) => o.id == order.id) + 1;
    }

    final double progress = totalCount > 0 ? servedCount / totalCount : 0.0;
    final Color progressColor = isAllServed
        ? Colors.green
        : (urgency == 'critical' ? Colors.red : const Color(0xFF3B82F6));

    return Card(
      color: Colors.white,
      surfaceTintColor: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.grey[200]!),
      ),
      elevation: 1,
      child: Column(
        children: [
          // Order Card Header
          Padding(
            padding: const EdgeInsets.all(12.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Row(
                    children: [
                      Text(
                        label,
                        style: GoogleFonts.outfit(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.black87,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (order.tableId.isNotEmpty && provider.activeOrders.where((o) => o.tableId == order.tableId).length > 1) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFF111111),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            'PART $partNumber',
                            style: GoogleFonts.outfit(fontSize: 8, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                
                // Progress circle indicator
                Stack(
                  alignment: Alignment.center,
                  children: [
                    SizedBox(
                      width: 28,
                      height: 28,
                      child: CircularProgressIndicator(
                        value: progress,
                        strokeWidth: 2.5,
                        backgroundColor: Colors.grey[100],
                        valueColor: AlwaysStoppedAnimation<Color>(progressColor),
                      ),
                    ),
                    Text(
                      '${(progress * 100).round()}%',
                      style: GoogleFonts.outfit(fontSize: 8, fontWeight: FontWeight.bold, color: Colors.black54),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const Divider(height: 1),

          // Items list checklist
          Expanded(
            child: ListView.builder(
              padding: EdgeInsets.zero,
              itemCount: items.length,
              itemBuilder: (context, idx) {
                final item = items[idx];
                final isItemUpdating = _updatingItems.contains(item.id);
                
                return Opacity(
                  opacity: item.isServed ? 0.35 : 1.0,
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 0),
                    dense: true,
                    leading: Checkbox(
                      value: item.isServed,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                      onChanged: isItemUpdating
                          ? null
                          : (val) async {
                              setState(() => _updatingItems.add(item.id));
                              try {
                                await provider.toggleServeItem(order.id, item.id, item.isServed);
                              } catch (_) {}
                              setState(() => _updatingItems.remove(item.id));
                            },
                    ),
                    title: Text(
                      item.name,
                      style: GoogleFonts.outfit(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        decoration: item.isServed ? TextDecoration.lineThrough : null,
                        color: Colors.black87,
                      ),
                    ),
                    subtitle: item.note.isNotEmpty
                        ? Text(
                            '· ${item.note}',
                            style: GoogleFonts.outfit(fontSize: 10, color: Colors.grey[600]),
                          )
                        : null,
                    trailing: Text(
                      '×${item.qty}',
                      style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: Colors.grey[600]),
                    ),
                  ),
                );
              },
            ),
          ),
          const Divider(height: 1),

          // Card Action Buttons
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Row(
              children: [
                OutlinedButton(
                  onPressed: () async {
                    final confirm = await showDialog<bool>(
                      context: context,
                      builder: (context) => AlertDialog(
                        title: const Text('Cancel KOT Order?'),
                        content: const Text('Are you sure you want to cancel this order ticket?'),
                        actions: [
                          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('No')),
                          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Yes')),
                        ],
                      ),
                    );
                    if (confirm == true) {
                      await provider.cancelOrder(order.id);
                    }
                  },
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    side: BorderSide(color: Colors.grey[200]!),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: Text('Cancel', style: GoogleFonts.outfit(fontSize: 11, color: Colors.grey[600], fontWeight: FontWeight.bold)),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => TableViewOverlay(
                            tableId: order.tableId.isNotEmpty ? order.tableId : null,
                            orderId: order.id,
                            onClose: () {
                              Navigator.pop(context);
                              provider.fetchData();
                            },
                          ),
                        ),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      elevation: 0,
                      backgroundColor: Colors.white,
                      foregroundColor: isAllServed ? Colors.blue : Colors.black87,
                      side: BorderSide(color: isAllServed ? Colors.blue : Colors.grey[300]!),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          isAllServed ? 'Billing' : 'Manage',
                          style: GoogleFonts.outfit(fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(width: 4),
                        const Icon(Icons.arrow_outward, size: 12),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

