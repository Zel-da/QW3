# 🛡️ 안전관리 통합 플랫폼

## 개요
안전교육 시스템과 TBM(Tool Box Meeting) 체크리스트를 통합한 종합 안전관리 플랫폼입니다.

## 🚀 빠른 시작

### 1. 전체 개발 환경 실행
```bash
# 모든 서비스를 한 번에 시작
./start-all-dev.bat
```

### 2. 접속 URL
- **안전교육 플랫폼**: http://localhost:5173
- **TBM 체크리스트**: http://localhost:3001
- **TBM API 문서**: http://localhost:8080/swagger

## 📦 프로젝트 구성

| 시스템 | 용도 | 기술 스택 | 포트 |
|--------|------|-----------|------|
| **FoodieMatch** | 안전교육 플랫폼 | React + TypeScript + Express.js + PostgreSQL | 5173 (dev), 3000 (api) |
| **TBM** | 작업 전 안전점검 | React + ASP.NET Core 9 + SQL Server | 3001 (frontend), 8080 (api) |

## 🔧 설치 방법

### 필수 요구사항
- Node.js 18+ 
- .NET SDK 9.0+
- SQL Server 2019+
- PostgreSQL 14+

### 1. FoodieMatch 설치
```bash
cd FoodieMatch
npm install
cp .env.example .env
# .env 파일 편집하여 설정
npm run dev
```

### 2. TBM 설치
```bash
# Frontend
cd TBM/tbm.frontend
npm install

# Backend
cd TBM/Tbm.Api
dotnet restore
# appsettings.json 편집하여 DB 연결 설정
dotnet run
```

## 🏗️ 빌드 및 배포

### 전체 빌드
```bash
./build-all.bat
```

### 개별 빌드
```bash
# FoodieMatch
cd FoodieMatch && npm run build

# TBM
cd TBM && build.bat
```

## 🔗 통합 기능

### 1. 네비게이션 통합
- FoodieMatch 대시보드에서 TBM 버튼 클릭으로 이동
- 상단 헤더에 TBM 체크리스트 바로가기

### 2. 사용자 흐름
```
안전교육 플랫폼 → 교육 이수 → TBM 체크리스트 작성 → 작업 시작
```

## 📁 디렉토리 구조
```
/
├── FoodieMatch/           # 안전교육 플랫폼
│   ├── client/           # React 프론트엔드
│   ├── server/           # Express 백엔드
│   └── shared/           # 공유 타입
├── TBM/                  # TBM 체크리스트
│   ├── tbm.frontend/     # React 프론트엔드
│   └── Tbm.Api/          # .NET Core API
└── 통합 스크립트/
    ├── start-all-dev.bat # 개발 서버 시작
    ├── build-all.bat     # 전체 빌드
    └── nginx.conf        # 프록시 설정
```

## 🔐 환경 변수 설정

### FoodieMatch (.env)
```env
VITE_TBM_URL=http://localhost:3001
DATABASE_URL=postgresql://user:pass@localhost/db
```

### TBM (appsettings.json)
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=TbmDb;..."
  }
}
```

## 🧪 테스트

```bash
# FoodieMatch 테스트
cd FoodieMatch && npm test

# TBM 테스트
cd TBM/Tbm.Api && dotnet test
```

## 📊 모니터링

- **로그 위치**: 
  - FoodieMatch: `FoodieMatch/logs/`
  - TBM: `TBM/Tbm.Api/logs/`
- **상태 체크**: `/health` 엔드포인트

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 라이선스

이 프로젝트는 내부 사용 목적으로 제작되었습니다.

## 📞 지원

- **개발팀**: dev@company.com
- **이슈 트래커**: GitHub Issues
- **문서**: [INTEGRATION_ARCHITECTURE.md](./INTEGRATION_ARCHITECTURE.md)

## 🔄 업데이트 내역

- **v1.0.0** (2024-01-XX): 초기 통합 버전
  - FoodieMatch와 TBM 네비게이션 연결
  - 통합 대시보드 구현
  - 배포 스크립트 추가

---
© 2024 안전관리 통합 플랫폼. All Rights Reserved.
