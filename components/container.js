import NextLink from 'next/link';
import { Box } from '@chakra-ui/react';

export default function Container({ children }) {
  return (
    <Box>
      <Box lineHeight="1.5">{children}</Box>
    </Box>
  );
}
