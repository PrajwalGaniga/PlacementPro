import 'package:flutter/material.dart';
import 'package:percent_indicator/circular_percent_indicator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';

class HomeScreen extends StatefulWidget {
  /// Called with index 1 to switch MainScreen to Profile tab.
  final ValueChanged<int>? onSwitchTab;

  const HomeScreen({super.key, this.onSwitchTab});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with TickerProviderStateMixin {
  bool _loading = true;
  String _studentName = '';
  double _score = 0;
  String _scoreLabel = '';
  List<dynamic> _drives = [];
  String _error = '';
  bool _hasResume = false;

  @override
  void initState() {
    super.initState();
    _fetchProfile();
    _load();
  }

  Future<void> _fetchProfile() async {
    try {
      final updatedUser = await ApiService.getStudentProfile();
      await ApiService.saveStudentJson(updatedUser);
      if (mounted) {
        setState(() {
          _hasResume = updatedUser['has_resume'] == true;
        });
      }
    } catch (e) {
      debugPrint("Profile fetch failed: $e");
    }
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = '';
    });
    try {
      final p = await SharedPreferences.getInstance();
      _studentName = p.getString('name') ?? 'Student';
      _score = p.getDouble('score') ?? 0;
      _scoreLabel = p.getString('score_label') ?? '';

      final res = await ApiService.getEligibleDrives();

      // Backend now returns: { drives: [...], total: n, has_resume: bool }
      // Each drive has: is_locked, lock_reason (List), already_applied
      final rawDrives = (res['drives'] as List? ?? []);
      final hasResume = res['has_resume'] == true;

      setState(() {
        _drives = rawDrives;
        // Preference: check from the fresh drives response if available, 
        // otherwise fallback to what we already found in _fetchProfile
        if (res.containsKey('has_resume')) {
          _hasResume = res['has_resume'] == true;
        }
      });
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  /// Show a full-screen success animation overlay
  Future<void> _showSuccessAnimation() async {
    final controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    final scaleAnim = CurvedAnimation(parent: controller, curve: Curves.elasticOut);

    showGeneralDialog(
      context: context,
      barrierDismissible: false,
      barrierColor: Colors.black.withOpacity(0.6),
      transitionDuration: const Duration(milliseconds: 300),
      pageBuilder: (ctx, _, __) {
        controller.forward();
        return Center(
          child: AnimatedBuilder(
            animation: scaleAnim,
            builder: (_, child) => Transform.scale(
              scale: scaleAnim.value,
              child: child,
            ),
            child: Container(
              width: 220,
              padding: const EdgeInsets.all(32),
              decoration: BoxDecoration(
                color: const Color(0xFF1e293b),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: const Color(0xFF10b981).withOpacity(0.5), width: 1.5),
                boxShadow: [
                  BoxShadow(color: const Color(0xFF10b981).withOpacity(0.2), blurRadius: 40),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      color: const Color(0xFF10b981).withOpacity(0.15),
                      shape: BoxShape.circle,
                      border: Border.all(color: const Color(0xFF10b981), width: 2),
                    ),
                    child: const Icon(Icons.check_rounded, color: Color(0xFF10b981), size: 40),
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    'Applied!',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Your application has been submitted successfully.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Color(0xFF94a3b8), fontSize: 13, height: 1.5),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );

    await Future.delayed(const Duration(milliseconds: 1800));
    if (mounted) Navigator.of(context, rootNavigator: true).pop();
    controller.dispose();
  }

  /// Handle the Apply Now button tap
  Future<void> _apply(String driveId, int index) async {
    // 1. Pre-Apply Check (Secure state refresh)
    final student = await ApiService.getStudentJson();
    final bool currentHasResume = student?['has_resume'] == true;

    if (!currentHasResume) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Row(children: [
              Icon(Icons.upload_file_rounded, color: Colors.white, size: 18),
              SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Please upload your resume to apply',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
              ),
            ]),
            backgroundColor: const Color(0xFFf59e0b),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            action: SnackBarAction(
              label: 'GO TO PROFILE',
              textColor: Colors.white,
              onPressed: () => widget.onSwitchTab?.call(1),
            ),
            duration: const Duration(seconds: 4),
          ),
        );
        // Also switch to profile tab automatically
        widget.onSwitchTab?.call(1);
      }
      return;
    }

    try {
      await ApiService.applyDrive(driveId);

      // Mark as applied locally so card updates immediately
      if (mounted) {
        setState(() => _drives[index]['is_applied'] = true);
        await _showSuccessAnimation();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceAll('Exception: ', '')),
            backgroundColor: const Color(0xFFf43f5e),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    }
  }

  Color _scoreColor(double s) =>
      s >= 75 ? const Color(0xFF10b981) : s >= 50 ? const Color(0xFFf59e0b) : const Color(0xFFf43f5e);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0f172a),
      body: CustomScrollView(
        slivers: [
          // ── Score Banner ────────────────────────────────────────────
          SliverAppBar(
            expandedHeight: 200,
            pinned: true,
            backgroundColor: const Color(0xFF0f172a),
            title: const Text('Placement Feed', style: TextStyle(fontWeight: FontWeight.w700)),
            actions: [
              IconButton(
                icon: const Icon(Icons.refresh_rounded),
                onPressed: _load,
                tooltip: 'Refresh',
              ),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
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
                            Text('${_score.toInt()}%',
                                style: TextStyle(
                                    color: _scoreColor(_score),
                                    fontWeight: FontWeight.w800,
                                    fontSize: 18)),
                            const Text('Ready',
                                style: TextStyle(color: Color(0xFF94a3b8), fontSize: 9)),
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
                            Text(
                              'Hi, ${_studentName.split(' ').first} 👋',
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 20,
                                  fontWeight: FontWeight.w800),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _scoreLabel.isEmpty ? 'Calculating readiness…' : _scoreLabel,
                              style: const TextStyle(color: Color(0xFF94a3b8), fontSize: 13),
                            ),
                            const SizedBox(height: 10),
                            Row(children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF6366f1).withOpacity(0.15),
                                  borderRadius: BorderRadius.circular(999),
                                  border: Border.all(
                                      color: const Color(0xFF6366f1).withOpacity(0.4)),
                                ),
                                child: Text(
                                  '${_drives.length} drives available',
                                  style: const TextStyle(
                                      color: Color(0xFF22d3ee),
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700),
                                ),
                              ),
                              const SizedBox(width: 8),
                              if (!_hasResume)
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFf59e0b).withOpacity(0.15),
                                    borderRadius: BorderRadius.circular(999),
                                    border: Border.all(
                                        color: const Color(0xFFf59e0b).withOpacity(0.4)),
                                  ),
                                  child: const Row(mainAxisSize: MainAxisSize.min, children: [
                                    Icon(Icons.warning_amber_rounded,
                                        size: 11, color: Color(0xFFf59e0b)),
                                    SizedBox(width: 4),
                                    Text('No Resume',
                                        style: TextStyle(
                                            color: Color(0xFFf59e0b),
                                            fontSize: 10,
                                            fontWeight: FontWeight.w700)),
                                  ]),
                                ),
                            ]),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // ── Section header ───────────────────────────────────────────
          const SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.fromLTRB(20, 20, 20, 8),
              child: Row(children: [
                Icon(Icons.local_fire_department_rounded,
                    color: Color(0xFF22d3ee), size: 18),
                SizedBox(width: 8),
                Text('Placement Opportunities',
                    style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 15)),
              ]),
            ),
          ),

          // ── Body ─────────────────────────────────────────────────────
          _loading
              ? const SliverFillRemaining(
                  child: Center(
                      child: CircularProgressIndicator(color: Color(0xFF6366f1))))
              : _error.isNotEmpty
                  ? SliverFillRemaining(child: _buildError())
                  : _drives.isEmpty
                      ? SliverFillRemaining(child: _buildEmpty())
                      : SliverList(
                          delegate: SliverChildBuilderDelegate(
                            (_, i) {
                              final drive = _drives[i] as Map<String, dynamic>;
                              final isLocked = drive['is_eligible'] == false;
                              final alreadyApplied = drive['is_applied'] == true;
                              final lockReasons = List<String>.from(
                                  drive['lock_reason'] ?? []);

                              return _DriveCard(
                                drive: drive,
                                isLocked: isLocked,
                                alreadyApplied: alreadyApplied,
                                lockReasons: lockReasons,
                                onApply: () => _apply(
                                  drive['drive_id'] as String? ??
                                      drive['_id'] as String,
                                  i,
                                ),
                              );
                            },
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
          const Text('No drives right now',
              style: TextStyle(
                  color: Color(0xFF94a3b8),
                  fontSize: 15,
                  fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          const Text('Keep your profile updated.',
              style: TextStyle(color: Color(0xFF475569), fontSize: 13)),
          const SizedBox(height: 20),
          ElevatedButton.icon(
              onPressed: _load,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry')),
        ]),
      );

  Widget _buildError() => Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.wifi_off_rounded, size: 48, color: Color(0xFFf43f5e)),
            const SizedBox(height: 12),
            Text(_error,
                style: const TextStyle(color: Color(0xFF94a3b8)),
                textAlign: TextAlign.center),
            const SizedBox(height: 16),
            ElevatedButton(onPressed: _load, child: const Text('Retry')),
          ]),
        ),
      );
}

// ── Drive Card ───────────────────────────────────────────────────────────────

class _DriveCard extends StatelessWidget {
  final Map<String, dynamic> drive;
  final bool isLocked;
  final bool alreadyApplied;
  final List<String> lockReasons;
  final VoidCallback onApply;

  const _DriveCard({
    required this.drive,
    required this.isLocked,
    required this.alreadyApplied,
    required this.lockReasons,
    required this.onApply,
  });

  void _showLockReasons(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: const Color(0xFF1e293b),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFf43f5e).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.lock_rounded,
                      color: Color(0xFFf43f5e), size: 20),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Text(
                    'Drive Locked',
                    style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.w800),
                  ),
                ),
              ]),
              const SizedBox(height: 8),
              const Text(
                'You don\'t meet the following criteria:',
                style:
                    TextStyle(color: Color(0xFF94a3b8), fontSize: 13),
              ),
              const SizedBox(height: 16),
              // Bullet-point reasons
              ...lockReasons.map((reason) => Padding(
                    padding: const EdgeInsets.symmetric(vertical: 5),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Padding(
                          padding: EdgeInsets.only(top: 3),
                          child: Icon(Icons.radio_button_checked,
                              size: 14, color: Color(0xFFf43f5e)),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            reason,
                            style: const TextStyle(
                                color: Color(0xFFcbd5e1),
                                fontSize: 14,
                                height: 1.4),
                          ),
                        ),
                      ],
                    ),
                  )),
              const SizedBox(height: 16),
              // Concluding note
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF6366f1).withOpacity(0.08),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                      color: const Color(0xFF6366f1).withOpacity(0.2)),
                ),
                child: const Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.lightbulb_outline_rounded,
                        size: 16, color: Color(0xFF6366f1)),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Improve these areas to unlock similar future drives.',
                        style: TextStyle(
                            color: Color(0xFF6366f1),
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            height: 1.4),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  style: TextButton.styleFrom(
                    backgroundColor:
                        const Color(0xFF334155),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  child: const Text('Got it',
                      style: TextStyle(
                          color: Colors.white, fontWeight: FontWeight.w700)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final company = drive['company_name'] as String? ?? 'Company';
    final role = drive['job_role'] as String? ?? '';
    final ctc = drive['package_ctc'];

    // Card is fully locked → 50% opacity
    // Card is already applied → slightly muted but still colored
    // Card is unlocked + not applied → full vibrant
    final cardOpacity = isLocked ? 0.5 : 1.0;

    return Opacity(
      opacity: cardOpacity,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: const Color(0xFF1e293b),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isLocked
                ? const Color(0xFFef4444).withOpacity(0.25)
                : alreadyApplied
                    ? const Color(0xFF10b981).withOpacity(0.25)
                    : Colors.white.withOpacity(0.07),
            width: 1.2,
          ),
          boxShadow: [
            BoxShadow(
              color: isLocked
                  ? const Color(0xFFef4444).withOpacity(0.05)
                  : Colors.black.withOpacity(0.3),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Stack(
          children: [
            Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── Company header row
                  Row(children: [
                    // Logo avatar
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: isLocked
                              ? [
                                  const Color(0xFF475569),
                                  const Color(0xFF334155)
                                ]
                              : alreadyApplied
                                  ? [
                                      const Color(0xFF059669),
                                      const Color(0xFF10b981)
                                    ]
                                  : [
                                      const Color(0xFF6366f1),
                                      const Color(0xFF8b5cf6)
                                    ],
                        ),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Center(
                        child: Text(
                          company[0].toUpperCase(),
                          style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                              fontSize: 20),
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(company,
                                style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 16)),
                            Text(role,
                                style: const TextStyle(
                                    color: Color(0xFF94a3b8), fontSize: 13)),
                          ]),
                    ),
                    if (ctc != null)
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF10b981).withOpacity(0.15),
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(
                              color: const Color(0xFF10b981).withOpacity(0.4)),
                        ),
                        child: Text('$ctc',
                            style: const TextStyle(
                                color: Color(0xFF10b981),
                                fontSize: 11,
                                fontWeight: FontWeight.w700)),
                      ),
                  ]),

                  // ── Tags
                  _tags(drive),
                  const SizedBox(height: 14),

                  // ── Action row
                  Row(children: [
                    // Primary action button
                    Expanded(
                      child: SizedBox(
                        height: 46,
                        child: alreadyApplied
                            ? _appliedButton()
                            : isLocked
                                ? _lockedButton()
                                : _applyNowButton(context),
                      ),
                    ),
                    // View Reason button (only when locked)
                    if (isLocked) ...[
                      const SizedBox(width: 10),
                      SizedBox(
                        height: 46,
                        child: OutlinedButton.icon(
                          onPressed: () => _showLockReasons(context),
                          icon: const Icon(Icons.visibility_outlined,
                              size: 16, color: Color(0xFFf43f5e)),
                          label: const Text('View Reason',
                              style: TextStyle(
                                  color: Color(0xFFf43f5e),
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700)),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(
                                color: Color(0xFFf43f5e), width: 1.5),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12)),
                            padding:
                                const EdgeInsets.symmetric(horizontal: 14),
                          ),
                        ),
                      ),
                    ],
                  ]),
                ],
              ),
            ),

            // ── Lock icon badge (top-right when locked)
            if (isLocked)
              Positioned(
                top: 12,
                right: 12,
                child: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: const Color(0xFFef4444).withOpacity(0.1),
                    shape: BoxShape.circle,
                    border: Border.all(
                        color: const Color(0xFFef4444).withOpacity(0.4)),
                  ),
                  child: const Icon(Icons.lock_rounded,
                      size: 14, color: Color(0xFFef4444)),
                ),
              ),

            // ── Applied badge (top-right when applied)
            if (alreadyApplied && !isLocked)
              Positioned(
                top: 12,
                right: 12,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFF10b981).withOpacity(0.15),
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(
                        color: const Color(0xFF10b981).withOpacity(0.5)),
                  ),
                  child: const Row(mainAxisSize: MainAxisSize.min, children: [
                    Icon(Icons.check_circle_rounded,
                        size: 12, color: Color(0xFF10b981)),
                    SizedBox(width: 4),
                    Text('Applied',
                        style: TextStyle(
                            color: Color(0xFF10b981),
                            fontSize: 11,
                            fontWeight: FontWeight.w700)),
                  ]),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _applyNowButton(BuildContext context) => ElevatedButton.icon(
        onPressed: onApply,
        icon: const Icon(Icons.send_rounded, size: 17),
        label: const Text('Apply Now',
            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF6366f1),
          foregroundColor: Colors.white,
          elevation: 0,
          shadowColor: const Color(0xFF6366f1).withOpacity(0.4),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );

  Widget _lockedButton() => ElevatedButton.icon(
        onPressed: null, // disabled
        icon: const Icon(Icons.lock_rounded, size: 16),
        label: const Text('Locked',
            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF1e293b),
          foregroundColor: const Color(0xFF64748b),
          disabledBackgroundColor: const Color(0xFF1e293b),
          disabledForegroundColor: const Color(0xFF64748b),
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: const BorderSide(color: Color(0xFF334155))),
        ),
      );

  Widget _appliedButton() => ElevatedButton.icon(
        onPressed: null, // disabled
        icon: const Icon(Icons.check_circle_outline_rounded, size: 17),
        label: const Text('Applied ✓',
            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF064e3b),
          foregroundColor: const Color(0xFF10b981),
          disabledBackgroundColor: const Color(0xFF064e3b),
          disabledForegroundColor: const Color(0xFF10b981),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );

  Widget _tags(Map<String, dynamic> d) {
    final tags = <Widget>[];
    if (d['work_location'] != null)
      tags.add(_tag('${d['work_location']}', Icons.location_on_outlined,
          const Color(0xFF22d3ee)));
    if (d['min_cgpa'] != null && (d['min_cgpa'] as num) > 0)
      tags.add(_tag('CGPA ≥ ${d['min_cgpa']}', Icons.grade_outlined,
          const Color(0xFFf59e0b)));
    if (d['application_deadline'] != null)
      tags.add(_tag('Due: ${d['application_deadline']}',
          Icons.calendar_today_outlined, const Color(0xFFf43f5e)));
    if (d['total_seats'] != null)
      tags.add(_tag('${d['total_seats']} seats', Icons.event_seat_outlined,
          const Color(0xFF8b5cf6)));
    if (tags.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Wrap(spacing: 6, runSpacing: 6, children: tags),
    );
  }

  Widget _tag(String label, IconData icon, Color color) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, size: 11, color: color),
          const SizedBox(width: 4),
          Text(label,
              style: TextStyle(
                  color: color, fontSize: 11, fontWeight: FontWeight.w600)),
        ]),
      );
}