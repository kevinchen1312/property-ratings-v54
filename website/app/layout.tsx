import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Buy Credits - Leadsong',
  description: 'Purchase credits for Leadsong property ratings',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

