
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from './apiConfig';

const ReportDetailView = ({ reportId, onBackToList, onModify }) => {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!reportId) return;

        setLoading(true);
        axios.get(`${API_BASE_URL}/api/reports/${reportId}`)
            .then(response => setReport(response.data))
            .catch(error => console.error(`Error fetching report ${reportId}:`, error))
            .finally(() => setLoading(false));
    }, [reportId]);

    const handleDelete = async () => {
        if (window.confirm(`정말로 이 점검표(ID: ${reportId})를 삭제하시겠습니까?`)) {
            try {
                await axios.delete(`${API_BASE_URL}/api/reports/${reportId}`);
                alert("점검표가 성공적으로 삭제되었습니다.");
                onBackToList();
            } catch (error) {
                console.error("Error deleting report:", error);
                alert("삭제 중 오류가 발생했습니다.");
            }
        }
    };

    if (loading) {
        return <p>점검표 상세 정보를 불러오는 중...</p>;
    }

    if (!report) {
        return (
            <div>
                <p>표시할 점검표를 선택해주세요.</p>
                <button onClick={onBackToList}>목록으로</button>
            </div>
        );
    }

    return (
        <div className="report-detail-container">
            <div>
                <button onClick={onBackToList} className="back-button">← 목록으로</button>
                <button onClick={() => onModify(reportId)} className="modify-button">수정</button>
                <button onClick={handleDelete} className="delete-button">삭제</button>
            </div>
            <h2>점검표 상세 보기 (ID: {report.reportID})</h2>
            
            <div className="info-bar">
                <span><b>부서명:</b> {report.team?.teamName}</span>
                <span><b>관리감독자:</b> {report.managerName}</span>
                <span><b>작성일:</b> {new Date(report.reportDate).toLocaleDateString()}</span>
            </div>

            <h4>점검 결과</h4>
            <table className="checklist-table">
                <thead>
                    <tr>
                        <th>구분</th>
                        <th>중분류</th>
                        <th>점검 내용</th>
                        <th>결과</th>
                    </tr>
                </thead>
                <tbody>
                    {report.reportDetails?.map(detail => (
                        <tr key={detail.detailID}>
                            <td>{detail.item?.category}</td>
                            <td>{detail.item?.subCategory}</td>
                            <td>{detail.item?.description}</td>
                            <td style={{textAlign: 'center', fontWeight: 'bold'}}>{detail.checkState}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <h4>종합 특이사항</h4>
            <p className="remarks-box">{report.remarks || '특이사항 없음'}</p>

            <h4>서명</h4>
            <div className="signatures-grid">
                {report.reportSignatures?.map(sig => (
                    <div key={sig.signatureID} className="signature-item">
                        <p>{sig.user?.userName || '관리자'} ({new Date(sig.signedAt).toLocaleString()})</p>
                        <img src={`data:image/png;base64,${sig.signatureImage}`} alt={`signature of ${sig.user?.userName}`} />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ReportDetailView;
