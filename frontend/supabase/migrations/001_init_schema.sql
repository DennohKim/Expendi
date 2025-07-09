-- Expendi Backend Database Schema
-- Migration 001: Initial schema setup

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table - Core user management
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  wallet_contract_address TEXT, -- Address of their deployed budget wallet
  email TEXT,
  username TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'UTC',
  notification_preferences JSONB DEFAULT '{
    "budget_alerts": true,
    "monthly_summaries": true,
    "transaction_confirmations": false,
    "marketing": false
  }',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_wallet_address ON users(wallet_address);
CREATE INDEX idx_users_wallet_contract ON users(wallet_contract_address);
CREATE INDEX idx_users_created_at ON users(created_at);

-- User analytics aggregated table
CREATE TABLE user_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Financial metrics
  total_spent NUMERIC(36, 18) DEFAULT 0,
  total_deposited NUMERIC(36, 18) DEFAULT 0,
  net_flow NUMERIC(36, 18) DEFAULT 0,
  
  -- Activity metrics
  buckets_count INTEGER DEFAULT 0,
  active_buckets_count INTEGER DEFAULT 0,
  transactions_count INTEGER DEFAULT 0,
  deposits_count INTEGER DEFAULT 0,
  withdrawals_count INTEGER DEFAULT 0,
  
  -- Insights
  most_used_bucket TEXT,
  largest_expense_amount NUMERIC(36, 18),
  largest_expense_bucket TEXT,
  spending_categories JSONB DEFAULT '{}',
  budget_utilization JSONB DEFAULT '{}', -- bucket_name -> utilization_percentage
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, period_type, period_start)
);

-- Create indexes for analytics queries
CREATE INDEX idx_analytics_user_period ON user_analytics(user_id, period_type, period_start);
CREATE INDEX idx_analytics_period_start ON user_analytics(period_start);

-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Notification details
  type TEXT NOT NULL CHECK (type IN (
    'budget_alert', 'budget_exceeded', 'monthly_summary', 
    'weekly_summary', 'transaction_large', 'bucket_empty',
    'insight_spending_pattern', 'insight_savings_opportunity'
  )),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT, -- Deep link for the notification
  
  -- Metadata
  data JSONB DEFAULT '{}', -- Additional context data
  
  -- Status
  read BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- Delivery tracking
  delivery_method TEXT[], -- ['push', 'email', 'in_app']
  delivery_status JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for notifications
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read) WHERE read = FALSE;
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Bucket insights table - Detailed bucket performance
CREATE TABLE bucket_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  bucket_name TEXT NOT NULL,
  month_year TEXT NOT NULL, -- 'YYYY-MM' format
  
  -- Budget tracking
  budgeted_amount NUMERIC(36, 18) NOT NULL DEFAULT 0,
  spent_amount NUMERIC(36, 18) NOT NULL DEFAULT 0,
  remaining_amount NUMERIC(36, 18) GENERATED ALWAYS AS (budgeted_amount - spent_amount) STORED,
  utilization_percentage NUMERIC(5, 2) GENERATED ALWAYS AS (
    CASE 
      WHEN budgeted_amount > 0 THEN ROUND((spent_amount / budgeted_amount) * 100, 2)
      ELSE 0 
    END
  ) STORED,
  
  -- Trend analysis
  trend_vs_previous_month NUMERIC(5, 2), -- Percentage change
  days_to_budget_exhaustion INTEGER, -- Predicted days until budget runs out
  
  -- Activity metrics
  transaction_count INTEGER DEFAULT 0,
  avg_transaction_amount NUMERIC(36, 18),
  largest_transaction_amount NUMERIC(36, 18),
  
  -- Pattern insights
  spending_pattern JSONB DEFAULT '{}', -- Day-wise or category-wise breakdown
  recommendations JSONB DEFAULT '[]', -- AI-generated recommendations
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, bucket_name, month_year)
);

-- Create indexes for bucket insights
CREATE INDEX idx_bucket_insights_user_month ON bucket_insights(user_id, month_year);
CREATE INDEX idx_bucket_insights_bucket ON bucket_insights(bucket_name);
CREATE INDEX idx_bucket_insights_utilization ON bucket_insights(utilization_percentage);

-- Event log table - Track all user actions for analytics
CREATE TABLE event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Event details
  event_type TEXT NOT NULL, -- 'wallet_connected', 'bucket_created', 'transaction_made', etc.
  event_name TEXT NOT NULL,
  
  -- Context
  blockchain_tx_hash TEXT, -- Link to blockchain transaction
  subgraph_entity_id TEXT, -- Link to subgraph entity
  
  -- Event data
  properties JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- Session tracking
  session_id TEXT,
  user_agent TEXT,
  ip_address INET,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for event logs
CREATE INDEX idx_event_logs_user_type ON event_logs(user_id, event_type);
CREATE INDEX idx_event_logs_created_at ON event_logs(created_at);
CREATE INDEX idx_event_logs_blockchain_tx ON event_logs(blockchain_tx_hash) WHERE blockchain_tx_hash IS NOT NULL;

-- Push notification subscriptions
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Web Push API details
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  
  -- Device/browser info
  user_agent TEXT,
  device_type TEXT, -- 'mobile', 'desktop', 'tablet'
  browser TEXT,
  
  -- Status
  active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, endpoint)
);

-- Create RLS (Row Level Security) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE bucket_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = id::text OR wallet_address = auth.jwt() ->> 'wallet_address');

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id::text OR wallet_address = auth.jwt() ->> 'wallet_address');

-- Analytics policies
CREATE POLICY "Users can view own analytics" ON user_analytics
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth.uid()::text = id::text));

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth.uid()::text = id::text));

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE auth.uid()::text = id::text));

-- Bucket insights policies
CREATE POLICY "Users can view own bucket insights" ON bucket_insights
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth.uid()::text = id::text));

-- Event logs policies
CREATE POLICY "Users can view own event logs" ON event_logs
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth.uid()::text = id::text));

-- Push subscriptions policies
CREATE POLICY "Users can manage own push subscriptions" ON push_subscriptions
  FOR ALL USING (user_id IN (SELECT id FROM users WHERE auth.uid()::text = id::text));

-- Create functions for analytics updates
CREATE OR REPLACE FUNCTION update_user_analytics()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_user_analytics();

CREATE TRIGGER update_analytics_updated_at
  BEFORE UPDATE ON user_analytics
  FOR EACH ROW EXECUTE FUNCTION update_user_analytics();

CREATE TRIGGER update_bucket_insights_updated_at
  BEFORE UPDATE ON bucket_insights
  FOR EACH ROW EXECUTE FUNCTION update_user_analytics();