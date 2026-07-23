import '../helpers/matchers';
import { runTypesSchematic, resetFetchMocks, ANGULAR_SCHEMATIC_OPTIONS } from '../helpers/setup';

describe('schematic error logging', () => {
  it('should print a full error report to the console when the schema fetch fails', async () => {
    // No mock registered for the URL -> the fetch mock answers 404
    resetFetchMocks();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    await expect(runTypesSchematic(ANGULAR_SCHEMATIC_OPTIONS)).rejects.toThrow('404');

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("'types' schematic failed"));
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(ANGULAR_SCHEMATIC_OPTIONS.swaggerSchemaUrl)
    );
    consoleSpy.mockRestore();
  });
});
