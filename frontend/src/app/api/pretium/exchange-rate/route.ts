import { NextRequest, NextResponse } from 'next/server';

const PRETIUM_BASE_URI = process.env.PRETIUM_BASE_URI || 'https://api.xwift.africa';
const PRETIUM_API_KEY = process.env.PRETIUM_API_KEY || '';

interface ExchangeRateRequest extends Record<string, unknown> {
  currency_code: string;
}

async function makeRequest(endpoint: string, data: Record<string, unknown>) {
  const url = `${PRETIUM_BASE_URI}/v1/${endpoint}`;
    
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': PRETIUM_API_KEY,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Pretium API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function POST(request: NextRequest) {
  try {
    const body: ExchangeRateRequest = await request.json();
    
    const result = await makeRequest('exchange-rate', body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Pretium exchange rate API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}