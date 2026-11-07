// LT-603: every site downloads the main script before it shows a thing, so
// it holds only what every site draws. A design goes in its own file and is
// listed in src/designs/parts.tsx; each language is its own file
// (src/i18n/config.ts). This check fails the build when the main script
// grows past its budget or carries a language again - raise the budget only
// for something every site really needs.
import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const BUDGET_KB = 760; // 703 KB after LT-603 (it was 1,046 KB)
const BUDGET_GZIP_KB = 235; // 218 KB after LT-603 (it was 318 KB)
// A Hebrew text only the Hebrew language file holds.
const LANGUAGE_PROBE = 'האתר עוד לא פעיל';

const dir = join(process.cwd(), 'dist', 'assets');
const html = readFileSync(join(process.cwd(), 'dist', 'index.html'), 'utf8');
const entry = /<script[^>]+src="\/assets\/([^"]+\.js)"/.exec(html)?.[1];
if (!entry || !readdirSync(dir).includes(entry)) {
  console.error('✗ check-main-script: no main script found in dist/index.html');
  process.exit(1);
}
const code = readFileSync(join(dir, entry));
const kb = code.length / 1000;
const gzipKb = gzipSync(code).length / 1000;
const problems = [];
if (kb > BUDGET_KB) problems.push(`it is ${kb.toFixed(0)} KB, over its ${BUDGET_KB} KB budget`);
if (gzipKb > BUDGET_GZIP_KB) problems.push(`it is ${gzipKb.toFixed(0)} KB compressed, over its ${BUDGET_GZIP_KB} KB budget`);
if (code.toString('utf8').includes(LANGUAGE_PROBE)) problems.push('it carries the Hebrew language file');
if (problems.length) {
  console.error(`✗ check-main-script: the main script ${entry}: ${problems.join('; ')}.`);
  console.error('  A design belongs in its own file, listed in src/designs/parts.tsx and drawn through part(); see LT-603.');
  process.exit(1);
}
console.log(`✓ main script ${entry}: ${kb.toFixed(0)} KB (${gzipKb.toFixed(0)} KB compressed), within ${BUDGET_KB} / ${BUDGET_GZIP_KB} KB`);
