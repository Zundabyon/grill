import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {TUNING,mod,parseChord,parseProgression,transposeBars,generateLine,explainNote} from '../src/music.js';
test('jazz chord qualities and inversions retain their harmony',()=>{
  assert.deepEqual(parseChord('Dm7').pcs,[2,5,9,0]);
  assert.deepEqual(parseChord('Bø7').pcs,[11,2,5,9]);
  assert.deepEqual(parseChord('Cmaj7').pcs,[0,4,7,11]);
  assert.deepEqual(parseChord('Fdim7').pcs,[5,8,11,2]);
  assert.equal(parseChord('Cmaj7/E').bass,4);
  for(const chord of ['H7','Cbanana','C7garbage','Cmystery'])assert.throws(()=>parseChord(chord));
});
test('measures, chord durations, slash repeats and no-chord are explicit',()=>{
  const bars=parseProgression('A1: ||Dm7 G7 | Cmaj7 | N.C. | / ||');
  assert.equal(bars.length,4);assert.deepEqual(bars[0].map(c=>c.symbol),['Dm7','Dm7','G7','G7']);assert.ok(bars[3][0].rest);
  assert.throws(()=>parseProgression('C D E'));assert.throws(()=>parseProgression('%'));
  assert.deepEqual(parseProgression('C-7F7 | C7/EbG7')[0].map(c=>c.symbol),['C-7','C-7','F7','F7']);
  assert.equal(parseProgression('C7/EbG7')[0][0].bass,3);
});
test('transposition moves slash bass and chord tones together',()=>{
  const c=transposeBars(parseProgression('Cmaj7/E'),2)[0][0];
  assert.equal(c.symbol,'D^7/Gb');assert.equal(c.bass,6);assert.deepEqual(c.pcs,[2,6,9,1]);
});
test('all generated notes are playable, bounded, reproducible, and target each chord change',()=>{
  const bars=parseProgression('Dm7 G7 | Cmaj7 | F#m7b5 B7 | Em6');
  for(const difficulty of ['easy','normal','hard'])for(let key=0;key<12;key++){
    const input=transposeBars(bars,key),options={min:0,max:5,difficulty,seed:42};
    const notes=generateLine(input,options);assert.deepEqual(notes,generateLine(input,options));assert.equal(notes.length,16);
    notes.forEach((n,i)=>{assert.equal(n.midi,TUNING[n.string]+n.fret);assert.ok(n.fret>=0&&n.fret<=5);if(i%4===0||input.flat()[i].symbol!==input.flat()[i-1].symbol)assert.equal(mod(n.midi),input.flat()[i].bass);});
  }
});
test('no-chord rests and impossible fret bounds never become invented notes',()=>{
  const bars=parseProgression('N.C. | C7');assert.ok(generateLine(bars).slice(0,4).every(n=>n.rest));
  assert.throws(()=>generateLine(parseProgression('C7'),{min:0,max:0}));
  assert.throws(()=>generateLine(bars,{min:6,max:5}));
});
test('edited note explanation describes current harmony and actual next note',()=>{
  const bars=parseProgression('Cmaj7 | F7'),notes=generateLine(bars);
  notes[0]={...notes[0],midi:30,string:3,fret:2};
  assert.equal(explainNote(notes[0],0,notes,bars).role,'つなぎの音');
});
test('every supported database chart parses and can generate its first four bars',async()=>{
  const data=JSON.parse(await readFile(new URL('../data/weimar.json',import.meta.url)));
  assert.ok(data.database.license.includes('Database Contents License'));
  let count=0;
  for(const song of data.songs.filter(s=>s.supported)){
    const bars=parseProgression(song.chords);const notes=generateLine(bars.slice(0,4));assert.equal(notes.length,Math.min(4,bars.length)*4,song.title);count++;
  }
  assert.ok(count>100);
});
