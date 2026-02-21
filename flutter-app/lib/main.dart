import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'services/api_service.dart';
import 'screens/login_screen.dart';
import 'screens/main_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const PlacementProApp());
}

class PlacementProApp extends StatelessWidget {
  const PlacementProApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'PlacementPro AI',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0f172a),
        primaryColor: const Color(0xFF6366f1),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF6366f1),
          secondary: Color(0xFF22d3ee),
          surface: Color(0xFF1e293b),
        ),
        textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: const Color(0xFF1e293b),
          hintStyle: const TextStyle(color: Color(0xFF64748b)),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFF334155)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFF334155)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFF6366f1), width: 2),
          ),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF6366f1),
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        cardTheme: CardThemeData(
          color: const Color(0xFF1e293b),
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: Color(0xFF334155)),
          ),
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF0f172a),
          elevation: 0,
          centerTitle: false,
        ),
        bottomNavigationBarTheme: const BottomNavigationBarThemeData(
          backgroundColor: Color(0xFF0f172a),
          selectedItemColor: Color(0xFF6366f1),
          unselectedItemColor: Color(0xFF64748b),
        ),
      ),
      home: const _AuthGate(),
    );
  }
}

class _AuthGate extends StatefulWidget {
  const _AuthGate();
  @override
  State<_AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<_AuthGate> {
  bool _checking = true;
  bool _loggedIn = false;

  @override
  void initState() {
    super.initState();
    _check();
  }

  Future<void> _check() async {
    final ok = await ApiService.isLoggedIn();
    setState(() { _loggedIn = ok; _checking = false; });
  }

  @override
  Widget build(BuildContext context) {
    if (_checking) {
      return Scaffold(
        backgroundColor: const Color(0xFF0f172a),
        body: Center(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Container(
              width: 60, height: 60,
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [Color(0xFF6366f1), Color(0xFF8b5cf6)]),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(Icons.school_rounded, color: Colors.white, size: 32),
            ),
            const SizedBox(height: 20),
            const CircularProgressIndicator(color: Color(0xFF6366f1), strokeWidth: 2),
          ]),
        ),
      );
    }
    return _loggedIn ? const MainScreen() : const LoginScreen();
  }
}