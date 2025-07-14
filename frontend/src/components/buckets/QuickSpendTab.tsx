import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const QuickSpendTab = () => {
  return (
    <Tabs defaultValue="quick-spend" className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="quick-spend">Quick Spend</TabsTrigger>
        <TabsTrigger value="create-bucket">Create Bucket</TabsTrigger>
      </TabsList>
      <TabsContent value="quick-spend">Quick Spend</TabsContent>
      <TabsContent value="create-bucket">Create Bucket</TabsContent>
    </Tabs>
  )
}

export default QuickSpendTab
