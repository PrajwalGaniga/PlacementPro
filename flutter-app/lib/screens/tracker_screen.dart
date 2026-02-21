import 'package:flutter/material.dart';
import '../services/api_service.dart';

class TrackerScreen extends StatefulWidget {
  const TrackerScreen({super.key});
  @override
  State<TrackerScreen> createState() => _TrackerScreenState();
}

class _TrackerScreenState extends State<TrackerScreen> with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;
  bool _loading = true;
  List<dynamic> _apps = [];
  List<dynamic> _schedule = [];
  String _error = '';

  static const _stages = ['Applied', 'Shortlisted', 'Panel 1', 'Selected'];
  static const _stageColors = {
    'Applied':     Color(0xFF6366f1),
    'Shortlisted': Color(0xFF22d3ee),
    'Panel 1':     Color(0xFFf59e0b),
    'Selected':    Color(0xFF10b981),
  };

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = ''; });
    try {
      final apps = await ApiService.getMyApplications();
      final sched = await ApiService.getMySchedule();
      setState(() {
        _apps = apps;
        _schedule = sched['schedule'] as List<dynamic>? ?? [];
        _loading = false;
      });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Application Tracker', style: TextStyle(fontWeight: FontWeight.w700)),
        actions: [IconButton(icon: const Icon(Icons.refresh_rounded), onPressed: _load)],
        bottom: TabBar(
          controller: _tabCtrl,
          indicatorColor: const Color(0xFF6366f1),
          labelColor: const Color(0xFF6366f1),
          unselectedLabelColor: const Color(0xFF94a3b8),
          tabs: [
            Tab(text: 'Applications (${_apps.length})'),
            Tab(text: 'Schedule (${_schedule.length})'),
          ],
        ),
      ),
      body: _loading
        ? const Center(child: CircularProgressIndicator(color: Color(0xFF6366f1)))
        : _error.isNotEmpty
          ? _buildError()
          : TabBarView(
              controller: _tabCtrl,
              children: [
                _buildApplications(),
                _buildSchedule(),
              ],
            ),
    );
  }

  Widget _buildApplications() {
    if (_apps.isEmpty) {
      return const Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
        Icon(Icons.inbox_outlined, size: 56, color: Color(0xFF475569)),
        SizedBox(height: 16),
        Text("Haven't applied to any drives yet.", style: TextStyle(color: Color(0xFF94a3b8))),
        SizedBox(height: 4),
        Text("Go to the Feed tab and apply!", style: TextStyle(color: Color(0xFF475569), fontSize: 13)),
      ]));
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _apps.length,
      itemBuilder: (_, i) => _ApplicationCard(app: _apps[i], stages: _stages, colors: _stageColors),
    );
  }

  Widget _buildSchedule() {
    if (_schedule.isEmpty) {
      return const Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
        Icon(Icons.event_busy_outlined, size: 56, color: Color(0xFF475569)),
        SizedBox(height: 16),
        Text('No interviews scheduled yet.', style: TextStyle(color: Color(0xFF94a3b8))),
        SizedBox(height: 4),
        Text('Get shortlisted to see your schedule.', style: TextStyle(color: Color(0xFF475569), fontSize: 13)),
      ]));
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _schedule.length,
      itemBuilder: (_, i) => _ScheduleCard(event: _schedule[i]),
    );
  }

  Widget _buildError() => Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
    const Icon(Icons.wifi_off_rounded, size: 48, color: Color(0xFFf43f5e)),
    const SizedBox(height: 12),
    Text(_error, style: const TextStyle(color: Color(0xFF94a3b8)), textAlign: TextAlign.center),
    const SizedBox(height: 16),
    ElevatedButton(onPressed: _load, child: const Text('Retry')),
  ]));
}

// ── Application Card with Timeline ────────────────────────────────────────────

class _ApplicationCard extends StatelessWidget {
  final dynamic app;
  final List<String> stages;
  final Map<String, Color> colors;
  const _ApplicationCard({required this.app, required this.stages, required this.colors});

  @override
  Widget build(BuildContext context) {
    final status = app['status'] as String? ?? 'Applied';
    final curIdx = stages.indexOf(status).clamp(0, stages.length - 1);

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF1e293b),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.06)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Company row
        Row(children: [
          Container(
            width: 42, height: 42,
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFF6366f1), Color(0xFF8b5cf6)]),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Center(child: Text(
              ((app['company_name'] as String?) ?? 'C')[0].toUpperCase(),
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 20))),
          ),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(app['company_name']?.toString() ?? '—',
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
            Text(app['job_role']?.toString() ?? '—',
              style: const TextStyle(color: Color(0xFF94a3b8), fontSize: 13)),
          ])),
          // Status badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: (colors[status] ?? const Color(0xFF6366f1)).withOpacity(0.15),
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: (colors[status] ?? const Color(0xFF6366f1)).withOpacity(0.5)),
            ),
            child: Text(status, style: TextStyle(
              color: colors[status] ?? const Color(0xFF6366f1),
              fontSize: 11, fontWeight: FontWeight.w700)),
          ),
        ]),
        const SizedBox(height: 20),

        // Timeline
        Row(
          children: List.generate(stages.length * 2 - 1, (i) {
            if (i.isOdd) {
              final stageIdx = i ~/ 2;
              final done = stageIdx < curIdx;
              return Expanded(child: Container(height: 2,
                color: done ? const Color(0xFF6366f1) : Colors.white12));
            }
            final stageIdx = i ~/ 2;
            final done = stageIdx <= curIdx;
            final curr = stageIdx == curIdx;
            final color = colors[stages[stageIdx]] ?? const Color(0xFF6366f1);
            return Column(children: [
              Container(
                width: curr ? 26 : 20, height: curr ? 26 : 20,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: done ? color : Colors.white12,
                  border: curr ? Border.all(color: color.withOpacity(0.5), width: 4) : null,
                  boxShadow: curr ? [BoxShadow(color: color.withOpacity(0.5), blurRadius: 10)] : [],
                ),
                child: done ? const Icon(Icons.check, size: 12, color: Colors.white) : null,
              ),
              const SizedBox(height: 6),
              Text(stages[stageIdx], style: TextStyle(
                color: done ? Colors.white : const Color(0xFF475569),
                fontSize: 9, fontWeight: done ? FontWeight.w700 : FontWeight.w400)),
            ]);
          }),
        ),
        if (app['applied_at'] != null) ...[
          const SizedBox(height: 10),
          Text('Applied: ${app['applied_at'].toString().split('T')[0]}',
            style: const TextStyle(color: Color(0xFF475569), fontSize: 11)),
        ],
      ]),
    );
  }
}

// ── Schedule Card ─────────────────────────────────────────────────────────────

class _ScheduleCard extends StatelessWidget {
  final dynamic event;
  const _ScheduleCard({required this.event});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1e293b),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFf59e0b).withOpacity(0.3)),
      ),
      child: Row(children: [
        Container(
          width: 46, height: 46,
          decoration: BoxDecoration(
            color: const Color(0xFFf59e0b).withOpacity(0.15),
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Icon(Icons.event_note_rounded, color: Color(0xFFf59e0b), size: 22),
        ),
        const SizedBox(width: 16),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(event['company_name']?.toString() ?? '—',
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
          Text(event['job_role']?.toString() ?? '—',
            style: const TextStyle(color: Color(0xFF94a3b8), fontSize: 13)),
          const SizedBox(height: 4),
          Row(children: [
            const Icon(Icons.calendar_today_outlined, size: 12, color: Color(0xFFf59e0b)),
            const SizedBox(width: 4),
            Text('${event['interview_date']}  ${event['interview_time'] ?? ''}',
              style: const TextStyle(color: Color(0xFFf59e0b), fontSize: 12, fontWeight: FontWeight.w600)),
            const SizedBox(width: 12),
            const Icon(Icons.location_on_outlined, size: 12, color: Color(0xFF94a3b8)),
            const SizedBox(width: 4),
            Text(event['venue']?.toString() ?? 'Online',
              style: const TextStyle(color: Color(0xFF94a3b8), fontSize: 12)),
          ]),
        ])),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: const Color(0xFF10b981).withOpacity(0.15),
            borderRadius: BorderRadius.circular(999),
          ),
          child: Text(event['status']?.toString() ?? '',
            style: const TextStyle(color: Color(0xFF10b981), fontSize: 10, fontWeight: FontWeight.w700)),
        ),
      ]),
    );
  }
}
