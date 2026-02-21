import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';

// ── Data models (safe factories) ─────────────────────────────────────────────
Map<String, dynamic> _emptyExp() => {'role': '', 'company': '', 'duration': '', 'achievements': <String>[]};
Map<String, dynamic> _emptyProj() => {'name': '', 'description': <String>[]};
Map<String, dynamic> _emptyEdu() => {'degree': '', 'institution': '', 'score': '', 'years': ''};

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _saving = false;
  double _score = 0;
  String _scoreLabel = '';

  // Basic fields
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _cgpaCtrl = TextEditingController();
  final _branchCtrl = TextEditingController();
  final _linkedinCtrl = TextEditingController();
  final _summaryCtrl = TextEditingController();
  final _skillCtrl = TextEditingController();

  // Dynamic lists
  List<String> _skills = [];
  List<Map<String, dynamic>> _experience = [];
  List<Map<String, dynamic>> _projects = [];
  List<Map<String, dynamic>> _education = [];

  @override
  void initState() {
    super.initState();
    _loadFromPrefs();
  }

  // ── Bulletproof JSON Parsing ───────────────────────────────────────────────
  Future<void> _loadFromPrefs() async {
    debugPrint("[PROFILE] 🟡 Loading student profile...");
    try {
      final p = await SharedPreferences.getInstance();
      _score = p.getDouble('score') ?? 0;
      _scoreLabel = p.getString('score_label') ?? '';
      
      final student = await ApiService.getStudentJson();
      if (student != null) {
        _nameCtrl.text = student['name']?.toString() ?? '';
        _emailCtrl.text = student['email']?.toString() ?? '';
        _phoneCtrl.text = student['phone']?.toString() ?? '';
        _cgpaCtrl.text = student['cgpa']?.toString() ?? '';
        _branchCtrl.text = student['branch']?.toString() ?? '';
        _linkedinCtrl.text = student['linkedin_url']?.toString() ?? '';
        _summaryCtrl.text = student['summary']?.toString() ?? '';
        
        // Safely cast skills
        _skills = (student['skills'] as List<dynamic>? ?? []).map((e) => e.toString()).toList();
        
        // Safely deep-cast experience and its inner achievements list
        _experience = (student['experience'] as List<dynamic>? ?? []).map((e) {
          final map = Map<String, dynamic>.from(e as Map);
          map['achievements'] = (map['achievements'] as List<dynamic>? ?? []).map((a) => a.toString()).toList();
          return map;
        }).toList();

        // Safely deep-cast projects and its inner description list
        _projects = (student['projects'] as List<dynamic>? ?? []).map((e) {
          final map = Map<String, dynamic>.from(e as Map);
          map['description'] = (map['description'] as List<dynamic>? ?? []).map((d) => d.toString()).toList();
          return map;
        }).toList();

        // Safely cast education
        _education = (student['education'] as List<dynamic>? ?? []).map((e) => Map<String, dynamic>.from(e as Map)).toList();
        
        debugPrint("[PROFILE] 🟢 Profile loaded successfully!");
      }
    } catch (e) {
      debugPrint("[PROFILE] ❌ Error loading profile: $e");
    }
    setState(() {});
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    debugPrint("[PROFILE] 🟡 Saving profile to backend...");

    try {
      final payload = {
        'name': _nameCtrl.text.trim(),
        'email': _emailCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim(),
        'cgpa': _cgpaCtrl.text.trim(),
        'branch': _branchCtrl.text.trim(),
        'linkedin_url': _linkedinCtrl.text.trim(),
        'summary': _summaryCtrl.text.trim(),
        'skills': _skills,
        'experience': _experience,
        'projects': _projects,
        'education': _education,
      };

      final res = await ApiService.updateProfile(payload);
      final newScore = (res['placement_score'] as num?)?.toDouble() ?? _score;
      final newLabel = res['label'] ?? _scoreLabel;
      
      await ApiService.saveScore(newScore, newLabel);
      await ApiService.saveStudentJson({...payload, 'placement_score': newScore});
      
      setState(() { _score = newScore; _scoreLabel = newLabel; });
      debugPrint("[PROFILE] 🟢 Saved! New Score: $newScore");
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Profile saved! Score: ${newScore.toInt()}%'),
          backgroundColor: const Color(0xFF10b981),
        ));
      }
    } catch (e) {
      debugPrint("[PROFILE] ❌ Error saving profile: $e");
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(e.toString().replaceAll('Exception: ', '')),
          backgroundColor: const Color(0xFFf43f5e),
        ));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Color _scoreColor(double s) => s >= 75 ? const Color(0xFF10b981) : s >= 50 ? const Color(0xFFf59e0b) : const Color(0xFFf43f5e);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0f172a),
      appBar: AppBar(
        title: const Text('My Profile', style: TextStyle(fontWeight: FontWeight.w700)),
        backgroundColor: const Color(0xFF1e1b4b),
        actions: [
          TextButton.icon(
            onPressed: _saving ? null : _save,
            icon: _saving
              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF6366f1)))
              : const Icon(Icons.save_rounded, color: Color(0xFF6366f1)),
            label: Text(_saving ? 'Saving…' : 'Save', style: const TextStyle(color: Color(0xFF6366f1), fontWeight: FontWeight.w700)),
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // ML Score
            _section('ML Placement Score', icon: Icons.auto_graph_rounded, child: Row(
              children: [
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('${_score.toInt()}%', style: TextStyle(color: _scoreColor(_score), fontWeight: FontWeight.w800, fontSize: 36)),
                    Text(_scoreLabel.isEmpty ? '—' : _scoreLabel, style: const TextStyle(color: Color(0xFF94a3b8), fontWeight: FontWeight.w600)),
                  ]),
                ),
                Expanded(child: LinearProgressIndicator(
                  value: (_score / 100).clamp(0.0, 1.0), color: _scoreColor(_score),
                  backgroundColor: Colors.white12, minHeight: 8, borderRadius: BorderRadius.circular(99),
                )),
              ],
            )),
            const SizedBox(height: 16),

            // Basic Info
            _section('Basic Info', icon: Icons.person_outline_rounded, child: Column(children: [
              _field('Full Name', _nameCtrl, hint: 'Rahul Kumar'),
              _field('Email', _emailCtrl, hint: 'rahul@example.com', type: TextInputType.emailAddress),
              _field('Phone', _phoneCtrl, hint: '+91 98765 43210', type: TextInputType.phone),
              _field('CGPA', _cgpaCtrl, hint: '8.5', type: const TextInputType.numberWithOptions(decimal: true)),
              _field('Branch', _branchCtrl, hint: 'CSE'),
              _field('LinkedIn URL', _linkedinCtrl, hint: 'linkedin.com/in/yourname'),
              _field('Professional Summary', _summaryCtrl, hint: 'Brief about yourself…', maxLines: 3),
            ])),
            const SizedBox(height: 16),

            // Skills
            _section('Skills', icon: Icons.code_rounded, child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 8, runSpacing: 8,
                  children: _skills.asMap().entries.map((e) => Chip(
                    label: Text(e.value),
                    backgroundColor: const Color(0xFF6366f1).withOpacity(0.2),
                    labelStyle: const TextStyle(color: Color(0xFF6366f1), fontWeight: FontWeight.w600, fontSize: 12),
                    deleteIcon: const Icon(Icons.close, size: 14, color: Color(0xFF6366f1)),
                    onDeleted: () => setState(() => _skills.removeAt(e.key)),
                  )).toList(),
                ),
                const SizedBox(height: 12),
                Row(children: [
                  Expanded(child: _field('Add Skill', _skillCtrl, hint: 'e.g. Python')),
                  const SizedBox(width: 8),
                  Padding(
                    padding: const EdgeInsets.only(bottom: 14),
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF6366f1), foregroundColor: Colors.white),
                      onPressed: () {
                        final s = _skillCtrl.text.trim();
                        if (s.isNotEmpty && !_skills.contains(s)) setState(() { _skills.add(s); _skillCtrl.clear(); });
                      },
                      child: const Text('Add'),
                    ),
                  ),
                ]),
              ],
            )),
            const SizedBox(height: 16),

            // Experience
            _section('Experience', icon: Icons.work_outline_rounded, child: Column(children: [
              ..._experience.asMap().entries.map((e) => _expCard(e.key, e.value)),
              _addBtn('Add Experience', () => setState(() => _experience.add(_emptyExp()))),
            ])),
            const SizedBox(height: 16),

            // Projects
            _section('Projects', icon: Icons.folder_open_rounded, child: Column(children: [
              ..._projects.asMap().entries.map((e) => _projCard(e.key, e.value)),
              _addBtn('Add Project', () => setState(() => _projects.add(_emptyProj()))),
            ])),
            const SizedBox(height: 16),

            // Education
            _section('Education', icon: Icons.school_rounded, child: Column(children: [
              ..._education.asMap().entries.map((e) => _eduCard(e.key, e.value)),
              _addBtn('Add Education', () => setState(() => _education.add(_emptyEdu()))),
            ])),
            const SizedBox(height: 100),
          ],
        ),
      ),
    );
  }

  // ── UI Helpers ─────────────────────────────────────────────────────────────
  Widget _section(String title, {required Widget child, required IconData icon}) => Container(
    padding: const EdgeInsets.all(18),
    decoration: BoxDecoration(color: const Color(0xFF1e293b), borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.white.withOpacity(0.06))),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Icon(icon, color: const Color(0xFF6366f1), size: 18), const SizedBox(width: 8),
        Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 15)),
      ]),
      const SizedBox(height: 16),
      child,
    ]),
  );

  Widget _field(String label, TextEditingController ctrl, {String hint = '', TextInputType type = TextInputType.text, int maxLines = 1}) => Padding(
    padding: const EdgeInsets.only(bottom: 14),
    child: TextFormField(
      controller: ctrl, keyboardType: type, maxLines: maxLines, style: const TextStyle(color: Colors.white, fontSize: 14),
      decoration: InputDecoration(
        labelText: label, hintText: hint,
        labelStyle: const TextStyle(color: Color(0xFF94a3b8)), hintStyle: const TextStyle(color: Color(0xFF475569)),
        enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Colors.white.withOpacity(0.1))),
        focusedBorder: const UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFF6366f1))),
      ),
    ),
  );

  Widget _fieldCtrl(String label, Map<String, dynamic> map, String key, {String hint = ''}) {
    final ctrl = TextEditingController(text: map[key]?.toString() ?? '');
    ctrl.selection = TextSelection.fromPosition(TextPosition(offset: ctrl.text.length));
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: TextFormField(
        controller: ctrl, style: const TextStyle(color: Colors.white, fontSize: 13),
        decoration: InputDecoration(labelText: label, hintText: hint, isDense: true, labelStyle: const TextStyle(color: Color(0xFF94a3b8), fontSize: 12)),
        onChanged: (v) => map[key] = v,
      ),
    );
  }

  Widget _addBtn(String label, VoidCallback onTap) => TextButton.icon(
    onPressed: onTap, icon: const Icon(Icons.add_circle_outline, color: Color(0xFF6366f1)),
    label: Text(label, style: const TextStyle(color: Color(0xFF6366f1), fontWeight: FontWeight.w600)),
  );

  // ── Safe Dynamic Cards ─────────────────────────────────────────────────────
  Widget _expCard(int idx, Map<String, dynamic> exp) {
    final achievCtrl = TextEditingController();
    final achievements = (exp['achievements'] as List<dynamic>? ?? []).map((e) => e.toString()).toList();

    return Container(
      margin: const EdgeInsets.only(bottom: 12), padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: const Color(0xFF0f172a), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFF6366f1).withOpacity(0.3))),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Text('Experience ${idx + 1}', style: const TextStyle(color: Color(0xFF6366f1), fontWeight: FontWeight.w700))),
          IconButton(icon: const Icon(Icons.delete_outline, color: Color(0xFFf43f5e), size: 18), onPressed: () => setState(() => _experience.removeAt(idx))),
        ]),
        _fieldCtrl('Role', exp, 'role'), _fieldCtrl('Company', exp, 'company'), _fieldCtrl('Duration', exp, 'duration', hint: 'e.g. Jan 2024 – May 2024'),
        const SizedBox(height: 8),
        const Text('Achievements', style: TextStyle(color: Color(0xFF94a3b8), fontSize: 12, fontWeight: FontWeight.w600)),
        ...achievements.asMap().entries.map((a) => Row(children: [
          const Icon(Icons.arrow_right, color: Color(0xFF94a3b8), size: 16),
          Expanded(child: Text(a.value, style: const TextStyle(color: Colors.white, fontSize: 13))),
          IconButton(icon: const Icon(Icons.close, size: 14, color: Color(0xFFf43f5e)), onPressed: () => setState(() { achievements.removeAt(a.key); exp['achievements'] = achievements; })),
        ])),
        Row(children: [
          Expanded(child: TextField(controller: achievCtrl, style: const TextStyle(color: Colors.white, fontSize: 13), decoration: const InputDecoration(hintText: 'Add achievement…', isDense: true))),
          TextButton(
            onPressed: () {
              if (achievCtrl.text.trim().isNotEmpty) {
                setState(() { achievements.add(achievCtrl.text.trim()); exp['achievements'] = achievements; });
              }
            },
            child: const Text('Add', style: TextStyle(color: Color(0xFF6366f1))),
          ),
        ]),
      ]),
    );
  }

  Widget _projCard(int idx, Map<String, dynamic> proj) {
    final descCtrl = TextEditingController();
    final description = (proj['description'] as List<dynamic>? ?? []).map((e) => e.toString()).toList();

    return Container(
      margin: const EdgeInsets.only(bottom: 12), padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: const Color(0xFF0f172a), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFF22d3ee).withOpacity(0.3))),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Text('Project ${idx + 1}', style: const TextStyle(color: Color(0xFF22d3ee), fontWeight: FontWeight.w700))),
          IconButton(icon: const Icon(Icons.delete_outline, color: Color(0xFFf43f5e), size: 18), onPressed: () => setState(() => _projects.removeAt(idx))),
        ]),
        _fieldCtrl('Project Name', proj, 'name'),
        const SizedBox(height: 8),
        const Text('Description Points', style: TextStyle(color: Color(0xFF94a3b8), fontSize: 12, fontWeight: FontWeight.w600)),
        ...description.asMap().entries.map((d) => Row(children: [
          const Icon(Icons.fiber_manual_record, color: Color(0xFF94a3b8), size: 8), const SizedBox(width: 8),
          Expanded(child: Text(d.value, style: const TextStyle(color: Colors.white, fontSize: 13))),
          IconButton(icon: const Icon(Icons.close, size: 14, color: Color(0xFFf43f5e)), onPressed: () => setState(() { description.removeAt(d.key); proj['description'] = description; })),
        ])),
        Row(children: [
          Expanded(child: TextField(controller: descCtrl, style: const TextStyle(color: Colors.white, fontSize: 13), decoration: const InputDecoration(hintText: 'Add description point…', isDense: true))),
          TextButton(
            onPressed: () {
              if (descCtrl.text.trim().isNotEmpty) {
                setState(() { description.add(descCtrl.text.trim()); proj['description'] = description; });
              }
            },
            child: const Text('Add', style: TextStyle(color: Color(0xFF22d3ee))),
          ),
        ]),
      ]),
    );
  }

  Widget _eduCard(int idx, Map<String, dynamic> edu) => Container(
    margin: const EdgeInsets.only(bottom: 12), padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(color: const Color(0xFF0f172a), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFf59e0b).withOpacity(0.3))),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Expanded(child: Text('Education ${idx + 1}', style: const TextStyle(color: Color(0xFFf59e0b), fontWeight: FontWeight.w700))),
        IconButton(icon: const Icon(Icons.delete_outline, color: Color(0xFFf43f5e), size: 18), onPressed: () => setState(() => _education.removeAt(idx))),
      ]),
      _fieldCtrl('Degree', edu, 'degree', hint: 'B.E. Computer Science'), _fieldCtrl('Institution', edu, 'institution'),
      _fieldCtrl('Score', edu, 'score', hint: '8.5 CGPA / 85%'), _fieldCtrl('Years', edu, 'years', hint: '2021 – 2025'),
    ]),
  );
}