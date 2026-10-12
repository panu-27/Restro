import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

class ShimmerLoader extends StatelessWidget {
  final double width;
  final double height;
  final double borderRadius;

  const ShimmerLoader({
    super.key,
    required this.width,
    required this.height,
    this.borderRadius = 8.0,
  });

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: Colors.grey[200]!,
      highlightColor: Colors.grey[50]!,
      child: Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(borderRadius),
        ),
      ),
    );
  }
}

class TableCardSkeleton extends StatelessWidget {
  const TableCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16.0),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: const [
          ShimmerLoader(width: 60.0, height: 28.0, borderRadius: 8.0),
          Align(
            alignment: Alignment.bottomRight,
            child: ShimmerLoader(width: 45.0, height: 16.0, borderRadius: 4.0),
          ),
        ],
      ),
    );
  }
}

class MenuItemCardSkeleton extends StatelessWidget {
  const MenuItemCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16.0),
              border: Border.all(color: Colors.grey[200]!),
            ),
            child: const ClipRRect(
              borderRadius: BorderRadius.all(Radius.circular(16.0)),
              child: ShimmerLoader(width: double.infinity, height: double.infinity),
            ),
          ),
        ),
        const SizedBox(height: 6.0),
        const ShimmerLoader(width: 100.0, height: 14.0, borderRadius: 4.0),
      ],
    );
  }
}

class DashboardStatsSkeleton extends StatelessWidget {
  const DashboardStatsSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return const ShimmerLoader(width: 110.0, height: 26.0, borderRadius: 6.0);
  }
}

class ListRowSkeleton extends StatelessWidget {
  const ListRowSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12.0, horizontal: 16.0),
      child: Row(
        children: [
          const ShimmerLoader(width: 48.0, height: 48.0, borderRadius: 12.0),
          const SizedBox(width: 12.0),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                ShimmerLoader(width: 140.0, height: 14.0, borderRadius: 4.0),
                SizedBox(height: 6.0),
                ShimmerLoader(width: 80.0, height: 10.0, borderRadius: 4.0),
              ],
            ),
          ),
          const ShimmerLoader(width: 50.0, height: 16.0, borderRadius: 4.0),
        ],
      ),
    );
  }
}

