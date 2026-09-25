import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

// Build a snapshot without .env.local or credentials. The user's dev server keeps its own .next.
export async function prepareUiWorkspace() {
  const root = process.cwd();
  await mkdir('artifacts', { recursive: true });
  const directory = await mkdtemp(resolve('artifacts/ui-workspace-'));
  for (const file of ['src', 'package.json', 'tsconfig.json', 'postcss.config.mjs']) {
    await cp(join(root, file), join(directory, file), { recursive: true });
  }
  const config = await readFile('next.config.ts', 'utf8');
  await writeFile(
    join(directory, 'next.config.ts'),
    config.replace(
      'export default config;',
      `config.turbopack = { ...config.turbopack, root: ${JSON.stringify(root)} };\nexport default config;`,
    ),
  );
  return directory;
}
