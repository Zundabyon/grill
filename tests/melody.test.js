import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {BLUE_BOSSA_MELODY,blueBossaMelody,melodyAt} from '../src/melody.js';
import {parseProgression,transposeBars} from '../src/music.js';
import {Player} from '../src/audio.js';
const data=JSON.parse(await readFile(new URL('../data/jht-standards.json',import.meta.url)));
const bars=parseProgression(data.songs.find(s=>s.id==='jht:blue-bossa').chords);
const id='jht:blue-bossa';
test('transcription has exact eighth-note attacks, tied bar crossings and 64 beats',()=>{
  assert.deepEqual(BLUE_BOSSA_MELODY.slice(0,6).map(n=>[n.beat,n.duration,n.midi]),[[0,1.5,79],[1.5,.5,77],[2,.5,75],[2.5,1,74],[3.5,3.5,72],[7,1,70]]);
  assert.deepEqual(melodyAt(BLUE_BOSSA_MELODY,4),{midi:72,onset:false});
  assert.deepEqual(melodyAt(BLUE_BOSSA_MELODY,11.5),{midi:77,onset:true});
  assert.deepEqual(melodyAt(BLUE_BOSSA_MELODY,12),{midi:77,onset:false});
  assert.deepEqual(melodyAt(BLUE_BOSSA_MELODY,63),{midi:67,onset:true});
  assert.equal(melodyAt(BLUE_BOSSA_MELODY,64),null);
  BLUE_BOSSA_MELODY.forEach((n,i)=>{
    assert.equal(n.beat*2,Math.round(n.beat*2));
    assert.equal(n.beat+n.duration,BLUE_BOSSA_MELODY[i+1]?.beat??64);
  });
});
test('melody matches the chart, transposes and resumes clipped ties in practice ranges',()=>{
  assert.equal(blueBossaMelody(bars,0,'C',id).length,BLUE_BOSSA_MELODY.length);
  assert.equal(blueBossaMelody(transposeBars(bars,2),0,'D',id)[0].midi,81);
  assert.equal(blueBossaMelody(transposeBars(bars,11),0,'B',id)[0].midi,78);
  assert.deepEqual(blueBossaMelody(bars.slice(1,2),1,'C',id),[{beat:0,duration:3,midi:72},{beat:3,duration:1,midi:70}]);
  assert.equal(blueBossaMelody(bars.slice(0,1),0,'C',id).at(-1).duration,.5);
  assert.deepEqual(blueBossaMelody(bars,0,'C',null),[]);
  assert.deepEqual(blueBossaMelody(bars,0,'D',id),[]);
  assert.deepEqual(blueBossaMelody(parseProgression('C7'),0,'C',id),[]);
});
test('eighth-note clock preserves quarter-note bass and advances held melody through tempo changes',()=>{
  const p=new Player(()=>{},()=>{}),events=[],bass=[],opts={bpm:120,loop:true,melody:true,bass:true};
  p.ctx={currentTime:0};p.channels=Object.fromEntries(['bass','piano','drums','melody'].map(n=>[n,{gain:{setTargetAtTime(){}}}]));
  p.band={melody:(time,n)=>events.push({time,n}),stop(){}};p.sampler={stop(){}};
  p.bass=(t,m)=>bass.push(t);p.notes=Array.from({length:4},()=>({midi:36}));p.chords=[];
  p.options=()=>opts;p.active=true;p.index=-1;p.nextTime=0;p.click=()=>{};
  p.melody=[{beat:0,duration:1.5,midi:79},{beat:1.5,duration:2.5,midi:77}];
  for(const t of [0,.25,.5,.75,1,1.25]){p.ctx.currentTime=t;p.schedule();}
  assert.equal(events[0].time,.5);assert.equal(events[3].time,1.25);
  assert.deepEqual(events[3].n,{midi:77,onset:true});
  assert.deepEqual(bass,[.5,1]);
  opts.bpm=60;p.ctx.currentTime=1.5;p.schedule();
  assert.equal(p.nextTime,2);assert.deepEqual(events.at(-1).n,{midi:77,onset:false});
  p.stop();assert.equal(p.uiTimers.size,0);
});
