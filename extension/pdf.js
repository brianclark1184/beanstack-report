import {validateExport} from './model.js';

export function createPdf(profile, snapshot, JsPDF, fonts) {
  const entries = validateExport(profile,snapshot,snapshot.month);
  const doc = new JsPDF({unit:'pt',format:'letter',compress:true,putOnlyUsedFonts:true});
  for (const [style,data] of Object.entries(fonts)) {
    doc.addFileToVFS(`Log-${style}.ttf`,data);
    doc.addFont(`Log-${style}.ttf`,'Log',style);
  }
  const setFont = (size=10,style='normal') => {doc.setFont('Log',style);doc.setFontSize(size);};
  const text = (value,x,y,size=10,style='normal',options={}) => {setFont(size,style);doc.text(Array.isArray(value)?value:String(value),x,y,options);};
  const fit = (value,x,y,width,size=11) => {
    setFont(size,'bold');
    while(doc.getTextWidth(value)>width && size>6) { size-=0.25;setFont(size,'bold'); }
    const lines = doc.splitTextToSize(value,width);
    if(lines.length>1) throw new Error('An identity field is too long for the PDF header. Shorten it and try again.');
    doc.text(value,x,y);
  };
  const [year,month] = snapshot.month.split('-').map(Number);
  const monthLabel = new Date(year,month-1,1).toLocaleDateString('en-US',{month:'long',year:'numeric'});
  doc.setProperties({title:`Reading Log - ${profile.student} - ${monthLabel}`,author:'Reading Log for Beanstack'});
  doc.setDrawColor(0);doc.setTextColor(0);doc.setLineWidth(1);
  text('Student',26,31);doc.line(70,35,350,35);fit(profile.student,76,31,268);
  text('Month',370,31);doc.line(408,35,586,35);fit(monthLabel,414,31,166);
  text('Teacher',26,58);doc.line(70,62,294,62);fit(profile.teacher,76,58,212);
  text('Class',314,58);doc.line(348,62,586,62);fit(profile.className,354,58,226);
  text('Beanstack Reading Log',306,111,28,'bold',{align:'center'});
  text('GOAL',32,189,44,'bold',{renderingMode:'stroke'});
  doc.circle(220,164,6);doc.circle(220,200,6);
  text(`Read ${profile.dailyGoal.toLocaleString('en-US')} minutes each night`,237,169,13);
  text(`Read ${profile.monthlyGoal.toLocaleString('en-US')} minutes by the end of the month`,237,205,12);
  const totalMinutes = entries.reduce((sum,entry)=>sum+(entry.minutes||0),0);
  text(`Total Minutes Read: ${totalMinutes.toLocaleString('en-US')}`,237,227,12,'bold');
  const columns=[26,102,421,501,586];
  let cursor=0, page=1;
  do {
    if(page>1) {
      doc.addPage();
      fit(profile.student,26,29,320,10);
      text(monthLabel,586,29,10,'normal',{align:'right'});
    }
    let y = page===1 ? 242 : 48;
    const top=y, bottom=750, header=38;
    for(const [i,label] of ['Date','Book Title','Minutes','Did I log my\nreading?'].entries()) {
      text(label,(columns[i]+columns[i+1])/2,y+(i===3?15:24),i===3?8.5:11,'bold',{align:'center'});
    }
    y+=header;doc.line(26,y,586,y);
    while(cursor<entries.length) {
      const entry=entries[cursor];
      setFont(8.5);
      const label=entry.title+(entry.detail?` (${entry.detail})`:'');
      const lines=doc.splitTextToSize(label,columns[2]-columns[1]-12);
      const height=Math.max(24,lines.length*10+10);
      if(height>650) throw new Error('A book title is too long to fit on a page.');
      if(y+height>bottom) break;
      const date=entry.date.split('-').map(Number);
      const baseline=y+height/2+3;
      text(`${date[1]}/${date[2]}`,64,baseline,8.5,'normal',{align:'center'});
      text(lines,108,y+(height-lines.length*10)/2+8.5,8.5);
      text(entry.minutes===null?'-':entry.minutes,461,baseline,9,'bold',{align:'center'});
      text('Yes',543,baseline,9,'bold',{align:'center'});
      y+=height;doc.line(26,y,586,y);cursor++;
    }
    // Keep writable blank rows and the original minimum two-page format.
    while(y+24<=bottom) {y+=24;doc.line(26,y,586,y);}
    doc.line(26,top,586,top);
    for(const x of columns) doc.line(x,top,x,y);
    text('Entries without recorded minutes show a dash.',26,772,8);
    text(`Page ${page}`,586,772,8,'normal',{align:'right'});
    page++;
  } while(cursor<entries.length || page<=2);
  return doc;
}

export async function loadFonts() {
  const values = await Promise.all(['normal','bold'].map(async style=>{
    const response=await fetch(`fonts/${style}.ttf`);
    if(!response.ok) throw new Error('The bundled PDF font is missing. Reinstall the complete extension folder.');
    const bytes=new Uint8Array(await response.arrayBuffer());
    let binary='';
    for(let i=0;i<bytes.length;i+=8192) binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
    return [style,btoa(binary)];
  }));
  return Object.fromEntries(values);
}
