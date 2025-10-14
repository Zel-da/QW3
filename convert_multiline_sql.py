#!/usr/bin/env python3
import re

def parse_multiline_sql():
    """여러 줄 INSERT 문을 처리하는 버퍼링 파서"""
    
    # 1. UTF-16 파일 읽기
    with open('attached_assets/script1_1760403229620.sql', 'rb') as f:
        raw_content = f.read()
    
    if raw_content[:2] == b'\xff\xfe':
        content = raw_content.decode('utf-16-le')
    else:
        content = raw_content.decode('utf-8')
    
    # 2. 전체 내용을 한 줄로 만들기 (줄바꿈을 공백으로 대체)
    # 하지만 GO 명령은 유지
    content = re.sub(r'\r?\n', ' ', content)
    content = re.sub(r'\s+GO\s+', '\nGO\n', content)
    
    # 3. INSERT 문 추출
    # 패턴: INSERT [dbo].[테이블명] ... VALUES (...);
    insert_pattern = r"INSERT\s+\[dbo\]\.\[(\w+)\]\s+\([^\)]+\)\s+VALUES\s+\([^\)]+\)"
    
    lines = content.split('\n')
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
                    
                    # 5. 여러 공백을 하나로
                    line = re.sub(r'\s+', ' ', line)
                    
                    # 6. 줄 끝에 세미콜론 추가
                    if not line.rstrip().endswith(';'):
                        line = line.rstrip() + ';'
                    
                    output_lines.append(line)
    
    # 4. 결과 저장 (테이블별로 정리)
    with open('FoodieMatch/tbm_data_complete.sql', 'w', encoding='utf-8') as f:
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
        f.write('\n-- ReportSignatures data\n')
        for line in output_lines:
            if '"ReportSignatures"' in line:
                f.write(line + '\n')
        
        # 시퀀스 리셋
        f.write('\n-- Reset sequences\n')
        f.write('SELECT setval(pg_get_serial_sequence(\'"Teams"\', \'TeamID\'), COALESCE((SELECT MAX("TeamID") FROM "Teams"), 1));\n')
        f.write('SELECT setval(pg_get_serial_sequence(\'"Users"\', \'UserID\'), COALESCE((SELECT MAX("UserID") FROM "Users"), 1));\n')
        f.write('SELECT setval(pg_get_serial_sequence(\'"ChecklistTemplates"\', \'TemplateID\'), COALESCE((SELECT MAX("TemplateID") FROM "ChecklistTemplates"), 1));\n')
        f.write('SELECT setval(pg_get_serial_sequence(\'"TemplateItems"\', \'ItemID\'), COALESCE((SELECT MAX("ItemID") FROM "TemplateItems"), 1));\n')
        f.write('SELECT setval(pg_get_serial_sequence(\'"DailyReports"\', \'ReportID\'), COALESCE((SELECT MAX("ReportID") FROM "DailyReports"), 1));\n')
        f.write('SELECT setval(pg_get_serial_sequence(\'"ReportDetails"\', \'DetailID\'), COALESCE((SELECT MAX("DetailID") FROM "ReportDetails"), 1));\n')
        f.write('SELECT setval(pg_get_serial_sequence(\'"ReportSignatures"\', \'SignatureID\'), COALESCE((SELECT MAX("SignatureID") FROM "ReportSignatures"), 1));\n')
    
    print(f"✅ 변환 완료: FoodieMatch/tbm_data_complete.sql")
    print(f"📝 총 {len(output_lines)} 개의 INSERT 문 생성")
    
    # 테이블별 개수 출력
    for table in target_tables:
        count = sum(1 for line in output_lines if f'"{table}"' in line)
        if count > 0:
            print(f"   - {table}: {count}개")

if __name__ == '__main__':
    parse_multiline_sql()
