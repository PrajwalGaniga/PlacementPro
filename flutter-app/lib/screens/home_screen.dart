import 'package:flutter/material.dart';
import 'package:percent_indicator/circular_percent_indicator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _loading = true;
  String _studentName = '';
  double _score = 0;
  String _scoreLabel = '';
  List<dynamic> _drives = [];
  String _error = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = ''; });
    try {
      final p = await SharedPreferences.getInstance();
      _studentName = p.getString('name') ?? 'Student';
      _score = p.getDouble('score') ?? 0;
      _scoreLabel = p.getString('score_label') ?? '';

      final res = await ApiService.getEligibleDrives();
      setState(() {
        _drives = res['eligible_drives'] as List<dynamic>;
        _loading = false;
      });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Future<void> _apply(String driveId, int index) async {
    try {
      final res = await ApiService.applyDrive(driveId);
      setState(() => _drives[index]['_applied'] = true);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(res['message'] ?? 'Applied!'),
          backgroundColor: const Color(0xFF10b981),
        ));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: const Color(0xFFf43f5e)));
    }
  }

  Color _scoreColor(double s) =>
    s >= 75 ? const Color(0xFF10b981) : s >= 50 ? const Color(0xFFf59e0b) : const Color(0xFFf43f5e);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // ── Score Banner ──────────────────────────────────────────────
          SliverAppBar(
            expandedHeight: 200,
            pinned: true,
            backgroundColor: const Color(0xFF0f172a),
            title: const Text('Placement Feed', style: TextStyle(fontWeight: FontWeight.w700)),
            actions: [
              IconButton(icon: const Icon(Icons.refresh_rounded), onPressed: _load),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft, end: Alignment.bottomRight,
                    colors: [Color(0xFF1e1b4b), Color(0xFF0f172a)],
                  ),
                ),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 80, 20, 16),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      CircularPercentIndicator(
                        radius: 54,
                        lineWidth: 7,
                        percent: (_score / 100).clamp(0.0, 1.0),
                        center: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text('${_score.toInt()}%', style: TextStyle(
                              color: _scoreColor(_score), fontWeight: FontWeight.w800, fontSize: 18)),
                            const Text('Ready', style: TextStyle(color: Color(0xFF94a3b8), fontSize: 9)),
                          ],
                        ),
                        progressColor: _scoreColor(_score),
                        backgroundColor: Colors.white12,
                        circularStrokeCap: CircularStrokeCap.round,
                        animation: true,
                        animationDuration: 1000,
                      ),
                      const SizedBox(width: 20),
                      Expanded(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Hi, ${_studentName.split(' ').first} 👋',
                              style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
                            const SizedBox(height: 4),
                            Text(_scoreLabel.isEmpty ? 'Calculating readiness…' : _scoreLabel,
                              style: const TextStyle(color: Color(0xFF94a3b8), fontSize: 13)),
                            const SizedBox(height: 10),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: const Color(0xFF6366f1).withOpacity(0.15),
                                borderRadius: BorderRadius.circular(999),
                                border: Border.all(color: const Color(0xFF6366f1).withOpacity(0.4)),
                              ),
                              child: Text('${_drives.length} drives available',
                                style: const TextStyle(color: Color(0xFF22d3ee), fontSize: 11, fontWeight: FontWeight.w700)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // ── Section header ────────────────────────────────────────────
          const SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.fromLTRB(20, 20, 20, 8),
              child: Row(children: [
                Icon(Icons.local_fire_department_rounded, color: Color(0xFF22d3ee), size: 18),
                SizedBox(width: 8),
                Text('Eligible Opportunities For You',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 15)),
              ]),
            ),
          ),

          // ── Body ──────────────────────────────────────────────────────
          _loading
            ? const SliverFillRemaining(
                child: Center(child: CircularProgressIndicator(color: Color(0xFF6366f1))))
            : _error.isNotEmpty
              ? SliverFillRemaining(child: _buildError())
              : _drives.isEmpty
                ? SliverFillRemaining(child: _buildEmpty())
                : SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (_, i) => _DriveCard(
                        drive: _drives[i],
                        onApply: () => _apply(_drives[i]['_id'] as String, i),
                        applied: _drives[i]['_applied'] == true,
                      ),
                      childCount: _drives.length,
                    ),
                  ),
          const SliverPadding(padding: EdgeInsets.only(bottom: 100)),
        ],
      ),
    );
  }

  Widget _buildEmpty() => Center(
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      const Icon(Icons.work_off_outlined, size: 56, color: Color(0xFF475569)),
      const SizedBox(height: 16),
      const Text('No eligible drives right now', style: TextStyle(color: Color(0xFF94a3b8), fontSize: 15, fontWeight: FontWeight.w600)),
      const SizedBox(height: 6),
      const Text('Improve your profile score to unlock more.', style: TextStyle(color: Color(0xFF475569), fontSize: 13)),
      const SizedBox(height: 20),
      ElevatedButton.icon(onPressed: _load, icon: const Icon(Icons.refresh), label: const Text('Retry')),
    ]),
  );

  Widget _buildError() => Center(
    child: Padding(
      padding: const EdgeInsets.all(32),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        const Icon(Icons.wifi_off_rounded, size: 48, color: Color(0xFFf43f5e)),
        const SizedBox(height: 12),
        Text(_error, style: const TextStyle(color: Color(0xFF94a3b8)), textAlign: TextAlign.center),
        const SizedBox(height: 16),
        ElevatedButton(onPressed: _load, child: const Text('Retry')),
      ]),
    ),
  );
}

// ── Drive Card ──────────────────────────────────────────────────────────────

class _DriveCard extends StatelessWidget {
  final Map<String, dynamic> drive;
  final VoidCallback onApply;
  final bool applied;
  const _DriveCard({required this.drive, required this.onApply, required this.applied});

  @override
  Widget build(BuildContext context) {
    final company = drive['company_name'] ?? 'Company';
    final role = drive['job_role'] ?? '';
    final ctc = drive['package_ctc'];
    final summary = drive['ai_summary'] ?? '';

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFF1e293b),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.07)),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.3), blurRadius: 12, offset: const Offset(0, 4))],
      ),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                // Logo
                Container(
                  width: 46, height: 46,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(colors: [Color(0xFF6366f1), Color(0xFF8b5cf6)]),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(child: Text(company[0].toUpperCase(),
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 20))),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(company, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 16)),
                    Text(role, style: const TextStyle(color: Color(0xFF94a3b8), fontSize: 13)),
                  ]),
                ),
                if (ctc != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFF10b981).withOpacity(0.15),
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(color: const Color(0xFF10b981).withOpacity(0.4)),
                    ),
                    child: Text('$ctc', style: const TextStyle(color: Color(0xFF10b981), fontSize: 11, fontWeight: FontWeight.w700)),
                  ),
              ],
            ),
            if (summary.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(summary, style: const TextStyle(color: Color(0xFF94a3b8), fontSize: 13, height: 1.5)),
            ],
            _tags(drive),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              height: 46,
              child: ElevatedButton.icon(
                onPressed: applied ? null : onApply,
                icon: Icon(applied ? Icons.check_circle_outline : Icons.send_rounded, size: 18),
                label: Text(applied ? '✓ Applied!' : 'Apply Now',
                  style: const TextStyle(fontWeight: FontWeight.w700)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: applied ? const Color(0xFF475569) : const Color(0xFF6366f1),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _tags(Map<String, dynamic> d) {
    final tags = <Widget>[];
    if (d['work_location'] != null) tags.add(_tag(d['work_location'], Icons.location_on_outlined, const Color(0xFF22d3ee)));
    if (d['min_cgpa'] != null) tags.add(_tag('CGPA ≥ ${d['min_cgpa']}', Icons.grade_outlined, const Color(0xFFf59e0b)));
    if (d['application_deadline'] != null) tags.add(_tag('Due: ${d['application_deadline']}', Icons.calendar_today_outlined, const Color(0xFFf43f5e)));
    if (tags.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Wrap(spacing: 6, runSpacing: 6, children: tags),
    );
  }

  Widget _tag(String label, IconData icon, Color color) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    decoration: BoxDecoration(
      color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(999),
      border: Border.all(color: color.withOpacity(0.3)),
    ),
    child: Row(mainAxisSize: MainAxisSize.min, children: [
      Icon(icon, size: 11, color: color),
      const SizedBox(width: 4),
      Text(label, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)),
    ]),
  );
}