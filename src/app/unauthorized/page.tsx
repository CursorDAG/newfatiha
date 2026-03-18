import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-emerald-50 text-emerald-900">
      <h1 className="text-4xl font-bold mb-4">403 - Доступ запрещен</h1>
      <p className="text-lg mb-8">У вас нет прав для просмотра этой страницы.</p>
      <div className="flex gap-4">
        <Link 
          href="/student" 
          className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
        >
          Кабинет студента
        </Link>
        <Link 
          href="/teacher" 
          className="px-6 py-2 border border-emerald-600 text-emerald-600 rounded-lg hover:bg-emerald-100 transition"
        >
          Кабинет преподавателя
        </Link>
      </div>
    </div>
  );
}
