import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

// Canon guard: upstream is ONE procedural platform. The legacy specialty/pack
// machinery must never reappear in this repo. Mirrors upstream-v2's
// care/tests/test_models.py::test_customer_has_no_pack_or_specialty_drift.
// Scope is the dead IDENTIFIERS only, which never appear in the synthetic-data
// product surface, so this needs no allowlist and cannot false-fail on the
// pending synthetic-data de-pack migration.
const BANNED_IDENTIFIERS = [
  'VerticalPack',
  'SPECIALTY_PACKS',
  'signup_pack',
  'is_all_packs',
  'specialty_modules',
  'CustomerSpecialtyModule',
  'ProductConfig',
  'outpatient_leaf',
  'specialty_type',
];

const REPO_ROOT = process.cwd();
const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  '.compound-engineering',
  'coverage',
]);
const SCAN_EXT = ['.ts', '.js', '.mjs', '.cjs', '.json', '.md'];
const SELF = ['test', 'canon.test.ts'].join(sep);

function collectFiles(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      collectFiles(full, acc);
    } else if (SCAN_EXT.some((ext) => name.endsWith(ext)) && relative(REPO_ROOT, full) !== SELF) {
      acc.push(full);
    }
  }
  return acc;
}

describe('canon: no legacy pack/specialty machinery', () => {
  it('finds no banned legacy identifiers in tracked source', () => {
    const offenders: string[] = [];
    for (const file of collectFiles(REPO_ROOT)) {
      const text = readFileSync(file, 'utf8');
      for (const term of BANNED_IDENTIFIERS) {
        if (text.includes(term)) {
          offenders.push(`${relative(REPO_ROOT, file)} -> ${term}`);
        }
      }
    }
    expect(
      offenders,
      `legacy pack/specialty machinery reintroduced:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });
});
