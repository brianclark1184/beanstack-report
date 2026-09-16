import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {jsPDF} from 'jspdf';
import {readSnapshot,navigateMonth} from '../extension/extractor.js';
import {validateExport,validateProfile} from '../extension/model.js';
import {createPdf} from '../extension/pdf.js';

const origin='https://school.beanstack.com';
const reader={id:'123',name:'Sample Student',origin};
const profile={id:'p1',student:'Sample Student',teacher:'Ms. Rivera',className:'Reading · Room 4',dailyGoal:20,monthlyGoal:300,reader};
const item=(id,title,value)=>`<a class="reader-log-item" href="/profiles/123/reading_log/${id}"><div class="book-title">${title}</div><div class="log-value">${value}</div></a>`;
function fixture(month=8,entries={}) {
  const label=new Date(2026,month-1,1).toLocaleString('en-US',{month:'long'});
  let html=`<span class="reader-dropdown__name">Sample Student</span><div id="reader-log-content"><div class="reader-log-month-header"><h2>${label} 2026</h2><a class="reader-log-change-month next-month" href="/profiles/123/reading_log/update_reader_log?start_date=2026-09-01"></a><a class="reader-log-change-month previous-month" href="/profiles/123/reading_log/update_reader_log?start_date=2026-07-01"></a></div><div id="reader-log-calendar">`;
  for(let day=1;day<=new Date(2026,month,0).getDate();day++) html+=`<div class="reader-log-day"><div class="reader-log-day-date in-month"><div class="day-number"><span class="show-for-sr">Monday, ${label} ${day}, 2026</span></div></div>${entries[day]||''}</div>`;
  return html+'</div></div>';
}
function context(html=fixture(),url=origin+'/profiles/123/reading_log/dated_reading_log') {
  const dom=new JSDOM(html,{url,runScripts:'outside-only'});
  return {dom,read:()=>dom.window.eval(`(${readSnapshot.toString()})()`)};
}
test('preserves separate sessions, untimed entries, and deduplicates only identical entry IDs',()=>{
  const {read}=context(fixture(8,{1:item(1,'A &amp; B','10 minutes')+item(2,'A &amp; B','10 minutes')+item(3,'A &amp; B','Completed')+item(1,'A &amp; B','10 minutes'),2:item(4,'Long read','1 hour 5 minutes')}));
  const data=read();assert.equal(data.entries.length,4);assert.equal(data.entries[0].title,'A & B');assert.equal(data.entries[2].minutes,null);assert.equal(data.entries[3].minutes,65);assert.equal(data.entries.reduce((sum,e)=>sum+(e.minutes||0),0),85);
});
test('rejects incomplete calendars, unrecognized views, and mismatched entry readers',()=>{
  const {dom,read}=context();dom.window.document.querySelector('.reader-log-day').remove();assert.throws(read,/full month/);
  assert.throws(context('<h1>Log in</h1>').read,/Calendar view/);
  assert.throws(context(fixture(8,{1:item(2,'Title','20 minutes').replace('/123/','/999/')})).read,/Unexpected entry/);
  assert.throws(context(fixture(),'https://unrelated.example/profiles/123/reading_log').read,/Beanstack/);
});
test('ignores adjacent months and rejects conflicting repeated IDs',()=>{
  const {dom,read}=context(fixture(8,{1:item(1,'One','10 minutes')}));
  dom.window.document.querySelector('#reader-log-calendar').insertAdjacentHTML('beforeend',`<div class="reader-log-day"><div class="reader-log-day-date out-of-month"></div>${item(9,'Other month','90 minutes')}</div>`);
  assert.equal(read().entries.length,1);
  assert.throws(context(fixture(8,{1:item(1,'A','10 minutes')+item(1,'B','20 minutes')})).read,/Conflicting/);
});
test('export requires complete triplet, correct month, reader ID and site',()=>{
  const snapshot=context(fixture(8,{1:item(1,'Title','20 minutes')})).read();
  assert.equal(validateExport(profile,snapshot,'2026-08').length,1);
  assert.throws(()=>validateExport({...profile,reader:{...reader,id:'999'}},snapshot,'2026-08'),/Link/);
  assert.throws(()=>validateExport({...profile,reader:{...reader,origin:'https://another.beanstack.com'}},snapshot,'2026-08'),/Link/);
  assert.throws(()=>validateExport(profile,snapshot,'2026-09'),/selected month/);
  assert.throws(()=>validateProfile({...profile,teacher:''}),/Teacher/);
  assert.throws(()=>validateProfile({...profile,monthlyGoal:1.5}),/whole minutes/);
  assert.throws(()=>validateExport(profile,{...snapshot,entries:[]},'2026-08'),/no entries/);
});
test('month navigation waits for calendar replacement and checks reader',async()=>{
  const {dom}=context();
  dom.window.document.querySelector('.next-month').addEventListener('click',e=>{e.preventDefault();setTimeout(()=>{dom.window.document.body.innerHTML=fixture(9);},10);});
  await dom.window.eval(`(${navigateMonth.toString()})('2026-09',${JSON.stringify(reader)})`);
  assert.match(dom.window.document.querySelector('h2').textContent,/September/);
  await assert.rejects(dom.window.eval(`(${navigateMonth.toString()})('2026-08',${JSON.stringify({...reader,id:'999'})})`),/reader changed/);
  dom.window.close();
});
test('PDF paginates long titles and keeps minimum two pages with embedded fonts',()=>{
  const fonts=Object.fromEntries(['normal','bold'].map(s=>[s,readFileSync(new URL(`../extension/fonts/${s}.ttf`,import.meta.url)).toString('base64')]));
  const entries=Array.from({length:65},(_,i)=>({id:String(i),date:'2026-08-13',title:i%3===0?'The Extraordinary Adventures of a Very Curious Reader: A Long Book Title That Wraps Across Several Lines':`Book ${i+1} — café`,minutes:i%5===0?null:20,detail:i%5===0?'Completed':''}));
  const doc=createPdf(profile,{month:'2026-08',reader,entries},jsPDF,fonts);
  assert.ok(doc.getNumberOfPages()>=3);
  mkdirSync('tmp/extension-test',{recursive:true});writeFileSync('tmp/extension-test/layout-test.pdf',Buffer.from(doc.output('arraybuffer')));
  const short=createPdf(profile,{month:'2026-08',reader,entries:entries.slice(0,1)},jsPDF,fonts);assert.equal(short.getNumberOfPages(),2);
});
