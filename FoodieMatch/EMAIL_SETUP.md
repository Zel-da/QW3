# 이메일 기능 설정 가이드

## 환경 변수 설정

FoodieMatch 프로젝트의 `.env` 파일에 다음 환경 변수를 추가하세요:

```bash
# SMTP 이메일 설정
SMTP_HOST=your-smtp-server.com    # SMTP 서버 주소 (예: mail.company.com)
SMTP_PORT=25                        # SMTP 포트 (25번 포트 사용)
SMTP_USER=                          # SMTP 사용자명 (인증 필요시만)
SMTP_PASSWORD=                      # SMTP 비밀번호 (인증 필요시만)
SMTP_FROM=noreply@company.com      # 발신자 이메일 주소

# 이메일 스케줄러 활성화 (선택사항)
ENABLE_EMAIL_SCHEDULERS=false      # 개발 환경에서 스케줄러 활성화 (기본: false)

# 베이스 URL (이메일 링크에 사용)
BASE_URL=http://your-domain.com    # 실제 서비스 URL
```

## SMTP 서버 설정

### 1. 내부 SMTP 서버 (인증 불필요)
```bash
SMTP_HOST=mail.company.local
SMTP_PORT=25
SMTP_FROM=safety@company.com
BASE_URL=http://safety-system.company.com
```

### 2. 인증이 필요한 SMTP 서버
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@gmail.com
BASE_URL=http://safety-system.company.com
```

## 구현된 이메일 기능

### 1. 자동 스케줄러
- **교육 미이수자 알림**: 매일 오전 7시
  - 완료하지 않은 교육 과정에 대해 알림 전송

- **TBM 작성 독려**: 평일 오전 6시
  - 당일 TBM을 작성하지 않은 팀에 알림 전송

- **안전점검 알림**: 매월 4일 오전 9시
  - 팀 리더 및 안전팀에게 월별 안전점검 알림

### 2. 이벤트 기반 이메일
- **교육 완료 알림**: 사용자가 교육을 완료하면 자동 전송
- **이수증 발급 알림**: 이수증 발급 시 자동 전송 (현재 구현 필요)
- **공지사항 알림**: 새 공지사항 등록 시 전체 사용자에게 전송

## 테스트

### 1. 이메일 연결 테스트
서버 시작 시 자동으로 SMTP 연결을 테스트합니다:
```
✅ Email service is ready
```

### 2. 개발 환경에서 스케줄러 테스트
`.env` 파일에 추가:
```bash
ENABLE_EMAIL_SCHEDULERS=true
```

서버 재시작 후 로그 확인:
```
⏰ 교육 미이수자 알림 스케줄러 시작 (매일 오전 7시)
⏰ TBM 작성 독려 알림 스케줄러 시작 (평일 오전 6시)
⏰ 안전점검 알림 스케줄러 시작 (매월 4일 오전 9시)
```

### 3. 수동 이메일 전송 테스트
공지사항을 등록하면 즉시 이메일이 전송됩니다:
```
📧 공지사항 이메일 전송: 15명
```

## 이메일 템플릿

모든 이메일은 HTML 템플릿을 사용하여 깔끔하게 디자인되어 있습니다:

- 🔔 **교육 이수 알림** (파란색)
- ⚠️ **TBM 작성 알림** (빨간색)
- 📋 **안전점검 알림** (주황색)
- ✅ **교육 완료 알림** (녹색)
- 🎓 **이수증 발급** (보라색)
- 📢 **공지사항** (파란색)
- 📊 **안전점검 결과** (녹색)

## 문제 해결

### 1. 이메일이 전송되지 않음
```bash
# 로그 확인
❌ Email service error: ...

# 해결 방법
- SMTP 서버 주소와 포트 확인
- 방화벽에서 SMTP 포트(25) 허용 확인
- 인증 정보 확인 (필요한 경우)
```

### 2. 스케줄러가 실행되지 않음
```bash
# 로그 확인
⏸️  Email schedulers disabled

# 해결 방법
- NODE_ENV=production으로 설정하거나
- ENABLE_EMAIL_SCHEDULERS=true 설정
```

### 3. 이메일이 스팸으로 분류됨
- SMTP_FROM 주소를 실제 도메인 주소로 설정
- SPF 및 DKIM 레코드 설정 (IT 팀 협조 필요)

## 추가 개발 필요 항목

현재 구현되지 않은 기능 (필요시 추가 개발):
- [ ] 이수증 자동 발급 및 이메일 전송
- [ ] 안전점검 결과 이메일 전송
- [ ] 이메일 전송 이력 저장
- [ ] 사용자별 이메일 수신 설정
- [ ] 이메일 템플릿 관리자 페이지

## 참고사항

- 이메일 전송은 비동기로 처리되어 API 응답 속도에 영향을 주지 않습니다
- 대량 이메일 전송 시 SMTP 서버 제한을 고려해야 합니다
- 프로덕션 환경에서는 스케줄러가 자동으로 활성화됩니다
