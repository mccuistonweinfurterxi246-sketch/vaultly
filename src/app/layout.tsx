import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';

const manrope = Manrope({ 
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'Vaultly — Minimalist Personal Link Library',
  description: 'A clean, quiet personal space for saving websites, videos, articles, tools, and ideas.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${manrope.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}

