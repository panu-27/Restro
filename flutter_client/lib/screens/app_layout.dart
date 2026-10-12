import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../providers/order_provider.dart';

import 'dashboard_screen.dart';
import 'table_grid_screen.dart';
import 'kitchen_screen.dart';
import 'order_history_screen.dart';
import 'sales_report_screen.dart';
import 'settings_screen.dart';
import 'parcel_screen.dart';

class AppLayout extends StatefulWidget {
  const AppLayout({Key? key}) : super(key: key);

  @override
  State<AppLayout> createState() => _AppLayoutState();
}

class _AppLayoutState extends State<AppLayout> {
  String _activeTab = 'dashboard';

  @override
  void initState() {
    super.initState();
    // Initialize token in OrderProvider for polling
    final auth = Provider.of<AuthProvider>(context, listen: false);
    Provider.of<OrderProvider>(context, listen: false).updateToken(auth.token);
  }

  Widget _buildBody() {
    switch (_activeTab) {
      case 'dashboard':
        return DashboardScreen(onTabChange: _handleTabChange);
      case 'tables':
        return TableGridScreen(onTabChange: _handleTabChange);
      case 'parcel':
        return ParcelScreen(onTabChange: _handleTabChange);
      case 'pos':
        return KitchenScreen(onTabChange: _handleTabChange);
      case 'sales':
        return SalesReportScreen();
      case 'settings':
        return SettingsScreen(
          onClose: () => _handleTabChange('dashboard'),
          onTabChange: _handleTabChange,
        );
      default:
        return DashboardScreen(onTabChange: _handleTabChange);
    }
  }

  void _handleTabChange(String tabId) {
    setState(() {
      _activeTab = tabId;
    });
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final isDesktop = size.width > 800;
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.user;

    // Back button behavior:
    // If we are NOT on the dashboard tab, redirect back to the dashboard tab.
    // If we are already on the dashboard, allow the system to exit the app.
    return PopScope(
      canPop: _activeTab == 'dashboard',
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        setState(() {
          _activeTab = 'dashboard';
        });
      },
      child: Scaffold(
        backgroundColor: Colors.white,
        body: SafeArea(
          bottom: false,
          child: Row(
            children: [
              // Desktop Sidebar Layout
              if (isDesktop) _buildDesktopSidebar(user),
              
              // Main content area
              Expanded(
                child: Column(
                  children: [
                    // Trial Banner Indicator
                    if (auth.subscription?.plan == 'trial' && auth.subscription?.isValid == true)
                      Container(
                        color: Colors.amber[50],
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        child: Row(
                          children: [
                            Icon(Icons.hourglass_empty, size: 14, color: Colors.amber[800]),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                "Trial Mode: Only ${auth.subscription!.trialDaysRemaining} days remaining.",
                                style: GoogleFonts.outfit(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.amber[900],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    
                    Expanded(child: _buildBody()),
                  ],
                ),
              ),
            ],
          ),
        ),
        
        // Mobile Bottom Navigation Layout
        bottomNavigationBar: !isDesktop ? _buildMobileBottomNav() : null,
      ),
    );
  }

  Widget _buildDesktopSidebar(dynamic user) {
    return Container(
      width: 240,
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(right: BorderSide(color: Colors.grey[100]!)),
      ),
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Brand Logo
          Center(
            child: Image.asset(
              'assets/brand-logo.png',
              height: 48,
              fit: BoxFit.contain,
              errorBuilder: (context, error, stackTrace) => Text(
                'ANNAPURNA',
                style: GoogleFonts.outfit(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFFFF5A36),
                  letterSpacing: 1.5,
                ),
              ),
            ),
          ),
          const SizedBox(height: 32),

          Text(
            'MENU',
            style: GoogleFonts.outfit(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: Colors.grey[600],
              letterSpacing: 1.5,
            ),
          ),
          const SizedBox(height: 8),

          // Sidebar Tabs
          _buildSidebarButton('dashboard', Icons.cookie, 'Home'),
          _buildSidebarButton('tables', Icons.grid_on, 'Tables'),
          _buildSidebarButton('parcel', Icons.backpack, 'Parcel'),
          _buildSidebarButton('pos', Icons.shopping_bag, 'Orders'),
          _buildSidebarButton('sales', Icons.bar_chart, 'Reports'),
          const SizedBox(height: 24),

          Text(
            'OTHERS',
            style: GoogleFonts.outfit(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: Colors.grey[600],
              letterSpacing: 1.5,
            ),
          ),
          const SizedBox(height: 8),
          _buildSidebarButton('settings', Icons.settings, 'Settings'),

          const Spacer(),

          // User info Card at bottom
          if (user != null)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey[50],
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    backgroundColor: Colors.blue[50],
                    child: Text(
                      user.name.substring(0, 1).toUpperCase(),
                      style: GoogleFonts.outfit(
                        fontWeight: FontWeight.bold,
                        color: Colors.blue[700],
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          user.name,
                          style: GoogleFonts.outfit(
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          user.role,
                          style: GoogleFonts.outfit(
                            fontSize: 11,
                            color: Colors.grey[700],
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.logout, size: 16, color: Colors.grey),
                    onPressed: () {
                      Provider.of<AuthProvider>(context, listen: false).logout();
                    },
                  )
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildSidebarButton(String tabId, IconData icon, String label) {
    final isActive = _activeTab == tabId;
    return Padding(
      padding: const EdgeInsets.only(bottom: 4.0),
      child: InkWell(
        onTap: () => _handleTabChange(tabId),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: isActive ? const Color(0xFF3B82F6) : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              Icon(
                icon,
                color: isActive ? Colors.white : Colors.grey[600],
                size: 18,
              ),
              const SizedBox(width: 12),
              Text(
                label,
                style: GoogleFonts.outfit(
                  color: isActive ? Colors.white : Colors.grey[700],
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMobileBottomNav() {
    return Container(
      height: 74,
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Color(0xFFE5E5E5), width: 0.5)),
      ),
      child: Row(
        children: [
          // Left: Home, Tables
          Expanded(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildMobileNavItem('dashboard', Icons.cookie, 'Home'),
                _buildMobileNavItem('tables', Icons.deck, 'Tables'),
              ],
            ),
          ),

          // Center FAB: Parcel
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 8),
            child: InkWell(
              onTap: () => _handleTabChange('parcel'),
              borderRadius: BorderRadius.circular(26),
              child: Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: const Color(0xFF2563EB),
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF2563EB).withOpacity(0.4),
                      blurRadius: 16,
                      offset: const Offset(0, 4),
                    )
                  ],
                ),
                child: const Icon(Icons.add, size: 28, color: Colors.white),
              ),
            ),
          ),

          // Right: Orders, Reports
          Expanded(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildMobileNavItem('pos', Icons.shopping_bag, 'Orders'),
                _buildMobileNavItem('sales', Icons.bar_chart, 'Reports'),
              ],
            ),
          ),

          // More (Settings) with restored gradient
          InkWell(
            onTap: () => _handleTabChange('settings'),
            child: Container(
              height: 64,
              width: 62,
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF8B5CF6), Color(0xFF6366F1), Color(0xFF4F46E5)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(14),
                  bottomLeft: Radius.circular(14),
                ),
              ),
              child: const Icon(Icons.menu, color: Colors.white, size: 22),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMobileNavItem(String tabId, IconData icon, String label) {
    final isActive = _activeTab == tabId;
    final color = isActive ? const Color(0xFF3B82F6) : Colors.black45;

    return InkWell(
      onTap: () => _handleTabChange(tabId),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            icon,
            size: 20,
            color: color,
          ),
          const SizedBox(height: 3),
          Text(
            label,
            style: GoogleFonts.outfit(
              color: color,
              fontSize: 11,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}

