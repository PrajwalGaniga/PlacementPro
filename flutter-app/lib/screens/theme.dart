import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  static const primary = Color(0xFFC6FF3D);
  static const bg = Color(0xFF0F172A);
  static const surface = Color(0xFF1E293B);
  static const card = Color(0xFF111827);
  static const textPri = Color(0xFFF1F5F9);
  static const textSec = Color(0xFF94A3B8);
  static const divider = Color(0xFF1F2937);
  
  static const subtleGrad = LinearGradient(
    colors: [surface, bg],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static ThemeData get darkTheme => ThemeData(
    brightness: Brightness.dark,
    scaffoldBackgroundColor: bg,
    primaryColor: primary,
    colorScheme: const ColorScheme.dark(primary: primary, surface: surface),
    textTheme: GoogleFonts.interTextTheme().apply(
      bodyColor: textSec,
      displayColor: textPri,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primary,
        foregroundColor: bg,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        minimumSize: const Size.fromHeight(48),
        elevation: 8,
        shadowColor: primary.withOpacity(0.2),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
      ),
    ),
  );
}