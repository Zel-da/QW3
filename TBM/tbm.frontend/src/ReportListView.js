
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from './apiConfig';

const ReportListView = ({ onSelectReport }) => {
    const [reports, setReports] = useState([]);
    const [teams, setTeams] = useState([]);
    const [filters, setFilters] = useState({ startDate: '', endDate: '', teamId: '' });
    const [loading, setLoading] = useState(false);

    // Fetch teams for the filter dropdown
    useEffect(() => {
        axios.get(`${API_BASE_URL}/api/teams`)
            .then(response => setTeams(response.data))
            .catch(error => console.error("Error fetching teams:", error));
    }, []);

    const fetchReports = () => {
        setLoading(true);
        const params = {};
        
        // 기간별 조회를 위한 파라미터 설정
        if (filters.startDate && filters.endDate) {
            params.startDate = filters.startDate;
            params.endDate = filters.endDate;
        }
        
        if (filters.teamId) {
            params.teamId = filters.teamId;
        }
        
        axios.get(`${API_BASE_URL}/api/reports`, { params })
            .then(response => setReports(response.data))
            .catch(error => console.error("Error fetching reports:", error))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (filters.startDate && filters.endDate) {
            fetchReports();
        } else {
            setReports([]); // Clear reports if date range is not selected
        }
    }, [filters]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="report-list-container">
            <h2>제출된 점검표 목록</h2>
            <div className="filters" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '1.1rem', fontWeight: '500' }}>시작 날짜:</label>
                    <input 
                        type="date" 
                        name="startDate" 
                        value={filters.startDate} 
                        onChange={handleFilterChange}
                        style={{ padding: '0.5rem', fontSize: '1rem', minHeight: '2.5rem' }}
                    />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '1.1rem', fontWeight: '500' }}>종료 날짜:</label>
                    <input 
                        type="date" 
                        name="endDate" 
                        value={filters.endDate} 
                        onChange={handleFilterChange}
                        style={{ padding: '0.5rem', fontSize: '1rem', minHeight: '2.5rem' }}
                    />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '1.1rem', fontWeight: '500' }}>팀:</label>
                    <select 
                        name="teamId" 
                        value={filters.teamId} 
                        onChange={handleFilterChange}
                        style={{ padding: '0.5rem', fontSize: '1rem', minHeight: '2.5rem' }}
                    >
                        <option value="">모든 팀</option>
                        {teams.map(team => (
                            <option key={team.teamID} value={team.teamID}>{team.teamName}</option>
                        ))}
                    </select>
                </div>
            </div>
            {loading ? (
                <p>목록을 불러오는 중...</p>
            ) : (
                <table className="report-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>날짜</th>
                            <th>팀</th>
                            <th>작성자</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reports.map(report => (
                            <tr key={report.reportID} onClick={() => onSelectReport(report.reportID)} className="clickable-row">
                                <td>{report.reportID}</td>
                                <td>{new Date(report.reportDate).toLocaleDateString()}</td>
                                <td>{report.team?.teamName}</td>
                                <td>{report.managerName}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default ReportListView;
