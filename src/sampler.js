export const BASS_SAMPLES = [
  [28,'E1'],[31,'G1'],[34,'As1'],[37,'Cs2'],[40,'E2'],[43,'G2'],[46,'As2'],
  [49,'Cs3'],[52,'E3'],[55,'G3'],[58,'As3'],[61,'Cs4'],[64,'E4'],
];
export function nearestSample(midi) {
  if(!Number.isFinite(midi))throw new Error('再生する音高が不正です。');
  return BASS_SAMPLES.reduce((best,item)=>Math.abs(item[0]-midi)<Math.abs(best[0]-midi)?item:best);
}

// The recordings keep the pluck/transient; only leading silence and note-off are trimmed.
export class SampleBass {
  constructor(ctx) {
    this.ctx=ctx;this.buffers=new Map();this.voices=new Set();
    this.low=ctx.createBiquadFilter();this.low.type='highpass';this.low.frequency.value=27;
    this.tone=ctx.createBiquadFilter();this.tone.type='lowpass';this.tone.frequency.value=5200;this.tone.Q.value=.5;
    this.body=ctx.createBiquadFilter();this.body.type='lowshelf';this.body.frequency.value=150;this.body.gain.value=2;
    this.compressor=ctx.createDynamicsCompressor();this.compressor.threshold.value=-13;this.compressor.knee.value=12;this.compressor.ratio.value=3;this.compressor.attack.value=.004;this.compressor.release.value=.12;
    this.output=ctx.createGain();this.output.gain.value=.75;
    this.low.connect(this.tone).connect(this.body).connect(this.compressor).connect(this.output).connect(ctx.destination);
  }
  async prepare() {
    if(this.buffers.size===BASS_SAMPLES.length)return;
    if(this.loading)return this.loading;
    this.loading=Promise.all(BASS_SAMPLES.map(async([midi,name])=>{
      if(this.buffers.has(midi))return;
      const response=await fetch(new URL(`../assets/bass-electric/${name}.mp3`,import.meta.url));
      if(!response.ok)throw new Error(`ベース音源 ${name} を読み込めませんでした。`);
      const buffer=await this.ctx.decodeAudioData(await response.arrayBuffer());
      let peak=0;
      for(let ch=0;ch<buffer.numberOfChannels;ch++)for(const value of buffer.getChannelData(ch))peak=Math.max(peak,Math.abs(value));
      if(peak<.001)throw new Error(`ベース音源 ${name} が無音です。`);
      const limit=Math.min(buffer.length,Math.floor(buffer.sampleRate*.4));
      let first=limit;
      for(let ch=0;ch<buffer.numberOfChannels;ch++){
        const samples=buffer.getChannelData(ch);
        for(let i=0;i<limit;i++)if(Math.abs(samples[i])>peak*.012){first=Math.min(first,i);break;}
      }
      const offset=Math.max(0,first/buffer.sampleRate-.002);
      this.buffers.set(midi,{buffer,offset,gain:Math.min(2,.75/peak)});
    })).then(()=>undefined).finally(()=>{this.loading=null;});
    return this.loading;
  }
  play(time,midi,duration,accent=1) {
    const [root]=nearestSample(midi),sample=this.buffers.get(root);
    if(!sample)throw new Error('ベース音源の準備ができていません。');
    const source=this.ctx.createBufferSource(),envelope=this.ctx.createGain();
    source.buffer=sample.buffer;
    const rate=2**((midi-root)/12);source.playbackRate.value=rate;
    const length=Math.min(duration,(sample.buffer.duration-sample.offset)/rate-.01);
    if(length<=.01)return;
    const gain=sample.gain*.65*accent,release=Math.min(.065,length*.2);
    envelope.gain.setValueAtTime(0,time);envelope.gain.linearRampToValueAtTime(gain,time+.003);
    envelope.gain.setValueAtTime(gain,time+length-release);envelope.gain.linearRampToValueAtTime(0,time+length);
    source.connect(envelope).connect(this.low);source.start(time,sample.offset);source.stop(time+length+.005);
    const voice={stop:()=>{
      const now=this.ctx.currentTime;
      if(time>now){source.stop();return;}
      envelope.gain.cancelAndHoldAtTime(now);envelope.gain.linearRampToValueAtTime(0,now+.018);source.stop(now+.02);
    }};
    this.voices.add(voice);
    source.onended=()=>{this.voices.delete(voice);source.disconnect();envelope.disconnect();};
    return voice;
  }
  stop(){for(const voice of this.voices){try{voice.stop();}catch{}}}
}
