const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'client', 'src', 'features', 'tbm', 'TBMChecklist.jsx');
let content = fs.readFileSync(filePath, 'utf8');

if (content.includes('참고사항 섹션')) {
  console.log('이미 참고사항 섹션이 있습니다.');
  process.exit(0);
}

// 정규식으로 패턴 찾기
const regex = /(<\/div>\s*<\/div>\s*\n\s*{\/* 참석자 서명 섹션)/;

const referenceSection = `</div>
          </div>

          {/* 참고사항 섹션 */}
          <div className="mt-6 p-4 bg-muted/30 rounded-lg border">
            <h4 className="font-semibold mb-3 text-base">참고사항</h4>
            <div className="text-sm space-y-2 text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">1. TBM 절차</p>
                <p className="pl-4">• 도입-점검-지시-위험성예지훈련-지적확인</p>
                <p className="pl-4">• 음주 상태 확인 후 고소작업 및 위험작업 배치 제한</p>
                <p className="pl-6 text-xs">(라인,직별 일직선 걷기 및 안전팀 음주측정기 활용)</p>
              </div>
              <p><span className="font-medium text-foreground">2.</span> 아침 조회를 시작으로 TBM 진행</p>
              <p><span className="font-medium text-foreground">3.</span> 점검은 점검항목 순서에 따라 작업전에 할 것</p>
              <p><span className="font-medium text-foreground">4.</span> X, △의 경우는 해당 팀장에게 필히 연락하고 조치 내용을 기록할 것.</p>
              <p><span className="font-medium text-foreground">5.</span> 점검자는 매일 점검항목에 따라 점검을 하여 기입하고, 점검실시 상황을 확인하여 확인란에 서명할 것.</p>
              <p><span className="font-medium text-foreground">6.</span> TBM 위험성 평가 실시중 기간이 필요한 사항은 잠재위험발굴대장에 추가하여 관리 할 것.</p>
            </div>
          </div>

          {/* 참석자 서명 섹션`;

if (regex.test(content)) {
  content = content.replace(regex, referenceSection);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('TBMChecklist.jsx 수정 완료');
} else {
  // 다른 방법 시도
  const idx = content.indexOf('{/* 참석자 서명 섹션');
  if (idx > 0) {
    // 이전 </div></div> 찾기
    const beforeText = content.substring(0, idx);
    const insertIdx = beforeText.lastIndexOf('</div>');
    if (insertIdx > 0) {
      const referenceHtml = `

          {/* 참고사항 섹션 */}
          <div className="mt-6 p-4 bg-muted/30 rounded-lg border">
            <h4 className="font-semibold mb-3 text-base">참고사항</h4>
            <div className="text-sm space-y-2 text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">1. TBM 절차</p>
                <p className="pl-4">• 도입-점검-지시-위험성예지훈련-지적확인</p>
                <p className="pl-4">• 음주 상태 확인 후 고소작업 및 위험작업 배치 제한</p>
                <p className="pl-6 text-xs">(라인,직별 일직선 걷기 및 안전팀 음주측정기 활용)</p>
              </div>
              <p><span className="font-medium text-foreground">2.</span> 아침 조회를 시작으로 TBM 진행</p>
              <p><span className="font-medium text-foreground">3.</span> 점검은 점검항목 순서에 따라 작업전에 할 것</p>
              <p><span className="font-medium text-foreground">4.</span> X, △의 경우는 해당 팀장에게 필히 연락하고 조치 내용을 기록할 것.</p>
              <p><span className="font-medium text-foreground">5.</span> 점검자는 매일 점검항목에 따라 점검을 하여 기입하고, 점검실시 상황을 확인하여 확인란에 서명할 것.</p>
              <p><span className="font-medium text-foreground">6.</span> TBM 위험성 평가 실시중 기간이 필요한 사항은 잠재위험발굴대장에 추가하여 관리 할 것.</p>
            </div>
          </div>
`;
      content = beforeText.substring(0, insertIdx + 6) + referenceHtml + content.substring(idx);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('TBMChecklist.jsx 수정 완료 (방법2)');
    }
  } else {
    console.log('참석자 서명 섹션을 찾을 수 없음');
  }
}
