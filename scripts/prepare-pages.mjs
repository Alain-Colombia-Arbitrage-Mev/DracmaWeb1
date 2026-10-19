import { readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
// External macOS volumes create AppleDouble metadata; Wrangler treats it as code.
async function clean(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.name.startsWith('._') || entry.name === '.DS_Store') await rm(path, { force: true, recursive: true });
    else if (entry.isDirectory()) await clean(path);
  }
}
await clean('functions');
await clean('dist');
