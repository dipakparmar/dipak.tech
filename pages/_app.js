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
        <link rel="icon" href="https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/240/apple/285/technologist-light-skin-tone_1f9d1-1f3fb-200d-1f4bb.png" type="image/png" />
      </Head>
      <DefaultSeo {...SEO} />
      <Component {...pageProps} />
    </ChakraProvider>
  );
}
