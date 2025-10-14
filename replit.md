# Safety Management Integrated Platform

## Overview

This is an integrated safety management platform that combines a Korean safety education system (FoodieMatch) with a TBM (Tool Box Meeting) checklist system. The platform provides workplace safety training through video content, assessments, progress tracking, and daily safety inspection checklists.

The system consists of two main applications:
1. **FoodieMatch** - A safety education platform for training employees on workplace safety, hazard prevention, and TBM procedures
2. **TBM System** - A digital checklist application for daily safety inspections and team-based safety meetings

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Overall Architecture Pattern
The platform uses a **microservices architecture** with two independent applications that share user context through navigation integration. Each system operates independently with its own frontend, backend, and database.

**Integration Pattern**: Independent deployment with navigation bridge
- FoodieMatch serves as the primary entry point
- TBM system opens in new window/tab from FoodieMatch
- Each system maintains separate authentication (future: unified auth planned)
- No shared database or API gateway currently implemented

### FoodieMatch (Safety Education Platform)

**Frontend Architecture**
- Framework: React 19 with TypeScript, built with Vite
- Routing: Wouter (lightweight client-side router)
- State Management: TanStack Query v5 for server state with infinite stale time
- UI Library: Radix UI primitives with shadcn/ui components
- Styling: Tailwind CSS with CSS variables for theming, Noto Sans KR font for Korean text
- Forms: React Hook Form with Zod validation

**Backend Architecture**
- Runtime: Node.js with Express.js and TypeScript
- API Design: RESTful endpoints for courses, users, progress, assessments, notices
- Session Management: express-session with cookie-based sessions
- File Uploads: Multer middleware for handling PDF/image uploads
- Development: Vite middleware integration for HMR in dev mode

**Database Strategy**
- ORM: Prisma Client for type-safe database access
- Schema: Drizzle ORM schema definitions (MS SQL Server dialect configured, though can support PostgreSQL)
- Current Configuration: Set up for MS SQL Server but database URL suggests flexibility
- Tables: Users, Courses, UserProgress, Assessments, UserAssessments, Certificates, Notices

**Authentication Pattern**
- Session-based authentication with express-session
- Session secret externalized to SESSION_SECRET environment variable (required in production)
- Password hashing with bcrypt for secure credential storage
- Demo user auto-creation for development/testing
- Role-based access control (admin/user roles)
- Session stored in server memory (not production-ready for scaling)

**Authorization Middleware**
- requireAuth: Validates user authentication status
- requireOwnership: Enforces user can only access own data (unless admin role)
- All progress endpoints protected with ownership-based authorization
- Returns 401 for unauthenticated requests, 403 for unauthorized access

**Content Delivery System**
- Video streaming via external URLs
- PDF document viewing with download functionality
- Course categorization: workplace-safety (blue), hazard-prevention (orange), tbm (green)
- Multi-step progress: registration → education → assessment → certification

### TBM (Tool Box Meeting) System

**Frontend Architecture**
- Framework: React 19 with JavaScript (Create React App)
- UI Components: shadcn/ui with Radix UI primitives, Tailwind CSS
- Signature Capture: react-signature-canvas for digital signatures
- API Communication: Axios for HTTP requests
- Routing: Built-in React routing within single-page app

**Backend Architecture**
- Framework: ASP.NET Core 9 Web API (C#)
- API Documentation: Swagger/OpenAPI for development
- CORS Policy: "AllowReactApp" - permissive for internal network use
- JSON Serialization: ReferenceHandler.IgnoreCycles to prevent circular reference errors
- Error Handling: Global exception middleware

**Database Design (MS SQL Server)**
- Context: Entity Framework Core with TbmContext
- Connection: SQL Server with trust server certificate enabled
- Cascade Delete: Disabled (DeleteBehavior.NoAction) for data integrity
- Tables:
  - Teams: Team information and metadata
  - Users: Worker information linked to teams
  - ChecklistTemplates: Team-specific safety checklist templates
  - TemplateItems: Individual checklist items with categories and display order
  - DailyReports: Main TBM report records (date, team, manager, remarks)
  - ReportDetails: Checklist item results (check state: O/△/X)
  - ReportSignatures: Digital signatures with Base64 image data

**TBM Workflow Architecture**
1. Manager selects team and fills checklist
2. System displays team-specific template items
3. Manager marks each item: O (good), △ (observe), X (poor)
4. Workers sign sequentially on single device
5. Manager adds final signature and remarks
6. System stores complete report with all signatures
7. Reports viewable/editable with date and team filters

**Data Transfer Pattern**
- DTOs for clean separation: ReportSubmissionDto, ReportSignatureDto
- Dictionary-based check results (ItemID → CheckState)
- Base64 encoding for signature image transmission
- Validation at API layer before database persistence

### Deployment Architecture

**Development Environment**
- FoodieMatch Frontend: Port 5173 (Vite dev server)
- FoodieMatch Backend: Port 3000 (Express)
- TBM Frontend: Port 3001 (React dev server)
- TBM Backend: Port 5287 (ASP.NET Core)

**Production Environment** (Windows Server On-Premise)
- Web Server: IIS (Internet Information Services)
- Network: Internal intranet only, no external internet access
- Single server hosts both applications
- FoodieMatch: Likely port 8080 or custom IIS binding
- TBM API: Configured for port 8080 in production (192.68.10.249:8080)

**Integration Points**
- Navigation button in FoodieMatch header opens TBM in new window
- URL switching based on NODE_ENV: localhost (dev) vs 192.68.10.249 (prod)
- No shared authentication currently - separate login systems
- Future consideration: API gateway, unified SSO, module federation

## External Dependencies

### Database Systems
- **PostgreSQL/MS SQL Server**: Primary database (FoodieMatch configured for MS SQL but schema supports both)
  - Neon serverless PostgreSQL driver included
  - Prisma Client for ORM with MS SQL dialect
  - Connection string flexibility for different database backends

- **MS SQL Server**: TBM system exclusive database
  - Entity Framework Core 9 for data access
  - SQL Server Express recommended for on-premise deployment
  - Custom login account: tbm_user with password policy disabled

### Frontend Libraries
**FoodieMatch**
- Radix UI component primitives (20+ components: accordion, alert-dialog, avatar, checkbox, dialog, dropdown, etc.)
- TanStack Query for server state and caching
- Wouter for lightweight routing
- React Hook Form + Zod for form validation
- Tailwind CSS + class-variance-authority for styling
- Lucide React for icons

**TBM**
- React Signature Canvas for digital signature capture
- Axios for API requests
- Tailwind CSS with shadcn/ui components
- Testing Library suite for component testing

### Backend Dependencies
**FoodieMatch (Node.js)**
- Express.js web framework
- express-session for session management
- Multer for file upload handling
- bcrypt for password hashing (version 6.0.0 - note: unusually high version)
- Prisma/Drizzle ORM tooling
- Vite for development bundling

**TBM (.NET)**
- ASP.NET Core 9.0
- Entity Framework Core for ORM
- Azure.Identity and Azure.Core (for future cloud integration potential)
- BCrypt.Net-Next for password hashing
- Swagger/Swashbuckle for API documentation

### Development Tools
- TypeScript for type safety (FoodieMatch)
- ESBuild for production bundling (FoodieMatch)
- Visual Studio for .NET development (TBM)
- Node.js 18+ required
- .NET SDK 9.0+ required

### Network and Security
- CORS: Permissive policy for internal network
- Sessions: Cookie-based with httpOnly flag
- File Storage: Local filesystem uploads (not cloud storage)
- HTTPS: Optional in development, TrustServerCertificate enabled for SQL
- Authentication: Separate systems per application (future unification planned)

### External Services
**None Currently Integrated** - System designed for air-gapped internal network:
- No cloud storage (AWS S3, Azure Blob, etc.)
- No external authentication providers (OAuth, SAML)
- No CDN or external asset hosting
- No email services configured
- All resources served from local/internal infrastructure

**Future Potential Integrations** (based on package presence):
- Azure services (Azure.Identity packages present but unused)
- Email notifications for safety alerts
- SMS for critical safety incidents
- External video hosting for training content
- Analytics and reporting dashboards