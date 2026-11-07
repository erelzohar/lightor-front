import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll } from 'vitest';
import { restoreLocation } from './helpers/location';
import { preloadAllParts } from '../designs/parts';

// LT-603: every design part loaded up front, so components draw at once in
// tests as they did before the parts were split out (a test of the loading
// itself resets them). In beforeAll, not at the top: by then the test file's
// vi.mock()s are in place, and the parts load with the mocked modules.
beforeAll(async () => {
  await preloadAllParts();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  restoreLocation();
});
