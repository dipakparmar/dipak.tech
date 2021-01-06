import { useState, useEffect } from 'react';
import NextLink from 'next/link';
import { Box, Button, useColorMode, useColorModeValue } from '@chakra-ui/react';

export default function Container({ children }) {
  const [mounted, setMounted] = useState(false);
  const { colorMode, toggleColorMode } = useColorMode();
  useEffect(() => setMounted(true), []);

  const bg = useColorModeValue('white', 'black');
  const color = useColorModeValue('black', 'white');

  return (
    <Box>
      <Box>{children}</Box>
    </Box>
  );
}
