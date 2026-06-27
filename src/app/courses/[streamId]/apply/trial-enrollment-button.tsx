"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TrialEnrollmentButton({ streamId }: { streamId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTrial = async () => {
    if (!confirm("Вы записываетесь на бесплатный пробный урок. После прохождения урока вам будет предложено записаться на полный курс.")) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/enrollment-requests/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ streamId }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push("/student/my-applications");
      } else {
        setError(data.error || "Не удалось записаться на пробный урок");
      }
    } catch {
      setError("Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleTrial}
        disabled={loading}
        className="w-full px-5 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-violet-600/20 transition-all text-center"
      >
        {loading ? "Запись..." : "Записаться на пробный урок"}
      </button>
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
