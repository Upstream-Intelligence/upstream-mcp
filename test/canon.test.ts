import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

// Canon guard: upstream is ONE procedural platform. The legacy specialty/pack
// machinery must never reappear in this repo. Mirrors upstream-v2's
// care/tests/test_models.py::test_customer_has_no_pack_or_specialty_drift.
//
// Two guards:
//   1. BANNED_IDENTIFIERS  - dead platform identifiers, scanned repo-wide (they
//      never appear in prose, so no allowlist needed).
//   2. BANNED_SYNTHETIC_SURFACE - the legacy synthetic-data "pack" tool names,
//      paths, and params, scanned under src/ ONLY. The synthetic-data de-pack
//      (Phase 4 Category B) re-derived these to the dataset catalog surface; the
//      src/ scope keeps the guard from false-failing on the CHANGELOG / .planning
//      deprecation notes that legitimately name the old surface.
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

const BANNED_SYNTHETIC_SURFACE = [
  'get_synthetic_pack',
  'list_synthetic_data_packs',
  'compile_synthetic_scenario_dsl',
  '/api/v1/data/packs/',
  'packPath',
  'pack_id',
];

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

  it('finds no legacy synthetic-data pack surface under src/', () => {
    const offenders: string[] = [];
    for (const file of collectFiles(join(REPO_ROOT, 'src'))) {
      const text = readFileSync(file, 'utf8');
      for (const term of BANNED_SYNTHETIC_SURFACE) {
        if (text.includes(term)) {
          offenders.push(`${relative(REPO_ROOT, file)} -> ${term}`);
        }
      }
    }
    expect(
      offenders,
      `legacy synthetic-data pack surface reintroduced in src/:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });
});
