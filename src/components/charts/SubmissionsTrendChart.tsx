"use client";

/**
 * SubmissionsTrendChart — динамика сдачи тестов потока за 30 дней.
 *
 * Мультилинейный график: всего сдано / пройдено / не пройдено по дням.
 * Загружает данные с GET /api/teacher/analytics/trend?streamId=...
 *
 * Тёмно-золотая тема: фон bg-[#06201A]/40, золотая линия #D4AF37.
 */
import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  GOLD,
  GRID,
  AXIS,
  formatDayLabel,
  ChartTooltip,
  ChartCard,
  ChartState,
} from "./chartTheme";

type SubmissionPoint = {
  date: string;
  submitted: number;
  passed: number;
  failed: number;
};

const PASS = "#34D399"; // emerald
const FAIL = "#F87171"; // red

export default function SubmissionsTrendChart({
  streamId,
  title = "Сдача тестов",
  subtitle = "Динамика за последние 30 дней",
}: {
  streamId: string;
  title?: string;
  subtitle?: string;
}) {
  const [points, setPoints] = useState<SubmissionPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!streamId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `/api/teacher/analytics/trend?streamId=${encodeURIComponent(streamId)}`,
        );
        if (!res.ok) throw new Error("Не удалось загрузить динамику сдачи тестов");
        const json = await res.json();
        if (!cancelled) setPoints((json.submissions ?? []) as SubmissionPoint[]);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Ошибка загрузки");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [streamId]);

  const totalSubmitted = points.reduce((s, p) => s + p.submitted, 0);

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      action={
        !loading && !error && points.length > 0 ? (
          <div className="text-right">
            <p className="text-2xl font-bold text-[#D4AF37] leading-none">{totalSubmitted}</p>
            <p className="text-[11px] text-white/50 mt-1">сдач всего</p>
          </div>
        ) : undefined
      }
    >
      {loading ? (
        <ChartState kind="loading" message="Загрузка..." />
      ) : error ? (
        <ChartState kind="error" message={error} />
      ) : points.every((p) => p.submitted === 0) ? (
        <ChartState kind="empty" message="Пока нет сдач тестов за период" />
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={points} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDayLabel}
              tick={{ fill: AXIS, fontSize: 11 }}
              axisLine={{ stroke: GRID }}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              tick={{ fill: AXIS, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={40}
              allowDecimals={false}
            />
            <Tooltip
              content={({ active, payload }) => (
                <ChartTooltip
                  active={active}
                  title={payload?.[0] ? formatDayLabel(String(payload[0].payload.date)) : undefined}
                  rows={[
                    { label: "Сдано", value: payload?.[0]?.payload?.submitted ?? 0 },
                    { label: "Пройдено", value: payload?.[0]?.payload?.passed ?? 0 },
                    { label: "Не пройдено", value: payload?.[0]?.payload?.failed ?? 0 },
                  ]}
                />
              )}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, color: AXIS }}
              iconType="plainline"
            />
            <Line
              type="monotone"
              dataKey="submitted"
              name="Сдано"
              stroke={GOLD}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: GOLD, stroke: "#06201A", strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="passed"
              name="Пройдено"
              stroke={PASS}
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="failed"
              name="Не пройдено"
              stroke={FAIL}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
