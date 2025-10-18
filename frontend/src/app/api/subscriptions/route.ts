import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

async function makeBackendRequest(
  endpoint: string,
  options: RequestInit = {},
  userId?: string
) {
  const url = `${BACKEND_URL}/api/subscriptions${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  // Add user ID header if provided
  if (userId) {
    headers['x-user-id'] = userId;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Backend API error response:', errorText);
    throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// GET /api/subscriptions - Get user subscriptions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = request.headers.get('x-user-id') || searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 401 }
      );
    }

    // Build query parameters
    const params = new URLSearchParams();
    if (searchParams.get('status')) params.append('status', searchParams.get('status')!);
    if (searchParams.get('category')) params.append('category', searchParams.get('category')!);
    if (searchParams.get('limit')) params.append('limit', searchParams.get('limit')!);
    if (searchParams.get('offset')) params.append('offset', searchParams.get('offset')!);

    const queryString = params.toString();
    const endpoint = queryString ? `?${queryString}` : '';

    const result = await makeBackendRequest(endpoint, { method: 'GET' }, userId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Get subscriptions error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch subscriptions' 
      },
      { status: 500 }
    );
  }
}

// POST /api/subscriptions - Create new subscription
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = request.headers.get('x-user-id') || body.userId;
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 401 }
      );
    }

    // Remove userId from body if present (it goes in header)
    const { userId: _, ...subscriptionData } = body;

    const result = await makeBackendRequest(
      '',
      {
        method: 'POST',
        body: JSON.stringify(subscriptionData),
      },
      userId
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Create subscription error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create subscription' 
      },
      { status: 500 }
    );
  }
}