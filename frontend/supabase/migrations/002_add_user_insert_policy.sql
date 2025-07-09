-- Add INSERT policy for users table
-- This allows new users to be created when connecting their wallets

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can create profile" ON users;

-- Recreate policies with INSERT support
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (
    auth.uid()::text = id::text OR 
    wallet_address = auth.jwt() ->> 'wallet_address'
  );

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (
    auth.uid()::text = id::text OR 
    wallet_address = auth.jwt() ->> 'wallet_address'
  );

-- Allow INSERT for new users (this is the key missing policy)
CREATE POLICY "Users can create profile" ON users
  FOR INSERT WITH CHECK (true);

-- Also allow service role to perform all operations (for API endpoints)
CREATE POLICY "Service role can manage users" ON users
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role'); 