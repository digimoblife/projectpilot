import React from "react";
import { SkeletonMetricsGrid, SkeletonPageHeader, SkeletonTable } from "@/components/ui/skeleton-loader";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <SkeletonPageHeader />
      <SkeletonMetricsGrid count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonTable rows={4} cols={4} />
        <SkeletonTable rows={4} cols={3} />
      </div>
    </div>
  );
}
