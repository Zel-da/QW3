
import React, { useState, useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import axios from 'axios';
import './TBMChecklist.css';
import API_BASE_URL from './apiConfig';

const SignatureModal = ({ user, onSave, onClose }) => {
    const sigPad = useRef(null);
    const handleSave = () => {
        if (sigPad.current.isEmpty()) {
            alert("서명을 입력해주세요.");
            return;
        }
        const signatureImage = sigPad.current.toDataURL('image/png');
        onSave(user.userID, signatureImage);
        onClose();
    };
    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3>{user.userName} 님, 서명해주세요.</h3>
                <div className="signature-pad">
                    <SignatureCanvas ref={sigPad} penColor='black' canvasProps={{ width: 400, height: 200, className: 'sig-canvas' }} />
                </div>
                <div className="modal-buttons">
                    <button onClick={handleSave}>저장</button>
                    <button onClick={() => sigPad.current.clear()}>다시 서명</button>
                    <button onClick={onClose}>닫기</button>
                </div>
            </div>
        </div>
    );
};

const TBMChecklist = ({ reportIdForEdit, onFinishEditing }) => {
    const [teams, setTeams] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedTeam, setSelectedTeam] = useState('');
    const [checklistData, setChecklistData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [checkResults, setCheckResults] = useState({});
    const [signatures, setSignatures] = useState({});
    const [remarks, setRemarks] = useState("");
    const [currentUserForSigning, setCurrentUserForSigning] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const managerSigPad = useRef(null);

    const isEditMode = reportIdForEdit != null;

    const resetState = () => {
        setCheckResults({});
        setSignatures({});
        setRemarks("특이사항 없음");
        if(managerSigPad.current) managerSigPad.current.clear();
    }

    // 1. 팀 목록 불러오기 (최초 1회)
    useEffect(() => {
        axios.get(`${API_BASE_URL}/api/teams`)
            .then(response => {
                setTeams(response.data);
                if (!isEditMode && response.data.length > 0) {
                    setSelectedTeam(response.data[0].teamID);
                }
            })
            .catch(error => console.error("Error fetching teams:", error));
    }, [isEditMode]);

    // 2. 수정 모드일 때, 기존 데이터 불러오기
    useEffect(() => {
        if (isEditMode) {
            setLoading(true);
            axios.get(`${API_BASE_URL}/api/reports/${reportIdForEdit}`)
                .then(response => {
                    const report = response.data;
                    setSelectedTeam(report.teamID);
                    setRemarks(report.remarks);
                    
                    const loadedResults = {};
                    report.reportDetails.forEach(detail => {
                        loadedResults[detail.itemID] = detail.checkState;
                    });
                    setCheckResults(loadedResults);

                    const loadedSignatures = {};
                    report.reportSignatures.forEach(sig => {
                        // Assuming the manager signature is not stored with a real user ID in this logic
                        if(sig.user) { 
                            loadedSignatures[sig.userID] = `data:image/png;base64,${sig.signatureImage}`;
                        }
                    });
                    setSignatures(loadedSignatures);
                })
                .catch(error => console.error("Error fetching report for edit:", error))
                .finally(() => setLoading(false));
        }
    }, [isEditMode, reportIdForEdit]);


    // 3. 선택된 팀이 변경될 때마다 점검표와 사용자 목록 불러오기
    useEffect(() => {
        if (!selectedTeam) return;

        setLoading(true);
        if(!isEditMode) resetState();

        const fetchChecklist = axios.get(`${API_BASE_URL}/api/checklist/${selectedTeam}`);
        const fetchUsers = axios.get(`${API_BASE_URL}/api/teams/${selectedTeam}/users`);

        Promise.all([fetchChecklist, fetchUsers])
            .then(([checklistRes, usersRes]) => {
                setChecklistData({ items: checklistRes.data });
                setUsers(usersRes.data);
            })
            .catch(error => console.error(`Error fetching data for team ${selectedTeam}:`, error))
            .finally(() => setLoading(false));

    }, [selectedTeam, isEditMode]);

    const handleCheck = (itemId, value) => setCheckResults(prev => ({ ...prev, [itemId]: value }));
    const openSignatureModal = (user) => { setCurrentUserForSigning(user); setIsModalOpen(true); };
    const closeSignatureModal = () => { setCurrentUserForSigning(null); setIsModalOpen(false); };
    const handleSaveSignature = (userId, signatureImage) => setSignatures(prev => ({ ...prev, [userId]: signatureImage }));

    const handleSubmit = async () => {
        if (checklistData && Object.keys(checkResults).length !== checklistData.items.length) {
            alert("모든 항목을 점검해주세요.");
            return;
        }

        const signatureDtos = Object.entries(signatures).map(([userId, signatureImage]) => ({
            userId: parseInt(userId),
            signatureImage: signatureImage,
        }));
        
        if (!managerSigPad.current.isEmpty()) {
            const managerUserId = users.find(u => u.userName === "홍길동")?.userID || (users.length > 0 ? users[0].userID : 0);
            signatureDtos.push({ userId: managerUserId, signatureImage: managerSigPad.current.toDataURL('image/png') });
        } else if (!isEditMode) { // Only require manager signature for new reports
            alert("관리자 서명이 필요합니다.");
            return;
        }

        const submissionData = {
            reportDate: new Date().toISOString(),
            teamId: parseInt(selectedTeam),
            managerName: "홍길동",
            results: checkResults,
            remarks: remarks,
            signatures: signatureDtos
        };

        setIsSubmitting(true);
        try {
            if (isEditMode) {
                await axios.put(`${API_BASE_URL}/api/reports/${reportIdForEdit}`, submissionData);
                alert("점검표가 성공적으로 수정되었습니다.");
                onFinishEditing(); // Go back to list view
            } else {
                await axios.post(`${API_BASE_URL}/api/reports`, submissionData);
                alert(`${teams.find(t => t.teamID === parseInt(selectedTeam)).teamName} 점검표가 성공적으로 제출되었습니다.`);
                resetState();
            }
        } catch (error) {
            console.error("Error submitting report:", error);
            alert(`데이터 저장 중 오류가 발생했습니다: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="checklist-container">
            {isModalOpen && currentUserForSigning && <SignatureModal user={currentUserForSigning} onSave={handleSaveSignature} onClose={closeSignatureModal} />}
            
            <div className="header-section">
                <h1>{isEditMode ? `점검표 수정 (ID: ${reportIdForEdit})` : `${new Date().getFullYear()}년 관리감독자 일일 안전점검 / TBM 활동지`}</h1>
                <div className="team-selector">
                    <label htmlFor="team">팀 선택:</label>
                    <select id="team" value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)} disabled={isEditMode}>
                        {teams.map(team => <option key={team.teamID} value={team.teamID}>{team.teamName}</option>)}
                    </select>
                </div>
            </div>

            {loading ? <p>데이터를 불러오는 중입니다...</p> : checklistData ? (
                <>
                    <div className="info-bar">
                        <span><b>부서명:</b> {teams.find(t => t.teamID === parseInt(selectedTeam))?.teamName}</span>
                        <span><b>관리감독자:</b> 홍길동 (인)</span>
                        <span><b>작성일:</b> {new Date().toLocaleDateString()}</span>
                    </div>

                    <table className="checklist-table">
                        {/* Table Head & Body */}
                        <thead>
                            <tr><th>구분</th><th>중분류</th><th>점검 내용</th><th>결과 ( O: 양호, △: 관찰, X: 불량 )</th></tr>
                        </thead>
                        <tbody>
                            {checklistData.items.map(item => (
                                <tr key={item.itemID}>
                                    <td>{item.category}</td>
                                    <td>{item.subCategory}</td>
                                    <td className="description-cell">{item.description}</td>
                                    <td className="result-buttons">
                                        {['O', '△', 'X'].map(opt => (
                                            <label key={opt} className={checkResults[item.itemID] === opt ? 'selected' : ''}>
                                                <input type="radio" name={`item-${item.itemID}`} value={opt} checked={checkResults[item.itemID] === opt} onChange={() => handleCheck(item.itemID, opt)} />
                                                {opt}
                                            </label>
                                        ))}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="footer-section">
                        <div className="footer-left">
                            <div className="worker-signatures">
                                <h4>TBM 참여 작업자 확인</h4>
                                <ul>
                                    {users.map(user => (
                                        <li key={user.userID}>
                                            <span>{user.userName}</span>
                                            {signatures[user.userID] ? <span className="signed">✔️ 서명 완료</span> : <button onClick={() => openSignatureModal(user)}>서명하기</button>}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                        <div className="footer-right">
                            <div className="remarks-section">
                                <h4>종합 특이사항</h4>
                                <textarea rows="6" value={remarks} onChange={e => setRemarks(e.target.value)}></textarea>
                            </div>
                            <div className="signature-section">
                                <h4>관리감독자 확인 서명</h4>
                                <div className="signature-pad"><SignatureCanvas ref={managerSigPad} penColor='black' canvasProps={{ width: 300, height: 150, className: 'sig-canvas' }} /></div>
                                <button onClick={() => managerSigPad.current.clear()}>다시 서명</button>
                            </div>
                        </div>
                    </div>
                    
                    <button className="submit-button" onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? '저장 중...' : (isEditMode ? '수정 완료' : '최종 제출')}
                    </button>
                    {isEditMode && <button className="cancel-button" onClick={onFinishEditing}>수정 취소</button>}
                </>
            ) : <p>해당 팀의 점검표를 찾을 수 없습니다.</p>}
        </div>
    );
};

export default TBMChecklist;

const modalStyle = `
.modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background-color:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;}
.modal-content{background-color:white;padding:20px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);}
.modal-buttons{margin-top:10px;display:flex;justify-content:flex-end;gap:10px;}
.worker-signatures ul{list-style-type:none;padding:0;}
.worker-signatures li{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #eee;}
.signed{color:green;font-weight:bold;}
.cancel-button{background-color:#6c757d;margin-top:10px;}
`;

const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = modalStyle;
document.head.appendChild(styleSheet);
