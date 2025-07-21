import { NextRequest, NextResponse } from 'next/server';

const PRETIUM_BASE_URI = process.env.PRETIUM_BASE_URI || 'https://api.xwift.africa';
const PRETIUM_API_KEY = process.env.PRETIUM_API_KEY || '';
const SETTLEMENT_ADDRESS = '0x8005ee53E57aB11E11eAA4EFe07Ee3835Dc02F98';

interface PayRequest extends Record<string, unknown> {
  transaction_hash: string;
  amount: string;
  shortcode: string;
  type: 'MOBILE' | 'PAYBILL' | 'BUY_GOODS';
  mobile_network?: string;
  callback_url?: string;
  chain?: string;
}

async function makeRequest(endpoint: string, data: Record<string, unknown>, currency?: string) {
  const url = currency 
    ? `${PRETIUM_BASE_URI}/v1/${endpoint}/${currency}`
    : `${PRETIUM_BASE_URI}/v1/${endpoint}`;
    
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
    const body = await request.json();
    
    // This should be a direct pay request according to Pretium API docs
    const requestData: PayRequest = {
      ...body,
      chain: body.chain || 'BASE', // Default chain as per updated docs
    };
    
    const result = await makeRequest('pay', requestData);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Pretium API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Pretium API integration',
    endpoints: ['exchange-rate', 'validation', 'pay'],
    settlement_address: SETTLEMENT_ADDRESS,
  });
}