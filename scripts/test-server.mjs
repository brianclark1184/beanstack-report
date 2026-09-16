// Local UI test harness only. Never included in the extension or private ZIP.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('extension');
const demo={month:'2026-08',reader:{id:'123',name:'Sample Student',origin:'https://school.beanstack.com'},capturedAt:new Date().toISOString(),entries:Array.from({length:28},(_,i)=>({id:String(i),date:`2026-08-${String(1+Math.floor(i/2)).padStart(2,'0')}`,title:i%3===0?'The Extraordinary Adventures of a Very Curious Reader':`A Good Book ${i+1}`,minutes:i%7===0?null:20,detail:i%7===0?'Completed':''}))};
const shim=`window.chrome={storage:{local:{setAccessLevel:async()=>{},get:async()=>JSON.parse(localStorage.getItem('testProfiles')||'{}'),set:async data=>localStorage.setItem('testProfiles',JSON.stringify({...JSON.parse(localStorage.getItem('testProfiles')||'{}'),...data}))}},scripting:{executeScript:async ({func,args})=>{if(func.name==='navigateMonth'){window.testMonth=args[0];return [{result:null}];}return [{result:{...${JSON.stringify(demo)},month:window.testMonth||'2026-08',entries:${JSON.stringify(demo.entries)}.map(e=>({...e,date:(window.testMonth||'2026-08')+e.date.slice(7)}))}}];}}};`;
http.createServer(async(req,res)=>{
  try {
    const pathname=new URL(req.url,'http://localhost').pathname;
    const target=path.resolve(root,'.'+(pathname==='/'?'/app.html':decodeURIComponent(pathname)));
    if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    let data=await readFile(target);
    if(target.endsWith('app.html')) data=Buffer.from(data.toString().replace('<script src="vendor/',`<script>${shim}</script><script src="vendor/`));
    const type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.ttf':'font/ttf','.png':'image/png'}[path.extname(target)]||'application/octet-stream';
    res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(data);
  } catch {res.writeHead(404).end('Not found');}
}).listen(8766,'127.0.0.1',()=>console.log('Local extension UI harness: http://127.0.0.1:8766/app.html?tab=123'));
