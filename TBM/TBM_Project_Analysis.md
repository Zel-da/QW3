# TBM 프로젝트 상세 분석 보고서

## 1. 프로젝트 개요

### 1.1. 목적
이 프로젝트는 **TBM(Toolbox Meeting, 작업 전 안전점검회의)** 활동을 디지털화하여 관리하는 풀스택 웹 애플리케이션입니다. 사용자는 웹을 통해 일일 안전 점검표를 작성, 제출, 조회, 수정, 삭제할 수 있으며, 작업자들의 서명을 포함하여 관리할 수 있습니다.

### 1.2. 전체 아키텍처
전형적인 클라이언트-서버 아키텍처를 따릅니다.
- **프론트엔드 (Client)**: React 기반의 SPA(Single Page Application)로, 사용자 인터페이스를 제공합니다.
- **백엔드 (Server)**: ASP.NET Core 기반의 Web API 서버로, 비즈니스 로직, 데이터베이스 연동, API 제공을 담당합니다.
- **데이터베이스 (Database)**: MS SQL Server를 사용하여 데이터를 영구적으로 저장합니다.

### 1.3. 기술 스택
- **백엔드**: C#, ASP.NET Core, Entity Framework Core
- **프론트엔드**: React, JavaScript, Axios, react-signature-canvas
- **데이터베이스**: MS SQL Server
- **개발/빌드**: Node.js/npm, .NET CLI

---

## 2. 백엔드 분석 (`Tbm.Api`)

### 2.1. 주요 설정 및 실행 (`Program.cs`)
- **CORS 설정**: `AllowReactApp`이라는 정책을 통해 모든 출처(Origin), 헤더, 메소드를 허용하도록 설정되어 있습니다. 이는 개발 환경 및 내부망에서의 편의성을 위함으로 보입니다.
- **데이터베이스 연결**: `appsettings.json`의 `DefaultConnection` 연결 문자열을 사용하여 `TbmContext`를 SQL Server와 연결합니다.
- **JSON 직렬화**: 순환 참조 문제를 피하기 위해 `ReferenceHandler.IgnoreCycles` 옵션을 사용하여 JSON 직렬화를 설정합니다. 이는 `DailyReport`가 `Team`을 참조하고, `Team`이 다시 여러 `DailyReport`를 가질 수 있는 등의 관계에서 발생할 수 있는 오류를 방지합니다.
- **API 문서화**: `Swagger/OpenAPI`를 사용하여 API를 문서화하고 테스트할 수 있는 UI를 제공합니다. (개발 환경에서만 활성화)

### 2.2. 데이터베이스 컨텍스트 (`Data/TbmContext.cs`)
`DbContext`를 상속받아 데이터베이스와의 세션을 관리하며, 7개의 주요 테이블(`DbSet`)을 정의합니다.
- `Teams`, `Users`, `ChecklistTemplates`, `TemplateItems`, `DailyReports`, `ReportDetails`, `ReportSignatures`
- **OnModelCreating**: 외래 키 관계에서 연쇄 삭제(Cascade Delete)로 인한 잠재적 문제를 방지하기 위해 `DeleteBehavior.NoAction`을 설정하여 데이터 무결성을 강화합니다.

### 2.3. 데이터 모델 분석 (`Models/`)
- **`Team`**: 팀 정보 (TeamID, TeamName)
- **`User`**: 사용자 정보 (UserID, UserName, TeamID)
- **`ChecklistTemplate`**: 팀별 점검표 템플릿 (TemplateID, TeamID)
- **`TemplateItem`**: 점검표의 각 항목 (ItemID, Category, Description, DisplayOrder)
- **`DailyReport`**: 일일 TBM 보고서의 메인 정보 (ReportID, TeamID, ReportDate, ManagerName, Remarks)
- **`ReportDetail`**: 보고서의 각 점검 항목 결과 (DetailID, ReportID, ItemID, CheckState)
- **`ReportSignature`**: 보고서에 대한 서명 (SignatureID, ReportID, UserID, SignatureImage, SignedAt)

### 2.4. 데이터 전송 객체 (DTO) (`Dtos/`)
- **`ReportSubmissionDto`**: 프론트엔드에서 보고서를 제출/수정할 때 사용하는 데이터 구조. 점검 결과(`Dictionary<int, string>`), 서명 목록(`List<ReportSignatureDto>`) 등을 포함합니다.
- **`ReportSignatureDto`**: 서명 정보를 전송할 때 사용. 사용자 ID와 Base64로 인코딩된 서명 이미지를 포함합니다.

### 2.5. API 엔드포인트 분석 (`Controllers/`)

#### `TeamsController`
- `GET /api/teams`: 모든 팀 목록을 반환합니다.
- `GET /api/teams/{id}/users`: 특정 팀에 속한 모든 사용자 목록을 반환합니다.

#### `ChecklistController`
- `GET /api/checklist/{teamId}`: 특정 팀의 점검표 템플릿 항목들을 `DisplayOrder` 순으로 정렬하여 반환합니다.

#### `ReportsController`
- `GET /api/reports`: 날짜(`date`)와 팀 ID(`teamId`)로 보고서 목록을 필터링하여 조회합니다. 관련 데이터(Team, Details, Signatures)를 모두 포함하여 반환합니다.
- `GET /api/reports/{id}`: 특정 ID의 보고서 상세 정보를 모든 관련 데이터를 포함하여 반환합니다.
- `POST /api/reports`: 새 보고서를 생성합니다. `ReportSubmissionDto`를 받아 `DailyReport`와 관련 상세 정보, 서명을 데이터베이스에 저장합니다. 서명 이미지는 Base64 문자열에서 바이너리 데이터로 변환되어 저장됩니다.
- `PUT /api/reports/{id}`: 기존 보고서를 수정합니다. 기존 상세 정보와 서명을 모두 지우고 DTO에 담긴 새 정보로 덮어씁니다.
- `DELETE /api/reports/{id}`: 특정 ID의 보고서를 삭제합니다.

---

## 3. 프론트엔드 분석 (`tbm.frontend`)

### 3.1. 주요 라이브러리 및 스크립트 (`package.json`)
- **`react`**: UI 라이브러리.
- **`axios`**: 백엔드 API와 HTTP 통신을 위한 라이브러리.
- **`react-signature-canvas`**: 사용자가 서명을 입력할 수 있는 캔버스 기능을 제공하는 라이브러리.
- **`scripts`**:
    - `start`: 개발 서버를 실행합니다.
    - `build`: 프로덕션용으로 앱을 빌드합니다.
    - `test`: 테스트를 실행합니다.

### 3.2. API 연동 (`src/apiConfig.js`)
- 개발 환경에서는 `http://192.68.10.249:8080`, 프로덕션 환경에서는 `http://tbm-api.mycompany.local`을 API 기본 URL로 사용하도록 설정되어 있습니다.

### 3.3. 애플리케이션 구조 및 라우팅 (`src/App.js`)
- `react-router-dom` 같은 라우팅 라이브러리 대신, `useState`를 사용하여 `view` 상태(`checklist`, `list`, `detail`)를 직접 관리하며 조건부 렌더링을 통해 페이지를 전환합니다.
- 상단 네비게이션 버튼을 통해 '점검표 작성'과 '제출 내역 보기' 뷰를 전환할 수 있습니다.
- `reportIdForEdit` 상태를 통해 수정할 보고서의 ID를 컴포넌트 간에 전달합니다.

### 3.4. 핵심 컴포넌트 분석

#### `TBMChecklist.js`
- **역할**: 점검표 작성 및 수정을 담당하는 가장 복잡한 핵심 컴포넌트.
- **상태 관리**: `useState`를 통해 팀, 사용자, 점검항목, 점검결과, 서명, 특이사항 등 수많은 상태를 관리합니다.
- **로직**:
    1.  최초 렌더링 시 팀 목록을 불러옵니다.
    2.  팀이 선택되면 해당 팀의 점검표 템플릿과 사용자 목록을 API로 불러옵니다.
    3.  수정 모드(`reportIdForEdit`가 있을 경우)일 때는 기존 보고서 데이터를 불러와 상태를 채웁니다.
    4.  사용자가 점검 항목을 선택(`O`, `△`, `X`)하면 `checkResults` 상태가 업데이트됩니다.
    5.  '서명하기' 버튼을 누르면 `SignatureModal`이 열리고, 서명을 저장하면 `signatures` 상태가 업데이트됩니다.
    6.  '최종 제출' 또는 '수정 완료' 버튼을 누르면 모든 상태 데이터를 `ReportSubmissionDto` 형식으로 조합하여 `POST` 또는 `PUT` 요청을 보냅니다.

#### `ReportListView.js`
- **역할**: 제출된 보고서 목록을 표시하고 필터링합니다.
- **로직**:
    1.  날짜와 팀 선택 필터를 제공합니다.
    2.  날짜 필터가 변경될 때마다 `useEffect`가 실행되어 `GET /api/reports` API를 호출하고 목록을 업데이트합니다.
    3.  테이블의 각 행을 클릭하면 `onSelectReport` 콜백 함수가 호출되어 `App.js`의 상태를 변경하고 상세 뷰로 전환됩니다.

#### `ReportDetailView.js`
- **역할**: 단일 보고서의 상세 내용을 표시합니다.
- **로직**:
    1.  `reportId` prop이 변경되면 `useEffect`가 실행되어 `GET /api/reports/{id}` API를 호출하고 상세 데이터를 불러옵니다.
    2.  불러온 데이터를 사용하여 점검 결과 테이블, 특이사항, 서명 목록을 화면에 렌더링합니다.
    3.  '수정' 버튼 클릭 시 `onModify` 콜백을 호출하여 작성 뷰로 전환하고, '삭제' 버튼 클릭 시 `DELETE /api/reports/{id}` API를 호출합니다.

---

## 4. 빌드 및 실행 스크립트

### `start-dev.bat`
- 개발용 스크립트로, 두 개의 새로운 `cmd` 창을 엽니다.
- 하나는 백엔드(`Tbm.Api`) 폴더로 이동하여 `dotnet run`을 실행합니다.
- 다른 하나는 프론트엔드(`tbm.frontend`) 폴더로 이동하여 `npm start`를 실행합니다.

### `build.bat`
- 프로덕션 배포용 빌드 스크립트입니다.
- 백엔드를 `Release` 모드로 `publish`합니다.
- 프론트엔드의 `npm install`을 실행하여 의존성을 설치하고, `npm run build`를 통해 정적 파일을 생성합니다.

---

## 5. 종합 동작 흐름 (사용자 시나리오)

1.  **실행**: 개발자가 `start-dev.bat`을 실행하여 백엔드와 프론트엔드 서버를 모두 켭니다.
2.  **접속**: 사용자가 브라우저에서 프론트엔드 주소로 접속하면 `App.js`가 렌더링되고, 기본 뷰인 `TBMChecklist`가 표시됩니다.
3.  **점검표 로드**: `TBMChecklist` 컴포넌트는 API를 통해 팀 목록을 가져오고, 기본 선택된 팀의 점검 항목과 작업자 목록을 화면에 표시합니다.
4.  **점검 및 서명**: 사용자는 각 항목에 대해 `O, △, X`를 선택하고, 작업자들은 '서명하기' 버튼을 눌러 `SignatureModal`에서 서명을 완료합니다. 관리자도 서명을 입력합니다.
5.  **제출**: '최종 제출' 버튼을 누르면, 컴포넌트의 모든 상태 정보가 하나의 DTO로 묶여 백엔드 `POST /api/reports` API로 전송되고, 데이터베이스에 저장됩니다.
6.  **목록 조회**: 사용자가 '제출 내역 보기' 탭으로 이동하면 `ReportListView`가 표시됩니다. 날짜를 선택하면 해당 날짜의 보고서 목록이 API를 통해 조회되어 나타납니다.
7.  **상세 조회**: 목록에서 특정 보고서를 클릭하면 `ReportDetailView`로 전환되고, 해당 보고서의 모든 상세 정보(점검 결과, 서명 이미지 등)가 API를 통해 조회되어 표시됩니다.
8.  **수정/삭제**: 상세 조회 화면에서 '수정' 버튼을 누르면 `TBMChecklist`가 수정 모드로 열리며 기존 데이터를 불러옵니다. '삭제' 버튼을 누르면 확인창 후 해당 보고서가 DB에서 삭제됩니다.
