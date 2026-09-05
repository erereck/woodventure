import type { GameEvent } from './model';
export class Soundscape {
  context:AudioContext|null=null;master:GainNode|null=null;engineGain:GainNode|null=null;engineOsc:OscillatorNode|null=null;
  enabled=true;birdTimer=0;
  async start(){
    if(this.context){await this.context.resume();return;}
    const a=this.context=new AudioContext();this.master=a.createGain();this.master.gain.value=.38;this.master.connect(a.destination);
    const buffer=a.createBuffer(1,a.sampleRate*5,a.sampleRate);const data=buffer.getChannelData(0);let last=0;
    for(let i=0;i<data.length;i++){last=(last+(Math.random()*2-1)*.02)/1.02;data[i]=last*3;}
    const wind=a.createBufferSource();wind.buffer=buffer;wind.loop=true;const low=a.createBiquadFilter();low.type='lowpass';low.frequency.value=600;const g=a.createGain();g.gain.value=.15;wind.connect(low);low.connect(g);g.connect(this.master);wind.start();
    this.engineOsc=a.createOscillator();this.engineOsc.type='sawtooth';this.engineOsc.frequency.value=42;const filter=a.createBiquadFilter();filter.type='lowpass';filter.frequency.value=180;this.engineGain=a.createGain();this.engineGain.gain.value=0;this.engineOsc.connect(filter);filter.connect(this.engineGain);this.engineGain.connect(this.master);this.engineOsc.start();await a.resume();
  }
  toggle(){this.enabled=!this.enabled;if(this.master&&this.context)this.master.gain.setTargetAtTime(this.enabled?.38:0,this.context.currentTime,.2);}
  private tone(freq:number,duration:number,volume:number,type:OscillatorType='sine',end?:number){const a=this.context;if(!a||!this.master)return;const osc=a.createOscillator(),g=a.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,a.currentTime);if(end)osc.frequency.exponentialRampToValueAtTime(end,a.currentTime+duration);g.gain.setValueAtTime(volume,a.currentTime);g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+duration);osc.connect(g);g.connect(this.master);osc.start();osc.stop(a.currentTime+duration);}
  private noise(duration:number,volume:number,frequency:number){const a=this.context;if(!a||!this.master)return;const b=a.createBuffer(1,a.sampleRate*duration,a.sampleRate);const d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);const n=a.createBufferSource();n.buffer=b;const f=a.createBiquadFilter();f.type='lowpass';f.frequency.value=frequency;const g=a.createGain();g.gain.value=volume;n.connect(f);f.connect(g);g.connect(this.master);n.start();}
  event(e:GameEvent,distance:number){const v=Math.max(.03,1-distance/800);if(e.type==='chop'){this.tone(170,.15,.5*v,'triangle',55);this.noise(.07,.35*v,1800);}if(e.type==='fall'){this.noise(1.7,.6*v,530);this.tone(85,1.5,.28*v,'sawtooth',24);}if(e.type==='wood'||e.type==='build'){this.tone(130,.19,.3*v,'triangle',52);this.noise(.1,.18*v,900);}if(e.type==='explode'){this.noise(2,.8*v,650);this.tone(65,1.4,.8*v,'sine',20);}if(e.type==='sell')this.tone(520,.1,.07*v,'triangle',430);if(e.type==='secret'){this.tone(46,3,.25*v,'sawtooth',28);this.noise(2,.24*v,320);}}
  update(dt:number,driving:boolean,speed:number,paused:boolean){const a=this.context;if(!a)return;this.engineGain?.gain.setTargetAtTime(driving&&!paused?.15+speed*.012:0,a.currentTime,.15);this.engineOsc?.frequency.setTargetAtTime(35+speed*6,a.currentTime,.2);this.birdTimer-=dt;if(this.birdTimer<0&&!paused){this.birdTimer=7+Math.random()*15;this.tone(1800+Math.random()*600,.3,.028,'sine',2700);setTimeout(()=>this.tone(2100,.18,.022,'sine',1400),230);}}
}
