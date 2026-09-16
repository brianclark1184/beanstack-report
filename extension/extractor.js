// Self-contained functions: Chrome serializes them into the granted tab.
export function readSnapshot() {
  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const path = location.pathname.match(/^\/profiles\/(\d+)\/reading_log(?:\/|$)/);
  if (location.protocol !== 'https:' || !location.hostname.endsWith('.beanstack.com') || !path) {
    throw new Error('Open a reader’s Beanstack Reading Log calendar, then click the extension icon there.');
  }
  const calendar = document.querySelector('#reader-log-calendar');
  const heading = clean(document.querySelector('.reader-log-month-header h2')?.textContent);
  const match = heading.match(/^([A-Za-z]+) (\d{4})$/);
  if (!calendar || !match || !months.includes(match[1])) {
    throw new Error('Switch Beanstack to Calendar view and wait for the month to load.');
  }
  const month = `${match[2]}-${String(months.indexOf(match[1])+1).padStart(2,'0')}`;
  const readerName = clean(document.querySelector('.reader-dropdown__name')?.textContent);
  if (!readerName) throw new Error('Could not identify the current Beanstack reader.');
  const entries = [], ids = new Map(), days = new Set();
  for (const day of calendar.querySelectorAll('.reader-log-day')) {
    if (!day.querySelector('.reader-log-day-date.in-month')) continue;
    const dateText = clean(day.querySelector('.day-number > .show-for-sr')?.textContent);
    const dm = dateText.match(/^[A-Za-z]+, ([A-Za-z]+) (\d{1,2}), (\d{4})$/);
    if (!dm || !months.includes(dm[1])) throw new Error('A calendar date could not be read. Nothing was exported.');
    const date = `${dm[3]}-${String(months.indexOf(dm[1])+1).padStart(2,'0')}-${dm[2].padStart(2,'0')}`;
    if (!date.startsWith(month+'-')) throw new Error('The calendar is still changing. Try reading it again.');
    days.add(Number(dm[2]));
    for (const item of day.querySelectorAll('a.reader-log-item')) {
      const title = clean(item.querySelector('.book-title')?.textContent) || 'Untitled reading';
      const value = clean(item.querySelector('.log-value')?.textContent);
      const link = new URL(item.getAttribute('href'), location.href);
      const idMatch = link.pathname.match(/^\/profiles\/(\d+)\/reading_log\/(\d+)$/);
      if (link.origin !== location.origin || !idMatch || idMatch[1] !== path[1]) throw new Error('Unexpected entry link. Nothing was exported.');
      const duration = value.match(/^(\d+(?:\.\d+)?)\s+minutes?$/i);
      const hours = value.match(/^(\d+)\s+hours?(?:\s+(\d+)\s+minutes?)?$/i);
      const minutes = duration ? Number(duration[1]) : hours ? Number(hours[1])*60+Number(hours[2]||0) : null;
      // Preserve non-time entries, such as Completed or pages, without inventing minutes.
      if (!value) throw new Error('An entry has no readable value. Nothing was exported.');
      const entry = {id:idMatch[2], date, title, minutes, detail: minutes === null ? value : ''};
      if (ids.has(entry.id)) {
        if (JSON.stringify(ids.get(entry.id)) !== JSON.stringify(entry)) throw new Error('Conflicting duplicate entries. Try reading again.');
        continue;
      }
      ids.set(entry.id, entry);
      entries.push(entry);
    }
  }
  const count = new Date(Number(match[2]), months.indexOf(match[1])+1, 0).getDate();
  if (days.size !== count || Array.from({length:count},(_,i)=>i+1).some(d=>!days.has(d))) {
    throw new Error('The full month has not loaded. Wait for Beanstack, then read again.');
  }
  entries.sort((a,b)=>a.date.localeCompare(b.date));
  return {month, reader:{id:path[1], name:readerName, origin:location.origin}, entries, capturedAt:new Date().toISOString()};
}

export async function navigateMonth(targetMonth, expectedReader) {
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const getMonth = () => {
    const s = document.querySelector('.reader-log-month-header h2')?.textContent.trim();
    const m = s?.match(/^([A-Za-z]+) (\d{4})$/);
    if (!m || !months.includes(m[1])) throw new Error('Open Beanstack Calendar view first.');
    return `${m[2]}-${String(months.indexOf(m[1])+1).padStart(2,'0')}`;
  };
  const checkReader = () => {
    const id = location.pathname.match(/^\/profiles\/(\d+)\/reading_log(?:\/|$)/)?.[1];
    if (location.origin !== expectedReader.origin || id !== expectedReader.id) throw new Error('The Beanstack reader changed. Reopen the extension from the intended reader’s calendar.');
  };
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(targetMonth)) throw new Error('Choose a valid month.');
  const index = (s) => Number(s.slice(0,4))*12+Number(s.slice(5));
  checkReader();
  if (Math.abs(index(targetMonth)-index(getMonth())) > 24) throw new Error('For a month more than two years away, navigate closer in Beanstack first.');
  for (let step=0; step<25; step++) {
    checkReader();
    const current = getMonth();
    if (current === targetMonth) return;
    const forward = current < targetMonth;
    const button = document.querySelector(forward ? '.reader-log-change-month.next-month' : '.reader-log-change-month.previous-month');
    if (!button || button.classList.contains('disabled') || button.getAttribute('aria-disabled') === 'true') throw new Error('Beanstack cannot navigate to that month.');
    const href = new URL(button.getAttribute('href'), location.href);
    if (href.origin !== location.origin || !href.pathname.startsWith(`/profiles/${expectedReader.id}/reading_log/`)) throw new Error('Unexpected month navigation.');
    const oldCalendar = document.querySelector('#reader-log-calendar');
    await new Promise((resolve,reject) => {
      let stable;
      const finish = (error) => { observer.disconnect(); clearTimeout(timeout); clearTimeout(stable); error ? reject(error) : resolve(); };
      const observer = new MutationObserver(() => {
        clearTimeout(stable);
        stable = setTimeout(() => {
          try {
            checkReader();
            if (getMonth() !== current && document.querySelector('#reader-log-calendar') !== oldCalendar) finish();
          } catch (error) { finish(error); }
        }, 200);
      });
      const timeout = setTimeout(()=>finish(new Error('Beanstack took too long to load the month. Try again.')),15000);
      observer.observe(document.body, {subtree:true,childList:true});
      button.click();
    });
    if (index(getMonth()) !== index(current)+(forward ? 1 : -1)) throw new Error('The month changed unexpectedly. Try again.');
  }
  throw new Error('Could not reach the selected month.');
}
