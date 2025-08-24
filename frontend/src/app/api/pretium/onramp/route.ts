import { NextRequest, NextResponse } from 'next/server';

const PRETIUM_BASE_URI = process.env.PRETIUM_BASE_URI || 'https://api.xwift.africa';
const PRETIUM_API_KEY = process.env.PRETIUM_API_KEY || '';

interface OnrampRequest extends Record<string, unknown> {
  shortcode: string;
  amount: number;
  fee?: number;
  type?: string;
  mobile_network: string;
  callback_url?: string;
  chain: string;
  asset: string;
  address: string;
}

async function makeOnrampRequest(currency: string, data: Record<string, unknown>) {
  const url = `${PRETIUM_BASE_URI}/v1/onramp/${currency}`;
    
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': PRETIUM_API_KEY,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Pretium onramp API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currency_code, ...onrampData } = body;
    
    const requestData: OnrampRequest = {
      ...onrampData,
      chain: body.chain || 'BASE',
      asset: body.asset || 'USDC',
    };
    
    const result = await makeOnrampRequest(currency_code, requestData);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Pretium onramp API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}