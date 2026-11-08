import {SampleBass} from './sampler.js';
export class Player {
  constructor(onBeat,onStop) {this.onBeat=onBeat;this.onStop=onStop;this.active=false;this.timer=null;this.voices=new Set();}
  async play(notes,options) {
    this.stop();
    const epoch=this.epoch;
    this.ctx ||= new AudioContext();
    await this.ctx.resume();
    this.sampler ||=new SampleBass(this.ctx);
    await this.sampler.prepare();
    if(!notes.length || epoch!==this.epoch) return false;
    this.active=true;this.finishing=false;this.notes=notes;this.options=options;this.index=options().countIn?-4:0;
    this.nextTime=this.ctx.currentTime+.08;this.epoch=(this.epoch||0)+1;
    this.schedule();this.timer=setInterval(()=>this.schedule(),25);
    return true;
  }
  schedule(){
    while(this.active && !this.finishing && this.nextTime<this.ctx.currentTime+.12){
      const i=this.index,opts=this.options(),time=this.nextTime,step=60/opts.bpm;
      if(i>=this.notes.length){if(!opts.loop){this.finishing=true;clearInterval(this.timer);this.finishTimer=setTimeout(()=>this.stop(),Math.max(0,(time-this.ctx.currentTime)*1000));return;}this.index=0;continue;}
      if(i<0 || opts.click)this.click(time,i%4===0);
      if(i>=0 && opts.bass && !this.notes[i].rest)this.bass(time,this.notes[i].midi,step*.94,i%4===0?1:.94);
      const epoch=this.epoch;
      const id=setTimeout(()=>{this.uiTimers.delete(id);if(this.active&&this.epoch===epoch)this.onBeat(i);},Math.max(0,(time-this.ctx.currentTime)*1000));
      this.uiTimers ||=new Set();this.uiTimers.add(id);
      this.index++;this.nextTime+=step;
    }
  }
  voice(time,freq,duration,type,volume){
    const osc=this.ctx.createOscillator(),gain=this.ctx.createGain();
    osc.type=type;osc.frequency.value=freq;gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(volume,time+.008);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
    osc.connect(gain).connect(this.ctx.destination);osc.start(time);osc.stop(time+duration+.02);this.voices.add(osc);osc.onended=()=>{this.voices.delete(osc);osc.disconnect();gain.disconnect();};
  }
  bass(time,midi,duration,accent=1){this.sampler.play(time,midi,duration,accent);}
  click(time,accent){this.voice(time,accent?1400:1000,.045,'sine',accent?.1:.055);}
  async preview(midi){const epoch=this.epoch;this.ctx ||=new AudioContext();await this.ctx.resume();this.sampler ||=new SampleBass(this.ctx);await this.sampler.prepare();if(epoch===this.epoch)this.bass(this.ctx.currentTime+.01,midi,.7);}
  stop(){this.active=false;this.epoch=(this.epoch||0)+1;clearInterval(this.timer);clearTimeout(this.finishTimer);this.uiTimers?.forEach(clearTimeout);this.uiTimers?.clear();for(const v of this.voices){try{v.stop();}catch{}}this.voices.clear();this.sampler?.stop();this.onStop();}
}
