import { AdminLayout } from "@/components/admin/AdminLayout";

export default function AdminSettingsPage() {
  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Настройки</h1>
          <p className="text-slate-600 mt-1">Конфигурация системы</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Системные настройки</h2>
          <p className="text-slate-600">
            Раздел в разработке. Здесь будут доступны настройки платформы, интеграций и безопасности.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
