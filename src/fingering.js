// Heuristic left-hand suggestions, not a prescription for a player's anatomy.
export const FINGER_NAMES={0:'開放弦',1:'人差し指',2:'中指',3:'薬指',4:'小指'};
export const FINGER_SHORT={0:'開',1:'人',2:'中',3:'薬',4:'小'};
export function handShape(style='compact'){
  return style==='four'?[1,2,3,4]:[1,2,4];
}
export function fingeringOptions(note,style='compact'){
  if(note.rest)return [{...note,finger:null,position:null}];
  if(note.fret===0)return [{...note,finger:0,position:null}];
  const shape=handShape(style);
  return shape.flatMap((finger,offset)=>{
    const position=note.fret-offset;
    return position>=1&&position+shape.length-1<=20?[{...note,finger,position}]:[];
  });
}
export function movementCost(previous,next,difficulty='easy'){
  if(!previous||previous.rest||next.rest)return 0;
  const weight={easy:2.6,normal:1.6,hard:1}[difficulty]||2.6;
  const strings=Math.abs(next.string-previous.string),jump=Math.abs(next.midi-previous.midi);
  const shift=previous.position&&next.position?Math.abs(next.position-previous.position):0;
  const release=previous.fret===0?.55:1;
  const stretch=shift*weight+Math.max(0,shift-2)**2*weight*.4;
  const crossing=strings*.8+Math.max(0,strings-1)*weight*2;
  const leap=jump*.22+Math.max(0,jump-5)*.6+Math.max(0,jump-7)**2*.16;
  const roll=strings&&previous.finger===next.finger&&next.finger?1:0;
  return stretch*release+crossing+leap+roll+(jump===0?2:0);
}
const stateKey=n=>n.rest?'rest':`${n.string}:${n.fret}:${n.position}`;
export function suggestFingering(notes,{style='compact',difficulty='easy',loop=true}={}){
  if(!notes.length)return [];
  // Keep each possible starting hand position so the loop seam is also scored.
  let best=null;
  for(const first of fingeringOptions(notes[0],style)){
    let beam=[{note:first,previous:null,score:(first.position||0)*.03}];
    for(let i=1;i<notes.length;i++){
      const paths=new Map();
      for(const path of beam)for(const option of fingeringOptions(notes[i],style)){
        const note=option.fret===0?{...option,position:path.note.position}:option;
        const score=path.score+movementCost(path.note,note,difficulty);
        const key=stateKey(note);
        if(!paths.has(key)||score<paths.get(key).score)paths.set(key,{note,previous:path,score});
      }
      beam=[...paths.values()];
    }
    for(const path of beam){
      const score=path.score+(loop?movementCost(path.note,first,difficulty):0);
      if(!best||score<best.score)best={path,score};
    }
  }
  const sequence=[];
  for(let path=best?.path;path;path=path.previous)sequence.push(path.note);
  sequence.reverse();
  // Open strings do not reset the hand. At the loop seam, carry the last
  // fretted position through any leading open notes for honest shift guidance.
  let position=loop?[...sequence].reverse().find(n=>!n.rest&&n.fret>0)?.position:null;
  for(const note of sequence){
    if(note.rest)position=null;
    else if(note.fret===0)note.position=position;
    else position=note.position;
  }
  return sequence.map((note,i)=>{
    const previous=i?sequence[i-1]:loop?sequence.at(-1):null;
    const shift=!note.rest&&note.fret>0&&previous&&!previous.rest&&previous.position?note.position-previous.position:0;
    const skip=previous&&!previous.rest&&!note.rest?Math.abs(note.string-previous.string):0;
    const leap=previous&&!previous.rest&&!note.rest?Math.abs(note.midi-previous.midi):0;
    return {finger:note.finger,position:note.position,shift,warning:Math.abs(shift)>2?'手の移動が大きめです。ゆっくり確認してください。':skip>1?'弦を飛び越えます。右手の弦移動も確認してください。':leap>7?'音の跳躍が大きめです。前後をゆっくり確認してください。':''};
  });
}
