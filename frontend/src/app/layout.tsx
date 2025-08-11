import { Outfit } from 'next/font/google';
import './globals.css';

import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { TourProvider } from '@/context/TourContext';
import { Providers } from '@/lib/privy/providers';
import { Metadata } from 'next';
import { SmartAccountProvider } from '@/context/SmartAccountContext';
import { Toaster } from "@/components/ui/sonner"
import { ApolloWrapper } from '@/lib/services/apollo-wrapper';
import { AppTour } from '@/components/tour/AppTour';
import { cookies } from 'next/headers';
import { PostHogProvider } from '@/context/PostHogContext';
import { PWAInstaller } from '@/components/PWAInstaller';


const outfit = Outfit({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Expendi - Budget Wallet Manager",
  description: "Manage your budget wallets and track expenses with Web3 technology",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Expendi",
  },
};

export function generateViewport() {
  return {
    themeColor: "#3b82f6",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const cookieStore = await cookies();
  const delay = Number(cookieStore.get("apollo-x-custom-delay")?.value ?? 1000);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Expendi" />
        <link rel="apple-touch-icon" href="/images/logo/logo-icon.svg" />
        <link rel="icon" type="image/svg+xml" href="/images/logo/logo-icon.svg" />
      </head>
      <body className={`${outfit.className} dark:bg-gray-900`}>
        <Providers>
          <PostHogProvider>
            <ThemeProvider>
              <SmartAccountProvider>
                <SidebarProvider>
                  <TourProvider>
                    <AppTour>
                      <ApolloWrapper delay={delay}>
                        {children}
                        <PWAInstaller />
                      </ApolloWrapper>
                    </AppTour>
                  </TourProvider>
                  <Toaster position="top-right" richColors />
                </SidebarProvider>
              </SmartAccountProvider>
            </ThemeProvider>
          </PostHogProvider>
        </Providers>
      </body>
    </html>
  );
}
