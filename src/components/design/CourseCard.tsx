'use client';

import Image from 'next/image';
import React, { useCallback, useRef } from 'react';

interface CourseCardProps {
  title: string;
  instructor: string;
  image: string;
  progress: number;
  total: number;
  category: string;
}

export default function CourseCard({
  title,
  instructor,
  image,
  progress,
  total,
  category,
}: CourseCardProps) {
  const progressPercent = total > 0 ? (progress / total) * 100 : 0;
  const cardRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const card = cardRef.current;
      if (!card) return;

      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -8;
        const rotateY = ((x - centerX) / centerX) * 8;

        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
      });
    },
    [],
  );

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    cancelAnimationFrame(rafRef.current);
    card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
  }, []);

  return (
    <div
      ref={cardRef}
      className="glass-card group relative overflow-hidden rounded-2xl will-change-transform"
      style={{
        transition: 'transform 0.4s cubic-bezier(0.03, 0.98, 0.52, 0.99), border-color 0.3s, box-shadow 0.3s, background-color 0.3s',
        transformStyle: 'preserve-3d',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(300px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(212,175,55,0.12), transparent 70%)',
        }}
      />

      <div className="relative h-[180px] w-full overflow-hidden" style={{ transform: 'translateZ(20px)' }}>
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 400px"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#031410] via-[#031410]/60 to-transparent" />
        <span className="absolute right-3.5 top-3.5 z-20 rounded-full bg-[#D4AF37] px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#06201A]">
          {category}
        </span>
      </div>

      <div className="flex flex-col gap-3 p-6 relative z-10" style={{ transform: 'translateZ(30px)' }}>
        <h3 className="line-clamp-1 text-lg font-bold leading-snug text-white tracking-wide font-serif">
          {title}
        </h3>
        <p className="text-xs text-white/50 font-medium">Преподаватель: {instructor}</p>

        <div className="space-y-4 mt-5">
          <div className="flex items-center justify-between text-[10px] text-white/40">
            <span className="font-medium">Урок</span>
            <span className="font-mono">
              {progress} из {total}
            </span>
          </div>

          <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="progress-gold h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <button
            type="button"
            className="group relative w-full overflow-hidden rounded-lg py-2.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-300 md:text-[11px]"
            style={{ transform: 'translateZ(40px)' }}
          >
            {/* Background gradient */}
            <span className="absolute inset-0 bg-gradient-to-r from-[#D4AF37] via-[#E8C84B] to-[#D4AF37] transition-transform duration-300 group-hover:scale-105" />

            {/* Shine effect */}
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

            {/* Text */}
            <span className="relative z-10 text-[#06201A] group-hover:text-[#051210] transition-colors">
              Продолжить
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
