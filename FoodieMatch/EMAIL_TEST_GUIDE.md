# 이메일 기능 테스트 가이드

## 준비 단계

### 1. 환경 변수 설정

`.env` 파일을 열고 다음 값을 **실제 값으로** 변경하세요:

```bash
# SMTP 설정 (필수)
SMTP_HOST=192.168.1.100           # 실제 SMTP 서버 IP 또는 도메인
SMTP_PORT=25
SMTP_FROM=safety@yourcompany.com  # 실제 발신자 이메일

# 베이스 URL
BASE_URL=http://localhost:5173    # 개발: localhost, 운영: 실제 도메인

# 스케줄러 활성화 (테스트용)
ENABLE_EMAIL_SCHEDULERS=true      # 스케줄러 테스트 시 true
```

### 2. SMTP 서버 확인

SMTP 서버가 실행 중인지 확인하세요:

```bash
# Windows에서 SMTP 포트 테스트
telnet 192.168.1.100 25

# 또는 PowerShell
Test-NetConnection -ComputerName 192.168.1.100 -Port 25
```

---

## 테스트 방법

### 방법 1: 자동 테스트 스크립트 (권장)

가장 쉽고 빠른 방법입니다.

```bash
cd FoodieMatch

# 테스트 실행 (기본 이메일로 전송)
TEST_EMAIL=yourname@company.com npx tsx test-email.ts
```

**예상 출력:**
```
======================================================================
📧 이메일 기능 테스트
======================================================================

1️⃣ SMTP 연결 테스트...
✅ SMTP 연결 성공!

2️⃣ 교육 미이수자 알림 테스트...
✅ 교육 미이수자 알림 전송 성공!

3️⃣ TBM 작성 독려 알림 테스트...
✅ TBM 작성 독려 알림 전송 성공!

4️⃣ 교육 완료 알림 테스트...
✅ 교육 완료 알림 전송 성공!

5️⃣ 공지사항 알림 테스트...
✅ 공지사항 알림 전송 성공!

======================================================================
✅ 모든 테스트 완료!
======================================================================

📬 yourname@company.com 메일함을 확인하세요.
총 4개의 테스트 이메일이 전송되었습니다.
```

### 방법 2: 서버 시작 후 로그 확인

```bash
cd FoodieMatch
npm run dev
```

**서버 시작 시 확인할 로그:**

✅ **성공 시:**
```
✅ Email service is ready
⏰ 교육 미이수자 알림 스케줄러 시작 (매일 오전 7시)
⏰ TBM 작성 독려 알림 스케줄러 시작 (평일 오전 6시)
⏰ 안전점검 알림 스케줄러 시작 (매월 4일 오전 9시)
serving on port 5000
```

❌ **실패 시:**
```
❌ Email service error: connect ECONNREFUSED
```

### 방법 3: 실제 기능 테스트

#### 3-1. 공지사항 이메일 테스트

1. 브라우저에서 `http://localhost:5173` 접속
2. 관리자 계정으로 로그인
3. 공지사항 작성 페이지로 이동
4. 새 공지사항 등록

**확인할 로그:**
```
📧 공지사항 이메일 전송: 15명
```

#### 3-2. 교육 완료 이메일 테스트

1. 일반 사용자 계정으로 로그인
2. 교육 과정 선택
3. 영상 시청 완료
4. 평가 통과

**확인할 로그:**
```
📧 교육 완료 이메일 전송: user@company.com
```

---

## 트러블슈팅

### 문제 1: SMTP 연결 실패

**에러 메시지:**
```
❌ Email service error: connect ECONNREFUSED
```

**해결 방법:**
1. SMTP 서버가 실행 중인지 확인
2. SMTP_HOST가 올바른지 확인
3. 방화벽에서 포트 25 허용 확인
4. telnet으로 연결 테스트

### 문제 2: 인증 오류

**에러 메시지:**
```
❌ Email service error: Invalid login
```

**해결 방법:**
- 내부 SMTP 서버는 보통 인증 불필요
- `.env`에서 SMTP_USER, SMTP_PASSWORD 제거
- 또는 올바른 인증 정보 입력

### 문제 3: 이메일이 도착하지 않음

**체크리스트:**
- [ ] 스팸함 확인
- [ ] SMTP_FROM 주소가 유효한지 확인
- [ ] 수신자 이메일 주소가 올바른지 확인
- [ ] SMTP 서버 로그 확인
- [ ] 서버 콘솔에 "전송 성공" 로그가 있는지 확인

### 문제 4: 스케줄러가 실행되지 않음

**로그:**
```
⏸️  Email schedulers disabled
```

**해결 방법:**
```bash
# .env 파일 수정
ENABLE_EMAIL_SCHEDULERS=true

# 또는 NODE_ENV 설정
NODE_ENV=production npm run dev
```

---

## 스케줄러 시간 변경

개발/테스트를 위해 스케줄러 시간을 변경하려면:

**파일:** `server/scheduler.ts`

```typescript
// 기존: 매일 오전 7시
cron.schedule('0 7 * * *', async () => {

// 변경: 매 10분마다 (테스트용)
cron.schedule('*/10 * * * *', async () => {
```

**Cron 표현식 예시:**
- `*/5 * * * *` - 5분마다
- `0 * * * *` - 매시 정각
- `0 9 * * 1-5` - 평일 오전 9시
- `0 0 1 * *` - 매월 1일 자정

---

## 이메일 템플릿 확인

전송된 이메일이 어떻게 보이는지 확인:

1. 테스트 스크립트 실행
2. 메일함 확인
3. 각 이메일이 HTML로 잘 렌더링되는지 확인

**체크포인트:**
- 제목이 명확한가?
- 본문 내용이 잘 보이는가?
- 버튼/링크가 작동하는가?
- 한글이 깨지지 않는가?

---

## 실제 운영 환경 설정

### .env 파일 (프로덕션)

```bash
SMTP_HOST=mail.company.local
SMTP_PORT=25
SMTP_FROM=safety-noreply@company.com
BASE_URL=https://safety.company.com
NODE_ENV=production
```

### 스케줄러는 자동 활성화

프로덕션 환경에서는 `ENABLE_EMAIL_SCHEDULERS` 설정 없이도 자동으로 활성화됩니다.

---

## 요약

```bash
# 1. 환경 변수 설정
vi .env

# 2. 테스트 실행
TEST_EMAIL=yourname@company.com npx tsx test-email.ts

# 3. 메일함 확인
# 4개의 테스트 이메일이 도착했는지 확인

# 4. 서버 시작
npm run dev

# 5. 로그 확인
# "✅ Email service is ready" 확인
```

성공! 🎉
