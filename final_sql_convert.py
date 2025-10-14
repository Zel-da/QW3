#!/usr/bin/env python3
import re

# UTF-16 파일 읽기
with open('attached_assets/script1_1760403229620.sql', 'rb') as f:
    raw_content = f.read()

if raw_content[:2] == b'\xff\xfe':
    content = raw_content.decode('utf-16-le')
else:
    content = raw_content.decode('utf-8')

# GO 명령어를 마커로 사용하여 문장 분리
statements = re.split(r'\s+GO\s+', content)

# 관심 있는 테이블들
target_tables = ['Teams', 'Users', 'ChecklistTemplates', 'TemplateItems', 
                 'DailyReports', 'ReportDetails', 'ReportSignatures']

converted = []

for stmt in statements:
    # SET IDENTITY_INSERT나 기타 SQL Server 명령 건너뛰기
    if any(x in stmt for x in ['SET IDENTITY_INSERT', 'ALTER DATABASE', 'CREATE DATABASE', 
                                 'CREATE TABLE', 'ALTER TABLE', 'CREATE USER', 'ALTER ROLE',
                                 '__EFMigrationsHistory']):
        continue
    
    # INSERT 문만 처리
    if 'INSERT [dbo].' in stmt:
        # 테이블 이름 확인
        table_match = re.search(r'INSERT \[dbo\]\.\[(\w+)\]', stmt)
        if table_match and table_match.group(1) in target_tables:
            # 줄바꿈과 여러 공백을 하나의 공백으로
            stmt = re.sub(r'\s+', ' ', stmt.strip())
            
            # SQL Server → PostgreSQL 변환
            stmt = re.sub(r'INSERT \[dbo\]\.\[(\w+)\]', r'INSERT INTO "\1"', stmt)
            stmt = re.sub(r'\[(\w+)\]', r'"\1"', stmt)
            stmt = re.sub(r"CAST\(N'([^']+)' AS DateTime2\)", r"'\1'::timestamp", stmt)
            stmt = re.sub(r"N'", r"'", stmt)
            
            # 세미콜론 추가
            if not stmt.endswith(';'):
                stmt += ';'
            
            converted.append(stmt)

# 테이블별로 정렬하여 저장
with open('FoodieMatch/final_tbm_data.sql', 'w', encoding='utf-8') as f:
    # Teams
    f.write('-- Teams data\n')
    for stmt in converted:
        if '"Teams"' in stmt:
            f.write(stmt + '\n')
    
    # ChecklistTemplates
    f.write('\n-- ChecklistTemplates data\n')
    for stmt in converted:
        if '"ChecklistTemplates"' in stmt:
            f.write(stmt + '\n')
    
    # TemplateItems
    f.write('\n-- TemplateItems data\n')
    for stmt in converted:
        if '"TemplateItems"' in stmt:
            f.write(stmt + '\n')
    
    # Users
    f.write('\n-- Users data\n')
    for stmt in converted:
        if '"Users"' in stmt:
            f.write(stmt + '\n')
    
    # DailyReports
    f.write('\n-- DailyReports data\n')
    for stmt in converted:
        if '"DailyReports"' in stmt:
            f.write(stmt + '\n')
    
    # ReportDetails
    f.write('\n-- ReportDetails data\n')
    for stmt in converted:
        if '"ReportDetails"' in stmt:
            f.write(stmt + '\n')
    
    # ReportSignatures
    f.write('\n-- ReportSignatures data\n')
    for stmt in converted:
        if '"ReportSignatures"' in stmt:
            f.write(stmt + '\n')
    
    # 시퀀스 리셋
    f.write('\n-- Reset sequences\n')
    for table in ['Teams', 'Users', 'ChecklistTemplates', 'TemplateItems', 
                  'DailyReports', 'ReportDetails', 'ReportSignatures']:
        id_col = 'TeamID' if table == 'Teams' else \
                 'UserID' if table == 'Users' else \
                 'TemplateID' if table == 'ChecklistTemplates' else \
                 'ItemID' if table == 'TemplateItems' else \
                 'ReportID' if table == 'DailyReports' else \
                 'DetailID' if table == 'ReportDetails' else 'SignatureID'
        f.write(f"SELECT setval(pg_get_serial_sequence('\"{table}\"', '{id_col}'), COALESCE((SELECT MAX(\"{id_col}\") FROM \"{table}\"), 1));\n")

print(f"✅ 변환 완료: FoodieMatch/final_tbm_data.sql")
print(f"📝 총 {len(converted)} 개의 INSERT 문 생성")

# 테이블별 개수
for table in target_tables:
    count = sum(1 for stmt in converted if f'"{table}"' in stmt)
    if count > 0:
        print(f"   - {table}: {count}개")
