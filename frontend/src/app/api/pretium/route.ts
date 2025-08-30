import { NextRequest, NextResponse } from 'next/server';

const PRETIUM_BASE_URI = process.env.PRETIUM_BASE_URI || 'https://api.xwift.africa';
const PRETIUM_API_KEY = process.env.PRETIUM_API_KEY || '';
const SETTLEMENT_ADDRESS = '0x8005ee53E57aB11E11eAA4EFe07Ee3835Dc02F98';

interface PayRequest extends Record<string, unknown> {
  transaction_hash: string;
  amount: string;
  shortcode: string;
  fee?: string;
  account_number?: string; // Required for PAYBILL in KES
  type: 'MOBILE' | 'PAYBILL' | 'BUY_GOODS';
  mobile_network?: string;
  callback_url?: string;
  chain?: string;
  selectedCountry?: 'KES' | 'UGX' | 'GHS' | 'CDF' | 'ETB';
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
    const { selectedCountry, ...payData } = body;
    
    // Enhanced logging for production debugging
    console.log('Pretium API request body:', JSON.stringify(body, null, 2));
    console.log('Selected country:', selectedCountry);
    
    // This should be a direct pay request according to Pretium API docs
    const requestData: Omit<PayRequest, 'selectedCountry'> = {
      ...payData,
      fee: body.fee || '10',
      chain: body.chain || 'BASE', // Default chain as per updated docs
    };
    
    // If amount is above 990 and no fee is explicitly provided, ensure fee is set to 10
    if (parseFloat(body.amount) > 990 && !body.fee) {
      requestData.fee = '10';
    }
    
    console.log('Request data being sent to Pretium:', JSON.stringify(requestData, null, 2));
    
    // Use selectedCountry to determine currency code for endpoint (for non-Kenya countries)
    const currency = selectedCountry && selectedCountry !== 'KES' ? selectedCountry : undefined;
    
    console.log('Currency for endpoint:', currency);
    console.log('Pretium base URI:', PRETIUM_BASE_URI);
    
    const result = await makeRequest('pay', requestData, currency);
    
    console.log('Pretium API response:', JSON.stringify(result, null, 2));
    console.log('Transaction code in response:', result.transaction_code);
    
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