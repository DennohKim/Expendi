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


const outfit = Outfit({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title:
    "Expendi",
  description: "",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const cookieStore = await cookies();
  const delay = Number(cookieStore.get("apollo-x-custom-delay")?.value ?? 1000);

  return (
    <html lang="en" suppressHydrationWarning>
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
                      </ApolloWrapper>
                    </AppTour>
                  </TourProvider>
                  <Toaster />
                </SidebarProvider>
              </SmartAccountProvider>
            </ThemeProvider>
          </PostHogProvider>
        </Providers>
      </body>
    </html>
  );
}
