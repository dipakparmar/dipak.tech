import './globals.css';

import { Inter as FontSans } from 'next/font/google';
import type { Metadata } from 'next';
import Navbar from '@/components/navbar';
import Script from 'next/script';
import { ThemeProvider } from '@/components/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans'
});

const title = 'Dipak Parmar | ☁️ DevSecOps Engineer | @iamdipakparmar';
const description =
  'DevSecOps Engineer and Open Source Developer with 4+ years of experience in Cloud Automation, Kubernetes, and Monitoring from Kamloops, BC 🇨🇦';

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
        url: 'https://dipak.tech/static/images/banner.jpg',
        width: 1200,
        height: 720,
        alt: title
      }
    ]
  },
  twitter: {
    creator: '@iamdipakparmar',
    site: '@iamdipakparmar',
    card: 'summary_large_image',
    title: title,
    description: description
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
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
      </Script>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased max-w-2xl mx-auto py-12 sm:py-24 px-6',
          fontSans.variable
        )}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider delayDuration={0}>
            {children} <Navbar />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
