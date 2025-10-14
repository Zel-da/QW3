# 안전교육 통합 플랫폼 아키텍처

## 📋 개요
안전교육 플랫폼(FoodieMatch)과 TBM 체크리스트 시스템을 통합한 종합 안전관리 시스템입니다.

## 🏗️ 아키텍처 구조

```
┌─────────────────────────────────────────────────┐
│              사용자 브라우저                      │
└─────────────┬───────────────────────────────────┘
              │
              ├──────────────┬──────────────────┐
              │              │                  │
    ┌─────────▼───────┐  ┌──▼──────────┐  ┌───▼──────┐
    │  FoodieMatch    │  │    통합      │  │   TBM    │
    │   (안전교육)     │◄─┤  네비게이션  ├─►│ Frontend │
    │  Port: 5173     │  └──────────────┘  │Port: 3001│
    └─────────┬───────┘                    └────┬─────┘
              │                                  │
    ┌─────────▼───────┐                    ┌────▼─────┐
    │  Express.js    │                    │ ASP.NET  │
    │   Backend      │                    │ Core API │
    │  Port: 3000    │                    │Port: 8080│
    └─────────┬───────┘                    └────┬─────┘
              │                                  │
    ┌─────────▼───────┐                    ┌────▼─────┐
    │  PostgreSQL    │                    │SQL Server│
    │   (Neon)       │                    │          │
    └─────────────────┘                    └──────────┘
```

## 🔧 통합 방식

### 1. **독립 배포 + 네비게이션 연결** (현재 구현)
- 각 애플리케이션을 독립적으로 배포
- FoodieMatch에서 버튼을 통해 TBM 시스템 접근
- 장점: 빠른 구현, 독립적 유지보수
- 단점: 별도 인증 필요

### 2. **마이크로프론트엔드** (향후 고려)
- Module Federation을 사용한 통합
- 단일 진입점에서 모든 기능 제공
- 장점: 완전한 통합, 단일 인증
- 단점: 복잡한 설정

### 3. **API 통합** (선택적)
- 백엔드 API를 통합 게이트웨이로 연결
- 단일 인증 시스템 구현
- 장점: 데이터 통합 관리
- 단점: 추가 개발 필요

## 📁 디렉토리 구조

```
GitHub/
├── FoodieMatch/              # 안전교육 플랫폼
│   ├── client/               # React Frontend
│   ├── server/               # Express Backend
│   └── shared/               # 공유 타입
│
├── TBM/                      # TBM 체크리스트
│   ├── tbm.frontend/         # React Frontend
│   ├── Tbm.Api/             # ASP.NET Core API
│   └── TbmDb.bak            # DB 백업
│
└── 통합 스크립트/
    ├── build-all.bat         # 전체 빌드
    ├── start-all-dev.bat     # 개발 서버 시작
    └── deploy-all.bat        # 배포 스크립트
```

## 🚀 실행 방법

### 개발 환경
```bash
# 모든 서비스 동시 시작
./start-all-dev.bat

# 개별 서비스 시작
# FoodieMatch
cd FoodieMatch && npm run dev

# TBM Frontend
cd TBM/tbm.frontend && npm start

# TBM API
cd TBM/Tbm.Api && dotnet run
```

### 프로덕션 빌드
```bash
# 전체 빌드
./build-all.bat

# 개별 빌드
# FoodieMatch
cd FoodieMatch && npm run build

# TBM
cd TBM && build.bat
```

## 🔗 URL 구성

### 개발 환경
- FoodieMatch (안전교육): http://localhost:5173
- TBM Frontend: http://localhost:3001
- TBM API: http://localhost:8080/swagger

### 프로덕션 환경
- FoodieMatch: http://192.68.10.249:3000
- TBM Frontend: http://192.68.10.249:8081
- TBM API: http://192.68.10.249:8080

## 🔐 인증 통합 (향후 구현)

### 현재 상태
- 각 시스템 독립 인증
- localStorage 기반 사용자 식별

### 개선 방안
1. **SSO (Single Sign-On) 구현**
   - JWT 토큰 기반 인증
   - 공유 인증 서버 구축
   
2. **세션 공유**
   - Redis를 사용한 세션 공유
   - 도메인 간 쿠키 공유

## 📊 데이터 통합 (선택적)

### 가능한 통합 포인트
1. **사용자 정보 공유**
   - 단일 사용자 테이블
   - API를 통한 사용자 정보 동기화

2. **보고서 통합**
   - 안전교육 이수 + TBM 기록 통합 대시보드
   - 종합 안전관리 리포트

3. **알림 시스템**
   - 통합 알림 센터
   - 교육 미이수, TBM 미작성 알림

## 🛠️ 유지보수

### 독립적 업데이트
각 시스템을 독립적으로 업데이트 가능:
- FoodieMatch: Node.js/React 업데이트
- TBM: .NET/React 업데이트

### 통합 테스트
```bash
# 통합 테스트 실행
npm run test:integration
```

## 📝 환경 변수 설정

### FoodieMatch (.env)
```env
VITE_TBM_URL=http://localhost:3001
DATABASE_URL=postgresql://...
```

### TBM (appsettings.json)
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=..."
  },
  "FoodieMatchUrl": "http://localhost:5173"
}
```

## 🚨 주의사항

1. **CORS 설정**
   - 각 시스템에서 상호 접근 허용 필요
   - 프로덕션에서는 특정 도메인만 허용

2. **포트 충돌**
   - 각 서비스별 고유 포트 사용
   - 방화벽 설정 확인

3. **데이터베이스**
   - PostgreSQL과 SQL Server 동시 운영
   - 백업 전략 수립 필요

## 📈 향후 개선 사항

1. **Phase 1 (현재)**
   - ✅ 독립 배포 + 네비게이션 연결
   - ✅ 기본 통합 완료

2. **Phase 2**
   - [ ] SSO 구현
   - [ ] 통합 대시보드
   - [ ] 공통 UI 컴포넌트 라이브러리

3. **Phase 3**
   - [ ] 마이크로프론트엔드 전환
   - [ ] API Gateway 구현
   - [ ] 통합 모니터링 시스템

## 📞 문의
- 개발팀: dev@company.com
- 운영팀: ops@company.com
