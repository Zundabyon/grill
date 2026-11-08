// Non-compressed MusicXML only. Fail closed on rhythms outside the v1 4/4 grid.
export function musicXMLToProgression(xml) {
  const doc=new DOMParser().parseFromString(xml,'application/xml');
  if(doc.querySelector('parsererror') || doc.documentElement.localName !== 'score-partwise') throw new Error('正しい非圧縮MusicXML（score-partwise）を選んでください。');
  const parts=[...doc.querySelectorAll('part')];
  const part=parts.find(p=>p.querySelector('harmony'));
  if(!part) throw new Error('コード記号が入っているMusicXMLを選んでください。');
  const kindMap={major:'',minor:'m',dominant:'7','major-seventh':'maj7','minor-seventh':'m7','half-diminished':'m7b5',diminished:'dim','diminished-seventh':'dim7',augmented:'aug','major-sixth':'6','minor-sixth':'m6','major-ninth':'maj9','minor-ninth':'m9','dominant-ninth':'9','dominant-13th':'13','suspended-fourth':'sus4','suspended-second':'sus2','major-minor':'m^7',none:'N.C.'};
  const text=(node,selector)=>node.querySelector(selector)?.textContent?.trim();
  const accidental=n=> Number(n)===-1?'b':Number(n)===1?'#':Number(n)===0?'':(()=>{throw new Error('重変化記号には未対応です。');})();
  let divisions=1,current=null;
  const bars=[];
  for(const [i,m] of [...part.querySelectorAll('measure')].entries()) {
    if(m.querySelector('repeat, ending') || [...m.querySelectorAll('sound')].some(s=>['dacapo','dalsegno','tocoda','fine'].some(a=>s.hasAttribute(a)))) throw new Error('繰り返し・コーダを含む譜面は、演奏順に展開してから取り込んでください。');
    const beats=text(m,'time > beats'),beatType=text(m,'time > beat-type');
    if((beats&&beats!=='4')||(beatType&&beatType!=='4')) throw new Error('初版は4/4拍子のみ対応しています。');
    divisions=Number(text(m,'attributes > divisions')||divisions);
    if(!(divisions>0)) throw new Error('MusicXMLの拍の単位を読み取れません。');
    const slots=Array(4).fill(null);let cursor=0,hasDuration=false;
    for(const child of m.children) {
      const tag=child.localName;
      if(tag==='backup') cursor-=Number(text(child,'duration')||0)/divisions;
      if(tag==='forward') cursor+=Number(text(child,'duration')||0)/divisions;
      if(tag==='note' && !child.querySelector('chord, grace')) {cursor+=Number(text(child,'duration')||0)/divisions;hasDuration=true;}
      if(tag!=='harmony')continue;
      const beat=cursor+Number(text(child,'offset')||0)/divisions;
      if(!Number.isInteger(beat)||beat<0||beat>3) throw new Error(`${i+1}小節目：拍の途中で変わるコードには未対応です。`);
      const kind=text(child,'kind');
      if(!(kind in kindMap)) throw new Error(`未対応のMusicXMLコード種別：${kind}`);
      let symbol;
      if(kind==='none') symbol='N.C.';
      else {
        const root=text(child,'root-step');if(!root)throw new Error('コードのルート音がありません。');
        symbol=root+accidental(text(child,'root-alter')||0)+kindMap[kind];
        for(const degree of child.querySelectorAll('degree')) {
          const type=text(degree,'degree-type'),value=text(degree,'degree-value'),alter=text(degree,'degree-alter')||0;
          if(!['add','alter'].includes(type)||!['5','9','11','13'].includes(value)||!['-1','1'].includes(alter))throw new Error('このテンション表記には未対応です。コードを手入力してください。');
          symbol+=accidental(alter)+value;
        }
        const bass=text(child,'bass-step');if(bass)symbol+='/'+bass+accidental(text(child,'bass-alter')||0);
      }
      if(slots[beat] && slots[beat]!==symbol)throw new Error('同じ拍に複数のコードが含まれています。');
      slots[beat]=symbol;
    }
    if(hasDuration && Math.abs(cursor-4)>.001)throw new Error(`${i+1}小節目：不完全小節・複数声部には未対応です。`);
    for(let b=0;b<4;b++){if(slots[b])current=slots[b];if(!current)throw new Error('先頭小節のコードがありません。');slots[b]=current;}
    bars.push(slots.join(' '));
  }
  const fifths=Number(text(part,'key > fifths')||0);
  const major={ '-7':'Cb','-6':'Gb','-5':'Db','-4':'Ab','-3':'Eb','-2':'Bb','-1':'F','0':'C','1':'G','2':'D','3':'A','4':'E','5':'B','6':'F#','7':'C#' };
  const minor={ '-7':'Ab','-6':'Eb','-5':'Bb','-4':'F','-3':'C','-2':'G','-1':'D','0':'A','1':'E','2':'B','3':'F#','4':'C#','5':'G#','6':'D#','7':'A#' };
  return {title:text(doc,'work-title')||text(doc,'movement-title')||'取り込んだ練習',key:(text(part,'key > mode')==='minor'?minor:major)[fifths]||'C',chords:bars.join(' | ')};
}
