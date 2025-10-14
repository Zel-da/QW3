#!/usr/bin/env python3
import re

def convert_sql_to_postgres():
    """SQL Server UTF-16 파일을 PostgreSQL INSERT로 변환"""
    
    # 1. UTF-16 파일 읽기
    with open('attached_assets/script1_1760403229620.sql', 'rb') as f:
        raw_content = f.read()
    
    if raw_content[:2] == b'\xff\xfe':
        content = raw_content.decode('utf-16-le')
    else:
        content = raw_content.decode('utf-8')
    
    lines = content.splitlines()
    output_lines = []
    
    # 관심 있는 테이블들
    target_tables = ['Teams', 'Users', 'ChecklistTemplates', 'TemplateItems', 
                     'DailyReports', 'ReportDetails', 'ReportSignatures']
    
    for line in lines:
        # INSERT 문만 처리
        if 'INSERT [dbo].' in line:
            # 테이블 이름 추출
            match = re.search(r'INSERT \[dbo\]\.\[(\w+)\]', line)
            if match:
                table_name = match.group(1)
                
                # 관심 있는 테이블만 처리
                if table_name in target_tables:
                    # SQL Server 문법을 PostgreSQL로 변환
                    # 1. INSERT [dbo].[TableName] → INSERT INTO "TableName"
                    line = re.sub(r'INSERT \[dbo\]\.\[(\w+)\]', r'INSERT INTO "\1"', line)
                    
                    # 2. [ColumnName] → "ColumnName"  
                    line = re.sub(r'\[(\w+)\]', r'"\1"', line)
                    
                    # 3. CAST(N'...' AS DateTime2) → '...'::timestamp
                    line = re.sub(r"CAST\(N'([^']+)' AS DateTime2\)", r"'\1'::timestamp", line)
                    
                    # 4. N'string' → 'string'
                    line = re.sub(r"N'", r"'", line)
                    
                    # 5. 줄 끝에 세미콜론 추가
                    if not line.rstrip().endswith(';'):
                        line = line.rstrip() + ';'
                    
                    output_lines.append(line)
    
    # 3. 결과 저장
    with open('FoodieMatch/tbm_data.sql', 'w', encoding='utf-8') as f:
        # Teams 먼저
        f.write('-- Teams data\n')
        for line in output_lines:
            if '"Teams"' in line:
                f.write(line + '\n')
        
        # ChecklistTemplates
        f.write('\n-- ChecklistTemplates data\n')
        for line in output_lines:
            if '"ChecklistTemplates"' in line:
                f.write(line + '\n')
        
        # TemplateItems
        f.write('\n-- TemplateItems data\n')
        for line in output_lines:
            if '"TemplateItems"' in line:
                f.write(line + '\n')
        
        # Users
        f.write('\n-- Users data\n')
        for line in output_lines:
            if '"Users"' in line:
                f.write(line + '\n')
        
        # DailyReports
        f.write('\n-- DailyReports data\n')
        for line in output_lines:
            if '"DailyReports"' in line:
                f.write(line + '\n')
        
        # ReportDetails
        f.write('\n-- ReportDetails data\n')
        for line in output_lines:
            if '"ReportDetails"' in line:
                f.write(line + '\n')
        
        # ReportSignatures
        f.write('\n-- ReportSignatures data (if any)\n')
        for line in output_lines:
            if '"ReportSignatures"' in line:
                f.write(line + '\n')
    
    print(f"✅ 변환 완료: FoodieMatch/tbm_data.sql")
    print(f"📝 총 {len(output_lines)} 개의 INSERT 문 생성")
    
    # 테이블별 개수 출력
    for table in target_tables:
        count = sum(1 for line in output_lines if f'"{table}"' in line)
        if count > 0:
            print(f"   - {table}: {count}개")

if __name__ == '__main__':
    convert_sql_to_postgres()
