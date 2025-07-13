// // Expendi Bridge Service - Connects Subgraph data with Supabase backend
// import { createClient } from '@supabase/supabase-js';
// import { GraphQLClient } from 'graphql-request';

// interface SubgraphUser {
//   id: string;
//   address: string;
//   totalBalance: string;
//   totalSpent: string;
//   bucketsCount: number;
//   buckets: SubgraphBucket[];
//   transactions: SubgraphTransaction[];
// }

// interface SubgraphBucket {
//   id: string;
//   name: string;
//   balance: string;
//   monthlySpent: string;
//   monthlyLimit: string;
//   active: boolean;
//   createdAt: string;
//   updatedAt: string;
// }

// interface SubgraphTransaction {
//   id: string;
//   amount: string;
//   token: { symbol: string; name: string };
//   timestamp: string;
//   bucket: { name: string };
// }

// interface NotificationTrigger {
//   type: string;
//   priority: 'low' | 'medium' | 'high' | 'urgent';
//   title: string;
//   message: string;
//   data: Record<string, any>;
// }

// export class ExpendiBridgeService {
//   private supabase;
//   private subgraphClient;

//   constructor(
//     supabaseUrl: string,
//     supabaseServiceKey: string,
//     subgraphUrl: string
//   ) {
//     this.supabase = createClient(supabaseUrl, supabaseServiceKey);
//     this.subgraphClient = new GraphQLClient(subgraphUrl);
//   }

//   /**
//    * Sync user from wallet connection to Supabase
//    */
//   async syncUserFromWallet(
//     walletAddress: string,
//     walletContractAddress?: string,
//     userMetadata: {
//       email?: string;
//       username?: string;
//       avatar_url?: string;
//     } = {}
//   ) {
//     try {
//       // Check if user already exists
//       const { data: existingUser } = await this.supabase
//         .from('users')
//         .select('*')
//         .eq('wallet_address', walletAddress.toLowerCase())
//         .single();

//       if (existingUser) {
//         // Update existing user with contract address if provided
//         if (walletContractAddress) {
//           await this.supabase
//             .from('users')
//             .update({
//               wallet_contract_address: walletContractAddress,
//               last_active_at: new Date().toISOString(),
//               ...userMetadata
//             })
//             .eq('id', existingUser.id);
//         }
//         return existingUser;
//       }

//       // Create new user
//       const { data: newUser, error } = await this.supabase
//         .from('users')
//         .insert({
//           wallet_address: walletAddress.toLowerCase(),
//           wallet_contract_address: walletContractAddress,
//           ...userMetadata
//         })
//         .select()
//         .single();

//       if (error) throw error;

//       // Log user creation event
//       await this.logEvent(newUser.id, 'user_created', 'User registered', {
//         wallet_address: walletAddress,
//         wallet_contract_address: walletContractAddress
//       });

//       // Fetch and sync initial blockchain data
//       await this.syncUserBlockchainData(newUser.id, walletAddress);

//       return newUser;
//     } catch (error) {
//       console.error('Error syncing user from wallet:', error);
//       throw error;
//     }
//   }

//   /**
//    * Fetch user data from subgraph and sync to Supabase
//    */
//   async syncUserBlockchainData(userId: string, walletAddress: string) {
//     try {
//       const query = `
//         query GetUser($walletAddress: ID!) {
//           user(id: $walletAddress) {
//             id
//             address
//             totalBalance
//             totalSpent
//             bucketsCount
//             buckets {
//               id
//               name
//               balance
//               monthlySpent
//               monthlyLimit
//               active
//               createdAt
//               updatedAt
//             }
//             transactions(first: 100, orderBy: timestamp, orderDirection: desc) {
//               id
//               amount
//               token {
//                 symbol
//                 name
//               }
//               timestamp
//               bucket {
//                 name
//               }
//               ... on Deposit {
//                 type
//               }
//               ... on Withdrawal {
//                 type
//                 recipient
//               }
//             }
//           }
//         }
//       `;

//       const data = await this.subgraphClient.request<{ user: SubgraphUser }>(
//         query,
//         { walletAddress: walletAddress.toLowerCase() }
//       );

//       if (!data.user) {
//         console.log('User not found in subgraph yet');
//         return;
//       }

//       // Update user analytics
//       await this.updateUserAnalytics(userId, data.user);

//       // Update bucket insights
//       await this.updateBucketInsights(userId, data.user.buckets);

//       // Check for notification triggers
//       await this.checkNotificationTriggers(userId, data.user);

//       // Log sync event
//       await this.logEvent(userId, 'data_synced', 'Blockchain data synced', {
//         buckets_count: data.user.bucketsCount,
//         total_balance: data.user.totalBalance,
//         total_spent: data.user.totalSpent
//       });

//     } catch (error) {
//       console.error('Error syncing blockchain data:', error);
//       throw error;
//     }
//   }

//   /**
//    * Update user analytics based on subgraph data
//    */
//   private async updateUserAnalytics(userId: string, userData: SubgraphUser) {
//     const now = new Date();
//     const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
//     const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
//     const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

//     // Calculate this month's transactions
//     const thisMonthTransactions = userData.transactions.filter(tx => {
//       const txDate = new Date(parseInt(tx.timestamp) * 1000);
//       return txDate >= monthStart && txDate <= monthEnd;
//     });

//     const totalSpentThisMonth = thisMonthTransactions
//       .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

//     const depositsThisMonth = thisMonthTransactions
//       .filter(tx => (tx as any).type === 'DIRECT_DEPOSIT' || (tx as any).type === 'BUCKET_FUNDING')
//       .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

//     // Find most used bucket
//     const bucketUsage = thisMonthTransactions.reduce((acc, tx) => {
//       acc[tx.bucket.name] = (acc[tx.bucket.name] || 0) + 1;
//       return acc;
//     }, {} as Record<string, number>);

//     const mostUsedBucket = Object.keys(bucketUsage).length > 0 
//       ? Object.keys(bucketUsage).reduce((a, b) => 
//           bucketUsage[a] > bucketUsage[b] ? a : b
//         )
//       : null;

//     // Update or create analytics record
//     await this.supabase
//       .from('user_analytics')
//       .upsert({
//         user_id: userId,
//         period_type: 'monthly',
//         period_start: monthStart.toISOString().split('T')[0],
//         period_end: monthEnd.toISOString().split('T')[0],
//         total_spent: totalSpentThisMonth.toString(),
//         total_deposited: depositsThisMonth.toString(),
//         net_flow: (depositsThisMonth - totalSpentThisMonth).toString(),
//         buckets_count: userData.bucketsCount,
//         active_buckets_count: userData.buckets.filter(b => b.active).length,
//         transactions_count: thisMonthTransactions.length,
//         most_used_bucket: mostUsedBucket
//       }, { onConflict: 'user_id,period_type,period_start' });
//   }

//   /**
//    * Update bucket insights
//    */
//   private async updateBucketInsights(userId: string, buckets: SubgraphBucket[]) {
//     const now = new Date();
//     const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

//     for (const bucket of buckets) {
//       const utilization = parseFloat(bucket.monthlyLimit) > 0 
//         ? (parseFloat(bucket.monthlySpent) / parseFloat(bucket.monthlyLimit)) * 100 
//         : 0;

//       await this.supabase
//         .from('bucket_insights')
//         .upsert({
//           user_id: userId,
//           bucket_name: bucket.name,
//           month_year: monthKey,
//           budgeted_amount: bucket.monthlyLimit,
//           spent_amount: bucket.monthlySpent,
//           transaction_count: 0, // TODO: Get from subgraph
//           updated_at: new Date().toISOString()
//         }, { onConflict: 'user_id,bucket_name,month_year' });
//     }
//   }

//   /**
//    * Check for notification triggers based on user data
//    */
//   private async checkNotificationTriggers(userId: string, userData: SubgraphUser) {
//     const triggers: NotificationTrigger[] = [];

//     // Check for budget alerts
//     for (const bucket of userData.buckets) {
//       if (parseFloat(bucket.monthlyLimit) > 0) {
//         const utilization = (parseFloat(bucket.monthlySpent) / parseFloat(bucket.monthlyLimit)) * 100;
        
//         if (utilization >= 90) {
//           triggers.push({
//             type: 'budget_alert',
//             priority: 'high',
//             title: `Budget Alert: ${bucket.name}`,
//             message: `You've used ${utilization.toFixed(1)}% of your ${bucket.name} budget this month.`,
//             data: { bucket_name: bucket.name, utilization }
//           });
//         } else if (utilization >= 75) {
//           triggers.push({
//             type: 'budget_alert',
//             priority: 'medium',
//             title: `Budget Warning: ${bucket.name}`,
//             message: `You've used ${utilization.toFixed(1)}% of your ${bucket.name} budget this month.`,
//             data: { bucket_name: bucket.name, utilization }
//           });
//         }
//       }
//     }

//     // Create notifications
//     for (const trigger of triggers) {
//       await this.createNotification(userId, trigger);
//     }
//   }

//   /**
//    * Create a notification
//    */
//   async createNotification(userId: string, notification: NotificationTrigger) {
//     try {
//       // Check if similar notification already exists (prevent spam)
//       const { data: existing } = await this.supabase
//         .from('notifications')
//         .select('id')
//         .eq('user_id', userId)
//         .eq('type', notification.type)
//         .eq('read', false)
//         .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

//       if (existing && existing.length > 0) {
//         return; // Don't create duplicate notification
//       }

//       await this.supabase
//         .from('notifications')
//         .insert({
//           user_id: userId,
//           type: notification.type,
//           priority: notification.priority,
//           title: notification.title,
//           message: notification.message,
//           data: notification.data
//         });

//       // TODO: Send push notification if user has subscriptions

//     } catch (error) {
//       console.error('Error creating notification:', error);
//     }
//   }

//   /**
//    * Log user events for analytics
//    */
//   async logEvent(
//     userId: string,
//     eventType: string,
//     eventName: string,
//     properties: Record<string, any> = {},
//     blockchainTxHash?: string
//   ) {
//     try {
//       await this.supabase
//         .from('event_logs')
//         .insert({
//           user_id: userId,
//           event_type: eventType,
//           event_name: eventName,
//           properties,
//           blockchain_tx_hash: blockchainTxHash
//         });
//     } catch (error) {
//       console.error('Error logging event:', error);
//     }
//   }

//   /**
//    * Get user dashboard data combining Supabase and Subgraph
//    */
//   async getUserDashboard(userId: string, walletAddress: string) {
//     try {
//       // Get user profile and preferences from Supabase
//       const { data: user } = await this.supabase
//         .from('users')
//         .select(`
//           *,
//           notifications:notifications(count)
//         `)
//         .eq('id', userId)
//         .single();

//       // Get current month analytics
//       const now = new Date();
//       const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
//       const { data: analytics } = await this.supabase
//         .from('user_analytics')
//         .select('*')
//         .eq('user_id', userId)
//         .eq('period_type', 'monthly')
//         .gte('period_start', monthStart.toISOString().split('T')[0])
//         .single();

//       // Get real-time data from subgraph
//       const subgraphData = await this.subgraphClient.request<{ user: SubgraphUser }>(`
//         query GetUser($walletAddress: ID!) {
//           user(id: $walletAddress) {
//             id
//             totalBalance
//             bucketsCount
//             buckets {
//               name
//               balance
//               monthlySpent
//               monthlyLimit
//               active
//             }
//           }
//         }
//       `, { walletAddress: walletAddress.toLowerCase() });

//       return {
//         user,
//         analytics,
//         realTimeData: subgraphData.user,
//         insights: {
//           // Combine analytics with real-time data for insights
//           totalBalance: subgraphData.user?.totalBalance || '0',
//           monthlySpent: analytics?.total_spent || '0',
//           budgetUtilization: this.calculateBudgetUtilization(subgraphData.user?.buckets || [])
//         }
//       };

//     } catch (error) {
//       console.error('Error getting user dashboard:', error);
//       throw error;
//     }
//   }

//   private calculateBudgetUtilization(buckets: SubgraphBucket[]) {
//     return buckets.reduce((acc, bucket) => {
//       if (parseFloat(bucket.monthlyLimit) > 0) {
//         acc[bucket.name] = (parseFloat(bucket.monthlySpent) / parseFloat(bucket.monthlyLimit)) * 100;
//       }
//       return acc;
//     }, {} as Record<string, number>);
//   }
// }