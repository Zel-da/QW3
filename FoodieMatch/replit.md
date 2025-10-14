# Safety Management Education Program

## Overview

This is a Korean safety management education platform that provides workplace safety training through video content, assessments, and progress tracking. The application offers three main types of safety courses: workplace safety (고소작업대 안전관리), hazard prevention (굴착기 안전수칙), and TBM (Tool Box Meeting) programs. Users can register for courses, watch educational videos, take assessments, and track their progress through a comprehensive dashboard interface.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for client-side routing (lightweight alternative to React Router)
- **State Management**: TanStack Query for server state management and caching
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Forms**: React Hook Form with Zod validation for type-safe form handling

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Design**: RESTful API structure with routes for courses, users, progress, and assessments
- **Data Layer**: In-memory storage implementation with interface for future database integration
- **Middleware**: Custom logging middleware for API requests and error handling
- **Development**: Hot reload with Vite middleware integration in development mode

### Database Schema Design
The application uses Drizzle ORM with PostgreSQL schema definitions:
- **Users**: Basic user information (username, email, department)
- **Courses**: Course metadata with type categorization and media URLs
- **User Progress**: Progress tracking with completion status and time spent
- **Assessments**: Question bank with multiple choice options
- **User Assessments**: Assessment results and scoring
- **Certificates**: Achievement tracking for completed courses

### Authentication and Session Management
- Simple session-based user identification using sessionStorage
- No complex authentication system implemented (suitable for internal training environments)
- User creation and retrieval through email-based lookup

### Content Management
- Video content delivery through external URLs
- PDF document viewing and download functionality
- Course categorization with visual theming (workplace-safety: blue, hazard-prevention: orange, tbm: green)
- Multi-step progress tracking (registration → education → assessment)

## External Dependencies

### Database and ORM
- **Drizzle ORM**: Type-safe database toolkit with PostgreSQL dialect
- **@neondatabase/serverless**: Serverless PostgreSQL connection (Neon database)
- **connect-pg-simple**: PostgreSQL session store for Express sessions

### UI and Design System
- **Radix UI**: Unstyled, accessible UI primitives (@radix-ui/react-*)
- **Tailwind CSS**: Utility-first CSS framework with custom configuration
- **Lucide React**: Icon library for consistent iconography
- **class-variance-authority**: Utility for creating variant-based component APIs

### Development and Build Tools
- **Vite**: Frontend build tool with React plugin
- **TypeScript**: Type safety across frontend and backend
- **ESBuild**: Backend bundling for production builds
- **PostCSS**: CSS processing with Tailwind and Autoprefixer

### Data Fetching and Forms
- **TanStack Query**: Server state management with caching and background updates
- **React Hook Form**: Performant forms with minimal re-renders
- **Zod**: Runtime type validation for forms and API data

### Specialized Libraries
- **date-fns**: Date manipulation and formatting
- **embla-carousel-react**: Carousel/slider components
- **cmdk**: Command palette functionality
- **nanoid**: Unique ID generation

The architecture emphasizes type safety, developer experience, and accessibility while maintaining a clean separation between frontend and backend concerns. The modular design allows for easy extension of course types and assessment formats.