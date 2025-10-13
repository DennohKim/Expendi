import { Resend } from 'resend';
import { NextRequest, NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { 
      userEmail, 
      transactionType, 
      amount, 
      currency,
      transactionHash,
      status,
      timestamp,
      userName,
      shortcode,
      receiptNumber,
      publicName,
      accountNumber
    } = await request.json();

    // Validate required fields
    if (!userEmail || !transactionType || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: userEmail, transactionType, amount' },
        { status: 400 }
      );
    }

    const { data, error } = await resend.emails.send({
      from: 'Expendi <onboarding@resend.dev>',
      to: [userEmail],
      subject: `Transaction ${status === 'success' ? 'Completed' : 'Update'} - ${currency || 'USD'} ${amount} ${transactionType}`,
      html: generateTransactionEmailTemplate({
        userName: userName || 'User',
        transactionType,
        amount,
        currency: currency || 'USD',
        transactionHash,
        status: status || 'completed',
        timestamp: timestamp || new Date().toISOString(),
        shortcode,
        receiptNumber,
        publicName,
        accountNumber,
      }),
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, emailId: data?.id });
  } catch (error) {
    console.error('Error sending transaction email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateTransactionEmailTemplate({
  userName,
  transactionType,
  amount,
  currency,
  transactionHash,
  status,
  timestamp,
  shortcode,
  receiptNumber,
  publicName,
  accountNumber,
}: {
  userName: string;
  transactionType: string;
  amount: string | number;
  currency: string;
  transactionHash?: string;
  status: string;
  timestamp: string;
  shortcode?: string;
  receiptNumber?: string;
  publicName?: string;
  accountNumber?: string;
}) {
  const formattedDate = new Date(timestamp).toLocaleString();
  const statusColor = status === 'success' ? '#12b76a' : status === 'pending' ? '#f79009' : '#f04438';
  const statusText = status === 'success' ? 'Completed Successfully' : 
                     status === 'pending' ? 'Pending' : 'Failed';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Transaction ${statusText}</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 300;">Expendi</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Smart Budget Management</p>
        </div>
        
        <div style="background: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-top: 0; font-size: 24px;">Hi ${userName}!</h2>
          
          <p style="font-size: 16px; margin-bottom: 30px;">
            Your ${transactionType.toLowerCase()} transaction has been <strong style="color: ${statusColor};">${statusText.toLowerCase()}</strong>.
          </p>
          
          <div style="background: #f8fafc; padding: 25px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #374151; font-size: 18px;">Transaction Details</h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; font-weight: 600; color: #6b7280;">Type:</td>
                <td style="padding: 12px 0; text-transform: capitalize;">${transactionType}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; font-weight: 600; color: #6b7280;">Amount:</td>
                <td style="padding: 12px 0; font-size: 18px; font-weight: 600; color: #1f2937;">${currency} ${amount}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; font-weight: 600; color: #6b7280;">Status:</td>
                <td style="padding: 12px 0;">
                  <span style="background: ${statusColor}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 500;">
                    ${statusText}
                  </span>
                </td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; font-weight: 600; color: #6b7280;">Date:</td>
                <td style="padding: 12px 0;">${formattedDate}</td>
              </tr>
              ${shortcode ? `
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; font-weight: 600; color: #6b7280;">Phone Number:</td>
                <td style="padding: 12px 0; font-weight: 600;">${shortcode}</td>
              </tr>
              ` : ''}
              ${publicName ? `
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; font-weight: 600; color: #6b7280;">Recipient:</td>
                <td style="padding: 12px 0; text-transform: capitalize;">${publicName}</td>
              </tr>
              ` : ''}
              ${accountNumber ? `
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; font-weight: 600; color: #6b7280;">Account Number:</td>
                <td style="padding: 12px 0; font-family: monospace;">${accountNumber}</td>
              </tr>
              ` : ''}
              ${receiptNumber ? `
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; font-weight: 600; color: #6b7280;">Receipt Number:</td>
                <td style="padding: 12px 0; font-family: monospace; font-weight: 600; color: #059669;">${receiptNumber}</td>
              </tr>
              ` : ''}
              ${transactionHash ? `
              <tr>
                <td style="padding: 12px 0; font-weight: 600; color: #6b7280;">Transaction Hash:</td>
                <td style="padding: 12px 0; font-family: monospace; font-size: 14px; word-break: break-all;">
                  <a href="https://basescan.org/tx/${transactionHash}" style="color: #ff7e5f; text-decoration: none;" target="_blank">
                    ${transactionHash}
                  </a>
                </td>
              </tr>
              ` : ''}
            </table>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://expendi.io/transactions" 
               style="background: linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
              View All Transactions
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">
            Thank you for using Expendi for your budget management needs.
          </p>
          
          <p style="font-size: 14px; color: #6b7280;">
            If you have any questions, please don't hesitate to <a href="mailto:support@expendi.io" style="color: #ff7e5f;">contact our support team</a>.
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; font-size: 12px; color: #9ca3af;">
          <p>© 2024 Expendi. All rights reserved.</p>
          <p>
            <a href="https://expendi.io/unsubscribe" style="color: #6b7280; text-decoration: none;">Unsubscribe</a> | 
            <a href="https://expendi.io/privacy" style="color: #6b7280; text-decoration: none;">Privacy Policy</a>
          </p>
        </div>
      </body>
    </html>
  `;
}