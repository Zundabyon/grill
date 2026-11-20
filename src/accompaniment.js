import {parseChord,mod} from './music.js';

// Reparse the symbol: saved practices may contain older harmony metadata.
// Rootless shells leave room for bass; triads retain their fifth, add9 its ninth.
export function pianoVoicing(chord) {
  if(!chord || chord.rest)return [];
  const c=parseChord(chord.symbol),intervals=c.intervals.filter(i=>i!==0);
  const shell=intervals.length>3?intervals.filter(i=>i!==7):intervals;
  const notes=shell.map(i=>60+mod(c.root+i)).sort((a,b)=>a-b);
  return notes;
}

// All sounds are synthesized locally; no additional recordings or downloads.
export class Accompaniment {
  constructor(ctx,piano,drums,melody){this.ctx=ctx;this.piano=piano;this.drums=drums;this.melodyOutput=melody;this.voices=new Set();}
  tone(time,freq,duration,volume,destination,type='sine'){
    const source=this.ctx.createOscillator(),gain=this.ctx.createGain();
    source.type=type;source.frequency.value=freq;
    this.envelope(source,gain,time,duration,volume,destination);
  }
  envelope(source,gain,time,duration,volume,destination){
    gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(volume,time+.003);
    gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
    source.connect(gain).connect(destination);source.start(time);source.stop(time+duration+.005);
    this.voices.add(source);
    source.onended=()=>{this.voices.delete(source);source.disconnect();gain.disconnect();};
  }
  chord(time,chord,duration){
    for(const midi of pianoVoicing(chord)){
      const f=440*2**((midi-69)/12);
      // Decaying fundamental and upper partials give a soft electric-piano timbre.
      for(const [ratio,level,decay] of [[1,.11,1],[2,.035,.65],[3,.014,.35]])this.tone(time,f*ratio,duration*decay,level,this.piano);
    }
  }
  melody(time,note){
    if(note && this.lead && !note.onset && this.lead.midi===note.midi)return;
    if(this.lead){
      const {source,gain}=this.lead;
      gain.gain.cancelAndHoldAtTime(time);gain.gain.linearRampToValueAtTime(0,time+.012);
      source.stop(time+.015);this.lead=null;
    }
    if(!note)return;
    const source=this.ctx.createOscillator(),gain=this.ctx.createGain();
    source.type='triangle';source.frequency.value=440*2**((note.midi-69)/12);
    gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(.15,time+.012);
    gain.gain.setTargetAtTime(.09,time+.025,.08);
    source.connect(gain).connect(this.melodyOutput);source.start(time);
    this.voices.add(source);this.lead={source,gain,midi:note.midi};
    source.onended=()=>{this.voices.delete(source);source.disconnect();gain.disconnect();};
  }
  noise(time,duration,volume,cutoff){
    this.noiseBuffer ||= (()=>{
      const b=this.ctx.createBuffer(1,this.ctx.sampleRate,this.ctx.sampleRate),data=b.getChannelData(0);
      for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
      return b;
    })();
    const source=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),gain=this.ctx.createGain();
    source.buffer=this.noiseBuffer;filter.type='highpass';filter.frequency.value=cutoff;
    filter.connect(this.drums);
    this.envelope(source,gain,time,duration,volume,filter);
    const ended=source.onended;source.onended=()=>{ended();filter.disconnect();};
  }
  beat(time,beat,step){
    this.noise(time,Math.min(.14,step*.45),.085,6000);
    for(const f of [3100,4300,5900])this.tone(time,f,Math.min(.2,step*.6),.009,this.drums,'square');
    if(beat===1||beat===3){
      this.noise(time,Math.min(.065,step*.25),.1,8500);
      // Light swung ride pickup before beats 3 and 1; bass stays on quarter notes.
      this.noise(time+step*2/3,Math.min(.075,step*.25),.045,6500);
    }
  }
  stop(){for(const source of this.voices){try{source.stop();}catch{}}this.voices.clear();this.lead=null;}
}
