import Head from 'next/head';
import { Box, Heading, Text, Flex } from '@chakra-ui/react';
import Container from '@/components/container';

export default function Home({ color }) {
  return (
    <Container>
      <Box
        as="div"
        display="flex"
        height="100vh"
        flexDirection="column"
        justifyContent="space-around"
        mx="0"
        my="auto"
        py="120px"
        px="100px"
        maxW="1440px"
      >
        <Heading
          as="h1"
          color={color}
          fontWeight="300"
          fontSize="2.5rem"
          display="block"
          marginBlock="0.67em"
          marginInline="0"
        >
          Hello 👋
        </Heading>
        <Heading
          as="h2"
          lineHeight="1.5"
          color={color}
          fontWeight="300"
          maxWidth="700px"
          fontSize="2.5rem"
          display="block"
          marginBlock="0.83em"
          marginInline="0"
        >
          I'm Dipak Parmar, a Open Source developer 🧑🏻‍💻 currently working at
          local IT company Adroit Technologies from Kamloops, BC. 🇨🇦
        </Heading>
        <Heading as="h3" fontSize="1.25rem" color={color} fontWeight="400">
          Drop a letter at 📧{' '}
          <Box as="a" href="mailto:hello@dipak.tech">
            hello@dipak.tech
          </Box>
        </Heading>
      </Box>
    </Container>
  );
}
