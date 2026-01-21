"use client";

import dynamic from "next/dynamic";

const ProtectedRoute = dynamic(
  () => import("@/components/ProtectedRoute").then((mod) => ({ default: mod.ProtectedRoute })),
  { ssr: false }
);

const DashboardLayout = dynamic(
  () => import("@/components/DashboardLayout").then((mod) => ({ default: mod.DashboardLayout })),
  { ssr: false }
);

const KpiOverview = dynamic(() => import("@/pages/KpiOverview"), {
  ssr: false,
});

export default function KpisPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <KpiOverview />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

