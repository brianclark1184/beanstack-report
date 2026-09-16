import {readFile,writeFile,mkdir} from 'node:fs/promises';
import sharp from 'sharp';

await mkdir('store/assets',{recursive:true});
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const policy=await readFile('docs/privacy-policy.md','utf8');
const inline=s=>escape(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
const content=policy.trim().split(/\n\n+/).map(block=>{
  if(block.startsWith('# '))return `<h1>${inline(block.slice(2))}</h1>`;
  if(block.startsWith('## '))return `<h2>${inline(block.slice(3))}</h2>`;
  if(block.startsWith('- '))return '<ul>'+block.split('\n').map(line=>`<li>${inline(line.slice(2))}</li>`).join('')+'</ul>';
  return `<p>${inline(block)}</p>`;
}).join('\n');
await writeFile('extension/privacy.html',`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Privacy — Reading Log for Beanstack</title><link rel="stylesheet" href="app.css"></head><body><main><section class="card">${content}<p><a href="https://github.com/brianclark1184/beanstack-report/issues" target="_blank" rel="noopener noreferrer">Project support</a></p></section></main></body></html>\n`);

// Original vector artwork: a reading book beside its printable log. No student data.
const promo=`<svg xmlns="http://www.w3.org/2000/svg" width="440" height="280" viewBox="0 0 440 280">
<rect width="440" height="280" fill="#275c4e"/>
<circle cx="28" cy="40" r="98" fill="#336958"/><circle cx="416" cy="265" r="115" fill="#1d4b40"/>
<g transform="translate(228 34) rotate(7 74 108)"><rect x="6" y="7" width="146" height="210" rx="8" fill="#153c34"/><rect width="146" height="210" rx="8" fill="#fffef8"/>
<rect x="20" y="21" width="76" height="8" rx="4" fill="#275c4e"/><path d="M20 44h106M20 62h106" stroke="#c2cbb9" stroke-width="4"/>
<path d="M20 86h106v100H20zM45 86v100M108 86v100M20 111h106M20 136h106M20 161h106" fill="none" stroke="#7e9a88" stroke-width="2"/>
<path d="m29 97 3 4 7-8m-10 30 3 4 7-8m-10 29 3 4 7-8" fill="none" stroke="#275c4e" stroke-width="3"/>
</g>
<g transform="translate(56 77)"><path d="M0 4h57q23 0 23 20q0-20 23-20h57v120h-57q-23 0-23 14q0-14-23-14H0z" fill="#f4ddb0"/><path d="M80 24v99M18 33h37M18 51h37M18 69h30M104 33h37M104 51h37M104 69h30" stroke="#275c4e" stroke-width="5" stroke-linecap="round"/></g>
<path d="m210 62 9 9-9 9m-13-9h20" fill="none" stroke="#f4ddb0" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
await writeFile('store/assets/promo.svg',promo);
await sharp(Buffer.from(promo)).png().toFile('store/assets/promo-440x280.png');
// The browser screenshot transport may encode/downscale captures. Export them
// as store-required PNGs at the requested viewport size; do not alter content.
for(const name of ['screenshot-profiles-1280x800.png','screenshot-export-1280x800.png']) {
  const file=`store/assets/${name}`;
  try {
    const capture=await readFile(file);
    const png=await sharp(capture).resize(1280,800,{fit:'fill'}).removeAlpha().png().toBuffer();
    await writeFile(file,png);
  } catch(error) {if(error.code!=='ENOENT')throw error;}
}
console.log('Built privacy page and Chrome Web Store promotional tile.');
