export const defaultProfile = () => ({id:crypto.randomUUID(),student:'',teacher:'',className:'',dailyGoal:20,monthlyGoal:300,reader:null});
export function validateProfile(profile) {
  for (const [key,label] of [['student','Student'],['teacher','Teacher'],['className','Class']]) {
    if (typeof profile[key] !== 'string' || !profile[key].trim()) throw new Error(`${label} is required.`);
    if (profile[key].length > 120) throw new Error(`${label} must be 120 characters or fewer.`);
  }
  for (const key of ['dailyGoal','monthlyGoal']) {
    if (!Number.isInteger(profile[key]) || profile[key]<1 || profile[key]>100000) throw new Error('Goals must be whole minutes between 1 and 100,000.');
  }
  return profile;
}
export function sameReader(a,b) { return Boolean(a && b && a.id===b.id && a.origin===b.origin); }
export function validateExport(profile,snapshot,month) {
  validateProfile(profile);
  if (!snapshot || snapshot.month!==month) throw new Error('Read the selected month from Beanstack before exporting.');
  if (!sameReader(profile.reader,snapshot.reader)) throw new Error('Link this profile to the current Beanstack reader before exporting.');
  if (!snapshot.entries.length) throw new Error('There are no entries for this month.');
  return snapshot.entries;
}
export function profileLabel(p) { return `${p.student} / ${p.teacher} / ${p.className}`; }
