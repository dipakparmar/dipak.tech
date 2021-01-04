import { ChakraProvider } from '@chakra-ui/react';
import { DefaultSeo } from 'next-seo';
import Head from 'next/head';

import SEO from '../next-seo.config';
import '@/styles/globals.css';

export default function App({ Component, pageProps }) {
  return (
    <ChakraProvider attribute="class">
      <Head>
        <meta content="width=device-width, initial-scale=1" name="viewport" />
      </Head>
      <DefaultSeo {...SEO} />
      <Component {...pageProps} />
    </ChakraProvider>
  );
}
