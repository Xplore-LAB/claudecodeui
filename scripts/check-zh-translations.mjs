import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Catch missing Chinese UI strings and broken interpolation before deployment.
const root = fileURLToPath(new URL('../src/modules/i18n/locales/', import.meta.url));
const flatten = (value, prefix = '') => Object.fromEntries(
  Object.entries(value).flatMap(([key, child]) => {
    const name = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === 'object' && !Array.isArray(child)
      ? Object.entries(flatten(child, name)) : [[name, child]];
  }),
);
const placeholders = value => JSON.stringify((String(value).match(/{{.*?}}/g) || []).sort());
let count = 0;
const failures = [];
for (const file of fs.readdirSync(path.join(root, 'en')).filter(name => name.endsWith('.json'))) {
  const english = flatten(JSON.parse(fs.readFileSync(path.join(root, 'en', file), 'utf8')));
  const chinesePath = path.join(root, 'zh-CN', file);
  const chinese = fs.existsSync(chinesePath)
    ? flatten(JSON.parse(fs.readFileSync(chinesePath, 'utf8'))) : {};
  for (const [key, value] of Object.entries(english)) {
    count++;
    if (!(key in chinese)) failures.push(`${file}:${key}: missing Chinese translation`);
    else if (placeholders(value) !== placeholders(chinese[key])) {
      failures.push(`${file}:${key}: interpolation placeholders differ`);
    }
  }
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Chinese translation audit passed: ${count} keys, no missing strings or broken placeholders.`);
}
