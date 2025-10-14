
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from './apiConfig';

const ReportListView = ({ onSelectReport }) => {
    const [reports, setReports] = useState([]);
    const [teams, setTeams] = useState([]);
    const [filters, setFilters] = useState({ date: '', teamId: '' });
    const [loading, setLoading] = useState(false);

    // Fetch teams for the filter dropdown
    useEffect(() => {
        axios.get(`${API_BASE_URL}/api/teams`)
            .then(response => setTeams(response.data))
            .catch(error => console.error("Error fetching teams:", error));
    }, []);

    const fetchReports = () => {
        setLoading(true);
        axios.get(`${API_BASE_URL}/api/reports`, { params: filters })
            .then(response => setReports(response.data))
            .catch(error => console.error("Error fetching reports:", error))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (filters.date) {
            fetchReports();
        } else {
            setReports([]); // Clear reports if date is not selected
        }
    }, [filters]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="report-list-container">
            <h2>제출된 점검표 목록</h2>
            <div className="filters">
                <label>날짜:</label>
                <input type="date" name="date" value={filters.date} onChange={handleFilterChange} />
                <label>팀:</label>
                <select name="teamId" value={filters.teamId} onChange={handleFilterChange}>
                    <option value="">모든 팀</option>
                    {teams.map(team => (
                        <option key={team.teamID} value={team.teamID}>{team.teamName}</option>
                    ))}
                </select>
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
