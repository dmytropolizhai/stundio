import 'package:flutter/material.dart';
import 'package:mobile_application/core/theme/app_colors.dart';

/// Data class describing a single tab inside [FloatingNavBar].
class NavBarItem {
  const NavBarItem({required this.icon, required this.activeIcon});

  final IconData icon;
  final IconData activeIcon;
}

/// A floating bottom navigation bar with a smooth animated circular indicator.
///
/// Place this inside a [Stack] at the root layout so it floats above all
/// screens. The bar is 300px wide, centered horizontally.
class FloatingNavBar extends StatefulWidget {
  const FloatingNavBar({
    super.key,
    required this.currentIndex,
    required this.onIndexChanged,
  });

  final int currentIndex;
  final ValueChanged<int> onIndexChanged;

  @override
  State<FloatingNavBar> createState() => _FloatingNavBarState();
}

class _FloatingNavBarState extends State<FloatingNavBar>
    with SingleTickerProviderStateMixin {
  // ── Tab definitions ────────────────────────────────────────────────────
  static const List<NavBarItem> _items = [
    NavBarItem(icon: Icons.home_outlined, activeIcon: Icons.home_rounded),
    NavBarItem(
      icon: Icons.calendar_view_week_outlined,
      activeIcon: Icons.calendar_view_week_rounded,
    ),
    NavBarItem(
      icon: Icons.calendar_today_outlined,
      activeIcon: Icons.calendar_today_rounded,
    ),
    NavBarItem(
      icon: Icons.settings_outlined,
      activeIcon: Icons.settings_rounded,
    ),
  ];

  // ── Constants ──────────────────────────────────────────────────────────
  static const double _navBarWidth = 300;
  static const double _navBarPadding = 8;
  static const double _iconContainerSize = 64;
  static const double _iconPadding = 12;
  static const double _iconSize = _iconContainerSize - (_iconPadding * 2); // 40

  // ── Animation ──────────────────────────────────────────────────────────
  late final AnimationController _controller;
  late Animation<double> _positionAnimation;
  double _previousPosition = 0;

  /// The usable inner width for placing icons.
  double get _innerWidth => _navBarWidth - (_navBarPadding * 2);

  /// Horizontal center offset of a tab at [index] within the inner area.
  double _centerXFor(int index) {
    final double slotWidth = _innerWidth / _items.length;
    return (slotWidth * index) + (slotWidth / 2);
  }

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 350),
    );
    _previousPosition = _centerXFor(widget.currentIndex);
    _positionAnimation = AlwaysStoppedAnimation(_previousPosition);
  }

  @override
  void didUpdateWidget(covariant FloatingNavBar oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.currentIndex != widget.currentIndex) {
      _animateTo(widget.currentIndex);
    }
  }

  void _animateTo(int index) {
    final double target = _centerXFor(index);
    _positionAnimation = Tween<double>(
      begin: _previousPosition,
      end: target,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic));
    _controller.forward(from: 0.0);
    _previousPosition = target;
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  // ── Build ──────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final double bottomPadding = MediaQuery.of(context).padding.bottom;
    final double navBarHeight = _iconContainerSize + (_navBarPadding * 2);

    return Positioned(
      bottom: bottomPadding + 16,
      left: 0,
      right: 0,
      child: Center(
        child: Container(
          width: _navBarWidth,
          height: navBarHeight,
          padding: const EdgeInsets.all(_navBarPadding),
          decoration: BoxDecoration(
            color: AppColors.navBarBackground,
            borderRadius: BorderRadius.circular(navBarHeight / 2),
            boxShadow: [
              BoxShadow(
                color: AppColors.navBarShadow,
                blurRadius: 24,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Stack(
            children: [
              // ── Animated circular indicator ───────────────────────────
              AnimatedBuilder(
                animation: _controller,
                builder: (context, child) {
                  final double cx = _positionAnimation.value;
                  return Positioned(
                    left: cx - (_iconContainerSize / 2),
                    top: 0,
                    child: child!,
                  );
                },
                child: Container(
                  width: _iconContainerSize,
                  height: _iconContainerSize,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppColors.activeIndicator.withValues(alpha: 0.35),
                    border: Border.all(
                      color: AppColors.activeIndicator.withValues(alpha: 0.6),
                      width: 1.5,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.accent.withValues(alpha: 0.12),
                        blurRadius: 16,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                ),
              ),

              // ── Icon row ──────────────────────────────────────────────
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: List.generate(_items.length, (index) {
                  final bool isActive = index == widget.currentIndex;
                  return GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: () => widget.onIndexChanged(index),
                    child: SizedBox(
                      width: _iconContainerSize,
                      height: _iconContainerSize,
                      child: Center(
                        child: AnimatedSwitcher(
                          duration: const Duration(milliseconds: 250),
                          switchInCurve: Curves.easeOutCubic,
                          switchOutCurve: Curves.easeInCubic,
                          transitionBuilder: (child, anim) {
                            return ScaleTransition(scale: anim, child: child);
                          },
                          child: Icon(
                            isActive
                                ? _items[index].activeIcon
                                : _items[index].icon,
                            key: ValueKey<bool>(isActive),
                            size: _iconSize,
                            color: isActive
                                ? AppColors.secondary
                                : AppColors.neutral,
                          ),
                        ),
                      ),
                    ),
                  );
                }),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
