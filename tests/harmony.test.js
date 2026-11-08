import test from 'node:test';
import assert from 'node:assert/strict';
import {parseChord,parseProgression,transposeBars,chordTone,chordNoteName,generateLine,explainNote,TUNING} from '../src/music.js';

test('added ninth has no seventh; ninth chords retain their seventh shell',()=>{
  for(const [symbol,pcs] of [['Cadd9',[0,4,7,2]],['C9',[0,4,7,10]],['Cmaj9',[0,4,7,11]]]) {
    assert.deepEqual(parseChord(symbol).pcs,pcs,symbol);
  }
  assert.deepEqual(chordTone(parseChord('Cadd9'),38),{name:'D',role:'9度'});
  assert.equal(chordTone(parseChord('Cadd9'),46),null);
});
test('half diminished aliases include the minor seventh across roots',()=>{
  for(const [root,pcs,seventh] of [['B',[11,2,5,9],'A'],['F#',[6,9,0,4],'E'],['C',[0,3,6,10],'Bb']]) {
    for(const suffix of ['ø','ø7','h','h7','m7b5']) {
      const chord=parseChord(root+suffix);
      assert.deepEqual(chord.pcs,pcs,root+suffix);
      assert.deepEqual(chordTone(chord,pcs[3]),{name:seventh,role:'短7度'});
    }
  }
});
test('spelling follows root and degree, including diminished sevenths',()=>{
  for(const [symbol,midi,name,role] of [['D7',42,'F#','長3度'],['E7',44,'G#','長3度'],['Db7',41,'F','長3度'],['Eb7',43,'G','長3度'],['Cdim7',45,'Bbb','減7度'],['C6',45,'A','6度'],['F#maj7',41,'E#','長7度']]) {
    const bars=parseProgression(symbol),notes=[{midi}];
    assert.deepEqual(chordTone(bars[0][0],midi),{name,role});
    const info=explainNote(notes[0],0,notes,bars);
    assert.equal(info.role,role);assert.ok(info.text.startsWith(name));
    if(name==='Bbb') assert.match(info.text,/実音はAと同じ/);
  }
});
test('zero transposition preserves source spelling and slash bass',()=>{
  const bars=parseProgression('F#maj7/A# | Cdim7');
  assert.deepEqual(transposeBars(bars,0),bars);
  assert.deepEqual(transposeBars(bars,12),bars);
});
test('generation and displayed chord tones share harmony without altering TAB pitches',()=>{
  for(const symbol of ['Cadd9','Bø','Cdim7','D7','E7'])for(const difficulty of ['easy','normal','hard'])for(const seed of [1,7,42]) {
    const bars=parseProgression(`${symbol} | G7`),notes=generateLine(bars,{difficulty,seed});
    notes.forEach((n,i)=>{
      assert.equal(n.midi,TUNING[n.string]+n.fret);
      const chord=bars.flat()[i],info=explainNote(n,i,notes,bars);
      if(chord.pcs.includes(n.midi%12)) assert.ok(info.text.startsWith(chordNoteName(n.midi,chord)));
      if(i<4&&symbol==='Cadd9'&&n.midi%12===10) assert.equal(info.role,'つなぎの音');
    });
  }
});
