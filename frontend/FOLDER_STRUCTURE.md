# Frontend Folder Structure

This document outlines the proper folder structure for the NextJS application with Privy integration.

## 📁 Current Structure

```
frontend/
├── src/                          # Source files (main application code)
│   ├── app/                      # Next.js App Router pages
│   │   ├── (admin)/             # Admin routes group
│   │   │   ├── buckets/
│   │   │   │   └── page.tsx
│   │   │   ├── profile/
│   │   │   │   └── page.tsx
│   │   │   ├── transactions/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── (full-width-pages)/  # Full-width pages group
│   │   │   └── layout.tsx
│   │   ├── layout.tsx           # Root layout
│   │   ├── globals.css          # Global styles
│   │   └── page.tsx             # Home page
│   │
│   ├── components/              # React components
│   │   ├── AppLayout.tsx        # App layout with Privy providers
│   │   ├── UserDashboard.tsx    # Main dashboard component
│   │   ├── WalletConnection.tsx # Legacy wallet connection (can be removed)
│   │   ├── buckets/             # Bucket-related components
│   │   ├── common/              # Common UI components
│   │   ├── form/                # Form components
│   │   ├── header/              # Header components
│   │   │   ├── NotificationDropdown.tsx
│   │   │   └── WalletDropdown.tsx    # Privy wallet connection dropdown
│   │   ├── ui/                  # UI components
│   │   └── user-profile/        # User profile components
│   │
│   ├── hooks/                   # Custom React hooks
│   │   ├── useWalletUser.ts     # Main wallet & user hook (Privy)
│   │   ├── useGoBack.ts         # Navigation hook
│   │   └── useModal.ts          # Modal hook
│   │
│   ├── lib/                     # Utility libraries and configurations
│   │   ├── privy/               # Privy configuration
│   │   │   ├── config.ts        # Privy app configuration
│   │   │   ├── providers.tsx    # React providers
│   │   │   └── wagmi-config.ts  # Wagmi configuration
│   │   ├── services/            # Business logic services
│   │   │   └── expendi-bridge.ts # Subgraph ↔ Supabase bridge
│   │   ├── supabase/            # Supabase configuration
│   │   │   └── client.ts        # Supabase client
│   │   ├── types/               # TypeScript type definitions
│   │   │   └── database.types.ts # Database types
│   │   └── utils.ts             # Utility functions
│   │
│   ├── context/                 # React context providers
│   │   ├── SidebarContext.tsx   # Sidebar state
│   │   └── ThemeContext.tsx     # Theme state
│   │
│   ├── icons/                   # SVG icons
│   │   └── *.svg                # Icon files
│   │
│   ├── layout/                  # Layout components
│   │   ├── AppHeader.tsx        # App header
│   │   ├── AppSidebar.tsx       # App sidebar
│   │   └── Backdrop.tsx         # Backdrop component
│   │
│   └── styles/                  # Additional styles
│
├── src/                          # Source files (main application code)
│   ├── app/                      # Next.js App Router pages
│   │   ├── api/                  # API endpoints (App Router)
│   │   │   └── sync-user/
│   │   │       └── route.ts      # User sync endpoint
│
├── supabase/                    # Supabase configuration
│   ├── config.toml              # Supabase local config
│   └── migrations/              # Database migrations
│       └── 001_init_schema.sql  # Initial schema
│
├── public/                      # Static assets
│   └── images/                  # Images
│
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript configuration
├── next.config.ts               # Next.js configuration
├── tailwind.config.ts           # Tailwind CSS configuration
├── .env.example                 # Environment variables template
├── .env.local                   # Local environment variables (gitignored)
├── README_BACKEND.md            # Backend integration guide
├── PRIVY_SETUP.md               # Privy setup guide
└── FOLDER_STRUCTURE.md          # This file
```

## 🎯 Key Principles

### 1. **Separation of Concerns**
- `src/app/` - App Router pages and layouts
- `src/components/` - Reusable UI components
- `src/hooks/` - Custom React hooks
- `src/lib/` - Utility libraries and configurations
- `pages/api/` - API endpoints (Pages Router)

### 2. **Import Paths**
All imports use the `@/` alias pointing to `src/`:

```typescript
// ✅ Correct
import { useWalletUser } from '@/hooks/useWalletUser';
import { supabase } from '@/lib/supabase/client';
import { UserDashboard } from '@/components/UserDashboard';

// ❌ Incorrect (relative paths)
import { useWalletUser } from '../hooks/useWalletUser';
import { supabase } from '../../lib/supabase/client';
```

### 3. **Component Organization**
- Generic components in `src/components/`
- Feature-specific components in subdirectories
- Page-specific components co-located with pages

### 4. **Configuration Files**
- Privy config in `src/lib/privy/`
- Supabase config in `src/lib/supabase/`
- Type definitions in `src/lib/types/`

## 🚀 Adding New Features

### Adding a New Page
```typescript
// src/app/new-page/page.tsx
import { AppLayout } from '@/components/AppLayout';
import { NewPageComponent } from '@/components/NewPageComponent';

export default function NewPage() {
  return (
    <AppLayout>
      <NewPageComponent />
    </AppLayout>
  );
}
```

### Adding a New Component
```typescript
// src/components/NewComponent.tsx
import { useWalletUser } from '@/hooks/useWalletUser';
import { supabase } from '@/lib/supabase/client';

export function NewComponent() {
  const { isConnected } = useWalletUser();
  
  return (
    <div>
      {/* Component content */}
    </div>
  );
}
```

### Adding a New Hook
```typescript
// src/hooks/useNewFeature.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

export function useNewFeature() {
  const [data, setData] = useState(null);
  
  // Hook logic
  
  return { data };
}
```

### Adding a New API Route
```typescript
// src/app/api/new-endpoint/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ExpendiBridgeService } from '@/lib/services/expendi-bridge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // API logic
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

## 🛠️ Development Scripts

```bash
# Development
npm run dev                    # Start development server
npm run build                  # Build for production
npm run start                  # Start production server

# Supabase
npm run supabase:start         # Start local Supabase
npm run supabase:stop          # Stop local Supabase
npm run db:migrate             # Run database migrations
npm run db:generate            # Generate TypeScript types

# Linting
npm run lint                   # Run ESLint
npm run lint:fix               # Fix linting issues
```

## 📋 File Naming Conventions

### Components
- PascalCase: `UserDashboard.tsx`
- Descriptive names: `WalletConnection.tsx`
- Feature prefixes: `BucketMetrics.tsx`

### Hooks
- camelCase with `use` prefix: `useWalletUser.ts`
- Descriptive names: `useTransactionHistory.ts`

### Utilities
- camelCase: `formatCurrency.ts`
- Descriptive names: `apiClient.ts`

### Types
- PascalCase: `DatabaseTypes.ts`
- Descriptive names: `UserPreferences.ts`

## 🔧 Environment Variables

```env
# Privy (required)
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id

# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Subgraph (required)
NEXT_PUBLIC_SUBGRAPH_URL=your-subgraph-url

# Optional
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-walletconnect-id
```

## 🎨 Styling

- **Tailwind CSS**: Primary styling framework
- **Global styles**: `src/app/globals.css`
- **Component styles**: Tailwind classes in components
- **Theme**: Dark/light mode support via `ThemeContext`

## 📱 Responsive Design

- **Mobile-first**: Tailwind's responsive utilities
- **Breakpoints**: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`
- **Layout**: Responsive grid and flexbox layouts

## 🔐 Security

- **Environment variables**: Sensitive data in `.env.local`
- **Type safety**: Full TypeScript coverage
- **API security**: Server-side validation
- **Client security**: Secure wallet connections

## 🚦 Best Practices

1. **Use TypeScript**: All files should be `.ts` or `.tsx`
2. **Import aliases**: Always use `@/` for imports
3. **Component composition**: Break down large components
4. **Custom hooks**: Extract reusable logic
5. **Error boundaries**: Handle errors gracefully
6. **Loading states**: Show loading indicators
7. **Accessibility**: Use semantic HTML and ARIA attributes

This structure provides a scalable foundation for the Expendi application with proper separation of concerns and modern Next.js best practices.