import 'package:flutter/material.dart';

class AnimatedPress extends StatefulWidget {
  final Widget child;
  final VoidCallback onTap;
  final VoidCallback? onLongPress;

  const AnimatedPress({
    Key? key,
    required this.child,
    required this.onTap,
    this.onLongPress,
  }) : super(key: key);

  @override
  State<AnimatedPress> createState() => _AnimatedPressState();
}

class _AnimatedPressState extends State<AnimatedPress> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 100),
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.97).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onPanDown(DragDownDetails details) => _controller.forward();
  void _onPanCancel() => _controller.reverse();
  void _onPanEnd(DragEndDetails details) => _controller.reverse();

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onPanDown: _onPanDown,
      onPanCancel: _onPanCancel,
      onPanEnd: _onPanEnd,
      onLongPress: widget.onLongPress,
      onTap: () async {
        await _controller.forward();
        _controller.reverse();
        widget.onTap();
      },
      child: ScaleTransition(
        scale: _scaleAnimation,
        child: widget.child,
      ),
    );
  }
}
