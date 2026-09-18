import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {auditSource,auditExtension} from '../scripts/check-extension-code.mjs';
import {createPdf} from '../extension/pdf.js';

export const bundle = readFileSync(new URL('../extension/vendor/jspdf.local.js',import.meta.url),'utf8');
export function pdfWindow(code=bundle) {
  const dom=new JSDOM('',{url:'https://extension-test.invalid',runScripts:'outside-only'});
  dom.window.fetch=()=>{throw new Error('Unexpected network request');};
  dom.window.XMLHttpRequest=class {constructor(){throw new Error('Unexpected network request');}};
  const create=dom.window.document.createElement.bind(dom.window.document);
  dom.window.document.createElement=(name,...args)=>{
    assert.notEqual(name.toLowerCase(),'script','PDF must never load a script');
    return create(name,...args);
  };
  dom.window.eval(code);
  return dom;
}

test('packaged code excludes remote viewers and optional dependency loaders',()=>{
  assert.equal(auditExtension(),6);
  const dom=pdfWindow();
  const doc=new dom.window.jspdf.jsPDF();
  assert.equal(doc.html,undefined);
  assert.equal(doc.addSvgAsImage,undefined);
  assert.equal(doc.output('pdfobjectnewwindow'),null);
  assert.equal(doc.output('pdfjsnewwindow'),null);
  dom.window.close();
});

test('code audit detects the rejected upstream bundle and loader regressions',()=>{
  const upstream=readFileSync(new URL('../node_modules/jspdf/dist/jspdf.umd.js',import.meta.url),'utf8');
  assert.throws(()=>auditSource(upstream),/script element creation/);
  for(const source of ['import("https://example.com/a.js")','document.createElement("script")','eval(code)','new Function(code)','require("canvg")']) {
    assert.throws(()=>auditSource(source));
  }
  assert.doesNotThrow(()=>auditSource('const namespace="http://www.w3.org/1999/02/22-rdf-syntax-ns#";'));
});

test('local PDF bundle preserves output and supports offline Blob preview and download',()=>{
  const upstream=readFileSync(new URL('../node_modules/jspdf/dist/jspdf.umd.js',import.meta.url),'utf8');
  const dom=pdfWindow(), baseline=pdfWindow(upstream);
  const reader={id:'test',origin:'https://school.beanstack.com',name:'Sample Student'};
  const profile={student:'Sample Student',teacher:'Ms. Rivera',className:'Room 4',dailyGoal:20,monthlyGoal:300,reader};
  const snapshot={month:'2026-08',reader,entries:[{id:'1',date:'2026-08-13',title:'A book — café',minutes:20,detail:''}]};
  const fonts=Object.fromEntries(['normal','bold'].map(s=>[s,readFileSync(new URL(`../extension/fonts/${s}.ttf`,import.meta.url)).toString('base64')]));
  function make(window) {
    const doc=createPdf(profile,snapshot,window.jspdf.jsPDF,fonts);
    doc.setCreationDate(new window.Date('2026-09-18T12:00:00Z'));
    doc.setFileId('0123456789ABCDEF0123456789ABCDEF');
    return doc;
  }
  const doc=make(dom.window);
  assert.deepEqual(Buffer.from(doc.output('arraybuffer')),Buffer.from(make(baseline.window).output('arraybuffer')));
  const preview=doc.output('blob');
  assert.equal(preview.type,'application/pdf');
  assert.ok(preview.size>1000);
  const blobs=[],downloads=[],timers=[];
  dom.window.URL.createObjectURL=blob=>{blobs.push(blob);return 'blob:local-test';};
  dom.window.URL.revokeObjectURL=()=>{};
  dom.window.setTimeout=fn=>{timers.push(fn);return timers.length;};
  const nativeCreate=dom.window.document.createElement.bind(dom.window.document);
  dom.window.document.createElement=(name,...args)=>{
    const element=nativeCreate(name,...args);
    if(name==='a') element.addEventListener('click',event=>{event.preventDefault();downloads.push(element.download);});
    return element;
  };
  doc.save('reading-log.pdf');
  while(timers.length) timers.shift()();
  assert.deepEqual(downloads,['reading-log.pdf']);
  assert.equal(blobs[0].type,'application/pdf');
  assert.equal(blobs[0].size,preview.size);
  dom.window.close();baseline.window.close();
});
