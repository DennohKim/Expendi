import { Outfit } from 'next/font/google';
import './globals.css';

import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { Providers } from '@/lib/privy/providers';
import { Metadata } from 'next';
import { SmartAccountProvider } from '@/context/SmartAccountContext';
import { Toaster } from "@/components/ui/sonner"
import { ApolloWrapper } from '@/lib/services/apollo-wrapper';
import { cookies } from 'next/headers';


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
          <ThemeProvider>
            <SmartAccountProvider>
              <SidebarProvider>
                <ApolloWrapper delay={delay}>
                  {children}
                </ApolloWrapper>
                <Toaster />
              </SidebarProvider>
            </SmartAccountProvider>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
