import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class DraftProvider extends ChangeNotifier {
  final Map<String, List<dynamic>> _cachedDrafts = {};

  bool hasDraft(String tableId) {
    final list = _cachedDrafts[tableId];
    if (list == null || list.isEmpty) return false;
    return list.any((part) {
      final items = part['items'] as List? ?? [];
      return items.isNotEmpty;
    });
  }

  double getDraftTotal(String tableId) {
    final list = _cachedDrafts[tableId];
    if (list == null || list.isEmpty) return 0.0;
    double total = 0.0;
    for (var part in list) {
      final items = part['items'] as List? ?? [];
      for (var item in items) {
        final price = (item['price'] ?? 0.0).toDouble();
        final qty = (item['quantity'] ?? item['qty'] ?? 0).toInt();
        total += price * qty;
      }
    }
    return total;
  }

  List<dynamic> getDraft(String tableId) {
    return _cachedDrafts[tableId] ?? [];
  }

  Future<void> loadAllDrafts(List<String> tableIds) async {
    final prefs = await SharedPreferences.getInstance();
    for (var tableId in tableIds) {
      final jsonStr = prefs.getString('restro_draft_$tableId');
      if (jsonStr != null) {
        try {
          _cachedDrafts[tableId] = jsonDecode(jsonStr);
        } catch (_) {
          _cachedDrafts.remove(tableId);
        }
      } else {
        _cachedDrafts.remove(tableId);
      }
    }
    notifyListeners();
  }

  Future<void> saveDraft(String tableId, List<dynamic> draftParts) async {
    _cachedDrafts[tableId] = draftParts;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('restro_draft_$tableId', jsonEncode(draftParts));
    notifyListeners();
  }

  Future<void> clearDraft(String tableId) async {
    _cachedDrafts.remove(tableId);
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('restro_draft_$tableId');
    notifyListeners();
  }
}

