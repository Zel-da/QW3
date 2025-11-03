import React, { useState, useEffect, useCallback } from 'react';
import apiClient from './apiConfig';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '../../components/ui/pagination';
import { ArrowUpDown } from 'lucide-react';

const ReportListView = ({ onSelectReport, onBack, site }) => {
    const [reports, setReports] = useState([]);
    const [teams, setTeams] = useState([]);
    const [filters, setFilters] = useState({
        startDate: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().slice(0, 10),
        endDate: new Date().toISOString().slice(0, 10),
        teamId: '',
        site: site,
    });
    const [loading, setLoading] = useState(false);
    const [sortBy, setSortBy] = useState('date-desc'); // date-desc, date-asc, team-asc, team-desc
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    useEffect(() => {
        setFilters(prev => ({ ...prev, site: site }));
    }, [site]);

    useEffect(() => {
        apiClient.get('/api/teams')
            .then(response => setTeams(response.data))
            .catch(error => console.error("Error fetching teams:", error));
    }, []);

    const fetchReports = useCallback(() => {
        setLoading(true);
        apiClient.get('/api/reports', { params: filters })
            .then(response => setReports(response.data))
            .catch(error => console.error("Error fetching reports:", error))
            .finally(() => setLoading(false));
    }, [filters]);

    useEffect(() => {
        if (filters.startDate && filters.endDate) {
            fetchReports();
        } else {
            setReports([]);
        }
    }, [filters, fetchReports]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    // Sort and paginate reports
    const sortedReports = React.useMemo(() => {
        const sorted = [...reports].sort((a, b) => {
            if (sortBy === 'date-desc') {
                return new Date(b.reportDate) - new Date(a.reportDate);
            } else if (sortBy === 'date-asc') {
                return new Date(a.reportDate) - new Date(b.reportDate);
            } else if (sortBy === 'team-asc') {
                return (a.team?.name || '').localeCompare(b.team?.name || '', 'ko-KR');
            } else if (sortBy === 'team-desc') {
                return (b.team?.name || '').localeCompare(a.team?.name || '', 'ko-KR');
            }
            return 0;
        });
        return sorted;
    }, [reports, sortBy]);

    const totalPages = Math.ceil(sortedReports.length / ITEMS_PER_PAGE);
    const paginatedReports = sortedReports.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Reset to page 1 when filters or sort changes
    useEffect(() => {
        setCurrentPage(1);
    }, [filters, sortBy]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">제출된 점검표 목록</h2>
                <Button onClick={onBack} variant="outline">작성하기</Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <Label htmlFor="startDate">시작일:</Label>
                    <Input
                        id="startDate"
                        type="date"
                        name="startDate"
                        value={filters.startDate}
                        onChange={handleFilterChange}
                        className="w-48"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Label htmlFor="endDate">종료일:</Label>
                    <Input
                        id="endDate"
                        type="date"
                        name="endDate"
                        value={filters.endDate}
                        onChange={handleFilterChange}
                        className="w-48"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Label htmlFor="team">팀:</Label>
                    <select
                        id="team"
                        name="teamId"
                        value={filters.teamId}
                        onChange={handleFilterChange}
                        className="flex h-10 w-48 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="">모든 팀</option>
                        {Array.isArray(teams) && teams.map(team => (
                            <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <Label htmlFor="sortBy">정렬:</Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="정렬 기준" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="date-desc">최신순</SelectItem>
                            <SelectItem value="date-asc">오래된순</SelectItem>
                            <SelectItem value="team-asc">팀명 (가나다순)</SelectItem>
                            <SelectItem value="team-desc">팀명 (역순)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {loading ? (
                <p>목록을 불러오는 중...</p>
            ) : (
                <>
                    {sortedReports.length === 0 ? (
                        <div className="text-center text-muted-foreground py-10">
                            <p>선택한 기간에 해당하는 점검표가 없습니다.</p>
                        </div>
                    ) : (
                        <>
                            <Card>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[100px]">ID</TableHead>
                                                <TableHead>작성일</TableHead>
                                                <TableHead>팀명</TableHead>
                                                <TableHead>작성자</TableHead>
                                                <TableHead>비고</TableHead>
                                                <TableHead className="text-center w-[120px]">액션</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginatedReports.map(report => (
                                                <TableRow key={report.id}>
                                                    <TableCell className="font-medium">#{report.id}</TableCell>
                                                    <TableCell>{new Date(report.reportDate).toLocaleDateString('ko-KR')}</TableCell>
                                                    <TableCell>{report.team?.name || '-'}</TableCell>
                                                    <TableCell>{report.managerName}</TableCell>
                                                    <TableCell className="max-w-[200px] truncate">{report.remarks || '-'}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Button
                                                            onClick={() => onSelectReport(report.id)}
                                                            size="sm"
                                                            variant="outline"
                                                        >
                                                            상세 보기
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex justify-center">
                                    <Pagination>
                                        <PaginationContent>
                                            <PaginationItem>
                                                <PaginationPrevious
                                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                                />
                                            </PaginationItem>
                                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                                <PaginationItem key={page}>
                                                    <PaginationLink
                                                        onClick={() => setCurrentPage(page)}
                                                        isActive={currentPage === page}
                                                        className="cursor-pointer"
                                                    >
                                                        {page}
                                                    </PaginationLink>
                                                </PaginationItem>
                                            ))}
                                            <PaginationItem>
                                                <PaginationNext
                                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                                />
                                            </PaginationItem>
                                        </PaginationContent>
                                    </Pagination>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );
};

export default ReportListView;