"use client";

import React, { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { User, Lock, Info, Eye, EyeOff, Camera, X, AlertTriangle, Copy, Check } from "lucide-react";
import TeacherHeader from "@/components/dashboard/TeacherHeader";

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  createdAt: string;
  avatar: string | null;
  bio: string | null;
  skills: string[];
  gender: string;
};

type Section = "profile" | "security" | "account";
type ToastState = { type: "success" | "error"; message: string } | null;

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_BIO = 1000;
const MAX_SKILLS = 20;

const SECTIONS: Array<{ id: Section; label: string; icon: React.ReactNode }> = [
  {
    id: "profile",
    label: "Публичный профиль",
    icon: <User className="w-4 h-4" />,
  },
  {
    id: "security",
    label: "Безопасность",
    icon: <Lock className="w-4 h-4" />,
  },
  {
    id: "account",
    label: "Аккаунт",
    icon: <Info className="w-4 h-4" />,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function useToast() {
  const [toast, setToast] = useState<ToastState>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((t: ToastState) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(t);
    timerRef.current = setTimeout(() => setToast(null), 4000);
  }, []);
  return { toast, show };
}

/** Password strength: 0–4 */
function passwordStrength(p: string): number {
  if (!p) return 0;
  let score = 0;
  if (p.length >= 8) score++;
  if (p.length >= 12) score++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
  if (/[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p)) score++;
  return score;
}

const STRENGTH_LABELS = ["", "Слабый", "Средний", "Хороший", "Сильный"];
const STRENGTH_COLORS = ["", "bg-red-400", "bg-amber-400", "bg-emerald-400", "bg-emerald-600"];
const STRENGTH_TEXT_COLORS = ["", "text-red-500", "text-amber-500", "text-emerald-600", "text-emerald-700"];

/** Avatar circle — image or initials */
function AvatarCircle({ src, name, size = 64 }: { src: string | null; name: string; size?: number }) {
  const [imageError, setImageError] = React.useState(false);
  const initials = name
    .split(" ")
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
  if (src && !imageError) {
    return (
      <div className="rounded-full overflow-hidden shrink-0 bg-slate-200 ring-4 ring-white shadow-md" style={{ width: size, height: size }}>
        <Image
          src={src}
          alt={name}
          width={size}
          height={size}
          className="object-cover w-full h-full"
          unoptimized
          onError={() => setImageError(true)}
        />
      </div>
    );
  }
  return (
    <div
      className="rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 select-none ring-4 ring-white shadow-md"
      style={{ width: size, height: size, fontSize: size * 0.32 }}
    >
      {initials || "?"}
    </div>
  );
}

/** Eye toggle button for password fields */
function EyeButton({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
      tabIndex={-1}
    >
      {show ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * Teacher settings page — two-column layout with sidebar navigation.
 * Three sections: Public Profile, Security, Account.
 */
export default function TeacherSettingsPage({
  userId,
  userName,
  userEmail,
  userRole,
  createdAt,
  avatar: initialAvatar,
  bio: initialBio,
  skills: initialSkills,
  gender: initialGender,
}: Props) {
  const [activeSection, setActiveSection] = useState<Section>("profile");
  const globalToast = useToast();

  // ── Profile state ──────────────────────────────────────────────────────────
  const [name, setName] = useState(userName);
  const [bio, setBio] = useState(initialBio ?? "");
  const [skills, setSkills] = useState<string[]>(initialSkills);
  const [skillInput, setSkillInput] = useState("");
  const [gender, setGender] = useState(initialGender);
  const [profileSaving, setProfileSaving] = useState(false);

  // ── Avatar state ───────────────────────────────────────────────────────────
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatar);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Password state ────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  // ── Derived ───────────────────────────────────────────────────────────────
  const displayAvatar = avatarPreview ?? avatarUrl;
  const strength = passwordStrength(newPassword);
  const roleLabel = userRole === "ADMIN" ? "Администратор" : userRole === "TEACHER" ? "Учитель" : "Студент";
  const memberSince = new Date(createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
  const profileChanged =
    name.trim() !== userName ||
    bio !== (initialBio ?? "") ||
    gender !== initialGender ||
    JSON.stringify(skills) !== JSON.stringify(initialSkills);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      globalToast.show({ type: "error", message: "Файл превышает 2 МБ" });
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile) return;
    setAvatarSaving(true);
    try {
      const fd = new FormData();
      fd.append("file", avatarFile);
      const res = await fetch("/api/teacher/avatar", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Ошибка загрузки");
      setAvatarUrl(`${data.url}?t=${Date.now()}`);
      setAvatarPreview(null);
      setAvatarFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      globalToast.show({ type: "success", message: "Фото профиля обновлено" });
    } catch (err) {
      globalToast.show({ type: "error", message: err instanceof Error ? err.message : "Ошибка" });
    } finally {
      setAvatarSaving(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setProfileSaving(true);
    try {
      const res = await fetch("/api/teacher/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), bio: bio.trim() || null, skills, gender }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Не удалось сохранить");
      globalToast.show({ type: "success", message: "Профиль сохранён" });
    } catch (err) {
      globalToast.show({ type: "error", message: err instanceof Error ? err.message : "Ошибка" });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      globalToast.show({ type: "error", message: "Пароли не совпадают" });
      return;
    }
    if (newPassword.length < 8) {
      globalToast.show({ type: "error", message: "Пароль должен содержать не менее 8 символов" });
      return;
    }
    setPasswordSaving(true);
    try {
      const res = await fetch("/api/teacher/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Не удалось изменить пароль");
      globalToast.show({ type: "success", message: "Пароль успешно изменён" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      globalToast.show({ type: "error", message: err instanceof Error ? err.message : "Ошибка" });
    } finally {
      setPasswordSaving(false);
    }
  };

  const addSkill = () => {
    const value = skillInput.trim();
    if (!value || skills.includes(value) || skills.length >= MAX_SKILLS) return;
    if (value.length > 50) {
      globalToast.show({ type: "error", message: "Тег не должен превышать 50 символов" });
      return;
    }
    setSkills((prev) => [...prev, value]);
    setSkillInput("");
  };

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(userId);
      globalToast.show({ type: "success", message: "ID скопирован" });
    } catch {
      globalToast.show({ type: "error", message: "Не удалось скопировать" });
    }
  };

  // ── Shared styles ─────────────────────────────────────────────────────────
  const inputClass =
    "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed";

  // ── Section: Public Profile ───────────────────────────────────────────────
  const ProfileSection = (
    <form onSubmit={handleSaveProfile} className="space-y-8">
      {/* Avatar + preview */}
      <div className="flex flex-col sm:flex-row gap-8">
        {/* Left: avatar upload */}
        <div className="flex flex-col items-center gap-3 shrink-0">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <AvatarCircle src={displayAvatar} name={name} size={100} />
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-6 h-6 text-white" />
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          <div className="flex flex-col gap-1.5 items-center">
            {avatarFile ? (
              <>
                <p className="text-xs text-slate-500 max-w-[120px] truncate text-center">{avatarFile.name}</p>
                <button
                  type="button"
                  onClick={handleUploadAvatar}
                  disabled={avatarSaving}
                  className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-4 py-1.5 rounded-lg transition-colors"
                >
                  {avatarSaving ? "Загрузка..." : "Сохранить фото"}
                </button>
                <button
                  type="button"
                  onClick={() => { setAvatarFile(null); setAvatarPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Отмена
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                Изменить фото
              </button>
            )}
          </div>
        </div>

        {/* Right: preview card */}
        <div className="flex-1 bg-gradient-to-br from-emerald-700 to-emerald-900 rounded-2xl p-5 text-white flex flex-col gap-2 justify-center">
          <p className="text-[10px] font-semibold text-emerald-300 uppercase tracking-wider mb-1">Превью для студентов</p>
          <p className="font-bold text-base leading-snug">{name || "Имя учителя"}</p>
          {bio && <p className="text-xs text-emerald-100 line-clamp-2 leading-relaxed">{bio}</p>}
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {skills.slice(0, 5).map((s) => (
                <span key={s} className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full">{s}</span>
              ))}
              {skills.length > 5 && <span className="text-[10px] text-emerald-300 self-center">+{skills.length - 5}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Отображаемое имя</label>
        <input
          type="text"
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          required
        />
      </div>

      {/* Email (read-only) */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
        <input type="email" className={inputClass} value={userEmail} disabled />
        <p className="text-xs text-slate-400 mt-1">Email используется для входа и не может быть изменён здесь</p>
      </div>

      {/* Gender */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
          Пол <span className="text-red-500">*</span>
        </label>
        <select
          className={inputClass}
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          required
        >
          <option value="NOT_SPECIFIED">Не указан</option>
          <option value="MALE">Мужской</option>
          <option value="FEMALE">Женский</option>
        </select>
        <p className="text-xs text-slate-400 mt-1">Необходимо для создания потоков с разделением по полу</p>
      </div>

      {/* Bio */}
      <div>
        <div className="flex justify-between items-baseline mb-1.5">
          <label className="text-xs font-semibold text-slate-600">О себе</label>
          <span className={`text-xs ${bio.length > MAX_BIO * 0.9 ? "text-red-500" : "text-slate-400"}`}>
            {bio.length} / {MAX_BIO}
          </span>
        </div>
        <textarea
          className={`${inputClass} resize-none`}
          rows={4}
          placeholder="Расскажите о своём опыте, образовании и подходе к обучению..."
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO))}
          maxLength={MAX_BIO}
        />
      </div>

      {/* Skills */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-2">
          Знания и предметы
          <span className="text-slate-400 font-normal ml-1">({skills.length}/{MAX_SKILLS})</span>
        </label>

        {skills.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {skills.map((skill) => (
              <span
                key={skill}
                className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-sm font-medium px-3 py-1 rounded-full"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => setSkills((prev) => prev.filter((s) => s !== skill))}
                  className="text-emerald-400 hover:text-emerald-700 transition-colors"
                  aria-label={`Удалить ${skill}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {skills.length < MAX_SKILLS && (
          <div className="flex gap-2">
            <input
              type="text"
              className={`${inputClass} flex-1`}
              placeholder="Добавить тег (Enter)"
              value={skillInput}
              maxLength={50}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
            />
            <button
              type="button"
              onClick={addSkill}
              disabled={!skillInput.trim()}
              className="shrink-0 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 disabled:opacity-40 font-semibold text-sm px-4 py-2.5 rounded-xl border border-slate-200 hover:border-emerald-200 transition-colors"
            >
              + Добавить
            </button>
          </div>
        )}
      </div>

      {/* Save */}
      <div className="flex justify-end pt-2 border-t border-slate-100">
        <button
          type="submit"
          disabled={profileSaving || !name.trim() || !profileChanged}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm px-8 py-2.5 rounded-xl transition-colors"
        >
          {profileSaving ? "Сохранение..." : "Сохранить профиль"}
        </button>
      </div>
    </form>
  );

  // ── Section: Security ─────────────────────────────────────────────────────
  const SecuritySection = (
    <form onSubmit={handleChangePassword} className="space-y-6">
      <div>
        <h3 className="font-semibold text-slate-800 mb-1">Изменение пароля</h3>
        <p className="text-sm text-slate-500">Используйте надёжный пароль, который вы не используете в других местах</p>
      </div>

      {/* Current password */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Текущий пароль</label>
        <div className="relative">
          <input
            type={showCurrent ? "text" : "password"}
            className={`${inputClass} pr-10`}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <EyeButton show={showCurrent} onToggle={() => setShowCurrent((v) => !v)} />
        </div>
      </div>

      {/* New password */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Новый пароль</label>
        <div className="relative">
          <input
            type={showNew ? "text" : "password"}
            className={`${inputClass} pr-10`}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
          <EyeButton show={showNew} onToggle={() => setShowNew((v) => !v)} />
        </div>

        {/* Strength meter */}
        {newPassword.length > 0 && (
          <div className="mt-2 space-y-1.5">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    strength >= level ? STRENGTH_COLORS[strength] : "bg-slate-200"
                  }`}
                />
              ))}
            </div>
            <p className={`text-xs font-medium ${STRENGTH_TEXT_COLORS[strength]}`}>
              {STRENGTH_LABELS[strength]}
            </p>
          </div>
        )}
      </div>

      {/* Confirm password */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Подтвердите новый пароль</label>
        <div className="relative">
          <input
            type={showConfirm ? "text" : "password"}
            className={`${inputClass} pr-10 ${
              confirmPassword && newPassword !== confirmPassword
                ? "border-red-300 focus:ring-red-400"
                : ""
            }`}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
          <EyeButton show={showConfirm} onToggle={() => setShowConfirm((v) => !v)} />
        </div>
        {confirmPassword && newPassword !== confirmPassword && (
          <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Пароли не совпадают
          </p>
        )}
      </div>

      <div className="flex justify-end pt-2 border-t border-slate-100">
        <button
          type="submit"
          disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm px-8 py-2.5 rounded-xl transition-colors"
        >
          {passwordSaving ? "Сохранение..." : "Изменить пароль"}
        </button>
      </div>
    </form>
  );

  // ── Section: Account ──────────────────────────────────────────────────────
  const AccountSection = (
    <div className="space-y-6">
      {/* Info rows */}
      <div className="bg-slate-50 rounded-2xl overflow-hidden divide-y divide-slate-100">
        {[
          { label: "Email", value: userEmail },
          { label: "Роль", value: roleLabel },
          { label: "Дата регистрации", value: memberSince },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between px-5 py-3.5">
            <span className="text-sm font-medium text-slate-500 w-44 shrink-0">{label}</span>
            <span className="text-sm text-slate-800">{value}</span>
          </div>
        ))}

        {/* ID row with copy */}
        <div className="flex items-center justify-between px-5 py-3.5">
          <span className="text-sm font-medium text-slate-500 w-44 shrink-0">ID аккаунта</span>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs text-slate-600 font-mono truncate max-w-[180px]">{userId}</span>
            <button
              type="button"
              onClick={copyId}
              className="shrink-0 text-slate-400 hover:text-emerald-600 transition-colors"
              title="Скопировать ID"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="border border-red-100 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 bg-red-50 border-b border-red-100">
          <p className="text-sm font-semibold text-red-700">Зона опасных действий</p>
        </div>
        <div className="px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-700">Выйти из аккаунта</p>
            <p className="text-xs text-slate-400 mt-0.5">Завершить текущую сессию на этом устройстве</p>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="shrink-0 bg-white border border-red-200 text-red-600 hover:bg-red-50 font-semibold text-sm px-4 py-2 rounded-xl transition-colors"
          >
            Выйти
          </button>
        </div>
      </div>
    </div>
  );

  const sectionContent: Record<Section, React.ReactNode> = {
    profile: ProfileSection,
    security: SecuritySection,
    account: AccountSection,
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      <TeacherHeader teacherName={userName ?? undefined} />
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Настройки</h1>
          <p className="text-sm text-slate-500 mt-1">Управляйте профилем и безопасностью аккаунта</p>
        </div>

        {/* Mobile tab bar */}
        <div className="flex lg:hidden gap-1 bg-white rounded-xl border border-slate-200 p-1 mb-6 overflow-x-auto">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-1.5 flex-1 justify-center px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                activeSection === s.id
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </div>

        {/* Two-column layout */}
        <div className="flex gap-6 items-start">
          {/* Sidebar (desktop) */}
          <aside className="hidden lg:flex flex-col gap-3 w-64 shrink-0 sticky top-6">
            {/* Avatar card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col items-center gap-3 text-center">
              <AvatarCircle src={displayAvatar} name={name} size={72} />
              <div>
                <p className="font-bold text-slate-800 text-sm leading-snug">{name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{roleLabel}</p>
              </div>
            </div>

            {/* Nav */}
            <nav className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2 space-y-0.5">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSection(s.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    activeSection === s.id
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
                      : "text-slate-600 hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  <span className={activeSection === s.id ? "text-emerald-600" : "text-slate-400"}>
                    {s.icon}
                  </span>
                  {s.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 lg:p-8">
              <div className="mb-6 pb-5 border-b border-slate-100">
                <h2 className="font-bold text-lg text-slate-800">
                  {SECTIONS.find((s) => s.id === activeSection)?.label}
                </h2>
              </div>
              {sectionContent[activeSection]}
            </div>
          </main>
        </div>
      </div>

      {/* Global toast — bottom-right fixed */}
      {globalToast.toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold transition-all ${
            globalToast.toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {globalToast.toast.type === "success" ? (
            <Check className="w-4 h-4 shrink-0" />
          ) : (
            <X className="w-4 h-4 shrink-0" />
          )}
          {globalToast.toast.message}
        </div>
      )}
    </div>
  );
}
