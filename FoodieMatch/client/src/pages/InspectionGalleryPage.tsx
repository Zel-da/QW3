import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useLocation } from "wouter";
import { Header } from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Camera, CheckCircle2, XCircle, Calendar, Building2, Users, X, PenSquare } from "lucide-react";
import { Site, SITES } from "@/lib/constants";
import { getInspectionYearRange, cn } from "@/lib/utils";
import { useSite } from "@/hooks/use-site";
import { useAuth } from "@/context/AuthContext";

interface InspectionItem {
  id: number;
  equipmentName: string;
  requiredPhotoCount: number;
  photos: string | PhotoInfo[] | null;
  remarks: string | null;
  isCompleted: boolean;
}

interface Inspection {
  id: number;
  teamId: number;
  year: number;
  month: number;
  inspectionDate: string;
  isCompleted: boolean;
  completedAt: string | null;
  inspectionItems: InspectionItem[];
  team: {
    id: number;
    name: string;
    site: string | null;
    factory: {
      id: number;
      name: string;
    } | null;
    leader: {
      name: string;
      username: string;
    } | null;
  };
}

interface PhotoInfo {
  url: string;
  uploadedAt: string;
}

interface Factory {
  id: number;
  name: string;
  code: string;
}

interface InspectionOverview {
  factoryId: number;
  year: number;
  month: number;
  equipmentTypes: string[];
  teams: TeamOverview[];
}

interface TeamOverview {
  teamId: number;
  teamName: string;
  equipmentStatus: Record<string, {
    quantity: number;
    completed: boolean;
    hasEquipment: boolean;
    uploadedPhotoCount: number;
    requiredPhotoCount: number;
  }>;
}

export default function InspectionGalleryPage() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const { site, setSite } = useSite();
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  const [, setLocation] = useLocation();
  const teamCardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Fetch inspections
  const { data: inspections, isLoading} = useQuery<Inspection[]>({
    queryKey: ['inspection-gallery', site, selectedYear, selectedMonth],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (site) params.append('site', site);
      if (selectedYear) params.append('year', selectedYear.toString());
      if (selectedMonth) params.append('month', selectedMonth.toString());

      const res = await fetch(`/api/inspection/gallery?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch inspections');
      return res.json();
    },
    enabled: !!site
  });

  // Fetch teams for selected site
  const { data: teams = [] } = useQuery({
    queryKey: ['teams', site],
    queryFn: async () => {
      const res = await fetch(`/api/teams?site=${site}`);
      if (!res.ok) throw new Error('Failed to fetch teams');
      return res.json();
    },
    enabled: !!site
  });

  // Fetch factories for site selection
  const { data: factories = [] } = useQuery<Factory[]>({
    queryKey: ['factories'],
    queryFn: async () => {
      const res = await fetch('/api/factories');
      if (!res.ok) throw new Error('Failed to fetch factories');
      return res.json();
    }
  });

  // 팀장의 경우 해당 팀 자동 선택
  useEffect(() => {
    if (user?.role === 'TEAM_LEADER' && user.teamId && teams.length > 0) {
      const userTeam = teams.find(t => t.id === user.teamId);
      if (userTeam) {
        setSelectedTeamId(user.teamId);
      }
    }
  }, [user, teams]);

  // Get factory ID from site
  const selectedFactory = factories.find(f => f.name.includes(site || ''))?.id || null;

  // Fetch inspection overview
  const { data: overviewData, isLoading: overviewLoading } = useQuery<InspectionOverview>({
    queryKey: ['inspection-overview', selectedFactory, selectedYear, selectedMonth],
    queryFn: async () => {
      const { data } = await axios.get(`/api/inspections/overview/${selectedFactory}/${selectedYear}/${selectedMonth}`);
      return data;
    },
    enabled: !!selectedFactory && !!selectedYear && !!selectedMonth,
  });

  const parsePhotos = (photosJson: string | PhotoInfo[] | null): PhotoInfo[] => {
    if (!photosJson) return [];
    if (Array.isArray(photosJson)) return photosJson;
    try {
      return JSON.parse(photosJson as string);
    } catch {
      return [];
    }
  };

  const totalPhotos = inspections?.reduce((sum, inspection) => {
    return sum + inspection.inspectionItems.reduce((itemSum, item) => {
      return itemSum + parsePhotos(item.photos).length;
    }, 0);
  }, 0) || 0;

  const completedInspections = inspections?.filter(i => i.isCompleted).length || 0;

  // Filter inspections by selected team
  const filteredInspections = selectedTeamId
    ? inspections?.filter(i => i.teamId === selectedTeamId)
    : inspections;

  const displayedInspections = filteredInspections || [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-4 lg:p-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-6 h-6" />
                  안전점검 사진 갤러리
                </CardTitle>
                <CardDescription>
                  월별 안전점검 사진을 확인하고 관리합니다
                </CardDescription>
              </div>
              <Button
                onClick={() => setLocation('/safety-inspection')}
                className="flex items-center gap-2"
              >
                <PenSquare className="w-4 h-4" />
                작성하기
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium">현장</label>
                <Select value={site} onValueChange={(value: Site) => setSite(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="현장 선택" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto scrollbar-visible">
                    {SITES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">연도</label>
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(value) => setSelectedYear(parseInt(value))}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto scrollbar-visible">
                    {getInspectionYearRange().map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}년
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">월</label>
                <Select
                  value={selectedMonth.toString()}
                  onValueChange={(value) => setSelectedMonth(parseInt(value))}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto scrollbar-visible">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <SelectItem key={month} value={month.toString()}>
                        {month}월
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            </div>

            {/* 종합 현황표 */}
            {overviewData && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">종합 점검 현황</h3>
                {overviewLoading ? (
                  <LoadingSpinner />
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-32 sticky left-0 bg-white z-10 font-semibold">팀명</TableHead>
                          {overviewData.equipmentTypes.map((equipment) => (
                            <TableHead key={equipment} className="text-center min-w-24 font-semibold">
                              {equipment.replace(' 점검', '')}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {overviewData.teams.map((team) => (
                          <TableRow
                            key={team.teamId}
                            onClick={() => setSelectedTeamId(team.teamId)}
                            className={cn(
                              "cursor-pointer transition-colors",
                              selectedTeamId === team.teamId
                                ? "bg-blue-50 border-l-4 border-l-blue-500"
                                : "hover:bg-gray-50"
                            )}
                          >
                            <TableCell className={cn(
                              "font-medium sticky left-0 z-10",
                              selectedTeamId === team.teamId ? "bg-blue-50" : "bg-white"
                            )}>
                              {team.teamName}
                            </TableCell>
                            {overviewData.equipmentTypes.map((equipment) => {
                              const status = team.equipmentStatus[equipment];
                              if (!status.hasEquipment) {
                                return (
                                  <TableCell key={equipment} className="text-center bg-gray-100 text-gray-400">
                                    -
                                  </TableCell>
                                );
                              }

                              // 세 가지 상태 결정
                              const isCompleted = status.uploadedPhotoCount >= status.requiredPhotoCount;
                              const isPartial = status.uploadedPhotoCount > 0 && status.uploadedPhotoCount < status.requiredPhotoCount;

                              let bgColor, textColor, hoverColor;
                              if (isCompleted) {
                                bgColor = 'bg-green-100';
                                textColor = 'text-green-700';
                                hoverColor = 'hover:bg-green-200';
                              } else if (isPartial) {
                                bgColor = 'bg-yellow-100';
                                textColor = 'text-yellow-700';
                                hoverColor = 'hover:bg-yellow-200';
                              } else {
                                bgColor = 'bg-red-100';
                                textColor = 'text-red-700';
                                hoverColor = 'hover:bg-red-200';
                              }

                              return (
                                <TableCell
                                  key={equipment}
                                  className={`text-center font-medium cursor-pointer transition-colors ${bgColor} ${textColor} ${hoverColor}`}
                                  onClick={() => {
                                    setSelectedTeamId(team.teamId);
                                    setTimeout(() => {
                                      const element = teamCardRefs.current.get(team.teamId);
                                      if (element) {
                                        const yOffset = -100;
                                        const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
                                        window.scrollTo({ top: y, behavior: 'smooth' });
                                      }
                                    }, 100);
                                  }}
                                >
                                  {(status.uploadedPhotoCount ?? 0)}/{(status.requiredPhotoCount ?? 0)}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-md">
                    <span className="font-medium">💡 팁:</span>
                    <span>팀명을 클릭하면 해당 팀이 선택되고, 장비 셀을 클릭하면 필터링됩니다</span>
                  </div>
                  <div className="flex gap-4 text-sm flex-wrap items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-100 border border-green-300 rounded" />
                      <span>점검 완료</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded" />
                      <span>부분 완료</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-100 border border-red-300 rounded" />
                      <span>점검 미완료</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded" />
                      <span>해당 장비 없음</span>
                    </div>
                    {selectedTeamId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTeamId(null)}
                        className="ml-auto"
                      >
                        <X className="w-4 h-4 mr-1" />
                        필터 해제
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Summary Stats */}
            {inspections && inspections.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{inspections.length}</div>
                    <p className="text-sm text-muted-foreground">총 점검 건수</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-600">{completedInspections}</div>
                    <p className="text-sm text-muted-foreground">완료된 점검</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-blue-600">{totalPhotos}</div>
                    <p className="text-sm text-muted-foreground">총 사진 수</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {new Set(inspections.map(i => i.teamId)).size}
                    </div>
                    <p className="text-sm text-muted-foreground">점검한 팀 수</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Gallery */}
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">로딩 중...</p>
              </div>
            ) : !displayedInspections || displayedInspections.length === 0 ? (
              <div className="text-center py-12">
                <Camera className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  {selectedTeamId
                    ? '선택한 팀의 안전점검 기록이 없습니다.'
                    : '선택한 조건에 해당하는 안전점검 기록이 없습니다.'}
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {displayedInspections.map((inspection) => (
                  <Card
                    key={inspection.id}
                    className="overflow-hidden"
                    ref={(el) => {
                      if (el) {
                        teamCardRefs.current.set(inspection.teamId, el);
                      }
                    }}
                  >
                    <CardHeader className="bg-muted/50">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="flex items-center gap-2">
                            <Building2 className="w-5 h-5" />
                            {inspection.team.name}
                            {inspection.isCompleted ? (
                              <Badge variant="default" className="bg-green-600">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                완료
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <XCircle className="w-3 h-3 mr-1" />
                                미완료
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {inspection.year}년 {inspection.month}월
                            </span>
                            {inspection.team.factory && (
                              <span className="flex items-center gap-1">
                                <Building2 className="w-4 h-4" />
                                {inspection.team.factory.name}
                              </span>
                            )}
                            {inspection.team.leader && (
                              <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {inspection.team.leader.name}
                              </span>
                            )}
                          </CardDescription>
                        </div>
                        <Badge variant="outline">
                          {inspection.inspectionItems.length}개 장비
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-6">
                        {inspection.inspectionItems.map((item) => {
                          const photos = parsePhotos(item.photos);
                          return (
                            <div key={item.id} className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold">{item.equipmentName}</h4>
                                  {item.isCompleted ? (
                                    <Badge variant="default" className="bg-green-600 text-xs">완료</Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-xs">미완료</Badge>
                                  )}
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {photos.length} / {item.requiredPhotoCount} 사진
                                </span>
                              </div>

                              {item.remarks && (
                                <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                                  {item.remarks}
                                </p>
                              )}

                              {photos.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                  {photos.map((photo, idx) => (
                                    <div
                                      key={idx}
                                      className="relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer group"
                                      onClick={() => setEnlargedImage(photo.url)}
                                    >
                                      <img
                                        src={photo.url}
                                        alt={`${item.equipmentName} - ${idx + 1}`}
                                        className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                      />
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                        <Camera className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-8 bg-muted/30 rounded-lg border-2 border-dashed">
                                  <Camera className="w-12 h-12 mx-auto text-muted-foreground/50 mb-2" />
                                  <p className="text-sm text-muted-foreground">사진 없음</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Image Viewer Dialog */}
      <Dialog open={!!enlargedImage} onOpenChange={(open) => !open && setEnlargedImage(null)}>
        <DialogContent className="max-w-4xl w-full p-0">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full"
              onClick={() => setEnlargedImage(null)}
            >
              <X className="h-6 w-6" />
            </Button>
            {enlargedImage && (
              <img
                src={enlargedImage}
                alt="확대된 이미지"
                className="w-full h-auto max-h-[80vh] object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
