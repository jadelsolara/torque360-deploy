import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'TORQUE 360 | ERP Automotriz',
  description: 'Sistema ERP integral para talleres y servicios automotrices',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const nonce = headersList.get('x-nonce') ?? '';

  return (
    <html lang="es">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <Script id="genie-bug-config" strategy="beforeInteractive" nonce={nonce}>{`window.GENIE_BUG_CONFIG={projectName:'TORQUE 360',storageKey:'torque_bugs',lang:'es',theme:'auto'};`}</Script>
        <Script src="/bug_reporter.js" strategy="afterInteractive" nonce={nonce} />
      </body>
    </html>
  );
}
