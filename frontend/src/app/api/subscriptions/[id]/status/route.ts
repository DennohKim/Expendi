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

// GET /api/subscriptions/[id]/status - Get subscription status from Base SDK
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 401 }
      );
    }

    const result = await makeBackendRequest(
      `/${params.id}/status`,
      { method: 'GET' },
      userId
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get subscription status error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get subscription status' 
      },
      { status: 500 }
    );
  }
}