import { readFileSync } from 'fs';
import * as path from 'path';

// Get the fixtures directory - handle both source and compiled locations
const getFixturesDir = () => {
  const currentDir = __dirname;
  // If we're in a compiled location (dist/out-tsc), go up to find source
  if (currentDir.includes('dist') || currentDir.includes('out-tsc')) {
    const baseDir = currentDir.split(/[\\/](dist|out-tsc)[\\/]/)[0];
    return path.join(baseDir, '__tests__', '__fixtures__');
  }
  // Otherwise, we're in the source location
  return currentDir;
};

const fixturesDir = getFixturesDir();

export function loadFixture(filename: string): string {
  return readFileSync(path.join(fixturesDir, filename), 'utf-8');
}

export function loadJsonFixture(filename: string): any {
  return JSON.parse(loadFixture(filename));
}

export * from './swagger';
