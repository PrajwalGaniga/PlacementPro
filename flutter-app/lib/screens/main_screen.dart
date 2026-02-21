import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'home_screen.dart';
import 'profile_screen.dart';
import 'tracker_screen.dart';
import 'resume_screen.dart';
import 'chat_screen.dart';
import 'login_screen.dart';
import 'network_screen.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});
  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _index = 0;

  final List<Widget> _screens = const [
    HomeScreen(),
    ProfileScreen(),
    TrackerScreen(),
    ResumeScreen(),
    NetworkScreen(),
  ];

  void _logout() async {
    await ApiService.clearAll();
    if (mounted) {
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (_) => const LoginScreen()),
        (_) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _index.clamp(0, _screens.length - 1),
        children: _screens,
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _index,
        onTap: (i) => setState(() => _index = i),
        type: BottomNavigationBarType.fixed,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.dashboard_rounded), label: 'Feed'),
          BottomNavigationBarItem(icon: Icon(Icons.person_rounded), label: 'Profile'),
          BottomNavigationBarItem(icon: Icon(Icons.timeline_rounded), label: 'Tracker'),
          BottomNavigationBarItem(icon: Icon(Icons.description_rounded), label: 'Resume'),
          BottomNavigationBarItem(icon: Icon(Icons.people_alt_rounded), label: 'Network'),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ChatScreen())),
        backgroundColor: const Color(0xFF6366f1),
        icon: const Icon(Icons.chat_bubble_outline_rounded, color: Colors.white),
        label: const Text('PlacementBot', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
      ),
    );
  }
}

