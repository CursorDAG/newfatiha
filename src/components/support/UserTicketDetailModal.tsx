"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface Reply {
  id: string;
  message: string;
  isStaff: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string;
    role: string;
  };
}

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  assignedTo: {
    id: string;
    name: string;
  } | null;
  replies: Reply[];
}

interface Props {
  ticketId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export default function UserTicketDetailModal({ ticketId, onClose, onUpdate }: Props) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchTicket = useCallback(async () => {
    try {
      const response = await fetch(`/api/support/tickets/${ticketId}`);
      const data = await response.json();
      setTicket(data.ticket);
    } catch (error) {
      console.error("Failed to fetch ticket:", error);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchTicket();
    const interval = setInterval(fetchTicket, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [fetchTicket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.replies]);

  const handleSendReply = async () => {
    if (!replyMessage.trim()) return;

    setSending(true);
    try {
      const response = await fetch(`/api/support/tickets/${ticketId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyMessage }),
      });

      if (response.ok) {
        setReplyMessage("");
        await fetchTicket();
        onUpdate();
      }
    } catch (error) {
      console.error("Failed to send reply:", error);
    } finally {
      setSending(false);
    }
  };

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-start">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              {ticket?.subject || "Загрузка..."}
            </h2>
            {ticket && (
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                    ticket.status
                  )}`}
                >
                  {getStatusText(ticket.status)}
                </span>
                {ticket.assignedTo && (
                  <span className="text-sm text-slate-600">
                    Назначено: {ticket.assignedTo.name}
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : ticket ? (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Original message */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="font-medium text-slate-900">Вы</div>
                  <div className="text-xs text-slate-500">
                    {new Date(ticket.createdAt).toLocaleString("ru-RU")}
                  </div>
                </div>
                <div className="text-slate-700 whitespace-pre-wrap">{ticket.description}</div>
              </div>

              {/* Replies */}
              {ticket.replies.map((reply) => (
                <div
                  key={reply.id}
                  className={`rounded-lg p-4 ${
                    reply.isStaff ? "bg-emerald-50 ml-8" : "bg-slate-50 mr-8"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="font-medium text-slate-900">
                      {reply.isStaff ? reply.user.name : "Вы"}
                    </div>
                    {reply.isStaff && (
                      <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded">
                        Техподдержка
                      </span>
                    )}
                    <div className="text-xs text-slate-500">
                      {new Date(reply.createdAt).toLocaleString("ru-RU")}
                    </div>
                  </div>
                  <div className="text-slate-700 whitespace-pre-wrap">{reply.message}</div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Input */}
            {ticket.status !== "CLOSED" && (
              <div className="px-6 py-4 border-t border-slate-200">
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Введите ваш ответ..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={handleSendReply}
                    disabled={sending || !replyMessage.trim()}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {sending ? "Отправка..." : "Отправить"}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            Обращение не найдено
          </div>
        )}
      </div>
    </div>
  );
}
