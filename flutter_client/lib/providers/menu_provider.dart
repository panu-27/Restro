import 'package:flutter/material.dart';
import '../models/models.dart';
import '../services/api_service.dart';

class MenuProvider extends ChangeNotifier {
  List<MenuItem> _items = [];
  bool _loading = false;
  String _searchQuery = '';
  String _selectedCategory = 'All';

  List<MenuItem> get items => _items;
  bool get isLoading => _loading;
  String get searchQuery => _searchQuery;
  String get selectedCategory => _selectedCategory;

  List<String> get categories {
    final cats = _items.map((i) => i.category).where((c) => c.isNotEmpty).toSet().toList();
    cats.sort();
    return ['All', ...cats];
  }

  List<MenuItem> get filteredItems {
    return _items.where((item) {
      if (!item.isAvailable) return false;
      final matchesSearch = item.name.toLowerCase().contains(_searchQuery.toLowerCase());
      final matchesCategory = _selectedCategory == 'All' || item.category == _selectedCategory;
      return matchesSearch && matchesCategory;
    }).toList();
  }

  void setSearchQuery(String query) {
    _searchQuery = query;
    notifyListeners();
  }

  void setSelectedCategory(String category) {
    _selectedCategory = category;
    notifyListeners();
  }

  Future<void> fetchMenu() async {
    _loading = true;
    notifyListeners();
    try {
      _items = await ApiService.getMenu();
    } catch (e) {
      print('Error fetching menu: $e');
    } finally {
      _loading = false;
      notifyListeners();
    }
  }
}

