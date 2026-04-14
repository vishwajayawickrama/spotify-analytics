import { Suspense } from "react";
import DashboardDetailClient from "./DashboardDetailClient";

export function generateStaticParams() {
  return [
    { section: "artists" },
    { section: "tracks" },
    { section: "recently-played" }
  ];
}

export default function DashboardDetailPage({
  params
}: {
  params: { section: string };
}) {
  return (
    <Suspense fallback={<div className="loading">Loading details…</div>}>
      <DashboardDetailClient section={params.section} />
    </Suspense>
  );
}
