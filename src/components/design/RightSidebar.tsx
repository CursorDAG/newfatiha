'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Video, FileText, Clock, CheckCircle, CalendarOff } from 'lucide-react';

interface Prayer {
  name: string;
  time: string; // HH:MM
}

const prayers: Prayer[] = [
  { name: 'Фаджр', time: '03:45' },
  { name: 'Восход', time: '05:12' },
  { name: 'Зухр', time: '12:30' },
  { name: 'Аср', time: '16:45' },
  { name: 'Магриб', time: '20:15' },
  { name: 'Иша', time: '22:00' },
];

// ── Реальные данные из дашборда ──────────────────────────────────────────────

export interface SidebarSession {
  streamName: string;
  dayOfWeek: number; // 0 = Пн
  startMinutes: number;
}

export interface SidebarTask {
  id: string;
  title: string;
  streamName: string;
  dueAt: string | null;
  status: 'NONE' | 'SUBMITTED' | 'ACCEPTED' | 'NEEDS_REWORK' | 'REJECTED';
}

interface RightSidebarProps {
  sessions?: SidebarSession[];
  tasks?: SidebarTask[];
}

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const formatTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

const TASK_STATUS: Record<SidebarTask['status'], { label: string; tone: string }> = {
  NONE: { label: 'Не сдано', tone: 'bg-amber-500/10 text-amber-400 ring-amber-500/20' },
  SUBMITTED: { label: 'На проверке', tone: 'bg-blue-500/10 text-blue-300 ring-blue-500/20' },
  NEEDS_REWORK: { label: 'Доработать', tone: 'bg-orange-500/10 text-orange-300 ring-orange-500/20' },
  REJECTED: { label: 'Отклонено', tone: 'bg-red-500/10 text-red-300 ring-red-500/20' },
  ACCEPTED: { label: 'Принято', tone: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20' },
};

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function formatCountdown(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
}

interface PrayerState {
  activeIndex: number;
  nextIndex: number;
  minutesToNext: number;
  nextIsTomorrow: boolean;
}

function computePrayerState(now: Date): PrayerState {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const times = prayers.map((p) => toMinutes(p.time));

  let activeIndex = -1;
  for (let i = times.length - 1; i >= 0; i--) {
    if (nowMin >= times[i]) {
      activeIndex = i;
      break;
    }
  }

  if (activeIndex === -1) {
    return {
      activeIndex: prayers.length - 1,
      nextIndex: 0,
      minutesToNext: times[0] - nowMin,
      nextIsTomorrow: false,
    };
  }

  const nextIndex = activeIndex + 1;
  if (nextIndex >= prayers.length) {
    const minutesToNext = 24 * 60 - nowMin + times[0];
    return {
      activeIndex,
      nextIndex: 0,
      minutesToNext,
      nextIsTomorrow: true,
    };
  }

  return {
    activeIndex,
    nextIndex,
    minutesToNext: times[nextIndex] - nowMin,
    nextIsTomorrow: false,
  };
}

function ActivePrayerIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ width: '16px', height: '16px' }}
      aria-hidden="true"
    >
      <path d="M12 3a9 9 0 1 0 9 9 9.75 9.75 0 0 1-9-9Z" fill="currentColor" />
      <path d="M18.5 6l.4.8.8.1-.6.6.1.8-.7-.4-.7.4.1-.8-.6-.6.8-.1z" fill="currentColor" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 4.5V8l2.5 1.5" />
    </svg>
  );
}

export default function RightSidebar({ sessions = [], tasks = [] }: RightSidebarProps) {
  const [now, setNow] = useState<Date | null>(null);
  const domeRef = useRef<HTMLElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    // Инициализация на клиенте, чтобы избежать hydration mismatch
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const handleDomeMouseMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      const dome = domeRef.current;
      if (!dome) return;

      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const rect = dome.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = rect.width / 2;
        const cy = rect.height / 2;

        // Купол длинный по вертикали — наклоняем умеренно
        const rotateX = ((y - cy) / cy) * -5;
        const rotateY = ((x - cx) / cx) * 7;

        dome.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      });
    },
    [],
  );

  const handleDomeMouseLeave = useCallback(() => {
    const dome = domeRef.current;
    if (!dome) return;
    cancelAnimationFrame(rafRef.current);
    dome.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
  }, []);

  const currentTime = useMemo(() => {
    if (!now) return '';
    return now.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }, [now]);

  const state = useMemo<PrayerState | null>(
    () => (now ? computePrayerState(now) : null),
    [now],
  );

  // Ближайшие сессии: сортируем относительно текущего дня/времени
  const upcoming = useMemo(() => {
    if (!now) return sessions.slice(0, 3).map((s) => ({ ...s, label: DAY_NAMES[s.dayOfWeek] }));
    const todayDow = (now.getDay() + 6) % 7; // 0 = Пн
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return [...sessions]
      .map((s) => {
        let daysAhead = (s.dayOfWeek - todayDow + 7) % 7;
        if (daysAhead === 0 && s.startMinutes <= nowMin) daysAhead = 7;
        const label =
          daysAhead === 0 ? `Сегодня, ${formatTime(s.startMinutes)}`
            : daysAhead === 1 ? `Завтра, ${formatTime(s.startMinutes)}`
            : `${DAY_NAMES[s.dayOfWeek]}, ${formatTime(s.startMinutes)}`;
        return { ...s, daysAhead, label, isToday: daysAhead === 0 };
      })
      .sort((a, b) => a.daysAhead - b.daysAhead || a.startMinutes - b.startMinutes)
      .slice(0, 3);
  }, [sessions, now]);

  const formatDue = (dueAt: string | null) => {
    if (!dueAt) return null;
    return new Date(dueAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  };

  return (
    <div className="space-y-6">
      {/* ════════ БЛОК 1: КУПОЛ — время намаза + счётчик ════════ */}
      <section
        ref={domeRef}
        onMouseMove={handleDomeMouseMove}
        onMouseLeave={handleDomeMouseLeave}
        className="relative w-full will-change-transform"
        style={{
          transformStyle: 'preserve-3d',
          transition: 'transform 0.5s cubic-bezier(0.03, 0.98, 0.52, 0.99)',
        }}
      >
        <svg
          className="absolute inset-0 h-full w-full pointer-events-none select-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          style={{ transform: 'translateZ(0px)' }}
        >
          <defs>
            <linearGradient id="domeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#15392E" stopOpacity="0.95" />
              <stop offset="40%" stopColor="#0E2A22" stopOpacity="0.92" />
              <stop offset="100%" stopColor="#0A2018" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="domeStroke" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F2D274" stopOpacity="0.95" />
              <stop offset="40%" stopColor="#D4AF37" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.35" />
            </linearGradient>
            <radialGradient id="domePeakGlow" cx="50%" cy="3%" r="35%">
              <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
            </radialGradient>
          </defs>

          <path
            d="M 1 99 L 1 38 C 1 22 16 16 35 11 C 45 8.5 48 3 50 0.5 C 52 3 55 8.5 65 11 C 84 16 99 22 99 38 L 99 99 Z"
            stroke="url(#domeStroke)"
            strokeWidth="1.5"
            fill="url(#domeFill)"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />

          <path
            d="M 1 99 L 1 38 C 1 22 16 16 35 11 C 45 8.5 48 3 50 0.5 C 52 3 55 8.5 65 11 C 84 16 99 22 99 38 L 99 99 Z"
            fill="url(#domePeakGlow)"
            vectorEffect="non-scaling-stroke"
          />

          <path
            d="M 4.5 98 L 4.5 40 C 4.5 25 18 19.5 35.5 14.5 C 44 12 48 5.5 50 4 C 52 5.5 56 12 64.5 14.5 C 82 19.5 95.5 25 95.5 40 L 95.5 98"
            stroke="#D4AF37"
            strokeWidth="0.5"
            strokeDasharray="2,2.5"
            opacity="0.4"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <div
          className="relative z-10 px-5 pt-12 pb-7 space-y-5"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <div className="flex justify-center" style={{ transform: 'translateZ(50px)' }}>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d4af37] px-3.5 py-1 text-[11px] font-bold tracking-wider text-[#031410] shadow-lg shadow-amber-500/20">
              <ClockIcon />
              {currentTime || '—'}
            </span>
          </div>

          <div
            className="text-center flex flex-col items-center"
            style={{ transform: 'translateZ(35px)' }}
          >
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#d4af37] flex items-center gap-1.5 leading-none">
              <ActivePrayerIcon className="pulse-gold text-[#d4af37] shrink-0" />
              ВРЕМЯ НАМАЗА
            </h3>
            {state ? (
              <p className="mt-2 text-[11px] text-white/75 tracking-wide">
                До{' '}
                <span className="text-[#D4AF37] font-semibold">
                  {prayers[state.nextIndex].name}
                </span>
                {state.nextIsTomorrow && (
                  <span className="text-white/45"> (завтра)</span>
                )}
                {' — '}
                <span className="font-mono font-semibold text-white/90">
                  {formatCountdown(state.minutesToNext)}
                </span>
              </p>
            ) : (
              <p className="mt-2 text-[11px] text-white/40 tracking-wide">
                Москва, RU
              </p>
            )}
          </div>

          <ul className="space-y-1" style={{ transform: 'translateZ(20px)' }}>
            {prayers.map((prayer, idx) => {
              const isActive = state?.activeIndex === idx;
              return (
                <li
                  key={prayer.name}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 border ${
                    isActive
                      ? 'text-[#d4af37] border-[#d4af37]/30 bg-[#d4af37]/5 pulse-gold-row'
                      : 'text-white/70 hover:text-white hover:bg-white/[0.03] border-transparent bg-transparent'
                  }`}
                >
                  <span className="flex items-center gap-2 text-xs font-semibold tracking-wide">
                    {isActive ? (
                      <ActivePrayerIcon
                        className="pulse-gold text-[#d4af37] shrink-0"
                        aria-hidden="true"
                      />
                    ) : (
                      <span className="w-[16px] h-[16px] shrink-0" />
                    )}
                    <span>{prayer.name}</span>
                  </span>
                  <span
                    className={`font-mono text-xs font-medium ${
                      isActive ? 'text-[#d4af37]' : 'text-white/50'
                    }`}
                  >
                    {prayer.time}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ════════ БЛОК 2: МОЁ РАСПИСАНИЕ ════════ */}
      <section className="glass-card rounded-2xl p-5 md:p-6 space-y-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#d4af37]">
          МОЁ РАСПИСАНИЕ
        </h2>

        <div className="space-y-3">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-white/40">
            Ближайшие живые сессии
          </h3>

          {upcoming.length > 0 ? (
            <ul className="divide-y divide-white/5">
              {upcoming.map((s, i) => (
                <li key={`${s.streamName}-${s.dayOfWeek}-${s.startMinutes}-${i}`} className="flex items-start justify-between gap-3 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white tracking-wide truncate">
                      {s.streamName}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-white/50">
                      <Clock className="w-3.5 h-3.5 shrink-0" strokeWidth={1.3} />
                      <span>{s.label}</span>
                    </div>
                  </div>
                  {'isToday' in s && (s as { isToday?: boolean }).isToday && (
                    <div className="flex items-center gap-1.5 shrink-0 bg-[#D4AF37]/5 rounded-lg px-2 py-1 border border-[#D4AF37]/10">
                      <Video className="w-3.5 h-3.5 glow-gold text-[#D4AF37]" strokeWidth={1.3} />
                      <span className="text-[9px] text-[#D4AF37] font-bold uppercase tracking-wider">
                        Сегодня
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <CalendarOff className="w-6 h-6 text-white/20" strokeWidth={1.3} />
              <p className="text-xs text-white/40">Ближайших сессий нет</p>
            </div>
          )}
        </div>
      </section>

      {/* ════════ БЛОК 3: ЗАДАНИЯ ════════ */}
      <section className="glass-card rounded-2xl p-5 md:p-6 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#d4af37]">
          Задания
        </h3>

        {tasks.length > 0 ? (
          <ul className="space-y-3">
            {tasks.map((t, i) => {
              const meta = TASK_STATUS[t.status];
              const due = formatDue(t.dueAt);
              const Icon = t.status === 'ACCEPTED' ? CheckCircle : FileText;
              return (
                <li
                  key={t.id}
                  className={`flex items-start justify-between gap-3 ${i < tasks.length - 1 ? 'pb-3 border-b border-white/5' : 'pt-1'}`}
                >
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <Icon className="w-4 h-4 text-[#d4af37]/80 mt-0.5 shrink-0" strokeWidth={1.3} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white tracking-wide truncate">
                        {t.title}
                      </p>
                      <p className="text-xs text-white/40 mt-0.5 truncate">{t.streamName}</p>
                      {due && (
                        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-white/50">
                          <Clock className="w-3.5 h-3.5 shrink-0" strokeWidth={1.3} />
                          <span>Срок: {due}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={`shrink-0 mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ring-1 ring-inset ${meta.tone}`}>
                    {meta.label}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <CheckCircle className="w-6 h-6 text-white/20" strokeWidth={1.3} />
            <p className="text-xs text-white/40">Активных заданий нет</p>
          </div>
        )}
      </section>
    </div>
  );
}
