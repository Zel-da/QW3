# 이메일 기능 개발 완료 📧

## 완료된 작업 ✅

### 1. 이메일 서비스 구현
- ✅ Nodemailer 기반 SMTP 연동
- ✅ 연결 테스트 기능
- ✅ 에러 핸들링
- ✅ 타임아웃 설정
- ✅ TLS/SSL 지원

### 2. 이메일 템플릿
다음 3가지 템플릿이 구현되어 있습니다:

#### 📚 안전교육 알림
- 대상: 교육 미이수자
- 발송 시점: 주 1회
- 내용: 교육명, 마감일, 바로가기 링크

#### 📋 TBM 작성 알림
- 대상: 팀장/관리자
- 발송 시점: 매일 오전
- 내용: 팀명, 날짜, TBM 작성 링크

#### 🔧 안전점검 알림
- 대상: 팀장/관리자
- 발송 시점: 매월 4일
- 내용: 점검 기간, 마감일, 점검 링크

### 3. 관련 파일
```
FoodieMatch/
├── server/emailService.ts           # 이메일 서비스 핵심 로직
├── test-email.ts                    # 테스트 스크립트
├── IT팀_SMTP_문의.md                 # IT팀 문의 템플릿
├── 나온소프트_그룹웨어_연동_가이드.md    # 연동 가이드
└── .env.example                     # 환경변수 예시
```

## 현재 상태 ⚠️

### SMTP 연동 대기 중
현재 IT팀의 SMTP 설정이 필요합니다:
- SMTP 포트 차단 상태
- 나온 소프트 그룹웨어 정보 필요

## 다음 단계 (IT팀 협의 후)

### Step 1: IT팀 문의
📄 **`IT팀_SMTP_문의.md`** 파일을 IT팀에 전달하세요.

필요한 정보:
- SMTP 서버 주소
- SMTP 포트 (587 또는 465)
- 발신 계정 ID/PW
- 방화벽 설정

### Step 2: 환경변수 설정
IT팀에서 정보를 받은 후 `.env` 파일 생성:

```bash
# .env 파일 생성
SMTP_HOST="smtp.naonsoft.com"
SMTP_PORT="587"
SMTP_USER="safety-system@company.com"
SMTP_PASSWORD="your-password"
SMTP_FROM="안전보건팀 <safety-system@company.com>"
BASE_URL="http://your-server:5173"
```

### Step 3: 연결 테스트
```bash
# 테스트 스크립트 실행
npx tsx test-email.ts your-email@company.com
```

**예상 결과:**
```
✅ SMTP 연결 성공!
✅ 안전교육 알림 메일 발송 성공
✅ TBM 작성 알림 메일 발송 성공
✅ 안전점검 알림 메일 발송 성공
```

### Step 4: 자동 발송 기능 추가 (선택)
현재는 수동 발송만 구현되어 있습니다. 자동 발송을 원하면 다음 기능을 추가할 수 있습니다:

#### 옵션 1: 스케줄러 (node-cron)
```javascript
import cron from 'node-cron';

// 매일 오전 8시 TBM 알림
cron.schedule('0 8 * * *', async () => {
  // 팀장들에게 TBM 작성 알림 발송
});

// 매주 월요일 오전 9시 교육 알림
cron.schedule('0 9 * * 1', async () => {
  // 미이수자에게 교육 알림 발송
});

// 매월 4일 오전 9시 안전점검 알림
cron.schedule('0 9 4 * *', async () => {
  // 관리자에게 안전점검 알림 발송
});
```

#### 옵션 2: 외부 스케줄러
- Windows: 작업 스케줄러
- Linux: cron
- Cloud: AWS Lambda, Azure Functions

## 사용 예시

### 코드에서 직접 사용
```typescript
import { sendEmail, getEducationReminderTemplate } from './server/emailService';

// 안전교육 알림 발송
await sendEmail({
  to: 'worker@company.com',
  subject: '안전교육 이수 알림',
  html: getEducationReminderTemplate('홍길동', '산업안전보건교육', '2025-11-10')
});
```

### API 엔드포인트 추가 (선택)
```typescript
// server/routes.ts에 추가
app.post('/api/send-reminder', requireAuth, async (req, res) => {
  const { type, userId } = req.body;

  // 사용자 정보 조회
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (type === 'education') {
    await sendEmail({
      to: user.email,
      subject: '안전교육 알림',
      html: getEducationReminderTemplate(user.name, '교육명', '마감일')
    });
  }

  res.json({ success: true });
});
```

## 트러블슈팅 🔧

### 문제 1: SMTP 연결 실패
```
❌ Email service error: ETIMEDOUT
```

**해결:**
- IT팀에 SMTP 포트 오픈 요청 (587 또는 465)
- 방화벽 설정 확인

### 문제 2: 인증 실패
```
❌ Email service error: Invalid login
```

**해결:**
- SMTP_USER, SMTP_PASSWORD 확인
- 나온 소프트에서 SMTP 인증 허용 확인

### 문제 3: 메일이 스팸함으로 이동
**해결:**
- IT팀에 SPF, DKIM 레코드 설정 요청
- 발신자 주소를 회사 도메인으로 변경

## 보안 체크리스트 🔒

운영 전 다음 사항을 확인하세요:

- [ ] `.env` 파일이 `.gitignore`에 포함됨
- [ ] SMTP 비밀번호가 강력함 (8자 이상, 특수문자 포함)
- [ ] 발신 전용 계정 사용 (개인 계정 X)
- [ ] 수신 거부 기능 구현 (선택)
- [ ] 개인정보 최소화 (이름, 이메일만 사용)
- [ ] HTTPS 사용 (메일 링크)

## 모니터링 📊

### 로그 확인
서버 콘솔에서 메일 발송 로그 확인:

```
✅ Email sent: <1234567890@smtp.naonsoft.com>
```

### 실패 시 로그
```
❌ Email send error: [에러 내용]
```

## 예상 비용 💰

나온 소프트 그룹웨어 사용 시 추가 비용은 없습니다.
- 내부 그룹웨어 SMTP 무료 사용
- 예상 발송량: 100건/일

외부 서비스 사용 시:
- Gmail SMTP: 무료 (일 500건 제한)
- AWS SES: $0.10/1,000건
- SendGrid: $14.95/월 (15,000건)

## 참고 문서 📚

1. **IT팀_SMTP_문의.md** - IT팀 문의 시 사용
2. **나온소프트_그룹웨어_연동_가이드.md** - 연동 상세 가이드
3. **test-email.ts** - 테스트 스크립트
4. **server/emailService.ts** - 소스 코드

## FAQ ❓

### Q1: 언제부터 메일이 발송되나요?
A: IT팀의 SMTP 설정 완료 후 즉시 사용 가능합니다.

### Q2: 자동 발송은 어떻게 하나요?
A: node-cron 또는 외부 스케줄러를 사용해 구현 가능합니다.

### Q3: 메일 템플릿을 수정할 수 있나요?
A: 네, `server/emailService.ts`의 템플릿 함수를 수정하면 됩니다.

### Q4: 첨부파일을 보낼 수 있나요?
A: 네, nodemailer의 `attachments` 옵션을 사용하면 됩니다.

```typescript
await sendEmail({
  to: 'user@company.com',
  subject: '제목',
  html: '내용',
  attachments: [{
    filename: 'report.pdf',
    path: '/path/to/report.pdf'
  }]
});
```

## 문의

- 개발: [담당자명]
- 기술 지원: [연락처]
- IT팀 SMTP 문의: [IT팀 연락처]

---

**작성일:** 2025년 11월 6일
**상태:** ⚠️ SMTP 연동 대기 중
**다음 단계:** IT팀 SMTP 정보 받기
