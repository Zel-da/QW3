#!/usr/bin/env python3
import codecs
import re

def convert_sql_encoding(input_file, output_file):
    """SQL Server UTF-16 파일을 PostgreSQL UTF-8로 변환"""
    
    # 1. 인코딩 변환 (UTF-16 → UTF-8)
    with open(input_file, 'rb') as f:
        raw_content = f.read()
    
    # UTF-16 LE BOM 확인
    if raw_content[:2] == b'\xff\xfe':
        content = raw_content.decode('utf-16-le')
    else:
        # 다른 인코딩 시도
        try:
            content = raw_content.decode('utf-8')
        except:
            content = raw_content.decode('latin-1')
    
    # 2. SQL Server → PostgreSQL 문법 변환
    lines = content.split('\n')
    converted_lines = []
    skip_until_go = False
    
    for line in lines:
        # SQL Server 전용 명령어 제거
        if any(x in line for x in ['USE [master]', 'USE [TbmDb]', 'ALTER DATABASE', 'CREATE DATABASE', 
                                     'SET ANSI', 'SET QUOTED_IDENTIFIER', 'SET IDENTITY_INSERT',
                                     'CONSTRAINT [PK_', 'WITH (PAD_INDEX', 'NONCLUSTERED INDEX',
                                     'CREATE USER', 'ALTER ROLE', 'EXEC sys.sp_', 'ALTER TABLE']):
            continue
            
        # GO 명령어 제거
        if line.strip() == 'GO':
            continue
        
        # CREATE TABLE 구문 건너뛰기 (이미 Prisma로 생성됨)
        if 'CREATE TABLE' in line:
            skip_until_go = True
            continue
        
        if skip_until_go:
            if 'GO' in line or line.strip() == '':
                skip_until_go = False
            continue
        
        # INSERT 문 변환
        if 'INSERT [dbo].' in line:
            # [dbo].[TableName] → TableName (소문자로)
            line = re.sub(r'INSERT \[dbo\]\.\[(\w+)\]', lambda m: f'INSERT INTO {m.group(1).lower()}', line)
            # [ColumnName] → column_name (소문자 스네이크케이스)
            def to_snake_case(match):
                name = match.group(1)
                # 카멜케이스를 스네이크케이스로 변환
                s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
                return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()
            
            line = re.sub(r'\[(\w+)\]', to_snake_case, line)
            # CAST(N'...' AS DateTime2) → '...'::timestamp
            line = re.sub(r"CAST\(N'([^']+)' AS DateTime2\)", r"'\1'::timestamp", line)
            # N'string' → 'string'
            line = re.sub(r"N'", r"'", line)
            converted_lines.append(line + ';')
        elif line.strip().startswith('VALUES'):
            # VALUES 구문도 변환
            line = re.sub(r"CAST\(N'([^']+)' AS DateTime2\)", r"'\1'::timestamp", line)
            line = re.sub(r"N'", r"'", line)
            # 마지막 VALUES 줄에 세미콜론 추가
            if converted_lines and 'INSERT' in converted_lines[-1]:
                converted_lines[-1] = converted_lines[-1].rstrip(';')
                converted_lines.append(line + ';')
            else:
                converted_lines.append(line)
    
    # 3. UTF-8로 저장
    with codecs.open(output_file, 'w', 'utf-8') as f:
        f.write('\n'.join(converted_lines))
    
    print(f"✅ 변환 완료: {output_file}")
    print(f"📝 총 {len(converted_lines)} 라인 처리됨")

if __name__ == '__main__':
    convert_sql_encoding('attached_assets/script1_1760403229620.sql', 'FoodieMatch/initial_data.sql')
