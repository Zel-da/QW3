import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Bell, GraduationCap, ClipboardCheck, ShieldCheck, TrendingUp } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

interface DashboardStatsData {
  notices: {
    total: number;
    unread: number;
  };
  education: {
    totalCourses: number;
    completedCourses: number;
    inProgressCourses: number;
  };
  tbm: {
    thisMonthSubmitted: number;
    thisMonthTotal: number;
  };
  inspection: {
    thisMonthCompleted: boolean;
    dueDate: string;
  };
}

const COLORS = {
  completed: '#10b981', // green
  inProgress: '#f59e0b', // orange
  notStarted: '#6b7280', // gray
  primary: '#3b82f6', // blue
  secondary: '#8b5cf6', // purple
};

export function DashboardStats() {
  const currentMonth = new Date().getMonth() + 1;
  const { data: stats, isLoading } = useQuery<DashboardStatsData>({
    queryKey: ["/api/dashboard/stats"],
  });

  if (isLoading || !stats) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-16"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // 교육 완료율 차트 데이터
  const educationChartData = [
    { name: '수료', value: stats.education.completedCourses, color: COLORS.completed },
    { name: '진행중', value: stats.education.inProgressCourses, color: COLORS.inProgress },
    {
      name: '미시작',
      value: stats.education.totalCourses - stats.education.completedCourses - stats.education.inProgressCourses,
      color: COLORS.notStarted
    },
  ].filter(item => item.value > 0);

  // TBM 제출 차트 데이터
  const tbmChartData = [
    {
      name: 'TBM 제출 현황',
      제출완료: stats.tbm.thisMonthSubmitted,
      미제출: stats.tbm.thisMonthTotal - stats.tbm.thisMonthSubmitted,
    },
  ];

  const educationCompletionRate = stats.education.totalCourses > 0
    ? Math.round((stats.education.completedCourses / stats.education.totalCourses) * 100)
    : 0;

  const tbmCompletionRate = stats.tbm.thisMonthTotal > 0
    ? Math.round((stats.tbm.thisMonthSubmitted / stats.tbm.thisMonthTotal) * 100)
    : 0;

  return (
    <div className="space-y-6 mb-8">
      <h2 className="text-2xl font-bold text-center">{currentMonth}월 현황</h2>
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* 공지사항 카드 */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              공지사항
            </CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.notices.total}개</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.notices.unread > 0 ? (
                <span className="text-orange-600 font-medium">
                  {stats.notices.unread}개 안읽음
                </span>
              ) : (
                <span className="text-green-600">모두 확인함</span>
              )}
            </p>
          </CardContent>
        </Card>

        {/* 교육 현황 카드 */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              이번달 교육
            </CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.education.completedCourses}/{stats.education.totalCourses}
            </div>
            <div className="mt-2">
              <Progress value={educationCompletionRate} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                완료율 {educationCompletionRate}%
              </p>
            </div>
          </CardContent>
        </Card>

        {/* TBM 제출 현황 카드 */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              TBM 제출
            </CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.tbm.thisMonthSubmitted}/{stats.tbm.thisMonthTotal}일
            </div>
            <div className="mt-2">
              <Progress value={tbmCompletionRate} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                제출률 {tbmCompletionRate}%
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 안전점검 현황 카드 */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              안전점검
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.inspection.thisMonthCompleted ? (
                <span className="text-green-600">완료</span>
              ) : (
                <span className="text-orange-600">미완료</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              마감일: {stats.inspection.dueDate}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      {stats.education.totalCourses > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* 교육 완료 현황 파이 차트 */}
          <Card>
            <CardHeader>
              <CardTitle>이번달 교육 현황</CardTitle>
              <CardDescription>과정별 진행 상태</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={educationChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {educationChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* TBM 제출 현황 바 차트 */}
          <Card>
            <CardHeader>
              <CardTitle>TBM 제출 현황</CardTitle>
              <CardDescription>이번 달 제출 현황</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tbmChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="제출완료" fill={COLORS.completed} />
                  <Bar dataKey="미제출" fill={COLORS.notStarted} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
