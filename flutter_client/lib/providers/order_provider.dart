import 'dart:async';
import 'package:flutter/material.dart';
import '../models/models.dart';
import '../services/api_service.dart';

class OrderProvider extends ChangeNotifier {
  List<Order> _activeOrders = [];
  List<Map<String, dynamic>> _tables = [];
  List<String> _tableAreas = ['Main Floor'];
  bool _loading = false;
  Timer? _pollingTimer;
  String? _token;

  List<Order> get activeOrders => _activeOrders;
  List<Map<String, dynamic>> get tables => _tables;
  List<String> get tableAreas => _tableAreas;
  bool get isLoading => _loading;

  void updateToken(String? token) {
    _token = token;
    if (_token != null) {
      startPolling();
    } else {
      stopPolling();
    }
  }

  void startPolling() {
    _pollingTimer?.cancel();
    fetchData(showLoading: _activeOrders.isEmpty);
    _pollingTimer = Timer.periodic(const Duration(seconds: 5), (_) => fetchData(showLoading: false));
  }

  void stopPolling() {
    _pollingTimer?.cancel();
    _pollingTimer = null;
  }

  Future<void> fetchData({bool showLoading = false}) async {
    if (_token == null) return;
    if (showLoading) {
      _loading = true;
      notifyListeners();
    }
    try {
      final List<Future> futures = [
        ApiService.getActiveOrders(),
        ApiService.getTables(),
        ApiService.getTableAreas(),
      ];
      final results = await Future.wait(futures);
      _activeOrders = results[0] as List<Order>;
      _tables = results[1] as List<Map<String, dynamic>>;
      _tableAreas = results[2] as List<String>;
    } catch (e) {
      print('Polling error: $e');
    } finally {
      if (showLoading) {
        _loading = false;
      }
      notifyListeners();
    }
  }

  // Table grid state derivation helpers
  Map<String, dynamic> getTableInfo(String tableId) {
    final dineInOrders = _activeOrders.where(
      (o) => o.tableId == tableId && o.orderType == 'Dine-in' && o.status != 'Paid' && o.status != 'Cancelled'
    ).toList();

    if (dineInOrders.isEmpty) {
      return {'status': 'Available', 'billTotal': 0.0, 'partsCount': 0};
    }
    return {
      'status': 'Occupied',
      'billTotal': dineInOrders.fold<double>(0.0, (sum, o) => sum + o.totalAmount),
      'partsCount': dineInOrders.length
    };
  }

  // Table configuration modifications
  Future<void> addTable(String tableId, int seats, String area) async {
    await ApiService.createTable(tableId, seats, area);
    await fetchData();
  }

  Future<void> updateTableSeats(String tableId, int seats) async {
    await ApiService.updateSeats(tableId, seats);
    await fetchData();
  }

  Future<void> removeTable(String tableId) async {
    await ApiService.removeTable(tableId);
    await fetchData();
  }

  Future<void> addArea(String name) async {
    await ApiService.createArea(name);
    await fetchData();
  }

  Future<void> removeArea(String areaName) async {
    await ApiService.removeArea(areaName);
    await fetchData();
  }

  // Active Order Actions
  Future<void> toggleServeItem(String orderId, String itemId, bool currentServed) async {
    await ApiService.toggleServeItem(orderId, itemId, currentServed);
    await fetchData();
  }

  Future<void> cancelOrder(String orderId) async {
    await ApiService.updateOrderStatus(orderId, 'Cancelled');
    await fetchData();
  }

  Future<void> transferOrder(String orderId, String targetTableId) async {
    await ApiService.transferOrder(orderId, targetTableId);
    await fetchData();
  }

  @override
  void dispose() {
    stopPolling();
    super.dispose();
  }
}

