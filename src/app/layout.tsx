import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from '@/context/CartContext';
import { Toaster } from 'sonner';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nusy-wears-web.vercel.app/'),
  title: {
    default: 'Nusy Wears',
    template: '%s | Nusy Wears',
  },
  description: 'Premium eyewear with customization options. Shop frames, lenses, and accessories.',
  applicationName: 'Nusy Wears',
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    siteName: 'Nusy Wears',
    title: 'Nusy Wears',
    description: 'Premium eyewear with customization options. Shop frames, lenses, and accessories.',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nusy Wears',
    description: 'Premium eyewear with customization options. Shop frames, lenses, and accessories.',
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <CartProvider>
          {children}
          <Toaster richColors position="top-right"/>
        </CartProvider>
      </body>
    </html>
  );
}
