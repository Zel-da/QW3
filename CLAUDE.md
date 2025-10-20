# Claude Code Instructions for Safety Management Platform

## Project Overview
This is a comprehensive safety management platform integrating two systems:
- **FoodieMatch**: Safety education platform (React + TypeScript + Express.js + PostgreSQL)
- **TBM**: Tool Box Meeting checklist system (React + ASP.NET Core 9 + SQL Server)

## Project Structure
```
/
├── FoodieMatch/           # Safety education platform
│   ├── client/           # React frontend (Vite + TypeScript)
│   ├── server/           # Express.js backend
│   └── shared/           # Shared TypeScript types
├── TBM/                  # TBM checklist (if present)
│   ├── tbm.frontend/     # React frontend
│   └── Tbm.Api/          # .NET Core 9 API
└── Configuration files
```

## Technology Stack

### FoodieMatch
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Radix UI
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL (with Prisma ORM)
- **Auth**: Passport.js with local strategy
- **State Management**: Zustand, TanStack Query
- **Forms**: React Hook Form with Zod validation

### Development Ports
- FoodieMatch Dev: http://localhost:5173
- FoodieMatch API: http://localhost:5001
- TBM Frontend: http://localhost:3001
- TBM API: http://localhost:8080

## Key Guidelines

### 1. Code Style
- Use TypeScript for all new code
- Follow existing patterns in the codebase
- Use functional components with hooks in React
- Maintain consistent indentation and formatting
- Use Korean comments for business logic explanations
- Keep English for technical code comments

### 2. Database Operations
- Use Prisma for FoodieMatch database operations
- Run `npm run db:push` after schema changes
- Check `FoodieMatch/prisma/schema.prisma` for data models
- Use transactions for multi-step database operations

### 3. API Development
- RESTful endpoints follow `/api/` prefix convention
- Use Express middleware for authentication
- Validate request data with Zod schemas
- Return consistent error responses
- Document API endpoints in code comments

### 4. Frontend Development
- Use Radix UI components for UI consistency
- Apply TailwindCSS for styling
- Use `clsx` and `tailwind-merge` for conditional classes
- Implement proper error handling with toast notifications
- Follow accessibility best practices

### 5. Authentication
- Session-based auth using express-session
- Passport.js handles authentication strategies
- Protected routes require authentication middleware
- User sessions stored in memory (memorystore)

### 6. File Upload
- Multer handles file uploads
- Store files appropriately and validate types
- Handle file cleanup on errors

### 7. Excel Integration
- Use ExcelJS for spreadsheet operations
- See `quiz_sample.csv` for data format examples
- Validate data before importing

## Common Tasks

### Starting Development Server
```bash
cd FoodieMatch
npm run dev
```

### Type Checking
```bash
npm run check
```

### Building for Production
```bash
npm run build
```

### Database Migrations
```bash
npm run db:push
```

## Important Files

### Configuration
- `FoodieMatch/package.json` - Dependencies and scripts
- `FoodieMatch/vite.config.ts` - Vite configuration
- `FoodieMatch/tsconfig.json` - TypeScript configuration
- `FoodieMatch/tailwind.config.js` - TailwindCSS setup
- `FoodieMatch/prisma/schema.prisma` - Database schema

### Entry Points
- `FoodieMatch/server/index.ts` - Backend server entry
- `FoodieMatch/client/src/main.tsx` - Frontend entry
- `FoodieMatch/server/routes.ts` - API route definitions

### Documentation
- `README_INTEGRATION.md` - Integration overview
- `INTEGRATION_ARCHITECTURE.md` - Architecture details
- `INTEGRATION_TEST_CHECKLIST.md` - Testing guide

## When Making Changes

### Before Editing
1. Read relevant files to understand current implementation
2. Check database schema if touching data operations
3. Review related components/modules
4. Understand the integration points between systems

### During Development
1. Follow existing code patterns and conventions
2. Maintain type safety - no `any` types without good reason
3. Add proper error handling
4. Test authentication-protected routes
5. Verify database operations don't break constraints

### After Changes
1. Run type checking: `npm run check`
2. Test the affected functionality
3. Verify no console errors
4. Check that related features still work
5. Update comments if business logic changed

## Security Considerations
- Never commit sensitive data or credentials
- Validate and sanitize all user inputs
- Use parameterized queries to prevent SQL injection
- Implement proper CSRF protection
- Keep dependencies updated for security patches

## Integration Points
- Navigation between FoodieMatch and TBM systems
- Shared user flow: Education → TBM Checklist → Work Start
- Environment variables link the systems (VITE_TBM_URL)

## Git Workflow
- Current branch: main
- Commit messages should be descriptive
- Korean or English commit messages are acceptable
- Test before committing

## Debugging Tips
- Check browser console for frontend errors
- Check terminal output for backend errors
- Review network tab for API call issues
- Use React DevTools for component debugging
- Check database logs for query issues

## Resources
- React: https://react.dev
- TypeScript: https://www.typescriptlang.org
- Express: https://expressjs.com
- Prisma: https://www.prisma.io
- Radix UI: https://www.radix-ui.com
- TailwindCSS: https://tailwindcss.com

## Notes
- This is a safety management platform for workplace safety
- User interface should be intuitive and accessible
- Business logic often involves Korean terminology
- Excel import/export is a key feature
- Session management uses in-memory storage (development mode)
