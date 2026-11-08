import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {STANDARD_CHARTS,standardSongs,filterSongs} from '../src/catalog.js';
import {parseProgression,generateLine} from '../src/music.js';
const data=JSON.parse(await readFile(new URL('../data/weimar.json',import.meta.url)));
const extra=JSON.parse(await readFile(new URL('../data/jht-standards.json',import.meta.url)));
const library=[...data.songs,...extra.songs];

test('33 distinct standards are playable through the entire chart at all three levels',()=>{
  const songs=standardSongs(library);
  assert.equal(songs.length,33);
  assert.equal(new Set(songs.map(s=>s.title)).size,33);
  assert.equal(new Set(STANDARD_CHARTS.map(s=>s.id)).size,33);
  for(const song of songs){
    const bars=parseProgression(song.chords);
    assert.ok(bars.length>=12,`${song.title} must not be a fragment`);
    for(const [difficulty,max] of [['easy',5],['normal',9],['hard',12]]){
      for(let start=0;start<bars.length;start+=4){
        const section=bars.slice(start,start+4);
        const notes=generateLine(section,{difficulty,min:0,max,seed:1});
        assert.equal(notes.length,section.length*4,`${song.title}, bar ${start+1}, ${difficulty}`);
      }
    }
  }
});

test('standard title search handles typographic apostrophes and surrounding spaces',()=>{
  const result=filterSongs(standardSongs(library),'  I’ll Remember April  ');
  assert.equal(result.length,1);assert.equal(result[0].title,"I'll Remember April");
});

test('new standard searches work without spaces and with Japanese aliases',()=>{
  const songs=standardSongs(library);
  assert.equal(filterSongs(songs,'flymetothemoon')[0].id,'jht:fly-me-to-the-moon');
  assert.equal(filterSongs(songs,'枯葉')[0].id,'jht:autumn-leaves');
  assert.equal(filterSongs(songs,'ブルーボッサ')[0].id,'jht:blue-bossa');
});

test('JHT extraction preserves every original chord onset and its provenance',()=>{
  for(const song of extra.songs){
    const bars=parseProgression(song.chords),original=song.original;
    assert.equal(bars.length,Math.max(...original.measures));
    original.chords.forEach((chord,i)=>{
      const normalized=chord.replace('%7','m7b5').replace('%','m7b5');
      assert.equal(bars[original.measures[i]-1][original.beats[i]-1].symbol,normalized);
    });
    assert.equal(song.provenance.license,'CC BY-NC-SA 4.0');
    assert.ok(song.provenance.authors.includes('Harasim'));
  }
});
