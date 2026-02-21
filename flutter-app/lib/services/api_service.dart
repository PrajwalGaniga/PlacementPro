import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

const String kBaseUrl = 'https://dawdlingly-pseudoinsane-pa.ngrok-free.dev';
//const String kBaseUrl = 'http://10.0.2.2:8000';

class ApiService {
  // ── Token helpers ──────────────────────────────────────────────────
  static Future<String?> getToken() async {
    final p = await SharedPreferences.getInstance();
    return p.getString('token');
  }

  static Future<Map<String, String>> _headers({bool auth = true}) async {
    final token = await getToken();
    return {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      if (auth && token != null) 'Authorization': 'Bearer $token',
    };
  }

  static Future<void> saveCredentials(
      String token, String usn, String collegeId, String name) async {
    final p = await SharedPreferences.getInstance();
    await p.setString('token', token);
    await p.setString('usn', usn);
    await p.setString('college_id', collegeId);
    await p.setString('name', name);
  }

  static Future<void> saveScore(double score, String label) async {
    final p = await SharedPreferences.getInstance();
    await p.setDouble('score', score);
    await p.setString('score_label', label);
  }

  static Future<void> saveStudentJson(Map<String, dynamic> student) async {
    final p = await SharedPreferences.getInstance();
    await p.setString('student_json', jsonEncode(student));
  }

  static Future<Map<String, dynamic>?> getStudentJson() async {
    final p = await SharedPreferences.getInstance();
    final s = p.getString('student_json');
    return s != null ? jsonDecode(s) as Map<String, dynamic> : null;
  }

  static Future<void> clearAll() async {
    final p = await SharedPreferences.getInstance();
    await p.clear();
  }

  static Future<bool> isLoggedIn() async {
    final t = await getToken();
    return t != null && t.isNotEmpty;
  }

  // ── Colleges ───────────────────────────────────────────────────────
  static Future<List<dynamic>> getColleges() async {
    final res = await http.get(
      Uri.parse('$kBaseUrl/student/colleges'),
      headers: {'ngrok-skip-browser-warning': 'true'},
    );
    if (res.statusCode == 200) return jsonDecode(res.body);
    throw Exception('Could not load colleges');
  }

  // ── Analyze Resume ──────────────────────────────────────────────────
  static Future<Map<String, dynamic>> analyzeResume(String driveId, dynamic fileBytes, String fileName) async {
    final token = await getToken();
    var request = http.MultipartRequest('POST', Uri.parse('$kBaseUrl/student/analyze-resume'));
    
    request.headers.addAll({
      'Authorization': 'Bearer $token',
      'ngrok-skip-browser-warning': 'true',
    });
    
    request.fields['drive_id'] = driveId;
    
    request.files.add(http.MultipartFile.fromBytes(
      'file', 
      fileBytes,
      filename: fileName,
    ));

    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);
    
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Analysis failed: ${response.body}');
    }
  }

  // ── Resume Endpoints ────────────────────────────────────────────────
  static Future<List<dynamic>> getResumeTemplates() async {
    final res = await http.get(Uri.parse('$kBaseUrl/resume/list'), headers: await _headers());
    if (res.statusCode == 200) return jsonDecode(res.body);
    throw Exception('Failed to load templates');
  }

  static Future<List<dynamic>> getMyResumes() async {
    final res = await http.get(Uri.parse('$kBaseUrl/resume/my-resumes'), headers: await _headers());
    if (res.statusCode == 200) return jsonDecode(res.body);
    throw Exception('Failed to load your resumes');
  }

  static Future<Map<String, dynamic>> generateResume(String templateId) async {
    final res = await http.post(
      Uri.parse('$kBaseUrl/resume/generate'),
      headers: await _headers(),
      body: jsonEncode({'template_id': templateId}),
    );
    if (res.statusCode == 200) return jsonDecode(res.body);
    final err = jsonDecode(res.body);
    throw Exception(err['detail'] ?? 'Generation failed');
  }

  // ── Drive Match ATS Score ──────────────────────────────────────────
  static Future<Map<String, dynamic>> getDriveMatch(String driveId) async {
    final res = await http.get(Uri.parse('$kBaseUrl/student/drive-match/$driveId'), headers: await _headers());
    if (res.statusCode == 200) return jsonDecode(res.body);
    throw Exception('Failed to calculate ATS match');
  }

  // ── Login ──────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> studentLogin(
      String usn, String collegeId) async {
    final res = await http.post(
      Uri.parse('$kBaseUrl/student/login'),
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: jsonEncode({'usn': usn, 'college_id': collegeId}),
    );
    if (res.statusCode == 200) return jsonDecode(res.body);
    final err = jsonDecode(res.body);
    throw Exception(err['detail'] ?? 'Login failed');
  }

  // ── Eligible Drives ────────────────────────────────────────────────
  static Future<Map<String, dynamic>> getEligibleDrives() async {
    final res = await http.get(
      Uri.parse('$kBaseUrl/student/my-eligible-drives'),
      headers: await _headers(),
    );
    if (res.statusCode == 200) return jsonDecode(res.body);
    throw Exception('Failed to fetch drives');
  }

  // ── Calculate Score ────────────────────────────────────────────────
  static Future<Map<String, dynamic>> calculateScore() async {
    final p = await SharedPreferences.getInstance();
    final usn = p.getString('usn') ?? '';
    final res = await http.post(
      Uri.parse('$kBaseUrl/student/calculate-score'),
      headers: await _headers(),
      body: jsonEncode({'usn': usn, 'internships': 0, 'projects': 0}),
    );
    if (res.statusCode == 200) return jsonDecode(res.body);
    throw Exception('Score calculation failed');
  }

  // ── Update Profile ─────────────────────────────────────────────────
  static Future<Map<String, dynamic>> updateProfile(
      Map<String, dynamic> profile) async {
    final res = await http.put(
      Uri.parse('$kBaseUrl/student/update-profile'),
      headers: await _headers(),
      body: jsonEncode(profile),
    );
    if (res.statusCode == 200) return jsonDecode(res.body);
    final err = jsonDecode(res.body);
    throw Exception(err['detail'] ?? 'Profile update failed');
  }

  // ── Apply for Drive (Updated) ──────────────────────────────────────
  static Future<Map<String, dynamic>> applyDrive(String driveId, {String? resumeUrl}) async {
    final p = await SharedPreferences.getInstance();
    final res = await http.post(
      Uri.parse('$kBaseUrl/student/apply'),
      headers: await _headers(),
      body: jsonEncode({
        'drive_id': driveId, 
        'college_id': p.getString('college_id') ?? '',
        'resume_url': resumeUrl 
      }),
    );
    if (res.statusCode == 200) return jsonDecode(res.body);
    throw Exception('Apply failed');
  }

  // ── My Applications ────────────────────────────────────────────────
  static Future<List<dynamic>> getMyApplications() async {
    final res = await http.get(
      Uri.parse('$kBaseUrl/student/my-applications'),
      headers: await _headers(),
    );
    if (res.statusCode == 200) return jsonDecode(res.body);
    throw Exception('Failed to fetch applications');
  }

  // ── My Schedule ────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> getMySchedule() async {
    final res = await http.get(
      Uri.parse('$kBaseUrl/student/my-schedule'),
      headers: await _headers(),
    );
    if (res.statusCode == 200) return jsonDecode(res.body);
    throw Exception('Failed to fetch schedule');
  }

  // ═══════════════════════════════════════════════════════════════════
  // ── ALUMNI NETWORK ENDPOINTS ───────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════

  static Future<List<dynamic>> getAlumniJobs() async {
    final res = await http.get(
      Uri.parse('$kBaseUrl/student/alumni-jobs'),
      headers: await _headers(),
    );
    if (res.statusCode == 200) return jsonDecode(res.body);
    throw Exception('Failed to load alumni jobs');
  }

  static Future<List<dynamic>> getAlumniSessions() async {
    final res = await http.get(
      Uri.parse('$kBaseUrl/student/alumni-sessions'),
      headers: await _headers(),
    );
    if (res.statusCode == 200) return jsonDecode(res.body);
    throw Exception('Failed to load alumni sessions');
  }

  static Future<List<dynamic>> getMySessions() async {
    final res = await http.get(
      Uri.parse('$kBaseUrl/student/my-sessions'),
      headers: await _headers(),
    );
    if (res.statusCode == 200) return jsonDecode(res.body);
    throw Exception('Failed to load your booked sessions');
  }

  static Future<Map<String, dynamic>> applySession(String sessionId) async {
    final res = await http.post(
      Uri.parse('$kBaseUrl/student/alumni-sessions/apply'),
      headers: await _headers(),
      body: jsonEncode({'session_id': sessionId}),
    );
    if (res.statusCode == 200) return jsonDecode(res.body);
    final err = jsonDecode(res.body);
    throw Exception(err['detail'] ?? 'Failed to apply for session');
  }

  // ── PlacementBot V2 – Hybrid AI Career Analyzer ───────────────────
  static Future<Map<String, dynamic>> sendChatMessage(String message) async {
    final res = await http.post(
      Uri.parse('$kBaseUrl/bot/chat'),
      headers: await _headers(),
      body: jsonEncode({'message': message}),
    ).timeout(const Duration(seconds: 30));
    if (res.statusCode == 200) return jsonDecode(res.body);
    throw Exception('PlacementBot failed: ${res.statusCode}');
  }
}