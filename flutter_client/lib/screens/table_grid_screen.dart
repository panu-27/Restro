import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/order_provider.dart';
import '../providers/draft_provider.dart';
import '../widgets/skeleton_loaders.dart';
import 'table_view_overlay.dart';

class TableGridScreen extends StatefulWidget {
  final Function(String) onTabChange;
  const TableGridScreen({Key? key, required this.onTabChange}) : super(key: key);

  @override
  State<TableGridScreen> createState() => _TableGridScreenState();
}

class _TableGridScreenState extends State<TableGridScreen> {
  String _search = '';
  String _activeAreaFilter = 'All';
  String _activeStatusFilter = 'All';

  // Modal Text Controllers
  final _tableIdController = TextEditingController();
  final _seatsController = TextEditingController(text: '4');
  String _addTableArea = 'Main Floor';
  final _newAreaController = TextEditingController();

  @override
  void initState() {
    super.initState();
    // Load drafts on startup
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadDrafts();
    });
  }

  void _loadDrafts() {
    final orderProvider = Provider.of<OrderProvider>(context, listen: false);
    final draftProvider = Provider.of<DraftProvider>(context, listen: false);
    final tableIds = orderProvider.tables.map((t) => t['tableId'].toString()).toList();
    draftProvider.loadAllDrafts(tableIds);
  }

  @override
  void dispose() {
    _tableIdController.dispose();
    _seatsController.dispose();
    _newAreaController.dispose();
    super.dispose();
  }

  int _getGridCrossAxisCount(double width) {
    if (width < 600) return 2;
    if (width < 900) return 4;
    if (width < 1200) return 5;
    return 6;
  }

  @override
  Widget build(BuildContext context) {
    final orderProvider = Provider.of<OrderProvider>(context);
    final draftProvider = Provider.of<DraftProvider>(context);
    final tables = orderProvider.tables;
    final loading = orderProvider.isLoading;
    final screenWidth = MediaQuery.of(context).size.width;
    final crossAxisCount = _getGridCrossAxisCount(screenWidth);

    // Stats calculations
    final totalDraft = tables.where((t) => draftProvider.hasDraft(t['tableId'].toString())).length;
    final totalOccupied = tables.where((t) {
      final tId = t['tableId'].toString();
      final info = orderProvider.getTableInfo(tId);
      return !draftProvider.hasDraft(tId) && info['status'] == 'Occupied';
    }).length;
    final totalAvailable = tables.where((t) {
      final tId = t['tableId'].toString();
      final info = orderProvider.getTableInfo(tId);
      return !draftProvider.hasDraft(tId) && info['status'] == 'Available';
    }).length;

    // Filter tables
    final filteredTables = tables.where((t) {
      final tId = t['tableId'].toString();
      final area = (t['area'] ?? 'Main Floor').toString();
      
      final matchesSearch = _search.isEmpty || tId.toLowerCase().contains(_search.toLowerCase());
      final matchesArea = _activeAreaFilter == 'All' || area == _activeAreaFilter;
      
      bool matchesStatus = true;
      final info = orderProvider.getTableInfo(tId);
      final hasDraft = draftProvider.hasDraft(tId);
      
      if (_activeStatusFilter == 'Draft') {
        matchesStatus = hasDraft;
      } else if (_activeStatusFilter == 'Occupied') {
        matchesStatus = !hasDraft && info['status'] == 'Occupied';
      } else if (_activeStatusFilter == 'Available') {
        matchesStatus = !hasDraft && info['status'] == 'Available';
      }
      
      return matchesSearch && matchesArea && matchesStatus;
    }).toList();

    // Sort tables by numerical suffix
    int compareTables(Map<String, dynamic> a, Map<String, dynamic> b) {
      final String idA = a['tableId']?.toString() ?? '';
      final String idB = b['tableId']?.toString() ?? '';
      
      final RegExp numReg = RegExp(r'\d+');
      final matchA = numReg.firstMatch(idA);
      final matchB = numReg.firstMatch(idB);
      
      if (matchA != null && matchB != null) {
        final intNumA = int.parse(matchA.group(0)!);
        final intNumB = int.parse(matchB.group(0)!);
        return intNumA.compareTo(intNumB);
      }
      return idA.compareTo(idB);
    }

    filteredTables.sort(compareTables);

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        title: Text(
          'Tables Display',
          style: GoogleFonts.outfit(
            color: Colors.black87,
            fontWeight: FontWeight.bold,
            fontSize: 17,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_road, color: Colors.blue),
            tooltip: 'Add Section',
            onPressed: () => _showAddSectionBottomSheet(orderProvider),
          ),
          IconButton(
            icon: const Icon(Icons.add, color: Colors.blue),
            tooltip: 'Add Table',
            onPressed: () {
              if (orderProvider.tableAreas.isNotEmpty) {
                _addTableArea = orderProvider.tableAreas.first;
              }
              _showAddTableBottomSheet(orderProvider);
            },
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
                  hintText: 'Search tables',
                  hintStyle: GoogleFonts.outfit(color: Colors.grey),
                  prefixIcon: const Icon(Icons.search, color: Colors.grey),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
          ),

          // Area Chips Filters
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Row(
              children: [
                _buildAreaChip('All'),
                ...orderProvider.tableAreas.map((area) => _buildAreaChip(area)),
              ],
            ),
          ),
          // Status Filters Strip
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildStatusFilterButton('All', '${tables.length} All', Colors.grey[800]!, Colors.white, null),
                const SizedBox(width: 8),
                _buildStatusFilterButton('Occupied', '$totalOccupied Occ', const Color(0xFFFF5A36), const Color(0xFFFFF7ED), Colors.red),
                const SizedBox(width: 8),
                _buildStatusFilterButton('Draft', '$totalDraft Draft', const Color(0xFF059669), const Color(0xFFECFDF5), Colors.green),
                const SizedBox(width: 8),
                _buildStatusFilterButton('Available', '$totalAvailable Free', Colors.grey[700]!, Colors.grey[100]!, Colors.grey),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // Main Grid Area
          Expanded(
            child: loading && tables.isEmpty
                ? GridView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: crossAxisCount,
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 1.2,
                    ),
                    itemCount: 12,
                    itemBuilder: (context, idx) => const TableCardSkeleton(),
                  )
                : _activeAreaFilter == 'All'
                    ? ListView(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        children: orderProvider.tableAreas.map((area) {
                          final areaTables = filteredTables.where((t) => (t['area'] ?? 'Main Floor') == area).toList();
                          if (areaTables.isEmpty && _search.isNotEmpty) {
                            return const SizedBox.shrink();
                          }
                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Padding(
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                child: Row(
                                  children: [
                                    Icon(Icons.business, size: 14, color: Colors.grey[600]),
                                    const SizedBox(width: 6),
                                    Text(
                                      area.toUpperCase(),
                                      style: GoogleFonts.outfit(
                                        fontSize: 11,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.grey[700],
                                        letterSpacing: 1.2,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              if (areaTables.isEmpty)
                                Container(
                                  width: double.infinity,
                                  padding: const EdgeInsets.symmetric(vertical: 32),
                                  alignment: Alignment.center,
                                  decoration: BoxDecoration(
                                    color: Colors.grey[50],
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(color: Colors.grey[100]!),
                                  ),
                                  child: Text(
                                    'No tables yet',
                                    style: GoogleFonts.outfit(
                                      color: Colors.grey[600],
                                      fontWeight: FontWeight.bold,
                                      fontSize: 12,
                                      letterSpacing: 1.0,
                                    ),
                                  ),
                                )
                              else
                                GridView.builder(
                                  shrinkWrap: true,
                                  physics: const NeverScrollableScrollPhysics(),
                                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                                    crossAxisCount: crossAxisCount,
                                    mainAxisSpacing: 12,
                                    crossAxisSpacing: 12,
                                    childAspectRatio: 1.2,
                                  ),
                                  itemCount: areaTables.length,
                                  itemBuilder: (context, idx) {
                                    final table = areaTables[idx];
                                    return _buildTableCard(table, orderProvider, draftProvider);
                                  },
                                ),
                              const SizedBox(height: 20),
                            ],
                          );
                        }).toList(),
                      )
                    : GridView.builder(
                        padding: const EdgeInsets.all(16),
                        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: crossAxisCount,
                          mainAxisSpacing: 12,
                          crossAxisSpacing: 12,
                          childAspectRatio: 1.2,
                        ),
                        itemCount: filteredTables.length,
                        itemBuilder: (context, idx) {
                          final table = filteredTables[idx];
                          return _buildTableCard(table, orderProvider, draftProvider);
                        },
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusFilterButton(String status, String label, Color activeColor, Color activeBgColor, Color? dotColor) {
    final isSelected = _activeStatusFilter == status;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _activeStatusFilter = status),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? activeBgColor : const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected ? activeColor : Colors.grey[200]!,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (dotColor != null) ...[
                Container(
                  width: 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: dotColor,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 6),
              ],
              Text(
                label,
                style: GoogleFonts.outfit(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: isSelected ? activeColor : Colors.grey[600],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAreaChip(String areaName) {
    final isSelected = _activeAreaFilter == areaName;
    return Padding(
      padding: const EdgeInsets.only(right: 8.0),
      child: ChoiceChip(
        label: Text(
          areaName.toUpperCase(),
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
              _activeAreaFilter = areaName;
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
  }

  Widget _buildTableCard(
    Map<String, dynamic> table,
    OrderProvider orderProvider,
    DraftProvider draftProvider,
  ) {
    final tableId = table['tableId'].toString();
    final tableInfo = orderProvider.getTableInfo(tableId);
    final isOccupied = tableInfo['status'] == 'Occupied';
    final hasDraft = draftProvider.hasDraft(tableId);

    // Color definitions matching CSS
    Color cardColor = Colors.white;
    Color borderColor = Colors.grey[200]!;
    Color textColor = Colors.black87;
    Color amountColor = Colors.black87;
    double displayAmount = 0.0;

    if (isOccupied) {
      cardColor = const Color(0xFFFFF7ED);
      borderColor = const Color(0xFFFFEDD5);
      textColor = const Color(0xFFEA580C);
      amountColor = const Color(0xFFEA580C);
      displayAmount = tableInfo['billTotal'];
    } else if (hasDraft) {
      cardColor = const Color(0xFFECFDF5);
      borderColor = const Color(0xFFD1FAE5);
      textColor = const Color(0xFF059669);
      amountColor = const Color(0xFF059669);
      displayAmount = draftProvider.getDraftTotal(tableId);
    }

    return InkWell(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => TableViewOverlay(
              tableId: tableId,
              onClose: () {
                Navigator.pop(context);
                orderProvider.fetchData();
                _loadDrafts();
              },
            ),
          ),
        );
      },
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: cardColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: borderColor),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              tableId,
              style: GoogleFonts.outfit(
                fontSize: 26,
                fontWeight: FontWeight.bold,
                color: textColor,
              ),
            ),
            if (displayAmount > 0)
              Align(
                alignment: Alignment.bottomRight,
                child: Text(
                  "₹${displayAmount.round()}",
                  style: GoogleFonts.outfit(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: amountColor,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  // Modals / Bottom Sheets

  void _showAddTableBottomSheet(OrderProvider provider) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom + 20,
                top: 20,
                left: 20,
                right: 20,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Add Table',
                    style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _tableIdController,
                    decoration: const InputDecoration(
                      labelText: 'Table ID (e.g. T-11)',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    value: _addTableArea,
                    decoration: const InputDecoration(
                      labelText: 'Dining Floor Section',
                      border: OutlineInputBorder(),
                    ),
                    items: provider.tableAreas.map((area) {
                      return DropdownMenuItem(value: area, child: Text(area));
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) {
                        setModalState(() {
                          _addTableArea = val;
                        });
                      }
                    },
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _seatsController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Seats Count',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => Navigator.pop(context),
                          child: const Text('Cancel'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () async {
                            final tableId = _tableIdController.text.trim();
                            final seats = int.tryParse(_seatsController.text) ?? 4;
                            if (tableId.isNotEmpty) {
                              try {
                                await provider.addTable(tableId, seats, _addTableArea);
                                Navigator.pop(context);
                                _tableIdController.clear();
                              } catch (e) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text(e.toString())),
                                );
                              }
                            }
                          },
                          child: const Text('Create'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _showAddSectionBottomSheet(OrderProvider provider) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom + 20,
            top: 20,
            left: 20,
            right: 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Add Section',
                style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _newAreaController,
                decoration: const InputDecoration(
                  labelText: 'Section Name (e.g. VIP Room)',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Cancel'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () async {
                        final areaName = _newAreaController.text.trim();
                        if (areaName.isNotEmpty) {
                          try {
                            await provider.addArea(areaName);
                            Navigator.pop(context);
                            _newAreaController.clear();
                          } catch (e) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text(e.toString())),
                            );
                          }
                        }
                      },
                      child: const Text('Save'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}

