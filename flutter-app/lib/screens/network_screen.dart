import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/api_service.dart';

class NetworkScreen extends StatefulWidget {
  const NetworkScreen({super.key});
  @override
  State<NetworkScreen> createState() => _NetworkScreenState();
}

class _NetworkScreenState extends State<NetworkScreen> with SingleTickerProviderStateMixin {
  late TabController _tabs;

  List<dynamic> _jobs = [];
  List<dynamic> _sessions = [];
  List<dynamic> _mine = [];

  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final jobs = await ApiService.getAlumniJobs();
      final sessions = await ApiService.getAlumniSessions();
      final mine = await ApiService.getMySessions();

      if (mounted) {
        setState(() {
          _jobs = jobs;
          _sessions = sessions;
          _mine = mine;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        _showSnack(e.toString(), isError: true);
        setState(() => _loading = false);
      }
    }
  }

  void _showSnack(String msg, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg, style: const TextStyle(fontWeight: FontWeight.w600)),
        backgroundColor: isError ? const Color(0xFFf43f5e) : const Color(0xFF10b981),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  Future<void> _applyForSession(String sessionId) async {
    try {
      await ApiService.applySession(sessionId);
      if (mounted) {
        _showSnack('Session Requested Successfully! Waiting for Alumni approval.');
        await _loadData(); 
        _tabs.animateTo(2); // Auto-switch to "My Bookings" tab
      }
    } catch (e) {
      if (mounted) _showSnack(e.toString(), isError: true);
    }
  }

  // ── Smarter URL Launcher (Auto-fixes missing https://) ─────────────────────
  Future<void> _launchUrl(String link) async {
    if (link.isEmpty) {
      _showSnack('No link was provided.', isError: true);
      return;
    }
    
    String finalLink = link.trim();
    if (!finalLink.startsWith('http://') && !finalLink.startsWith('https://') && !finalLink.contains('@')) {
      finalLink = 'https://$finalLink';
    }

    final uri = Uri.tryParse(finalLink.contains('@') && !finalLink.contains('mailto:') ? 'mailto:$finalLink' : finalLink);
    
    if (uri != null && await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      _showSnack('Could not open the link. Invalid format.', isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0f172a),
      appBar: AppBar(
        title: const Text('Alumni Connect', style: TextStyle(fontWeight: FontWeight.w800, color: Colors.white)),
        backgroundColor: const Color(0xFF1e1b4b),
        elevation: 0,
        bottom: TabBar(
          controller: _tabs,
          indicatorColor: const Color(0xFF6366f1),
          indicatorWeight: 3,
          labelColor: const Color(0xFF6366f1),
          unselectedLabelColor: const Color(0xFF94a3b8),
          labelStyle: const TextStyle(fontWeight: FontWeight.bold),
          tabs: const [Tab(text: "Referrals"), Tab(text: "Mentors"), Tab(text: "My Bookings")],
        ),
      ),
      body: _loading 
        ? const Center(child: CircularProgressIndicator(color: Color(0xFF6366f1)))
        : TabBarView(
            controller: _tabs,
            children: [
              RefreshIndicator(onRefresh: _loadData, color: const Color(0xFF6366f1), child: _buildJobsTab()),
              RefreshIndicator(onRefresh: _loadData, color: const Color(0xFF6366f1), child: _buildSessionsTab()),
              RefreshIndicator(onRefresh: _loadData, color: const Color(0xFF6366f1), child: _buildMineTab()),
            ],
          ),
    );
  }

  // ── Tab 1: Job Referrals ───────────────────────────────────────────────────
  Widget _buildJobsTab() {
    if (_jobs.isEmpty) return _emptyState(Icons.work_outline_rounded, "No referral jobs posted yet.");
    
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _jobs.length,
      itemBuilder: (ctx, i) {
        final j = _jobs[i];
        return _Card(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              _Avatar(letter: j['company_name']?[0] ?? 'C', gradient: const LinearGradient(colors: [Color(0xFF6366f1), Color(0xFF8b5cf6)])),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(j['role'] ?? 'Role', style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.bold)),
                Text(j['company_name'] ?? 'Company', style: const TextStyle(color: Color(0xFF6366f1), fontWeight: FontWeight.w600, fontSize: 14)),
              ])),
            ]),
            const SizedBox(height: 16),
            Text(j['description'] ?? '', style: const TextStyle(color: Color(0xFFcbd5e1), fontSize: 14, height: 1.5)),
            const SizedBox(height: 16),
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Row(
                children: [
                  const Icon(Icons.person_outline_rounded, color: Color(0xFF64748b), size: 16),
                  const SizedBox(width: 4),
                  Text(j['alumni_name'] ?? 'Alumni', style: const TextStyle(color: Color(0xFF94a3b8), fontSize: 13, fontWeight: FontWeight.w500)),
                ],
              ),
              ElevatedButton.icon(
                onPressed: () => _launchUrl(j['apply_link_or_email'] ?? ''),
                icon: const Icon(Icons.open_in_new_rounded, size: 16),
                label: const Text("Apply", style: TextStyle(fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF334155), 
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))
                ),
              )
            ])
          ]),
        );
      },
    );
  }

  // ── Tab 2: Mentor Sessions ─────────────────────────────────────────────────
  Widget _buildSessionsTab() {
    if (_sessions.isEmpty) return _emptyState(Icons.video_camera_front_outlined, "No active mentor sessions right now.");
    
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _sessions.length,
      itemBuilder: (ctx, i) {
        final s = _sessions[i];
        return _Card(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              _Pill(text: s['session_type'] ?? 'Session', bg: const Color(0xFF10b981).withOpacity(0.15), color: const Color(0xFF10b981)),
              if (s['is_paid'] == true) _Pill(text: "₹${s['price']}", bg: const Color(0xFFf59e0b).withOpacity(0.15), color: const Color(0xFFf59e0b))
              else _Pill(text: "Free", bg: const Color(0xFF6366f1).withOpacity(0.15), color: const Color(0xFF8b5cf6)),
            ]),
            const SizedBox(height: 16),
            Text("${s['alumni_name']}", style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
            Text("${s['alumni_title']} @ ${s['alumni_company']}", style: const TextStyle(color: Color(0xFF94a3b8), fontSize: 14, fontWeight: FontWeight.w500)),
            const SizedBox(height: 12),
            Text(s['description'] ?? '', style: const TextStyle(color: Color(0xFFcbd5e1), fontSize: 14, height: 1.5)),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 46,
              child: ElevatedButton(
                onPressed: () => _applyForSession(s['_id']),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF6366f1), 
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 0
                ),
                child: const Text("Request Session", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
              ),
            )
          ]),
        );
      },
    );
  }

  // ── Tab 3: My Bookings ─────────────────────────────────────────────────────
  Widget _buildMineTab() {
    if (_mine.isEmpty) return _emptyState(Icons.event_available_rounded, "You haven't booked any sessions.");
    
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _mine.length,
      itemBuilder: (ctx, i) {
        final m = _mine[i];
        final status = m['status'] ?? 'Applied';
        final isScheduled = status == 'Scheduled';
        final isCompleted = status == 'Completed';

        return _Card(
          borderColor: isScheduled ? const Color(0xFF10b981).withOpacity(0.4) : null,
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Text(m['session_type'] ?? 'Session', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
              _Pill(
                text: status, 
                bg: isScheduled ? const Color(0xFF10b981).withOpacity(0.15) 
                  : isCompleted ? const Color(0xFFf59e0b).withOpacity(0.15) 
                  : const Color(0xFF334155), 
                color: isScheduled ? const Color(0xFF10b981) 
                     : isCompleted ? const Color(0xFFf59e0b) 
                     : Colors.white,
              ),
            ]),
            const SizedBox(height: 8),
            Text("Mentor: ${m['alumni_name']}", style: const TextStyle(color: Color(0xFFcbd5e1), fontSize: 14)),
            
            // 🚨 HIGHLIGHTED SCHEDULED MEETING DETAILS & CTA 🚨
            if (isScheduled && m['scheduled_date'] != null && m['scheduled_date'].toString().isNotEmpty) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF10b981).withOpacity(0.08),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFF10b981).withOpacity(0.3))
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text("Meeting Scheduled", style: TextStyle(color: Color(0xFF10b981), fontSize: 13, fontWeight: FontWeight.w800, letterSpacing: 0.5)),
                    const SizedBox(height: 12),
                    Row(children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(color: const Color(0xFF10b981).withOpacity(0.2), borderRadius: BorderRadius.circular(8)),
                        child: const Icon(Icons.calendar_month_rounded, color: Color(0xFF10b981), size: 20),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text("${m['scheduled_date']} • ${m['scheduled_time']}", style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                      ),
                    ]),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton.icon(
                        onPressed: () => _launchUrl(m['meeting_link'] ?? ''),
                        icon: const Icon(Icons.video_call_rounded, size: 22),
                        label: const Text("Join Meeting", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF10b981), 
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          elevation: 4,
                          shadowColor: const Color(0xFF10b981).withOpacity(0.4)
                        ),
                      ),
                    )
                  ]
                )
              )
            ],

            if (isCompleted) ...[
              const Divider(color: Colors.white12, height: 32),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(color: const Color(0xFFf59e0b).withOpacity(0.2), shape: BoxShape.circle),
                    child: const Icon(Icons.check_rounded, color: Color(0xFFf59e0b), size: 16),
                  ),
                  const SizedBox(width: 12),
                  const Text("Session Completed", style: TextStyle(color: Color(0xFFf59e0b), fontWeight: FontWeight.bold, fontSize: 15)),
                ]
              )
            ]
          ]),
        );
      },
    );
  }

  // ── UI Helpers ───────────────────────────────────────────────────────────────
  Widget _emptyState(IconData icon, String message) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 64, color: const Color(0xFF334155)),
          const SizedBox(height: 16),
          Text(message, style: const TextStyle(color: Color(0xFF94a3b8), fontSize: 15, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}

class _Card extends StatelessWidget {
  final Widget child;
  final Color? borderColor;
  const _Card({required this.child, this.borderColor});

  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(bottom: 16), 
    padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(
      color: const Color(0xFF1E293B), 
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: borderColor ?? Colors.white.withOpacity(0.05)),
      boxShadow: [
        BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 10, offset: const Offset(0, 4))
      ]
    ),
    child: child,
  );
}

class _Avatar extends StatelessWidget {
  final String letter;
  final Gradient gradient;
  final double size;
  const _Avatar({required this.letter, required this.gradient, this.size = 48});

  @override
  Widget build(BuildContext context) => Container(
    width: size, height: size,
    decoration: BoxDecoration(gradient: gradient, borderRadius: BorderRadius.circular(14)),
    child: Center(child: Text(letter.toUpperCase(), style: TextStyle(color: Colors.white, fontSize: size * 0.45, fontWeight: FontWeight.w800))),
  );
}

class _Pill extends StatelessWidget {
  final String text;
  final Color bg, color;
  const _Pill({required this.text, required this.bg, required this.color});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
    decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
    child: Text(text, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w800, letterSpacing: 0.5)),
  );
}