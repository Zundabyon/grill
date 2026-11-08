import { readFile, writeFile } from 'node:fs/promises';
import { parseProgression } from '../src/music.js';
const path=new URL('../data/weimar.json',import.meta.url),data=JSON.parse(await readFile(path,'utf8'));
for(const song of data.songs){try{if(song.signature!=='4/4')throw new Error('初版は4/4のみ');parseProgression(song.chords);song.supported=true;}catch{song.supported=false;}}
await writeFile(path,JSON.stringify(data,null,2)+'\n');
console.log(`${data.songs.filter(s=>s.supported).length}/${data.songs.length} charts supported by v1 parser`);
