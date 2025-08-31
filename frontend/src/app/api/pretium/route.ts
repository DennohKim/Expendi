
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
    const errorText = await response.text();
    console.error('Pretium API error response:', errorText);
    throw new Error(`Pretium API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { selectedCountry } = body;
    
    // Enhanced logging for production debugging
    console.log('Pretium API request body:', JSON.stringify(body, null, 2));
    console.log('Selected country:', selectedCountry);
    console.log('API Key loaded:', PRETIUM_API_KEY ? 'Yes' : 'No');
    
    // Build request data based on country requirements - only send fields that Pretium expects
    const requestData: Partial<PayRequest> = {
      transaction_hash: body.transaction_hash,
      amount: body.amount,
      fee: body.fee || '0', // No fee by default
      chain: body.chain || 'BASE',
      callback_url: body.callback_url || 'http://localhost:3000/api/pretium/callback',
    };

    // Add country-specific required fields based on Pretium API docs
    switch (selectedCountry) {
      case 'KES':
        requestData.shortcode = body.shortcode;
        requestData.type = body.type || 'MOBILE';
        requestData.mobile_network = body.mobile_network;
        // Only add account_number if it exists and type is PAYBILL
        if (body.account_number && body.type === 'PAYBILL') {
          requestData.account_number = body.account_number;
        }
        break;
      case 'NGN':
        requestData.account_number = body.account_number;
        requestData.account_name = body.account_name;
        requestData.bank_name = body.bank_name;
        requestData.bank_code = body.bank_code;
        break;
      case 'GHS':
      case 'UGX':
      case 'MWK':
      case 'ETB':
        requestData.shortcode = body.shortcode;
        requestData.mobile_network = body.mobile_network;
        break;
      case 'CDF':
        // DR Congo - no additional required fields
        break;
      default:
        // For unknown countries, include common fields if they exist
        if (body.shortcode) requestData.shortcode = body.shortcode;
        if (body.mobile_network) requestData.mobile_network = body.mobile_network;
        if (body.account_number) requestData.account_number = body.account_number;
    }
    
    // Remove any undefined values to avoid sending them to the API
    Object.keys(requestData).forEach(key => {
      if (requestData[key] === undefined) {
        delete requestData[key];
      }
    });
    
    // Validate required fields before sending
    if (!requestData.transaction_hash) {
      throw new Error('transaction_hash is required');
    }
    if (!requestData.amount) {
      throw new Error('amount is required');
    }
    
    // Amount precision is now handled in the frontend to match USDC spent exactly
    
    console.log('Request data being sent to Pretium:', JSON.stringify(requestData, null, 2));
    console.log('Pretium base URI:', PRETIUM_BASE_URI);
    
    const result = await makeRequest('pay', requestData, undefined);
    
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