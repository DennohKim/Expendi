'use client'

import React, { useMemo } from 'react'
import { ApolloLink, HttpLink } from '@apollo/client'
import clientCookies from 'js-cookie'
import {
  ApolloNextAppProvider,
  InMemoryCache,
  ApolloClient,
  SSRMultipartLink,
} from '@apollo/client-integration-nextjs'
import { useChainId } from 'wagmi'

import { loadErrorMessages, loadDevMessages } from '@apollo/client/dev'
import { setVerbosity } from 'ts-invariant'
import { getNetworkConfig } from '@/lib/contracts/config'

if (process.env.NEXT_PUBLIC_NODE_ENV === 'development') {
  setVerbosity('debug')
  loadDevMessages()
  loadErrorMessages()
}

interface ApolloWrapperProps {
  children: React.ReactNode;
  delay: number;
}

export function ApolloWrapper({ children, delay: delayProp }: ApolloWrapperProps) {
  const chainId = useChainId()
  
  // Create a new Apollo client when the chain changes
  const makeClient = useMemo(() => {
    return () => {
      const networkConfig = getNetworkConfig(chainId)
      
      const httpLink = new HttpLink({
        uri: networkConfig.SUBGRAPH_URL,
        fetchOptions: { cache: 'no-store' },
      })

      const delayLink = new ApolloLink((operation, forward) => {
        const delay =
          typeof window === 'undefined'
            ? delayProp
            : clientCookies.get('apollo-x-custom-delay') ?? delayProp
        operation.setContext(({ headers = {} }) => {
          return {
            headers: {
              ...headers,
              'x-custom-delay': delay,
            },
          }
        })

        return forward(operation)
      })
      
      const link =
        typeof window === 'undefined'
          ? ApolloLink.from([
              new SSRMultipartLink({
                stripDefer: false,
                cutoffDelay: 100,
              }),
              delayLink,
              httpLink,
            ])
          : ApolloLink.from([delayLink, httpLink])

      return new ApolloClient({
        cache: new InMemoryCache(),
        link,
      })
    }
  }, [chainId, delayProp]) // Recreate client when chain changes

  return (
    <ApolloNextAppProvider makeClient={makeClient}>
      {children}
    </ApolloNextAppProvider>
  )
}
