"use client";

import { useState, useEffect } from "react";
import { LifeBuoy } from "lucide-react";
import CreateTicketModal from "@/components/support/CreateTicketModal";
import UserTicketDetailModal from "@/components/support/UserTicketDetailModal";

type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface Ticket {
  id: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  assignedTo: {
    id: string;
    name: string;
  } | null;
  _count: {
    replies: number;
  };
}

export default function SupportClient() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/support/tickets");
      const data = await response.json();
      setTickets(data.tickets || []);
    } catch (error) {
      console.error("Failed to fetch tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case "OPEN":
        return "text-blue-600 bg-blue-50";
      case "IN_PROGRESS":
        return "text-purple-600 bg-purple-50";
      case "RESOLVED":
        return "text-green-600 bg-green-50";
      case "CLOSED":
        return "text-slate-600 bg-slate-50";
    }
  };

  const getStatusText = (status: TicketStatus) => {
    switch (status) {
      case "OPEN":
        return "Открыто";
      case "IN_PROGRESS":
        return "В работе";
      case "RESOLVED":
        return "Решено";
      case "CLOSED":
        return "Закрыто";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="w-full px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Техподдержка
          </h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Создать обращение
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : tickets.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <LifeBuoy className="mx-auto h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              У вас пока нет обращений
            </h3>
            <p className="text-slate-500 mb-4">
              Создайте обращение, если у вас возникли вопросы или проблемы
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              Создать обращение
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="divide-y divide-slate-200">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket.id)}
                  className="p-6 hover:bg-slate-50 cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-medium text-slate-900">
                      {ticket.subject}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        ticket.status
                      )}`}
                    >
                      {getStatusText(ticket.status)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <div>
                      {new Date(ticket.createdAt).toLocaleDateString("ru-RU")}
                    </div>
                    <div>
                      {ticket._count.replies} {ticket._count.replies === 1 ? "ответ" : "ответов"}
                    </div>
                    {ticket.assignedTo && (
                      <div>
                        Назначено: {ticket.assignedTo.name}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showCreateModal && (
          <CreateTicketModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false);
              fetchTickets();
            }}
          />
        )}

        {selectedTicket && (
          <UserTicketDetailModal
            ticketId={selectedTicket}
            onClose={() => setSelectedTicket(null)}
            onUpdate={fetchTickets}
          />
        )}
      </div>
    </div>
  );
}
