import { unstable_cache } from 'next/cache';

interface ExchangeRateResponse {
  data: {
    buying_rate: number;
  };
}

const CACHE_TAG = 'exchange-rate';
const CACHE_REVALIDATE = 300; // 5 minutes

async function fetchExchangeRateFromAPI(currency: string): Promise<number | null> {
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
    return null;
  }
}

export const getCachedExchangeRate = unstable_cache(
  async (currency: string) => {
    return await fetchExchangeRateFromAPI(currency);
  },
  ['exchange-rate'],
  {
    tags: [CACHE_TAG],
    revalidate: CACHE_REVALIDATE,
  }
);

export async function revalidateExchangeRate() {
  const { revalidateTag } = await import('next/cache');
  revalidateTag(CACHE_TAG);
}