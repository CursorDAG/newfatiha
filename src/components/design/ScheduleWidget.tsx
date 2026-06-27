'use client';

import { Video, FileText, Clock, CheckCircle } from 'lucide-react';

/**
 * ScheduleWidget — displays upcoming live sessions and assignments
 * with a glass-card aesthetic, gold accents, and ambient glow indicators.
 */
export default function ScheduleWidget() {
  return (
    <div className="glass-card p-6 md:p-8 space-y-6">
      {/* Title */}
      <h2 className="text-xs font-bold uppercase tracking-widest text-[#d4af37]">
        МОЁ РАСПИСАНИЕ
      </h2>

      {/* Section 1: Upcoming Live Sessions */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-white/40">
          Ближайшие живые сессии
        </h3>

        <ul className="divide-y divide-white/5">
          {/* Session 1 */}
          <li className="flex items-start justify-between gap-3 py-3.5">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white tracking-wide">
                Тафсир Аль-Фатиха — Урок 5
              </p>
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-white/50">
                <Clock className="w-3.5 h-3.5 shrink-0" strokeWidth={1.3} />
                <span>Сегодня, 19:00</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 bg-[#D4AF37]/5 rounded-lg px-2.5 py-1 border border-[#D4AF37]/10">
              <Video className="w-3.5 h-3.5 glow-gold text-[#D4AF37]" strokeWidth={1.3} />
              <span className="text-[9px] text-[#D4AF37] font-bold uppercase tracking-wider">Онлайн</span>
            </div>
          </li>

          {/* Session 2 */}
          <li className="flex items-start justify-between gap-3 py-3.5">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white tracking-wide">
                Арабский язык — Урок 8
              </p>
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-white/50">
                <Clock className="w-3.5 h-3.5 shrink-0" strokeWidth={1.3} />
                <span>Завтра, 14:00</span>
              </div>
            </div>
          </li>

          {/* Session 3 */}
          <li className="flex items-start justify-between gap-3 py-3.5">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white tracking-wide">
                Основы акыды
              </p>
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-white/50">
                <Clock className="w-3.5 h-3.5 shrink-0" strokeWidth={1.3} />
                <span>Пн, 10:00</span>
              </div>
            </div>
          </li>
        </ul>
      </div>

      {/* Section 2: Assignments */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-white/40">
          Задания
        </h3>

        <ul className="space-y-3.5">
          {/* Assignment 1 */}
          <li className="flex items-start justify-between gap-3 pb-3.5 border-b border-white/5">
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              <FileText className="w-4 h-4 text-[#d4af37]/80 mt-0.5 shrink-0" strokeWidth={1.3} />
              <div>
                <p className="text-sm font-semibold text-white tracking-wide">
                  Домашнее задание #4
                </p>
                <p className="text-xs text-white/40 mt-0.5">
                  Тафсир Аль-Фатиха
                </p>
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-white/50">
                  <Clock className="w-3.5 h-3.5 shrink-0" strokeWidth={1.3} />
                  <span>Срок: 26 мая</span>
                </div>
              </div>
            </div>
            <span className="shrink-0 mt-0.5 inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-400 ring-1 ring-inset ring-amber-500/20">
              Не сдано
            </span>
          </li>

          {/* Assignment 2 */}
          <li className="flex items-start justify-between gap-3 pt-1">
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              <CheckCircle className="w-4 h-4 text-[#d4af37]/80 mt-0.5 shrink-0" strokeWidth={1.3} />
              <div>
                <p className="text-sm font-semibold text-white tracking-wide">
                  Тест по арабскому
                </p>
                <p className="text-xs text-white/40 mt-0.5">
                  Арабский язык
                </p>
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-white/50">
                  <Clock className="w-3.5 h-3.5 shrink-0" strokeWidth={1.3} />
                  <span>Срок: 28 мая</span>
                </div>
              </div>
            </div>
            <span className="shrink-0 mt-0.5 inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
              Ожидает
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
