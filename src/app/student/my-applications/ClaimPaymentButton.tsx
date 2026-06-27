"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ClaimPaymentButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClaim = async () => {
    if (!confirm("Подтвердить, что вы оплатили курс? Продавец проверит оплату и откроет доступ.")) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/enrollment-requests/${requestId}/claim-payment`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        router.refresh();
      } else {
        alert(data.error || "Не удалось отправить уведомление об оплате");
      }
    } catch {
      alert("Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClaim}
      disabled={loading}
      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition-all"
    >
      {loading ? "Отправка..." : "Я оплатил"}
    </button>
  );
}
