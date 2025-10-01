/**
 * Test Setup - Task T007
 * Global test setup for Vitest + React Testing Library
 */
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest matchers with React Testing Library
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});
