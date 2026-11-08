import test from 'node:test';
import assert from 'node:assert/strict';
import {parseChord,parseProgression,transposeBars} from '../src/music.js';
import {pianoVoicing} from '../src/accompaniment.js';
import {Player} from '../src/audio.js';

test('piano shells distinguish chord qualities and leave the bass register clear',()=>{
  for(const [symbol,expected] of [['Cmaj7',[64,67,71]],['C7',[64,67,70]],['Cm7',[63,67,70]],['Cø',[63,66,70]],['Cdim7',[63,66,69]],['Cadd9',[62,64,67]],['C9',[64,67,70]]]){
    assert.deepEqual(pianoVoicing(parseChord(symbol)),expected,symbol);
  }
  assert.deepEqual(pianoVoicing(parseChord('N.C.')),[]);
  assert.deepEqual(pianoVoicing(transposeBars(parseProgression('Cmaj7'),2)[0][0]),[61,66,69]);
});
function transport(chords,opts={}){
  const events=[],mix={};
  const p=new Player(()=>{},()=>{});
  p.ctx={currentTime:0};
  p.channels=Object.fromEntries(['bass','piano','drums'].map(name=>[name,{gain:{setTargetAtTime(value){mix[name]=value;}}}]));
  p.band={chord:(t,c)=>events.push(['piano',t,c.symbol]),beat:(t,b)=>events.push(['drums',t,b]),stop(){}};
  p.sampler={stop(){}};
  p.bass=(t,m)=>events.push(['bass',t,m]);p.click=(t)=>events.push(['click',t]);
  p.notes=chords.map(c=>c.rest?{rest:true}:{midi:36});p.chords=chords;
  p.options=()=>({bpm:120,bass:true,piano:true,drums:true,loop:true,...opts});
  p.active=true;p.index=0;p.nextTime=0;
  return {p,events,mix};
}
test('chord changes, N.C., count-in and loop share the beat clock',()=>{
  const chords=parseProgression('Dm7 G7 Cmaj7 N.C.').flat(),{p,events}=transport(chords);
  p.index=-1;p.schedule();assert.deepEqual(events,[['click',0]]);
  p.ctx.currentTime=.5;p.schedule();
  p.ctx.currentTime=1;p.schedule();
  p.ctx.currentTime=1.5;p.schedule();
  p.ctx.currentTime=2;p.schedule();
  p.ctx.currentTime=2.5;p.schedule();
  assert.deepEqual(events.filter(e=>e[0]==='piano').map(e=>e[2]),['Dm7','G7','Cmaj7','N.C.','Dm7']);
  // The N.C. chord renderer returns no notes; bass rests, drums keep the pulse.
  assert.equal(events.filter(e=>e[0]==='bass').length,4);
  assert.equal(events.filter(e=>e[0]==='drums').length,5);
  p.stop();
});
test('live mix mutes channels and tempo changes affect the next scheduled interval',()=>{
  const opts={bass:false,bpm:120}, {p,events,mix}=transport(parseProgression('C7').flat(),opts);
  p.schedule();assert.equal(mix.bass,0);assert.equal(events.some(e=>e[0]==='bass'),false);
  opts.piano=false;opts.drumsVolume=.2;opts.bpm=60;p.ctx.currentTime=.5;p.schedule();
  assert.equal(mix.piano,0);assert.equal(mix.drums,.2);assert.equal(p.nextTime,1.5);
  p.stop();assert.equal(p.active,false);assert.equal(p.uiTimers.size,0);
});
