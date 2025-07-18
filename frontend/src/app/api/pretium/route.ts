import { NextRequest, NextResponse } from 'next/server';

const PRETIUM_BASE_URI = process.env.PRETIUM_BASE_URI || 'https://api.xwift.africa';
const PRETIUM_API_KEY = process.env.PRETIUM_API_KEY || '';
const SETTLEMENT_ADDRESS = '0x8005ee53E57aB11E11eAA4EFe07Ee3835Dc02F98';

interface ExchangeRateRequest {
  currency_code: string;
}

interface ValidationRequest {
  type: 'MOBILE' | 'PAYBILL' | 'BUY_GOODS';
  shortcode: string;
  mobile_network: 'Safaricom' | 'Airtel' | 'MTN' | 'AirtelTigo' | 'Telcel';
}

interface PayRequest {
  transaction_hash: string;
  amount: string;
  shortcode: string;
  type: 'MOBILE' | 'PAYBILL' | 'BUY_GOODS';
  mobile_network?: string;
  callback_url?: string;
  chain?: string;
}

async function makeRequest(endpoint: string, data: any, currency?: string) {
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
    const { action, ...data } = body;

    switch (action) {
      case 'exchange-rate': {
        const requestData: ExchangeRateRequest = data;
        const result = await makeRequest('exchange-rate', requestData);
        return NextResponse.json(result);
      }

      case 'validation': {
        const requestData: ValidationRequest = data;
        const currency = data.currency_code || 'KES'; // Default to KES for Kenya
        const result = await makeRequest('validation', requestData, currency !== 'KES' ? currency : undefined);
        return NextResponse.json(result);
      }

      case 'pay': {
        const requestData: PayRequest = {
          ...data,
          chain: data.chain || 'base', // Default chain
        };
        const result = await makeRequest('pay', requestData);
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: exchange-rate, validation, or pay' },
          { status: 400 }
        );
    }
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