import {mkdir} from 'node:fs/promises';
import sharp from 'sharp';
await mkdir('extension/icons',{recursive:true});
const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="26" fill="#275c4e"/><path d="M24 29h29q11 0 11 10q0-10 11-10h29v70H75q-11 0-11 8q0-8-11-8H24z" fill="#fffef8"/><path d="M64 40v56M34 46h18M34 57h18M76 46h18M76 57h18" stroke="#275c4e" stroke-width="5" stroke-linecap="round"/></svg>');
for(const size of [16,48,128]) await sharp(svg).resize(size,size).png().toFile(`extension/icons/${size}.png`);
