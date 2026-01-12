import './globals.css';

import { Inter, Karla } from 'next/font/google';

import type { Metadata } from 'next';
import Script from 'next/script';
import type { Viewport } from 'next';
import { cn } from '@/lib/utils';
import { ogUrls } from '@/lib/og-config';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1
};

const fontInter = Inter({ subsets: ['latin'], variable: '--font-sans' });

const fontKarla = Karla({
  subsets: ['latin'],
  variable: '--font-karla',
  weight: ['200', '300', '400', '500', '600', '700', '800']
});

const title = 'Dipak Parmar | ☁️ DevSecOps Engineer | @iamdipakparmar';
const description =
  'DevSecOps Engineer and Open Source Developer with 6+ years of experience in Cloud Automation, Kubernetes, and Monitoring from Kamloops, BC 🇨🇦';

const ogImageUrl = ogUrls.portfolio({
  title: 'Dipak Parmar',
  subtitle: 'DevSecOps Engineer & Open Source Developer',
  site: 'portfolio',
});

export const metadata: Metadata = {
  title: title,
  description: description,
  icons: [
    {
      rel: 'icon',
      url: 'https://github.com/dipakparmar.png?size=96'
    },
    {
      rel: 'apple-touch-icon',
      url: 'https://github.com/dipakparmar.png?size=180'
    }
  ],
  keywords: [
    'Dipak Parmar',
    'Dipak Parmar, DevOps Engineer',
    'Dipak Parmar Canada',
    'Dipak Parmar DevOps Engineer',
    'Dipak Parmar DevSecOps Engineer',
    'Dipak Parmar DevOps Engineer Kamloops',
    'Dipak Parmar DevSecOps Engineer Kamloops',
    'Dipak Parmar Vancouver',
    'Dipak Parmar DevOps',
    'Dipak Parmar DevSecOps',
    'Dipak Parmar AWS',
    'Kamloops',
    'British Columbia'
  ],
  openGraph: {
    type: 'website',
    locale: 'en_CA',
    url: 'https://dipak.tech',
    siteName: title,
    description: description,
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: title
      }
    ]
  },
  twitter: {
    creator: '@iamdipakparmar',
    site: '@iamdipakparmar',
    card: 'summary_large_image',
    title: title,
    description: description,
    images: [ogImageUrl]
  },
  alternates: {
    canonical: 'https://dipak.tech'
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={fontInter.variable}>
      {process.env.NEXT_PUBLIC_GA_TAG_ID &&
      process.env.NODE_ENV === 'production' ? (
        <>
          <Script
            strategy="lazyOnload"
            src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_TAG_ID}`}
          />
          <Script id="google-analytics" strategy="lazyOnload">
            {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${process.env.NEXT_PUBLIC_GA_TAG_ID}', {
              page_path: window.location.pathname,
            });
                `}
          </Script>{' '}
        </>
      ) : null}
      <body
        className={cn(
          'min-h-screen bg-background antialiased',
          fontInter.variable,
          fontKarla.variable
        )}
      >
        {children}
      </body>
    </html>
  );
}
