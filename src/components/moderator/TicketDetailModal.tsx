"use client";

import { useState, useEffect, useRef } from "react";

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

export default function TicketDetailModal({ ticketId, onClose, onUpdate }: Props) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchTicket = async () => {
    try {
      const response = await fetch(`/api/moderator/tickets/${ticketId}`);
      const data = await response.json();
      setTicket(data.ticket);
    } catch (error) {
      console.error("Failed to fetch ticket:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();
    const interval = setInterval(fetchTicket, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [ticketId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.replies]);

  const handleSendReply = async () => {
    if (!replyMessage.trim()) return;

    setSending(true);
    try {
      const response = await fetch(`/api/moderator/tickets/${ticketId}/reply`, {
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

  const handleAssign = async () => {
    setAssigning(true);
    try {
      const response = await fetch(`/api/moderator/tickets/${ticketId}/assign`, {
        method: "POST",
      });

      if (response.ok) {
        await fetchTicket();
        onUpdate();
      }
    } catch (error) {
      console.error("Failed to assign ticket:", error);
    } finally {
      setAssigning(false);
    }
  };

  const handleStatusChange = async (status: TicketStatus) => {
    try {
      const response = await fetch(`/api/moderator/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        await fetchTicket();
        onUpdate();
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const handlePriorityChange = async (priority: TicketPriority) => {
    try {
      const response = await fetch(`/api/moderator/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority }),
      });

      if (response.ok) {
        await fetchTicket();
        onUpdate();
      }
    } catch (error) {
      console.error("Failed to update priority:", error);
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
              <div className="text-sm text-slate-600">
                От: {ticket.user.name} ({ticket.user.email})
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
            {/* Controls */}
            <div className="px-6 py-4 border-b border-slate-200 flex gap-4 flex-wrap">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Статус
                </label>
                <select
                  value={ticket.status}
                  onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                  className="px-3 py-1 text-sm text-slate-900 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="OPEN">Открыто</option>
                  <option value="IN_PROGRESS">В работе</option>
                  <option value="RESOLVED">Решено</option>
                  <option value="CLOSED">Закрыто</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Приоритет
                </label>
                <select
                  value={ticket.priority}
                  onChange={(e) => handlePriorityChange(e.target.value as TicketPriority)}
                  className="px-3 py-1 text-sm text-slate-900 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="LOW">Низкий</option>
                  <option value="MEDIUM">Средний</option>
                  <option value="HIGH">Высокий</option>
                  <option value="URGENT">Срочно</option>
                </select>
              </div>

              {!ticket.assignedTo && (
                <div className="flex items-end">
                  <button
                    onClick={handleAssign}
                    disabled={assigning}
                    className="px-4 py-1 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {assigning ? "..." : "Взять в работу"}
                  </button>
                </div>
              )}

              {ticket.assignedTo && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Назначено
                  </label>
                  <div className="text-sm text-slate-900">{ticket.assignedTo.name}</div>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Original message */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="font-medium text-slate-900">{ticket.user.name}</div>
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
                    <div className="font-medium text-slate-900">{reply.user.name}</div>
                    {reply.isStaff && (
                      <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded">
                        Модератор
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
            <div className="px-6 py-4 border-t border-slate-200">
              <textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Введите ответ..."
                rows={3}
                className="w-full px-3 py-2 text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
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
