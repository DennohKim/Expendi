# Expendi Backend Integration with NextJS + Supabase

This guide explains how to integrate Supabase backend functionality directly into your NextJS frontend application.

## 🏗️ Project Structure

```
frontend/
├── supabase/
│   ├── config.toml              # Supabase local development config
│   └── migrations/
│       └── 001_init_schema.sql  # Database schema migration
├── lib/
│   ├── supabase/
│   │   └── client.ts            # Supabase client configuration
│   ├── services/
│   │   └── expendi-bridge.ts    # Business logic service
│   └── types/
│       └── database.types.ts    # Generated database types
├── hooks/
│   └── useWalletUser.ts         # React hook for user management
├── components/
│   └── UserDashboard.tsx        # Dashboard component
├── pages/
│   └── api/
│       └── sync-user.ts         # API endpoint for user sync
├── .env.example                 # Environment variables template
└── package.json                 # Dependencies and scripts
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Set up Supabase

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase (if not already done)
supabase init

# Start local Supabase
npm run supabase:start
```

### 3. Run Database Migration

```bash
# Apply the schema migration
npm run db:migrate

# Generate TypeScript types
npm run db:generate
```

### 4. Configure Environment Variables

```bash
# Copy the example file
cp .env.example .env.local

# Fill in your Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUBGRAPH_URL=https://api.studio.thegraph.com/query/75392/expendi/v0.1.1
```

### 5. Start Development

```bash
# Start NextJS development server
npm run dev

# In another terminal, keep Supabase running
npm run supabase:status
```

## 🔧 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start NextJS development server |
| `npm run supabase:start` | Start local Supabase instance |
| `npm run supabase:stop` | Stop local Supabase instance |
| `npm run supabase:status` | Check Supabase status |
| `npm run supabase:reset` | Reset local database |
| `npm run db:migrate` | Run database migrations |
| `npm run db:generate` | Generate TypeScript types |

## 📊 Database Schema

The database includes these main tables:

- **users**: User profiles and wallet addresses
- **user_analytics**: Aggregated spending analytics
- **notifications**: Alert system for budget limits
- **bucket_insights**: Detailed bucket performance metrics
- **event_logs**: User activity tracking
- **push_subscriptions**: Web push notifications

## 🔄 Data Flow

```
Wallet Connection → User Creation → Subgraph Sync → Analytics → Notifications
```

### Integration Points:

1. **Wallet Connection**: `useWalletUser` hook handles wallet auth
2. **User Sync**: API endpoint `/api/sync-user` syncs blockchain data
3. **Real-time Updates**: Supabase subscriptions for live notifications
4. **Analytics**: Combined queries from Supabase + Subgraph

## 🎯 Usage Examples

### Basic User Management

```typescript
import { useWalletUser } from '../hooks/useWalletUser';

function MyComponent() {
  const {
    isConnected,
    user,
    analytics,
    realTimeData,
    notifications,
    markNotificationAsRead,
    updateUserProfile
  } = useWalletUser();

  // Component logic here
}
```

### API Endpoints

```typescript
// pages/api/sync-user.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Sync user data between Supabase and Subgraph
}
```

### Direct Database Queries

```typescript
import { supabase } from '../lib/supabase/client';

// Get user analytics
const { data: analytics } = await supabase
  .from('user_analytics')
  .select('*')
  .eq('user_id', userId);
```

## 🔔 Notifications System

### Trigger Conditions:
- Budget 75% utilized → Warning alert
- Budget 90% utilized → Critical alert
- Large transaction → Activity alert
- Monthly summary → Info alert

### Implementation:
```typescript
// Automatic triggers in ExpendiBridgeService
await this.checkNotificationTriggers(userId, userData);
```

## 🛠️ Development Workflow

### 1. Database Changes
```bash
# Create new migration
supabase migration new add_new_feature

# Edit the migration file
# Run migration
npm run db:migrate

# Update types
npm run db:generate
```

### 2. Adding New Features
1. Update database schema if needed
2. Add/modify service functions in `lib/services/`
3. Update React hooks in `hooks/`
4. Create/update components
5. Add API endpoints in `pages/api/`

### 3. Testing
```bash
# Test with local Supabase
npm run supabase:start
npm run dev

# Test API endpoints
curl -X POST http://localhost:3000/api/sync-user \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "0x..."}'
```

## 🔒 Security Features

- **Row Level Security**: All tables have RLS policies
- **Wallet-based Auth**: Users can only access their own data
- **API Route Protection**: Server-side validation
- **Type Safety**: Full TypeScript support

## 📈 Performance Optimizations

- **Indexed Queries**: Optimized database indexes
- **Cached Results**: Expensive queries cached
- **Real-time Subscriptions**: Efficient WebSocket updates
- **Lazy Loading**: Components load data on demand

## 🚦 Deployment

### Production Setup:
1. Create production Supabase project
2. Run migrations on production database
3. Update environment variables
4. Deploy NextJS app to Vercel/Netlify

### Environment Variables:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 🎯 Next Steps

1. **Phase 1**: Basic user sync and dashboard
2. **Phase 2**: Advanced analytics and insights
3. **Phase 3**: Push notifications and alerts
4. **Phase 4**: AI-powered spending insights

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [NextJS API Routes](https://nextjs.org/docs/api-routes/introduction)
- [The Graph Integration](https://thegraph.com/docs/)
- [Wagmi Documentation](https://wagmi.sh/)

## 🤝 Contributing

1. Follow the existing code structure
2. Use TypeScript for all new code
3. Add proper error handling
4. Update types after schema changes
5. Test locally before committing