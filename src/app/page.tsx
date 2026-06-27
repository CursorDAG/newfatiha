import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { TeacherCard } from "@/components/landing/TeacherCard";
import { IconTile, resolveIcon, getCourseIcon } from "@/components/landing/icons";
import {
  BookOpen,
  Video,
  Users,
  Clock,
  Award,
  ArrowRight,
  Sparkles,
  GraduationCap,
  ShieldCheck,
  CalendarDays,
  CheckCircle2,
  BarChart3,
  Star,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type CourseCard = {
  id: string;
  title: string;
  description: string | null;
  streamCount: number;
};

type Teacher = {
  id: string;
  name: string;
  avatar: string | null;
  bio: string | null;
  skills: string[];
};

type HeroContent = {
  badge: string;
  title: string;
  subtitle: string;
  primaryButton: string;
  primaryButtonLink: string;
  secondaryButton?: string;
  secondaryButtonLink?: string;
};

type StatItem = {
  value: string;
  label: string;
  icon: string;
};

type AboutFeature = {
  icon: string;
  title: string;
  desc?: string;
  description?: string;
};

type AboutContent = {
  badge?: string;
  title: string;
  description: string[];
  features?: AboutFeature[];
};

type HowStep = {
  step: string;
  title: string;
  desc: string;
};

type HowItWorks = {
  title?: string;
  subtitle?: string;
  steps?: HowStep[];
};

type Feature = {
  id: string;
  icon: string;
  title: string;
  description: string;
};

type Testimonial = {
  id: string;
  name: string;
  role: string;
  text: string;
  rating: number;
};

type FAQItem = {
  id: string;
  question: string;
  answer: string;
  category?: string;
};

type CTAContent = {
  badge?: string;
  title: string;
  description: string;
  primaryButton: string;
  primaryButtonLink: string;
  secondaryButton?: string;
  secondaryButtonLink?: string;
};

type Banner = {
  id: string;
  text: string;
  link?: string;
  color: string;
  imageUrl?: string;
  startDate?: string;
  endDate?: string;
  active: boolean;
};

// ── Static fallbacks ────────────────────────────────────────────────────────────

const TRUST_MARKERS = [
  { icon: GraduationCap, text: "Образование с иснадом" },
  { icon: ShieldCheck, text: "Дипломированные учёные" },
  { icon: Video, text: "Live-уроки онлайн" },
  { icon: CalendarDays, text: "Гибкое расписание" },
];

const HOW_IT_WORKS_FALLBACK: HowStep[] = [
  {
    step: "01",
    title: "Получите приглашение",
    desc: "Свяжитесь с учителем и получите персональную инвайт-ссылку для вступления в поток.",
  },
  {
    step: "02",
    title: "Присоединитесь к потоку",
    desc: "Зарегистрируйтесь по ссылке и автоматически окажитесь в своей учебной группе.",
  },
  {
    step: "03",
    title: "Занимайтесь и развивайтесь",
    desc: "Посещайте live-уроки, выполняйте домашние задания и отслеживайте свой прогресс.",
  },
];

const ABOUT_FEATURES_FALLBACK: AboutFeature[] = [
  { icon: "Award", title: "Квалифицированные учителя", desc: "Дипломированные учёные с классическим исламским образованием." },
  { icon: "Video", title: "Live-уроки через видеосвязь", desc: "Интерактивные занятия в реальном времени — задавайте вопросы сразу." },
  { icon: "CheckCircle2", title: "Домашние задания с проверкой", desc: "Каждое задание проверяется учителем с комментарием и оценкой." },
  { icon: "BarChart3", title: "Личный прогресс", desc: "Отслеживайте успеваемость: тесты, домашние задания, посещаемость." },
];

const COURSES_FALLBACK = [
  { title: "Акыда", desc: "Основы исламского вероубеждения по проверенным источникам." },
  { title: "Фикх", desc: "Практические вопросы исламского права для повседневной жизни." },
  { title: "Арабский язык", desc: "С нуля до уверенного чтения текстов Куръана." },
  { title: "Тафсир", desc: "Толкование аятов Куръана с пояснениями учёных." },
];

// Small ornamental divider component
function Divider() {
  return (
    <div className="divider-gold my-2" aria-hidden="true">
      <span className="text-gold/70 text-sm">✦</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  const dashboardUrl =
    session?.user.role === "TEACHER" || session?.user.role === "ADMIN"
      ? "/teacher"
      : session
        ? "/student"
        : null;

  // Load CMS content (fallback to static)
  let pageContent: Record<string, unknown> | null = null;
  try {
    const contentData = await prisma.pageContent.findUnique({
      where: { page: "home" },
    });
    if (contentData) {
      pageContent = contentData.sections as Record<string, unknown>;
    }
  } catch (error) {
    console.error("Failed to load CMS content:", error);
  }

  // Published courses
  const rawCourses = await prisma.course.findMany({
    where: { published: true },
    include: { _count: { select: { streams: true } } },
    orderBy: { createdAt: "asc" },
    take: 6,
  });

  const courses: CourseCard[] = rawCourses.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    streamCount: c._count.streams,
  }));

  // Teachers
  const teachers: Teacher[] = await prisma.user.findMany({
    where: { role: { in: ["TEACHER", "ADMIN"] }, isBlocked: false },
    select: { id: true, name: true, avatar: true, bio: true, skills: true },
    orderBy: { createdAt: "asc" },
    take: 6,
  });

  // ── CMS content with fallbacks ──
  const heroContent: HeroContent = (pageContent?.hero as HeroContent | undefined) || {
    badge: "Исламская онлайн-платформа",
    title: "Знания Ислама — где бы ты ни был",
    subtitle:
      "Сертифицированная платформа для изучения акыды, фикха, арабского языка и тафсира. Live-уроки, проверка домашних заданий и личный прогресс — всё в одном месте.",
    primaryButton: "Посмотреть курсы",
    primaryButtonLink: "#courses",
  };

  const stats: StatItem[] =
    (pageContent?.stats as StatItem[] | undefined) || [
      { value: courses.length > 0 ? `${courses.length}+` : "5+", label: "курсов", icon: "BookOpen" },
      { value: "100%", label: "онлайн", icon: "Video" },
      { value: "Live", label: "уроки", icon: "Users" },
    ];

  const aboutContent: AboutContent = (pageContent?.about as AboutContent | undefined) || {
    badge: "О платформе",
    title: "Образование с иснадом — живая цепочка знаний",
    description: [
      "Fatiha.ru объединяет преподавателей с традиционным исламским образованием и современную технологическую платформу. Каждый курс ведут дипломированные учёные с опытом преподавания более 10 лет.",
      "Получать знания можно без отрыва от семьи и работы: гибкое расписание, записи уроков и персональная обратная связь — всё включено.",
    ],
  };
  const aboutFeatures: AboutFeature[] = aboutContent.features?.length
    ? aboutContent.features
    : ABOUT_FEATURES_FALLBACK;

  const howItWorks: HowItWorks = (pageContent?.howItWorks as HowItWorks | undefined) || {};
  const howSteps: HowStep[] = howItWorks.steps?.length ? howItWorks.steps : HOW_IT_WORKS_FALLBACK;

  const ctaContent: CTAContent = (pageContent?.cta as CTAContent | undefined) || {
    badge: "Начните обучение сегодня",
    title: "Готовы начать путь к знаниям?",
    description:
      "Доступ в платформу предоставляется по приглашению учителя. Свяжитесь с преподавателем, чтобы получить вашу персональную ссылку.",
    primaryButton: "Войти в кабинет",
    primaryButtonLink: "/api/auth/signin",
    secondaryButton: "Смотреть курсы",
    secondaryButtonLink: "#courses",
  };

  const features: Feature[] = (pageContent?.features as Feature[]) || [];
  const testimonials: Testimonial[] = (pageContent?.testimonials as Testimonial[]) || [];
  const faqItems: FAQItem[] = (pageContent?.faq as FAQItem[]) || [];
  const banners: Banner[] = (pageContent?.banners as Banner[]) || [];

  const activeBanners = banners.filter((banner) => {
    if (!banner.active) return false;
    const now = new Date();
    if (banner.startDate && new Date(banner.startDate) > now) return false;
    if (banner.endDate && new Date(banner.endDate) < now) return false;
    return true;
  });

  return (
    <div
      className="min-h-screen font-sans text-cream relative overflow-hidden"
      style={{ background: "radial-gradient(circle at 50% 0%, #0B1F19 0%, #031410 65%, #010806 100%)" }}
    >
      {/* ── Ambient background ───────────────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 pattern-islamic opacity-60" />
        <div className="hero-wave-1 absolute -top-[10%] -right-[10%] h-[600px] w-[600px] rounded-full bg-[#D4AF37]/[0.05] blur-[130px]" />
        <div className="hero-wave-2 absolute top-[30%] -left-[15%] h-[700px] w-[700px] rounded-full bg-[#06201A]/60 blur-[150px]" />
        <div className="hero-wave-3 absolute -bottom-[15%] -right-[5%] h-[800px] w-[800px] rounded-full bg-[#D4AF37]/[0.03] blur-[160px]" />
      </div>

      <div className="relative z-10">

        {/* ── Banners ───────────────────────────────────────────────────────── */}
        {activeBanners.length > 0 && (
          <div className="space-y-0">
            {activeBanners.map((banner) => {
              const colorClasses =
                {
                  blue: "bg-blue-600 text-white",
                  green: "bg-emerald-700 text-cream",
                  yellow: "bg-gold text-[#031410]",
                  red: "bg-red-700 text-white",
                  purple: "bg-purple-700 text-white",
                }[banner.color] || "bg-[#0B1F19] text-cream border-b border-gold/20";

              const BannerContent = (
                <div className={`${colorClasses} py-3 px-6`}>
                  <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 text-sm font-medium">
                    {banner.imageUrl && <img src={banner.imageUrl} alt="" className="w-5 h-5 object-contain" />}
                    <span>{banner.text}</span>
                    {banner.link && <ArrowRight className="w-4 h-4" />}
                  </div>
                </div>
              );

              return banner.link ? (
                <a key={banner.id} href={banner.link} className="block hover:opacity-90 transition-opacity">
                  {BannerContent}
                </a>
              ) : (
                <div key={banner.id}>{BannerContent}</div>
              );
            })}
          </div>
        )}

        {/* ── Navbar ──────────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-50 bg-[#031410]/80 backdrop-blur-xl border-b border-gold/15">
          <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2.5 shrink-0">
              <span className="w-9 h-9 bg-gradient-to-br from-gold to-[#8C6D1F] rounded-xl flex items-center justify-center text-[#031410] text-lg font-bold shadow-md shadow-gold/20">
                ف
              </span>
              <span className="text-xl font-extrabold text-cream tracking-tight font-serif">
                Fatiha<span className="text-gold">.ru</span>
              </span>
            </Link>

            {/* DEBUG_NAV_12345 */}
            <div className="hidden md:flex items-center gap-7 text-sm font-semibold text-cream/60">
              <a href="#courses" className="hover:text-gold transition-colors">Курсы</a>
              <a href="/library" className="hover:text-gold transition-colors">Библиотека</a>
              <a href="#advantages" className="hover:text-gold transition-colors">Преимущества</a>
              <a href="#how" className="hover:text-gold transition-colors">Как начать</a>
              <a href="#teachers" className="hover:text-gold transition-colors">Учителя</a>
            </div>

            <div className="flex items-center gap-3">
              {dashboardUrl ? (
                <Link href={dashboardUrl} className="btn-shimmer px-5 py-2 rounded-xl text-sm transition-all hover:-translate-y-px">
                  Мой кабинет →
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth/register"
                    className="hidden sm:inline-flex border border-gold/40 text-gold hover:bg-gold/10 hover:border-gold font-bold px-5 py-2 rounded-xl text-sm transition-all"
                  >
                    Регистрация
                  </Link>
                  <Link href="/api/auth/signin" className="btn-shimmer px-5 py-2 rounded-xl text-sm transition-all hover:-translate-y-px">
                    Войти
                  </Link>
                </>
              )}
            </div>
          </nav>
        </header>

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[22rem] sm:text-[30rem] font-bold text-gold/[0.035] select-none leading-none font-serif">
              ف
            </div>
          </div>

          <div className="relative max-w-5xl mx-auto px-6 pt-24 pb-24 text-center">
            <div className="inline-flex items-center gap-2 glass rounded-full px-5 py-2 text-gold text-sm font-semibold mb-9">
              <Sparkles className="w-4 h-4 text-gold" />
              {heroContent.badge}
            </div>

            <h1 className="text-5xl sm:text-7xl font-extrabold mb-7 leading-[1.05] tracking-tight font-serif text-cream">
              {heroContent.title.includes("—") ? (
                <>
                  {heroContent.title.split("—")[0]}—<br />
                  <span className="text-gold">{heroContent.title.split("—").slice(1).join("—")}</span>
                </>
              ) : (
                heroContent.title
              )}
            </h1>

            <p className="text-cream/70 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              {heroContent.subtitle}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link
                href={heroContent.primaryButtonLink || "#courses"}
                className="group btn-shimmer px-9 py-4 rounded-2xl text-lg transition-all shadow-xl shadow-gold/10 hover:-translate-y-1 flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                {heroContent.primaryButton}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href={heroContent.secondaryButtonLink || "/api/auth/signin"}
                className="glass hover:border-gold/40 text-cream font-bold px-9 py-4 rounded-2xl text-lg transition-all w-full sm:w-auto justify-center flex items-center gap-2"
              >
                {heroContent.secondaryButton || "Войти в кабинет"}
              </Link>
            </div>

            {/* Trust markers */}
            <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3 mb-14">
              {TRUST_MARKERS.map((m) => (
                <span key={m.text} className="inline-flex items-center gap-2 text-sm text-cream/55">
                  <m.icon className="w-4 h-4 text-gold/80" strokeWidth={1.75} />
                  {m.text}
                </span>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 max-w-2xl mx-auto gap-6">
              {stats.map((s) => {
                const Icon = resolveIcon(s.icon, BookOpen);
                return (
                  <div key={s.label} className="group text-center glass-card p-6">
                    <div className="flex justify-center mb-3">
                      <IconTile icon={Icon} size={48} iconSize={22} />
                    </div>
                    <div className="text-3xl font-extrabold text-gold font-serif">{s.value}</div>
                    <div className="text-sm text-cream/60 font-semibold mt-1">{s.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Courses ───────────────────────────────────────────────────────── */}
        <section id="courses" className="py-24">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-14">
              <span className="eyebrow mb-4">
                <BookOpen className="w-4 h-4" />
                Программа
              </span>
              <h2 className="text-4xl sm:text-5xl font-extrabold text-cream mt-3 mb-4 font-serif">Курсы платформы</h2>
              <p className="text-cream/60 text-lg max-w-2xl mx-auto">
                Изучайте Ислам системно — от основ вероубеждения до чтения и толкования Куръана.
              </p>
            </div>

            {courses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
                {courses.map((course) => (
                  <div key={course.id} className="group glass-card p-8 flex flex-col hover:-translate-y-2 hover:shadow-2xl hover:shadow-gold/20 transition-all duration-300">
                    <div className="mb-6 group-hover:scale-110 transition-transform duration-300">
                      <IconTile icon={getCourseIcon(course.title)} size={60} iconSize={28} />
                    </div>
                    <h3 className="text-xl font-bold text-cream mb-3 font-serif group-hover:text-gold transition-colors">
                      {course.title}
                    </h3>
                    {course.description && (
                      <p className="text-cream/60 text-sm leading-relaxed mb-6 line-clamp-3">{course.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-auto pt-5 border-t border-gold/12">
                      <span className="inline-flex items-center gap-2 text-xs font-bold text-cream/50">
                        <Users className="w-4 h-4" />
                        {course.streamCount > 0
                          ? `${course.streamCount} ${course.streamCount === 1 ? "поток" : "потоков"}`
                          : "Скоро"}
                      </span>
                      <Link
                        href="/api/auth/signin"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {COURSES_FALLBACK.map((c) => (
                  <div key={c.title} className="group glass-card p-7 flex flex-col hover:-translate-y-2 hover:shadow-2xl hover:shadow-gold/20 transition-all duration-300">
                    <div className="mb-5 group-hover:scale-110 transition-transform duration-300">
                      <IconTile icon={getCourseIcon(c.title)} size={56} iconSize={26} />
                    </div>
                    <h3 className="text-lg font-bold text-cream mb-3 font-serif group-hover:text-gold transition-colors">{c.title}</h3>
                    <p className="text-cream/60 text-sm leading-relaxed">{c.desc}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Advantages / About ────────────────────────────────────────────── */}
        <section id="advantages" className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-gold/[0.04] blur-3xl" />
          </div>

          <div className="relative max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="eyebrow mb-4">
                <Award className="w-4 h-4" />
                {aboutContent.badge || "О платформе"}
              </span>
              <h2 className="text-4xl sm:text-5xl font-extrabold mt-3 mb-7 leading-tight font-serif text-cream">
                {aboutContent.title}
              </h2>
              {aboutContent.description.map((paragraph, index) => (
                <p key={index} className="text-cream/70 text-lg leading-relaxed mb-5">
                  {paragraph}
                </p>
              ))}

              <div className="flex flex-wrap gap-3 mt-8">
                <Link
                  href="#courses"
                  className="btn-shimmer px-7 py-3 rounded-xl text-base inline-flex items-center gap-2 hover:-translate-y-px transition-transform"
                >
                  Выбрать курс
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {aboutFeatures.map((f, i) => {
                const Icon = resolveIcon(f.icon, Award);
                return (
                  <div key={i} className="group glass-card p-6">
                    <IconTile icon={Icon} size={48} iconSize={22} className="mb-4" />
                    <p className="font-bold text-cream text-base mb-2 font-serif">{f.title}</p>
                    <p className="text-sm text-cream/55 leading-relaxed">{f.desc || f.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-6"><Divider /></div>

        {/* ── How it works ──────────────────────────────────────────────────── */}
        <section id="how" className="py-24">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <span className="eyebrow mb-4">
                <Clock className="w-4 h-4" />
                Процесс
              </span>
              <h2 className="text-4xl sm:text-5xl font-extrabold text-cream mt-3 mb-4 font-serif">
                {howItWorks.title || "Как начать обучение"}
              </h2>
              <p className="text-cream/60 text-lg max-w-2xl mx-auto">
                {howItWorks.subtitle || "Всего три простых шага — и вы уже занимаетесь с живым учителем."}
              </p>
            </div>

            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Connecting line (desktop) */}
              <div className="hidden md:block absolute top-8 left-[16.66%] right-[16.66%] h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" aria-hidden="true" />

              {howSteps.map((item, index) => (
                <div key={item.step} className="relative text-center">
                  <div className="flex justify-center mb-6">
                    <span className="relative w-16 h-16 icon-tile-solid icon-tile rounded-2xl flex items-center justify-center text-2xl font-extrabold font-serif">
                      {item.step || String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-cream mb-3 font-serif">{item.title}</h3>
                  <p className="text-cream/60 text-sm leading-relaxed max-w-xs mx-auto">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features (CMS, optional) ──────────────────────────────────────── */}
        {features.length > 0 && (
          <section className="py-24">
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-14">
                <span className="eyebrow mb-4">
                  <Sparkles className="w-4 h-4" />
                  Преимущества
                </span>
                <h2 className="text-4xl sm:text-5xl font-extrabold text-cream mt-3 mb-4 font-serif">Почему выбирают нас</h2>
                <p className="text-cream/60 text-lg max-w-2xl mx-auto">Что вы получаете на платформе Fatiha.ru.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                {features.map((feature) => {
                  const Icon = resolveIcon(feature.icon, Star);
                  return (
                    <div key={feature.id} className="group glass-card p-8">
                      <IconTile icon={Icon} size={52} iconSize={24} className="mb-5" />
                      <h3 className="text-xl font-bold text-cream mb-3 font-serif">{feature.title}</h3>
                      <p className="text-cream/60 leading-relaxed">{feature.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── Teachers ──────────────────────────────────────────────────────── */}
        <section id="teachers" className="py-24">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-14">
              <span className="eyebrow mb-4">
                <Users className="w-4 h-4" />
                Команда
              </span>
              <h2 className="text-4xl sm:text-5xl font-extrabold text-cream mt-3 mb-4 font-serif">Наши преподаватели</h2>
              <p className="text-cream/60 text-lg max-w-2xl mx-auto">
                Опытные учителя исламских наук с традиционным образованием и иснадом.
              </p>
            </div>

            {teachers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                {teachers.map((teacher) => (
                  <TeacherCard
                    key={teacher.id}
                    name={teacher.name}
                    avatar={teacher.avatar}
                    bio={teacher.bio}
                    skills={teacher.skills}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 glass-card">
                <div className="flex justify-center mb-4">
                  <IconTile icon={Users} size={56} iconSize={26} />
                </div>
                <p className="text-cream/55 text-lg font-medium">Информация о преподавателях скоро появится</p>
              </div>
            )}
          </div>
        </section>

        {/* ── Testimonials (CMS, optional) ──────────────────────────────────── */}
        {testimonials.length > 0 && (
          <section className="py-24">
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-14">
                <span className="eyebrow mb-4">
                  <Star className="w-4 h-4" />
                  Отзывы
                </span>
                <h2 className="text-4xl sm:text-5xl font-extrabold text-cream mt-3 mb-4 font-serif">Отзывы студентов</h2>
                <p className="text-cream/60 text-lg max-w-2xl mx-auto">Что говорят те, кто уже учится с нами.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                {testimonials.map((t) => (
                  <div key={t.id} className="glass-card p-8 flex flex-col">
                    <div className="flex items-center gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-5 h-5 ${i < t.rating ? "text-gold fill-gold" : "text-cream/20"}`}
                          strokeWidth={1.5}
                        />
                      ))}
                    </div>
                    <p className="text-cream/80 leading-relaxed mb-6 italic flex-1">&ldquo;{t.text}&rdquo;</p>
                    <div className="flex items-center gap-3 pt-5 border-t border-gold/12">
                      <div className="w-11 h-11 bg-gradient-to-br from-gold to-[#8C6D1F] rounded-full flex items-center justify-center text-[#031410] font-bold font-serif">
                        {t.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-cream text-sm">{t.name}</p>
                        <p className="text-xs text-cream/55">{t.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── FAQ (CMS, optional) ───────────────────────────────────────────── */}
        {faqItems.length > 0 && (
          <section className="py-24">
            <div className="max-w-4xl mx-auto px-6">
              <div className="text-center mb-14">
                <span className="eyebrow mb-4">
                  <MessageCircleIcon />
                  Вопросы
                </span>
                <h2 className="text-4xl sm:text-5xl font-extrabold text-cream mt-3 mb-4 font-serif">Частые вопросы</h2>
                <p className="text-cream/60 text-lg">Ответы на популярные вопросы о платформе.</p>
              </div>

              <div className="space-y-4">
                {faqItems.map((item) => (
                  <details key={item.id} className="glass rounded-xl overflow-hidden group">
                    <summary className="px-6 py-5 cursor-pointer font-bold text-cream hover:bg-gold/[0.06] transition-colors flex items-center justify-between gap-4">
                      <span>{item.question}</span>
                      <svg
                        className="w-5 h-5 text-gold group-open:rotate-180 transition-transform shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="px-6 pb-5 text-cream/70 leading-relaxed">{item.answer}</div>
                  </details>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Final CTA ─────────────────────────────────────────────────────── */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[16rem] font-bold text-gold/[0.03] font-serif leading-none select-none">
              ف
            </div>
            <div className="absolute top-0 left-1/4 w-[300px] h-[300px] rounded-full bg-gold/[0.05] blur-3xl" />
          </div>

          <div className="relative max-w-3xl mx-auto px-6">
            <div className="glass-card p-10 sm:p-14 text-center">
              <div className="inline-flex items-center gap-2 glass rounded-full px-5 py-2 text-gold text-sm font-semibold mb-7">
                <Sparkles className="w-4 h-4" />
                {ctaContent.badge || "Начните обучение сегодня"}
              </div>

              <h2 className="text-3xl sm:text-5xl font-extrabold mb-5 leading-tight font-serif text-cream">
                {ctaContent.title}
              </h2>
              <p className="text-cream/70 text-lg mb-10 leading-relaxed max-w-2xl mx-auto">
                {ctaContent.description}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href={ctaContent.primaryButtonLink || "/api/auth/signin"}
                  className="group btn-shimmer px-9 py-4 rounded-2xl text-lg transition-all shadow-xl shadow-gold/10 hover:-translate-y-1 inline-flex items-center justify-center gap-2"
                >
                  {ctaContent.primaryButton}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href={ctaContent.secondaryButtonLink || "#courses"}
                  className="glass hover:border-gold/40 text-cream font-bold px-9 py-4 rounded-2xl text-lg transition-all inline-flex items-center justify-center gap-2"
                >
                  <BookOpen className="w-5 h-5" />
                  {ctaContent.secondaryButton || "Смотреть курсы"}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <footer className="bg-[#020a07] text-cream/50 border-t border-gold/15">
          <div className="max-w-6xl mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-3 gap-10">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-9 h-9 bg-gradient-to-br from-gold to-[#8C6D1F] rounded-xl flex items-center justify-center text-[#031410] text-lg font-bold">
                  ف
                </span>
                <span className="text-xl font-extrabold text-cream font-serif">
                  Fatiha<span className="text-gold">.ru</span>
                </span>
              </div>
              <p className="text-sm leading-relaxed">
                Исламская онлайн-платформа для изучения традиционных наук. Знания с иснадом — для каждого.
              </p>
            </div>

            <div>
              <p className="text-cream font-bold text-sm mb-4">Навигация</p>
              <ul className="space-y-2 text-sm">
                <li><a href="#courses" className="hover:text-gold transition-colors">Курсы</a></li>
                <li><a href="#advantages" className="hover:text-gold transition-colors">Преимущества</a></li>
                <li><a href="#how" className="hover:text-gold transition-colors">Как начать</a></li>
                <li><a href="#teachers" className="hover:text-gold transition-colors">Учителя</a></li>
                <li><Link href="/api/auth/signin" className="hover:text-gold transition-colors">Войти</Link></li>
              </ul>
            </div>

            <div>
              <p className="text-cream font-bold text-sm mb-4">Платформа</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2"><Video className="w-4 h-4 text-gold/70" strokeWidth={1.75} />Live-уроки через видеосвязь</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-gold/70" strokeWidth={1.75} />Домашние задания с проверкой</li>
                <li className="flex items-center gap-2"><BarChart3 className="w-4 h-4 text-gold/70" strokeWidth={1.75} />Прогресс и аналитика</li>
                <li className="flex items-center gap-2"><CalendarDays className="w-4 h-4 text-gold/70" strokeWidth={1.75} />Гибкое расписание</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gold/10 px-6 py-6 text-center text-xs">
            © 2026 Fatiha.ru — Платформа исламского образования. Все права защищены.
          </div>
        </footer>

      </div>
    </div>
  );
}

// Small inline icon to avoid an extra top-level import collision
function MessageCircleIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12a9 9 0 11-3.5-7.1L21 3v9z" />
    </svg>
  );
}
