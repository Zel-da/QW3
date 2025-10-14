import React, { useState } from 'react';
import TBMChecklist from './TBMChecklist';
import ReportListView from './ReportListView';
import ReportDetailView from './ReportDetailView';
import { Button } from './components/ui/Button';

function App() {
  const [view, setView] = useState('checklist'); // checklist, list, detail
  const [reportIdForEdit, setReportIdForEdit] = useState(null);

  const handleSelectReport = (reportId) => {
    setReportIdForEdit(reportId);
    setView('detail');
  };

  const handleModifyReport = (reportId) => {
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
    <div className="min-h-screen w-full bg-background text-foreground">
      <header className="p-4 border-b">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">TBM 안전점검</h1>
          <nav className="flex gap-2">
            <Button 
              variant={view === 'checklist' ? 'default' : 'outline'}
              onClick={() => { setReportIdForEdit(null); setView('checklist'); }}
            >
              점검표 작성
            </Button>
            <Button 
              variant={view === 'list' ? 'default' : 'outline'}
              onClick={() => setView('list')}
            >
              제출 내역 보기
            </Button>
          </nav>
        </div>
      </header>
      <main className="container mx-auto p-4">
        {renderView()}
      </main>
    </div>
  );
}

export default App;
