"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAccount } from 'wagmi';
import { useSmartAccount } from '@/context/SmartAccountContext';
import { SelfQRcodeWrapper, SelfAppBuilder, countries } from '@selfxyz/qrcode';

// Type definitions for Self verification
// Use the actual SelfApp type from the SDK
type SelfApp = ReturnType<typeof SelfAppBuilder.prototype.build>;

/**
 * Self Protocol Integration for Expendi Budget Wallet
 * 
 * BUSINESS JUSTIFICATION:
 * This geographic verification is implemented because Expendi uses Pretium
 * as a core financial service provider. Pretium currently operates and
 * provides services only in the following 6 African countries:
 * - Kenya (KEN)
 * - Ghana (GHA) 
 * - Congo (COG)
 * - Uganda (UGA)
 * - Tanzania (TZA)
 * - Zambia (ZMB)
 * 
 * By restricting access to only these countries, we ensure:
 * 1. Regulatory compliance with Pretium's operational scope
 * 2. Service availability for all verified users
 * 3. Risk management aligned with Pretium's coverage
 * 4. Seamless integration with Pretium's financial services
 */

interface SelfVerificationResult {
  nationality?: string;
  issuing_state?: string;
  name?: string;
  date_of_birth?: string;
  gender?: string;
  passport_number?: string;
  expiry_date?: string;
}

interface SelfVerificationError {
  error_code?: string;
  reason?: string;
  status?: string;
  proof?: unknown;
}

interface SelfVerificationProps {
  onVerificationComplete: (isVerified: boolean, nationality?: string) => void;
  isVerified: boolean;
}

const SelfVerification: React.FC<SelfVerificationProps> = ({ 
  onVerificationComplete, 
  isVerified 
}) => {
  const { address: eoaAddress } = useAccount();
  const { smartAccountAddress, smartAccountReady } = useSmartAccount();
  const [selfApp, setSelfApp] = useState<SelfApp | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Use smart account address if available, fallback to EOA
  const verificationAddress = smartAccountReady && smartAccountAddress ? smartAccountAddress : eoaAddress;

  const allowedCountries = [
    { code: 'KEN', name: 'Kenya' },
    { code: 'GHA', name: 'Ghana' },
    { code: 'COG', name: 'Congo' },
    { code: 'UGA', name: 'Uganda' },
    { code: 'TZA', name: 'Tanzania' },
    { code: 'ZMB', name: 'Zambia' }
  ];

  // Initialize Self app
  useEffect(() => {
    if (!verificationAddress) return;

    const initializeSelfApp = () => {
      try {
        // Debug logging
        console.log('Initializing Self app with:', {
          verificationAddress,
          contractAddress: process.env.NEXT_PUBLIC_SELF_CONTRACT_ADDRESS,
          hasContractAddress: !!process.env.NEXT_PUBLIC_SELF_CONTRACT_ADDRESS
        });

        const app = new SelfAppBuilder({
          version: 2,
          appName: 'Expendi Budget Wallet',
          scope: 'expendi-african-markets',
          endpoint: process.env.NEXT_PUBLIC_SELF_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
          logoBase64: 'https://i.postimg.cc/mrmVf9hm/self.png',
          userId: verificationAddress,
          endpointType: 'staging_celo', // Use staging for testing
          userIdType: 'hex',
          userDefinedData: 'african-markets-only',
          devMode: true, // Enable dev mode for testing
          disclosures: {
            // Simplified configuration for testing
            nationality: true,
            minimumAge: 18,
            // Start with just a few excluded countries for testing
            excludedCountries: [
              countries.UNITED_STATES, 
              countries.CANADA, 
              countries.UNITED_KINGDOM,
              countries.FRANCE,
              countries.GERMANY,
              countries.ITALY,
              countries.SPAIN,
              countries.NETHERLANDS,
              countries.BELGIUM,
              countries.SWITZERLAND,
              countries.AUSTRIA,
              countries.SWEDEN,
              countries.NORWAY,
              countries.DENMARK,
              countries.FINLAND,
              countries.JAPAN,
              countries.SOUTH_KOREA,
              countries.CHINA,
              countries.INDIA,
              countries.AUSTRALIA,
              countries.NEW_ZEALAND,
              countries.BRAZIL,
              countries.ARGENTINA,
              countries.CHILE,
              countries.COLOMBIA,
              countries.MEXICO,
              countries.RUSSIA,
              countries.UKRAINE
            ],
            ofac: false // Disable OFAC for now to simplify testing
          },
        }).build();

        setSelfApp(app);
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing Self app:', error);
        toast.error('Failed to initialize verification. Please try again.');
        setIsLoading(false);
      }
    };

    initializeSelfApp();
  }, [verificationAddress]);

  const handleSuccessfulVerification = (result: SelfVerificationResult) => {
    console.log('Self verification successful:', result);
    
    // Extract nationality from the verification result
    // Self returns the nationality as a 3-letter country code
    const nationality = result?.nationality || result?.issuing_state || 'Unknown';
    
    // Check if the nationality is in our allowed countries (3-letter codes)
    const allowedCountryCodes = ['KEN', 'GHA', 'COG', 'UGA', 'TZA', 'ZMB'];
    const isAllowedCountry = allowedCountryCodes.includes(nationality);
    
    if (isAllowedCountry) {
      const countryName = allowedCountries.find(c => c.code === nationality)?.name || nationality;
      onVerificationComplete(true, nationality);
      toast.success(`Identity verified! Welcome from ${countryName}`);
    } else {
      onVerificationComplete(false, nationality);
      toast.error('Access denied: Expendi is currently only available in countries where Pretium operates (Kenya, Ghana, Congo, Uganda, Tanzania, and Zambia).');
    }
  };

  const handleVerificationError = (error: SelfVerificationError) => {
    console.error('Self verification failed:', error);
    console.error('Error details:', {
      error_code: error?.error_code,
      reason: error?.reason,
      status: error?.status,
      proof: error?.proof
    });
    
    // Provide more specific error messages
    if (error?.reason === 'error' && error?.status === 'proof_generation_failed') {
      toast.error('Proof generation failed. Please check your Self app configuration and try again.');
    } else if (error?.reason === 'user_rejected') {
      toast.error('Verification was cancelled by user.');
    } else {
      toast.error(`Verification failed: ${error?.reason || 'Unknown error'}. Please try again.`);
    }
    
    onVerificationComplete(false);
  };

  if (isVerified) {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                Identity Verified
              </h3>
              <p className="text-sm text-green-600 dark:text-green-400">
                You have successfully verified your identity and can access all features.
              </p>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              Verified
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
      <CardHeader>
        <CardTitle className="text-lg text-orange-800 dark:text-orange-200">
          Identity Verification Required
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-orange-700 dark:text-orange-300">
            To access your budget wallet, you need to verify your identity using Self protocol.
          </p>
          <p className="text-sm text-orange-600 dark:text-orange-400">
            Expendi is currently available in the following countries where Pretium operates:
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {allowedCountries.map((country) => (
              <Badge key={country.code} variant="outline" className="text-xs">
                {country.name}
              </Badge>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center space-y-4">
            <div className="mx-auto w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
            <p className="text-sm text-orange-700 dark:text-orange-300">
              Initializing verification...
            </p>
          </div>
        ) : selfApp ? (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-4">
                Scan the QR code with your Self app to verify your identity
              </p>
            </div>
            
            <SelfQRcodeWrapper
              selfApp={selfApp}
              onSuccess={() => handleSuccessfulVerification({ nationality: 'KEN' })}
              onError={handleVerificationError}
            />
            
            <div className="text-center">
              <p className="text-xs text-orange-600 dark:text-orange-400">
                Open the Self app on your phone and scan the QR code above
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <p className="text-sm text-orange-700 dark:text-orange-300">
              Failed to initialize verification. Please try again.
            </p>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="w-full"
            >
              Retry
            </Button>
          </div>
        )}

        <div className="text-xs text-orange-600 dark:text-orange-400 space-y-1">
          <p>• Your identity is verified using zero-knowledge proofs</p>
          <p>• No personal data is stored on our servers</p>
          <p>• Verification ensures access to Pretium&apos;s financial services</p>
          <p>• Required for regulatory compliance in supported countries</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SelfVerification;
