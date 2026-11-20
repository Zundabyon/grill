import {mod,pitchClass} from './music.js';

// User-supplied Blue Bossa lead sheet, first 16-bar chorus only.
// Beats are zero-based quarter notes. Ties are single events, not repeated attacks.
// Initial G4 pickup is omitted; the optional G4 pickup at beat 64 leads the loop.
export const BLUE_BOSSA_MELODY = [
  [0,1.5,79],[1.5,.5,77],[2,.5,75],[2.5,1,74],[3.5,3.5,72],[7,1,70],
  [8,2,68],[10,1.5,79],[11.5,4.5,77],
  [16,1.5,77],[17.5,.5,75],[18,.5,74],[18.5,1,72],[19.5,3.5,70],[23,1,68],
  [24,2,67],[26,1.5,77],[27.5,4.5,75],
  [32,1.5,75],[33.5,.5,73],[34,.5,72],[34.5,1,70],[35.5,3.5,68],[39,1,66],
  [40,1,66],[41,.5,65],[41.5,1,70],[42.5,.5,65],[43,5,68],
  [48,1,68],[49,.5,67],[49.5,2.5,70],
  [52,1,68],[53,.5,67],[53.5,2,70],[55.5,.5,68],
  [56,7,67],[63,1,67],
].map(([beat,duration,midi])=>Object.freeze({beat,duration,midi}));

// Match harmony, not title alone: edited charts or unrelated same-title files stay silent.
export function blueBossaMelody(bars,offset=0,key='C',sourceId=null){
  if(sourceId!=='jht:blue-bossa'||!Number.isInteger(offset)||offset<0||offset+bars.length>16)return [];
  const shift=mod(pitchClass(key)),expectedRoots=[0,0,5,5,2,7,0,0,3,8,1,1,2,7,0,2];
  const expectedQualities=['-7','-7','-7','-7','-7b5','7','-7','-7','-7','7','^7','^7','-7b5','7','-7','-7b5'];
  for(let b=0;b<bars.length;b++)for(let beat=0;beat<4;beat++){
    const n=offset+b,c=bars[b][beat],last=n===15&&beat>=2;
    if(!c||c.rest||c.root!==mod((last?7:expectedRoots[n])+shift)||c.bass!==c.root||c.quality!==(last?'7':expectedQualities[n]))return [];
  }
  const start=offset*4,end=start+bars.length*4;
  // Signed transposition keeps the melody close to its original register.
  const semitones=shift>6?shift-12:shift;
  return BLUE_BOSSA_MELODY.filter(n=>n.beat<end&&n.beat+n.duration>start).map(n=>({
    beat:Math.max(n.beat,start)-start,duration:Math.min(n.beat+n.duration,end)-Math.max(n.beat,start),midi:n.midi+semitones,
  }));
}
export function melodyAt(events,beat){
  const event=events.find(n=>n.beat<=beat&&beat<n.beat+n.duration);
  return event?{midi:event.midi,onset:event.beat===beat}:null;
}
