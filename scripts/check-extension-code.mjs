import {readFileSync, readdirSync} from 'node:fs';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {join, resolve} from 'node:path';
import {parse} from 'acorn';
import {JSDOM} from 'jsdom';

// Regression guard for this extension's reviewed static bundle. This is not a
// general proof of MV3 compliance; new dependencies still need code review.
export function auditSource(source, label='JavaScript') {
  const errors=[];
  const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});
  function visit(node) {
    if (!node || typeof node!=='object') return;
    const member = node.callee?.property;
    const name = node.callee?.name || member?.name || member?.value;
    if (node.type==='ImportExpression') errors.push('dynamic import');
    if (['CallExpression','NewExpression'].includes(node.type)) {
      if (['eval','Function','require','importScripts'].includes(name)) errors.push(`dynamic code loader: ${name}`);
      if (name==='createElement' && node.arguments[0]?.value?.toLowerCase?.()==='script') errors.push('script element creation');
    }
    if (node.type==='Literal' && typeof node.value==='string') {
      if (/https?:\/\/[^\s"'<>]+\.(?:m?js|wasm)(?:[?#]|$)/i.test(node.value)) errors.push('remote executable URL');
      if (/<script\b/i.test(node.value)) errors.push('script HTML');
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value==='object') visit(value);
    }
  }
  visit(ast);
  if (errors.length) throw new Error(`${label}: ${[...new Set(errors)].join(', ')}`);
}

export function auditExtension(root=fileURLToPath(new URL('../extension',import.meta.url))) {
  let scripts=0;
  function scan(dir) {
    for (const entry of readdirSync(dir,{withFileTypes:true})) {
      const path=join(dir,entry.name);
      if (entry.isDirectory()) {scan(path);continue;}
      if (path.endsWith('.js')) {auditSource(readFileSync(path,'utf8'),path);scripts++;}
      if (path.endsWith('.html')) {
        const dom=new JSDOM(readFileSync(path,'utf8'));
        for (const script of dom.window.document.querySelectorAll('script')) {
          const src=script.getAttribute('src');
          if (!src || /^(?:[a-z]+:|\/\/)/i.test(src) || src.includes('..')) throw new Error(`${path}: non-local script`);
          readFileSync(join(dir,src));
        }
        dom.window.close();
      }
    }
  }
  scan(root);
  return scripts;
}
if (process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  console.log(`Checked ${auditExtension(process.argv[2])} packaged JavaScript files for code loaders.`);
}
