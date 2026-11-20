import test from 'node:test';
import assert from 'node:assert/strict';
import {stat} from 'node:fs/promises';
import {BASS_SAMPLES,nearestSample} from '../src/sampler.js';
import {Player} from '../src/audio.js';

test('every playable fret has a bundled recording within two semitones',async()=>{
  for(let midi=28;midi<=63;midi++)assert.ok(Math.abs(nearestSample(midi)[0]-midi)<=2);
  for(const [,name] of BASS_SAMPLES)assert.ok((await stat(new URL(`../assets/bass-electric/${name}.mp3`,import.meta.url))).size>10000);
});

test('stop during sample loading prevents delayed playback from starting',async()=>{
  let release;
  const loading=new Promise(resolve=>{release=resolve;});
  const player=new Player(()=>{},()=>{});
  player.ctx={resume:async()=>{},currentTime:0,createGain:()=>({connect(){},gain:{setTargetAtTime(){}}})};
  player.sampler={prepare:()=>loading,stop:()=>{}};
  const starting=player.play([{midi:28}],()=>({countIn:false}));
  await Promise.resolve();
  player.stop();release();
  assert.equal(await starting,false);assert.equal(player.active,false);assert.equal(player.timer,null);
});

test('failed sample load is retryable without starting the transport',async()=>{
  const player=new Player(()=>{},()=>{});
  player.ctx={resume:async()=>{},currentTime:0,createGain:()=>({connect(){},gain:{setTargetAtTime(){}}})};
  player.sampler={prepare:async()=>{throw new Error('load failed');},stop:()=>{}};
  await assert.rejects(player.play([{midi:28}],()=>({countIn:false})),/load failed/);
  assert.equal(player.active,false);
});
