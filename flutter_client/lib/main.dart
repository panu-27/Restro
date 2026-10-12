import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import 'providers/auth_provider.dart';
import 'providers/menu_provider.dart';
import 'providers/order_provider.dart';
import 'providers/draft_provider.dart';

import 'screens/app_layout.dart';
import 'screens/login_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Create state providers
  final authProvider = AuthProvider();
  final menuProvider = MenuProvider();
  final orderProvider = OrderProvider();
  final draftProvider = DraftProvider();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthProvider>.value(value: authProvider),
        ChangeNotifierProvider<MenuProvider>.value(value: menuProvider),
        ChangeNotifierProvider<OrderProvider>.value(value: orderProvider),
        ChangeNotifierProvider<DraftProvider>.value(value: draftProvider),
      ],
      child: const MyApp(),
    ),
  );

  // Auto-login session recovery on startup
  await authProvider.tryAutoLogin();
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // Listen to changes in AuthProvider to redirect immediately
    final auth = Provider.of<AuthProvider>(context);
    
    // Sync token with OrderProvider
    Provider.of<OrderProvider>(context, listen: false).updateToken(auth.token);

    return MaterialApp(
      title: 'Annapurna Restro POS',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        primaryColor: const Color(0xFF3B82F6),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF3B82F6),
          primary: const Color(0xFF3B82F6),
          secondary: const Color(0xFFFF5A36),
        ),
        textTheme: GoogleFonts.outfitTextTheme(
          Theme.of(context).textTheme,
        ),
      ),
      home: _getHomeScreen(auth),
    );
  }

  Widget _getHomeScreen(AuthProvider auth) {
    if (!auth.isInitialized) {
      return const Scaffold(
        backgroundColor: Colors.white,
        body: Center(
          child: SizedBox(
            width: 32,
            height: 32,
            child: CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF3B82F6)),
              strokeWidth: 3,
            ),
          ),
        ),
      );
    }
    
    if (auth.isAuthenticated) {
      return const AppLayout();
    }
    
    return const LoginScreen();
  }
}

