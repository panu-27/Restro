import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../providers/menu_provider.dart';
import '../providers/order_provider.dart';
import '../providers/draft_provider.dart';
import '../services/api_service.dart';
import '../widgets/skeleton_loaders.dart';

// ─── TableViewOverlay ─────────────────────────────────────────────────────────
class TableViewOverlay extends StatefulWidget {
  final String? tableId;
  final String? orderId;
  final VoidCallback onClose;

  const TableViewOverlay({
    Key? key,
    this.tableId,
    this.orderId,
    required this.onClose,
  }) : super(key: key);

  @override
  State<TableViewOverlay> createState() => _TableViewOverlayState();
}

class _TableViewOverlayState extends State<TableViewOverlay> {
  // Mobile nav screen: 'menu' or 'cart'
  String _mobileView = 'menu';
  bool _loading = true;

  // Parts: { id, label, orderId?, orderNumber?, savedItems: [] }
  List<Map<String, dynamic>> _parts = [];
  int _activePartIdx = 0;

  // Draft (new/unsaved) items per partId
  Map<String, List<dynamic>> _roundItems = {};

  // Edit cart mode: user can decrement saved items too
  bool _isEditingCart = false;
  // Temp copies used while editing
  List<Map<String, dynamic>> _tempParts = [];
  Map<String, List<dynamic>> _tempRoundItems = {};

  // Transfer
  bool _showTransferView = false;
  String _selectedTransferTable = '';
  bool _isTransferring = false;

  // Phone per part
  final Map<String, TextEditingController> _phoneControllers = {};
  final _guestNoteController = TextEditingController();

  // Payment
  String _paymentType = 'Paid';
  String _paymentMode = 'Cash';
  double _cashAmount = 0;
  double _onlineAmount = 0;

  // Category layout: 'horizontal' | 'vertical'
  String _categoryLayout = 'horizontal';

  // Round msg flash
  bool _roundMsg = false;

  @override
  void initState() {
    super.initState();
    _initializeData();
  }

  @override
  void dispose() {
    _guestNoteController.dispose();
    for (var c in _phoneControllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  // ─── Init ──────────────────────────────────────────────────────────────────
  Future<void> _initializeData() async {
    final menuProvider = Provider.of<MenuProvider>(context, listen: false);
    final orderProvider = Provider.of<OrderProvider>(context, listen: false);
    final draftProvider = Provider.of<DraftProvider>(context, listen: false);

    if (menuProvider.items.isEmpty) await menuProvider.fetchMenu();

    List<Order> activeOrders = [];
    if (widget.orderId != null) {
      try {
        final o = await ApiService.getOrderById(widget.orderId!);
        activeOrders = [o];
      } catch (_) {
        activeOrders = orderProvider.activeOrders.where((o) => o.id == widget.orderId).toList();
      }
    } else if (widget.tableId != null) {
      activeOrders = orderProvider.activeOrders
          .where((o) =>
              o.tableId == widget.tableId &&
              o.orderType == 'Dine-in' &&
              o.status != 'Paid' &&
              o.status != 'Cancelled')
          .toList();
      activeOrders.sort((a, b) => DateTime.parse(a.createdAt).compareTo(DateTime.parse(b.createdAt)));
    }

    if (activeOrders.isNotEmpty) {
      _parts = activeOrders.asMap().entries.map((e) {
        final idx = e.key;
        final o = e.value;
        final expectedLabel = activeOrders.length == 1
            ? (widget.tableId ?? o.tableId)
            : '${widget.tableId}-Part${idx + 1}';
        return <String, dynamic>{
          'id': 'part-${o.id}',
          'label': o.partLabel.isNotEmpty ? o.partLabel : expectedLabel,
          'orderId': o.id,
          'orderNumber': o.orderNumber,
          'savedItems': o.items
              .map((i) => {
                    'menuId': i.menuId,
                    'name': i.name,
                    'price': i.price,
                    'qty': i.qty,
                    'isServed': i.isServed,
                    'note': i.note,
                  })
              .toList(),
        };
      }).toList();

      for (int i = 0; i < activeOrders.length; i++) {
        final o = activeOrders[i];
        final pid = 'part-${o.id}';
        _phoneControllers[pid] = TextEditingController(text: o.customerPhone);
        if (i == 0) {
          _paymentType = o.paymentType;
          _guestNoteController.text = o.guestNote;
        }
      }
    } else {
      final p1Id = 'part-${DateTime.now().millisecondsSinceEpoch}';
      _parts = [
        <String, dynamic>{
          'id': p1Id,
          'label': widget.tableId ?? 'Parcel #1',
          'savedItems': <dynamic>[],
        }
      ];
      _phoneControllers[p1Id] = TextEditingController();
    }

    // Load drafts
    if (widget.tableId != null) {
      final diskDrafts = draftProvider.getDraft(widget.tableId!);
      if (diskDrafts.isNotEmpty) {
        for (int i = 0; i < diskDrafts.length && i < _parts.length; i++) {
          final partId = _parts[i]['id'];
          final items = diskDrafts[i]['items'] as List? ?? [];
          if (items.isNotEmpty) _roundItems[partId] = List.from(items);
        }
      }
    }

    if (mounted) setState(() => _loading = false);
  }

  void _saveDraftState() {
    if (widget.tableId == null) return;
    final draftProvider = Provider.of<DraftProvider>(context, listen: false);
    final draftParts = _parts.map((p) {
      return {
        'label': p['label'],
        'items': _roundItems[p['id']] ?? [],
      };
    }).toList();
    draftProvider.saveDraft(widget.tableId!, draftParts);
  }

  // ─── Parts operations ──────────────────────────────────────────────────────
  void _addPart() {
    setState(() {
      // If first split, rename Part1
      if (_parts.length == 1 && widget.tableId != null && !(_parts[0]['label'] as String).contains('-Part')) {
        final oid = _parts[0]['orderId'] as String?;
        if (oid != null) {
          ApiService.updateOrderLabel(oid, '${widget.tableId}-Part1').catchError((_) {});
        }
        _parts[0] = {..._parts[0], 'label': '${widget.tableId}-Part1'};
      }

      int maxNum = 0;
      for (final p in _parts) {
        final match = RegExp(r'Part\s*(\d+)', caseSensitive: false).firstMatch(p['label'] as String);
        if (match != null) {
          final n = int.parse(match.group(1)!);
          if (n > maxNum) maxNum = n;
        }
      }
      final nextNum = (maxNum > _parts.length ? maxNum : _parts.length) + 1;
      final newPid = 'part-${DateTime.now().millisecondsSinceEpoch}';
      _parts.add(<String, dynamic>{
        'id': newPid,
        'label': widget.tableId != null ? '${widget.tableId}-Part$nextNum' : 'Parcel #$nextNum',
        'savedItems': <dynamic>[],
      });
      _phoneControllers[newPid] = TextEditingController();
      _activePartIdx = _parts.length - 1;
    });
    _saveDraftState();
  }

  Future<void> _removePart(int idx) async {
    final part = _parts[idx];
    final saved = part['savedItems'] as List? ?? [];
    final draft = _roundItems[part['id']] ?? [];

    if (saved.isNotEmpty || draft.isNotEmpty) {
      final confirm = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text('Remove ${part['label']}?',
              style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
          content: const Text('All items in this part will be lost.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Remove', style: TextStyle(color: Colors.red)),
            ),
          ],
        ),
      );
      if (confirm != true) return;
    }

    final oid = part['orderId'] as String?;
    if (oid != null) {
      try {
        await ApiService.deleteOrder(oid);
      } catch (_) {}
    }

    setState(() {
      _parts.removeAt(idx);
      if (_parts.length == 1 && widget.tableId != null) {
        final lastOid = _parts[0]['orderId'] as String?;
        if (lastOid != null) {
          ApiService.updateOrderLabel(lastOid, widget.tableId!).catchError((_) {});
        }
        _parts[0] = {..._parts[0], 'label': widget.tableId!};
      }
      _activePartIdx = (_activePartIdx >= _parts.length && _activePartIdx > 0)
          ? _activePartIdx - 1
          : _activePartIdx.clamp(0, _parts.length - 1);
    });
    _saveDraftState();
  }

  // ─── Qty helpers ───────────────────────────────────────────────────────────
  String get _currentPartId => _parts[_activePartIdx]['id'];

  List<dynamic> _currentRoundOf(String partId) {
    if (_isEditingCart) return _tempRoundItems[partId] ?? [];
    return _roundItems[partId] ?? [];
  }

  List<dynamic> _allItemsForPart(String partId) {
    final currentParts = _isEditingCart ? _tempParts : _parts;
    final part = currentParts.firstWhere((p) => p['id'] == partId, orElse: () => <String, dynamic>{});
    if (part.isEmpty) return [];
    final saved = part['savedItems'] as List? ?? [];
    final draft = _currentRoundOf(partId);
    final mergedMap = <String, Map<String, dynamic>>{};
    for (final si in saved) {
      final mid = si['menuId'] as String;
      if (mergedMap.containsKey(mid)) {
        mergedMap[mid]!['qty'] = (mergedMap[mid]!['qty'] as int) + (si['qty'] as int);
      } else {
        mergedMap[mid] = Map<String, dynamic>.from(si as Map);
      }
    }
    for (final ci in draft) {
      final mid = ci['menuId'] as String;
      if (mergedMap.containsKey(mid)) {
        mergedMap[mid]!['qty'] = (mergedMap[mid]!['qty'] as int) + (ci['qty'] as int);
      } else {
        mergedMap[mid] = Map<String, dynamic>.from(ci as Map);
      }
    }
    return mergedMap.values.toList();
  }

  int _getItemQtyInPart(String partId, String menuId) {
    return (_allItemsForPart(partId)
        .where((i) => i['menuId'] == menuId)
        .fold(0, (sum, i) => sum + (i['qty'] as int)));
  }

  void _updateDraftQty(String partId, MenuItem item, String? variantName, double variantPrice, int delta) {
    final menuId = variantName != null ? '${item.id}_$variantName' : item.id;
    final displayName = variantName != null ? '${item.name} ($variantName)' : item.name;
    final price = variantName != null ? variantPrice : item.price;

    if (_isEditingCart) {
      // Edit mode: first try tempRoundItems, then tempParts saved
      setState(() {
        final list = List<dynamic>.from(_tempRoundItems[partId] ?? []);
        final idx = list.indexWhere((x) => x['menuId'] == menuId);
        if (delta > 0) {
          if (idx >= 0) {
            list[idx] = {...(list[idx] as Map), 'qty': (list[idx]['qty'] as int) + delta};
          } else {
            list.add({'menuId': menuId, 'name': displayName, 'price': price, 'qty': delta, 'note': ''});
          }
          _tempRoundItems[partId] = list;
        } else {
          if (idx >= 0) {
            final newQty = (list[idx]['qty'] as int) + delta;
            if (newQty <= 0) {
              list.removeAt(idx);
            } else {
              list[idx] = {...(list[idx] as Map), 'qty': newQty};
            }
            _tempRoundItems[partId] = list;
          } else {
            // Decrement from saved items in tempParts
            final pIdx = _tempParts.indexWhere((p) => p['id'] == partId);
            if (pIdx < 0) return;
            final p = _tempParts[pIdx];
            final savedItems = List<dynamic>.from(p['savedItems'] as List? ?? []);
            final sIdx = savedItems.indexWhere((x) => x['menuId'] == menuId);
            if (sIdx >= 0) {
              final newQty = (savedItems[sIdx]['qty'] as int) + delta;
              if (newQty <= 0) {
                savedItems.removeAt(sIdx);
              } else {
                savedItems[sIdx] = {...(savedItems[sIdx] as Map), 'qty': newQty};
              }
              _tempParts[pIdx] = {...p, 'savedItems': savedItems};
            }
          }
        }
      });
    } else {
      setState(() {
        final list = List<dynamic>.from(_roundItems[partId] ?? []);
        final idx = list.indexWhere((x) => x['menuId'] == menuId);
        if (delta > 0) {
          if (idx >= 0) {
            list[idx] = {...(list[idx] as Map), 'qty': (list[idx]['qty'] as int) + delta};
          } else {
            list.add({'menuId': menuId, 'name': displayName, 'price': price, 'qty': delta, 'note': ''});
          }
        } else {
          if (idx >= 0) {
            final newQty = (list[idx]['qty'] as int) + delta;
            if (newQty <= 0) {
              list.removeAt(idx);
            } else {
              list[idx] = {...(list[idx] as Map), 'qty': newQty};
            }
          }
        }
        _roundItems[partId] = list;
      });
      _saveDraftState();
    }
  }

  // ─── Totals ────────────────────────────────────────────────────────────────
  double _subtotalOf(List<dynamic> items) {
    return items.fold(0.0, (s, i) => s + (i['price'] as num).toDouble() * (i['qty'] as int));
  }

  List<Map<String, dynamic>> _taxesOf(double subtotal, User? user) {
    if (user == null || !user.taxEnabled) return [];
    return user.taxes.where((t) => t.enabled).map((t) {
      return {'name': t.name, 'pct': t.percentage, 'amt': subtotal * t.percentage / 100};
    }).toList();
  }

  double _totalOf(double sub, List<Map<String, dynamic>> taxes) {
    return sub + taxes.fold(0.0, (s, t) => s + (t['amt'] as double));
  }

  // ─── KOT & Hold — send draft to kitchen, stay on screen ──────────────────
  Future<void> _sendKOT(String partId) async {
    final draft = _roundItems[partId] ?? [];
    if (draft.isEmpty) return;

    setState(() => _loading = true);
    try {
      final part = _parts.firstWhere((p) => p['id'] == partId);
      final phone = _phoneControllers[partId]?.text.trim() ?? '';
      final oid = part['orderId'] as String?;

      if (oid != null) {
        // Append items to existing order
        await ApiService.addItemsToOrder(
          oid,
          draft.map((i) => {'menuId': i['menuId'], 'name': i['name'], 'price': i['price'], 'quantity': i['qty'], 'note': i['note'] ?? ''}).toList(),
        );
        setState(() {
          final partIdx = _parts.indexWhere((p) => p['id'] == partId);
          if (partIdx >= 0) {
            final existingSaved = List<dynamic>.from(_parts[partIdx]['savedItems'] as List? ?? []);
            for (final di in draft) {
              final existIdx = existingSaved.indexWhere((s) => s['menuId'] == di['menuId']);
              if (existIdx >= 0) {
                existingSaved[existIdx] = {...(existingSaved[existIdx] as Map), 'qty': (existingSaved[existIdx]['qty'] as int) + (di['qty'] as int)};
              } else {
                existingSaved.add(Map<String, dynamic>.from(di as Map));
              }
            }
            _parts[partIdx] = {..._parts[partIdx], 'savedItems': existingSaved};
          }
          _roundItems[partId] = [];
        });
      } else {
        // Create new order
        final payload = {
          'orderType': widget.tableId != null ? 'Dine-in' : 'Parcel',
          'tableId': widget.tableId ?? '',
          'customerPhone': phone,
          'guestNote': _guestNoteController.text,
          'partLabel': part['label'],
          'items': draft.map((i) => {'menuId': i['menuId'], 'name': i['name'], 'price': i['price'], 'quantity': i['qty'], 'note': i['note'] ?? ''}).toList(),
        };
        final created = await ApiService.createOrder(payload);
        setState(() {
          final partIdx = _parts.indexWhere((p) => p['id'] == partId);
          if (partIdx >= 0) {
            _parts[partIdx] = {
              ..._parts[partIdx],
              'orderId': created.id,
              'orderNumber': created.orderNumber,
              'savedItems': List<dynamic>.from(draft),
            };
          }
          _roundItems[partId] = [];
        });
      }

      _saveDraftState();

      // Flash round msg
      setState(() => _roundMsg = true);
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) setState(() => _roundMsg = false);
      });

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Order sent to Kitchen! ✓'), backgroundColor: Colors.green),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  // ─── Save Changes (cart edit mode) ────────────────────────────────────────
  Future<void> _saveCartChanges() async {
    setState(() => _loading = true);
    try {
      final partId = _currentPartId;
      final part = _tempParts.firstWhere((p) => p['id'] == partId);
      final oid = part['orderId'] as String?;
      final savedItems = part['savedItems'] as List? ?? [];
      final draftItems = (_tempRoundItems[partId] ?? []).where((i) => (i['qty'] as int) > 0).toList();

      // Check if order is totally empty → delete
      final hasAnySaved = savedItems.any((i) => (i['qty'] as int) > 0);
      final hasAnyDraft = draftItems.isNotEmpty;
      if (!hasAnySaved && !hasAnyDraft) {
        if (oid != null) await ApiService.deleteOrder(oid);
        setState(() {
          _parts.remove(part);
          if (_parts.isEmpty) {
            if (widget.tableId != null) {
              Provider.of<DraftProvider>(context, listen: false).clearDraft(widget.tableId!);
            }
            widget.onClose();
            return;
          }
          _activePartIdx = 0;
          _isEditingCart = false;
          _mobileView = 'menu';
        });
        return;
      }

      // Commit saved item changes
      if (oid != null) {
        final flatItems = savedItems
            .where((i) => (i['qty'] as int) > 0)
            .map((i) => {'menuId': i['menuId'], 'name': i['name'], 'price': i['price'], 'quantity': i['qty']})
            .toList();
        await ApiService.updateOrderItems(oid, flatItems);
      }

      // Commit new draft items
      if (draftItems.isNotEmpty) {
        if (oid != null) {
          await ApiService.addItemsToOrder(
            oid,
            draftItems.map((i) => {'menuId': i['menuId'], 'name': i['name'], 'price': i['price'], 'quantity': i['qty']}).toList(),
          );
        } else {
          // Create new order
          final phone = _phoneControllers[partId]?.text.trim() ?? '';
          final payload = {
            'orderType': widget.tableId != null ? 'Dine-in' : 'Parcel',
            'tableId': widget.tableId ?? '',
            'customerPhone': phone,
            'partLabel': part['label'],
            'items': draftItems.map((i) => {'menuId': i['menuId'], 'name': i['name'], 'price': i['price'], 'quantity': i['qty']}).toList(),
          };
          final created = await ApiService.createOrder(payload);
          final pIdx = _parts.indexWhere((p) => p['id'] == partId);
          if (pIdx >= 0) {
            _parts[pIdx] = {..._parts[pIdx], 'orderId': created.id, 'orderNumber': created.orderNumber};
          }
        }
      }

      // Apply temp state back to real state
      setState(() {
        final pIdx = _parts.indexWhere((p) => p['id'] == partId);
        if (pIdx >= 0) {
          _parts[pIdx] = {
            ..._parts[pIdx],
            'savedItems': [...savedItems.where((i) => (i['qty'] as int) > 0), ...draftItems],
          };
        }
        _roundItems[partId] = [];
        _isEditingCart = false;
        _mobileView = 'menu';
      });
      _saveDraftState();

      setState(() => _roundMsg = true);
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) setState(() => _roundMsg = false);
      });

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Changes saved successfully ✓'), backgroundColor: Colors.green),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  // ─── Confirm & Bill (save then settle) ────────────────────────────────────
  Future<void> _confirmAndBill(String partId, double grandTotal) async {
    if (_isEditingCart) await _saveCartChanges();
    if (!mounted) return;
    _showCheckoutPanel(partId, grandTotal);
  }

  // ─── Checkout ─────────────────────────────────────────────────────────────
  Future<void> _checkoutBill(String partId, double grandTotal) async {
    final part = _parts.firstWhere((p) => p['id'] == partId);
    final oid = part['orderId'] as String?;
    if (oid == null) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please place a KOT order first.')),
      );
      return;
    }

    setState(() => _loading = true);
    try {
      await ApiService.checkoutOrder(
        orderId: oid,
        paymentType: _paymentType,
        paymentMode: _paymentMode,
        guestNote: _guestNoteController.text,
        cashAmount: _paymentMode == 'Split' ? _cashAmount : (_paymentMode == 'Cash' ? grandTotal : 0.0),
        onlineAmount: _paymentMode == 'Split' ? _onlineAmount : (_paymentMode == 'UPI' ? grandTotal : 0.0),
      );

      _roundItems.remove(partId);
      _saveDraftState();

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Bill settled successfully!'), backgroundColor: Colors.green),
      );

      setState(() {
        _parts.removeWhere((p) => p['id'] == partId);
        if (_parts.length == 1 && widget.tableId != null) {
          final lastOid = _parts[0]['orderId'] as String?;
          if (lastOid != null) {
            ApiService.updateOrderLabel(lastOid, widget.tableId!).catchError((_) {});
          }
          _parts[0] = {..._parts[0], 'label': widget.tableId!};
        }
      });

      if (_parts.isEmpty) {
        if (widget.tableId != null) {
          Provider.of<DraftProvider>(context, listen: false).clearDraft(widget.tableId!);
        }
        widget.onClose();
      } else {
        setState(() {
          _activePartIdx = 0;
          _mobileView = 'menu';
          _isEditingCart = false;
        });
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  // ─── WhatsApp ─────────────────────────────────────────────────────────────
  void _shareWhatsApp(String partId, double grandTotal) async {
    final phone = _phoneControllers[partId]?.text.trim() ?? '';
    if (phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a customer phone number first.')),
      );
      return;
    }
    final restName = Provider.of<AuthProvider>(context, listen: false).user?.restaurantName ?? 'Restaurant';
    final part = _parts.firstWhere((p) => p['id'] == partId);
    final orderNum = part['orderNumber'] != null ? '#${part['orderNumber'].toString().padLeft(4, '0')}' : '';
    final message = "Hello! Thanks for dining at $restName. Your bill $orderNum total is ₹${grandTotal.round()}. Thank you!";
    final url = "https://wa.me/91$phone?text=${Uri.encodeComponent(message)}";
    if (await canLaunchUrl(Uri.parse(url))) {
      await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
    }
  }

  // ─── Exit guard ───────────────────────────────────────────────────────────
  void _handleBack() {
    if (_isEditingCart) {
      setState(() {
        _isEditingCart = false;
        _mobileView = 'menu';
        _tempParts = [];
        _tempRoundItems = {};
      });
      return;
    }
    final hasUnsaved = _roundItems.values.any((list) => list.isNotEmpty);
    if (hasUnsaved) {
      _showExitWarning();
    } else {
      widget.onClose();
    }
  }

  void _showExitWarning() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text('Unsaved Items!', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18)),
        content: const Text('You have items not sent to kitchen. What would you like to do?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Cancel', style: GoogleFonts.outfit(color: Colors.grey)),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              if (widget.tableId != null) {
                Provider.of<DraftProvider>(context, listen: false).clearDraft(widget.tableId!);
              }
              widget.onClose();
            },
            child: Text('Discard & Exit', style: GoogleFonts.outfit(color: Colors.red, fontWeight: FontWeight.bold)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.orange),
            onPressed: () {
              Navigator.pop(ctx);
              _sendKOT(_currentPartId).then((_) => widget.onClose());
            },
            child: Text('KOT & Exit', style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  // ─── Build ────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: Colors.white,
        body: Center(child: CircularProgressIndicator(color: Color(0xFF3B82F6))),
      );
    }

    final auth = Provider.of<AuthProvider>(context);
    final user = auth.user;
    final menuProvider = Provider.of<MenuProvider>(context);
    final orderProvider = Provider.of<OrderProvider>(context);

    if (_showTransferView) return _buildTransferView(orderProvider);

    final size = MediaQuery.of(context).size;
    final isDesktop = size.width > 800;

    if (_parts.isEmpty) {
      return Scaffold(
        appBar: AppBar(
          leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: widget.onClose),
          title: const Text('Table View'),
        ),
        body: const Center(child: Text('No active order')),
      );
    }

    final activePartId = _parts[_activePartIdx]['id'];
    final allItems = _allItemsForPart(activePartId);
    final subtotal = _subtotalOf(allItems);
    final taxes = _taxesOf(subtotal, user);
    final grandTotal = _totalOf(subtotal, taxes);

    // Auto-adjust payment amounts
    if (_paymentMode == 'Cash') {
      _cashAmount = grandTotal;
      _onlineAmount = 0;
    } else if (_paymentMode == 'UPI') {
      _onlineAmount = grandTotal;
      _cashAmount = 0;
    }

    final header = _buildAppBar(isDesktop);

    if (isDesktop) {
      return Scaffold(
        backgroundColor: const Color(0xFFF8FAFC),
        appBar: header,
        body: Row(
          children: [
            Expanded(flex: 6, child: _buildMenuPane(menuProvider, activePartId)),
            Expanded(
              flex: 4,
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  border: Border(left: BorderSide(color: Colors.grey[200]!)),
                ),
                child: _mobileView == 'cart'
                    ? _buildCartScreen(activePartId, allItems, subtotal, taxes, grandTotal, user)
                    : _buildCartPane(activePartId, subtotal, taxes, grandTotal, user),
              ),
            ),
          ],
        ),
      );
    }

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: header,
      body: _mobileView == 'menu'
          ? _buildMenuPane(menuProvider, activePartId)
          : _buildCartScreen(activePartId, allItems, subtotal, taxes, grandTotal, user),
      bottomNavigationBar: _mobileView == 'menu'
          ? _buildMobileMenuBottomBar(activePartId, allItems, grandTotal)
          : _buildMobileCartBottomBar(activePartId, grandTotal),
    );
  }

  Widget _buildMobileMenuBottomBar(String partId, List<dynamic> allItems, double grandTotal) {
    final draftItems = _roundItems[partId] ?? [];
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Colors.grey[100]!)),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.07), blurRadius: 16, offset: const Offset(0, -4))],
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (allItems.isNotEmpty)
              InkWell(
                onTap: () {
                  setState(() {
                    _isEditingCart = true;
                    _tempParts = _parts.map((p) => Map<String, dynamic>.from(p)
                      ..['savedItems'] = List<dynamic>.from(p['savedItems'] as List? ?? [])).toList();
                    _tempRoundItems = _roundItems.map((k, v) => MapEntry(k, List<dynamic>.from(v)));
                    _mobileView = 'cart';
                  });
                },
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Row(
                    children: [
                      const Icon(Icons.shopping_cart, color: Color(0xFF3B82F6), size: 18),
                      const SizedBox(width: 8),
                      Text('View Cart', style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.black87)),
                      Text('  ·  ${allItems.length} items', style: GoogleFonts.outfit(fontSize: 12, fontWeight: FontWeight.w500, color: Colors.grey[500])),
                      const Spacer(),
                      Text('₹${grandTotal.round()}', style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.bold, color: const Color(0xFF3B82F6))),
                      const SizedBox(width: 8),
                      Icon(Icons.chevron_right, color: Colors.blue[300], size: 18),
                    ],
                  ),
                ),
              ),
            if (allItems.isNotEmpty) const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
              child: Row(
                children: [
                  Expanded(
                    child: ElevatedButton(
                      onPressed: draftItems.isNotEmpty ? () => _sendKOT(partId) : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: Colors.black87,
                        side: BorderSide(color: draftItems.isNotEmpty ? Colors.grey[400]! : Colors.grey[200]!),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 0,
                      ),
                      child: Text(_roundMsg ? '✓ KOT Sent!' : 'KOT & Hold',
                          style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 13, letterSpacing: 0.5)),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: allItems.isNotEmpty
                          ? () async {
                              if (draftItems.isNotEmpty) await _sendKOT(partId);
                              if (mounted) _showCheckoutPanel(partId, grandTotal);
                            }
                          : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF3B82F6),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: draftItems.isNotEmpty ? 2 : 0,
                      ),
                      child: Text(
                        allItems.isNotEmpty ? 'KOT & Settle (₹${grandTotal.round()})' : 'KOT & Settle',
                        style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 13, letterSpacing: 0.5),
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

  Widget _buildMobileCartBottomBar(String partId, double grandTotal) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Colors.grey[100]!)),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.07), blurRadius: 16, offset: const Offset(0, -4))],
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
          child: Row(
            children: [
              Expanded(
                child: ElevatedButton(
                  onPressed: _loading ? null : () => _saveCartChanges(),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: Colors.black87,
                    side: BorderSide(color: Colors.grey[300]!),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                  child: Text(_loading ? 'Saving...' : 'Save Changes',
                      style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 13, letterSpacing: 0.5)),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: ElevatedButton(
                  onPressed: _loading ? null : () => _confirmAndBill(partId, grandTotal),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF3B82F6),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 1,
                  ),
                  child: Text(
                    'Confirm & Bill (₹${grandTotal.round()})',
                    style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 13, letterSpacing: 0.5),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ─── App Bar ──────────────────────────────────────────────────────────────
  AppBar _buildAppBar(bool isDesktop) {
    return AppBar(
      backgroundColor: Colors.white,
      elevation: 0.5,
      leading: IconButton(
        icon: Icon(_mobileView == 'cart' ? Icons.arrow_back_ios_new_rounded : Icons.arrow_back,
            color: Colors.black87),
        onPressed: _handleBack,
      ),
      title: Text(
        _mobileView == 'cart'
            ? 'Cart'
            : (widget.tableId != null ? 'Table ${widget.tableId}' : 'Parcel Order'),
        style: GoogleFonts.outfit(color: Colors.black87, fontWeight: FontWeight.bold, fontSize: 17),
      ),
      actions: [
        // Settings/layout icon on menu screen
        if (_mobileView == 'menu')
          IconButton(
            icon: const Icon(Icons.tune_rounded, color: Colors.black54),
            tooltip: 'Interface Settings',
            onPressed: _showCategoryLayoutSettings,
          ),
        // Table No badge on cart screen
        if (_mobileView == 'cart' && widget.tableId != null)
          Center(
            child: Container(
              margin: const EdgeInsets.only(right: 16),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                'Table ${widget.tableId}',
                style: GoogleFonts.outfit(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey[700]),
              ),
            ),
          ),
        // Transfer & Split on menu screen
        if (_mobileView == 'menu' && widget.tableId != null) ...[
          TextButton(
            onPressed: () {
              final activePart = _parts[_activePartIdx];
              final oid = activePart['orderId'] as String?;
              if (oid == null || oid.isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text("Save this part first (KOT & Hold) before transferring.")),
                );
                return;
              }
              setState(() {
                _selectedTransferTable = '';
                _showTransferView = true;
              });
            },
            child: Text('Transfer', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: const Color(0xFF3B82F6))),
          ),
          TextButton(
            onPressed: _addPart,
            child: Text('Split', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: const Color(0xFF3B82F6))),
          ),
        ],
      ],
    );
  }

  // ─── Parts Tabs Strip ─────────────────────────────────────────────────────
  Widget _buildPartsTabs() {
    if (_parts.length <= 1) return const SizedBox.shrink();
    final currentParts = _isEditingCart ? _tempParts : _parts;
    return Container(
      height: 44,
      color: const Color(0xFFF8FAFC),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        itemCount: currentParts.length,
        itemBuilder: (context, idx) {
          final isCurrent = idx == _activePartIdx;
          final p = currentParts[idx];
          final its = _allItemsForPart(p['id'] as String);
          final tot = _totalOf(_subtotalOf(its), []);
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: () => setState(() => _activePartIdx = idx),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: isCurrent ? Colors.black87 : Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: isCurrent ? Colors.black87 : Colors.grey[300]!,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.people, size: 10, color: isCurrent ? Colors.white : Colors.grey[500]),
                    const SizedBox(width: 4),
                    Text(
                      p['label'] as String,
                      style: GoogleFonts.outfit(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: isCurrent ? Colors.white : Colors.grey[600],
                      ),
                    ),
                    if (its.isNotEmpty) ...[
                      const SizedBox(width: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                        decoration: BoxDecoration(
                          color: isCurrent ? Colors.white.withAlpha(40) : Colors.grey[100],
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          '₹${tot.round()}',
                          style: GoogleFonts.outfit(
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                            color: isCurrent ? Colors.white : Colors.grey[500],
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(width: 4),
                    GestureDetector(
                      onTap: () => _removePart(idx),
                      child: Icon(Icons.close, size: 12, color: isCurrent ? Colors.white60 : Colors.grey[400]),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  // ─── Menu Pane ────────────────────────────────────────────────────────────
  Widget _buildMenuPane(MenuProvider menu, String activePartId) {
    final categories = menu.categories;
    final items = menu.filteredItems;
    final isVertical = _categoryLayout == 'vertical';

    final horizontalBar = isVertical
        ? const SizedBox.shrink()
        : SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: categories.map((cat) {
                final isSelected = menu.selectedCategory == cat;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(cat.toUpperCase(),
                        style: GoogleFonts.outfit(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: isSelected ? const Color(0xFF3B82F6) : Colors.grey[600],
                        )),
                    selected: isSelected,
                    onSelected: (v) { if (v) menu.setSelectedCategory(cat); },
                    backgroundColor: const Color(0xFFF2F2F7),
                    selectedColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                      side: BorderSide(color: isSelected ? const Color(0xFF3B82F6) : Colors.transparent),
                    ),
                  ),
                );
              }).toList(),
            ),
          );

    final verticalSidebar = isVertical
        ? Container(
            width: 68,
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              border: Border(right: BorderSide(color: Colors.grey[100]!)),
            ),
            child: ListView.builder(
              padding: const EdgeInsets.only(top: 8, bottom: 80),
              itemCount: categories.length,
              itemBuilder: (context, idx) {
                final cat = categories[idx];
                final isSelected = menu.selectedCategory == cat;
                return GestureDetector(
                  onTap: () => menu.setSelectedCategory(cat),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
                    decoration: BoxDecoration(
                      color: isSelected ? Colors.white : Colors.transparent,
                      border: isSelected
                          ? const Border(right: BorderSide(color: Color(0xFF3B82F6), width: 3))
                          : null,
                    ),
                    child: Column(
                      children: [
                        Icon(cat == 'All' ? Icons.restaurant_menu : Icons.fastfood,
                            size: 18, color: isSelected ? const Color(0xFF3B82F6) : Colors.grey[400]),
                        const SizedBox(height: 3),
                        Text(cat, maxLines: 2, textAlign: TextAlign.center,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.outfit(
                              fontSize: 8,
                              fontWeight: FontWeight.bold,
                              color: isSelected ? const Color(0xFF1D4ED8) : Colors.grey[500],
                            )),
                      ],
                    ),
                  ),
                );
              },
            ),
          )
        : const SizedBox.shrink();

    final searchBar = Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Container(
        decoration: BoxDecoration(color: const Color(0xFFF2F2F7), borderRadius: BorderRadius.circular(12)),
        child: TextField(
          onChanged: menu.setSearchQuery,
          decoration: InputDecoration(
            hintText: 'Search dishes...',
            hintStyle: GoogleFonts.outfit(color: Colors.grey),
            prefixIcon: const Icon(Icons.search, color: Colors.grey),
            border: InputBorder.none,
            contentPadding: const EdgeInsets.symmetric(vertical: 12),
          ),
        ),
      ),
    );

    final dishGrid = menu.isLoading
        ? GridView.builder(
            padding: const EdgeInsets.all(12),
            gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                maxCrossAxisExtent: 180, mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 0.72),
            itemCount: 8,
            itemBuilder: (_, __) => const MenuItemCardSkeleton(),
          )
        : items.isEmpty
            ? Center(child: Text('No dishes found', style: GoogleFonts.outfit(color: Colors.grey)))
            : GridView.builder(
                padding: const EdgeInsets.all(12),
                gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(
                    maxCrossAxisExtent: isVertical ? 155 : 180,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 0.72),
                itemCount: items.length,
                itemBuilder: (_, idx) {
                  final item = items[idx];
                  final qty = _getItemQtyInPart(activePartId, item.id);
                  return _buildMenuItemCard(item, activePartId, qty);
                },
              );

    return Column(
      children: [
        _buildPartsTabs(),
        horizontalBar,
        searchBar,
        const SizedBox(height: 4),
        Expanded(
          child: Row(
            children: [
              verticalSidebar,
              Expanded(child: dishGrid),
            ],
          ),
        ),
      ],
    );
  }

  // ─── Menu Item Card ───────────────────────────────────────────────────────
  Widget _buildMenuItemCard(MenuItem item, String partId, int qty) {
    final hasVars = item.variations.length >= 2;
    final isSingleVar = item.variations.length == 1;
    final basePrice = hasVars
        ? item.variations.map((v) => v.price).reduce((a, b) => a < b ? a : b)
        : (isSingleVar ? item.variations.first.price : item.price);

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey[200]!),
        boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 2, offset: Offset(0, 1))],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Stack(fit: StackFit.expand, children: [
              item.image.isNotEmpty
                  ? Image.network(item.image, fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(color: Colors.grey[100]))
                  : Container(color: Colors.grey[50],
                      child: const Icon(Icons.fastfood, color: Colors.grey, size: 28)),
              // Price badge
              Positioned(
                top: 6, right: 6,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(6),
                    boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 2)],
                  ),
                  child: Text("₹${basePrice.round()}${hasVars ? '+' : ''}",
                      style: GoogleFonts.outfit(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.black87)),
                ),
              ),
              // Qty controls
              Positioned(
                bottom: 6, right: 6,
                child: qty > 0 && !hasVars
                    ? Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFF3B82F6),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            _qtyBtn(Icons.remove, () => _updateDraftQty(partId, item, null, 0, -1)),
                            Text('$qty',
                                style: GoogleFonts.outfit(
                                    color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                            _qtyBtn(Icons.add, () => _updateDraftQty(partId, item, null, 0, 1)),
                          ],
                        ),
                      )
                    : GestureDetector(
                        onTap: () {
                          if (hasVars) {
                            _showVariationsModal(item, partId);
                          } else if (isSingleVar) {
                            _updateDraftQty(partId, item, item.variations.first.name, item.variations.first.price, 1);
                          } else {
                            _updateDraftQty(partId, item, null, 0, 1);
                          }
                        },
                        child: Container(
                          width: 32, height: 32,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            border: const Border.fromBorderSide(BorderSide(color: Color(0xFF3B82F6))),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.add, color: Color(0xFF3B82F6), size: 16),
                        ),
                      ),
              ),
            ]),
          ),
          Padding(
            padding: const EdgeInsets.all(7),
            child: Text(item.name,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.outfit(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.black87)),
          ),
        ],
      ),
    );
  }

  Widget _qtyBtn(IconData icon, VoidCallback onTap) => GestureDetector(
        onTap: onTap,
        child: SizedBox(
          width: 28, height: 28,
          child: Icon(icon, color: Colors.white, size: 14),
        ),
      );

  // ─── Cart Pane (desktop right panel) ─────────────────────────────────────
  Widget _buildCartPane(String partId, double subtotal, List<Map<String, dynamic>> taxes, double grandTotal, User? user) {
    final draftItems = _roundItems[partId] ?? [];
    final savedItems = (_parts.firstWhere((p) => p['id'] == partId, orElse: () => <String, dynamic>{})['savedItems'] as List?) ?? [];

    return Column(
      children: [
        _buildPartsTabs(),
        // Phone
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          child: TextField(
            controller: _phoneControllers[partId],
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(
              labelText: 'Customer Phone',
              prefixIcon: Icon(Icons.phone),
              border: OutlineInputBorder(),
              isDense: true,
            ),
          ),
        ),
        Expanded(
          child: (savedItems.isEmpty && draftItems.isEmpty)
              ? Center(child: Text('Cart is empty', style: GoogleFonts.outfit(color: Colors.grey)))
              : ListView(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  children: [
                    if (savedItems.isNotEmpty) ...[
                      Text('SENT TO KITCHEN', style: GoogleFonts.outfit(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 1)),
                      const SizedBox(height: 4),
                      ...savedItems.map((item) => _buildCartItemRow(item, isSaved: true, partId: partId)),
                      const Divider(),
                    ],
                    if (draftItems.isNotEmpty) ...[
                      Text('PENDING KOT', style: GoogleFonts.outfit(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.blue, letterSpacing: 1)),
                      const SizedBox(height: 4),
                      ...draftItems.map((item) => _buildCartItemRow(item, isSaved: false, partId: partId)),
                    ],
                  ],
                ),
        ),
        // Summary + actions
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: Colors.grey[50], border: Border(top: BorderSide(color: Colors.grey[200]!))),
          child: Column(
            children: [
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Text('Subtotal', style: GoogleFonts.outfit(fontSize: 13, color: Colors.grey[600])),
                Text('₹${subtotal.toStringAsFixed(2)}', style: GoogleFonts.outfit(fontSize: 13, color: Colors.grey[800])),
              ]),
              ...taxes.map((t) => Padding(
                    padding: const EdgeInsets.only(top: 3),
                    child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                      Text(t['name'] as String, style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey[600])),
                      Text('₹${(t['amt'] as double).toStringAsFixed(2)}', style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey[700])),
                    ]),
                  )),
              const Divider(),
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Text('Total', style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.bold)),
                Text('₹${grandTotal.round()}', style: GoogleFonts.outfit(fontSize: 17, fontWeight: FontWeight.bold, color: Colors.blue)),
              ]),
              const SizedBox(height: 12),
              // Bottom cart actions moved to sticky bottom bar for mobile
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildCartItemRow(dynamic item, {required bool isSaved, required String partId}) {
    final qty = (item['qty'] as num).toInt();
    final price = (item['price'] as num).toDouble();
    final name = item['name'].toString();
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Text(name,
                style: GoogleFonts.outfit(
                    fontSize: 13,
                    fontWeight: isSaved ? FontWeight.w500 : FontWeight.bold,
                    color: isSaved ? Colors.grey[700] : Colors.black87)),
          ),
          Text('${qty}x  ₹${(price * qty).round()}',
              style: GoogleFonts.outfit(
                  fontSize: 13, fontWeight: FontWeight.bold, color: isSaved ? Colors.grey[600] : Colors.blue)),
        ],
      ),
    );
  }

  // ─── Mobile Cart Screen (matches React renderMobileCartScreen) ────────────
  Widget _buildCartScreen(String partId, List<dynamic> allItems, double subtotal, List<Map<String, dynamic>> taxes, double grandTotal, User? user) {
    final menuProvider = Provider.of<MenuProvider>(context);

    return Column(
      children: [
        _buildPartsTabs(),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.only(bottom: 120),
            children: [
              // Items Grid (editable — with +/- on saved items too in edit mode)
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 12, 12, 4),
                child: Text('ITEMS IN ORDER',
                    style: GoogleFonts.outfit(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey[400], letterSpacing: 1.5)),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 10),
                child: allItems.isEmpty
                    ? Padding(
                        padding: const EdgeInsets.symmetric(vertical: 24),
                        child: Center(child: Text('No items in cart', style: GoogleFonts.outfit(color: Colors.grey))),
                      )
                    : GridView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 3, mainAxisSpacing: 10, crossAxisSpacing: 10, childAspectRatio: 0.72),
                        itemCount: allItems.length,
                        itemBuilder: (_, idx) {
                          final cartItem = allItems[idx];
                          final menuItem = menuProvider.items.firstWhere(
                              (m) => cartItem['menuId'] == m.id || (cartItem['menuId'] as String).startsWith(m.id),
                              orElse: () => MenuItem(
                                    id: cartItem['menuId'] as String,
                                    name: cartItem['name'] as String,
                                    price: (cartItem['price'] as num).toDouble(),
                                    category: '',
                                    image: '',
                                    isAvailable: true,
                                    variations: [],
                                  ));
                          return _buildMenuItemCard(menuItem, partId, cartItem['qty'] as int);
                        },
                      ),
              ),

              // Customer Details
              _buildCartCard(
                title: 'Customer Details',
                trailing: null,
                child: Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Phone', style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey[500])),
                      const SizedBox(height: 4),
                      TextField(
                        controller: _phoneControllers[partId],
                        keyboardType: TextInputType.phone,
                        style: GoogleFonts.outfit(fontSize: 14),
                        decoration: InputDecoration(
                          hintText: 'Mobile number',
                          hintStyle: GoogleFonts.outfit(color: Colors.grey[400]),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          isDense: true,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Text('Guest Note', style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey[500])),
                      const SizedBox(height: 4),
                      TextField(
                        controller: _guestNoteController,
                        style: GoogleFonts.outfit(fontSize: 14),
                        decoration: InputDecoration(
                          hintText: 'Instruction for kitchen...',
                          hintStyle: GoogleFonts.outfit(color: Colors.grey[400]),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          isDense: true,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Table No
              if (widget.tableId != null)
                _buildCartCard(
                  title: 'Table No.',
                  trailing: null,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey[200]!),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(widget.tableId!,
                        style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.grey[800])),
                  ),
                ),

              // Payment Type
              _buildCartCard(
                title: 'Payment Type',
                trailing: null,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      spacing: 8,
                      children: ['Cash', 'UPI', 'Split'].map((mode) {
                        final isSelected = _paymentMode == mode;
                        return ChoiceChip(
                          label: Text(mode,
                              style: GoogleFonts.outfit(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  color: isSelected ? const Color(0xFF3B82F6) : Colors.grey[700])),
                          selected: isSelected,
                          onSelected: (v) {
                            if (!v) return;
                            setState(() {
                              _paymentMode = mode;
                              if (mode == 'Cash') { _cashAmount = grandTotal; _onlineAmount = 0; }
                              else if (mode == 'Split') { _cashAmount = (grandTotal / 2).floorToDouble(); _onlineAmount = grandTotal - _cashAmount; }
                              else { _onlineAmount = grandTotal; _cashAmount = 0; }
                            });
                          },
                          backgroundColor: Colors.white,
                          selectedColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(20),
                            side: BorderSide(color: isSelected ? const Color(0xFF3B82F6) : Colors.grey[300]!),
                          ),
                        );
                      }).toList(),
                    ),
                    if (_paymentMode == 'Split') ...[
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Text('CASH AMT', style: GoogleFonts.outfit(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.grey[400], letterSpacing: 0.5)),
                              const SizedBox(height: 4),
                              TextField(
                                keyboardType: TextInputType.number,
                                controller: TextEditingController(text: _cashAmount.toStringAsFixed(0)),
                                onChanged: (v) => setState(() {
                                  _cashAmount = double.tryParse(v) ?? 0;
                                  _onlineAmount = (grandTotal - _cashAmount).clamp(0, grandTotal);
                                }),
                                style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.bold),
                                decoration: InputDecoration(
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                  isDense: true,
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                ),
                              ),
                            ]),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Text('ONLINE AMT', style: GoogleFonts.outfit(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.grey[400], letterSpacing: 0.5)),
                              const SizedBox(height: 4),
                              TextField(
                                keyboardType: TextInputType.number,
                                controller: TextEditingController(text: _onlineAmount.toStringAsFixed(0)),
                                onChanged: (v) => setState(() {
                                  _onlineAmount = double.tryParse(v) ?? 0;
                                  _cashAmount = (grandTotal - _onlineAmount).clamp(0, grandTotal);
                                }),
                                style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.bold),
                                decoration: InputDecoration(
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                  isDense: true,
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                ),
                              ),
                            ]),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),

              // Bill Details
              _buildCartCard(
                title: 'Bill Details',
                trailing: null,
                child: Column(
                  children: [
                    Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                      Row(children: [
                        Icon(Icons.receipt_long, size: 15, color: Colors.grey[400]),
                        const SizedBox(width: 6),
                        Text('Sub Total', style: GoogleFonts.outfit(fontSize: 13, color: Colors.grey[700])),
                      ]),
                      Text('₹${subtotal.round()}', style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.grey[800])),
                    ]),
                    ...taxes.map((t) => Padding(
                          padding: const EdgeInsets.only(top: 6),
                          child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                            Text('${t['name']} (${(t['pct'] as double).toStringAsFixed(0)}%)',
                                style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey[500])),
                            Text('₹${(t['amt'] as double).toStringAsFixed(2)}',
                                style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey[600])),
                          ]),
                        )),
                    const SizedBox(height: 8),
                    const Divider(),
                    Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                      Text('Total Amount', style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.grey[800])),
                      Text('₹${grandTotal.round()}', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold, color: const Color(0xFF3B82F6))),
                    ]),
                  ],
                ),
              ),

              // Items summary
              _buildCartCard(
                title: 'Items in Bill',
                trailing: null,
                child: allItems.isEmpty
                    ? Text('No items', style: GoogleFonts.outfit(color: Colors.grey, fontSize: 12))
                    : Column(
                        children: allItems.where((i) => (i['qty'] as int) > 0).map((item) {
                          final qty = item['qty'] as int;
                          final price = (item['price'] as num).toDouble();
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                    Text(item['name'] as String,
                                        style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.grey[800])),
                                    Text('₹${price.round()} × $qty',
                                        style: GoogleFonts.outfit(fontSize: 11, color: Colors.grey[500])),
                                  ]),
                                ),
                                Text('₹${(price * qty).round()}',
                                    style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.grey[700])),
                              ],
                            ),
                          );
                        }).toList(),
                      ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildCartCard({required String title, Widget? trailing, required Widget child}) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(title, style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.grey[800])),
              if (trailing != null) trailing,
            ],
          ),
          const SizedBox(height: 10),
          child,
        ],
      ),
    );
  }

  // ─── Checkout Panel ───────────────────────────────────────────────────────
  void _showCheckoutPanel(String partId, double grandTotal) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: EdgeInsets.only(
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 24, top: 24, left: 24, right: 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Settle Bill: ₹${grandTotal.round()}',
                  style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: _paymentMode,
                decoration: const InputDecoration(labelText: 'Payment Mode', border: OutlineInputBorder()),
                items: ['Cash', 'UPI', 'Split']
                    .map((m) => DropdownMenuItem(value: m, child: Text(m)))
                    .toList(),
                onChanged: (val) {
                  if (val == null) return;
                  setModalState(() {
                    _paymentMode = val;
                    if (val == 'Cash') { _cashAmount = grandTotal; _onlineAmount = 0; }
                    else if (val == 'Split') { _cashAmount = (grandTotal / 2).floorToDouble(); _onlineAmount = grandTotal - _cashAmount; }
                    else { _onlineAmount = grandTotal; _cashAmount = 0; }
                  });
                },
              ),
              if (_paymentMode == 'Split') ...[
                const SizedBox(height: 12),
                Row(children: [
                  Expanded(
                    child: TextField(
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Cash Amount (₹)', border: OutlineInputBorder()),
                      controller: TextEditingController(text: _cashAmount.toStringAsFixed(0)),
                      onChanged: (v) { _cashAmount = double.tryParse(v) ?? 0; _onlineAmount = (grandTotal - _cashAmount).clamp(0, grandTotal); },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Online Amount (₹)', border: OutlineInputBorder()),
                      controller: TextEditingController(text: _onlineAmount.toStringAsFixed(0)),
                      onChanged: (v) { _onlineAmount = double.tryParse(v) ?? 0; _cashAmount = (grandTotal - _onlineAmount).clamp(0, grandTotal); },
                    ),
                  ),
                ]),
              ],
              const SizedBox(height: 20),
              Row(children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(ctx),
                    style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
                    child: const Text('Back'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pop(ctx);
                      _checkoutBill(partId, grandTotal);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF3B82F6),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    child: const Text('Settle Bill', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                  ),
                ),
              ]),
            ],
          ),
        ),
      ),
    );
  }

  // ─── Category Layout Settings ─────────────────────────────────────────────
  void _showCategoryLayoutSettings() {
    String tempLayout = _categoryLayout;
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              decoration: BoxDecoration(border: Border(bottom: BorderSide(color: Colors.grey[100]!))),
              child: Row(
                children: [
                  IconButton(icon: const Icon(Icons.arrow_back, size: 22), onPressed: () => Navigator.pop(ctx), padding: EdgeInsets.zero, constraints: const BoxConstraints(minWidth: 32, minHeight: 32)),
                  const SizedBox(width: 8),
                  Text('Interface Settings', style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              child: Column(
                children: [
                  for (final opt in [{'id': 'horizontal', 'label': 'Horizontal Bar'}, {'id': 'vertical', 'label': 'Vertical Sidebar'}])
                    InkWell(
                      onTap: () => setModalState(() => tempLayout = opt['id']!),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(opt['label']!,
                                style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.bold,
                                    color: tempLayout == opt['id'] ? Colors.black87 : Colors.grey[400])),
                            Container(
                              width: 20, height: 20,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(color: tempLayout == opt['id'] ? Colors.black87 : Colors.grey[300]!, width: 2),
                                color: tempLayout == opt['id'] ? Colors.black87 : Colors.transparent,
                              ),
                              child: tempLayout == opt['id'] ? const Center(child: Icon(Icons.circle, size: 6, color: Colors.white)) : null,
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),
            Container(
              padding: EdgeInsets.only(left: 16, right: 16, top: 12, bottom: MediaQuery.of(ctx).padding.bottom + 16),
              decoration: BoxDecoration(border: Border(top: BorderSide(color: Colors.grey[100]!))),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(ctx),
                      style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14), side: BorderSide(color: Colors.grey[300]!), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                      child: Text('Discard', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: Colors.grey[700])),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () { setState(() => _categoryLayout = tempLayout); Navigator.pop(ctx); },
                      style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF3B82F6), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)), elevation: 0),
                      child: Text('Save Changes', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
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

  // ─── Variations Modal ─────────────────────────────────────────────────────
  void _showVariationsModal(MenuItem item, String partId) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Select Options for ${item.name}',
                  style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              Flexible(
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: item.variations.length,
                  itemBuilder: (_, idx) {
                    final v = item.variations[idx];
                    final varQty = _getItemQtyInPart(partId, '${item.id}_${v.name}');
                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(v.name, style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
                      subtitle: Text('₹${v.price.round()}', style: GoogleFonts.outfit(color: Colors.blue)),
                      trailing: varQty > 0
                          ? Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                IconButton(icon: const Icon(Icons.remove_circle_outline, color: Colors.blue), onPressed: () { _updateDraftQty(partId, item, v.name, v.price, -1); setModalState(() {}); }),
                                Text('$varQty', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
                                IconButton(icon: const Icon(Icons.add_circle_outline, color: Colors.blue), onPressed: () { _updateDraftQty(partId, item, v.name, v.price, 1); setModalState(() {}); }),
                              ],
                            )
                          : ElevatedButton(
                              onPressed: () { _updateDraftQty(partId, item, v.name, v.price, 1); setModalState(() {}); },
                              style: ElevatedButton.styleFrom(elevation: 0, backgroundColor: Colors.blue[50]),
                              child: Text('Add', style: GoogleFonts.outfit(color: Colors.blue, fontWeight: FontWeight.bold)),
                            ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => Navigator.pop(ctx),
                style: ElevatedButton.styleFrom(minimumSize: const Size(double.infinity, 44), backgroundColor: Colors.blue),
                child: Text('Done', style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ─── Transfer View ────────────────────────────────────────────────────────
  Widget _buildTransferView(OrderProvider orderProvider) {
    final activePartId = _parts[_activePartIdx]['id'];
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.black87, size: 20),
          onPressed: () => setState(() => _showTransferView = false),
        ),
        title: Text('Transfer Order',
            style: GoogleFonts.outfit(color: Colors.black87, fontWeight: FontWeight.bold, fontSize: 17)),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Center(
              child: Text(
                widget.tableId != null ? widget.tableId! : 'Parcel',
                style: GoogleFonts.outfit(color: const Color(0xFF3B82F6), fontWeight: FontWeight.bold, fontSize: 18),
              ),
            ),
          ),
        ],
      ),
      body: orderProvider.tables.isEmpty
          ? Center(child: Text('No tables available', style: GoogleFonts.outfit(color: Colors.grey[600], fontWeight: FontWeight.bold)))
          : ListView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
              children: orderProvider.tableAreas.map((area) {
                final areaTables = orderProvider.tables.where((t) => (t['area'] ?? 'Main Floor') == area).toList();
                if (areaTables.isEmpty) return const SizedBox.shrink();
                areaTables.sort((a, b) {
                  final numA = int.tryParse(RegExp(r'\d+').firstMatch(a['tableId'].toString())?.group(0) ?? '') ?? 0;
                  final numB = int.tryParse(RegExp(r'\d+').firstMatch(b['tableId'].toString())?.group(0) ?? '') ?? 0;
                  return numA.compareTo(numB);
                });
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: Row(children: [
                        Text(area.toUpperCase(), style: GoogleFonts.outfit(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey[900], letterSpacing: 2)),
                        const SizedBox(width: 10),
                        const Expanded(child: Divider()),
                      ]),
                    ),
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 4, mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 1.0),
                      itemCount: areaTables.length,
                      itemBuilder: (_, idx) {
                        final t = areaTables[idx];
                        final tId = t['tableId'].toString();
                        final isSelf = tId == widget.tableId;
                        final isSelected = _selectedTransferTable == tId;
                        final tInfo = orderProvider.getTableInfo(tId);
                        final isOccupied = tInfo['status'] == 'Occupied';

                        Color bgColor = Colors.white;
                        Color borderColor = Colors.grey[200]!;
                        Color textColor = Colors.black87;
                        String statusLabel = 'Empty';

                        if (isSelf) {
                          bgColor = Colors.grey[50]!;
                          borderColor = Colors.grey[100]!;
                          textColor = Colors.grey[400]!;
                          statusLabel = 'Current';
                        } else if (isSelected) {
                          bgColor = const Color(0xFF3B82F6);
                          borderColor = const Color(0xFF3B82F6);
                          textColor = Colors.white;
                          statusLabel = 'Selected';
                        } else if (isOccupied) {
                          bgColor = const Color(0xFFEFF6FF);
                          borderColor = const Color(0xFFBFDBFE);
                          textColor = Colors.black87;
                          statusLabel = 'Occupied';
                        }

                        return GestureDetector(
                          onTap: isSelf ? null : () => setState(() => _selectedTransferTable = tId),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            decoration: BoxDecoration(
                              color: bgColor,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: borderColor, width: 2),
                              boxShadow: isSelected
                                  ? [BoxShadow(color: const Color(0xFF3B82F6).withAlpha(60), blurRadius: 10, offset: const Offset(0, 4))]
                                  : null,
                            ),
                            child: Stack(
                              children: [
                                Center(
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Text(tId,
                                          style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold, color: textColor)),
                                      Text(statusLabel.toUpperCase(),
                                          style: GoogleFonts.outfit(
                                              fontSize: 8,
                                              fontWeight: FontWeight.bold,
                                              color: isSelected ? Colors.white70 : (isOccupied ? const Color(0xFF3B82F6) : Colors.grey[500]),
                                              letterSpacing: 0.5)),
                                    ],
                                  ),
                                ),
                                if (isSelected)
                                  Positioned(
                                    top: 4, right: 4,
                                    child: Container(
                                      width: 20, height: 20,
                                      decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white, border: Border.all(color: const Color(0xFF3B82F6), width: 2)),
                                      child: const Icon(Icons.check, size: 12, color: Color(0xFF3B82F6)),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                    const SizedBox(height: 20),
                  ],
                );
              }).toList(),
            ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(children: [
            Expanded(
              child: OutlinedButton(
                onPressed: () => setState(() => _showTransferView = false),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  side: BorderSide(color: Colors.grey[300]!),
                ),
                child: Text('Go Back', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: Colors.grey[700])),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: ElevatedButton(
                onPressed: _selectedTransferTable.isEmpty || _isTransferring
                    ? null
                    : () => _executeTransfer(activePartId),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF3B82F6),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                ),
                child: _isTransferring
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : Text('Confirm Move', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
              ),
            ),
          ]),
        ),
      ),
    );
  }

  void _executeTransfer(String partId) async {
    final part = _parts.firstWhere((p) => p['id'] == partId);
    final oid = part['orderId'] as String?;
    if (oid == null || oid.isEmpty) return;
    if (_selectedTransferTable.isEmpty) return;
    setState(() => _isTransferring = true);
    try {
      await ApiService.transferOrder(oid, _selectedTransferTable);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Transferred to $_selectedTransferTable ✓'), backgroundColor: Colors.green),
      );
      widget.onClose();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceAll('Exception: ', ''))),
      );
    } finally {
      if (mounted) setState(() { _isTransferring = false; _showTransferView = false; });
    }
  }
}
