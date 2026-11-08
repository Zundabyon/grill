export const TUNING = [43, 38, 33, 28]; // TAB order: G D A E, sounding MIDI
export const STRINGS = ['G', 'D', 'A', 'E'];
const SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLAT = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
export const mod = n => ((n % 12) + 12) % 12;
export const noteName = (n, flats = true) => (flats ? FLAT : SHARP)[mod(n)];
export function pitchClass(s) {
  const m = /^([A-G])([#b]?)$/.exec(s.replaceAll('♭','b').replaceAll('♯','#'));
  if (!m) throw new Error(`音名「${s}」を確認してください。`);
  return mod({C:0,D:2,E:4,F:5,G:7,A:9,B:11}[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0));
}
export function parseChord(text) {
  const symbol = text.trim().replaceAll('♭','b').replaceAll('♯','#').replaceAll('−','-').replaceAll('Δ','^').replaceAll('ø','h').replaceAll('°','o');
  if (/^(N\.?C\.?|n)$/i.test(symbol)) return {symbol:'N.C.', rest:true, pcs:[]};
  const m = /^([A-G])([#b]?)([^/]*)(?:\/([A-G][#b]?))?$/.exec(symbol);
  if (!m) throw new Error(`未対応のコード「${text}」。例：Dm7、G7、Cmaj7、Am7b5`);
  const root = pitchClass(m[1]+m[2]);
  let quality = m[3].replace(/^maj/, '^').replace(/^M/, '^').replace(/^min/, '-').replace(/^m(?!aj)/, '-').replace(/^dim/, 'o').replace(/^aug/, '+');
  const weimarQuality={j7:'^7',j79:'^9','j7911#':'^9#11','79':'9','79b':'7b9','79#':'7#9','7911#':'9#11','7913':'13','-79':'-9','-7911':'-11','sus7':'7sus','sus79':'9sus','sus7913':'13sus','-j7':'-^7','+7':'7#5','+79':'9#5','+79#':'7#9#5','79b13b':'7b9b13','7913b':'7b13'};
  quality=weimarQuality[quality]||quality;
  const allowed = /^(?:|5|2|add9|\+|o|h|sus|sus2|sus4|\^|-|\^7|-7|7|7sus|7sus4|h7|o7|\^9|\^13|6|69|\^7#11|\^9#11|\^7#5|-6|-69|-\^7|-\^9|-9|-11|-7b5|h9|-b6|-#5|9|7b9|7#9|7#11|7b5|7#5|9#11|9b5|9#5|7b13|7#9#5|7#9b5|7#9#11|7b9#11|7b9b5|7b9#5|7b9#9|7b9b13|7alt|13|13#11|13b9|13#9|7b9sus|7susadd3|9sus|13sus|7b13sus|11)$/;
  if (!allowed.test(quality)) throw new Error(`未対応のコード「${text}」。コード表記を変更して再生成してください。`);
  let third = /sus2|^2$/.test(quality) ? 2 : /sus/.test(quality) ? 5 : /^[-oh]/.test(quality) ? 3 : 4;
  let fifth = /^[oh]|b5/.test(quality) ? 6 : /^\+|#5|alt/.test(quality) ? 8 : 7;
  const intervals = quality === '5' ? [0,7] : [0,third,fifth];
  if (/^o7/.test(quality)) intervals.push(9);
  else if (/6|69/.test(quality) && !/b6/.test(quality)) intervals.push(9);
  else if (/\^/.test(quality)) intervals.push(11);
  else if (/[791]|13/.test(quality)) intervals.push(10);
  return {symbol,root,quality,intervals,pcs:intervals.map(i=>mod(root+i)),bass:m[4] ? pitchClass(m[4]) : root};
}
export function parseProgression(input) {
  const clean = input.replace(/(?:^|\n)\s*[A-Za-z][A-Za-z0-9]*:\s*/g,'\n').replaceAll('||','|').replace(/[\[\]{}]/g,'|');
  const parts = clean.split(/[|\n]/).map(s=>s.trim()).filter(Boolean);
  if (!parts.length) throw new Error('コード進行を入力してください。');
  if (parts.length > 128) throw new Error('一度に入力できるのは128小節までです。');
  let previous;
  return parts.map((part,i) => {
    // WJazzD compact charts may join changes (e.g. C-7F7). Slash bass stays attached.
    const tokens = part.replace(/N\.?C\.?/g,'n').replace(/([^/\s])([A-G])/g,'$1 $2').split(/[\s,]+/).filter(Boolean);
    if (![1,2,4].includes(tokens.length)) throw new Error(`${i+1}小節目：4/4拍子で、1小節に1・2・4個のコードを入力してください。`);
    const chords = tokens.map(t => {
      if (t === '%' || t === '/') { if (!previous) throw new Error('先頭のコードは省略できません。'); return previous; }
      previous = parseChord(t); return previous;
    });
    return Array.from({length:4},(_,b) => chords[Math.floor(b / (4/chords.length))]);
  });
}
export function transposeBars(bars, semitones) {
  return bars.map(bar=>bar.map(c=>c.rest ? c : {...c,root:mod(c.root+semitones),bass:mod(c.bass+semitones),pcs:c.pcs.map(p=>mod(p+semitones)),symbol:noteName(c.root+semitones)+c.quality+(c.bass !== c.root ? '/'+noteName(c.bass+semitones) : '')}));
}
export function positions(min=0,max=5) {
  if (!Number.isInteger(min)||!Number.isInteger(max)||min<0||max>20||max<min) throw new Error('フレット範囲は0〜20の範囲で、下限≦上限にしてください。');
  return TUNING.flatMap((open,string)=>Array.from({length:max-min+1},(_,i)=>({string,fret:min+i,midi:open+min+i})));
}
function random(seed) { return () => { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; }; }
const distance = (a,b) => Math.min(mod(a-b),mod(b-a));
// Teaching model: roots on changes, chord tones on strong beats, neighbor approaches.
// Beam search scores the complete cyclic phrase, including the final-to-first transition.
export function generateLine(bars,{min=0,max=5,difficulty='easy',seed=1}={}) {
  const choices = positions(min,max), rand=random(seed);
  const flat=bars.flat();
  if (!flat.length) throw new Error('練習する小節を選んでください。');
  const strong= difficulty === 'easy' ? 3.5 : difficulty === 'normal' ? 1.7 : .7;
  const candidates=flat.map((c,i)=> {
    if(c.rest) return [{rest:true,midi:null,string:null,fret:null}];
    const change=i===0 || flat[i-1].symbol !== c.symbol || i%4===0;
    const next=flat[(i+1)%flat.length];
    const approach=!next.rest && (i%4===3 || next.symbol!==c.symbol);
    let pool=choices.filter(p=> change ? mod(p.midi)===c.bass : approach ? ((distance(mod(p.midi),next.bass)>0 && distance(mod(p.midi),next.bass)<=2) || c.pcs.includes(mod(p.midi))) : c.pcs.includes(mod(p.midi)));
    if (!pool.length) throw new Error(`「${c.symbol}」の音をこの範囲で押さえられません。フレット範囲を広げてください。`);
    return pool.map(p=>({...p,local:(change?0:approach ? distance(mod(p.midi),next.bass)===1 ? -3 : distance(mod(p.midi),next.bass)===2 ? -1 : 1 : 0)+rand()* (difficulty==='easy'?2:4)}));
  });
  let beam=[{notes:[],score:0,last:null}];
  for (let i=0;i<flat.length;i++) {
    const paths=[];
    for (const path of beam) for (const p of candidates[i]) {
      const prev=path.last;
      let transition = p.rest || !prev ? 0 : Math.abs(p.fret-prev.fret)*strong + Math.abs(p.string-prev.string)*1.7 + Math.abs(p.midi-prev.midi)*.28 + (p.midi===prev.midi ? 15:0);
      const score=path.score+transition+(p.local||0)+(p.rest?0:Math.max(0,p.midi-48)*.25);
      paths.push({notes:[...path.notes,{...p,bar:Math.floor(i/4),beat:i%4}],score,last:p.rest?null:p});
    }
    paths.sort((a,b)=>a.score-b.score); beam=paths.slice(0,32);
  }
  beam.sort((a,b)=>{
    const wrap=p=>{const first=p.notes[0],last=p.notes.at(-1);return first.rest||last.rest?0:Math.abs(first.fret-last.fret)*strong+Math.abs(first.midi-last.midi)*.4;};
    return a.score+wrap(a)-b.score-wrap(b);
  });
  return beam[0].notes.map(({local,...n})=>n);
}
export function explainNote(note,index,notes,bars) {
  if(note.rest) return {role:'休符',text:'N.C. の区間です。ベースは休み、クリックで拍を追います。'};
  const chord=bars.flat()[index],next=notes[(index+1)%notes.length];
  const interval=mod(note.midi-chord.root);
  const roles={0:'ルート',2:'2度',3:'短3度',4:'長3度',5:'4度',6:'減5度',7:'5度',8:'増5度',9:'6度',10:'短7度',11:'長7度'};
  const isChord=chord.pcs.includes(mod(note.midi));
  const role=isChord ? roles[interval]||'コードの構成音' : 'つなぎの音';
  let text=isChord?`${noteName(note.midi)}は${chord.symbol}の${role}。コードの響きを示す音として使えます。`:`${noteName(note.midi)}は${chord.symbol}の基本的な構成音の外にある音です。前後の流れを聴いて選んでみましょう。`;
  if(next && !next.rest && (index%4===3 || bars.flat()[(index+1)%notes.length].symbol!==chord.symbol)) {
    const d=Math.abs(note.midi-next.midi);
    text+=d===1?` 次の${noteName(next.midi)}へ半音でつながります。`:d===2?` 次の${noteName(next.midi)}へ全音でつながります。`:` 次の${noteName(next.midi)}との動きを聴き比べてみましょう。`;
  }
  return {role,text};
}
