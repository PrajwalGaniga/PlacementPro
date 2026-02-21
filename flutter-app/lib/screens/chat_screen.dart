import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:percent_indicator/circular_percent_indicator.dart';
import '../services/api_service.dart';

// ═══════════════════════════════════════════════════════════════
// PlacementBot V2 – Hybrid AI Career Analyzer
// Dynamic response types: text | prediction | comparison
// ═══════════════════════════════════════════════════════════════

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});
  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> with TickerProviderStateMixin {
  final _ctrl   = TextEditingController();
  final _scroll = ScrollController();
  bool _isTyping = false;

  /// Each entry: { 'isBot': bool, 'data': Map<String,dynamic> }
  final List<Map<String, dynamic>> _messages = [
    {
      'isBot': true,
      'data': {
        'type': 'text',
        'text': "👋 Hi! I'm **PlacementBot V2** – your AI Career Analyzer.\n\n"
            "Try asking me:\n"
            "• *\"What are my chances of getting placed?\"*\n"
            "• *\"Why wasn't I selected in TCS?\"*\n"
            "• *\"What skills should I learn for Google?\"*",
      }
    },
  ];

  // Quick-prompt chips
  static const _chips = [
    "My placement chance?",
    "Why not selected in Infosys?",
    "Best skills to learn",
    "Interview tips",
    "How to improve CGPA impact",
  ];

  @override
  void dispose() {
    _ctrl.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _send([String? overrideText]) async {
    final text = (overrideText ?? _ctrl.text).trim();
    if (text.isEmpty || _isTyping) return;

    setState(() {
      _messages.add({'isBot': false, 'data': {'type': 'text', 'text': text}});
      _ctrl.clear();
      _isTyping = true;
    });
    _scrollToBottom();

    try {
      final resp = await ApiService.sendChatMessage(text);
      if (!mounted) return;
      setState(() {
        _messages.add({'isBot': true, 'data': resp});
        _isTyping = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _messages.add({
          'isBot': true,
          'data': {'type': 'text', 'text': "⚠️ Connection error: ${e.toString().replaceAll('Exception: ', '')}"}
        });
        _isTyping = false;
      });
    }

    await Future.delayed(const Duration(milliseconds: 80));
    _scrollToBottom();
  }

  void _scrollToBottom() {
    if (_scroll.hasClients) {
      _scroll.animateTo(
        _scroll.position.maxScrollExtent + 400,
        duration: const Duration(milliseconds: 350),
        curve: Curves.easeOut,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: _buildAppBar(),
      body: Column(children: [
        // ── Message list ──────────────────────────────────────
        Expanded(
          child: ListView.builder(
            controller: _scroll,
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 4),
            itemCount: _messages.length + (_isTyping ? 1 : 0),
            itemBuilder: (_, i) {
              if (_isTyping && i == _messages.length) return _TypingIndicator(key: const ValueKey('typing'));
              final msg   = _messages[i];
              final isBot = msg['isBot'] as bool;
              final data  = msg['data'] as Map<String, dynamic>;
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: isBot ? _BotMessage(data: data) : _UserBubble(text: data['text'] as String),
              );
            },
          ),
        ),
        // ── Quick chips ───────────────────────────────────────
        _ChipRow(chips: _chips, onTap: (c) => _send(c), disabled: _isTyping),
        // ── Input bar ─────────────────────────────────────────
        _InputBar(
          controller: _ctrl,
          disabled: _isTyping,
          onSend: _send,
        ),
      ]),
    );
  }

  AppBar _buildAppBar() => AppBar(
    backgroundColor: const Color(0xFF0F172A),
    elevation: 0,
    centerTitle: false,
    title: Row(children: [
      Container(
        width: 36, height: 36,
        decoration: BoxDecoration(
          gradient: const LinearGradient(colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)]),
          borderRadius: BorderRadius.circular(10),
          boxShadow: [BoxShadow(color: const Color(0xFF6366F1).withOpacity(0.4), blurRadius: 12, offset: const Offset(0,4))],
        ),
        child: const Icon(Icons.psychology_alt_rounded, color: Colors.white, size: 20),
      ),
      const SizedBox(width: 10),
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('PlacementBot V2', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: Colors.white)),
        Text('Hybrid AI·ML Career Analyzer', style: TextStyle(fontSize: 10, color: Colors.white.withOpacity(0.45))),
      ]),
    ]),
    actions: [
      Padding(
        padding: const EdgeInsets.only(right: 14),
        child: Container(
          width: 8, height: 8,
          decoration: const BoxDecoration(color: Color(0xFF10B981), shape: BoxShape.circle),
        ),
      ),
    ],
    bottom: PreferredSize(
      preferredSize: const Size.fromHeight(1),
      child: Container(height: 1, color: Colors.white.withOpacity(0.06)),
    ),
  );
}

// ═══════════════════════════════════════════════════════════════
// Bot message dispatcher
// ═══════════════════════════════════════════════════════════════
class _BotMessage extends StatelessWidget {
  final Map<String, dynamic> data;
  const _BotMessage({required this.data});

  @override
  Widget build(BuildContext context) {
    final type = data['type'] as String? ?? 'text';
    return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      // Avatar
      Container(
        width: 30, height: 30, margin: const EdgeInsets.only(right: 8, top: 2),
        decoration: BoxDecoration(
          gradient: const LinearGradient(colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)]),
          borderRadius: BorderRadius.circular(8),
        ),
        child: const Icon(Icons.psychology_alt_rounded, color: Colors.white, size: 16),
      ),
      Flexible(child: switch (type) {
        'prediction' => _PredictionCard(data: data),
        'comparison' => _ComparisonCard(data: data),
        _            => _TextBubble(text: data['text'] as String? ?? '…'),
      }),
    ]);
  }
}

// ═══════════════════════════════════════════════════════════════
// 1. Plain text bubble (Markdown-lite)
// ═══════════════════════════════════════════════════════════════
class _TextBubble extends StatelessWidget {
  final String text;
  const _TextBubble({required this.text});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    decoration: BoxDecoration(
      color: const Color(0xFF1E293B),
      borderRadius: const BorderRadius.only(
        topLeft: Radius.circular(4), topRight: Radius.circular(16),
        bottomLeft: Radius.circular(16), bottomRight: Radius.circular(16),
      ),
      border: Border.all(color: Colors.white.withOpacity(0.06)),
    ),
    child: _MarkdownText(text: text),
  );
}

class _MarkdownText extends StatelessWidget {
  final String text;
  const _MarkdownText({required this.text});

  @override
  Widget build(BuildContext context) {
    // Simple markdown: **bold**, *italic*, bullet points
    final lines = text.split('\n');
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: lines.map((line) {
        final isBullet = line.trimLeft().startsWith('•') || line.trimLeft().startsWith('-') || line.trimLeft().startsWith('*') && !line.contains('**');
        return Padding(
          padding: const EdgeInsets.only(bottom: 3),
          child: _StyledText(text: line, isBullet: isBullet),
        );
      }).toList(),
    );
  }
}

class _StyledText extends StatelessWidget {
  final String text;
  final bool isBullet;
  const _StyledText({required this.text, this.isBullet = false});

  @override
  Widget build(BuildContext context) {
    String display = text;
    // Remove leading bullet markers
    if (isBullet) display = display.replaceFirst(RegExp(r'^[\s\-•*]+'), '').trim();

    // Build spans for **bold**
    final spans = <InlineSpan>[];
    final pattern = RegExp(r'\*\*(.+?)\*\*|\*(.+?)\*');
    int last = 0;
    for (final m in pattern.allMatches(display)) {
      if (m.start > last) spans.add(TextSpan(text: display.substring(last, m.start)));
      if (m.group(1) != null) {
        spans.add(TextSpan(text: m.group(1), style: const TextStyle(fontWeight: FontWeight.w700, color: Colors.white)));
      } else {
        spans.add(TextSpan(text: m.group(2), style: const TextStyle(fontStyle: FontStyle.italic, color: Color(0xFFCBD5E1))));
      }
      last = m.end;
    }
    if (last < display.length) spans.add(TextSpan(text: display.substring(last)));

    final richText = RichText(
      text: TextSpan(
        style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 14, height: 1.55),
        children: spans,
      ),
    );
    if (!isBullet) return richText;
    return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('• ', style: TextStyle(color: Color(0xFF6366F1), fontSize: 16, height: 1.3)),
      Expanded(child: richText),
    ]);
  }
}

// ═══════════════════════════════════════════════════════════════
// 2. Prediction card
// ═══════════════════════════════════════════════════════════════
class _PredictionCard extends StatelessWidget {
  final Map<String, dynamic> data;
  const _PredictionCard({required this.data});

  Color _probColor(double p) {
    if (p >= 75) return const Color(0xFF10B981);
    if (p >= 50) return const Color(0xFFF59E0B);
    return const Color(0xFFEF4444);
  }

  @override
  Widget build(BuildContext context) {
    final prob   = (data['probability'] as num?)?.toDouble() ?? 0;
    final cgpa   = data['cgpa'];
    final coding = data['coding_score'];
    final comm   = data['comm_score'];
    final projs  = data['projects'];
    final blogs  = data['backlogs'];
    final color  = _probColor(prob);
    final pct    = prob / 100;

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [color.withOpacity(0.08), const Color(0xFF1E293B)],
          begin: Alignment.topLeft, end: Alignment.bottomRight,
        ),
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(4), topRight: Radius.circular(16),
          bottomLeft: Radius.circular(16), bottomRight: Radius.circular(16),
        ),
        border: Border.all(color: color.withOpacity(0.35)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Header
        Row(children: [
          const Icon(Icons.auto_graph_rounded, color: Color(0xFF818CF8), size: 16),
          const SizedBox(width: 6),
          const Text('ML Placement Prediction', style: TextStyle(color: Color(0xFF818CF8), fontSize: 12, fontWeight: FontWeight.w700)),
        ]),
        const SizedBox(height: 16),
        // Gauge + metrics side by side
        Row(crossAxisAlignment: CrossAxisAlignment.center, children: [
          // Circular gauge
          CircularPercentIndicator(
            radius: 52,
            lineWidth: 9,
            percent: pct.clamp(0.0, 1.0),
            center: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              Text('${prob.toStringAsFixed(1)}%',
                  style: TextStyle(color: color, fontSize: 16, fontWeight: FontWeight.w800)),
              Text('chance', style: TextStyle(color: color.withOpacity(0.7), fontSize: 9)),
            ]),
            progressColor: color,
            backgroundColor: color.withOpacity(0.12),
            circularStrokeCap: CircularStrokeCap.round,
            animation: true,
            animationDuration: 1200,
          ),
          const SizedBox(width: 18),
          // Metric pills
          Expanded(child: Column(children: [
            _MetricRow(icon: Icons.school_rounded, label: 'CGPA', value: '$cgpa'),
            const SizedBox(height: 6),
            _MetricRow(icon: Icons.code_rounded, label: 'Coding', value: '${coding?.toStringAsFixed(1)}/10'),
            const SizedBox(height: 6),
            _MetricRow(icon: Icons.record_voice_over_rounded, label: 'Comm', value: '${comm?.toStringAsFixed(1)}/10'),
            const SizedBox(height: 6),
            _MetricRow(icon: Icons.rocket_launch_rounded, label: 'Projects', value: '$projs'),
            const SizedBox(height: 6),
            _MetricRow(icon: Icons.warning_amber_rounded, label: 'Backlogs', value: '$blogs',
                valueColor: (blogs as int? ?? 0) > 0 ? const Color(0xFFEF4444) : null),
          ])),
        ]),
        const SizedBox(height: 14),
        // Footer note
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.04),
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Row(children: [
            Icon(Icons.info_outline_rounded, color: Color(0xFF64748B), size: 13),
            SizedBox(width: 6),
            Expanded(child: Text('Based on ML analysis of CGPA, Skills, Projects & Backlogs',
                style: TextStyle(color: Color(0xFF64748B), fontSize: 11, height: 1.4))),
          ]),
        ),
      ]),
    );
  }
}

class _MetricRow extends StatelessWidget {
  final IconData icon;
  final String label, value;
  final Color? valueColor;
  const _MetricRow({required this.icon, required this.label, required this.value, this.valueColor});
  @override
  Widget build(BuildContext context) => Row(children: [
    Icon(icon, color: const Color(0xFF475569), size: 14),
    const SizedBox(width: 6),
    Text('$label ', style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
    const Spacer(),
    Text(value, style: TextStyle(color: valueColor ?? const Color(0xFFCBD5E1), fontSize: 12, fontWeight: FontWeight.w700)),
  ]);
}

// ═══════════════════════════════════════════════════════════════
// 3. Comparison card
// ═══════════════════════════════════════════════════════════════
class _ComparisonCard extends StatelessWidget {
  final Map<String, dynamic> data;
  const _ComparisonCard({required this.data});

  @override
  Widget build(BuildContext context) {
    final company  = data['company'] as String? ?? 'the company';
    final cData    = data['data'] as Map<String, dynamic>? ?? {};
    final sims     = List<String>.from(cData['similarities'] ?? []);
    final gaps     = List<String>.from(cData['gaps'] ?? []);
    final actions  = List<String>.from(cData['action_steps'] ?? []);
    final ideal    = data['ideal'] as Map<String, dynamic>? ?? {};
    final student  = data['student'] as Map<String, dynamic>? ?? {};

    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(4), topRight: Radius.circular(16),
          bottomLeft: Radius.circular(16), bottomRight: Radius.circular(16),
        ),
        border: Border.all(color: Colors.white.withOpacity(0.07)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // ── Header ──────────────────────────────────────────
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)]),
            borderRadius: const BorderRadius.only(topLeft: Radius.circular(4), topRight: Radius.circular(16)),
          ),
          child: Row(children: [
            const Icon(Icons.compare_arrows_rounded, color: Colors.white, size: 16),
            const SizedBox(width: 8),
            Expanded(child: Text('Profile Analysis vs. $company',
                style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w700))),
          ]),
        ),
        Padding(
          padding: const EdgeInsets.all(14),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            // ── Side-by-side CGPA ──────────────────────────
            Row(children: [
              Expanded(child: _ProfileMini(
                title: 'Your Profile',
                cgpa: '${student['cgpa'] ?? '—'}',
                skills: (student['skills'] as List?)?.cast<String>() ?? [],
                color: const Color(0xFF6366F1),
              )),
              const SizedBox(width: 10),
              Expanded(child: _ProfileMini(
                title: ideal['sample_count'] == 0 ? 'Ideal Candidate' : 'Avg Selected',
                cgpa: '${ideal['avg_cgpa'] ?? '—'}',
                skills: (ideal['top_skills'] as List?)?.cast<String>() ?? [],
                color: const Color(0xFF10B981),
              )),
            ]),
            const SizedBox(height: 14),
            // ── Similarities ───────────────────────────────
            if (sims.isNotEmpty) ...[
              _SectionLabel(icon: Icons.check_circle_outline_rounded, label: 'Strengths / Similarities', color: const Color(0xFF10B981)),
              const SizedBox(height: 6),
              ...sims.map((s) => _BulletItem(text: s, icon: Icons.check_circle_rounded, color: const Color(0xFF10B981))),
              const SizedBox(height: 10),
            ],
            // ── Gaps ───────────────────────────────────────
            if (gaps.isNotEmpty) ...[
              _SectionLabel(icon: Icons.warning_rounded, label: 'Skill / Profile Gaps', color: const Color(0xFFF59E0B)),
              const SizedBox(height: 6),
              ...gaps.map((g) => _BulletItem(text: g, icon: Icons.warning_amber_rounded, color: const Color(0xFFF59E0B))),
              const SizedBox(height: 10),
            ],
            // ── Action Plan ────────────────────────────────
            if (actions.isNotEmpty) ...[
              _SectionLabel(icon: Icons.rocket_launch_rounded, label: 'Action Plan', color: const Color(0xFF818CF8)),
              const SizedBox(height: 6),
              ...actions.asMap().entries.map((e) => _BulletItem(
                text: e.value,
                icon: Icons.arrow_forward_ios_rounded,
                color: const Color(0xFF818CF8),
                prefix: '${e.key + 1}. ',
              )),
            ],
          ]),
        ),
      ]),
    );
  }
}

class _ProfileMini extends StatelessWidget {
  final String title, cgpa;
  final List<String> skills;
  final Color color;
  const _ProfileMini({required this.title, required this.cgpa, required this.skills, required this.color});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(10),
    decoration: BoxDecoration(
      color: color.withOpacity(0.07),
      borderRadius: BorderRadius.circular(10),
      border: Border.all(color: color.withOpacity(0.25)),
    ),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(title, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w700)),
      const SizedBox(height: 4),
      Text('CGPA $cgpa', style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w800)),
      const SizedBox(height: 6),
      Wrap(spacing: 4, runSpacing: 4, children: skills.take(4).map((s) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
        decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(4)),
        child: Text(s, style: TextStyle(color: color, fontSize: 9, fontWeight: FontWeight.w600)),
      )).toList()),
    ]),
  );
}

class _SectionLabel extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  const _SectionLabel({required this.icon, required this.label, required this.color});
  @override
  Widget build(BuildContext context) => Row(children: [
    Icon(icon, color: color, size: 14),
    const SizedBox(width: 6),
    Text(label, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: .4)),
  ]);
}

class _BulletItem extends StatelessWidget {
  final String text;
  final IconData icon;
  final Color color;
  final String prefix;
  const _BulletItem({required this.text, required this.icon, required this.color, this.prefix = ''});
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 5, left: 2),
    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Icon(icon, color: color, size: 13),
      const SizedBox(width: 7),
      Expanded(child: Text('$prefix$text',
          style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 13, height: 1.45))),
    ]),
  );
}

// ═══════════════════════════════════════════════════════════════
// User bubble
// ═══════════════════════════════════════════════════════════════
class _UserBubble extends StatelessWidget {
  final String text;
  const _UserBubble({required this.text});
  @override
  Widget build(BuildContext context) => Row(
    mainAxisAlignment: MainAxisAlignment.end,
    children: [
      Flexible(child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          gradient: const LinearGradient(colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)]),
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(16), topRight: Radius.circular(4),
            bottomLeft: Radius.circular(16), bottomRight: Radius.circular(16),
          ),
          boxShadow: [BoxShadow(color: const Color(0xFF6366F1).withOpacity(0.25), blurRadius: 12, offset: const Offset(0,4))],
        ),
        child: Text(text, style: const TextStyle(color: Colors.white, fontSize: 14, height: 1.5)),
      )),
    ],
  );
}

// ═══════════════════════════════════════════════════════════════
// Typing indicator (animated 3-dot bounce)
// ═══════════════════════════════════════════════════════════════
class _TypingIndicator extends StatefulWidget {
  const _TypingIndicator({super.key});
  @override
  State<_TypingIndicator> createState() => _TypingIndicatorState();
}

class _TypingIndicatorState extends State<_TypingIndicator> with SingleTickerProviderStateMixin {
  late AnimationController _anim;

  @override
  void initState() {
    super.initState();
    _anim = AnimationController(vsync: this, duration: const Duration(milliseconds: 1200))..repeat();
  }

  @override
  void dispose() { _anim.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Container(
        width: 30, height: 30, margin: const EdgeInsets.only(right: 8, top: 2),
        decoration: BoxDecoration(
          gradient: const LinearGradient(colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)]),
          borderRadius: BorderRadius.circular(8),
        ),
        child: const Icon(Icons.psychology_alt_rounded, color: Colors.white, size: 16),
      ),
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: const Color(0xFF1E293B),
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(4), topRight: Radius.circular(16),
            bottomLeft: Radius.circular(16), bottomRight: Radius.circular(16),
          ),
          border: Border.all(color: Colors.white.withOpacity(0.06)),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: List.generate(3, (i) {
          final delay = i * 0.3;
          return AnimatedBuilder(
            animation: _anim,
            builder: (_, __) {
              final val = ((_anim.value - delay).clamp(0.0, 1.0));
              final bounce = val < 0.5 ? val * 2 : (1 - val) * 2;
              return Container(
                width: 7, height: 7,
                margin: const EdgeInsets.symmetric(horizontal: 3),
                decoration: BoxDecoration(
                  color: Color.lerp(const Color(0xFF475569), const Color(0xFF818CF8), bounce),
                  shape: BoxShape.circle,
                ),
                transform: Matrix4.translationValues(0, -bounce * 5, 0),
              );
            },
          );
        })),
      ),
    ]),
  );
}

// ═══════════════════════════════════════════════════════════════
// Quick-reply chip row
// ═══════════════════════════════════════════════════════════════
class _ChipRow extends StatelessWidget {
  final List<String> chips;
  final void Function(String) onTap;
  final bool disabled;
  const _ChipRow({required this.chips, required this.onTap, required this.disabled});
  @override
  Widget build(BuildContext context) => SizedBox(
    height: 40,
    child: ListView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      children: chips.map((c) => Padding(
        padding: const EdgeInsets.only(right: 8),
        child: ActionChip(
          label: Text(c, style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: disabled ? const Color(0xFF475569) : const Color(0xFF818CF8),
          )),
          backgroundColor: const Color(0xFF6366F1).withOpacity(disabled ? 0.04 : 0.1),
          side: BorderSide(color: const Color(0xFF6366F1).withOpacity(disabled ? 0.1 : 0.35)),
          padding: const EdgeInsets.symmetric(horizontal: 4),
          onPressed: disabled ? null : () => onTap(c),
        ),
      )).toList(),
    ),
  );
}

// ═══════════════════════════════════════════════════════════════
// Input bar
// ═══════════════════════════════════════════════════════════════
class _InputBar extends StatelessWidget {
  final TextEditingController controller;
  final bool disabled;
  final Future<void> Function([String?]) onSend;
  const _InputBar({required this.controller, required this.disabled, required this.onSend});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.fromLTRB(12, 8, 12, 16),
    decoration: BoxDecoration(
      color: const Color(0xFF0F172A),
      border: Border(top: BorderSide(color: Colors.white.withOpacity(0.06))),
    ),
    child: SafeArea(
      top: false,
      child: Row(children: [
        Expanded(
          child: Container(
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: Colors.white.withOpacity(0.08)),
            ),
            child: TextField(
              controller: controller,
              enabled: !disabled,
              style: const TextStyle(color: Colors.white, fontSize: 14),
              onSubmitted: (_) => onSend(),
              maxLines: 3, minLines: 1,
              textCapitalization: TextCapitalization.sentences,
              decoration: InputDecoration(
                hintText: disabled ? 'PlacementBot is thinking…' : 'Ask me anything about your career…',
                hintStyle: TextStyle(color: Colors.white.withOpacity(0.3), fontSize: 13),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
              ),
            ),
          ),
        ),
        const SizedBox(width: 10),
        GestureDetector(
          onTap: disabled ? null : () => onSend(),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            width: 46, height: 46,
            decoration: BoxDecoration(
              gradient: disabled
                ? const LinearGradient(colors: [Color(0xFF334155), Color(0xFF334155)])
                : const LinearGradient(colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)]),
              borderRadius: BorderRadius.circular(23),
              boxShadow: disabled ? [] : [
                BoxShadow(color: const Color(0xFF6366F1).withOpacity(0.4), blurRadius: 14, offset: const Offset(0, 4)),
              ],
            ),
            child: disabled
              ? const Padding(padding: EdgeInsets.all(13),
                  child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF64748B)))
              : const Icon(Icons.send_rounded, color: Colors.white, size: 20),
          ),
        ),
      ]),
    ),
  );
}
