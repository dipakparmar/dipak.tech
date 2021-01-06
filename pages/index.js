import Head from 'next/head';
import { Box, Heading, Text, Flex } from '@chakra-ui/react';
import Container from '@/components/container';

export default function Home({ color }) {
  return (
    <Container>
      <Text
        as="h1"
        color={color}
        className="font-bold text-3xl md:text-5xl tracking-tight mb-4 "
      >
        Hello 👋
      </Text>
      <Text as="h6" color={color} fontSize="2vh" className="mb-16">
        I'm Dipak Parmar, a Open Source developer 🧑🏻‍💻 currently working at
        local IT company Adroit Technologies from Kamloops, BC. 🇨🇦
      </Text>
    </Container>
  );
}
