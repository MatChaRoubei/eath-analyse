import { access, rename } from 'node:fs/promises';
import { join } from 'node:path';

const dist = join(import.meta.dirname, '..', 'dist');
try {
  await access(join(dist, 'index.html'));
} catch {
  await rename(join(dist, 'app.html'), join(dist, 'index.html'));
}
