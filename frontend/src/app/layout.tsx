import { Outfit } from 'next/font/google';
import './globals.css';

import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { Providers } from '@/lib/privy/providers';
import { Metadata } from 'next';
import { SmartAccountProvider } from '@/context/SmartAccountContext';
import { Toaster } from "@/components/ui/sonner"


const outfit = Outfit({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title:
    "Expendi",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.className} dark:bg-gray-900`}>
        <Providers>
          <ThemeProvider>
            <SmartAccountProvider>
              <SidebarProvider>
                {children}
                <Toaster />
              </SidebarProvider>
            </SmartAccountProvider>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
