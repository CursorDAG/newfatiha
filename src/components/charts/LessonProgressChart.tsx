"use client";

/**
 * LessonProgressChart — прогресс по урокам за 30 дней.
 *
 * Линейный график: сколько уроков ученик завершил (cumulative),
 * обновляется каждый раз, когда студент проходит урок.
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

export type LessonPoint = { date: string; completed: number };

interface LessonProgressChartProps {
  /** Готовые данные. Если не передано — компонент грузит их сам. */
  data?: LessonPoint[];
  /** Endpoint для самостоятельной загрузки. */
  endpoint?: string;
  title?: string;
  subtitle?: string;
}

export default function LessonProgressChart({
  data,
  endpoint = "/api/student/progress/history",
  title = "Прогресс по урокам",
  subtitle = "Завершённые уроки за последние 30 дней",
}: LessonProgressChartProps) {
  const [points, setPoints] = useState<LessonPoint[]>(data ?? []);
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
        if (!res.ok) throw new Error("Не удалось загрузить прогресс уроков");
        const json = await res.json();
        if (!cancelled) setPoints((json.lessons ?? []) as LessonPoint[]);
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

  const last = points[points.length - 1];
  const first = points[0];
  const delta = last ? last.completed - (first?.completed ?? 0) : 0;

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      action={
        !loading && !error && points.length > 0 ? (
          <div className="text-right">
            <p className="text-2xl font-bold text-[#D4AF37] leading-none">
              {last?.completed ?? 0}
            </p>
            {delta > 0 && (
              <p className="text-[11px] text-emerald-400 mt-1">+{delta} за 30 дней</p>
            )}
          </div>
        ) : undefined
      }
    >
      {loading ? (
        <ChartState kind="loading" message="Загрузка..." />
      ) : error ? (
        <ChartState kind="error" message={error} />
      ) : points.every((p) => p.completed === 0) ? (
        <ChartState kind="empty" message="Вы пока не завершили ни одного урока" />
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={points} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="lessonFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GOLD} stopOpacity={0.3} />
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
                  rows={[
                    {
                      label: "Уроков",
                    value: Number(payload?.[0]?.value ?? 0),
                    },
                  ]}
                />
              )}
            />
            <Area
              type="monotone"
              dataKey="completed"
              stroke={GOLD}
              strokeWidth={2.5}
              fill="url(#lessonFill)"
              dot={false}
              activeDot={{ r: 4, fill: GOLD, stroke: "#06201A", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
