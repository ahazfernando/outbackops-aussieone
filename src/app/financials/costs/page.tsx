"use client";

import dynamic from 'next/dynamic';

const ProtectedRoute = dynamic(() => import("@/components/ProtectedRoute").then(mod => ({ default: mod.ProtectedRoute })), {
  ssr: false,
});

const DashboardLayout = dynamic(() => import("@/components/DashboardLayout").then(mod => ({ default: mod.DashboardLayout })), {
  ssr: false,
});

const Costs = dynamic(() => import("@/pages/Costs"), {
  ssr: false,
});

export default function CostsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Costs />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
