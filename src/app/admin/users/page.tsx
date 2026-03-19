import { AdminLayout } from "@/components/admin/AdminLayout";

export default function AdminUsersPage() {
  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Управление пользователями</h1>
          <p className="text-slate-600 mt-1">Список всех пользователей платформы</p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            Функционал управления пользователями доступен в разделе Dashboard → Пользователи
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
