import { useQuery } from '@tanstack/react-query';

interface ExchangeRateResponse {
  data: {
    buying_rate: number;
  };
}

async function fetchExchangeRate(currency: string): Promise<number | null> {
  try {
    const response = await fetch('/api/pretium/exchange-rate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currency_code: currency.toUpperCase() }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ExchangeRateResponse = await response.json();
    
    if (result.data && result.data.buying_rate) {
      return result.data.buying_rate;
    }

    return null;
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    throw error;
  }
}

export function useExchangeRate(currency: string) {
  return useQuery({
    queryKey: ['exchange-rate', currency.toUpperCase()],
    queryFn: () => fetchExchangeRate(currency),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 3,
    refetchOnWindowFocus: false,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}