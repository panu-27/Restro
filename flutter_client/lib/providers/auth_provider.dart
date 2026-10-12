import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/models.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  User? _user;
  String? _token;
  bool _initialized = false;
  bool _loading = false;
  Subscription? _subscription;

  User? get user => _user;
  String? get token => _token;
  bool get isAuthenticated => _token != null;
  bool get isInitialized => _initialized;
  bool get isLoading => _loading;
  Subscription? get subscription => _subscription;

  Future<void> tryAutoLogin() async {
    final prefs = await SharedPreferences.getInstance();
    final cachedToken = prefs.getString('token');
    if (cachedToken != null) {
      _token = cachedToken;
      ApiService.token = cachedToken;
      try {
        _user = await ApiService.getProfile();
        await fetchSubscription();
      } catch (e) {
        // Token might have expired
        await logout();
      }
    }
    _initialized = true;
    notifyListeners();
  }

  Future<void> login({String? mobileNumber, String? password, String? pin}) async {
    _loading = true;
    notifyListeners();
    try {
      final res = await ApiService.login(mobileNumber, password, pin);
      _token = res['token'];
      ApiService.token = _token;
      _user = User.fromJson(res['user']);
      
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('token', _token!);

      await fetchSubscription();
    } catch (e) {
      _loading = false;
      notifyListeners();
      rethrow;
    }
    _loading = false;
    notifyListeners();
  }

  Future<void> register(String name, String mobileNumber, String password) async {
    _loading = true;
    notifyListeners();
    try {
      final res = await ApiService.register(name, mobileNumber, password);
      _token = res['token'];
      ApiService.token = _token;
      _user = User.fromJson(res['user']);
      
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('token', _token!);

      await fetchSubscription();
    } catch (e) {
      _loading = false;
      notifyListeners();
      rethrow;
    }
    _loading = false;
    notifyListeners();
  }

  Future<void> fetchSubscription() async {
    try {
      _subscription = await ApiService.getSubscriptionStatus();
    } catch (e) {
      _subscription = null;
    }
    notifyListeners();
  }

  Future<void> updateProfile() async {
    if (_token == null) return;
    try {
      _user = await ApiService.getProfile();
      notifyListeners();
    } catch (e) {
      print('Failed updating profile: $e');
    }
  }

  Future<void> changePassword(String currentPassword, String newPassword) async {
    await ApiService.changePassword(currentPassword, newPassword);
  }

  Future<void> logout() async {
    _token = null;
    _user = null;
    _subscription = null;
    ApiService.token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    notifyListeners();
  }
}

