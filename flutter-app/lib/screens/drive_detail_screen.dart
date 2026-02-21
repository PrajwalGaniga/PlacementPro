import 'package:flutter/material.dart';
import 'package:percent_indicator/circular_percent_indicator.dart';
import '../services/api_service.dart';

// Note: Ensure kBaseUrl is accessible in this file (e.g., via an import to your constants file)
// import '../utils/constants.dart'; 

class DriveDetailScreen extends StatefulWidget {
  final Map<String, dynamic> drive;

  const DriveDetailScreen({super.key, required this.drive});

  @override
  State<DriveDetailScreen> createState() => _DriveDetailScreenState();
}

class _DriveDetailScreenState extends State<DriveDetailScreen> {
  bool _isApplying = false;

  // ── Helpers ────────────────────────────────────────────────────────────────
  String _fixUrl(String? url) {
    if (url == null || url.isEmpty) return '';
    if (url.contains('localhost:8000')) {
      // Make sure kBaseUrl is imported or defined in your project
      // return url.replaceAll('http://localhost:8000', kBaseUrl); 
    }
    return url;
  }

  // ── API: Apply for Drive ───────────────────────────────────────────────────
  Future<void> _applyForDrive(String selectedResumeUrl) async {
    setState(() => _isApplying = true);
    try {
      final response = await ApiService.applyDrive(
        widget.drive['_id'], 
        resumeUrl: selectedResumeUrl
      );
      
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.check_circle, color: Colors.white),
              const SizedBox(width: 8),
              Text(response['message'] ?? 'Applied successfully!'),
            ],
          ),
          backgroundColor: const Color(0xFF10b981),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
      Navigator.pop(context, true); // Go back to feed
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString()), 
            backgroundColor: const Color(0xFFf43f5e),
            behavior: SnackBarBehavior.floating,
          )
        );
      }
    } finally {
      if (mounted) setState(() => _isApplying = false);
    }
  }

  // ── UI: Show Apply Bottom Sheet ────────────────────────────────────────────
  void _showApplyBottomSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF1e293b),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24))
      ),
      builder: (context) {
        return const _ApplySheetContent();
      },
    ).then((selectedUrl) {
      // If user selected a resume and hit submit, the sheet pops and returns the URL
      if (selectedUrl != null && selectedUrl is String) {
        _applyForDrive(selectedUrl);
      }
    });
  }

  // ── UI Helpers ─────────────────────────────────────────────────────────────
  Widget _buildSectionHeader(String title, IconData icon) {
    return Padding(
      padding: const EdgeInsets.only(top: 32, bottom: 16),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(color: const Color(0xFF6366F1).withOpacity(0.15), borderRadius: BorderRadius.circular(8)),
            child: Icon(icon, color: const Color(0xFF8b5cf6), size: 18),
          ),
          const SizedBox(width: 12),
          Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Colors.white)),
        ],
      ),
    );
  }

  Widget _buildInfoCard(List<Widget> children) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF1e293b),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: children,
      ),
    );
  }

  Widget _buildRow(String label, String? value) {
    if (value == null || value.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 100, child: Text(label, style: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF64748b), fontSize: 13))),
          Expanded(child: Text(value, style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w500))),
        ],
      ),
    );
  }

  Widget _buildTag(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(label, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w700)),
    );
  }

  // ── Build Method ───────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    final d = widget.drive;
    final company = d['company_name'] ?? 'Company';
    final isAlreadyApplied = d['_applied'] == true;

    return Scaffold(
      backgroundColor: const Color(0xFF0f172a),
      body: CustomScrollView(
        slivers: [
          // Sleek App Bar
          SliverAppBar(
            expandedHeight: 220,
            pinned: true,
            backgroundColor: const Color(0xFF0f172a),
            iconTheme: const IconThemeData(color: Colors.white),
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFF1e1b4b), Color(0xFF0f172a)],
                    begin: Alignment.topCenter, end: Alignment.bottomCenter,
                  ),
                ),
                child: SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(24, 60, 24, 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Container(
                          width: 56, height: 56,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(colors: [Color(0xFF6366f1), Color(0xFF8b5cf6)]),
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: [BoxShadow(color: const Color(0xFF6366f1).withOpacity(0.4), blurRadius: 16)],
                          ),
                          child: Center(child: Text(company[0].toUpperCase(), style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800))),
                        ),
                        const SizedBox(height: 16),
                        Text(d['job_role'] ?? 'Role Undefined', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: Colors.white)),
                        const SizedBox(height: 4),
                        Text(company, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Color(0xFF94a3b8))),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),

          // Content Body
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Quick Tags
                  Wrap(
                    spacing: 10, runSpacing: 10,
                    children: [
                      if (d['package_ctc'] != null) _buildTag(d['package_ctc'], const Color(0xFF10b981)),
                      if (d['work_location'] != null) _buildTag(d['work_location'], const Color(0xFF22d3ee)),
                      if (d['industry_category'] != null) _buildTag(d['industry_category'], const Color(0xFFa855f7)),
                    ],
                  ),
                  
                  const SizedBox(height: 24),
                  if (d['description'] != null) ...[
                    const Text("About the Role", style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Colors.white)),
                    const SizedBox(height: 12),
                    Text(d['description'], style: const TextStyle(color: Color(0xFFcbd5e1), fontSize: 14, height: 1.6)),
                  ],

                  // Logistics Section
                  _buildSectionHeader("Logistics", Icons.calendar_today_rounded),
                  _buildInfoCard([
                    _buildRow("Drive Date", d['drive_date_time']),
                    _buildRow("Venue", d['venue']),
                    _buildRow("Deadline", d['application_deadline']),
                    _buildRow("Bond", d['bond_details']),
                  ]),

                  // Requirements Section
                  _buildSectionHeader("Requirements", Icons.verified_rounded),
                  _buildInfoCard([
                    _buildRow("Min CGPA", d['min_cgpa']?.toString()),
                    _buildRow("Max Backlogs", d['max_backlogs']?.toString()),
                    _buildRow("Branches", (d['eligible_branches'] as List?)?.join(", ")),
                    _buildRow("Batches", (d['target_batches'] as List?)?.join(", ")),
                    const SizedBox(height: 8),
                    const Text("Required Skills", style: TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF64748b), fontSize: 13)),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8, runSpacing: 8,
                      children: (d['required_skills'] as List? ?? []).map((s) => Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(color: const Color(0xFF334155), borderRadius: BorderRadius.circular(6)),
                        child: Text(s.toString(), style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
                      )).toList(),
                    ),
                  ]),
                  
                  const SizedBox(height: 100), // Spacing for bottom bar
                ],
              ),
            ),
          ),
        ],
      ),
      
      // Persistent Bottom Apply Bar
      bottomNavigationBar: Container(
        padding: EdgeInsets.only(
          left: 24, right: 24, top: 16, 
          bottom: MediaQuery.of(context).padding.bottom + 16
        ),
        decoration: BoxDecoration(
          color: const Color(0xFF1e293b),
          border: Border(top: BorderSide(color: Colors.white.withOpacity(0.05))),
        ),
        child: SizedBox(
          height: 56,
          child: ElevatedButton.icon(
            onPressed:(isAlreadyApplied || _isApplying) ? null : () => _showApplyBottomSheet(),
            icon: Icon(isAlreadyApplied ? Icons.check_circle_rounded : Icons.send_rounded),
            label: _isApplying 
                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : Text(isAlreadyApplied ? "Already Applied" : "Select Resume & Apply", style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            style: ElevatedButton.styleFrom(
              backgroundColor: isAlreadyApplied ? const Color(0xFF475569) : const Color(0xFF6366f1),
              foregroundColor: Colors.white,
              disabledBackgroundColor: const Color(0xFF334155),
              disabledForegroundColor: const Color(0xFF94a3b8),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              elevation: isAlreadyApplied ? 0 : 8,
            ),
          ),
        ),
      ),
    );
  }
}

// ── This Widget handles the Bottom Sheet State ───────────────────────────────
class _ApplySheetContent extends StatefulWidget {
  const _ApplySheetContent();

  @override
  State<_ApplySheetContent> createState() => _ApplySheetContentState();
}

class _ApplySheetContentState extends State<_ApplySheetContent> {
  bool _loading = true;
  Map<String, dynamic>? _atsData;
  List<dynamic> _myResumes = [];
  String? _selectedResumeUrl;

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    try {
      // Get the drive ID from the parent context safely
      final parentState = context.findAncestorStateOfType<_DriveDetailScreenState>()!;
      final driveId = parentState.widget.drive['_id'];
      
      final ats = await ApiService.getDriveMatch(driveId);
      final resumes = await ApiService.getMyResumes();
      
      if (mounted) {
        setState(() {
          _atsData = ats;
          _myResumes = resumes.reversed.toList();
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) Navigator.pop(context); // Close if error
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const SizedBox(
        height: 300, 
        child: Center(child: CircularProgressIndicator(color: Color(0xFF6366f1)))
      );
    }

    final score = (_atsData!['score'] as num).toDouble();
    final Color color = score >= 80 
      ? const Color(0xFF10b981) 
      : (score >= 50 ? const Color(0xFFf59e0b) : const Color(0xFFf43f5e));

    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).padding.bottom + 24, 
        top: 32, 
        left: 24, 
        right: 24
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text("ATS Match Analysis", style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.white)),
          const SizedBox(height: 24),
          
          // Score
          Row(
            children: [
              CircularPercentIndicator(
                radius: 40, 
                lineWidth: 8, 
                percent: (score / 100).clamp(0.0, 1.0),
                progressColor: color, 
                backgroundColor: color.withOpacity(0.15),
                center: Text("${score.toInt()}%", style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: color)),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start, 
                  children: [
                    Text(_atsData!['readiness'], style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color)),
                    const SizedBox(height: 4),
                    if ((_atsData!['missing'] as List).isNotEmpty)
                      Text("Missing: ${(_atsData!['missing'] as List).join(', ')}", style: const TextStyle(color: Color(0xFFf43f5e), fontSize: 12))
                    else
                      const Text("Your profile has all required skills!", style: TextStyle(color: Color(0xFF10b981), fontSize: 12))
                  ]
                )
              ),
            ],
          ),
          
          const SizedBox(height: 32),
          const Align(
            alignment: Alignment.centerLeft, 
            child: Text("Select a Resume to Submit:", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold))
          ),
          const SizedBox(height: 12),

          // Resume List
          if (_myResumes.isEmpty)
            Container(
              padding: const EdgeInsets.all(16), 
              decoration: BoxDecoration(color: const Color(0xFF334155), borderRadius: BorderRadius.circular(12)),
              child: const Text("You have no resumes! Go to the Resume Wizard to generate one first.", style: TextStyle(color: Colors.white)),
            )
          else
            SizedBox(
              height: 200,
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: _myResumes.length,
                itemBuilder: (context, index) {
                  final r = _myResumes[index];
                  final isSelected = _selectedResumeUrl == r['pdf_url'];
                  return GestureDetector(
                    onTap: () => setState(() => _selectedResumeUrl = r['pdf_url']),
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 10), 
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: isSelected ? const Color(0xFF6366f1).withOpacity(0.2) : const Color(0xFF334155),
                        border: Border.all(color: isSelected ? const Color(0xFF6366f1) : Colors.transparent),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.picture_as_pdf, color: isSelected ? const Color(0xFF8b5cf6) : Colors.grey),
                          const SizedBox(width: 12),
                          Expanded(child: Text(r['template_name'] ?? 'Resume', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold))),
                          if (isSelected) const Icon(Icons.check_circle, color: Color(0xFF10b981)),
                        ]
                      ),
                    ),
                  );
                },
              ),
            ),

          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity, height: 50,
            child: ElevatedButton(
              onPressed: _selectedResumeUrl == null ? null : () => Navigator.pop(context, _selectedResumeUrl),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF6366f1), 
                foregroundColor: Colors.white, 
                disabledBackgroundColor: const Color(0xFF475569)
              ),
              child: const Text("Submit Application", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            ),
          )
        ],
      ),
    );
  }
}