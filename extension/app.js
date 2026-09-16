import {readSnapshot,navigateMonth} from './extractor.js';
import {defaultProfile,validateProfile,validateExport,sameReader,profileLabel} from './model.js';
import {createPdf,loadFonts} from './pdf.js';

const $=id=>document.getElementById(id);
const fields=['student','teacher','className','dailyGoal','monthlyGoal'];
const sourceTab=Number(new URLSearchParams(location.search).get('tab'));
let profiles=[], draft=defaultProfile(), snapshot=null, hasSource=false, busy=false, dirty=false, previewUrl=null;
const store = chrome.storage.local;
function message(text,error=false) { $('status').textContent=text;$('status').classList.toggle('error',error); }
function fromForm() {return {...draft,...Object.fromEntries(fields.map(key=>[key,key.endsWith('Goal')?Number($(key).value):$(key).value.trim()]))};}
function renderProfiles() {
  $('profiles').replaceChildren(new Option('New profile',''),...profiles.map(p=>new Option(profileLabel(p),p.id)));
  $('profiles').value=profiles.some(p=>p.id===draft.id)?draft.id:'';
}
function showDraft() {
  fields.forEach(key=>$(key).value=draft[key]);dirty=false;renderProfiles();renderReader();updateButtons();
}
function renderReader() {
  $('linked-reader').textContent=draft.reader?`${draft.reader.name} · ${new URL(draft.reader.origin).hostname}`:'No reader linked yet.';
  $('link-reader').textContent=snapshot?`Use reader: ${snapshot.reader.name}`:'Use current Beanstack reader';
}
function updateButtons() {
  let valid=false;
  try {validateExport(fromForm(),snapshot,$('month').value);valid=true;} catch {}
  for(const id of ['preview','download']) $(id).disabled=busy||!valid;
  $('read-month').disabled=busy||!hasSource;
  $('link-reader').disabled=busy||!snapshot||sameReader(draft.reader,snapshot.reader);
  $('delete-profile').disabled=busy||!profiles.some(p=>p.id===draft.id);
  for(const id of ['save-profile','new-profile','profiles','month',...fields]) $(id).disabled=busy;
}
function showEntries() {
  $('entries').replaceChildren();
  if(!snapshot) {
    $('entry-count').textContent='—';$('minute-count').textContent='—';$('month-badge').textContent='Not loaded';
    $('empty').hidden=false;$('empty').textContent='Read the selected month to load entries.';return;
  }
  for(const e of snapshot.entries) {
    const tr=document.createElement('tr');
    const date=document.createElement('td');date.textContent=`${Number(e.date.slice(5,7))}/${Number(e.date.slice(8))}`;
    const title=document.createElement('td');title.textContent=e.title;
    if(e.detail) {const small=document.createElement('small');small.textContent=e.detail;title.append(small);}
    const minutes=document.createElement('td');minutes.textContent=e.minutes===null?'—':e.minutes;
    tr.append(date,title,minutes);$('entries').append(tr);
  }
  const total=snapshot.entries.reduce((sum,e)=>sum+(e.minutes||0),0);
  $('entry-count').textContent=snapshot.entries.length;
  $('minute-count').textContent=total.toLocaleString('en-US');
  $('month-badge').textContent=snapshot.month;
  $('empty').hidden=snapshot.entries.length>0;
  $('empty').textContent='No entries were recorded in this month.';
  $('source').textContent=`Source: ${snapshot.reader.name} · ${new URL(snapshot.reader.origin).hostname} · Read at ${new Date(snapshot.capturedAt).toLocaleTimeString()}`;
  const untimed=snapshot.entries.filter(e=>e.minutes===null).length;
  $('entry-note').textContent=`One row per entry. Repeated sessions are kept separate.${untimed?` ${untimed} entries have no recorded minutes and show a dash.`:''}`;
  renderReader();updateButtons();
}
async function inject(func,args=[]) {
  if(!Number.isInteger(sourceTab)||sourceTab<=0) throw new Error('Open Beanstack’s Reading Log calendar and click the extension icon to begin.');
  const result=await chrome.scripting.executeScript({target:{tabId:sourceTab},func,args});
  if(result[0]?.error) throw new Error(result[0].error.message || 'Could not read Beanstack.');
  return result[0]?.result;
}
// Return structured errors as Chrome versions differ in rejected injection handling.
async function capture() {
  const result=await inject(readSnapshot);
  if(!result?.reader||!Array.isArray(result.entries)) throw new Error('Could not read the calendar. In Beanstack, select Reading Log → Calendar view and click the extension icon again.');
  return result;
}
async function saveProfile(showMessage=true) {
  const next=validateProfile(fromForm());
  await navigator.locks.request('reading-log-profiles',async()=>{
    const saved=await store.get('profiles');const latest=Array.isArray(saved.profiles)?saved.profiles:[];
    const updated=latest.some(p=>p.id===next.id)?latest.map(p=>p.id===next.id?next:p):[...latest,next];
    await store.set({profiles:updated,lastProfileId:next.id});profiles=updated;
  });
  draft=next;dirty=false;renderProfiles();updateButtons();
  if(showMessage) message(`Saved ${profileLabel(next)}.${next.reader?'':' Link a Beanstack reader before exporting.'}`);
}
async function run(work) {
  if(busy)return;busy=true;updateButtons();
  try{await work();}catch(error){
    const raw=error.message||String(error);
    message(/Cannot access|No tab|No frame|Missing host permission|extensions gallery/i.test(raw)?'Return to the intended reader’s Beanstack calendar and click the extension icon again. This tab no longer has access.':raw,true);
  }finally{busy=false;updateButtons();}
}
$('profile-form').addEventListener('submit',e=>{e.preventDefault();run(()=>saveProfile());});
for(const key of fields) $(key).addEventListener('input',()=>{dirty=true;updateButtons();});
$('profiles').addEventListener('change',()=>{
  const value=$('profiles').value;
  if(dirty&&!confirm('Discard unsaved changes to this profile?')){renderProfiles();return;}
  draft=structuredClone(profiles.find(p=>p.id===value)||defaultProfile());showDraft();
  if(snapshot&&!sameReader(draft.reader,snapshot.reader)) message('This profile needs its matching Beanstack reader. Open that reader’s calendar and click the extension, or link the current reader if appropriate.');
});
$('new-profile').addEventListener('click',()=>{
  if(dirty&&!confirm('Discard unsaved changes to this profile?'))return;
  draft=defaultProfile();showDraft();message('Enter the student, teacher, and class, then link the correct Beanstack reader.');
});
$('link-reader').addEventListener('click',()=>{
  if(!snapshot)return;
  draft.reader=structuredClone(snapshot.reader);dirty=true;renderReader();updateButtons();
  message(`Linked to ${snapshot.reader.name}. Save the profile to remember this reader.`);
});
$('delete-profile').addEventListener('click',()=>$('delete-dialog').showModal());
$('cancel-delete').addEventListener('click',()=>$('delete-dialog').close());
$('confirm-delete').addEventListener('click',()=>run(async()=>{
  await navigator.locks.request('reading-log-profiles',async()=>{
    const saved=await store.get('profiles');const latest=Array.isArray(saved.profiles)?saved.profiles:[];
    const updated=latest.filter(p=>p.id!==draft.id);await store.set({profiles:updated,lastProfileId:null});profiles=updated;
  });
  draft=defaultProfile();showDraft();$('delete-dialog').close();message('Profile deleted.');
}));
$('month').addEventListener('change',()=>{updateButtons();if(snapshot&&snapshot.month!==$('month').value)message('Click Read from Beanstack to load the selected month.');});
$('read-month').addEventListener('click',()=>run(async()=>{
  const month=$('month').value;
  const previous=snapshot;snapshot=null;showEntries();updateButtons();
  const before=await capture();
  if(draft.reader&&!sameReader(draft.reader,before.reader)) throw new Error('The active Beanstack reader does not match this profile. Open the correct reader and click the extension icon.');
  if(previous&&!sameReader(previous.reader,before.reader)) throw new Error('The Beanstack reader changed. Reopen the extension from the intended reader’s calendar.');
  message('Loading the selected month in your Beanstack tab…');
  // Invalidate old data before navigation so errors cannot leave an exportable stale capture.
  await inject(navigateMonth,[month,before.reader]);
  const result=await capture();
  if(result.month!==month||!sameReader(result.reader,before.reader)) throw new Error('Beanstack changed while reading. Open the correct calendar and click the extension again.');
  snapshot=result;showEntries();message(`Read ${snapshot.entries.length} entries for ${month}. Check the profile and download your PDF.`);
}));
async function buildPdf(){validateExport(fromForm(),snapshot,$('month').value);await saveProfile(false);return createPdf(draft,snapshot,window.jspdf.jsPDF,await loadFonts());}
$('preview').addEventListener('click',()=>run(async()=>{
  const doc=await buildPdf();if(previewUrl)URL.revokeObjectURL(previewUrl);
  previewUrl=URL.createObjectURL(doc.output('blob'));$('pdf-frame').src=previewUrl;$('pdf-dialog').showModal();
  message('Preview ready. Your profile and goals are saved.');
}));
$('download').addEventListener('click',()=>run(async()=>{
  const doc=await buildPdf();
  const name=draft.student.replace(/[^\p{L}\p{N}_-]+/gu,'-').replace(/^-|-$/g,'')||'student';
  doc.save(`${snapshot.month}-reading-log-${name}.pdf`);message('PDF download started. Your profile and goals are saved.');
}));
$('close-preview').addEventListener('click',()=>$('pdf-dialog').close());
$('pdf-dialog').addEventListener('close',()=>{$('pdf-frame').removeAttribute('src');if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=null;});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
await run(async()=>{
  // Keep student settings available only to extension pages, not content scripts.
  await store.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'});
  const saved=await store.get(['profiles','lastProfileId']);profiles=Array.isArray(saved.profiles)?saved.profiles:[];
  draft=structuredClone(profiles.find(p=>p.id===saved.lastProfileId)||defaultProfile());showDraft();
  snapshot=await capture();hasSource=true;$('month').value=snapshot.month;
  const matching=profiles.filter(p=>sameReader(p.reader,snapshot.reader));
  if(!sameReader(draft.reader,snapshot.reader)&&matching.length===1){draft=structuredClone(matching[0]);showDraft();}
  if(!profiles.length){draft.student=snapshot.reader.name;showDraft();}
  showEntries();message(sameReader(draft.reader,snapshot.reader)?'Reading history loaded. Choose a month or download your log.':`Reading history loaded for ${snapshot.reader.name}. Check the profile and click Use reader to link it.`);
});
