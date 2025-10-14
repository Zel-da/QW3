#!/usr/bin/env python3
import re

# UTF-16 파일 읽기
with open('attached_assets/script1_1760403229620.sql', 'rb') as f:
    raw_content = f.read()

if raw_content[:2] == b'\xff\xfe':
    content = raw_content.decode('utf-16-le')
else:
    content = raw_content.decode('utf-8')

# 관심 있는 테이블들
target_tables = ['Teams', 'Users', 'ChecklistTemplates', 'TemplateItems', 
                 'DailyReports', 'ReportDetails', 'ReportSignatures']

# 정규식 패턴: INSERT [dbo].[테이블] (...) VALUES (...)
# re.DOTALL 플래그로 여러 줄 매칭
pattern = r'INSERT\s+\[dbo\]\.\[(\w+)\]\s+\([^\)]+\)\s+VALUES\s+\((?:[^()]|\([^)]*\))*\)'

matches = re.finditer(pattern, content, re.DOTALL | re.IGNORECASE)

converted = []

for match in matches:
    full_stmt = match.group(0)
    table_name = match.group(1)
    
    # 관심 있는 테이블만 처리
    if table_name in target_tables:
        # 줄바꿈과 여러 공백을 하나로
        stmt = re.sub(r'\s+', ' ', full_stmt.strip())
        
        # SQL Server → PostgreSQL 변환
        stmt = re.sub(r'INSERT \[dbo\]\.\[(\w+)\]', r'INSERT INTO "\1"', stmt, flags=re.IGNORECASE)
        stmt = re.sub(r'\[(\w+)\]', r'"\1"', stmt)
        stmt = re.sub(r"CAST\(N'([^']+)' AS DateTime2\)", r"'\1'::timestamp", stmt, flags=re.IGNORECASE)
        stmt = re.sub(r"N'", r"'", stmt)
        
        # 세미콜론 추가
        if not stmt.endswith(';'):
            stmt += ';'
        
        converted.append(stmt)

print(f"✅ 총 {len(converted)} 개의 INSERT 문 추출")

# 테이블별로 정렬하여 저장
with open('FoodieMatch/complete_tbm_data.sql', 'w', encoding='utf-8') as f:
    # Teams
    f.write('-- Teams data\n')
    teams = [s for s in converted if '"Teams"' in s]
    for stmt in teams:
        f.write(stmt + '\n')
    print(f"   - Teams: {len(teams)}개")
    
    # ChecklistTemplates
    f.write('\n-- ChecklistTemplates data\n')
    templates = [s for s in converted if '"ChecklistTemplates"' in s]
    for stmt in templates:
        f.write(stmt + '\n')
    print(f"   - ChecklistTemplates: {len(templates)}개")
    
    # TemplateItems
    f.write('\n-- TemplateItems data\n')
    items = [s for s in converted if '"TemplateItems"' in s]
    for stmt in items:
        f.write(stmt + '\n')
    print(f"   - TemplateItems: {len(items)}개")
    
    # Users
    f.write('\n-- Users data\n')
    users = [s for s in converted if '"Users"' in s]
    for stmt in users:
        f.write(stmt + '\n')
    print(f"   - Users: {len(users)}개")
    
    # DailyReports
    f.write('\n-- DailyReports data\n')
    reports = [s for s in converted if '"DailyReports"' in s]
    for stmt in reports:
        f.write(stmt + '\n')
    print(f"   - DailyReports: {len(reports)}개")
    
    # ReportDetails
    f.write('\n-- ReportDetails data\n')
    details = [s for s in converted if '"ReportDetails"' in s]
    for stmt in details:
        f.write(stmt + '\n')
    print(f"   - ReportDetails: {len(details)}개")
    
    # ReportSignatures
    f.write('\n-- ReportSignatures data\n')
    sigs = [s for s in converted if '"ReportSignatures"' in s]
    for stmt in sigs:
        f.write(stmt + '\n')
    print(f"   - ReportSignatures: {len(sigs)}개")
    
    # 시퀀스 리셋
    f.write('\n-- Reset sequences\n')
    f.write('SELECT setval(pg_get_serial_sequence(\'"Teams"\', \'TeamID\'), COALESCE((SELECT MAX("TeamID") FROM "Teams"), 1));\n')
    f.write('SELECT setval(pg_get_serial_sequence(\'"Users"\', \'UserID\'), COALESCE((SELECT MAX("UserID") FROM "Users"), 1));\n')
    f.write('SELECT setval(pg_get_serial_sequence(\'"ChecklistTemplates"\', \'TemplateID\'), COALESCE((SELECT MAX("TemplateID") FROM "ChecklistTemplates"), 1));\n')
    f.write('SELECT setval(pg_get_serial_sequence(\'"TemplateItems"\', \'ItemID\'), COALESCE((SELECT MAX("ItemID") FROM "TemplateItems"), 1));\n')
    f.write('SELECT setval(pg_get_serial_sequence(\'"DailyReports"\', \'ReportID\'), COALESCE((SELECT MAX("ReportID") FROM "DailyReports"), 1));\n')
    f.write('SELECT setval(pg_get_serial_sequence(\'"ReportDetails"\', \'DetailID\'), COALESCE((SELECT MAX("DetailID") FROM "ReportDetails"), 1));\n')
    f.write('SELECT setval(pg_get_serial_sequence(\'"ReportSignatures"\', \'SignatureID\'), COALESCE((SELECT MAX("SignatureID") FROM "ReportSignatures"), 1));\n')

print(f"\n✅ 변환 완료: FoodieMatch/complete_tbm_data.sql")
