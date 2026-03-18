"use client";

import { useState } from "react";
import ModeratorTicketsTab from "@/components/moderator/ModeratorTicketsTab";
import ModeratorReportsTab from "@/components/moderator/ModeratorReportsTab";
import ModeratorStatsTab from "@/components/moderator/ModeratorStatsTab";

type Tab = "tickets" | "reports" | "stats";

export default function ModeratorClient() {
  const [activeTab, setActiveTab] = useState<Tab>("tickets");

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">
          Модераторский кабинет
        </h1>

        {/* Tabs */}
        <div className="border-b border-slate-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("tickets")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "tickets"
                  ? "border-emerald-500 text-emerald-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              Обращения
            </button>
            <button
              onClick={() => setActiveTab("reports")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "reports"
                  ? "border-emerald-500 text-emerald-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              Жалобы
            </button>
            <button
              onClick={() => setActiveTab("stats")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "stats"
                  ? "border-emerald-500 text-emerald-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              Статистика
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === "tickets" && <ModeratorTicketsTab />}
          {activeTab === "reports" && <ModeratorReportsTab />}
          {activeTab === "stats" && <ModeratorStatsTab />}
        </div>
      </div>
    </div>
  );
}
