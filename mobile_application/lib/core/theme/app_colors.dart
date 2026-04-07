import 'package:flutter/material.dart';

/// Centralized color palette for the application.
/// Equivalent to CSS custom properties / design tokens in globals.css.
///
/// Usage:
///   AppColors.primary
///   AppColors.secondary
///   AppColors.neutral
///   AppColors.accent
abstract final class AppColors {
  // ── Brand Colors ──────────────────────────────────────────────────────

  /// Primary — soft blue tint used for backgrounds, highlights, indicators.
  static const Color primary = Color(0xFFC9DEFF);

  /// Secondary — deep navy used for headings, active icons, strong text.
  static const Color secondary = Color(0xFF2C3E50);

  /// Neutral — muted slate used for inactive icons, helper text.
  static const Color neutral = Color(0xFF4A5568);

  /// Accent — vivid blue used for interactive elements, buttons.
  static const Color accent = Color(0xFF5B8DEF);

  // ── Surface Colors ────────────────────────────────────────────────────

  /// Navigation bar background.
  static const Color navBarBackground = Color(0xFFFFFFFF);

  /// Navigation bar shadow.
  static const Color navBarShadow = Color(0x1A2C3E50);

  /// Page scaffold background.
  static const Color scaffoldBackground = Color(0xFFF7F9FC);

  // ── Indicator ─────────────────────────────────────────────────────────

  /// The animated pill / dot behind the active tab icon.
  static const Color activeIndicator = primary;
}
