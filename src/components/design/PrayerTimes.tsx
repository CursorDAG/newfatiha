'use client';

import { useState, useEffect } from 'react';

interface Prayer {
  name: string;
  time: string;
  active?: boolean;
}

const prayers: Prayer[] = [
  { name: 'Фаджр', time: '03:45' },
  { name: 'Восход', time: '05:12' },
  { name: 'Зухр', time: '12:30', active: true },
  { name: 'Аср', time: '16:45' },
  { name: 'Магриб', time: '20:15' },
  { name: 'Иша', time: '22:00' },
];

/** Custom crescent moon and star active prayer icon */
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

export default function PrayerTimes() {
  const [currentTime, setCurrentTime] = useState<string>('--:--');

  useEffect(() => {
    const formatTime = (): string => {
      const now = new Date();
      return now.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    };

    setCurrentTime(formatTime());

    const interval = setInterval(() => {
      setCurrentTime(formatTime());
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="glass-card relative overflow-hidden rounded-2xl p-6 md:p-8 min-h-[390px] flex flex-col justify-between">
      {/* ── Arabic/Eastern Arch Vector Outline Frame ── */}
      <svg
        className="absolute inset-3.5 pointer-events-none select-none text-[#D4AF37]/15"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="archFillGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.035" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Outer Arch with gradient fill */}
        <path
          d="M 5 95 L 5 38 C 5 22 16 16 35 11 C 45 8.5 48 3 50 0.5 C 52 3 55 8.5 65 11 C 84 16 95 22 95 38 L 95 95 Z"
          stroke="currentColor"
          strokeWidth="1.2"
          fill="url(#archFillGradient)"
          vectorEffect="non-scaling-stroke"
        />
        {/* Inner Dotted Arch */}
        <path
          d="M 8.5 95 L 8.5 40 C 8.5 25.5 18 19.5 35.5 14.5 C 44 12 48 7 50 4.5 C 52 7 56 12 64.5 14.5 C 82 19.5 91.5 25.5 91.5 40 L 91.5 95"
          stroke="currentColor"
          strokeWidth="0.6"
          strokeDasharray="2,2"
          opacity="0.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* ── Content wrapper (placed inside the arch bounds) ── */}
      <div className="relative z-10 px-3 py-1 flex flex-col h-full justify-between gap-4">
        {/* Current time badge centered right under peak */}
        <div className="flex justify-center mt-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d4af37] px-3.5 py-1 text-[11px] font-bold tracking-wider text-[#031410] shadow-md">
            <ClockIcon />
            {currentTime}
          </span>
        </div>

        {/* Title block */}
        <div className="text-center flex flex-col items-center">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#d4af37] flex items-center gap-1.5 leading-none">
            <ActivePrayerIcon className="pulse-gold text-[#d4af37] shrink-0" />
            ВРЕМЯ НАМАЗА
          </h3>
          <p className="mt-1.5 text-[9px] text-white/40 tracking-wider font-semibold">
            Расписание • Москва, RU
          </p>
        </div>

        {/* Prayer list */}
        <ul className="space-y-1 mt-1">
          {prayers.map((prayer) => (
            <li
              key={prayer.name}
              className={`flex items-center justify-between px-5 py-2.5 rounded-xl transition-all duration-300 border ${
                prayer.active
                  ? 'text-[#d4af37] border-[#d4af37]/25 pulse-gold-row'
                  : 'text-white/60 hover:text-white border-transparent bg-transparent'
              }`}
            >
              {/* Name + optional active icon */}
              <span className="flex items-center gap-2 text-xs font-semibold tracking-wide">
                {prayer.active ? (
                  <ActivePrayerIcon
                    className="pulse-gold text-[#d4af37] shrink-0"
                    aria-hidden="true"
                  />
                ) : (
                  <span className="w-[16px] h-[16px] shrink-0" />
                )}
                <span>{prayer.name}</span>
              </span>

              {/* Time */}
              <span
                className={`font-mono text-xs ${
                  prayer.active ? 'font-bold' : 'font-normal text-white/40'
                }`}
              >
                {prayer.time}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ── Tiny inline clock icon for the time badge ── */
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
