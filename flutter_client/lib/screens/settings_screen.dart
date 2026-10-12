import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/order_provider.dart';

class SettingsScreen extends StatefulWidget {
  final VoidCallback onClose;
  final Function(String) onTabChange;

  const SettingsScreen({
    Key? key,
    required this.onClose,
    required this.onTabChange,
  }) : super(key: key);

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  String _activeSection = 'home'; // 'home', 'tables', 'password'

  // Change Password fields
  final _currentPwController = TextEditingController();
  final _newPwController = TextEditingController();
  final _confirmPwController = TextEditingController();
  
  bool _isLoadingPw = false;
  String? _pwError;
  bool _pwSuccess = false;

  @override
  void dispose() {
    _currentPwController.dispose();
    _newPwController.dispose();
    _confirmPwController.dispose();
    super.dispose();
  }

  void _handleChangePassword() async {
    final cur = _currentPwController.text;
    final n = _newPwController.text;
    final conf = _confirmPwController.text;

    if (cur.isEmpty || n.isEmpty || conf.isEmpty) {
      setState(() => _pwError = 'Please fill all fields');
      return;
    }
    if (n != conf) {
      setState(() => _pwError = 'Passwords do not match');
      return;
    }
    if (n.length < 6) {
      setState(() => _pwError = 'Password must be at least 6 characters');
      return;
    }

    setState(() {
      _isLoadingPw = true;
      _pwError = null;
      _pwSuccess = false;
    });

    try {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      await auth.changePassword(cur, n);
      setState(() {
        _pwSuccess = true;
        _currentPwController.clear();
        _newPwController.clear();
        _confirmPwController.clear();
      });
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) {
          setState(() {
            _activeSection = 'home';
            _pwSuccess = false;
          });
        }
      });
    } catch (e) {
      setState(() {
        _pwError = e.toString().replaceAll('Exception: ', '');
      });
    } finally {
      setState(() {
        _isLoadingPw = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.user;
    final sub = auth.subscription;

    if (_activeSection == 'tables') {
      return _buildTablesConfig();
    }
    if (_activeSection == 'password') {
      return _buildPasswordConfig();
    }

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black87),
          onPressed: widget.onClose,
        ),
        title: Text(
          'Settings Panel',
          style: GoogleFonts.outfit(
            color: Colors.black87,
            fontWeight: FontWeight.bold,
            fontSize: 17,
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // Account Summary info
          if (user != null)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.grey[50],
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.grey[200]!),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 26,
                    backgroundColor: Colors.blue[50],
                    child: Text(
                      user.name.substring(0, 1).toUpperCase(),
                      style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.blue[700]),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          user.name,
                          style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${user.role} · ${user.email}',
                          style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 24),

          // Subscription Box
          if (sub != null) ...[
            Text(
              'SUBSCRIPTION STATUS',
              style: GoogleFonts.outfit(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: Colors.grey[600],
                letterSpacing: 1.5,
              ),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: sub.isValid ? Colors.green[50] : Colors.red[50],
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: sub.isValid ? Colors.green[100]! : Colors.red[100]!),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Plan: ${sub.plan.toUpperCase()}',
                        style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: sub.isValid ? Colors.green[900] : Colors.red[900]),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: sub.isValid ? Colors.green[600] : Colors.red[600],
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          sub.isValid ? 'ACTIVE' : 'EXPIRED',
                          style: GoogleFonts.outfit(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (sub.plan == 'trial')
                    Text(
                      'Trial active for ${sub.trialDaysRemaining} more days.',
                      style: GoogleFonts.outfit(fontSize: 12, color: sub.isValid ? Colors.green[850] : Colors.red[850]),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 24),
          ],

          Text(
            'GENERAL SETTINGS',
            style: GoogleFonts.outfit(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: Colors.grey[600],
              letterSpacing: 1.5,
            ),
          ),
          const SizedBox(height: 12),

          // Menu list links
          _buildSettingsTile(
            'Configure Tables Layout',
            Icons.table_restaurant,
            () => setState(() => _activeSection = 'tables'),
          ),
          _buildSettingsTile(
            'Change Account Password',
            Icons.lock_outline,
            () => setState(() => _activeSection = 'password'),
          ),

          const SizedBox(height: 32),

          // Logout
          ElevatedButton.icon(
            onPressed: () => auth.logout(),
            icon: const Icon(Icons.logout, color: Colors.white, size: 16),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red[600],
              minimumSize: const Size(double.infinity, 48),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            label: Text('Log out', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: Colors.white)),
          ),
        ],
      ),
    );
  }

  Widget _buildSettingsTile(String title, IconData icon, VoidCallback tap) {
    return Card(
      color: Colors.white,
      surfaceTintColor: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.grey[200]!),
      ),
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        onTap: tap,
        leading: Icon(icon, color: const Color(0xFF3B82F6)),
        title: Text(title, style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.bold)),
        trailing: const Icon(Icons.chevron_right, size: 16, color: Colors.grey),
      ),
    );
  }

  Widget _buildTablesConfig() {
    final orderProvider = Provider.of<OrderProvider>(context);
    final tables = orderProvider.tables;

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black87),
          onPressed: () => setState(() => _activeSection = 'home'),
        ),
        title: Text(
          'Manage Tables Layout',
          style: GoogleFonts.outfit(color: Colors.black87, fontWeight: FontWeight.bold, fontSize: 17),
        ),
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: tables.length,
        itemBuilder: (context, idx) {
          final t = tables[idx];
          final tableId = t['tableId'].toString();
          final seats = t['seats'] ?? 4;
          final area = t['area'] ?? 'Main Floor';

          return Card(
            color: Colors.white,
            surfaceTintColor: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: BorderSide(color: Colors.grey[200]!),
            ),
            margin: const EdgeInsets.only(bottom: 12),
            child: ListTile(
              title: Text('Table $tableId', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
              subtitle: Text('$seats seats · $area', style: GoogleFonts.outfit(fontSize: 11, color: Colors.grey)),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    icon: const Icon(Icons.edit, color: Colors.blue, size: 18),
                    onPressed: () => _editTableSeatsPrompt(orderProvider, tableId, seats),
                  ),
                  IconButton(
                    icon: const Icon(Icons.delete_outline, color: Colors.red, size: 18),
                    onPressed: () async {
                      final confirm = await showDialog<bool>(
                        context: context,
                        builder: (context) => AlertDialog(
                          title: const Text('Delete Table?'),
                          content: Text('Are you sure you want to delete table $tableId?'),
                          actions: [
                            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('No')),
                            TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Yes')),
                          ],
                        ),
                      );
                      if (confirm == true) {
                        await orderProvider.removeTable(tableId);
                      }
                    },
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  void _editTableSeatsPrompt(OrderProvider provider, String tableId, int currentSeats) {
    final controller = TextEditingController(text: currentSeats.toString());
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Edit Table Seats ($tableId)'),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Seat Capacity'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          TextButton(
            onPressed: () async {
              final newSeats = int.tryParse(controller.text) ?? currentSeats;
              await provider.updateTableSeats(tableId, newSeats);
              Navigator.pop(context);
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  Widget _buildPasswordConfig() {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black87),
          onPressed: () => setState(() => _activeSection = 'home'),
        ),
        title: Text(
          'Change Password',
          style: GoogleFonts.outfit(color: Colors.black87, fontWeight: FontWeight.bold, fontSize: 17),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_pwSuccess) ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: Colors.green[50], borderRadius: BorderRadius.circular(12)),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle_outline, color: Colors.green),
                    const SizedBox(width: 12),
                    Text('Password changed successfully!', style: GoogleFonts.outfit(color: Colors.green[800], fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
              const SizedBox(height: 20),
            ],
            
            if (_pwError != null) ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: Colors.red[50], borderRadius: BorderRadius.circular(12)),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: Colors.red),
                    const SizedBox(width: 12),
                    Expanded(child: Text(_pwError!, style: GoogleFonts.outfit(color: Colors.red[800]))),
                  ],
                ),
              ),
              const SizedBox(height: 20),
            ],

            TextField(
              controller: _currentPwController,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Current Password', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _newPwController,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'New Password', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _confirmPwController,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Confirm New Password', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _isLoadingPw ? null : _handleChangePassword,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF111111),
                minimumSize: const Size(double.infinity, 48),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _isLoadingPw
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : Text('Update Password', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }
}

