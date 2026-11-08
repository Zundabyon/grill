import {TUNING,STRINGS,mod,noteName,chordNoteName,pitchClass,parseProgression,transposeBars,generateLine,explainNote} from './music.js';
import {musicXMLToProgression} from './import.js';
import {Player} from './audio.js';
import {standardSongs,filterSongs} from './catalog.js';
const $=id=>document.getElementById(id);
const state={songs:[],standards:[],collection:'standards',bars:[],notes:[],model:[],selected:0,mode:'model',level:'easy',seed:1,offset:0,title:'今日のウォーキング',source:'自作の練習用進行',provenance:null,storageKey:'grill.practices.v1'};
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function error(e){$('error').textContent=e.message||String(e);$('error').hidden=false;}
let toastTimer;
function toast(s){$('toast').textContent=s;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3000);}
const clone=x=>structuredClone(x);
const player=new Player(i=>{
  document.querySelectorAll('.tab-note.playing').forEach(e=>e.classList.remove('playing'));
  if(i<0){$('play-state').textContent=`COUNT ${i+5} / 4`;return;}
  const playing=document.querySelector(`[data-note="${i}"]`);
  playing?.classList.add('playing');
  if(playing){
    const score=$('score'),row=playing.closest('.measure').getBoundingClientRect(),view=score.getBoundingClientRect();
    if(row.top<view.top+8 || row.bottom>view.bottom-8)score.scrollBy({top:row.top-view.top-24,behavior:'smooth'});
  }
  $('play-state').textContent=`${state.offset+Math.floor(i/4)+1} : ${i%4+1}`;
},()=>{$('play').textContent='▶';$('play').setAttribute('aria-label','再生');$('play-state').textContent='READY';document.querySelectorAll('.playing').forEach(e=>e.classList.remove('playing'));});
function audioOptions(){return {bpm:Number($('bpm').value),loop:$('loop').checked,bass:$('bass').checked,click:$('click').checked,countIn:$('count-in').checked,piano:$('piano').checked,drums:$('drums').checked,bassVolume:Number($('bass-volume').value)/100,pianoVolume:Number($('piano-volume').value)/100,drumsVolume:Number($('drums-volume').value)/100};}
function readSettings(){
  const full=$('bar-count').value==='all';
  const min=Number($('min-fret').value),max=Number($('max-fret').value),start=full?1:Number($('start-bar').value);
  if(!Number.isInteger(start)||start<1)throw new Error('開始小節は1以上の整数にしてください。');
  if($('min-fret').value===''||$('max-fret').value==='')throw new Error('フレット範囲を入力してください。');
  return {min,max,start,full,difficulty:state.level,seed:state.seed};
}
function syncLengthMode(){const full=$('bar-count').value==='all';$('start-bar').disabled=full;if(full)$('start-bar').value=1;}
function generate({keepSeed=false}={}) {
  try{
    const settings=readSettings();
    let bars=parseProgression($('chords').value);
    bars=transposeBars(bars,mod(pitchClass($('target-key').value)-pitchClass($('source-key').value)));
    if(settings.start>bars.length)throw new Error(`コード進行は${bars.length}小節です。開始小節を変更してください。`);
    const selected=settings.full?bars:bars.slice(settings.start-1,settings.start-1+Number($('bar-count').value));
    if(!keepSeed)state.seed++;
    const notes=generateLine(selected,{...settings,seed:state.seed});
    player.stop();state.bars=selected;state.notes=notes;state.model=clone(notes);state.selected=0;state.offset=settings.start-1;
    state.applied={min:settings.min,max:settings.max,level:state.level,key:$('target-key').value,full:settings.full};state.dirty=false;
    $('error').hidden=true;render();$('score').scrollTop=0;
  }catch(e){error(e);}
}
function render(){
  $('practice-title').textContent=state.title;
  const levels={easy:'簡単',normal:'普通',hard:'難しめ'};
  $('score-subtitle').textContent=`${state.applied.full?'1曲まるごと · ':''}${state.offset+1}–${state.offset+state.bars.length}小節 / KEY ${state.applied.key} / ${levels[state.applied.level]} / ${state.applied.min}–${state.applied.max}フレット`;
  const changed=state.notes.some((n,i)=>n.midi!==state.model[i]?.midi||n.string!==state.model[i]?.string||n.fret!==state.model[i]?.fret);
  $('edit-badge').hidden=!changed;$('restore').hidden=!changed;
  $('score').innerHTML=state.bars.map((bar,b)=>{
    const cs=bar.map((c,i)=>i===0||bar[i-1].symbol!==c.symbol?`<span style="grid-column:${i+1}/span ${(()=>{let n=1;while(i+n<4&&bar[i+n].symbol===c.symbol)n++;return n;})()}">${escape(c.symbol)}</span>`:'').join('');
    return `<div class="measure"><div class="measure-head"><span class="measure-num">${String(state.offset+b+1).padStart(2,'0')}</span></div><div class="measure-chords">${cs}</div><div class="tab-staff">${state.notes.slice(b*4,b*4+4).map((n,j)=>{const i=b*4+j,info=explainNote(n,i,state.notes,state.bars);return `<button class="tab-note ${i===state.selected?'selected':''} ${n.midi!==state.model[i]?.midi||n.string!==state.model[i]?.string?'edited':''}" data-note="${i}" aria-label="${state.offset+b+1}小節 ${j+1}拍 ${n.rest?'休符':STRINGS[n.string]+'弦 '+n.fret+'フレット '+chordNoteName(n.midi,state.bars[b][j])+' '+info.role}" aria-pressed="${i===state.selected}"><span class="fret-number" style="--string:${n.rest?1:n.string}">${n.rest?'−':n.fret}</span></button>`;}).join('')}</div><div class="beat-numbers"><span>1</span><span>2</span><span>3</span><span>4</span></div>${b%4===0?'<div class="string-labels"><span>G</span><span>D</span><span>A</span><span>E</span></div>':''}</div>`;
  }).join('');
  renderFretboard();
}
function renderFretboard(){
  const n=state.notes[state.selected];if(!n)return;
  const chord=state.bars.flat()[state.selected],info=explainNote(n,state.selected,state.notes,state.bars),{min,max}=state.applied;
  const count=max-min+1;
  $('selected-position').textContent=`${state.offset+Math.floor(state.selected/4)+1}小節 · ${state.selected%4+1}拍${n.rest?'':` / ${STRINGS[n.string]}弦 ${n.fret}フレット`}`;
  $('selected-note').innerHTML=n.rest?'−<span>REST</span>':`${escape(chordNoteName(n.midi,chord))}<span>${n.midi===state.model[state.selected]?.midi?'MODEL':'YOUR NOTE'}</span>`;
  $('note-role').textContent=info.role;$('note-reason').textContent=info.text;
  $('edit-help').textContent=state.mode==='edit'?'指板の好きな位置をクリック。選んだ音を聴いて、前後のつながりを試しましょう。':'「自分で変える」に切り替えると、指板をクリックして音を変更できます。';
  $('fretboard').classList.toggle('editable',state.mode==='edit');
  $('fretboard').style.gridTemplateColumns=`30px repeat(${count},minmax(34px,1fr))`;
  $('fretboard').innerHTML='<div class="fret-head"></div>'+Array.from({length:count},(_,i)=>`<div class="fret-head">${i+min===0?'OPEN':i+min}</div>`).join('')+TUNING.map((open,s)=>`<div class="string-name">${STRINGS[s]}</div>`+Array.from({length:count},(_,i)=>{const fret=i+min,midi=open+fret,current=!n.rest&&n.string===s&&n.fret===fret;return `<button ${state.mode==='edit'&&!chord.rest?'':'disabled'} data-string="${s}" data-fret="${fret}" class="fret-cell ${chord.pcs.includes(mod(midi))?'chord-tone':''} ${current?'current':''}" style="--thickness:${1+s*.45}px" aria-label="${STRINGS[s]}弦 ${fret}フレット ${chordNoteName(midi,chord)}"><span>${escape(chordNoteName(midi,chord))}</span></button>`;}).join('')).join('');
}
function setMode(mode){state.mode=mode;for(const m of ['model','edit']){$(m+'-mode').classList.toggle('active',m===mode);$(m+'-mode').setAttribute('aria-pressed',String(m===mode));}renderFretboard();}
function setLevel(level){state.level=level;document.querySelectorAll('[data-level]').forEach(b=>{b.classList.toggle('active',b.dataset.level===level);b.setAttribute('aria-pressed',String(b.dataset.level===level));});$('difficulty-hint').textContent={easy:'近いポジションを中心に、構成音とつなぎを練習。',normal:'移動の制約をゆるめ、つなぎ方の選択肢を増やします。',hard:'広い動きも候補に。テンポはゆっくりでも大丈夫。'}[level];}
function updateTempo(value){const n=Math.round(Math.min(240,Math.max(30,Number(value)||90)));$('bpm').value=n;$('tempo-slider').value=n;}
function saved(){try{const result=JSON.parse(localStorage.getItem(state.storageKey)||'[]');return Array.isArray(result)?result:[];}catch{return [];}}
function writeSaved(list){localStorage.setItem(state.storageKey,JSON.stringify(list));$('saved-count').textContent=list.length;}
function showSaved(){
  const list=saved();$('saved-count').textContent=list.length;
  $('saved-list').innerHTML=list.length?list.map(s=>`<div class="saved-row"><div>${escape(s.title)}<small>${escape(s.date)} · ${escape(s.bpm)} BPM · ${escape(s.notes.length/4)}小節</small></div><button class="secondary" data-load="${escape(s.id)}">開く</button><button class="text-button" data-export="${escape(s.id)}">書き出す</button><button class="text-button" data-delete="${escape(s.id)}">削除</button></div>`).join(''):'<p class="hint">まだ保存した練習がありません。「練習を保存」で、お手本と自分のアレンジを残せます。</p>';
}
function snapshot(){return {version:1,id:crypto.randomUUID(),title:state.title,date:new Date().toLocaleString('ja-JP'),source:state.source,provenance:state.provenance,chords:$('chords').value,sourceKey:$('source-key').value,targetKey:$('target-key').value,level:state.level,min:$('min-fret').value,max:$('max-fret').value,start:state.offset+1,count:$('bar-count').value,bpm:$('bpm').value,notes:state.notes,model:state.model,bars:state.bars,applied:state.applied};}
function loadPractice(s){
  if(s.version!==1||!Array.isArray(s.notes)||!Array.isArray(s.model)||!Array.isArray(s.bars)||s.notes.length!==s.bars.length*4||s.model.length!==s.notes.length||s.notes.length>512)throw new Error('Grillの保存データを確認してください。');
  const parsed=parseProgression(s.bars.map(bar=>bar.map(c=>c.symbol).join(' ')).join(' | '));
  for(const notes of [s.notes,s.model])for(const n of notes)if(!n.rest&&(!Number.isInteger(n.string)||n.string<0||n.string>3||!Number.isInteger(n.fret)||n.fret<0||n.fret>20||n.midi!==TUNING[n.string]+n.fret))throw new Error('保存データの運指が不正です。');
  const min=Number(s.applied?.min),max=Number(s.applied?.max);
  if(!Number.isInteger(min)||!Number.isInteger(max)||min<0||max>20||max<min||!['easy','normal','hard'].includes(s.level)||!Number.isInteger(s.start)||s.start<1)throw new Error('保存データの設定が不正です。');
  if(![...$('source-key').options].some(o=>o.value===s.sourceKey)||![...$('target-key').options].some(o=>o.value===s.targetKey))throw new Error('保存データのキーが不正です。');
  player.stop();state.title=String(s.title);state.source=String(s.source||'取り込んだ練習');state.provenance=s.provenance||null;state.notes=clone(s.notes);state.model=clone(s.model);state.bars=parsed;state.applied={min,max,level:s.level,key:s.targetKey,full:s.count==='all'};state.offset=s.start-1;state.selected=0;state.dirty=false;
  $('chords').value=s.chords;$('source-key').value=s.sourceKey;$('target-key').value=s.targetKey;$('min-fret').value=min;$('max-fret').value=max;$('start-bar').value=s.start;$('bar-count').value=s.count;syncLengthMode();$('song-select').value='';$('source-note').textContent=state.source;setLevel(s.level);updateTempo(s.bpm);$('error').hidden=true;render();
}
function renderSongs(query=''){
  const selected=$('song-select').value;
  const collection=state.collection==='standards'?state.standards:state.songs;
  const filtered=filterSongs(collection,query);
  $('standard-songs').textContent=`スタンダード${state.standards.length}曲`;
  $('song-select').innerHTML='<option value="">手入力の練習用進行</option>'+filtered.map(s=>`<option value="${s.id}">${escape(s.title)} — ${escape(s.performer)}${s.supported?'':'（初版未対応）'}</option>`).join('');
  if(filtered.some(song=>String(song.id)===selected))$('song-select').value=selected;
  $('song-results').textContent=state.collection==='standards'?`${filtered.length} / ${collection.length}曲 · 1曲につき代表の1資料`:`${filtered.length} / ${collection.length}資料 · 演奏違いも表示`;
  if(!filtered.length)$('song-results').textContent+=' · 該当する曲がありません';
}
for(const id of ['source-key','target-key'])$(id).innerHTML=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'].map(k=>`<option>${k}</option>`).join('');
$('source-key').value='C';$('target-key').value='C';
$('generate').onclick=()=>generate();$('regenerate').onclick=()=>generate();
document.querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>{state.dirty=true;setLevel(b.dataset.level);const defaults={easy:5,normal:9,hard:12};$('max-fret').value=defaults[state.level];if(Number($('min-fret').value)>defaults[state.level])$('min-fret').value=0;});
$('model-mode').onclick=()=>setMode('model');$('edit-mode').onclick=()=>setMode('edit');
$('score').onclick=e=>{const b=e.target.closest('[data-note]');if(!b)return;state.selected=Number(b.dataset.note);document.querySelectorAll('[data-note]').forEach(n=>{const selected=Number(n.dataset.note)===state.selected;n.classList.toggle('selected',selected);n.setAttribute('aria-pressed',String(selected));});renderFretboard();};
$('fretboard').onclick=async e=>{const cell=e.target.closest('[data-fret]');if(!cell||state.mode!=='edit'||cell.disabled)return;player.stop();const string=Number(cell.dataset.string),fret=Number(cell.dataset.fret),midi=TUNING[string]+fret;state.notes[state.selected]={...state.notes[state.selected],rest:false,string,fret,midi};render();try{await player.preview(midi);}catch{toast('音声を再生できませんでした。ブラウザの音声設定を確認してください。');}};
$('restore').onclick=()=>{player.stop();state.notes=clone(state.model);render();toast('お手本に戻しました');};
$('play').onclick=async()=>{
  if(player.active){player.stop();return;}
  const button=$('play');button.disabled=true;
  try{
    updateTempo($('bpm').value);
    const startup=player.play(clone(state.notes),audioOptions,clone(state.bars));
    button.textContent='…';button.setAttribute('aria-label','音源を準備中');$('play-state').textContent='音源を準備中';
    const started=await startup;
    if(started){button.textContent='■';button.setAttribute('aria-label','停止');$('play-state').textContent='PLAYING';}
  }catch(e){player.stop();error(new Error('ベース音源を再生できませんでした。再読み込みしてお試しください。'));}
  finally{button.disabled=false;}
};
for(const name of ['bass','piano','drums']){
  $(name).addEventListener('change',()=>player.updateMix(audioOptions()));
  $(name+'-volume').addEventListener('input',()=>{player.updateMix(audioOptions());$(name+'-volume-value').textContent=$(name+'-volume').value+'%';});
}
$('bpm').onchange=e=>updateTempo(e.target.value);$('tempo-slider').oninput=e=>updateTempo(e.target.value);
$('save').onclick=()=>{try{if(state.dirty||!$('error').hidden)throw new Error('入力内容を確認し、ラインを生成してから保存してください。');const s=snapshot();if(JSON.stringify(s).length>300000)throw new Error('保存する練習が大きすぎます。');const list=saved();if(list.length>=50)throw new Error('保存は50件までです。不要な練習を書き出して削除してください。');writeSaved([s,...list]);toast('このブラウザに練習を保存しました');}catch(e){error(e);}};
$('library-open').onclick=()=>{showSaved();$('library-dialog').showModal();};
$('saved-list').onclick=e=>{try{const load=e.target.closest('[data-load]'),del=e.target.closest('[data-delete]'),exp=e.target.closest('[data-export]');if(load){loadPractice(saved().find(s=>s.id===load.dataset.load));$('library-dialog').close();}if(del){writeSaved(saved().filter(s=>s.id!==del.dataset.delete));showSaved();}if(exp){const s=saved().find(s=>s.id===exp.dataset.export),a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(s,null,2)],{type:'application/json'}));a.href=url;a.download='grill-practice.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}catch(e){error(e);}};
$('song-search').oninput=e=>renderSongs(e.target.value);
for(const [id,collection] of [['standard-songs','standards'],['all-songs','all']])$(id).onclick=()=>{state.collection=collection;for(const [button,value] of [['standard-songs','standards'],['all-songs','all']]){$(button).classList.toggle('active',value===collection);$(button).setAttribute('aria-pressed',String(value===collection));}renderSongs($('song-search').value);};
$('song-select').onchange=()=>{state.dirty=true;const s=state.songs.find(s=>String(s.id)===$('song-select').value);if(!s)return;player.stop();state.title=s.title;state.provenance=s.provenance||null;state.source=s.provenance?`${s.provenance.dataset} / ${s.provenance.license} / 非商用の練習用`:`Weimar Jazz Database / ${s.performer} / 資料ID ${s.id}`;$('source-note').textContent=state.source;$('chords').value=s.chords;$('start-bar').value=1;$('bar-count').value='all';syncLengthMode();const key=s.key.split('-')[0];const equivalent={ 'C#':'Db','D#':'Eb','F#':'Gb','G#':'Ab','A#':'Bb','Cb':'B' };$('source-key').value=equivalent[key]||key||'C';$('target-key').value=$('source-key').value;if(!s.supported){error(new Error('この資料には初版未対応の拍子・コード表記があります。進行を編集するか別の曲を選んでください。'));return;}generate();};
$('chords').oninput=()=>{state.dirty=true;player.stop();state.title='手入力の練習';state.source=state.provenance?`${state.provenance.dataset}から編集 / ${state.provenance.license}`:'手入力のコード進行';$('song-select').value='';$('source-note').textContent=state.source;};
for(const id of ['source-key','target-key','min-fret','max-fret','start-bar','bar-count'])$(id).addEventListener('change',()=>{state.dirty=true;player.stop();});
$('tips-open').onclick=()=>{
  player.stop();
  $('tips-dialog').showModal();
  $('tips-dialog').scrollTop=0;
  $('tips-open').setAttribute('aria-expanded','true');
};
$('tips-dialog').addEventListener('close',()=>$('tips-open').setAttribute('aria-expanded','false'));
$('tips-dialog').addEventListener('click',e=>{
  if(e.target!==$('tips-dialog'))return;
  const r=e.target.getBoundingClientRect();
  if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();
});
$('tips-done').onclick=()=>$('tips-dialog').close();
$('import-open').onclick=()=>$('import-dialog').showModal();
document.querySelectorAll('.dialog-close').forEach(b=>b.onclick=()=>b.closest('dialog').close());
$('import-file').onchange=async e=>{
  try{
    const file=e.target.files[0];if(!file)return;if(file.size>2000000)throw new Error('2MB以下のファイルを選んでください。');
    const text=await file.text();
    if(file.name.endsWith('.json')){
      const data=JSON.parse(text);if(data.version&&data.notes){loadPractice(data);}else{if(typeof data.chords!=='string')throw new Error('JSONにはchords文字列が必要です。');parseProgression(data.chords);applyImport(data);}
    }else if(/\.(xml|musicxml)$/i.test(file.name)){const data=musicXMLToProgression(text);parseProgression(data.chords);applyImport(data);}
    else if(/\.txt$/i.test(file.name)){parseProgression(text);applyImport({title:file.name.replace(/\.txt$/i,''),chords:text,key:'C'});}
    else throw new Error('MusicXML、JSON、テキストファイルを選んでください。');
    $('import-error').hidden=true;$('import-dialog').close();toast('取り込みました。入力と練習するキーを確認してください。');
  }catch(err){$('import-error').textContent=err.message;$('import-error').hidden=false;}finally{e.target.value='';}
};
function applyImport(data){player.stop();state.title=String(data.title||'取り込んだ練習');state.provenance=data.provenance||null;state.source=state.provenance?`${state.provenance.dataset} / ${state.provenance.license}`:'端末内で取り込んだコード進行';$('chords').value=data.chords;$('source-note').textContent=state.source;$('start-bar').value=1;$('bar-count').value='all';syncLengthMode();$('song-select').value='';const key=data.key||'C';const equivalent={'C#':'Db','D#':'Eb','F#':'Gb','G#':'Ab','A#':'Bb'};$('source-key').value=equivalent[key]||key;$('target-key').value=$('source-key').value;generate();}
window.addEventListener('keydown',e=>{if(e.code==='Space'&&!['INPUT','TEXTAREA','SELECT','BUTTON'].includes(document.activeElement.tagName)&&!document.querySelector('dialog[open]')){e.preventDefault();$('play').click();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)player.stop();});
$('saved-count').textContent=saved().length;
$('bar-count').addEventListener('change',syncLengthMode);
syncLengthMode();
generate({keepSeed:true});
try{
  const responses=await Promise.all(['weimar.json','jht-standards.json'].map(path=>fetch(new URL('../data/'+path,import.meta.url))));
  if(responses.some(res=>!res.ok))throw new Error('曲データを取得できませんでした。');
  const [weimar,jht]=await Promise.all(responses.map(res=>res.json()));
  state.songs=[...weimar.songs,...jht.songs];state.standards=standardSongs(state.songs);renderSongs();
}catch{$('source-note').textContent='曲データを読み込めませんでした。手入力とファイル取り込みは利用できます。';$('song-results').textContent='曲データの読み込みに失敗しました';}
