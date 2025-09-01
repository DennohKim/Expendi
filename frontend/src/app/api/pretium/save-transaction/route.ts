import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate that we have a successful Pretium response
    if (!body.code || !body.data) {
      return NextResponse.json(
        { success: false, error: 'Invalid Pretium response format' },
        { status: 400 }
      );
    }

    // Get backend URL from environment variable
    const backendUrl = 'https://expendi-production-ab42.up.railway.app';
    
    // Forward the entire Pretium response to our backend
    const response = await fetch(`${backendUrl}/api/pretium/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('Backend save failed:', errorData);
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to save transaction to backend',
          details: errorData 
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    
    return NextResponse.json({
      success: true,
      message: 'Transaction saved successfully',
      data: result.data
    });

  } catch (error) {
    console.error('Error saving Pretium transaction:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error while saving transaction' 
      },
      { status: 500 }
    );
  }
}