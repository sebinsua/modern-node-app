import escalade from 'escalade';
import { readJson } from 'fs-extra';

export async function getApplicationName(): Promise<string> {
  const packageJsonPath = await escalade(__dirname, (_, files) =>
    files.includes('package.json') ? 'package.json' : undefined
  );
  if (!packageJsonPath) {
    throw new Error('No package.json found!');
  }

  const packageJson = await readJson(packageJsonPath);

  return packageJson.name;
}
