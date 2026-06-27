'use client';

import {
  Home, BookOpen, Users, GraduationCap, BarChart3, TrendingUp,
  ClipboardCheck, Video, FileText, Calendar, Info, UserPlus,
} from 'lucide-react';
import RoleDashboardLayout from './RoleDashboardLayout';
import TeacherDashboard from '@/components/TeacherDashboard';
import type { RoleNavItem } from './RoleSidebar';

interface TeacherDashboardWrapperProps {
  initialStreams: any[];
  initialCourses: any[];
  jitsiDomain: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  notificationCount?: number;
}

// Полный список вкладок учителя — совпадает с TeacherTabId
const TEACHER_NAV: RoleNavItem[] = [
  { id: 'overview', label: 'Обзор', tab: 'overview', icon: Home },
  { id: 'courses', label: 'Курсы', tab: 'courses', icon: BookOpen },
  { id: 'streams', label: 'Потоки', tab: 'streams', icon: Users },
  { id: 'lessons', label: 'Уроки', tab: 'lessons', icon: GraduationCap },
  { id: 'students', label: 'Студенты', tab: 'students', icon: Users },
  { id: 'applications', label: 'Заявки', tab: 'applications', icon: UserPlus },
  { id: 'analytics', label: 'Аналитика', tab: 'analytics', icon: BarChart3 },
  { id: 'progress', label: 'Прогресс', tab: 'progress', icon: TrendingUp },
  { id: 'gradebook', label: 'Журнал', tab: 'gradebook', icon: ClipboardCheck },
  { id: 'live', label: 'Live', tab: 'live', icon: Video },
  { id: 'homework', label: 'Д/З', tab: 'homework', icon: FileText },
  { id: 'schedule', label: 'Расписание', tab: 'schedule', icon: Calendar },
  { id: 'info', label: 'Информация', tab: 'info', icon: Info },
];

export default function TeacherDashboardWrapper(props: TeacherDashboardWrapperProps) {
  const initials = props.teacherName
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <RoleDashboardLayout
      role="TEACHER"
      userName={props.teacherName}
      userInitials={initials}
      notificationCount={props.notificationCount}
      navItems={TEACHER_NAV}
      basePath="/teacher"
      showRightSidebar={false}
    >
      <div className="dashboard-content">
        <TeacherDashboard
          initialStreams={props.initialStreams}
          initialCourses={props.initialCourses}
          jitsiDomain={props.jitsiDomain}
          teacherId={props.teacherId}
          teacherName={props.teacherName}
          teacherEmail={props.teacherEmail}
        />
      </div>
    </RoleDashboardLayout>
  );
}
