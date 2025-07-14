import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CreateBucket } from './CreateBucket'
import { QuickSpendBucket } from './QuickSpendBucket'
import { Bucket } from '@/hooks/subgraph-queries/getAllTransactions'

const QuickSpendTab = ({ bucket }: { bucket: Bucket[] }) => {
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
