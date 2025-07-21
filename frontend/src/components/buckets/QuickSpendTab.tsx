import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CreateBucket } from './CreateBucket'
import { QuickSpendBucket } from './QuickSpendBucket'

interface TokenBalance {
  id: string;
  balance: string;
  token: {
    id: string;
    name: string;
    symbol: string;
    decimals: number;
  };
}

interface UserBucket {
  id: string;
  name: string;
  balance: string;
  monthlyLimit: string;
  monthlySpent: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  tokenBalances: TokenBalance[];
}

const QuickSpendTab = ({ bucket }: { bucket: UserBucket[] }) => {
  return (
    <Tabs defaultValue="quick-spend" className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="quick-spend">Quick Spend</TabsTrigger>
        <TabsTrigger value="create-bucket">Create Bucket</TabsTrigger>
      </TabsList>
      <TabsContent value="quick-spend">
        <QuickSpendBucket bucket={bucket} />
      </TabsContent>
      <TabsContent value="create-bucket">
        <CreateBucket />
      </TabsContent>
    </Tabs>
  )
}

export default QuickSpendTab
