import { IParsedSchemaItem } from '../../api/helpers/api.helper';

// ============================================================================
// Type declarations for custom matchers (must be before extend)
// ============================================================================

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveUniqueItems(): R;
      toContainImport(importStatement: string): R;
      toHaveNoDuplicateImports(): R;
      toHaveUniqueApiMethods(): R;
    }
  }
}

// ============================================================================
// Custom Jest Matchers Implementation
// ============================================================================

// Use type assertion to bypass Jasmine type conflict
(expect as any).extend({
  /**
   * Checks if an array has all unique items
   */
  toHaveUniqueItems(received: unknown[]) {
    const pass = received.length === new Set(received).size;
    const duplicates = received.filter((item, index) => received.indexOf(item) !== index);

    return {
      pass,
      message: () =>
        pass
          ? `Expected array not to have unique items`
          : `Expected array to have unique items, but found duplicates: ${JSON.stringify([...new Set(duplicates)])}`
    };
  },

  /**
   * Checks if a string contains a specific import statement
   */
  toContainImport(received: string, importStatement: string) {
    const pass = received.includes(importStatement);

    return {
      pass,
      message: () =>
        pass
          ? `Expected content not to contain import:\n${importStatement}`
          : `Expected content to contain import:\n${importStatement}\n\nActual imports found:\n${received
              .split('\n')
              .filter(line => line.startsWith('import '))
              .join('\n')}`
    };
  },

  /**
   * Checks if a file content has no duplicate import statements
   */
  toHaveNoDuplicateImports(received: string) {
    const importLines = received
      .split('\n')
      .filter(line => line.startsWith('import '))
      .map(line => line.trim());

    const uniqueImports = [...new Set(importLines)];
    const pass = importLines.length === uniqueImports.length;
    const duplicates = importLines.filter((item, index) => importLines.indexOf(item) !== index);

    return {
      pass,
      message: () =>
        pass
          ? `Expected content to have duplicate imports`
          : `Expected content to have no duplicate imports, but found:\n${[...new Set(duplicates)].join('\n')}`
    };
  },

  /**
   * Checks if parsed API schema has unique method names
   */
  toHaveUniqueApiMethods(received: IParsedSchemaItem) {
    const methodNames = received.apiList.map(api => api.apiMethodName);
    const pass = methodNames.length === new Set(methodNames).size;
    const duplicates = methodNames.filter((item, index) => methodNames.indexOf(item) !== index);

    return {
      pass,
      message: () =>
        pass
          ? `Expected API methods not to be unique`
          : `Expected API methods to be unique, but found duplicates: ${[...new Set(duplicates)].join(', ')}`
    };
  }
});

export {};
