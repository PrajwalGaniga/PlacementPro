import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'main_screen.dart';

class LoginScreen extends StatefulWidget {
  final String collegeId;
  final String collegeName;

  const LoginScreen({
    super.key,
    required this.collegeId,
    required this.collegeName,
  });

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _usnCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  bool _isLoading = false;

  Future<void> _login() async {
    final usn = _usnCtrl.text.trim().toUpperCase();
    final email = _emailCtrl.text.trim();
    if (usn.isEmpty || email.isEmpty) {
      _snack('Please enter your USN and Email');
      return;
    }
    setState(() => _isLoading = true);
    try {
      final res = await ApiService.studentLogin(usn, email, widget.collegeId);

      final student = res['student'] as Map<String, dynamic>;

      await ApiService.saveCredentials(
        res['access_token'],
        student['usn'],
        student['college_id'] ?? widget.collegeId,
        student['name'] ?? '',
      );
      await ApiService.saveStudentJson(student);

      // Recalculate score on login
      try {
        final score = await ApiService.calculateScore();
        await ApiService.saveScore(
          (score['placement_score'] as num).toDouble(),
          score['label'] ?? '',
        );
      } catch (_) {}

      if (mounted) {
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (_) => const MainScreen()),
          (_) => false,
        );
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
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      extendBodyBehindAppBar: true,
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
                  Text(widget.collegeName,
                    style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 6),
                  const Text('Enter your credentials to continue',
                    style: TextStyle(color: Color(0xFF94a3b8), fontSize: 14)),
                  const SizedBox(height: 40),

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
                  const SizedBox(height: 20),

                  // Email
                  const Text('EMAIL',
                    style: TextStyle(color: Color(0xFF94a3b8), fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 0.8)),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _emailCtrl,
                    style: const TextStyle(color: Colors.white),
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      hintText: 'student@college.edu',
                      prefixIcon: Icon(Icons.email_outlined, color: Color(0xFF64748b), size: 20),
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
}