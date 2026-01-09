import { useAuth } from '@/context/AuthContext';
import { AdminPageLayout } from '@/components/admin';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';
import { useLocation } from 'wouter';

interface MenuItem {
  title: string;
  path: string;
  roles: string[];
}

const menuItems: MenuItem[] = [
  { title: '사용자 관리', path: '/admin', roles: ['ADMIN'] },
  { title: '팀 관리', path: '/team-management', roles: ['ADMIN', 'TEAM_LEADER'] },
  { title: 'TBM 편집', path: '/checklist-editor', roles: ['ADMIN'] },
  { title: '점검 일정 관리', path: '/inspection-schedule', roles: ['ADMIN'] },
  { title: '팀 장비/점검 관리', path: '/team-equipment-management', roles: ['ADMIN'] },
  { title: '교육 관리', path: '/education-management', roles: ['ADMIN'] },
  { title: '교육 현황', path: '/education-monitoring', roles: ['ADMIN'] },
  { title: '공휴일 관리', path: '/holiday-management', roles: ['ADMIN'] },
  { title: '이메일 설정', path: '/email-settings', roles: ['ADMIN'] },
  { title: '데이터베이스 관리', path: '/db-management', roles: ['ADMIN'] },
  { title: '관리자 업무 절차서', path: '/admin-help', roles: ['ADMIN'] },
  { title: '사용자 도움말', path: '/help', roles: ['ADMIN', 'TEAM_LEADER'] },
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accessibleItems.map((item) => (
          <Card
            key={item.path}
            className="group cursor-pointer hover:shadow-md transition-all duration-200"
            onClick={() => setLocation(item.path)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{item.title}</h3>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminPageLayout>
  );
}
