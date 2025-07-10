# Environment Setup Guide

This guide will help you set up the required environment variables for the Expendi frontend to work properly.

## Required Environment Variables

Create a `.env.local` file in the `frontend` directory with the following variables:

### 1. Privy Configuration (Required)
```bash
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here
```
**How to get it:**
1. Go to [privy.io](https://privy.io)
2. Create an account or sign in
3. Create a new app
4. Copy the App ID from your dashboard



### 2. WalletConnect Configuration (Required)
```bash
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id_here
```
**How to get it:**
1. Go to [walletconnect.com](https://walletconnect.com)
2. Create an account or sign in
3. Create a new project
4. Copy the Project ID

### 3. Supabase Configuration (Required)
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```
**How to get it:**
1. Go to [supabase.com](https://supabase.com)
2. Create an account or sign in
3. Create a new project
4. Go to Settings → API
5. Copy the following:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Anon/Public Key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Service Role Key → `SUPABASE_SERVICE_ROLE_KEY`

### 4. Subgraph Configuration (Optional)
```bash
NEXT_PUBLIC_SUBGRAPH_URL=your_subgraph_url_here
```
**How to get it:**
1. This is optional - the app will work without it
2. If you have a deployed subgraph, use its query endpoint
3. Example: `https://api.studio.thegraph.com/query/your-subgraph-id/your-subgraph-name/version/v1`

### 5. Smart Contract Configuration (Required)
```bash
NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS=0x4525f41f2c49EB476E9e0f0fCac96Cc6eec16ea7
NEXT_PUBLIC_BUDGET_WALLET_ADDRESS=0x9b76D8eAdF1CA6e1cDc2ECb2Ac2df13Bf5CF068C
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_NETWORK_NAME=Base Sepolia
```
**Note:** These are the deployed contract addresses on Base Sepolia testnet.

### 1. Privy Configuration (Required)
```bash
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here
```
**How to get it:**
1. Go to [privy.io](https://privy.io)
2. Create an account or sign in
3. Create a new app
4. Copy the App ID from your dashboard

### 2. WalletConnect Configuration (Required)
```bash
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id_here
```
**How to get it:**
1. Go to [walletconnect.com](https://walletconnect.com)
2. Create an account or sign in
3. Create a new project
4. Copy the Project ID

### 3. Supabase Configuration (Required)
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```
**How to get it:**
1. Go to [supabase.com](https://supabase.com)
2. Create an account or sign in
3. Create a new project
4. Go to Settings → API
5. Copy the following:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Anon/Public Key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Service Role Key → `SUPABASE_SERVICE_ROLE_KEY`

### 4. Subgraph Configuration (Optional)
```bash
NEXT_PUBLIC_SUBGRAPH_URL=your_subgraph_url_here
```
**How to get it:**
1. This is optional - the app will work without it
2. If you have a deployed subgraph, use its query endpoint
3. Example: `https://api.studio.thegraph.com/query/your-subgraph-id/your-subgraph-name/version/v1`

## Complete Example `.env.local` File

```bash
# Privy Configuration
NEXT_PUBLIC_PRIVY_APP_ID=clm1234567890abcdef

# WalletConnect Configuration
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=abcdef1234567890

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Subgraph Configuration (Optional)
NEXT_PUBLIC_SUBGRAPH_URL=https://api.studio.thegraph.com/query/12345/expendi-subgraph/v1
```

## Testing Your Setup

1. After creating the `.env.local` file, restart your development server:
   ```bash
   npm run dev
   ```

2. If you see a red error screen with "Configuration Error", check your Privy App ID.

3. If you see the loading spinner indefinitely, check your Supabase configuration.

4. If you get "Error fetching dashboard data", check all environment variables are correctly set.

## Troubleshooting

- **Privy not loading**: Check `NEXT_PUBLIC_PRIVY_APP_ID` is correct
- **Database errors**: Check Supabase URL and keys are correct
- **Subgraph warnings**: This is normal if you haven't deployed a subgraph yet
- **WalletConnect issues**: Check your project ID and ensure it's active

## Security Notes

- Never commit your `.env.local` file to version control
- Only `NEXT_PUBLIC_*` variables are exposed to the browser
- The `SUPABASE_SERVICE_ROLE_KEY` is only used in API routes (server-side) 