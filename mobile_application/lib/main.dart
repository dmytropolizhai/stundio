import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile_application/core/theme/app_colors.dart';
import 'package:mobile_application/core/widgets/navigation_bar.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // Transparent status bar to match the light aesthetic.
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
    ),
  );

  runApp(const MainApp());
}

class MainApp extends StatelessWidget {
  const MainApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Stundio',
      theme: ThemeData(
        scaffoldBackgroundColor: AppColors.scaffoldBackground,
        textTheme: GoogleFonts.interTextTheme(),
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.accent,
          brightness: Brightness.light,
        ),
      ),
      home: const AppShell(),
    );
  }
}

// ── Root shell that hosts the nav bar above all pages ─────────────────────

class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _currentIndex = 0;

  // Placeholder pages — replace with your real screens.
  static const List<Widget> _pages = [
    _PlaceholderPage(title: 'Home', icon: Icons.home_rounded),
    _PlaceholderPage(title: 'Timetable', icon: Icons.schedule_rounded),
    _PlaceholderPage(title: 'Calendar', icon: Icons.calendar_today_rounded),
    _PlaceholderPage(title: 'Settings', icon: Icons.settings_rounded),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // ── Page content ──────────────────────────────────────────────
          IndexedStack(
            index: _currentIndex,
            children: _pages,
          ),

          // ── Floating navigation bar (above everything) ────────────────
          FloatingNavBar(
            currentIndex: _currentIndex,
            onIndexChanged: (index) {
              setState(() => _currentIndex = index);
            },
          ),
        ],
      ),
    );
  }
}

// ── Placeholder page widget ──────────────────────────────────────────────

class _PlaceholderPage extends StatelessWidget {
  const _PlaceholderPage({required this.title, required this.icon});

  final String title;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 48, color: AppColors.accent.withValues(alpha: 0.4)),
          const SizedBox(height: 16),
          Text(
            title,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w500,
              color: AppColors.secondary,
            ),
          ),
        ],
      ),
    );
  }
}
