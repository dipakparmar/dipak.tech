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
    <Box as="div" bg={bg} color={color} height="100vh">
      <Box
        as="nav"
        bg={bg}
        color={color}
        justifyContent="flex-end"
        className="sticky-nav flex items-center max-w-4xl w-full p-8 my-0 md:my-8 mx-auto"
      >
        <Button
          aria-label="Toggle Dark Mode"
          type="button"
          className="bg-gray-200 dark:bg-gray-800 rounded p-3 h-10 w-10"
          onClick={toggleColorMode}
        >
          {mounted && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill={color}
              stroke={color}
              className="h-4 w-4 text-gray-800 dark:text-gray-200"
            >
              {colorMode === 'dark' ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              )}
            </svg>
          )}
        </Button>
      </Box>
      <Box
        as="main"
        bg={bg}
        color={color}
        className="flex flex-col justify-center px-8"
      >
        {children}
      </Box>
    </Box>
  );
}
