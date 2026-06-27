"use client";

/**
 * ProgressChart — линейный график посещаемости за 30 дней.
 *
 * Может принимать данные напрямую (`data`) или сам загрузить их с
 * GET /api/student/progress/history (студент) /
 * GET /api/teacher/analytics/trend  (учитель, через `endpoint`).
 *
 * Тёмно-золотая тема: фон bg-[#06201A]/40, золотая линия #D4AF37.
 */
import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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

export type AttendancePoint = { date: string; minutes: number };

interface ProgressChartProps {
  /** Готовые данные. Если не передано — компонент грузит их сам. */
  data?: AttendancePoint[];
  /** Endpoint для самостоятельной загрузки. По умолчанию — студенческий. */
  endpoint?: string;
  title?: string;
  subtitle?: string;
}

export default function ProgressChart({
  data,
  endpoint = "/api/student/progress/history",
  title = "Посещаемость",
  subtitle = "Минуты активности за последние 30 дней",
}: ProgressChartProps) {
  const [points, setPoints] = useState<AttendancePoint[]>(data ?? []);
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setPoints(data);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(endpoint);
        if (!res.ok) throw new Error("Не удалось загрузить данные посещаемости");
        const json = await res.json();
        if (!cancelled) setPoints((json.attendance ?? []) as AttendancePoint[]);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Ошибка загрузки");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [data, endpoint]);

  const totalMinutes = points.reduce((s, p) => s + p.minutes, 0);

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      action={
        !loading && !error && points.length > 0 ? (
          <div className="text-right">
            <p className="text-2xl font-bold text-[#D4AF37] leading-none">{totalMinutes}</p>
            <p className="text-[11px] text-white/50 mt-1">минут всего</p>
          </div>
        ) : undefined
      }
    >
      {loading ? (
        <ChartState kind="loading" message="Загрузка..." />
      ) : error ? (
        <ChartState kind="error" message={error} />
      ) : points.every((p) => p.minutes === 0) ? (
        <ChartState kind="empty" message="Пока нет данных об активности" />
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={points} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="attendanceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GOLD} stopOpacity={0.35} />
                <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
              </linearGradient>
            </defs>
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
                  rows={[{ label: "Минут", value: Number(payload?.[0]?.value ?? 0) }]}
                />
              )}
            />
            <Area
              type="monotone"
              dataKey="minutes"
              stroke={GOLD}
              strokeWidth={2.5}
              fill="url(#attendanceFill)"
              dot={false}
              activeDot={{ r: 4, fill: GOLD, stroke: "#06201A", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
