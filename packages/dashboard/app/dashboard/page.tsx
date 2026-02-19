"use client";

import { TokenRibbon } from "./components/token-ribbon";
import { ServiceStatus } from "./components/service-status";
import { ActiveTasks } from "./components/active-tasks";
import { BudgetSummary } from "./components/budget-summary";

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TokenRibbon />
        <ServiceStatus />
        <ActiveTasks />
        <BudgetSummary />
      </div>
    </div>
  );
}
