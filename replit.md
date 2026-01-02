# Lead Management CRM

## Overview

A production-ready Lead Management application with role-based access control (RBAC), featuring separate login portals for Admin, Manager, and Executive roles. The system handles lead assignment, follow-ups, dashboard analytics, and notifications. Built as a mobile-first, full-stack TypeScript application.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state caching and synchronization
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Charts**: Recharts for dashboard analytics visualization
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **API Design**: REST API with typed contracts defined in `shared/routes.ts`
- **Authentication**: Passport.js with local strategy, session-based auth using express-session
- **Password Security**: Scrypt hashing with random salts

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Database**: PostgreSQL (requires DATABASE_URL environment variable)
- **Schema Location**: `shared/schema.ts` - contains all table definitions
- **Migrations**: Drizzle Kit for schema migrations (`npm run db:push`)
- **Session Storage**: MemoryStore (development) - should use connect-pg-simple for production

### Project Structure
```
├── client/           # React frontend
│   └── src/
│       ├── components/   # UI components
│       ├── hooks/        # Custom React hooks
│       ├── lib/          # Utilities (queryClient, utils)
│       └── pages/        # Route pages
├── server/           # Express backend
│   ├── auth.ts       # Authentication setup
│   ├── db.ts         # Database connection
│   ├── routes.ts     # API route handlers
│   ├── storage.ts    # Data access layer
│   └── index.ts      # Server entry point
├── shared/           # Shared code between client/server
│   ├── schema.ts     # Drizzle database schema
│   └── routes.ts     # API contract definitions
└── migrations/       # Database migrations
```

### Key Design Patterns
- **Typed API Contracts**: API endpoints defined with Zod schemas in `shared/routes.ts`, ensuring type safety between frontend and backend
- **Data Access Layer**: `server/storage.ts` abstracts all database operations behind an interface
- **Component Composition**: UI built with composable shadcn/ui components
- **Custom Hooks Pattern**: Business logic encapsulated in hooks (`use-auth`, `use-leads`, `use-users`, `use-dashboard`)

### Role-Based Access Control (RBAC)
- Three roles: ADMIN, MANAGER, EXECUTIVE
- Separate login portals at `/login/admin`, `/login/manager`, `/login/executive`
- Portal validation ensures users can only log in through their authorized portal
- Route protection via `ProtectedRoute` component

### Database Schema
- **users**: User accounts with role enum, manager relationships
- **leads**: Lead records with status workflow (NEW → FOLLOW_UP → CONVERTED/CLOSED)
- **lead_notes**: Notes attached to leads
- **notifications**: User notifications system

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable

### Key NPM Packages
- **drizzle-orm** / **drizzle-kit**: ORM and migration tooling
- **express** / **express-session**: Web server and session management
- **passport** / **passport-local**: Authentication
- **@tanstack/react-query**: Async state management
- **zod**: Schema validation
- **recharts**: Dashboard charts
- **date-fns**: Date formatting

### Build Tools
- **Vite**: Frontend bundler with HMR
- **esbuild**: Server bundling for production
- **tsx**: TypeScript execution for development

### Development Commands
- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run db:push`: Push schema changes to database