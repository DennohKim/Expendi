# Recurring Payments Implementation Plan
## Base Subscriptions Integration for Expendi V1

**Status:** Planning Phase  
**Created:** October 18, 2025  
**Target Networks:** Base Mainnet (8453), Base Sepolia (84532)

---

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Technical Requirements](#technical-requirements)
4. [Database Schema Changes](#database-schema-changes)
5. [Frontend Implementation](#frontend-implementation)
6. [Backend Implementation](#backend-implementation)
7. [Integration Points](#integration-points)
8. [Security Considerations](#security-considerations)
9. [Testing Strategy](#testing-strategy)
10. [Implementation Phases](#implementation-phases)
11. [Rollout Plan](#rollout-plan)

---

## Overview

### Goal
Enable Expendi users to create and manage recurring payments using Base Subscriptions, allowing automatic USDC payments for subscription-based expenses (e.g., Netflix, Spotify, gym memberships).

### Key Features
- **User-Controlled Subscriptions**: Users can set up recurring payments for their regular expenses
- **Flexible Billing Cycles**: Support daily, weekly, monthly, and custom period subscriptions
- **Automatic Charging**: Backend service handles periodic charges without user interaction
- **Real-Time Status**: Users can view, monitor, and cancel subscriptions anytime
- **Zero Platform Fees**: Direct USDC payments with no merchant fees

### Business Value
1. **Enhanced Budget Planning**: Users can automate recurring expense tracking
2. **Improved Cash Flow Management**: Predictable payment schedules
3. **Reduced Manual Entry**: Automatic transaction creation for recurring payments
4. **Better Expense Categorization**: Track subscription costs separately

---

## Architecture

### High-Level Flow

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Frontend  │         │   Backend    │         │  Base Chain │
│  (Next.js)  │         │  (Express)   │         │   (Spend    │
│             │         │              │         │ Permissions)│
└─────────────┘         └──────────────┘         └─────────────┘
       │                       │                        │
       │  1. Create            │                        │
       │  Subscription         │                        │
       ├──────────────────────>│                        │
       │                       │                        │
       │                       │  2. User approves      │
       │                       │     Spend Permission   │
       │<──────────────────────┼───────────────────────>│
       │                       │                        │
       │  3. Save subscription │                        │
       │     to database       │                        │
       ├──────────────────────>│                        │
       │                       │                        │
       │                       │  4. Cron Job: Check    │
       │                       │     due subscriptions  │
       │                       │<───────┐               │
       │                       │        │               │
       │                       │  5. Prepare & execute  │
       │                       │     charge             │
       │                       ├───────────────────────>│
       │                       │                        │
       │                       │  6. Create transaction │
       │                       │     record             │
       │                       │<───────┘               │
       │                       │                        │
       │  7. Display updated   │                        │
       │     subscription      │                        │
       │<──────────────────────┤                        │
```

### Component Breakdown

#### 1. Frontend Components
- **Subscription Creation UI**: Form to set up new recurring payments
- **Subscription Dashboard**: View all active/inactive subscriptions
- **Subscription Management**: Edit, pause, or cancel subscriptions
- **Status Indicators**: Real-time subscription status and next charge date

#### 2. Backend Services
- **Subscription API**: CRUD operations for subscriptions
- **Charging Service**: Cron job to process due subscriptions
- **Status Checker**: Monitor subscription health and user cancellations
- **Transaction Creator**: Generate transaction records for successful charges

#### 3. Database Layer
- **Subscriptions Table**: Store subscription metadata
- **Subscription Transactions**: Track all charges and attempts
- **Subscription History**: Audit log for changes

---

## Technical Requirements

### Dependencies to Add

#### Frontend (`frontend/package.json`)
```json
{
  "@base-org/account": "^latest",
  "viem": "^2.x",
  "date-fns": "^3.x" // For date calculations
}
```

#### Backend (`backend/package.json`)
```json
{
  "@base-org/account": "^latest",
  "viem": "^2.x",
  "node-cron": "^3.x", // For scheduling charges
  "date-fns": "^3.x"
}
```

### Environment Variables

#### Backend (`.env`)
```env
# Subscription Owner Wallet (controlled by Expendi backend)
SUBSCRIPTION_OWNER_PRIVATE_KEY=0x...
SUBSCRIPTION_OWNER_ADDRESS=0x...

# Network Configuration
BASE_MAINNET_RPC_URL=https://mainnet.base.org
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# Feature Flags
ENABLE_RECURRING_PAYMENTS=true
RECURRING_PAYMENTS_TESTNET=false

# Charging Schedule
SUBSCRIPTION_CHECK_CRON="0 */6 * * *" // Every 6 hours
```

#### Frontend (`.env.local`)
```env
NEXT_PUBLIC_ENABLE_SUBSCRIPTIONS=true
NEXT_PUBLIC_BASE_CHAIN_ID=8453
NEXT_PUBLIC_SUBSCRIPTION_OWNER_ADDRESS=0x...
```

---

## Database Schema Changes

### New Prisma Models

```prisma
// prisma/schema.prisma

model Subscription {
  id                    String   @id @default(uuid())
  userId                String
  user                  User     @relation(fields: [userId], references: [id])
  
  // Base Subscription Data
  subscriptionId        String   @unique // From Base SDK
  payerAddress          String   // User's wallet address
  ownerAddress          String   // Expendi's wallet address
  
  // Subscription Details
  name                  String   // e.g., "Netflix Premium"
  description           String?
  category              String   // e.g., "Entertainment", "Utilities"
  recurringAmount       Decimal  @db.Decimal(18, 6)
  currency              String   @default("USDC")
  periodInDays          Int      // 1, 7, 30, 365, etc.
  
  // Status & Lifecycle
  status                SubscriptionStatus @default(ACTIVE)
  isActive              Boolean   @default(true)
  nextChargeDate        DateTime
  lastChargeDate        DateTime?
  lastCheckDate         DateTime?
  
  // Metadata
  startDate             DateTime  @default(now())
  endDate               DateTime?
  pausedAt              DateTime?
  cancelledAt           DateTime?
  
  // Network
  chainId               Int       @default(8453)
  testnet               Boolean   @default(false)
  
  // Relations
  transactions          SubscriptionTransaction[]
  history               SubscriptionHistory[]
  
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  
  @@index([userId, status])
  @@index([subscriptionId])
  @@index([nextChargeDate, isActive])
  @@index([payerAddress])
}

model SubscriptionTransaction {
  id                    String   @id @default(uuid())
  subscriptionId        String
  subscription          Subscription @relation(fields: [subscriptionId], references: [id])
  
  // Transaction Details
  amount                Decimal  @db.Decimal(18, 6)
  currency              String   @default("USDC")
  status                TransactionStatus
  
  // Blockchain Data
  transactionHashes     String[] // Multiple txs for approve + transfer
  blockNumber           BigInt?
  gasUsed               BigInt?
  
  // Timing
  attemptedAt           DateTime @default(now())
  completedAt           DateTime?
  failedAt              DateTime?
  
  // Error Handling
  errorMessage          String?
  retryCount            Int      @default(0)
  
  // Metadata
  periodStart           DateTime
  periodEnd             DateTime
  
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  @@index([subscriptionId, status])
  @@index([attemptedAt])
}

model SubscriptionHistory {
  id                    String   @id @default(uuid())
  subscriptionId        String
  subscription          Subscription @relation(fields: [subscriptionId], references: [id])
  
  action                SubscriptionAction
  performedBy           String   // userId or "system"
  
  // Change Tracking
  oldValues             Json?
  newValues             Json?
  
  // Context
  reason                String?
  metadata              Json?
  
  createdAt             DateTime @default(now())
  
  @@index([subscriptionId, createdAt])
}

enum SubscriptionStatus {
  ACTIVE
  PAUSED
  CANCELLED
  EXPIRED
  FAILED
}

enum TransactionStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  INSUFFICIENT_FUNDS
  CANCELLED_BY_USER
}

enum SubscriptionAction {
  CREATED
  ACTIVATED
  PAUSED
  RESUMED
  CANCELLED
  CHARGED
  CHARGE_FAILED
  UPDATED
  EXPIRED
}

// Add relation to existing User model
model User {
  // ... existing fields
  subscriptions         Subscription[]
}
```

### Migration Strategy
1. Create new tables without affecting existing data
2. Add foreign key constraints
3. Create indexes for performance
4. Test with sample data on testnet

---

## Frontend Implementation

### File Structure
```
frontend/src/
├── components/
│   ├── subscriptions/
│   │   ├── SubscriptionButton.tsx          // Create new subscription
│   │   ├── SubscriptionCard.tsx            // Display single subscription
│   │   ├── SubscriptionList.tsx            // List all subscriptions
│   │   ├── SubscriptionForm.tsx            // Form to configure subscription
│   │   ├── SubscriptionStatusBadge.tsx     // Status indicator
│   │   ├── SubscriptionHistory.tsx         // Transaction history
│   │   └── SubscriptionStats.tsx           // Analytics/charts
│   └── transactions/
│       └── RecurringTransactionItem.tsx    // Modified for recurring txs
├── hooks/
│   ├── useSubscription.ts                  // Subscription CRUD operations
│   ├── useSubscriptionStatus.ts            // Real-time status checking
│   └── useBaseAccount.ts                   // Base SDK integration
├── lib/
│   ├── base-subscription.ts                // Base SDK wrapper
│   └── subscription-utils.ts               // Helper functions
├── types/
│   └── subscription.ts                     // TypeScript interfaces
└── app/
    └── subscriptions/
        ├── page.tsx                        // Main subscriptions page
        ├── new/
        │   └── page.tsx                    // Create subscription
        └── [id]/
            └── page.tsx                    // Subscription details
```

### Key Components

#### 1. Subscription Creation Flow
```typescript
// Location: frontend/src/components/subscriptions/SubscriptionButton.tsx
// Purpose: Main entry point for creating subscriptions
// Features:
//   - Connect to Base Account
//   - Call base.subscription.subscribe()
//   - Save subscription ID to backend
//   - Handle errors and loading states
```

#### 2. Subscription Dashboard
```typescript
// Location: frontend/src/app/subscriptions/page.tsx
// Purpose: Display all user subscriptions
// Features:
//   - Filter by status (active, paused, cancelled)
//   - Sort by next charge date
//   - Quick actions (pause, resume, cancel)
//   - Monthly/yearly cost projections
```

#### 3. Subscription Management
```typescript
// Location: frontend/src/app/subscriptions/[id]/page.tsx
// Purpose: Detailed subscription view and management
// Features:
//   - Transaction history
//   - Next charge date countdown
//   - Edit subscription details
//   - Cancel subscription
//   - View spending patterns
```

### UI/UX Considerations
1. **Clear Pricing Display**: Show amount and frequency prominently
2. **Transparency**: Display next charge date and remaining allowance
3. **Easy Cancellation**: One-click cancel with confirmation
4. **Status Indicators**: Color-coded badges for different states
5. **Mobile Responsive**: Touch-friendly controls
6. **Loading States**: Show progress during blockchain transactions
7. **Error Handling**: User-friendly error messages

---

## Backend Implementation

### File Structure
```
backend/src/
├── routes/
│   └── subscriptions.ts                    // API endpoints
├── lib/
│   ├── subscription-service.ts             // Business logic
│   ├── subscription-charger.ts             // Charging service
│   ├── subscription-monitor.ts             // Status monitoring
│   └── base-client.ts                      // Base SDK client
├── jobs/
│   └── subscription-charges.ts             // Cron job
└── types/
    └── subscription.ts                     // TypeScript interfaces
```

### API Endpoints

#### 1. Create Subscription
```
POST /api/subscriptions
Body: {
  subscriptionId: string,      // From Base SDK
  payerAddress: string,
  name: string,
  description?: string,
  category: string,
  recurringAmount: number,
  periodInDays: number,
  testnet: boolean
}
Response: { subscription: Subscription }
```

#### 2. Get User Subscriptions
```
GET /api/subscriptions
Query: {
  status?: string,
  category?: string,
  limit?: number,
  offset?: number
}
Response: { subscriptions: Subscription[], total: number }
```

#### 3. Get Subscription Details
```
GET /api/subscriptions/:id
Response: { subscription: Subscription, transactions: Transaction[] }
```

#### 4. Update Subscription
```
PATCH /api/subscriptions/:id
Body: {
  name?: string,
  description?: string,
  category?: string
}
Response: { subscription: Subscription }
```

#### 5. Pause Subscription
```
POST /api/subscriptions/:id/pause
Response: { subscription: Subscription }
```

#### 6. Resume Subscription
```
POST /api/subscriptions/:id/resume
Response: { subscription: Subscription }
```

#### 7. Cancel Subscription
```
DELETE /api/subscriptions/:id
Response: { success: boolean }
```

#### 8. Check Subscription Status
```
GET /api/subscriptions/:id/status
Response: {
  isSubscribed: boolean,
  remainingChargeInPeriod: string,
  nextPeriodStart: string
}
```

#### 9. Get Transaction History
```
GET /api/subscriptions/:id/transactions
Response: { transactions: SubscriptionTransaction[] }
```

### Background Services

#### 1. Subscription Charging Service
```typescript
// Location: backend/src/jobs/subscription-charges.ts
// Schedule: Every 6 hours (configurable)
// Purpose: Process due subscriptions

Flow:
1. Query subscriptions where nextChargeDate <= now AND isActive = true
2. For each subscription:
   a. Check status on-chain via base.subscription.getStatus()
   b. If cancelled by user, update database
   c. If charge available, prepare and execute charge
   d. Create transaction record
   e. Update nextChargeDate
   f. Handle errors and retry logic
3. Send notifications for successful/failed charges
```

#### 2. Status Monitoring Service
```typescript
// Location: backend/src/lib/subscription-monitor.ts
// Schedule: Daily
// Purpose: Sync subscription status with on-chain state

Flow:
1. Query all active subscriptions
2. Check on-chain status for each
3. Update database if status changed (cancelled, expired)
4. Generate alerts for issues
```

### Error Handling
1. **Insufficient Funds**: Mark transaction as failed, notify user
2. **Network Issues**: Retry with exponential backoff (max 3 attempts)
3. **User Cancelled**: Update status, stop future charges
4. **Gas Estimation Failure**: Alert admin, skip charge
5. **Database Errors**: Log and rollback transactions

---

## Integration Points

### 1. With Existing Transaction System
- Create regular `Transaction` records for successful charges
- Link to `Subscription` via metadata
- Ensure proper categorization and budgeting
- Display in transaction list with "Recurring" badge

### 2. With Wallet Management
- Support both smart contract wallets and EOAs
- Handle multi-chain scenarios (Base, Celo, Scroll)
- Ensure proper network switching in UI

### 3. With Budget Tracking
- Include recurring payments in budget calculations
- Show projected vs actual spending
- Alert users when subscription costs exceed budget

### 4. With Analytics
- Track total subscription spending
- Category breakdown for subscriptions
- Month-over-month comparison
- Subscription churn analysis

### 5. With Notifications
- Email/push for upcoming charges
- Failed payment alerts
- Subscription status changes
- Monthly summary reports

---

## Security Considerations

### Critical Security Measures

#### 1. Private Key Management
```
⚠️  CRITICAL: Never expose subscription owner private key
- Store in secure environment variables
- Use key management service (AWS KMS, HashiCorp Vault)
- Rotate keys periodically
- Limit access to production keys
- Never commit keys to version control
```

#### 2. Authorization & Access Control
- Verify user owns wallet before creating subscription
- Validate subscription ownership before operations
- Implement rate limiting on API endpoints
- Use JWT tokens with short expiration
- Log all subscription modifications

#### 3. Input Validation
- Sanitize all user inputs
- Validate amounts (prevent negative or excessive values)
- Check period ranges (1-365 days)
- Verify wallet addresses (checksum validation)
- Prevent SQL injection via Prisma parameterization

#### 4. Blockchain Security
- Verify transaction receipt before marking complete
- Handle chain reorganizations
- Implement transaction monitoring
- Use proper gas estimation
- Handle failed transactions gracefully

#### 5. Data Protection
- Encrypt sensitive data at rest
- Use HTTPS for all API calls
- Implement CORS properly
- Sanitize error messages (no internal details)
- Regular security audits

---

## Testing Strategy

### 1. Unit Tests
```typescript
// Backend
- Subscription service methods
- Charging logic
- Status checking
- Error handling
- Date calculations

// Frontend
- Component rendering
- User interactions
- Form validation
- State management
```

### 2. Integration Tests
```typescript
// API Tests
- Create subscription flow
- Charge subscription flow
- Status updates
- Error scenarios
- Database consistency

// Blockchain Tests
- Base SDK integration
- Transaction execution
- Status retrieval
- Network switching
```

### 3. End-to-End Tests
```typescript
// User Flows
- Complete subscription creation
- View subscription dashboard
- Pause and resume subscription
- Cancel subscription
- Handle failed charges
- Network error recovery
```

### 4. Testnet Testing
```
Environment: Base Sepolia (84532)
Duration: 2 weeks minimum

Test Cases:
1. Create subscription with daily period
2. Wait for automatic charge
3. Cancel from wallet and verify backend sync
4. Test with insufficient funds
5. Test with multiple subscriptions
6. Load testing with concurrent charges
```

### 5. Performance Testing
- Load test: 100 concurrent subscription creations
- Stress test: 1000 subscriptions charging simultaneously
- Measure API response times (target: <500ms)
- Database query optimization
- Monitor gas costs per charge

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
**Goal**: Setup infrastructure and database

Tasks:
- [ ] Add dependencies to frontend and backend
- [ ] Create Prisma schema for subscriptions
- [ ] Run migrations on test database
- [ ] Setup Base SDK client on backend
- [ ] Create wallet client with private key management
- [ ] Setup environment variables
- [ ] Create basic API structure

Deliverables:
- Database schema migrated
- Backend API skeleton created
- Base SDK configured and tested
- Environment setup documented

### Phase 2: Backend Core (Week 3-4)
**Goal**: Implement subscription management API

Tasks:
- [ ] Implement subscription CRUD endpoints
- [ ] Create subscription service layer
- [ ] Add status checking functionality
- [ ] Implement transaction recording
- [ ] Add error handling and logging
- [ ] Write unit tests for services
- [ ] Document API endpoints

Deliverables:
- Functional API endpoints
- Test coverage >80%
- API documentation (Swagger/Postman)
- Integration tests passing

### Phase 3: Charging Service (Week 5-6)
**Goal**: Implement automatic charging

Tasks:
- [ ] Create charging service module
- [ ] Setup cron job scheduler
- [ ] Implement charge preparation logic
- [ ] Add transaction execution
- [ ] Handle retry logic
- [ ] Create monitoring dashboard
- [ ] Test on Base Sepolia with real charges

Deliverables:
- Working cron job
- Successful test charges on testnet
- Monitoring in place
- Error handling tested

### Phase 4: Frontend UI (Week 7-8)
**Goal**: Build user-facing interface

Tasks:
- [ ] Create subscription components
- [ ] Implement subscription creation flow
- [ ] Build subscription dashboard
- [ ] Add subscription management features
- [ ] Create transaction history view
- [ ] Implement real-time status updates
- [ ] Add mobile responsive design
- [ ] Write component tests

Deliverables:
- Complete subscription UI
- User flows tested
- Mobile responsive
- Component tests passing

### Phase 5: Integration & Polish (Week 9-10)
**Goal**: Connect all pieces and refine

Tasks:
- [ ] Integrate with existing transaction system
- [ ] Connect with budget tracking
- [ ] Add analytics for subscriptions
- [ ] Implement notification system
- [ ] Polish UI/UX based on feedback
- [ ] Write end-to-end tests
- [ ] Performance optimization

Deliverables:
- Full integration complete
- E2E tests passing
- Performance benchmarks met
- User documentation

### Phase 6: Testnet Beta (Week 11-12)
**Goal**: Real-world testing with users

Tasks:
- [ ] Deploy to staging environment
- [ ] Invite beta testers
- [ ] Monitor real usage patterns
- [ ] Collect user feedback
- [ ] Fix bugs and issues
- [ ] Optimize based on data
- [ ] Security audit

Deliverables:
- Beta tested with 10+ users
- All critical bugs fixed
- Security audit completed
- Launch readiness checklist

### Phase 7: Mainnet Launch (Week 13)
**Goal**: Production deployment

Tasks:
- [ ] Deploy contracts (if any) to Base Mainnet
- [ ] Deploy backend to production
- [ ] Deploy frontend to production
- [ ] Switch to mainnet configuration
- [ ] Setup monitoring and alerts
- [ ] Create rollback plan
- [ ] Announce feature launch

Deliverables:
- Production deployment complete
- Monitoring dashboards live
- User documentation published
- Launch announcement

### Phase 8: Post-Launch (Week 14+)
**Goal**: Monitor and iterate

Tasks:
- [ ] Monitor subscription creation rates
- [ ] Track charging success rates
- [ ] Analyze user behavior
- [ ] Gather user feedback
- [ ] Plan v2 features
- [ ] Optimize costs
- [ ] Scale as needed

Deliverables:
- Weekly metrics reports
- User feedback summary
- Optimization recommendations
- Feature roadmap v2

---

## Rollout Plan

### Pre-Launch Checklist
- [ ] All tests passing (unit, integration, E2E)
- [ ] Security audit completed
- [ ] Load testing successful
- [ ] Documentation complete
- [ ] Monitoring setup
- [ ] Rollback procedure documented
- [ ] Support team trained
- [ ] Legal/compliance review (if needed)

### Launch Strategy
1. **Soft Launch**: Enable for 5% of users on mainnet
2. **Monitor**: Watch for 48 hours, check metrics
3. **Gradual Rollout**: Increase to 25%, then 50%, then 100%
4. **Feature Announcement**: Blog post, social media, email
5. **User Education**: Tutorials, help docs, FAQ

### Success Metrics
- **Adoption Rate**: 10% of users create at least one subscription in first month
- **Charge Success Rate**: >95% of charges complete successfully
- **API Uptime**: 99.9% availability
- **Average Response Time**: <500ms for API calls
- **User Satisfaction**: >4.0/5.0 rating for feature
- **Transaction Failure Rate**: <5%

### Monitoring & Alerts
```
Key Metrics to Track:
1. Subscription creation rate
2. Active subscriptions count
3. Charging success/failure rates
4. Average charge amount
5. API error rates
6. Database query performance
7. Gas costs per charge
8. User cancellation rate

Alerts:
- Charging failure rate >10%
- API error rate >5%
- Database connection issues
- Gas price spike >100 gwei
- Private key access attempts
```

---

## Risk Assessment

### Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Private key compromise | Critical | Low | Use KMS, rotation, monitoring |
| Base SDK breaking changes | High | Medium | Pin versions, test updates |
| Network congestion | Medium | Medium | Gas price monitoring, retry logic |
| Database performance | Medium | Low | Indexing, query optimization |
| Charging service downtime | High | Low | Redundancy, monitoring, alerts |

### Business Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Low adoption | Medium | Medium | User education, incentives |
| High gas costs | Medium | Medium | Optimize transactions, batch |
| Support burden | Low | Medium | Clear documentation, FAQ |
| Regulatory changes | High | Low | Legal review, compliance monitoring |

---

## Future Enhancements (V2)

### Potential Features
1. **Multi-Token Support**: Support tokens beyond USDC
2. **Flexible Amounts**: Allow users to adjust amounts per period
3. **Split Subscriptions**: Share subscription with multiple wallets
4. **Subscription Templates**: Pre-configured popular services
5. **Subscription Marketplace**: Discover new services
6. **Spending Limits**: Set maximum monthly subscription spend
7. **Automatic Budget Adjustment**: Adjust budgets based on subscriptions
8. **Smart Notifications**: AI-powered spending insights
9. **Subscription Optimization**: Suggest cheaper alternatives
10. **Group Subscriptions**: Family/team subscription management

---

## Appendix

### A. Useful Commands

```bash
# Database
npx prisma migrate dev --name add_subscriptions
npx prisma generate
npx prisma studio

# Testing
npm test -- subscriptions
npm run test:e2e -- subscriptions

# Deployment
npm run build
npm run deploy:staging
npm run deploy:production

# Monitoring
npm run logs:subscription-charges
npm run metrics:subscriptions
```

### B. Reference Links
- [Base Subscriptions Documentation](https://docs.base.org/base-account/guides/accept-recurring-payments/)
- [Base Account SDK](https://docs.base.org/base-account/reference/account-sdk/)
- [Spend Permissions Documentation](https://docs.base.org/base-account/guides/use-spend-permissions/)
- [Viem Documentation](https://viem.sh/)
- [Prisma Documentation](https://www.prisma.io/docs)

### C. Team Responsibilities

| Team Member | Responsibilities |
|-------------|------------------|
| Backend Developer | API, charging service, database |
| Frontend Developer | UI components, user flows |
| DevOps | Deployment, monitoring, infrastructure |
| Product Manager | Requirements, user testing, launch |
| Designer | UI/UX, user flows, documentation |
| QA | Testing, bug reporting, test automation |

### D. Questions to Resolve
1. What categories will be supported for subscriptions?
2. Should we support custom tokens or only USDC?
3. What is the maximum subscription amount we'll allow?
4. Should we offer subscription templates for popular services?
5. Do we need admin tools to manage subscriptions?
6. What analytics do we want to track?
7. Should we offer refunds for failed subscriptions?
8. How do we handle disputed charges?

---

## Conclusion

This implementation plan provides a comprehensive roadmap for integrating Base Subscriptions into Expendi V1. The phased approach allows for iterative development, thorough testing, and gradual rollout to minimize risks.

**Next Steps:**
1. Review and approve this plan
2. Assign team members to phases
3. Set up project tracking (Jira/Linear/GitHub Projects)
4. Begin Phase 1 implementation
5. Schedule regular check-ins and demos

**Estimated Timeline:** 13-14 weeks from start to production launch

**Questions or Feedback?** Please review this plan and provide comments on:
- Technical approach
- Timeline feasibility
- Resource allocation
- Feature priorities
- Risk assessment

---

*Document Version: 1.0*  
*Last Updated: October 18, 2025*  
*Author: AI Assistant*  
*Status: Awaiting Review*

