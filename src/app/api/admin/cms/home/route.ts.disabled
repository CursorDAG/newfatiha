import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ForbiddenError, ValidationError } from "@/lib/errors";

// Default home page content
const DEFAULT_CONTENT = {
  hero: {
    badge: "Исламская онлайн-платформа",
    title: "Знания Ислама — где бы ты ни был",
    subtitle: "Fatiha.ru — сертифицированная платформа для изучения акыды, фикха, арабского языка и тасфира. Live-уроки, домашние задания и личный прогресс в одном месте.",
    primaryButton: "Посмотреть курсы",
    primaryButtonLink: "#courses",
    secondaryButton: "Войти в кабинет",
    secondaryButtonLink: "/api/auth/signin",
  },
  stats: [
    { value: "5+", label: "курсов", icon: "BookOpen" },
    { value: "100%", label: "онлайн", icon: "Video" },
    { value: "Live", label: "уроки", icon: "Users" },
  ],
  howItWorks: {
    title: "Как начать обучение",
    subtitle: "Всего три простых шага — и ты уже занимаешься с живым учителем",
    steps: [
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
    ],
  },
  about: {
    badge: "О нас",
    title: "Образование с иснадом — живая цепочка знаний",
    description: [
      "Fatiha.ru объединяет преподавателей с традиционным исламским образованием и современную технологическую платформу. Каждый курс разработан дипломированными учёными с опытом преподавания более 10 лет.",
      "Мы убеждены: получать знания можно без отрыва от семьи и работы. Гибкое расписание, записи уроков и персональная обратная связь — всё включено.",
    ],
    features: [
      {
        icon: "Award",
        title: "Квалифицированные учителя",
        desc: "Дипломированные учёные с классическим исламским образованием.",
      },
      {
        icon: "Video",
        title: "Live-уроки через видеосвязь",
        desc: "Интерактивные занятия в реальном времени — задавайте вопросы сразу.",
      },
      {
        icon: "CheckCircle2",
        title: "Домашние задания с проверкой",
        desc: "Каждое задание проверяется учителем с комментарием и оценкой.",
      },
      {
        icon: "BarChart3",
        title: "Личный прогресс",
        desc: "Отслеживайте успеваемость: тесты, домашние задания, посещаемость.",
      },
    ],
  },
  cta: {
    badge: "Начните обучение сегодня",
    title: "Готовы начать путь к знаниям?",
    description: "Доступ в платформу предоставляется по приглашению учителя. Свяжитесь с преподавателем, чтобы получить вашу персональную ссылку.",
    primaryButton: "Войти в кабинет",
    primaryButtonLink: "/api/auth/signin",
    secondaryButton: "Смотреть курсы",
    secondaryButtonLink: "#courses",
  },
};

// GET /api/admin/cms/home - получить контент главной страницы
export const GET = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);

  if (!session) {
    throw new AuthError("Необходима авторизация");
  }

  if (session.user.role !== "ADMIN") {
    throw new ForbiddenError("Доступ запрещен");
  }

  const pageContent = await prisma.pageContent.findUnique({
    where: { page: "home" },
  });

  if (!pageContent) {
    return NextResponse.json({
      sections: DEFAULT_CONTENT,
      isDefault: true,
    });
  }

  return NextResponse.json({
    sections: pageContent.sections,
    isDefault: false,
    updatedAt: pageContent.updatedAt,
  });
});

// PUT /api/admin/cms/home - обновить контент главной страницы
export const PUT = withErrorHandling(async (req: Request) => {
  const session = await getServerSession(authOptions);

  if (!session) {
    throw new AuthError("Необходима авторизация");
  }

  if (session.user.role !== "ADMIN") {
    throw new ForbiddenError("Доступ запрещен");
  }

  const body = await req.json().catch(() => null);

  if (!body || !body.sections) {
    throw new ValidationError("Отсутствует поле sections");
  }

  const pageContent = await prisma.pageContent.upsert({
    where: { page: "home" },
    create: {
      page: "home",
      sections: body.sections,
    },
    update: {
      sections: body.sections,
    },
  });

  return NextResponse.json({
    success: true,
    updatedAt: pageContent.updatedAt,
  });
});
