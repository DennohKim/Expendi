-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Events table to store all indexed blockchain events
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    contract_address VARCHAR(42) NOT NULL,
    event_name VARCHAR(100) NOT NULL,
    block_number BIGINT NOT NULL,
    block_hash VARCHAR(66) NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    transaction_index INTEGER NOT NULL,
    log_index INTEGER NOT NULL,
    event_data JSONB NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexer status table to track processing state
CREATE TABLE IF NOT EXISTS indexer_status (
    id SERIAL PRIMARY KEY,
    contract_address VARCHAR(42) NOT NULL UNIQUE,
    last_processed_block BIGINT NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Wallet registry table for tracking deployed wallets
CREATE TABLE IF NOT EXISTS wallet_registry (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) NOT NULL UNIQUE,
    user_address VARCHAR(42) NOT NULL,
    template_address VARCHAR(42) NOT NULL,
    factory_address VARCHAR(42) NOT NULL,
    deployment_block BIGINT NOT NULL,
    deployment_tx_hash VARCHAR(66) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Buckets table for budget wallet buckets
CREATE TABLE IF NOT EXISTS buckets (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) NOT NULL,
    bucket_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    monthly_limit DECIMAL(78, 0) NOT NULL, -- Support for uint256
    token_address VARCHAR(42) NOT NULL,
    created_block BIGINT NOT NULL,
    created_tx_hash VARCHAR(66) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(wallet_address, bucket_id)
);

-- Spending records table
CREATE TABLE IF NOT EXISTS spending_records (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) NOT NULL,
    bucket_id BIGINT NOT NULL,
    amount DECIMAL(78, 0) NOT NULL,
    recipient VARCHAR(42) NOT NULL,
    token_address VARCHAR(42) NOT NULL,
    block_number BIGINT NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Delegate permissions table
CREATE TABLE IF NOT EXISTS delegate_permissions (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) NOT NULL,
    delegate_address VARCHAR(42) NOT NULL,
    bucket_id BIGINT NOT NULL,
    can_spend BOOLEAN NOT NULL,
    updated_block BIGINT NOT NULL,
    updated_tx_hash VARCHAR(66) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(wallet_address, delegate_address, bucket_id)
);

-- Token transfers table (for USDC and other tokens)
CREATE TABLE IF NOT EXISTS token_transfers (
    id SERIAL PRIMARY KEY,
    token_address VARCHAR(42) NOT NULL,
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42) NOT NULL,
    amount DECIMAL(78, 0) NOT NULL,
    block_number BIGINT NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    log_index INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Withdrawals table for unallocated and emergency withdrawals
CREATE TABLE IF NOT EXISTS withdrawals (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) NOT NULL,
    user_address VARCHAR(42) NOT NULL,
    recipient_address VARCHAR(42) NOT NULL,
    token_address VARCHAR(42) NOT NULL,
    amount DECIMAL(78, 0) NOT NULL,
    withdrawal_type VARCHAR(50) NOT NULL, -- 'unallocated' or 'emergency'
    block_number BIGINT NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    log_index INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_events_contract_address ON events(contract_address);
CREATE INDEX IF NOT EXISTS idx_events_event_name ON events(event_name);
CREATE INDEX IF NOT EXISTS idx_events_block_number ON events(block_number);
CREATE INDEX IF NOT EXISTS idx_events_transaction_hash ON events(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_processed ON events(processed);

CREATE INDEX IF NOT EXISTS idx_wallet_registry_user_address ON wallet_registry(user_address);
CREATE INDEX IF NOT EXISTS idx_wallet_registry_deployment_block ON wallet_registry(deployment_block);

CREATE INDEX IF NOT EXISTS idx_buckets_wallet_address ON buckets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_buckets_token_address ON buckets(token_address);
CREATE INDEX IF NOT EXISTS idx_buckets_is_active ON buckets(is_active);

CREATE INDEX IF NOT EXISTS idx_spending_records_wallet_address ON spending_records(wallet_address);
CREATE INDEX IF NOT EXISTS idx_spending_records_bucket_id ON spending_records(bucket_id);
CREATE INDEX IF NOT EXISTS idx_spending_records_token_address ON spending_records(token_address);
CREATE INDEX IF NOT EXISTS idx_spending_records_timestamp ON spending_records(timestamp);

CREATE INDEX IF NOT EXISTS idx_delegate_permissions_wallet_address ON delegate_permissions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_delegate_permissions_delegate_address ON delegate_permissions(delegate_address);

CREATE INDEX IF NOT EXISTS idx_token_transfers_token_address ON token_transfers(token_address);
CREATE INDEX IF NOT EXISTS idx_token_transfers_from_address ON token_transfers(from_address);
CREATE INDEX IF NOT EXISTS idx_token_transfers_to_address ON token_transfers(to_address);
CREATE INDEX IF NOT EXISTS idx_token_transfers_block_number ON token_transfers(block_number);

CREATE INDEX IF NOT EXISTS idx_withdrawals_wallet_address ON withdrawals(wallet_address);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_address ON withdrawals(user_address);
CREATE INDEX IF NOT EXISTS idx_withdrawals_recipient_address ON withdrawals(recipient_address);
CREATE INDEX IF NOT EXISTS idx_withdrawals_token_address ON withdrawals(token_address);
CREATE INDEX IF NOT EXISTS idx_withdrawals_withdrawal_type ON withdrawals(withdrawal_type);
CREATE INDEX IF NOT EXISTS idx_withdrawals_timestamp ON withdrawals(timestamp);
CREATE INDEX IF NOT EXISTS idx_withdrawals_block_number ON withdrawals(block_number);

-- Trigger function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_buckets_updated_at BEFORE UPDATE ON buckets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_delegate_permissions_updated_at BEFORE UPDATE ON delegate_permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();