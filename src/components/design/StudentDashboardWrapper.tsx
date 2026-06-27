'use client';

import { Home, BookOpen, FileText, FlaskConical, BarChart3, Calendar, Info } from 'lucide-react';
import RoleDashboardLayout from './RoleDashboardLayout';
import RightSidebar, { type SidebarSession, type SidebarTask } from './RightSidebar';
import StudentDashboard from '@/components/StudentDashboard';
import type { RoleNavItem } from './RoleSidebar';
import StreakDashboard from '@/components/StreakDashboard';
import { HasanatProvider } from '@/components/HasanatProvider';
import HasanatBadge from '@/components/HasanatBadge';

interface StudentDashboardWrapperProps {
  userName: string;
  userId: string;
  userEmail: string;
  enrollments: any[];
  homeworkAssignments: any[];
  quizResults: any[];
  myReviews?: any[];
  jitsiDomain: string;
  notificationCount?: number;
}

// Полный список вкладок студента — совпадает с TabId внутри StudentDashboard
const STUDENT_NAV: RoleNavItem[] = [
  { id: 'home', label: 'Главная', tab: 'home', icon: Home },
  { id: 'lessons', label: 'Мои уроки', tab: 'lessons', icon: BookOpen },
  { id: 'homework', label: 'Домашние задания', tab: 'homework', icon: FileText },
  { id: 'results', label: 'Тесты', tab: 'results', icon: FlaskConical },
  { id: 'progress', label: 'Мой прогресс', tab: 'progress', icon: BarChart3 },
  { id: 'schedule', label: 'Расписание', tab: 'schedule', icon: Calendar },
  { id: 'info', label: 'Информация', tab: 'info', icon: Info },
];

export default function StudentDashboardWrapper(props: StudentDashboardWrapperProps) {
  const initials = props.userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Реальные ближайшие живые сессии из расписания потоков
  const sessions: SidebarSession[] = props.enrollments.flatMap((e: any) =>
    (e.stream?.scheduleSlots ?? []).map((s: any) => ({
      streamName: e.stream?.name ?? e.stream?.courseName ?? 'Поток',
      dayOfWeek: s.dayOfWeek,
      startMinutes: s.startMinutes,
    })),
  );

  // Реальные задания: открытые сверху, недавно проверенные ниже
  const tasks: SidebarTask[] = [...props.homeworkAssignments]
    .map((a: any) => ({
      id: a.id,
      title: a.title,
      streamName: a.streamName ?? '',
      dueAt: a.dueAt ?? null,
      status: (a.submission?.status ?? 'NONE') as SidebarTask['status'],
    }))
    .sort((a, b) => {
      const openOrder = (s: string) => (s === 'NONE' || s === 'NEEDS_REWORK' ? 0 : 1);
      if (openOrder(a.status) !== openOrder(b.status)) return openOrder(a.status) - openOrder(b.status);
      return (a.dueAt ?? '').localeCompare(b.dueAt ?? '');
    })
    .slice(0, 4);

  return (
    <RoleDashboardLayout
      role="STUDENT"
      userName={props.userName}
      userInitials={initials}
      notificationCount={props.notificationCount}
      navItems={STUDENT_NAV}
      basePath="/student"
      showRightSidebar={true}
      rightSidebar={<RightSidebar sessions={sessions} tasks={tasks} />}
    >
      <div className="dashboard-content">
        <HasanatProvider userId={props.userId}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <StreakDashboard userId={props.userId} />
            <HasanatBadge />
          </div>
          <StudentDashboard
            userName={props.userName}
            userId={props.userId}
            userEmail={props.userEmail}
            enrollments={props.enrollments}
            homeworkAssignments={props.homeworkAssignments}
            quizResults={props.quizResults}
            myReviews={props.myReviews}
            jitsiDomain={props.jitsiDomain}
          />
        </HasanatProvider>
      </div>
    </RoleDashboardLayout>
  );
}
