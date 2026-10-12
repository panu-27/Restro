import 'dart:convert';

class Tax {
  final String name;
  final double percentage;
  final bool enabled;

  Tax({required this.name, required this.percentage, required this.enabled});

  factory Tax.fromJson(Map<String, dynamic> json) {
    return Tax(
      name: json['name'] ?? '',
      percentage: (json['percentage'] ?? 0.0).toDouble(),
      enabled: json['enabled'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'percentage': percentage,
      'enabled': enabled,
    };
  }
}

class User {
  final String id;
  final String name;
  final String email;
  final String role;
  final String restaurantName;
  final String restaurantLogo;
  final int tableCount;
  final bool taxEnabled;
  final List<Tax> taxes;

  User({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.restaurantName,
    required this.restaurantLogo,
    required this.tableCount,
    required this.taxEnabled,
    required this.taxes,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    var taxList = json['taxes'] as List? ?? [];
    return User(
      id: json['_id'] ?? '',
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      role: json['role'] ?? 'Admin',
      restaurantName: json['restaurantName'] ?? '',
      restaurantLogo: json['restaurantLogo'] ?? '',
      tableCount: json['tableCount'] ?? 10,
      taxEnabled: json['taxEnabled'] ?? false,
      taxes: taxList.map((t) => Tax.fromJson(t)).toList(),
    );
  }
}

class MenuItemVariation {
  final String name;
  final double price;

  MenuItemVariation({required this.name, required this.price});

  factory MenuItemVariation.fromJson(Map<String, dynamic> json) {
    return MenuItemVariation(
      name: json['name'] ?? '',
      price: (json['price'] ?? 0.0).toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'price': price,
    };
  }
}

class MenuItem {
  final String id;
  final String name;
  final String category;
  final double price;
  final List<MenuItemVariation> variations;
  final String image;
  final bool isAvailable;

  MenuItem({
    required this.id,
    required this.name,
    required this.category,
    required this.price,
    required this.variations,
    required this.image,
    required this.isAvailable,
  });

  factory MenuItem.fromJson(Map<String, dynamic> json) {
    var varList = json['variations'] as List? ?? [];
    return MenuItem(
      id: json['_id'] ?? '',
      name: json['name'] ?? '',
      category: json['category'] ?? '',
      price: (json['price'] ?? 0.0).toDouble(),
      variations: varList.map((v) => MenuItemVariation.fromJson(v)).toList(),
      image: json['image'] ?? '',
      isAvailable: json['isAvailable'] ?? true,
    );
  }
}

class OrderItem {
  final String id;
  final String menuId;
  final String name;
  final double price;
  int qty;
  bool isServed;
  final String note;

  OrderItem({
    required this.id,
    required this.menuId,
    required this.name,
    required this.price,
    required this.qty,
    required this.isServed,
    this.note = '',
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      id: json['_id'] ?? '',
      menuId: json['menuId'] ?? json['menuId'] ?? '',
      name: json['name'] ?? '',
      price: (json['price'] ?? 0.0).toDouble(),
      qty: json['quantity'] ?? json['qty'] ?? 1,
      isServed: json['isServed'] ?? false,
      note: json['note'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'menuId': menuId,
      'name': name,
      'price': price,
      'quantity': qty,
      'isServed': isServed,
      'note': note,
    };
  }
}

class Order {
  final String id;
  final int orderNumber;
  final String tableId;
  final String orderType;
  final String customerName;
  final String customerPhone;
  final List<OrderItem> items;
  final String status;
  final double totalAmount;
  final String createdAt;
  final String paymentType;
  final String guestNote;
  final String partLabel;

  Order({
    required this.id,
    required this.orderNumber,
    required this.tableId,
    required this.orderType,
    required this.customerName,
    required this.customerPhone,
    required this.items,
    required this.status,
    required this.totalAmount,
    required this.createdAt,
    required this.paymentType,
    required this.guestNote,
    this.partLabel = '',
  });

  factory Order.fromJson(Map<String, dynamic> json) {
    var itemsList = json['items'] as List? ?? [];
    return Order(
      id: json['_id'] ?? '',
      orderNumber: json['orderNumber'] ?? 0,
      tableId: json['tableId'] ?? '',
      orderType: json['orderType'] ?? 'Dine-in',
      customerName: json['customerName'] ?? '',
      customerPhone: json['customerPhone'] ?? '',
      items: itemsList.map((i) => OrderItem.fromJson(i)).toList(),
      status: json['status'] ?? 'Pending',
      totalAmount: (json['totalAmount'] ?? 0.0).toDouble(),
      createdAt: json['createdAt'] ?? '',
      paymentType: json['paymentType'] ?? 'Paid',
      guestNote: json['guestNote'] ?? '',
      partLabel: json['partLabel'] ?? '',
    );
  }
}

class Subscription {
  final bool hasSubscription;
  final bool isValid;
  final String plan;
  final int trialDaysRemaining;

  Subscription({
    required this.hasSubscription,
    required this.isValid,
    required this.plan,
    required this.trialDaysRemaining,
  });

  factory Subscription.fromJson(Map<String, dynamic> json) {
    return Subscription(
      hasSubscription: json['hasSubscription'] ?? false,
      isValid: json['isValid'] ?? false,
      plan: json['plan'] ?? 'trial',
      trialDaysRemaining: json['trialDaysRemaining'] ?? 0,
    );
  }
}

