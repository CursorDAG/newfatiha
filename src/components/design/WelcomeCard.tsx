'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Clock, Flame } from 'lucide-react';

const stats = [
  { icon: BookOpen, value: '3 курса', label: 'В процессе' },
  { icon: Clock, value: '24 часа', label: 'Изучено' },
  { icon: Flame, value: '12 дней', label: 'Серия' },
] as const;

const USER_NAME = 'Ахмад';

interface Greeting {
  greeting: string;
  hint: string;
}

function greetingForHour(hour: number): Greeting {
  if (hour >= 5 && hour < 11) {
    return {
      greeting: `Доброе утро, ${USER_NAME}!`,
      hint: 'Лучшее время для нового знания. Начнём?',
    };
  }
  if (hour >= 11 && hour < 17) {
    return {
      greeting: `Добрый день, ${USER_NAME}!`,
      hint: 'Продолжайте своё обучение. Вы на правильном пути!',
    };
  }
  if (hour >= 17 && hour < 22) {
    return {
      greeting: `Добрый вечер, ${USER_NAME}!`,
      hint: 'Спокойное время для тафсира и размышлений.',
    };
  }
  return {
    greeting: `Тихой ночи, ${USER_NAME}.`,
    hint: 'Пусть знание ляжет на сердце мягко.',
  };
}

const SSR_GREETING: Greeting = {
  greeting: `С возвращением, ${USER_NAME}!`,
  hint: 'Продолжайте своё обучение. Вы на правильном пути!',
};

export default function WelcomeCard() {
  const cardRef = useRef<HTMLDivElement>(null);
  // Используем SSR_GREETING чтобы избежать hydration mismatch
  const [greeting, setGreeting] = useState<Greeting>(SSR_GREETING);

  useEffect(() => {
    const update = () => setGreeting(greetingForHour(new Date().getHours()));
    update();
    const interval = setInterval(update, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="glass-card relative overflow-hidden rounded-2xl p-5 md:p-6 text-center"
    >
      <h2 className="font-serif text-xl md:text-2xl font-bold text-white tracking-wide">
        {greeting.greeting}
      </h2>

      <p className="mt-1.5 text-xs md:text-sm text-white/60 mx-auto max-w-md">
        {greeting.hint}
      </p>

      <div className="mt-5 flex flex-wrap justify-center gap-3">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className="group flex items-center gap-2.5 rounded-full px-4 py-2 bg-white/[0.02] border border-white/5 transition-all duration-300 hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/5 hover:shadow-[0_0_15px_rgba(212,175,55,0.1)]"
            style={{
              animationDelay: `${index * 0.1}s`,
            }}
          >
            <stat.icon
              size={16}
              strokeWidth={1.5}
              className="text-white/50 transition-all duration-300 group-hover:text-[#D4AF37] group-hover:scale-110"
            />
            <span className="text-sm font-bold text-[#D4AF37]">
              {stat.value}
            </span>
            <span className="text-xs text-white/50 group-hover:text-white/70 transition-colors duration-300">
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
