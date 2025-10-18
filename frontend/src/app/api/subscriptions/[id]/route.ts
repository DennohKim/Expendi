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

// GET /api/subscriptions/[id] - Get subscription details
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

    const result = await makeBackendRequest(`/${params.id}`, { method: 'GET' }, userId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Get subscription details error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch subscription details' 
      },
      { status: 500 }
    );
  }
}

// PATCH /api/subscriptions/[id] - Update subscription
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 401 }
      );
    }

    const result = await makeBackendRequest(
      `/${params.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      },
      userId
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Update subscription error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update subscription' 
      },
      { status: 500 }
    );
  }
}

// DELETE /api/subscriptions/[id] - Cancel subscription
export async function DELETE(
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

    const result = await makeBackendRequest(`/${params.id}`, { method: 'DELETE' }, userId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to cancel subscription' 
      },
      { status: 500 }
    );
  }
}