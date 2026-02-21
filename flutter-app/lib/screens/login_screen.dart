import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'main_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _usnCtrl = TextEditingController();
  List<dynamic> _colleges = [];
  String? _selectedCollege;
  bool _isLoading = false;
  bool _loadingColleges = true;

  @override
  void initState() {
    super.initState();
    _loadColleges();
  }

  Future<void> _loadColleges() async {
    debugPrint("\n[DEBUG-FLUTTER] 🟡 Starting _loadColleges()...");
    try {
      final c = await ApiService.getColleges();
      debugPrint("[DEBUG-FLUTTER] 🟢 Successfully fetched ${c.length} colleges: $c");
      
      setState(() { 
        _colleges = c; 
        _loadingColleges = false; 
      });
    } catch (e) {
      // THE CULPRIT: This was silently failing before!
      debugPrint("[DEBUG-FLUTTER] ❌ ERROR fetching colleges: $e");
      
      setState(() => _loadingColleges = false);
      
      // Show the error on the screen so you don't have to guess
      if (mounted) {
        _snack('Failed to load colleges. Check terminal for error.');
      }
    }
  }

  Future<void> _login() async {
    if (_selectedCollege == null || _usnCtrl.text.trim().isEmpty) {
      _snack('Please select a college and enter your USN');
      return;
    }
    setState(() => _isLoading = true);
    try {
      final res = await ApiService.studentLogin(
          _usnCtrl.text.trim().toUpperCase(), _selectedCollege!);
      final student = res['student'] as Map<String, dynamic>;
      await ApiService.saveCredentials(
        res['access_token'], student['usn'], student['college_id'] ?? _selectedCollege!, student['name'] ?? '');
      await ApiService.saveStudentJson(student);

      // Recalculate score on login
      try {
        final score = await ApiService.calculateScore();
        await ApiService.saveScore(
          (score['placement_score'] as num).toDouble(), score['label'] ?? '');
      } catch (_) {}

      if (mounted) {
        Navigator.pushAndRemoveUntil(context,
          MaterialPageRoute(builder: (_) => const MainScreen()), (_) => false);
      }
    } catch (e) {
      _snack(e.toString().replaceAll('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _snack(String msg) => ScaffoldMessenger.of(context)
      .showSnackBar(SnackBar(content: Text(msg)));

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF0f172a), Color(0xFF1e1b4b), Color(0xFF0f172a)],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(28),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Logo
                  Container(
                    width: 60, height: 60,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(colors: [Color(0xFF6366f1), Color(0xFF8b5cf6)]),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [BoxShadow(color: const Color(0xFF6366f1).withOpacity(0.4), blurRadius: 24, offset: const Offset(0, 8))],
                    ),
                    child: const Icon(Icons.school_rounded, color: Colors.white, size: 30),
                  ),
                  const SizedBox(height: 24),
                  const Text('PlacementPro AI',
                    style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 6),
                  const Text('Student Portal – Login with your USN',
                    style: TextStyle(color: Color(0xFF94a3b8), fontSize: 14)),
                  const SizedBox(height: 40),

                  // College picker
                  const Text('Institution',
                    style: TextStyle(color: Color(0xFF94a3b8), fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 0.8)),
                  const SizedBox(height: 8),
                  _loadingColleges
                    ? _fieldSkeleton()
                    : Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFF1e293b),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFF334155)),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: _selectedCollege,
                            isExpanded: true,
                            dropdownColor: const Color(0xFF1e293b),
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            hint: const Text('Select your college',
                              style: TextStyle(color: Color(0xFF64748b))),
                            items: _colleges.map<DropdownMenuItem<String>>((c) =>
                              DropdownMenuItem(
                                value: c['college_id'] as String,
                                child: Text(c['name'] as String,
                                  style: const TextStyle(color: Colors.white, fontSize: 14)),
                              )).toList(),
                            onChanged: (v) => setState(() => _selectedCollege = v),
                          ),
                        ),
                      ),
                  const SizedBox(height: 20),

                  // USN
                  const Text('USN',
                    style: TextStyle(color: Color(0xFF94a3b8), fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 0.8)),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _usnCtrl,
                    style: const TextStyle(color: Colors.white, letterSpacing: 1),
                    textCapitalization: TextCapitalization.characters,
                    decoration: const InputDecoration(
                      hintText: 'e.g. 4SN25CS001',
                      prefixIcon: Icon(Icons.badge_outlined, color: Color(0xFF64748b), size: 20),
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Login button
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: _isLoading
                      ? Container(
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(colors: [Color(0xFF6366f1), Color(0xFF8b5cf6)]),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Center(child: SizedBox(width: 22, height: 22,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))))
                      : ElevatedButton.icon(
                          onPressed: _login,
                          icon: const Icon(Icons.login_rounded),
                          label: const Text('Login', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF6366f1),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _fieldSkeleton() => Container(
    height: 52,
    decoration: BoxDecoration(color: const Color(0xFF1e293b), borderRadius: BorderRadius.circular(12)),
    child: const Center(child: SizedBox(width: 20, height: 20,
      child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF6366f1)))),
  );
}