import {SampleBass} from './sampler.js';
import {Accompaniment} from './accompaniment.js';
import {melodyAt} from './melody.js';
export class Player {
  constructor(onBeat,onStop) {this.onBeat=onBeat;this.onStop=onStop;this.active=false;this.timer=null;this.voices=new Set();}
  setupMixer(){
    if(this.channels)return;
    this.channels={};
    for(const name of ['bass','piano','drums','melody']){
      const gain=this.ctx.createGain();gain.connect(this.ctx.destination);this.channels[name]=gain;
    }
    this.band=new Accompaniment(this.ctx,this.channels.piano,this.channels.drums,this.channels.melody);
  }
  updateMix(opts){
    if(!this.channels)return;
    for(const name of ['bass','piano','drums','melody']){
      const level=Number(opts[name+'Volume']??(name==='bass'?.8:.45));
      const gain=opts[name]?Math.max(0,Math.min(1,Number.isFinite(level)?level:0)):0;
      this.channels[name].gain.setTargetAtTime(gain,this.ctx.currentTime,.008);
    }
  }
  async play(notes,options,bars=[],melody=[]) {
    this.stop();
    const epoch=this.epoch;
    this.ctx ||= new AudioContext();
    await this.ctx.resume();
    this.setupMixer();
    this.sampler ||=new SampleBass(this.ctx,this.channels.bass);
    await this.sampler.prepare();
    if(!notes.length || epoch!==this.epoch) return false;
    this.melody=melody;this.chords=bars.flat();this.updateMix(options());
    this.active=true;this.finishing=false;this.notes=notes;this.options=options;this.index=options().countIn?-4:0;
    this.nextTime=this.ctx.currentTime+.08;this.epoch=(this.epoch||0)+1;
    this.schedule();this.timer=setInterval(()=>this.schedule(),25);
    return true;
  }
  schedule(){
    while(this.active && !this.finishing && this.nextTime<this.ctx.currentTime+.12){
      const i=this.index,opts=this.options(),time=this.nextTime,step=60/opts.bpm;
      if(i>=this.notes.length){if(!opts.loop){this.finishing=true;clearInterval(this.timer);this.finishTimer=setTimeout(()=>this.stop(),Math.max(0,(time-this.ctx.currentTime)*1000));return;}this.band.melody?.(time,null);this.index=0;continue;}
      this.updateMix(opts);
      if(i>=0 && Number.isInteger(i)){
        const chord=this.chords[i],previous=this.chords[i-1];
        if(opts.piano && chord && (i%2===0 || chord.symbol!==previous?.symbol))this.band.chord(time,chord,step*.82);
        if(opts.drums)this.band.beat(time,i%4,step);
      }
      if(i>=0 && this.melody?.length)this.band.melody(time,melodyAt(this.melody,i));
      if(Number.isInteger(i) && (i<0 || opts.click))this.click(time,i%4===0);
      if(Number.isInteger(i) && i>=0 && opts.bass && !this.notes[i].rest)this.bass(time,this.notes[i].midi,step*.94,i%4===0?1:.94);
      if(Number.isInteger(i)){
        const epoch=this.epoch;
        const id=setTimeout(()=>{this.uiTimers.delete(id);if(this.active&&this.epoch===epoch)this.onBeat(i);},Math.max(0,(time-this.ctx.currentTime)*1000));
        this.uiTimers ||=new Set();this.uiTimers.add(id);
      }
      this.index+=.5;this.nextTime+=step/2;
    }
  }
  voice(time,freq,duration,type,volume){
    const osc=this.ctx.createOscillator(),gain=this.ctx.createGain();
    osc.type=type;osc.frequency.value=freq;gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(volume,time+.008);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
    osc.connect(gain).connect(this.ctx.destination);osc.start(time);osc.stop(time+duration+.02);this.voices.add(osc);osc.onended=()=>{this.voices.delete(osc);osc.disconnect();gain.disconnect();};
  }
  bass(time,midi,duration,accent=1){this.sampler.play(time,midi,duration,accent);}
  click(time,accent){this.voice(time,accent?1400:1000,.045,'sine',accent?.1:.055);}
  async preview(midi){const epoch=this.epoch;this.ctx ||=new AudioContext();await this.ctx.resume();this.setupMixer();this.updateMix({bass:true,bassVolume:.8});this.sampler ||=new SampleBass(this.ctx,this.channels.bass);await this.sampler.prepare();if(epoch===this.epoch)this.bass(this.ctx.currentTime+.01,midi,.7);}
  stop(){this.active=false;this.epoch=(this.epoch||0)+1;clearInterval(this.timer);clearTimeout(this.finishTimer);this.uiTimers?.forEach(clearTimeout);this.uiTimers?.clear();for(const v of this.voices){try{v.stop();}catch{}}this.voices.clear();this.sampler?.stop();this.band?.stop();this.onStop();}
}
