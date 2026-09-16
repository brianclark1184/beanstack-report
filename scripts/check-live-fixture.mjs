// Optional local verification; private fixtures are never included in release packages.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readSnapshot} from '../extension/extractor.js';
const actual=JSON.parse(readFileSync('tmp/extension-test/actual-august.json','utf8'));
const dom=new JSDOM(readFileSync('tmp/extension-test/beanstack-august.html','utf8'),{
  url:`${actual.reader.origin}/profiles/${actual.reader.id}/reading_log/dated_reading_log`,runScripts:'outside-only'
});
const parsed=dom.window.eval(`(${readSnapshot.toString()})()`);
const normalize=list=>Array.from(list,e=>JSON.stringify({date:e.date,title:e.title,minutes:e.minutes})).sort();
const original=JSON.parse(readFileSync('august_2026_entries.json','utf8')).map(e=>{
  const [m,d,y]=e.date.split('/');return {...e,date:`${y}-${m}-${d}`};
});
assert.deepEqual(normalize(parsed.entries.filter(e=>e.minutes!==null)),normalize(original));
assert.equal(parsed.entries.length,actual.entries.length);
console.log(`Live calendar and saved DOM match: ${parsed.entries.length} entries, ${original.length} timed sessions, ${parsed.entries.reduce((s,e)=>s+(e.minutes||0),0)} minutes. Original timed entries match exactly.`);
