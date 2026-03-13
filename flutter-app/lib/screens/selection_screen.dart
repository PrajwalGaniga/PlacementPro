import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'login_screen.dart';

class SelectionScreen extends StatefulWidget {
  const SelectionScreen({super.key});

  @override
  State<SelectionScreen> createState() => _SelectionScreenState();
}

class _SelectionScreenState extends State<SelectionScreen> {
  List<dynamic> _colleges = [];
  String? _selectedCollegeId;
  String? _selectedCollegeName;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _fetchColleges();
  }

  Future<void> _fetchColleges() async {
    try {
      final colleges = await ApiService.getColleges();
      setState(() {
        _colleges = colleges;
        _loading = false;
      });
    } catch (e) {
      debugPrint("Error fetching colleges: $e");
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Failed to load colleges. Check your connection.")),
        );
      }
      setState(() => _loading = false);
    }
  }

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
                  const Text('Select Your Institution',
                    style: TextStyle(color: Color(0xFF94a3b8), fontSize: 14)),
                  const SizedBox(height: 40),

                  if (_loading)
                    const Center(child: CircularProgressIndicator())
                  else ...[
                    const Text('Institution',
                      style: TextStyle(color: Color(0xFF94a3b8), fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 0.8)),
                    const SizedBox(height: 8),
                    Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFF1e293b),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFF334155)),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: _selectedCollegeId,
                          isExpanded: true,
                          dropdownColor: const Color(0xFF1e293b),
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          hint: const Text('Search for your college',
                            style: TextStyle(color: Color(0xFF64748b))),
                          items: _colleges.map<DropdownMenuItem<String>>((c) =>
                            DropdownMenuItem(
                              value: c['college_id'] as String,
                              child: Text(c['name'] as String,
                                style: const TextStyle(color: Colors.white, fontSize: 14)),
                            )).toList(),
                          onChanged: (v) {
                             final col = _colleges.firstWhere((element) => element['college_id'] == v);
                             setState(() {
                               _selectedCollegeId = v;
                               _selectedCollegeName = col['name'];
                             });
                          },
                        ),
                      ),
                    ),
                    const SizedBox(height: 32),
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        onPressed: _selectedCollegeId == null ? null : () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => LoginScreen(
                                collegeId: _selectedCollegeId!,
                                collegeName: _selectedCollegeName!,
                              ),
                            ),
                          );
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF6366f1),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: const Text('Continue to Login', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                      ),
                    ),
                  ]
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
