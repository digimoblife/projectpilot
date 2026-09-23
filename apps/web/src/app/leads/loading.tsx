import React from "react";
import { SkeletonMetricsGrid, SkeletonPageHeader, SkeletonTable } from "@/components/ui/skeleton-loader";

export default function LeadsLoading() {
  return (
    <div className="space-y-6">
      <SkeletonPageHeader />
      <SkeletonMetricsGrid count={4} />
      <SkeletonTable rows={6} cols={6} />
    </div>
  );
}
