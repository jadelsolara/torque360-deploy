import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import BugReporterBridge from '@/components/BugReporterBridge';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'TORQUE 360 | ERP Automotriz',
  description: 'Sistema ERP integral para talleres y servicios automotrices',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const nonce = headersList.get('x-nonce') ?? '';
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme:dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
        <Script
          id="genie-bug-config"
          strategy="beforeInteractive"
          nonce={nonce}
        >{`window.GENIE_BUG_CONFIG={projectName:'TORQUE 360',storageKey:'torque_bugs',lang:'es',theme:'auto'};`}</Script>
        <Script src="/bug_reporter.js" strategy="afterInteractive" nonce={nonce} />
        <BugReporterBridge />
      </body>
    </html>
  );
}
