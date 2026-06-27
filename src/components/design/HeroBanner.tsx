'use client';

import { motion } from 'framer-motion';

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.2,
      duration: 0.7,
      ease: 'easeOut' as const,
    },
  }),
};

export default function HeroBanner() {
  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-b from-[#0B1F19] via-[#06201A]/95 to-[#051713] py-10 md:py-14 px-6 border-b border-white/5">
      {/* ── Silk-like animated background waves ── */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-55"
        viewBox="0 0 1440 400"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <g>
          <path
            className="hero-wave-1"
            d="M0,120 C360,200 720,30 1080,160 C1260,220 1380,200 1440,180 L1440,400 L0,400 Z"
            fill="url(#waveGradient1)"
          />
          <path
            className="hero-wave-2"
            d="M0,180 C240,100 600,240 960,140 C1200,90 1320,150 1440,130 L1440,400 L0,400 Z"
            fill="url(#waveGradient2)"
          />
          <path
            className="hero-wave-3"
            d="M0,240 C480,160 720,300 1200,180 C1320,150 1380,190 1440,170 L1440,400 L0,400 Z"
            fill="url(#waveGradient3)"
          />
        </g>
        <defs>
          <linearGradient id="waveGradient1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.08" />
            <stop offset="50%" stopColor="#0B1F19" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#06201A" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="waveGradient2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0D2620" stopOpacity="0.2" />
            <stop offset="70%" stopColor="#06201A" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#030F0C" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="waveGradient3" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.04" />
            <stop offset="40%" stopColor="#0D2620" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#06201A" stopOpacity="0.8" />
          </linearGradient>
        </defs>
      </svg>

      {/* ── Dark overlay for better text readability ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(3,20,16,0.7) 0%, rgba(3,20,16,0.4) 50%, rgba(3,20,16,0.6) 100%)',
        }}
      />

      {/* ── Content ── */}
      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center px-2 sm:px-4 text-center">
        {/* ── Sacred Basmala calligraphy ── */}
        <motion.div
          dir="rtl"
          lang="ar"
          className="w-full flex justify-center"
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          custom={0}
        >
          <span
            className="block max-w-full h-auto object-contain font-serif text-[#D4AF37] leading-[1.4] tracking-normal text-center"
            style={{
              fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
              textShadow: '0 0 30px rgba(212,175,55,0.4), 0 0 60px rgba(212,175,55,0.2)',
              whiteSpace: 'normal',
              wordBreak: 'keep-all',
            }}
          >
            بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
          </span>
        </motion.div>

        {/* ── Divider spacer ── */}
        <div className="mt-5 md:mt-6 h-px w-20 bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent" />

        {/* Heading */}
        <motion.h1
          className="mt-5 md:mt-6 font-serif text-2xl md:text-3xl lg:text-4xl font-bold leading-tight tracking-tight text-white drop-shadow-lg"
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          custom={1}
        >
          Путь к знаниям начинается здесь
        </motion.h1>

        {/* Subheading */}
        <motion.p
          className="mt-3 max-w-xl text-sm md:text-base text-white/80 leading-relaxed tracking-wide"
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          custom={2}
        >
          Изучайте Ислам с квалифицированными учителями. Акыда, фикх, арабский
          язык и тафсир — всё в одном месте.
        </motion.p>

        {/* CTA Button with shimmer */}
        <motion.a
          href="#courses"
          className="btn-shimmer mt-6 inline-block rounded-xl px-8 py-3 text-[11px] md:text-xs font-bold uppercase tracking-widest text-[#06201A] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_25px_rgba(212,175,55,0.5)] shadow-lg shadow-amber-500/15 md:text-[12px]"
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          custom={3}
        >
          Продолжить обучение
        </motion.a>
      </div>
    </section>
  );
}
