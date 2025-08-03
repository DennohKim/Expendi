"use client"
import React, { useState, useEffect, useContext } from "react";
import { ConnectedWallet, usePrivy, useWallets } from "@privy-io/react-auth";
import { createPublicClient, createWalletClient, custom, http } from "viem";
import { base } from "viem/chains";
import { SmartAccountClient, createSmartAccountClient } from "permissionless";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { entryPoint06Address } from "viem/account-abstraction";
import { toSimpleSmartAccount } from "permissionless/accounts";

/** Interface returned by custom `useSmartAccount` hook */
interface SmartAccountInterface {
  /** Privy embedded wallet, used as a signer for the smart account */
  eoa: ConnectedWallet | undefined;
  /** Smart account client to send signature/transaction requests to the smart account */
  smartAccountClient: SmartAccountClient | null;
  /** Smart account address */
  smartAccountAddress: `0x${string}` | undefined;
  /** Boolean to indicate whether the smart account state has initialized */
  smartAccountReady: boolean;
}

const SmartAccountContext = React.createContext<SmartAccountInterface>({
  eoa: undefined,
  smartAccountClient: null,
  smartAccountAddress: undefined,
  smartAccountReady: false,
});

export const useSmartAccount = () => {
  return useContext(SmartAccountContext);
};

export const SmartAccountProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  // Get a list of all of the wallets (EOAs) the user has connected to your site
  const { wallets } = useWallets();
  const { ready } = usePrivy();
  // Find the embedded wallet by finding the entry in the list with a `walletClientType` of 'privy'
  const embeddedWallet = wallets.find(
    (wallet) => wallet.walletClientType === "privy"
  );

  // States to store the smart account and its status
  const [eoa, setEoa] = useState<ConnectedWallet | undefined>();
  const [smartAccountClient, setSmartAccountClient] = useState<SmartAccountClient | null>(null);
  const [smartAccountAddress, setSmartAccountAddress] = useState<
    `0x${string}` | undefined
  >();
  const [smartAccountReady, setSmartAccountReady] = useState(false);

  useEffect(() => {
    if (!ready) return;
  }, [ready, embeddedWallet]);

  useEffect(() => {
    // Creates a smart account given a Privy `ConnectedWallet` object representing
    // the  user's EOA.
    const createSmartWallet = async (eoa: ConnectedWallet) => {
      console.log('🔧 Starting smart account initialization for:', eoa.address);
      setEoa(eoa);
      setSmartAccountReady(false); // Ensure it's false during initialization
      
      try {
        // Get an EIP1193 provider and viem WalletClient for the EOA
        const eip1193provider = await eoa.getEthereumProvider();
        console.log('🔧 Creating wallet client...');
        const privyClient = createWalletClient({
          account: eoa.address as `0x${string}`,
          chain: base,
          transport: custom(eip1193provider),
        });

        console.log('🔧 Creating public client...');
        const publicClient = createPublicClient({
          chain: base,
          transport: http(),
        });

        // Create the Pimlico paymaster client
        console.log('🔧 Creating Pimlico paymaster...');
        const pimlicoRpcUrl = `https://api.pimlico.io/v2/${base.id}/rpc?apikey=${process.env.NEXT_PUBLIC_PIMLICO_API_KEY}`;
        
        const pimlicoPaymaster = createPimlicoClient({
          transport: http(pimlicoRpcUrl),
          entryPoint: {
            address: entryPoint06Address,
            version: "0.6",
          },
        });

        // Create simple smart account - this step might trigger signing
        console.log('🔧 Creating smart account (may require signature)...');
        const simpleSmartAccount = await toSimpleSmartAccount({
          client: publicClient,
          owner: privyClient,
          entryPoint: {
            address: entryPoint06Address,
            version: "0.6"
          }
        });

        console.log('🔧 Creating smart account client...');
        const smartAccountClient = createSmartAccountClient({
          account: simpleSmartAccount,
          chain: base,
          bundlerTransport: http(pimlicoRpcUrl),
          paymaster: pimlicoPaymaster,
          userOperation: {
            estimateFeesPerGas: async () => (await pimlicoPaymaster.getUserOperationGasPrice()).fast,
          },
        });

        const smartAccountAddress = smartAccountClient.account?.address;
        console.log('✅ Smart account initialized successfully!', smartAccountAddress);

        setSmartAccountClient(smartAccountClient);
        setSmartAccountAddress(smartAccountAddress);
        setSmartAccountReady(true);
      } catch (error) {
        console.error("Failed to initialize smart account:", error);
        setSmartAccountReady(false);
      }
    };

    if (embeddedWallet) createSmartWallet(embeddedWallet);
  }, [embeddedWallet?.address, embeddedWallet]);

  const contextValue = React.useMemo(() => ({
    smartAccountReady,
    smartAccountClient,
    smartAccountAddress,
    eoa,
  }), [smartAccountReady, smartAccountClient, smartAccountAddress, eoa]);

  return (
    <SmartAccountContext.Provider value={contextValue}>
      {children}
    </SmartAccountContext.Provider>
  );
};