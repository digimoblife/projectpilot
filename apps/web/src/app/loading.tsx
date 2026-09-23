import React from "react";
import { SkeletonPageHeader, SkeletonCardGrid } from "@/components/ui/skeleton-loader";

export default function GlobalLoading() {
  return (
    <div className="space-y-6">
      <SkeletonPageHeader />
      <SkeletonCardGrid count={6} />
    </div>
  );
}
