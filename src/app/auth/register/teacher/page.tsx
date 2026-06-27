"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Mail, Lock, User, BookOpen, Award, Phone, FileText, Video } from "lucide-react";

export default function TeacherRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaQuestion, setCaptchaQuestion] = useState({ num1: 0, num2: 0, answer: 0 });

  useEffect(() => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    setCaptchaQuestion({ num1, num2, answer: num1 + num2 });
  }, []);

  // Step 1 form data
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  // Step 2 form data
  const [bio, setBio] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subjectInput, setSubjectInput] = useState("");
  const [experience, setExperience] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [documentsUrls, setDocumentsUrls] = useState<string[]>([]);
  const [documentInput, setDocumentInput] = useState("");
  const [videoIntroUrl, setVideoIntroUrl] = useState("");

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    // Validate captcha
    if (parseInt(captchaAnswer) !== captchaQuestion.answer) {
      setError("Неверный ответ на проверочный вопрос");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register/teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Ошибка регистрации");
      }

      setSuccess(data.message);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка регистрации");
    } finally {
      setLoading(false);
    }
  };

  const addSubject = () => {
    if (subjectInput.trim() && !subjects.includes(subjectInput.trim())) {
      setSubjects([...subjects, subjectInput.trim()]);
      setSubjectInput("");
    }
  };

  const removeSubject = (subject: string) => {
    setSubjects(subjects.filter((s) => s !== subject));
  };

  const addDocument = () => {
    if (documentInput.trim() && !documentsUrls.includes(documentInput.trim())) {
      setDocumentsUrls([...documentsUrls, documentInput.trim()]);
      setDocumentInput("");
    }
  };

  const removeDocument = (url: string) => {
    setDocumentsUrls(documentsUrls.filter((u) => u !== url));
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/teacher/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio,
          subjects,
          experience,
          qualifications,
          whatsappPhone,
          documentsUrls,
          videoIntroUrl: videoIntroUrl || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Ошибка отправки анкеты");
      }

      setSuccess(data.message);
      setTimeout(() => router.push("/teacher/pending-approval"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка отправки анкеты");
    } finally {
      setLoading(false);
    }
  };

  if (step === 1) {
    return (
      <div className="min-h-screen bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-50 flex items-start justify-center p-4 pt-24 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-200/40 blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute bottom-[10%] right-[-5%] w-[35%] h-[45%] rounded-full bg-blue-200/30 blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
        </div>

        <div className="bg-white/90 backdrop-blur-xl border border-white/50 shadow-2xl rounded-2xl p-8 w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Award className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Регистрация учителя</h1>
            <p className="text-slate-600">Шаг 1 из 2: Создание аккаунта</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
              <span className="text-red-500">⚠</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleStep1Submit} className="space-y-5">
            <div className="group">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-900 bg-white"
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div className="group">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Пароль
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full pl-11 pr-12 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-900 bg-white"
                  placeholder="Минимум 8 символов"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="group">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Полное имя
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-900 bg-white"
                  placeholder="Иван Иванов"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Проверка: {captchaQuestion.num1} + {captchaQuestion.num2} = ?
              </label>
              <input
                type="number"
                required
                placeholder="Введите ответ"
                value={captchaAnswer}
                onChange={(e) => setCaptchaAnswer(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-900 bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 px-4 rounded-xl hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
            >
              {loading ? "Отправка..." : "Продолжить"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Уже есть аккаунт?{" "}
            <Link href="/api/auth/signin" className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors">
              Войти
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-50 p-4 py-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-200/40 blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[10%] right-[-5%] w-[35%] h-[45%] rounded-full bg-blue-200/30 blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
      </div>

      <div className="max-w-3xl mx-auto bg-white/90 backdrop-blur-xl border border-white/50 shadow-2xl rounded-2xl p-8 relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Анкета учителя</h1>
          <p className="text-slate-600">Шаг 2 из 2: Заполните информацию о себе</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
            <span className="text-red-500">⚠</span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-start gap-2">
            <span className="text-green-500">✓</span>
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleStep2Submit} className="space-y-6">
          <div className="group">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
              <User className="w-4 h-4 text-emerald-600" />
              О себе <span className="text-red-500">*</span>
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              required
              minLength={50}
              rows={4}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-900 bg-white"
              placeholder="Расскажите о себе, вашем образовании и интересах (минимум 50 символов)"
            />
          </div>

          <div className="group">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              Предметы <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={subjectInput}
                onChange={(e) => setSubjectInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSubject())}
                className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-900 bg-white"
                placeholder="Например: Коран, Таджвид, Арабский язык"
              />
              <button
                type="button"
                onClick={addSubject}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 font-semibold shadow-md hover:shadow-lg transition-all"
              >
                Добавить
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {subjects.map((subject) => (
                <span
                  key={subject}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-800 rounded-full text-sm font-medium shadow-sm"
                >
                  {subject}
                  <button
                    type="button"
                    onClick={() => removeSubject(subject)}
                    className="text-emerald-600 hover:text-emerald-800 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="group">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
              <Award className="w-4 h-4 text-emerald-600" />
              Опыт преподавания <span className="text-red-500">*</span>
            </label>
            <textarea
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              required
              minLength={20}
              rows={4}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-900 bg-white"
              placeholder="Опишите ваш опыт преподавания (минимум 20 символов)"
            />
          </div>

          <div className="group">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
              <Award className="w-4 h-4 text-emerald-600" />
              Квалификация <span className="text-red-500">*</span>
            </label>
            <textarea
              value={qualifications}
              onChange={(e) => setQualifications(e.target.value)}
              required
              minLength={20}
              rows={4}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-900 bg-white"
              placeholder="Образование, сертификаты, иджазы (минимум 20 символов)"
            />
          </div>

          <div className="group">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
              <Phone className="w-4 h-4 text-emerald-600" />
              WhatsApp номер <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={whatsappPhone}
              onChange={(e) => setWhatsappPhone(e.target.value)}
              required
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-900 bg-white"
              placeholder="+79991234567"
            />
          </div>

          <div className="group">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              Документы (ссылки) <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="url"
                value={documentInput}
                onChange={(e) => setDocumentInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDocument())}
                className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-900 bg-white"
                placeholder="https://drive.google.com/..."
              />
              <button
                type="button"
                onClick={addDocument}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 font-semibold shadow-md hover:shadow-lg transition-all"
              >
                Добавить
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-2">
              Загрузите документы на Google Drive или другой сервис и вставьте ссылки
            </p>
            <div className="space-y-2">
              {documentsUrls.map((url, idx) => (
                <div key={idx} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-emerald-600 hover:text-emerald-700 truncate text-sm font-medium"
                  >
                    {url}
                  </a>
                  <button
                    type="button"
                    onClick={() => removeDocument(url)}
                    className="text-red-600 hover:text-red-800 font-semibold text-sm"
                  >
                    Удалить
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="group">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
              <Video className="w-4 h-4 text-emerald-600" />
              Видео-представление (опционально)
            </label>
            <input
              type="url"
              value={videoIntroUrl}
              onChange={(e) => setVideoIntroUrl(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-900 bg-white"
              placeholder="https://youtube.com/..."
            />
            <p className="text-xs text-slate-500 mt-2">
              Ссылка на видео, где вы рассказываете о себе
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || subjects.length === 0 || documentsUrls.length === 0}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-4 px-4 rounded-xl hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
          >
            {loading ? "Отправка..." : "Отправить анкету"}
          </button>
        </form>
      </div>
    </div>
  );
}
