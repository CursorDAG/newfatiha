import {
  BookOpen,
  Video,
  CheckCircle2,
  BarChart3,
  Users,
  Clock,
  Award,
  Sparkles,
  GraduationCap,
  Scale,
  Languages,
  ScrollText,
  BookMarked,
  Music2,
  Moon,
  Heart,
  ShieldCheck,
  CalendarDays,
  MessageCircle,
  PenLine,
  Star,
  type LucideIcon,
} from "lucide-react";

/**
 * Резолвер строковых имён иконок (приходят из CMS) в компоненты lucide.
 * Используется для секций hero.stats, about.features — там icon хранится как строка.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  BookOpen,
  Video,
  CheckCircle2,
  BarChart3,
  Users,
  Clock,
  Award,
  Sparkles,
  GraduationCap,
  Scale,
  Languages,
  ScrollText,
  BookMarked,
  Music2,
  Moon,
  Heart,
  ShieldCheck,
  CalendarDays,
  MessageCircle,
  PenLine,
  Star,
};

export function resolveIcon(name: string | undefined, fallback: LucideIcon = Sparkles): LucideIcon {
  if (!name) return fallback;
  return ICON_MAP[name] ?? fallback;
}

/**
 * Маппинг тематики курса (по ключевым словам в названии) на профильную lucide-иконку.
 * Заменяет эмодзи премиальными иконками в едином стиле.
 */
const COURSE_ICON_RULES: { keywords: string[]; icon: LucideIcon }[] = [
  { keywords: ["акыд", "вероубежд", "таухид"], icon: Moon },
  { keywords: ["фикх", "право"], icon: Scale },
  { keywords: ["арабск", "язык", "наху", "сарф"], icon: Languages },
  { keywords: ["тафсир", "тасфир", "толков"], icon: BookMarked },
  { keywords: ["хадис", "сунна"], icon: ScrollText },
  { keywords: ["тажвид", "таджвид", "чтени", "коран", "куръан", "кур'ан"], icon: Music2 },
  { keywords: ["сира", "истор", "жизнеопис"], icon: BookOpen },
  { keywords: ["ахляк", "нрав", "этик", "адаб"], icon: Heart },
];

export function getCourseIcon(title: string): LucideIcon {
  const lower = title.toLowerCase();
  for (const rule of COURSE_ICON_RULES) {
    if (rule.keywords.some((k) => lower.includes(k))) return rule.icon;
  }
  return GraduationCap;
}

type IconTileProps = {
  icon: LucideIcon;
  /** размер тайла в px (квадрат) */
  size?: number;
  /** размер иконки в px */
  iconSize?: number;
  /** сплошной золотой тайл (для акцентов/номеров) */
  solid?: boolean;
  className?: string;
};

/**
 * Премиальный тайл с золотым градиентом и lucide-иконкой.
 * Единый стиль иконографики для всего лендинга.
 */
export function IconTile({
  icon: Icon,
  size = 56,
  iconSize = 26,
  solid = false,
  className = "",
}: IconTileProps) {
  return (
    <span
      className={`icon-tile ${solid ? "icon-tile-solid" : ""} ${className}`}
      style={{ width: size, height: size }}
    >
      <Icon style={{ width: iconSize, height: iconSize }} strokeWidth={1.75} />
    </span>
  );
}
