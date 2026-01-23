const fs = require('fs');
const path = require('path');

const routesPath = path.join(__dirname, '..', 'server', 'routes.ts');
let content = fs.readFileSync(routesPath, 'utf8');

// ==============================
// 1. 팀별 월별 보고서 수정 (lines 3276-3292 영역)
// ==============================

const oldTeamFooter = `      const footerStartRow = currentRow1;
      sheet1.getRow(footerStartRow).height = 21;
      sheet1.getCell(footerStartRow, 1).value = '날짜'; sheet1.getCell(footerStartRow, 2).value = '문제점';
      sheet1.mergeCells(\`C\${footerStartRow}:L\${footerStartRow}\`); sheet1.getCell(footerStartRow, 3).value = '위험예측 사항';
      sheet1.mergeCells(\`M\${footerStartRow}:V\${footerStartRow}\`); sheet1.getCell(footerStartRow, 13).value = '조치사항';
      sheet1.mergeCells(\`W\${footerStartRow}:Z\${footerStartRow}\`); sheet1.getCell(footerStartRow, 23).value = '확인';
      sheet1.mergeCells(\`AA\${footerStartRow}:AG\${footerStartRow}\`);
      let footerCurrentRow = footerStartRow + 1;
      remarksData.forEach(remark => {
        sheet1.getRow(footerCurrentRow).height = 21;
        sheet1.getCell(footerCurrentRow, 1).value = remark.date;
        sheet1.getCell(footerCurrentRow, 2).value = remark.problem;
        sheet1.mergeCells(\`C\${footerCurrentRow}:L\${footerCurrentRow}\`); sheet1.getCell(footerCurrentRow, 3).value = remark.prediction;
        sheet1.mergeCells(\`M\${footerCurrentRow}:V\${footerCurrentRow}\`); sheet1.mergeCells(\`W\${footerCurrentRow}:Z\${footerCurrentRow}\`);
        sheet1.mergeCells(\`AA\${footerCurrentRow}:AG\${footerCurrentRow}\`);
        footerCurrentRow++;
      });`;

const newTeamFooter = `      // 참고사항 내용
      const referenceNotes = [
        '1. TBM 절차',
        '  * 도입-점검-지시-위험성예지훈련-지적확인',
        '  * 음주 상태 확인 후 고소작업 및 위험작업 배치 제한',
        '    (라인,직별 일직선 걷기 및 안전팀 음주측정기 활용)',
        '2. 아침 조회를 시작으로 TBM 진행',
        '3. 점검은 점검항목 순서에 따라 작업전에 할 것',
        '4. X, △의 경우는 해당 팀장에게 필히 연락하고 조치 내용을 기록할 것.',
        '5. 점검자는 매일 점검항목에 따라 점검을 하여 기입하고,',
        '   점검실시 상황을 확인하여 확인란에 서명할 것.',
        '6. TBM 위험성 평가 실시중 기간이 필요한 사항은',
        '   잠재위험발굴대장에 추가하여 관리 할 것.'
      ];

      const footerStartRow = currentRow1;
      const totalFooterRows = Math.max(remarksData.length, referenceNotes.length);

      // 헤더 행
      sheet1.getRow(footerStartRow).height = 21;
      sheet1.mergeCells(\`A\${footerStartRow}:B\${footerStartRow}\`);
      sheet1.getCell(footerStartRow, 1).value = '참고사항';
      sheet1.mergeCells(\`C\${footerStartRow}:F\${footerStartRow}\`);
      sheet1.getCell(footerStartRow, 3).value = '날짜';
      sheet1.mergeCells(\`G\${footerStartRow}:N\${footerStartRow}\`);
      sheet1.getCell(footerStartRow, 7).value = '문제점';
      sheet1.mergeCells(\`O\${footerStartRow}:V\${footerStartRow}\`);
      sheet1.getCell(footerStartRow, 15).value = '위험예측 사항';
      sheet1.mergeCells(\`W\${footerStartRow}:AC\${footerStartRow}\`);
      sheet1.getCell(footerStartRow, 23).value = '조치사항';
      sheet1.mergeCells(\`AD\${footerStartRow}:AG\${footerStartRow}\`);
      sheet1.getCell(footerStartRow, 30).value = '확인';

      let footerCurrentRow = footerStartRow + 1;
      for (let i = 0; i < totalFooterRows; i++) {
        sheet1.getRow(footerCurrentRow).height = 21;

        // 참고사항 열 (A-B)
        sheet1.mergeCells(\`A\${footerCurrentRow}:B\${footerCurrentRow}\`);
        if (i < referenceNotes.length) {
          sheet1.getCell(footerCurrentRow, 1).value = referenceNotes[i];
          sheet1.getCell(footerCurrentRow, 1).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        }

        // 날짜 열 (C-F)
        sheet1.mergeCells(\`C\${footerCurrentRow}:F\${footerCurrentRow}\`);
        if (i < remarksData.length) {
          sheet1.getCell(footerCurrentRow, 3).value = remarksData[i].date;
        }

        // 문제점 열 (G-N)
        sheet1.mergeCells(\`G\${footerCurrentRow}:N\${footerCurrentRow}\`);
        if (i < remarksData.length) {
          sheet1.getCell(footerCurrentRow, 7).value = remarksData[i].problem;
        }

        // 위험예측 사항 열 (O-V)
        sheet1.mergeCells(\`O\${footerCurrentRow}:V\${footerCurrentRow}\`);
        if (i < remarksData.length) {
          sheet1.getCell(footerCurrentRow, 15).value = remarksData[i].prediction;
          sheet1.getCell(footerCurrentRow, 15).alignment = { vertical: 'middle', horizontal: 'left' };
        }

        // 조치사항 열 (W-AC)
        sheet1.mergeCells(\`W\${footerCurrentRow}:AC\${footerCurrentRow}\`);

        // 확인 열 (AD-AG)
        sheet1.mergeCells(\`AD\${footerCurrentRow}:AG\${footerCurrentRow}\`);

        footerCurrentRow++;
      }`;

// ==============================
// 2. 종합 보고서 수정 (lines 3771-3819 영역)
// ==============================

const oldCompFooter = `          // 하단 문제점 테이블
          const footerStartRow = currentRow1;
          sheet1.getRow(footerStartRow).height = 21;
          sheet1.getCell(footerStartRow, 1).value = '날짜';
          sheet1.getCell(footerStartRow, 1).font = boldFont;
          sheet1.getCell(footerStartRow, 1).alignment = centerAlignment;

          sheet1.getCell(footerStartRow, 2).value = '문제점';
          sheet1.getCell(footerStartRow, 2).font = boldFont;
          sheet1.getCell(footerStartRow, 2).alignment = centerAlignment;

          sheet1.mergeCells(\`C\${footerStartRow}:L\${footerStartRow}\`);
          sheet1.getCell(footerStartRow, 3).value = '위험예측 사항';
          sheet1.getCell(footerStartRow, 3).font = boldFont;
          sheet1.getCell(footerStartRow, 3).alignment = centerAlignment;

          sheet1.mergeCells(\`M\${footerStartRow}:V\${footerStartRow}\`);
          sheet1.getCell(footerStartRow, 13).value = '조치사항';
          sheet1.getCell(footerStartRow, 13).font = boldFont;
          sheet1.getCell(footerStartRow, 13).alignment = centerAlignment;

          sheet1.mergeCells(\`W\${footerStartRow}:Z\${footerStartRow}\`);
          sheet1.getCell(footerStartRow, 23).value = '확인';
          sheet1.getCell(footerStartRow, 23).font = boldFont;
          sheet1.getCell(footerStartRow, 23).alignment = centerAlignment;

          sheet1.mergeCells(\`AA\${footerStartRow}:AG\${footerStartRow}\`);

          let footerCurrentRow = footerStartRow + 1;
          remarksData.forEach(remark => {
            sheet1.getRow(footerCurrentRow).height = 21;
            sheet1.getCell(footerCurrentRow, 1).value = remark.date;
            sheet1.getCell(footerCurrentRow, 1).font = font;
            sheet1.getCell(footerCurrentRow, 1).alignment = centerAlignment;

            sheet1.getCell(footerCurrentRow, 2).value = remark.problem;
            sheet1.getCell(footerCurrentRow, 2).font = font;
            sheet1.getCell(footerCurrentRow, 2).alignment = centerAlignment;

            sheet1.mergeCells(\`C\${footerCurrentRow}:L\${footerCurrentRow}\`);
            sheet1.getCell(footerCurrentRow, 3).value = remark.prediction;
            sheet1.getCell(footerCurrentRow, 3).font = font;
            sheet1.getCell(footerCurrentRow, 3).alignment = { vertical: 'middle' as const, horizontal: 'left' as const };

            sheet1.mergeCells(\`M\${footerCurrentRow}:V\${footerCurrentRow}\`);
            sheet1.mergeCells(\`W\${footerCurrentRow}:Z\${footerCurrentRow}\`);
            sheet1.mergeCells(\`AA\${footerCurrentRow}:AG\${footerCurrentRow}\`);
            footerCurrentRow++;
          });`;

const newCompFooter = `          // 참고사항 내용
          const referenceNotes = [
            '1. TBM 절차',
            '  * 도입-점검-지시-위험성예지훈련-지적확인',
            '  * 음주 상태 확인 후 고소작업 및 위험작업 배치 제한',
            '    (라인,직별 일직선 걷기 및 안전팀 음주측정기 활용)',
            '2. 아침 조회를 시작으로 TBM 진행',
            '3. 점검은 점검항목 순서에 따라 작업전에 할 것',
            '4. X, △의 경우는 해당 팀장에게 필히 연락하고 조치 내용을 기록할 것.',
            '5. 점검자는 매일 점검항목에 따라 점검을 하여 기입하고,',
            '   점검실시 상황을 확인하여 확인란에 서명할 것.',
            '6. TBM 위험성 평가 실시중 기간이 필요한 사항은',
            '   잠재위험발굴대장에 추가하여 관리 할 것.'
          ];

          // 하단 문제점 테이블
          const footerStartRow = currentRow1;
          const totalFooterRows = Math.max(remarksData.length, referenceNotes.length);

          // 헤더 행
          sheet1.getRow(footerStartRow).height = 21;
          sheet1.mergeCells(\`A\${footerStartRow}:B\${footerStartRow}\`);
          sheet1.getCell(footerStartRow, 1).value = '참고사항';
          sheet1.getCell(footerStartRow, 1).font = boldFont;
          sheet1.getCell(footerStartRow, 1).alignment = centerAlignment;

          sheet1.mergeCells(\`C\${footerStartRow}:F\${footerStartRow}\`);
          sheet1.getCell(footerStartRow, 3).value = '날짜';
          sheet1.getCell(footerStartRow, 3).font = boldFont;
          sheet1.getCell(footerStartRow, 3).alignment = centerAlignment;

          sheet1.mergeCells(\`G\${footerStartRow}:N\${footerStartRow}\`);
          sheet1.getCell(footerStartRow, 7).value = '문제점';
          sheet1.getCell(footerStartRow, 7).font = boldFont;
          sheet1.getCell(footerStartRow, 7).alignment = centerAlignment;

          sheet1.mergeCells(\`O\${footerStartRow}:V\${footerStartRow}\`);
          sheet1.getCell(footerStartRow, 15).value = '위험예측 사항';
          sheet1.getCell(footerStartRow, 15).font = boldFont;
          sheet1.getCell(footerStartRow, 15).alignment = centerAlignment;

          sheet1.mergeCells(\`W\${footerStartRow}:AC\${footerStartRow}\`);
          sheet1.getCell(footerStartRow, 23).value = '조치사항';
          sheet1.getCell(footerStartRow, 23).font = boldFont;
          sheet1.getCell(footerStartRow, 23).alignment = centerAlignment;

          sheet1.mergeCells(\`AD\${footerStartRow}:AG\${footerStartRow}\`);
          sheet1.getCell(footerStartRow, 30).value = '확인';
          sheet1.getCell(footerStartRow, 30).font = boldFont;
          sheet1.getCell(footerStartRow, 30).alignment = centerAlignment;

          let footerCurrentRow = footerStartRow + 1;
          for (let i = 0; i < totalFooterRows; i++) {
            sheet1.getRow(footerCurrentRow).height = 21;

            // 참고사항 열 (A-B)
            sheet1.mergeCells(\`A\${footerCurrentRow}:B\${footerCurrentRow}\`);
            if (i < referenceNotes.length) {
              sheet1.getCell(footerCurrentRow, 1).value = referenceNotes[i];
              sheet1.getCell(footerCurrentRow, 1).font = font;
              sheet1.getCell(footerCurrentRow, 1).alignment = { vertical: 'middle' as const, horizontal: 'left' as const, wrapText: true };
            }

            // 날짜 열 (C-F)
            sheet1.mergeCells(\`C\${footerCurrentRow}:F\${footerCurrentRow}\`);
            if (i < remarksData.length) {
              sheet1.getCell(footerCurrentRow, 3).value = remarksData[i].date;
              sheet1.getCell(footerCurrentRow, 3).font = font;
              sheet1.getCell(footerCurrentRow, 3).alignment = centerAlignment;
            }

            // 문제점 열 (G-N)
            sheet1.mergeCells(\`G\${footerCurrentRow}:N\${footerCurrentRow}\`);
            if (i < remarksData.length) {
              sheet1.getCell(footerCurrentRow, 7).value = remarksData[i].problem;
              sheet1.getCell(footerCurrentRow, 7).font = font;
              sheet1.getCell(footerCurrentRow, 7).alignment = centerAlignment;
            }

            // 위험예측 사항 열 (O-V)
            sheet1.mergeCells(\`O\${footerCurrentRow}:V\${footerCurrentRow}\`);
            if (i < remarksData.length) {
              sheet1.getCell(footerCurrentRow, 15).value = remarksData[i].prediction;
              sheet1.getCell(footerCurrentRow, 15).font = font;
              sheet1.getCell(footerCurrentRow, 15).alignment = { vertical: 'middle' as const, horizontal: 'left' as const };
            }

            // 조치사항 열 (W-AC)
            sheet1.mergeCells(\`W\${footerCurrentRow}:AC\${footerCurrentRow}\`);

            // 확인 열 (AD-AG)
            sheet1.mergeCells(\`AD\${footerCurrentRow}:AG\${footerCurrentRow}\`);

            footerCurrentRow++;
          }`;

// 수정 적용
let modified = false;

if (content.includes('참고사항 내용')) {
  console.log('이미 수정됨');
  process.exit(0);
}

if (content.includes(oldTeamFooter)) {
  content = content.replace(oldTeamFooter, newTeamFooter);
  console.log('✅ 팀별 월별 보고서 수정 완료');
  modified = true;
} else {
  console.log('⚠️ 팀별 월별 보고서 패턴을 찾을 수 없음');
}

if (content.includes(oldCompFooter)) {
  content = content.replace(oldCompFooter, newCompFooter);
  console.log('✅ 종합 보고서 수정 완료');
  modified = true;
} else {
  console.log('⚠️ 종합 보고서 패턴을 찾을 수 없음');
}

if (modified) {
  fs.writeFileSync(routesPath, content, 'utf8');
  console.log('✅ routes.ts 저장 완료');
} else {
  console.log('❌ 수정 실패 - 패턴을 찾을 수 없음');
}
