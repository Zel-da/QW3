import React, { useState } from 'react';
import TBMChecklist from '../features/tbm/TBMChecklist.jsx';
import ReportListView from '../features/tbm/ReportListView.jsx';
import ReportDetailView from '../features/tbm/ReportDetailView.jsx';
import { Button } from '../components/ui/Button';
import { Header } from '@/components/header';

export default function TbmPage() {
  const [view, setView] = useState('checklist'); // 'checklist', 'list', 'detail'
  const [reportIdForEdit, setReportIdForEdit] = useState<number | null>(null);

  const handleSelectReport = (reportId: number) => {
    setReportIdForEdit(reportId);
    setView('detail');
  };

  const handleModifyReport = (reportId: number) => {
    setReportIdForEdit(reportId);
    setView('checklist');
  };

  const handleBackToList = () => {
    setReportIdForEdit(null);
    setView('list');
  };

  const handleFinishEditing = () => {
    setReportIdForEdit(null);
    setView('list');
  }

  const renderView = () => {
    switch (view) {
      case 'list':
        return <ReportListView onSelectReport={handleSelectReport} />;
      case 'detail':
        return <ReportDetailView reportId={reportIdForEdit} onBackToList={handleBackToList} onModify={handleModifyReport} />;
      case 'checklist':
      default:
        return <TBMChecklist reportIdForEdit={reportIdForEdit} onFinishEditing={handleFinishEditing} />;
    }
  };

  return (
    <div>
      <Header />
      <main className="container mx-auto p-4 lg:p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold tracking-tight">TBM 안전점검</h2>
            <div className="flex gap-2">
              <Button variant={view === 'checklist' ? 'default' : 'outline'} onClick={() => { setReportIdForEdit(null); setView('checklist'); }}>
                점검표 작성
              </Button>
              <Button variant={view === 'list' ? 'default' : 'outline'} onClick={() => setView('list')}>
                제출 내역 보기
              </Button>
            </div>
          </div>
          <div>
            {renderView()}
          </div>
        </div>
      </main>
    </div>
  );
}
