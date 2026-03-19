"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/Button";
import EmptyState from "./ui/EmptyState";

type EnrollmentRequest = {
  id: string;
  status: string;
  message: string | null;
  createdAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
  paymentConfirmed: boolean;
  student: {
    id: string;
    name: string;
    email: string;
    gender: string;
    createdAt: string;
  };
  stream: {
    id: string;
    name: string;
    price: string | null;
    currency: string;
    course: {
      title: string;
    };
  };
  reviewedBy: {
    name: string;
  } | null;
};

export default function TeacherApplicationsTab() {
  const [requests, setRequests] = useState<EnrollmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/enrollment-requests");
      const data = await res.json();
      setRequests(data.requests || []);
    } catch (error) {
      console.error("Failed to fetch requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    if (!confirm("Одобрить эту заявку?")) return;

    setProcessingId(requestId);
    try {
      const res = await fetch(`/api/teacher/enrollment-requests/${requestId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "APPROVE" }),
      });

      if (res.ok) {
        await fetchRequests();
        alert("Заявка одобрена");
      } else {
        const data = await res.json();
        alert(data.error || "Ошибка при одобрении заявки");
      }
    } catch (error) {
      alert("Произошла ошибка");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!rejectionReason.trim()) {
      alert("Укажите причину отклонения");
      return;
    }

    setProcessingId(requestId);
    try {
      const res = await fetch(`/api/teacher/enrollment-requests/${requestId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REJECT",
          rejectionReason: rejectionReason.trim(),
        }),
      });

      if (res.ok) {
        await fetchRequests();
        setRejectingId(null);
        setRejectionReason("");
        alert("Заявка отклонена");
      } else {
        const data = await res.json();
        alert(data.error || "Ошибка при отклонении заявки");
      }
    } catch (error) {
      alert("Произошла ошибка");
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmPayment = async (requestId: string) => {
    if (!confirm("Подтвердить оплату? Студент будет зачислен на курс.")) return;

    setProcessingId(requestId);
    try {
      const res = await fetch(`/api/teacher/enrollment-requests/${requestId}/confirm-payment`, {
        method: "POST",
      });

      if (res.ok) {
        await fetchRequests();
        alert("Оплата подтверждена. Студент зачислен.");
      } else {
        const data = await res.json();
        alert(data.error || "Ошибка при подтверждении оплаты");
      }
    } catch (error) {
      alert("Произошла ошибка");
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_REVIEW":
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm font-semibold rounded-lg">⏳ На рассмотрении</span>;
      case "APPROVED_PENDING_PAYMENT":
        return <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-lg">💳 Ожидает оплаты</span>;
      case "PAYMENT_CONFIRMED":
        return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-semibold rounded-lg">✓ Оплата подтверждена</span>;
      case "ACTIVE":
        return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-semibold rounded-lg">✓ Зачислен</span>;
      case "REJECTED":
        return <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-semibold rounded-lg">✗ Отклонена</span>;
      default:
        return <span className="px-3 py-1 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg">{status}</span>;
    }
  };

  const filteredRequests = requests.filter((req) => {
    if (filter === "all") return true;
    if (filter === "pending") return req.status === "PENDING_REVIEW";
    if (filter === "payment") return req.status === "APPROVED_PENDING_PAYMENT";
    if (filter === "completed") return req.status === "ACTIVE";
    if (filter === "rejected") return req.status === "REJECTED";
    return true;
  });

  const pendingCount = requests.filter((r) => r.status === "PENDING_REVIEW").length;
  const paymentCount = requests.filter((r) => r.status === "APPROVED_PENDING_PAYMENT").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Заявки на курсы</h2>
          <p className="text-slate-600 mt-1">Управление заявками студентов</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            filter === "all"
              ? "bg-emerald-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Все ({requests.length})
        </button>
        <button
          onClick={() => setFilter("pending")}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            filter === "pending"
              ? "bg-emerald-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          На рассмотрении {pendingCount > 0 && `(${pendingCount})`}
        </button>
        <button
          onClick={() => setFilter("payment")}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            filter === "payment"
              ? "bg-emerald-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Ожидают оплаты {paymentCount > 0 && `(${paymentCount})`}
        </button>
        <button
          onClick={() => setFilter("completed")}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            filter === "completed"
              ? "bg-emerald-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Зачислены
        </button>
        <button
          onClick={() => setFilter("rejected")}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            filter === "rejected"
              ? "bg-emerald-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Отклонены
        </button>
      </div>

      {/* Requests list */}
      {filteredRequests.length === 0 ? (
        <EmptyState
          icon="📭"
          title="Нет заявок"
          description={
            filter === "all"
              ? "Пока нет заявок на ваши курсы"
              : "Нет заявок с выбранным статусом"
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <div
              key={request.id}
              className="bg-white rounded-xl shadow-md border border-slate-200 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-slate-800">
                      {request.student.name}
                    </h3>
                    {getStatusBadge(request.status)}
                  </div>
                  <div className="text-sm text-slate-600 space-y-1">
                    <div>📧 {request.student.email}</div>
                    <div>
                      📚 {request.stream.course.title} • {request.stream.name}
                    </div>
                    <div>
                      {request.student.gender === "MALE" && "♂ Мужской"}
                      {request.student.gender === "FEMALE" && "♀ Женский"}
                    </div>
                    <div>📅 Подана: {new Date(request.createdAt).toLocaleDateString("ru-RU")}</div>
                  </div>
                </div>
              </div>

              {/* Student message */}
              {request.message && (
                <div className="mb-4 p-4 bg-slate-50 rounded-lg">
                  <div className="text-xs font-semibold text-slate-500 mb-1">
                    Сообщение от студента:
                  </div>
                  <div className="text-sm text-slate-700">{request.message}</div>
                </div>
              )}

              {/* Rejection reason */}
              {request.status === "REJECTED" && request.rejectionReason && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-xs font-semibold text-red-700 mb-1">
                    Причина отклонения:
                  </div>
                  <div className="text-sm text-red-800">{request.rejectionReason}</div>
                </div>
              )}

              {/* Actions */}
              {request.status === "PENDING_REVIEW" && (
                <div className="flex gap-3">
                  {rejectingId === request.id ? (
                    <div className="flex-1 space-y-3">
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Укажите причину отклонения..."
                        rows={3}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleReject(request.id)}
                          disabled={processingId === request.id || !rejectionReason.trim()}
                          variant="danger"
                        >
                          Отклонить
                        </Button>
                        <Button
                          onClick={() => {
                            setRejectingId(null);
                            setRejectionReason("");
                          }}
                          variant="secondary"
                        >
                          Отмена
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Button
                        onClick={() => handleApprove(request.id)}
                        disabled={processingId === request.id}
                        variant="primary"
                      >
                        ✓ Одобрить
                      </Button>
                      <Button
                        onClick={() => setRejectingId(request.id)}
                        disabled={processingId === request.id}
                        variant="danger"
                      >
                        ✗ Отклонить
                      </Button>
                    </>
                  )}
                </div>
              )}

              {request.status === "APPROVED_PENDING_PAYMENT" && (
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                    💳 Ожидается оплата{" "}
                    {request.stream.price && `${request.stream.price} ${request.stream.currency}`}
                  </div>
                  <Button
                    onClick={() => handleConfirmPayment(request.id)}
                    disabled={processingId === request.id}
                    variant="primary"
                  >
                    Подтвердить оплату
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
