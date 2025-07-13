// // API endpoint to sync user data between subgraph and Supabase
// import { NextRequest, NextResponse } from 'next/server';
// import { ExpendiBridgeService } from '@/lib/services/expendi-bridge';

// const bridgeService = new ExpendiBridgeService(
//   process.env.SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!,
//   process.env.NEXT_PUBLIC_SUBGRAPH_URL!
// );

// export async function POST(request: NextRequest) {
//   try {
//     const { walletAddress, userId, walletContractAddress } = await request.json();

//     if (!walletAddress) {
//       return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
//     }

//     // Sync user data
//     let user;
//     if (userId) {
//       // User already exists, just sync blockchain data
//       await bridgeService.syncUserBlockchainData(userId, walletAddress);
//       user = { id: userId };
//     } else {
//       // Create new user and sync data
//       user = await bridgeService.syncUserFromWallet(
//         walletAddress,
//         walletContractAddress
//       );
//     }

//     return NextResponse.json({ 
//       success: true, 
//       userId: user.id,
//       message: 'User data synced successfully' 
//     });

//   } catch (error) {
//     console.error('Sync user API error:', error);
//     return NextResponse.json({ 
//       error: 'Failed to sync user data',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     }, { status: 500 });
//   }
// }