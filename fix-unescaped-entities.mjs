// One-time codemod: fixes every react/no-unescaped-entities ESLint error
// by replacing the EXACT character ESLint flagged (by its own reported
// line/column) with the matching HTML entity - ' -> &apos;, " -> &quot;.
// Reading positions straight from ESLint's own report (rather than a
// regex guess) means this only ever touches real JSX-text violations,
// never a quote inside a string literal, JS expression, or attribute
// value that happens to look similar.
import { readFileSync, writeFileSync } from 'fs';

const report = JSON.parse(readFileSync('/tmp/eslint-report.json', 'utf8'));

let totalFixed = 0;
let filesFixed = 0;

for (const fileResult of report) {
  const violations = fileResult.messages.filter((m) => m.ruleId === 'react/no-unescaped-entities');
  if (violations.length === 0) continue;

  // Descending by line then column, so replacing one character never
  // shifts the position of another violation still waiting to be fixed
  // on the same line.
  violations.sort((a, b) => (b.line - a.line) || (b.column - a.column));

  const lines = readFileSync(fileResult.filePath, 'utf8').split('\n');

  for (const v of violations) {
    const lineIdx = v.line - 1;
    const colIdx = v.column - 1;
    const line = lines[lineIdx];
    const char = line[colIdx];
    const entity = char === "'" ? '&apos;' : char === '"' ? '&quot;' : null;
    if (!entity) {
      console.error(`  ! Unexpected character "${char}" at ${fileResult.filePath}:${v.line}:${v.column} - skipped`);
      continue;
    }
    lines[lineIdx] = line.slice(0, colIdx) + entity + line.slice(colIdx + 1);
    totalFixed += 1;
  }

  writeFileSync(fileResult.filePath, lines.join('\n'));
  filesFixed += 1;
  console.log(`Fixed ${violations.length} in ${fileResult.filePath}`);
}

console.log('---');
console.log(`Files fixed: ${filesFixed}`);
console.log(`Total characters escaped: ${totalFixed}`);
