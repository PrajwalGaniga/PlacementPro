import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/api_service.dart';

class ResumeScreen extends StatefulWidget {
  const ResumeScreen({super.key});
  @override
  State<ResumeScreen> createState() => _ResumeScreenState();
}

class _ResumeScreenState extends State<ResumeScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  
  List<dynamic> _templates = [];
  List<dynamic> _myResumes = [];
  String? _selectedTemplate;
  
  bool _isLoading = true;
  bool _isGenerating = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadData();
  }

  // ── Smart URL Fixer for Android Emulator ───────────────────────────────────
  String _fixUrl(String? originalUrl) {
    if (originalUrl == null || originalUrl.isEmpty) return '';
    // Automatically replaces 'localhost:8000' with your active kBaseUrl 
    // so the emulator doesn't try to look inside its own internal network.
    if (originalUrl.contains('localhost:8000')) {
      return originalUrl.replaceAll('http://localhost:8000', kBaseUrl);
    }
    return originalUrl;
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final templates = await ApiService.getResumeTemplates();
      final resumes = await ApiService.getMyResumes();
      setState(() {
        _templates = templates;
        _myResumes = resumes.reversed.toList(); // Show newest generated first
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading data: $e'), backgroundColor: Colors.redAccent)
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _generate() async {
    if (_selectedTemplate == null) return;
    setState(() => _isGenerating = true);

    try {
      await ApiService.generateResume(_selectedTemplate!);
      await _loadData(); // Refresh the saved resumes list from DB
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('🎉 Resume generated successfully!'), backgroundColor: Color(0xFF10b981))
        );
        _tabController.animateTo(1); // Auto-switch to "Saved Resumes" tab
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: const Color(0xFFf43f5e))
        );
      }
    } finally {
      if (mounted) setState(() => _isGenerating = false);
    }
  }

  Future<void> _openPdf(String url) async {
    final fixedUrl = _fixUrl(url);
    debugPrint("Opening PDF at: $fixedUrl");
    final uri = Uri.parse(fixedUrl);
    
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not open PDF')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0f172a),
      appBar: AppBar(
        title: const Text('Resume Wizard', style: TextStyle(fontWeight: FontWeight.w700)),
        backgroundColor: const Color(0xFF1e1b4b),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: const Color(0xFF6366f1),
          labelColor: const Color(0xFF6366f1),
          unselectedLabelColor: const Color(0xFF94a3b8),
          tabs: const [Tab(text: "Templates"), Tab(text: "Saved Resumes")],
        ),
      ),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator(color: Color(0xFF6366f1)))
        : TabBarView(
            controller: _tabController,
            children: [_buildTemplatesTab(), _buildSavedResumesTab()],
          ),
    );
  }

  Widget _buildTemplatesTab() {
    if (_templates.isEmpty) {
      return const Center(child: Text("No templates uploaded by TPO yet.", style: TextStyle(color: Colors.white)));
    }
    
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const Text('Choose a Template', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 16)),
        const SizedBox(height: 16),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2, crossAxisSpacing: 12, mainAxisSpacing: 12, childAspectRatio: 0.8,
          ),
          itemCount: _templates.length,
          itemBuilder: (_, i) {
            final t = _templates[i];
            final isSelected = _selectedTemplate == t['_id'];
            final thumbUrl = _fixUrl(t['thumb_url']); // Fix localhost URL!
            
            return GestureDetector(
              onTap: () => setState(() => _selectedTemplate = t['_id']),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                decoration: BoxDecoration(
                  color: const Color(0xFF1e293b),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: isSelected ? const Color(0xFF6366f1) : Colors.transparent, width: 2),
                  boxShadow: isSelected ? [BoxShadow(color: const Color(0xFF6366f1).withOpacity(0.4), blurRadius: 12)] : [],
                ),
                child: Column(
                  children: [
                    Expanded(
                      child: ClipRRect(
                        borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
                        child: thumbUrl.isNotEmpty
                            ? Image.network(
                                thumbUrl, 
                                fit: BoxFit.cover, 
                                width: double.infinity,
                                errorBuilder: (context, error, stackTrace) => Container(
                                  color: Colors.grey[800], 
                                  child: const Center(child: Icon(Icons.broken_image, color: Colors.white54, size: 40))
                                ),
                              )
                            : Container(color: Colors.grey[800], child: const Center(child: Icon(Icons.picture_as_pdf, color: Colors.white54, size: 40))),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(12.0),
                      child: Text(t['name'] ?? 'Template', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13)),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
        const SizedBox(height: 32),
        SizedBox(
          height: 54,
          child: ElevatedButton.icon(
            onPressed: (_isGenerating || _selectedTemplate == null) ? null : _generate,
            icon: _isGenerating ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.auto_awesome),
            label: Text(_isGenerating ? 'Generating...' : 'Generate Resume', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF6366f1), foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              disabledBackgroundColor: const Color(0xFF475569),
            ),
          ),
        ),
        const SizedBox(height: 80),
      ],
    );
  }

  Widget _buildSavedResumesTab() {
    if (_myResumes.isEmpty) {
      return const Center(child: Text("You haven't generated any resumes yet.", style: TextStyle(color: Color(0xFF94a3b8))));
    }
    
    return ListView.builder(
      padding: const EdgeInsets.all(20),
      itemCount: _myResumes.length,
      itemBuilder: (context, index) {
        final resume = _myResumes[index];
        final date = DateTime.tryParse(resume['generated_at'] ?? '') ?? DateTime.now();
        final formattedDate = "${date.day}/${date.month}/${date.year}";

        return Card(
          color: const Color(0xFF1e293b),
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            leading: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: const Color(0xFF6366f1).withOpacity(0.15), borderRadius: BorderRadius.circular(8)),
              child: const Icon(Icons.picture_as_pdf_rounded, color: Color(0xFF8b5cf6)),
            ),
            title: Text(resume['template_name'] ?? 'Generated Resume', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
            subtitle: Text("Generated on $formattedDate", style: const TextStyle(color: Color(0xFF94a3b8), fontSize: 12)),
            trailing: IconButton(
              icon: const Icon(Icons.download_rounded, color: Color(0xFF22d3ee)),
              onPressed: () => _openPdf(resume['pdf_url']),
            ),
          ),
        );
      },
    );
  }
}