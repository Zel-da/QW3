import { useAuth } from '@/context/AuthContext';
import { AdminPageLayout } from '@/components/admin';
import { Card, CardContent } from '@/components/ui/card';
import {
  Users, Building2, ClipboardList, Calendar, Wrench,
  GraduationCap, BarChart3, CalendarDays, Mail, Database,
  FileText, HelpCircle
} from 'lucide-react';
import { useLocation } from 'wouter';
import { LucideIcon } from 'lucide-react';

interface MenuItem {
  title: string;
  path: string;
  roles: string[];
  icon: LucideIcon;
  color: string;
}

const menuItems: MenuItem[] = [
  { title: '사용자 관리', path: '/admin', roles: ['ADMIN'], icon: Users, color: 'bg-emerald-500' },
  { title: '팀 관리', path: '/team-management', roles: ['ADMIN', 'TEAM_LEADER'], icon: Building2, color: 'bg-teal-600' },
  { title: 'TBM 편집', path: '/checklist-editor', roles: ['ADMIN'], icon: ClipboardList, color: 'bg-cyan-500' },
  { title: '점검 일정 관리', path: '/inspection-schedule', roles: ['ADMIN'], icon: Calendar, color: 'bg-emerald-600' },
  { title: '팀 장비/점검 관리', path: '/team-equipment-management', roles: ['ADMIN'], icon: Wrench, color: 'bg-green-500' },
  { title: '교육 관리', path: '/education-management', roles: ['ADMIN'], icon: GraduationCap, color: 'bg-teal-500' },
  { title: '교육 현황', path: '/education-monitoring', roles: ['ADMIN'], icon: BarChart3, color: 'bg-sky-500' },
  { title: '공휴일 관리', path: '/holiday-management', roles: ['ADMIN'], icon: CalendarDays, color: 'bg-emerald-500' },
  { title: '이메일 설정', path: '/email-settings', roles: ['ADMIN'], icon: Mail, color: 'bg-cyan-600' },
  { title: '데이터베이스 관리', path: '/db-management', roles: ['ADMIN'], icon: Database, color: 'bg-teal-600' },
  { title: '관리자 업무 절차서', path: '/admin-help', roles: ['ADMIN'], icon: FileText, color: 'bg-green-600' },
  { title: '사용자 도움말', path: '/help', roles: ['ADMIN', 'TEAM_LEADER'], icon: HelpCircle, color: 'bg-sky-600' },
];

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  if (user?.role !== 'ADMIN' && user?.role !== 'TEAM_LEADER') {
    return (
      <AdminPageLayout>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">관리자 권한이 필요합니다.</p>
          </CardContent>
        </Card>
      </AdminPageLayout>
    );
  }

  const accessibleItems = menuItems.filter(item => item.roles.includes(user?.role || ''));

  return (
    <AdminPageLayout maxWidth="wide">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {accessibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.path}
              className={`${item.color} rounded-xl p-6 cursor-pointer hover:opacity-90 hover:scale-105 transition-all duration-200 shadow-md flex flex-col items-center justify-center min-h-[140px]`}
              onClick={() => setLocation(item.path)}
            >
              <Icon className="h-10 w-10 text-white mb-3" strokeWidth={1.5} />
              <span className="text-white text-sm font-medium text-center leading-tight">{item.title}</span>
            </div>
          );
        })}
      </div>
    </AdminPageLayout>
  );
}
