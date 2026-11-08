import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {STANDARD_CHARTS,standardSongs,filterSongs} from '../src/catalog.js';
import {parseProgression,generateLine} from '../src/music.js';
const data=JSON.parse(await readFile(new URL('../data/weimar.json',import.meta.url)));

test('30 distinct standards are playable through the entire chart at all three levels',()=>{
  const songs=standardSongs(data.songs);
  assert.equal(songs.length,30);
  assert.equal(new Set(songs.map(s=>s.title)).size,30);
  assert.equal(new Set(STANDARD_CHARTS.map(s=>s.id)).size,30);
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
  const result=filterSongs(standardSongs(data.songs),'  I’ll Remember April  ');
  assert.equal(result.length,1);assert.equal(result[0].title,"I'll Remember April");
});
