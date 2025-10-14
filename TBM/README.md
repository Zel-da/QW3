# TBM 애플리케이션 문서

## 1. 프로젝트 개요

본 문서는 TBM(Tool Box Meeting) 점검표 애플리케이션의 설정, 배포 및 유지보수를 위한 가이드입니다. 이 애플리케이션은 다음과 같이 구성됩니다.

- **백엔드**: ASP.NET Core 9 API (`Tbm.Api`)
- **프론트엔드**: React (`tbm.frontend`)
- **데이터베이스**: Microsoft SQL Server

## 2. 프로젝트 구조

- **/Tbm.Api**: 백엔드 API 소스 코드 및 관련 파일이 위치합니다.
- **/tbm.frontend**: 프론트엔드 React 애플리케이션 소스 코드가 위치합니다.
- **/build.bat**: 프로젝트 빌드를 위한 스크립트입니다.

---

## 3. 프로덕션 (Windows Server) 배포 가이드

이 가이드는 초기 배포 시 발생했던 모든 오류와 해결 과정을 포함한 최종 절차입니다.

### 3.1. 필수 구성 요소

서버에 아래 항목들이 반드시 설치되어 있어야 합니다.

1.  **IIS(인터넷 정보 서비스)**
2.  **Microsoft SQL Server**
3.  **.NET 9 Hosting Bundle**: 검색 엔진에서 ".NET 9 Hosting Bundle"을 검색하여 Microsoft 공식 사이트에서 다운로드 및 설치합니다. **설치 후 반드시 서버를 재시작하거나 `net stop was /y && net start w3svc` 명령으로 IIS를 재시작해야 합니다.**

### 3.2. 데이터베이스 설정

1.  **데이터베이스 생성**: SSMS(SQL Server Management Studio)를 사용하여 `TbmDb` 이름의 데이터베이스를 생성합니다.

2.  **로그인 계정 생성**: 아래 T-SQL 쿼리를 실행하여 애플리케이션이 사용할 로그인 계정(`tbm_user`)을 생성합니다.
    ```sql
    -- 1단계: 로그인 계정 생성 및 암호 설정
    CREATE LOGIN [tbm_user] WITH PASSWORD = N'soosan2025!';

    -- 2단계: 데이터베이스 사용자로 매핑
    USE [TbmDb];
    CREATE USER [tbm_user] FOR LOGIN [tbm_user];

    -- 3단계: 데이터베이스에 대한 권한 부여
    ALTER ROLE db_owner ADD MEMBER [tbm_user];
    ```

3.  **(중요) 로그인 정책 설정**: `tbm_user` 계정 생성 시 '다음 로그인 시 암호 변경' 정책으로 인해 오류가 발생했습니다. 아래 쿼리를 실행하여 이 문제를 해결합니다.
    ```sql
    -- 1단계: 암호를 다시 설정하여 MUST_CHANGE 플래그 해제
    ALTER LOGIN [tbm_user] WITH PASSWORD = 'soosan2025!';

    -- 2단계: 암호 정책 및 만료 옵션 해제
    ALTER LOGIN [tbm_user] WITH CHECK_POLICY = OFF, CHECK_EXPIRATION = OFF;
    ```

### 3.3. 애플리케이션 배포

1.  **백엔드 배포**:
    - `Tbm.Api` 프로젝트를 `Release` 모드로 게시(Publish)합니다.
    - 게시된 파일을 서버의 백엔드 폴더(예: `C:\inetpub\wwwroot\tbm-api`)에 복사합니다.
    - 해당 폴더의 `appsettings.json` 파일을 열어 아래와 같이 `ConnectionStrings`를 추가합니다.
      ```json
      {
        "ConnectionStrings": {
          "DefaultConnection": "Server=127.0.0.1;Database=TbmDb;User Id=tbm_user;Password=soosan2025!;TrustServerCertificate=True"
        },
        "Logging": {
          "LogLevel": {
            "Default": "Information",
            "Microsoft.AspNetCore": "Warning"
          }
        },
        "AllowedHosts": "*"
      }
      ```
    - **(중요)**: `Server=localhost` 대신 `Server=127.0.0.1`을 사용해야 통신 프로토콜 문제(파이프 오류)를 피할 수 있습니다.

2.  **프론트엔드 배포**:
    - `tbm.frontend` 프로젝트 폴더에서 `npm run build` 명령을 실행합니다.
    - 생성된 `build` 폴더 안의 모든 파일을 서버의 프론트엔드 폴더(예: `C:\inetpub\wwwroot\tbm-frontend`)에 복사합니다.
    - 프론트엔드의 API 호출 설정 파일(예: `apiConfig.js`)에서 API 서버의 주소를 배포된 백엔드 주소(예: `http://서버IP:8080`)로 수정합니다.

### 3.4. IIS 설정

1.  **응용 프로그램 풀 생성**:
    - IIS 관리자에서 '응용 프로그램 풀'로 이동하여 '응용 프로그램 풀 추가'를 선택합니다.
    - 이름: `TbmApiPool`
    - .NET CLR 버전: **관리 코드 없음(No Managed Code)**
    - 확인을 눌러 생성합니다.

2.  **웹사이트 설정**:
    - '사이트'에서 프론트엔드와 백엔드를 위한 두 개의 웹사이트를 각각 생성합니다.
    - **백엔드 사이트 설정**:
        - 사이트 이름: `TbmApi` (예시)
        - 실제 경로: `C:\inetpub\wwwroot\tbm-api`
        - 바인딩: 사용할 포트(예: 8080)를 지정합니다.
        - **(가장 중요)** 생성된 사이트를 선택하고 오른쪽 '작업' 메뉴에서 '기본 설정'을 클릭합니다. '응용 프로그램 풀'을 `TbmApiPool`로 **반드시 변경**합니다.
    - **프론트엔드 사이트 설정**:
        - 사이트 이름: `TbmFrontend` (예시)
        - 실제 경로: `C:\inetpub\wwwroot\tbm-frontend`
        - 바인딩: 사용할 포트(예: 80)를 지정합니다.
        - 응용 프로그램 풀은 `DefaultAppPool`을 사용해도 무방합니다.

3.  **마무리**:
    - 모든 설정이 완료된 후, IIS 관리자에서 `TbmApiPool`을 마우스 오른쪽 버튼으로 클릭하고 '재활용(Recycle)'을 실행하여 모든 변경사항을 적용합니다.
