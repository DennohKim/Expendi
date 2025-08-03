import { NextRequest, NextResponse } from 'next/server';

const PRETIUM_BASE_URI = process.env.PRETIUM_BASE_URI || 'https://api.xwift.africa';
const PRETIUM_API_KEY = process.env.PRETIUM_API_KEY || '';

interface StatusRequest {
  transaction_code: string;
}

interface StatusResponse {
  status: string;
  transaction_code: string;
  amount?: string;
  currency?: string;
  timestamp?: string;
  reference?: string;
  [key: string]: unknown;
}

async function makeStatusRequest(data: StatusRequest, currency?: string): Promise<StatusResponse> {
  const url = currency 
    ? `${PRETIUM_BASE_URI}/v1/status/${currency}`
    : `${PRETIUM_BASE_URI}/v1/status`;
    
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': PRETIUM_API_KEY,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Pretium status API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transaction_code, currency } = body;
    
    if (!transaction_code) {
      return NextResponse.json(
        { error: 'transaction_code is required' },
        { status: 400 }
      );
    }

    const statusData: StatusRequest = {
      transaction_code,
    };
    
    const result = await makeStatusRequest(statusData, currency);
    
    // Generate receipt data from status response
    const receipt = {
      ...result,
      generated_at: new Date().toISOString(),
      receipt_id: `receipt_${transaction_code}_${Date.now()}`,
    };
    
    return NextResponse.json(receipt);
  } catch (error) {
    console.error('Pretium status API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}