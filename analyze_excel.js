const ExcelJS = require('exceljs');

async function analyzeExcel() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('제목 없는 스프레드시트.xlsx');

  const worksheet = workbook.worksheets[0];

  console.log('=== 워크시트 분석 ===\n');
  console.log('워크시트 이름:', worksheet.name);
  console.log('전체 행 수:', worksheet.rowCount);
  console.log('전체 열 수:', worksheet.columnCount);
  console.log('\n=== 열 너비 ===');

  worksheet.columns.forEach((col, idx) => {
    if (col.width) {
      console.log(`열 ${idx + 1} (${String.fromCharCode(65 + idx)}): 너비 ${col.width}`);
    }
  });

  console.log('\n=== 행 높이 및 내용 ===');

  worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    if (rowNumber > 50) return; // 처음 50행만 출력

    console.log(`\n--- 행 ${rowNumber} ---`);
    if (row.height) {
      console.log(`높이: ${row.height}`);
    }

    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const colLetter = String.fromCharCode(64 + colNumber);
      console.log(`\n셀 ${colLetter}${rowNumber}:`);
      console.log('  값:', cell.value);

      if (cell.merge) {
        console.log('  병합:', cell.merge);
      }

      if (cell.style) {
        if (cell.style.font) {
          console.log('  폰트:', JSON.stringify(cell.style.font));
        }
        if (cell.style.alignment) {
          console.log('  정렬:', JSON.stringify(cell.style.alignment));
        }
        if (cell.style.fill) {
          console.log('  배경:', JSON.stringify(cell.style.fill));
        }
        if (cell.style.border) {
          console.log('  테두리:', JSON.stringify(cell.style.border));
        }
      }
    });
  });

  console.log('\n=== 병합된 셀 ===');
  const merges = worksheet._merges || {};
  Object.keys(merges).forEach(merge => {
    console.log(merge);
  });
}

analyzeExcel().catch(console.error);
