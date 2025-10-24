'use client'

import React from 'react'
import { ApolloLink, HttpLink } from '@apollo/client'
import clientCookies from 'js-cookie'
import {
  ApolloNextAppProvider,
  InMemoryCache,
  ApolloClient,
  SSRMultipartLink,
} from '@apollo/client-integration-nextjs'

import { loadErrorMessages, loadDevMessages } from '@apollo/client/dev'
import { setVerbosity } from 'ts-invariant'

if (process.env.NEXT_PUBLIC_NODE_ENV === 'development') {
  setVerbosity('debug')
  loadDevMessages()
  loadErrorMessages()
}

const EXPENDI_SUBGRAPH_URL = "https://api.studio.thegraph.com/query/118246/expendi-base/version/latest"
const GOALZ_SUBGRAPH_URL = "https://api.studio.thegraph.com/query/1704348/goalz/v1.0.1"

export function UnifiedApolloWrapper({
  children,
  delay: delayProp,
}: React.PropsWithChildren<{
  delay: number;
}>) {
  return (
    <ApolloNextAppProvider makeClient={makeClient}>
      {children}
    </ApolloNextAppProvider>
  )

  function makeClient() {
    // Create separate HTTP links for each subgraph
    const expendiLink = new HttpLink({
      uri: EXPENDI_SUBGRAPH_URL,
      fetchOptions: { cache: 'no-store' },
    })

    const goalzLink = new HttpLink({
      uri: GOALZ_SUBGRAPH_URL,
      fetchOptions: { cache: 'no-store' },
    })

    // Route queries to the correct subgraph based on context
    const directionalLink = ApolloLink.split(
      (operation) => operation.getContext().subgraph === 'goalz',
      goalzLink,
      expendiLink // default to Expendi
    )

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
            directionalLink,
          ])
        : ApolloLink.from([delayLink, directionalLink])

    return new ApolloClient({
      cache: new InMemoryCache(),
      link,
    })
  }
}

