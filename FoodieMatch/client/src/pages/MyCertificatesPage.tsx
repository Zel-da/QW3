
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/header';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { format } from 'date-fns';
import { Award, Download, BookOpen } from 'lucide-react';
import type { Certificate, Course } from '@shared/schema';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';

interface CertificateWithCourse extends Certificate {
  course: Course;
}

const fetchCertificates = async (userId: string): Promise<CertificateWithCourse[]> => {
  const res = await fetch(`/api/users/${userId}/certificates`);
  if (!res.ok) throw new Error('Failed to fetch certificates');
  return res.json();
};

export default function MyCertificatesPage() {
  const { user, isLoading: authLoading } = useAuth();

  const { data: certificates = [], isLoading: certsLoading } = useQuery<CertificateWithCourse[]>({
    queryKey: ['certificates', user?.id],
    queryFn: () => fetchCertificates(user!.id),
    enabled: !!user?.id,
  });

  if (!user) {
    return <div>로그인이 필요합니다.</div>;
  }

  return (
    <div>
      <Header />
      <main className="container mx-auto p-4 lg:p-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
                <Award className="w-8 h-8 text-primary" />
                <div>
                    <CardTitle className="text-2xl">나의 이수증</CardTitle>
                    <CardDescription>완료한 교육 과정의 이수증 목록입니다.</CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent>
            {certsLoading ? (
              <LoadingSpinner size="lg" text="이수증 목록을 불러오는 중..." className="py-16" />
            ) : certificates.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="아직 발급받은 이수증이 없습니다"
                description="교육 과정을 완료하고 평가에 합격하면 이수증이 자동으로 발급됩니다."
                action={{
                  label: "교육 시작하기",
                  onClick: () => window.location.href = "/courses"
                }}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>과정명</TableHead>
                    <TableHead>발급일</TableHead>
                    <TableHead className="text-right">동작</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {certificates.map((cert) => (
                    <TableRow key={cert.id}>
                      <TableCell className="font-medium">{cert.course.title}</TableCell>
                      <TableCell>{format(new Date(cert.issuedAt), 'yyyy-MM-dd')}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                          <a href={cert.certificateUrl} download>
                            <Download className="w-4 h-4 mr-2" />
                            다운로드
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
