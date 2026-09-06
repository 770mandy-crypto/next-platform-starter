// Builds the four storefront directions into one self-contained page each.
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { loadProducts } from './core.mjs';
import { raw } from './style-raw.mjs';
import { journal } from './style-journal.mjs';
import { spec } from './style-spec.mjs';
import { shop } from './style-shop.mjs';

const OUT = dirname(fileURLToPath(import.meta.url));
const products = loadProducts();

for (const style of [raw, journal, spec, shop]) {
  const html = style.build(products);

  // The artifact wrapper supplies the document skeleton; ours must not.
  if (/<!DOCTYPE|<html[\s>]|<head>|<body>/i.test(html)) throw new Error(`${style.id}: page carries document tags`);

  // Every page's inline script must parse before it is worth publishing.
  const open = html.lastIndexOf('<script>');
  const close = html.lastIndexOf('</script>');
  if (open === -1 || close === -1) throw new Error(`${style.id}: no script block`);
  const js = html.slice(open + 8, close);
  const probe = `${tmpdir()}/probe-${style.id}.js`;
  writeFileSync(probe, js);
  execFileSync(process.execPath, ['--check', probe]);

  // Ids the page's own script reaches for must exist in the markup it shipped.
  const wanted = [...js.matchAll(/getElementById\('([^']+)'\)/g)].map((m) => m[1]);
  const missing = [...new Set(wanted)].filter((id) => !html.includes(`id="${id}"`));
  if (missing.length) throw new Error(`${style.id}: markup is missing id(s) ${missing.join(', ')}`);

  writeFileSync(`${OUT}/${style.file}`, html);
  console.log(`${style.id.padEnd(8)} ${(html.length / 1024).toFixed(0).padStart(4)}KB  ${style.file}  ok`);
}
