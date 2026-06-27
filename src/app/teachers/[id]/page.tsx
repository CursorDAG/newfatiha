import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTeacherRating, getTeacherReviews } from "@/lib/reviews";
import RatingStars from "@/components/reviews/RatingStars";
import ReviewList from "@/components/reviews/ReviewList";
import {
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  Award,
  BookOpen,
  Users,
  Star,
  PlayCircle,
  MessageCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

// ── Data ────────────────────────────────────────────────────────────────────

async function getTeacher(id: string) {
  const teacher = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      avatar: true,
      gender: true,
      role: true,
      isBlocked: true,
      teacherProfile: {
        select: {
          bio: true,
          subjects: true,
          experience: true,
          qualifications: true,
          videoIntroUrl: true,
          whatsappPhone: true,
          reviewedAt: true,
          rejectionReason: true,
        },
      },
    },
  });

  return teacher;
}

async function getTeacherStreams(teacherId: string) {
  return prisma.stream.findMany({
    where: {
      isOpenForEnrollment: true,
      course: {
        teacherId,
        published: true,
      },
      OR: [
        { enrollmentDeadline: null },
        { enrollmentDeadline: { gte: new Date() } },
      ],
    },
    select: {
      id: true,
      name: true,
      level: true,
      price: true,
      currency: true,
      color: true,
      enrollmentDeadline: true,
      course: {
        select: {
          title: true,
          description: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Склонение слова «отзыв» по числу. */
function pluralReviews(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "отзыв";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "отзыва";
  return "отзывов";
}

/** Преобразует ссылку YouTube в embed-URL, иначе возвращает null. */
function getYouTubeEmbed(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
  }
  return null;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function TeacherPublicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teacher = await getTeacher(id);

  // Не учитель / заблокирован / нет профиля
  if (
    !teacher ||
    teacher.role !== "TEACHER" ||
    teacher.isBlocked ||
    !teacher.teacherProfile
  ) {
    notFound();
  }

  const profile = teacher.teacherProfile;

  // Только одобренные преподаватели публично видны
  if (!profile.reviewedAt || profile.rejectionReason) {
    notFound();
  }

  const streams = await getTeacherStreams(teacher.id);
  const [rating, reviews] = await Promise.all([
    getTeacherRating(teacher.id),
    getTeacherReviews(teacher.id),
  ]);

  const subjects = profile.subjects.length > 0 ? profile.subjects : ["Преподаватель"];
  const youtubeEmbed = profile.videoIntroUrl
    ? getYouTubeEmbed(profile.videoIntroUrl)
    : null;
  const whatsappLink = profile.whatsappPhone
    ? `https://wa.me/${profile.whatsappPhone.replace(/[^0-9]/g, "")}`
    : null;

  return (
    <div
      className="min-h-screen font-sans text-cream relative overflow-hidden"
      style={{
        background:
          "radial-gradient(circle at 50% 0%, #0B1F19 0%, #031410 65%, #010806 100%)",
      }}
    >
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 pattern-islamic opacity-60" />
        <div className="absolute -top-[10%] -right-[10%] h-[500px] w-[500px] rounded-full bg-[#D4AF37]/[0.05] blur-[130px]" />
        <div className="absolute top-[40%] -left-[15%] h-[600px] w-[600px] rounded-full bg-[#06201A]/60 blur-[150px]" />
      </div>

      <div className="relative z-10">
        {/* Navbar */}
        <header className="sticky top-0 z-50 bg-[#031410]/80 backdrop-blur-xl border-b border-gold/15">
          <nav className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2.5 shrink-0">
              <span className="w-9 h-9 bg-gradient-to-br from-gold to-[#8C6D1F] rounded-xl flex items-center justify-center text-[#031410] text-lg font-bold shadow-md shadow-gold/20">
                ف
              </span>
              <span className="text-xl font-extrabold text-cream tracking-tight font-serif">
                Fatiha<span className="text-gold">.ru</span>
              </span>
            </Link>
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 text-sm font-semibold text-cream/60 hover:text-gold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Все курсы
            </Link>
          </nav>
        </header>

        <div className="max-w-5xl mx-auto px-6 py-12">
          {/* ── Шапка преподавателя ──────────────────────────────────── */}
          <section className="glass-card p-8 sm:p-10">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 text-center sm:text-left">
              {/* Аватар */}
              <div className="relative shrink-0">
                <div className="absolute -inset-1.5 rounded-full bg-gradient-to-br from-gold/40 to-transparent opacity-70 blur-[2px]" />
                {teacher.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={teacher.avatar}
                    alt={teacher.name}
                    className="relative w-28 h-28 rounded-full object-cover border-2 border-gold/40"
                  />
                ) : (
                  <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-gold to-[#8C6D1F] flex items-center justify-center text-[#031410] text-3xl font-bold font-serif border-2 border-gold/40">
                    {getInitials(teacher.name)}
                  </div>
                )}
                <span className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-[#031410] border border-gold/40 flex items-center justify-center text-gold">
                  <GraduationCap className="w-5 h-5" strokeWidth={1.75} />
                </span>
              </div>

              {/* Имя, предметы, опыт */}
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-cream font-serif mb-3">
                  {teacher.name}
                </h1>

                <div className="flex flex-wrap gap-2 justify-center sm:justify-start mb-4">
                  {subjects.map((subject, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gold/10 text-gold-light border border-gold/20"
                    >
                      {subject}
                    </span>
                  ))}
                </div>

                {profile.experience && (
                  <p className="inline-flex items-center gap-2 text-sm text-cream/60">
                    <Award className="w-4 h-4 text-gold/80" strokeWidth={1.75} />
                    Опыт преподавания
                  </p>
                )}

                {(whatsappLink || streams.length > 0) && (
                  <div className="flex flex-wrap gap-3 justify-center sm:justify-start mt-6">
                    {streams.length > 0 && (
                      <a
                        href="#courses"
                        className="btn-shimmer px-6 py-3 rounded-xl text-sm inline-flex items-center gap-2 hover:-translate-y-px transition-transform"
                      >
                        Записаться
                        <ArrowRight className="w-4 h-4" />
                      </a>
                    )}
                    {whatsappLink && (
                      <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="glass hover:border-gold/40 text-cream font-bold px-6 py-3 rounded-xl text-sm inline-flex items-center gap-2 transition-all"
                      >
                        <MessageCircle className="w-4 h-4 text-gold/80" />
                        Связаться
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ── Видео-интро ──────────────────────────────────────────── */}
          {profile.videoIntroUrl && (
            <section className="mt-8">
              <h2 className="text-xl font-bold text-cream font-serif mb-4 flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-gold" />
                Видео-представление
              </h2>
              {youtubeEmbed ? (
                <div className="glass-card p-2 overflow-hidden">
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden">
                    <iframe
                      src={youtubeEmbed}
                      title={`Видео-представление: ${teacher.name}`}
                      className="absolute inset-0 w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              ) : (
                <div className="glass-card p-2 overflow-hidden">
                  <video
                    controls
                    preload="metadata"
                    className="w-full aspect-video rounded-xl bg-black"
                    src={profile.videoIntroUrl}
                  >
                    Ваш браузер не поддерживает воспроизведение видео.{" "}
                    <a href={profile.videoIntroUrl} className="text-gold underline">
                      Открыть видео
                    </a>
                  </video>
                </div>
              )}
            </section>
          )}

          {/* ── О себе / Био ─────────────────────────────────────────── */}
          {profile.bio && (
            <section className="mt-8 glass-card p-8">
              <h2 className="text-xl font-bold text-cream font-serif mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-gold" />
                О преподавателе
              </h2>
              <p className="text-cream/70 leading-relaxed whitespace-pre-wrap">
                {profile.bio}
              </p>
            </section>
          )}

          {/* ── Опыт и квалификации ──────────────────────────────────── */}
          {(profile.experience || profile.qualifications) && (
            <section className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {profile.experience && (
                <div className="glass-card p-8">
                  <h2 className="text-lg font-bold text-cream font-serif mb-3 flex items-center gap-2">
                    <Award className="w-5 h-5 text-gold" />
                    Опыт преподавания
                  </h2>
                  <p className="text-cream/70 leading-relaxed whitespace-pre-wrap">
                    {profile.experience}
                  </p>
                </div>
              )}
              {profile.qualifications && (
                <div className="glass-card p-8">
                  <h2 className="text-lg font-bold text-cream font-serif mb-3 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-gold" />
                    Квалификации
                  </h2>
                  <p className="text-cream/70 leading-relaxed whitespace-pre-wrap">
                    {profile.qualifications}
                  </p>
                </div>
              )}
            </section>
          )}

          {/* ── Курсы преподавателя ──────────────────────────────────── */}
          <section id="courses" className="mt-12">
            <h2 className="text-2xl font-bold text-cream font-serif mb-6 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-gold" />
              Курсы преподавателя
            </h2>

            {streams.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {streams.map((stream) => (
                  <div
                    key={stream.id}
                    className="group glass-card p-6 flex flex-col overflow-hidden"
                  >
                    <div
                      className="h-1 -mx-6 -mt-6 mb-5"
                      style={{ backgroundColor: stream.color }}
                    />
                    <h3 className="text-lg font-bold text-cream font-serif mb-2 group-hover:text-gold transition-colors">
                      {stream.course.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gold/10 text-gold-light border border-gold/20">
                        {stream.name}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/[0.04] text-cream/60 border border-gold/12">
                        {stream.level}
                      </span>
                    </div>
                    {stream.course.description && (
                      <p className="text-cream/60 text-sm leading-relaxed mb-5 line-clamp-3">
                        {stream.course.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-auto pt-5 border-t border-gold/12">
                      {stream.price ? (
                        <span className="text-lg font-extrabold text-gold font-serif">
                          {stream.price.toString()} {stream.currency}
                        </span>
                      ) : (
                        <span className="text-sm font-semibold text-cream/50">
                          Бесплатно
                        </span>
                      )}
                      <Link
                        href={`/courses/${stream.id}/apply`}
                        className="inline-flex items-center gap-1 text-sm font-bold text-gold hover:text-gold-light transition-colors group-hover:gap-2"
                      >
                        Записаться
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card p-10 text-center">
                <div className="flex justify-center mb-4 text-gold/70">
                  <BookOpen className="w-12 h-12" strokeWidth={1.5} />
                </div>
                <p className="text-cream/55 text-lg font-medium">
                  Открытых курсов пока нет
                </p>
                <p className="text-cream/40 text-sm mt-2">
                  Загляните позже или свяжитесь с преподавателем напрямую
                </p>
              </div>
            )}
          </section>

          {/* ── Рейтинг / Отзывы ─────────────────────────────────────── */}
          <section className="mt-12">
            <h2 className="text-2xl font-bold text-cream font-serif mb-6 flex items-center gap-2">
              <Star className="w-6 h-6 text-gold" />
              Отзывы
            </h2>

            <div data-teacher-rating-slot className="space-y-6">
              {/* Сводка рейтинга */}
              <div className="glass-card p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-5xl font-bold text-[#D4AF37] leading-none">
                    {rating.count > 0 ? rating.average.toFixed(1) : "—"}
                  </span>
                  <div>
                    <RatingStars value={rating.average} size={22} />
                    <p className="text-white/55 text-sm mt-1">
                      {rating.count > 0
                        ? `${rating.count} ${pluralReviews(rating.count)}`
                        : "Пока нет отзывов"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Список отзывов */}
              <ReviewList reviews={reviews} showCourse />
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="bg-[#020a07] text-cream/50 border-t border-gold/15 mt-12">
          <div className="max-w-5xl mx-auto px-6 py-8 text-center text-xs">
            © 2026 Fatiha.ru — Платформа исламского образования. Все права защищены.
          </div>
        </footer>
      </div>
    </div>
  );
}
