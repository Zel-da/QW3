#!/usr/bin/env python3
import re

# SQL 파일 읽기
with open('FoodieMatch/tbm_data.sql', 'r', encoding='utf-8') as f:
    content = f.read()

# 손상된 INSERT 문 찾기 및 수정
# 패턴: VALUES (..., '...';  <- 세미콜론으로 끝나는 문자열
# 이 경우 텍스트가 잘린 것이므로 빈 문자열로 대체하거나 제거

lines = content.splitlines()
fixed_lines = []
skip_next = False

for i, line in enumerate(lines):
    # 손상된 INSERT 문 감지 (문자열이 세미콜론으로 끝남)
    if re.search(r"'[^']*;\s*$", line) and 'INSERT INTO' in line:
        # Description이 세미콜론으로 끝나는 경우
        # 패턴: ..., '텍스트;   <-- 이런 형식
        # 수정: ..., '텍스트', DisplayOrder값);
        
        # 원본 SQL 스크립트에서 다시 가져오기
        # 일단 이 줄을 건너뛰고 주석 처리
        fixed_lines.append(f"-- SKIPPED (corrupted): {line}")
        continue
    
    fixed_lines.append(line)

# 수정된 내용 저장
with open('FoodieMatch/tbm_data_fixed.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(fixed_lines))

print(f"✅ 손상된 레코드 수정 완료: FoodieMatch/tbm_data_fixed.sql")

# 손상된 라인 수 계산
corrupted_count = sum(1 for line in fixed_lines if line.startswith('-- SKIPPED'))
print(f"⚠️  손상된 레코드: {corrupted_count}개 건너뛰기")
