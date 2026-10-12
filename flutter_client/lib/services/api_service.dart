import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/models.dart';

class ApiService {
  static String baseUrl = 'http://localhost:5000';
  static String? token;

  static Map<String, String> get _headers {
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token != null) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  // Auth Endpoints
  static Future<Map<String, dynamic>> login(String? mobileNumber, String? password, String? pin) async {
    final body = {};
    if (pin != null && pin.isNotEmpty) {
      body['pin'] = pin;
    } else {
      body['mobileNumber'] = mobileNumber;
      body['password'] = password;
    }

    final res = await http.post(
      Uri.parse('$baseUrl/api/auth/login'),
      headers: _headers,
      body: jsonEncode(body),
    );

    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    } else {
      final err = jsonDecode(res.body);
      throw Exception(err['error'] ?? 'Login failed');
    }
  }

  static Future<Map<String, dynamic>> register(String name, String mobileNumber, String password) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/auth/register'),
      headers: _headers,
      body: jsonEncode({
        'name': name,
        'mobileNumber': mobileNumber,
        'password': password,
      }),
    );
    if (res.statusCode == 200 || res.statusCode == 201) {
      return jsonDecode(res.body);
    } else {
      final err = jsonDecode(res.body);
      throw Exception(err['error'] ?? 'Registration failed');
    }
  }

  static Future<User> getProfile() async {
    final res = await http.get(
      Uri.parse('$baseUrl/api/auth/me'),
      headers: _headers,
    );
    if (res.statusCode == 200) {
      return User.fromJson(jsonDecode(res.body));
    } else {
      throw Exception('Failed to load profile');
    }
  }

  static Future<void> changePassword(String currentPassword, String newPassword) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/auth/change-password'),
      headers: _headers,
      body: jsonEncode({
        'currentPassword': currentPassword,
        'newPassword': newPassword,
      }),
    );
    if (res.statusCode != 200) {
      final err = jsonDecode(res.body);
      throw Exception(err['error'] ?? 'Failed to change password');
    }
  }

  // Menu Endpoints
  static Future<List<MenuItem>> getMenu() async {
    final res = await http.get(
      Uri.parse('$baseUrl/api/menu'),
      headers: _headers,
    );
    if (res.statusCode == 200) {
      final List list = jsonDecode(res.body);
      return list.map((i) => MenuItem.fromJson(i)).toList();
    } else {
      throw Exception('Failed to fetch menu');
    }
  }

  // Table Endpoints
  static Future<List<Map<String, dynamic>>> getTables() async {
    final res = await http.get(
      Uri.parse('$baseUrl/api/tables'),
      headers: _headers,
    );
    if (res.statusCode == 200) {
      final List list = jsonDecode(res.body);
      return List<Map<String, dynamic>>.from(list);
    } else {
      throw Exception('Failed to fetch tables');
    }
  }

  static Future<List<String>> getTableAreas() async {
    final res = await http.get(
      Uri.parse('$baseUrl/api/table-areas'),
      headers: _headers,
    );
    if (res.statusCode == 200) {
      final List list = jsonDecode(res.body);
      return list.cast<String>();
    } else {
      return ['Main Floor'];
    }
  }

  static Future<Map<String, dynamic>> createTable(String tableId, int seats, String area) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/tables'),
      headers: _headers,
      body: jsonEncode({
        'tableId': tableId,
        'seats': seats,
        'area': area,
      }),
    );
    if (res.statusCode == 200 || res.statusCode == 201) {
      return jsonDecode(res.body);
    } else {
      final err = jsonDecode(res.body);
      throw Exception(err['error'] ?? 'Failed to add table');
    }
  }

  static Future<void> updateSeats(String tableId, int seats) async {
    final res = await http.patch(
      Uri.parse('$baseUrl/api/tables/$tableId'),
      headers: _headers,
      body: jsonEncode({'seats': seats}),
    );
    if (res.statusCode != 200) {
      throw Exception('Failed to update seats');
    }
  }

  static Future<void> removeTable(String tableId) async {
    final res = await http.delete(
      Uri.parse('$baseUrl/api/tables/$tableId'),
      headers: _headers,
    );
    if (res.statusCode != 200) {
      throw Exception('Failed to remove table');
    }
  }

  static Future<void> createArea(String name) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/table-areas'),
      headers: _headers,
      body: jsonEncode({'name': name}),
    );
    if (res.statusCode != 200 && res.statusCode != 201) {
      final err = jsonDecode(res.body);
      throw Exception(err['error'] ?? 'Failed to add section');
    }
  }

  static Future<void> removeArea(String areaName) async {
    final res = await http.delete(
      Uri.parse('$baseUrl/api/table-areas/${Uri.encodeComponent(areaName)}'),
      headers: _headers,
    );
    if (res.statusCode != 200) {
      final err = jsonDecode(res.body);
      throw Exception(err['error'] ?? 'Failed to remove section');
    }
  }

  // Active Orders Endpoints
  static Future<List<Order>> getActiveOrders() async {
    final res = await http.get(
      Uri.parse('$baseUrl/api/orders/active'),
      headers: _headers,
    );
    if (res.statusCode == 200) {
      final List list = jsonDecode(res.body);
      return list.map((o) => Order.fromJson(o)).toList();
    } else {
      throw Exception('Failed to load active orders');
    }
  }

  static Future<Order> createOrder(Map<String, dynamic> orderData) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/orders'),
      headers: _headers,
      body: jsonEncode(orderData),
    );
    if (res.statusCode == 200 || res.statusCode == 201) {
      return Order.fromJson(jsonDecode(res.body));
    } else {
      final err = jsonDecode(res.body);
      throw Exception(err['error'] ?? 'Failed to create order');
    }
  }

  static Future<Order> getOrderById(String orderId) async {
    final res = await http.get(
      Uri.parse('$baseUrl/api/orders/$orderId'),
      headers: _headers,
    );
    if (res.statusCode == 200) {
      return Order.fromJson(jsonDecode(res.body));
    } else {
      throw Exception('Failed to load order');
    }
  }

  static Future<void> deleteOrder(String orderId) async {
    final res = await http.delete(
      Uri.parse('$baseUrl/api/orders/$orderId'),
      headers: _headers,
    );
    if (res.statusCode != 200) {
      throw Exception('Failed to delete order');
    }
  }

  static Future<void> toggleServeItem(String orderId, String itemId, bool currentIsServed) async {
    final res = await http.patch(
      Uri.parse('$baseUrl/api/orders/$orderId/items/$itemId/serve'),
      headers: _headers,
      body: jsonEncode({'isServed': !currentIsServed}),
    );
    if (res.statusCode != 200) {
      throw Exception('Failed to update served state');
    }
  }

  static Future<void> updateOrderStatus(String orderId, String status) async {
    final res = await http.patch(
      Uri.parse('$baseUrl/api/orders/$orderId/status'),
      headers: _headers,
      body: jsonEncode({'status': status}),
    );
    if (res.statusCode != 200) {
      throw Exception('Failed to update order status');
    }
  }

  static Future<void> updateOrderLabel(String orderId, String partLabel) async {
    final res = await http.patch(
      Uri.parse('$baseUrl/api/orders/$orderId/label'),
      headers: _headers,
      body: jsonEncode({'partLabel': partLabel}),
    );
    if (res.statusCode != 200) {
      throw Exception('Failed to update order partition label');
    }
  }

  static Future<void> transferOrder(String orderId, String targetTableId) async {
    final res = await http.patch(
      Uri.parse('$baseUrl/api/orders/$orderId/transfer'),
      headers: _headers,
      body: jsonEncode({
        'newTableId': targetTableId,
      }),
    );
    if (res.statusCode != 200) {
      final err = jsonDecode(res.body);
      throw Exception(err['error'] ?? 'Failed to transfer order');
    }
  }

  static Future<void> addItemsToOrder(String orderId, List<dynamic> items) async {
    final res = await http.patch(
      Uri.parse('$baseUrl/api/orders/$orderId/add-items'),
      headers: _headers,
      body: jsonEncode({'items': items}),
    );
    if (res.statusCode != 200) {
      final err = jsonDecode(res.body);
      throw Exception(err['error'] ?? 'Failed to add items to order');
    }
  }

  static Future<void> updateOrderItems(String orderId, List<dynamic> items) async {
    final res = await http.put(
      Uri.parse('$baseUrl/api/orders/$orderId/items'),
      headers: _headers,
      body: jsonEncode({'items': items}),
    );
    if (res.statusCode != 200) {
      final err = jsonDecode(res.body);
      throw Exception(err['error'] ?? 'Failed to update order items');
    }
  }

  static Future<void> checkoutOrder({

    required String orderId,
    required String paymentType,
    required String paymentMode,
    required String guestNote,
    required double cashAmount,
    required double onlineAmount,
  }) async {
    final res = await http.patch(
      Uri.parse('$baseUrl/api/orders/$orderId/checkout'),
      headers: _headers,
      body: jsonEncode({
        'status': 'Paid',
        'paymentType': paymentType,
        'paymentMode': paymentMode,
        'guestNote': guestNote,
        'cashAmount': cashAmount,
        'onlineAmount': onlineAmount,
      }),
    );
    if (res.statusCode != 200) {
      throw Exception('Checkout failed');
    }
  }

  // Subscription Status
  static Future<Subscription> getSubscriptionStatus() async {
    final res = await http.get(
      Uri.parse('$baseUrl/api/subscription/status'),
      headers: _headers,
    );
    if (res.statusCode == 200) {
      return Subscription.fromJson(jsonDecode(res.body));
    } else {
      throw Exception('Failed to fetch subscription');
    }
  }

  // Sales Analytics
  static Future<Map<String, dynamic>> getSalesAnalytics(String period, {String? from, String? to}) async {
    String url = '$baseUrl/api/analytics/sales?period=$period';
    if (period == 'custom' && from != null && to != null) {
      url += '&from=$from&to=$to';
    }
    final res = await http.get(
      Uri.parse(url),
      headers: _headers,
    );
    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    } else {
      throw Exception('Failed to fetch analytics');
    }
  }

  // History/All Orders
  static Future<List<Order>> getOrderHistory() async {
    // Note: React calls getActiveOrders, but also filters by paid/cancelled in history.
    // The backend index.js has GET /api/orders/active for active, or we fetch from /api/orders if it exists,
    // otherwise we query active orders and sales reporting endpoints or query direct orders.
    // Let's see the server routes. Express index.js has /api/orders routing:
    // Let's fetch orders using GET /api/orders
    final res = await http.get(
      Uri.parse('$baseUrl/api/orders'),
      headers: _headers,
    );
    if (res.statusCode == 200) {
      final List list = jsonDecode(res.body);
      return list.map((o) => Order.fromJson(o)).toList();
    } else {
      // Fallback: active orders list
      return getActiveOrders();
    }
  }
}

