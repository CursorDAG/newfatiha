"use client";

import { useState, useEffect } from "react";

interface Stats {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  pendingReports: number;
  myTicketsCount: number;
  avgResponseTime: string;
}

export default function ModeratorStatsTab() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        // Fetch tickets
        const ticketsResponse = await fetch("/api/moderator/tickets?limit=1000");
        const ticketsData = await ticketsResponse.json();
        const tickets = ticketsData.tickets || [];

        // Fetch reports
        const reportsResponse = await fetch("/api/moderator/reports?limit=1000");
        const reportsData = await reportsResponse.json();
        const reports = reportsData.reports || [];

        // Calculate stats
        const totalTickets = tickets.length;
        const openTickets = tickets.filter((t: { status: string }) => t.status === "OPEN").length;
        const inProgressTickets = tickets.filter((t: { status: string }) => t.status === "IN_PROGRESS").length;
        const resolvedTickets = tickets.filter((t: { status: string }) => t.status === "RESOLVED").length;
        const pendingReports = reports.filter((r: { status: string }) => r.status === "PENDING").length;

        setStats({
          totalTickets,
          openTickets,
          inProgressTickets,
          resolvedTickets,
          pendingReports,
          myTicketsCount: 0, // Would need session info
          avgResponseTime: "—",
        });
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-slate-500">
        Не удалось загрузить статистику
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">
          Общая статистика
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-slate-500 mb-1">
              Всего обращений
            </div>
            <div className="text-3xl font-bold text-slate-900">
              {stats.totalTickets}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-slate-500 mb-1">
              Открытых
            </div>
            <div className="text-3xl font-bold text-blue-600">
              {stats.openTickets}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-slate-500 mb-1">
              В работе
            </div>
            <div className="text-3xl font-bold text-purple-600">
              {stats.inProgressTickets}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-slate-500 mb-1">
              Решено
            </div>
            <div className="text-3xl font-bold text-green-600">
              {stats.resolvedTickets}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">
          Жалобы на контент
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-slate-500 mb-1">
              Необработанных жалоб
            </div>
            <div className="text-3xl font-bold text-yellow-600">
              {stats.pendingReports}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <div className="font-medium text-blue-900 mb-1">
              Информация
            </div>
            <div className="text-sm text-blue-700">
              Статистика обновляется в реальном времени при загрузке страницы.
              Для более детальной аналитики используйте фильтры на вкладках &quot;Обращения&quot; и &quot;Жалобы&quot;.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
