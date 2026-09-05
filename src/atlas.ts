import {WORLD,REGIONS,ROAD,LANDMARKS,LAND,PASSAGES,SHOP,HARDWARE,EXPLORE,groundColor,regionAt,heightAt,riverX,chunkKey,passageOpen,type Point} from './world';
import type {Simulation} from './simulation';

export class Atlas {
 private ctx:CanvasRenderingContext2D;private base:HTMLCanvasElement|undefined;private relief:HTMLCanvasElement|undefined;
 private width=800;private height=600;private scale=.03;private minimum=.02;private center:Point={x:WORLD.w/2,y:WORLD.h/2};
 private drag:{x:number;y:number;cx:number;cy:number;moved:boolean}|undefined;private waypoint:Point|undefined;private hover:Point|undefined;
 private layers={relief:true,roads:true,places:true};
 constructor(private canvas:HTMLCanvasElement,private dialog:HTMLDialogElement,private sim:Simulation){
  this.ctx=canvas.getContext('2d')!;
  canvas.addEventListener('wheel',e=>{e.preventDefault();this.zoom(Math.exp(-e.deltaY*.0015),e.offsetX,e.offsetY);},{passive:false});
  canvas.onpointerdown=e=>{this.drag={x:e.offsetX,y:e.offsetY,cx:this.center.x,cy:this.center.y,moved:false};canvas.setPointerCapture(e.pointerId);};
  canvas.onpointermove=e=>{if(this.drag){const dx=e.offsetX-this.drag.x,dy=e.offsetY-this.drag.y;if(Math.hypot(dx,dy)>5)this.drag.moved=true;this.center={x:this.drag.cx-dx/this.scale,y:this.drag.cy-dy/this.scale};this.bound();}this.hover=this.fromScreen(e.offsetX,e.offsetY);this.draw();};
  canvas.onpointerup=e=>{if(this.drag&&!this.drag.moved){const p=this.fromScreen(e.offsetX,e.offsetY),landmark=LANDMARKS.find(l=>(!l.hidden||this.sim.explored.has(chunkKey(l)))&&Math.hypot(l.x-p.x,l.y-p.y)*this.scale<13);this.waypoint=landmark?{x:landmark.x,y:landmark.y}:p;this.details();}this.drag=undefined;canvas.releasePointerCapture(e.pointerId);this.draw();};
  canvas.onpointercancel=()=>this.drag=undefined;canvas.oncontextmenu=e=>{e.preventDefault();this.waypoint=undefined;this.details();this.draw();};
  canvas.ondblclick=e=>this.zoom(1.8,e.offsetX,e.offsetY);
  dialog.querySelectorAll<HTMLButtonElement>('[data-atlas]').forEach(b=>b.onclick=()=>{switch(b.dataset.atlas){case 'in':this.zoom(1.5);break;case 'out':this.zoom(1/1.5);break;case 'fit':this.fit();break;case 'me':this.center={...this.position};this.scale=Math.min(.25,this.width/4300);this.draw();break;case 'clear':this.waypoint=undefined;this.details();this.draw();break;}});
  dialog.querySelectorAll<HTMLButtonElement>('[data-layer]').forEach(b=>b.onclick=()=>{const key=b.dataset.layer as keyof typeof this.layers;this.layers[key]=!this.layers[key];b.setAttribute('aria-pressed',String(this.layers[key]));this.draw();});
  dialog.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='m'){e.preventDefault();e.stopPropagation();dialog.close();}if(e.key==='+'||e.key==='=')this.zoom(1.4);if(e.key==='-')this.zoom(1/1.4);});
  new ResizeObserver(()=>{if(dialog.open){this.resize();this.draw();}}).observe(canvas.parentElement!);
 }
 private get position(){return this.sim.interior?(this.sim.interior==='vale'?SHOP:HARDWARE):this.sim.position;}
 private resize(){const r=this.canvas.parentElement!.getBoundingClientRect();this.width=Math.max(240,r.width);this.height=Math.max(260,r.height);const dpr=Math.min(devicePixelRatio,2);this.canvas.width=this.width*dpr;this.canvas.height=this.height*dpr;this.ctx.setTransform(dpr,0,0,dpr,0,0);this.minimum=Math.min((this.width-45)/WORLD.w,(this.height-45)/WORLD.h);this.scale=Math.max(this.minimum,this.scale);}
 open(){if(!this.base)this.bake();this.resize();this.fit();this.details();}
 private bake(){const w=512,h=Math.round(w*WORLD.h/WORLD.w);this.base=document.createElement('canvas');this.relief=document.createElement('canvas');for(const c of [this.base,this.relief]){c.width=w;c.height=h;}const ctx=this.base.getContext('2d')!,rel=this.relief.getContext('2d')!;const image=ctx.createImageData(w,h),shade=rel.createImageData(w,h),step=WORLD.w/w;
  const colors=new Map(REGIONS.map(r=>[r.id,r.color.match(/\w\w/g)!.map(h=>parseInt(h,16))]));
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p={x:x*step,y:y*step},r=regionAt(p),c=groundColor(p),height=heightAt(p),rise=heightAt({x:p.x-step,y:p.y-step})-height,light=Math.max(.62,Math.min(1.17,1+rise*.001)),i=(y*w+x)*4;for(let j=0;j<3;j++){image.data[i+j]=c[j]*.65+205*.35;shade.data[i+j]=(c[j]*.65+205*.35)*light+(height/620)*14;}image.data[i+3]=shade.data[i+3]=255;}
  ctx.putImageData(image,0,0);rel.putImageData(shade,0,0);
 }
 private fit(){this.center={x:WORLD.w/2,y:WORLD.h/2};this.scale=this.minimum;this.draw();}
 private bound(){this.center.x=Math.max(0,Math.min(WORLD.w,this.center.x));this.center.y=Math.max(0,Math.min(WORLD.h,this.center.y));}
 private fromScreen(x:number,y:number){return{x:Math.max(0,Math.min(WORLD.w,(x-this.width/2)/this.scale+this.center.x)),y:Math.max(0,Math.min(WORLD.h,(y-this.height/2)/this.scale+this.center.y))};}
 private toScreen(p:Point){return{x:(p.x-this.center.x)*this.scale+this.width/2,y:(p.y-this.center.y)*this.scale+this.height/2};}
 private zoom(factor:number,x=this.width/2,y=this.height/2){const anchor=this.fromScreen(x,y);this.scale=Math.max(this.minimum,Math.min(.6,this.scale*factor));this.center={x:anchor.x-(x-this.width/2)/this.scale,y:anchor.y-(y-this.height/2)/this.scale};this.bound();this.draw();}
 private details(){const p=this.waypoint??this.position,r=regionAt(p),distance=Math.hypot(p.x-this.position.x,p.y-this.position.y);this.dialog.querySelector('#atlas-place')!.textContent=this.waypoint?r.name:'Sua posição · '+r.name;this.dialog.querySelector('#atlas-detail')!.textContent=this.waypoint?`${Math.round(distance/20)} m em linha reta · cota ${Math.round(heightAt(p))}. Clique com o botão direito para limpar a anotação.`:'Clique no papel para anotar um destino. Siga as estradas; travessias e terras altas podem exigir preparação.';const place=this.waypoint?LANDMARKS.find(l=>l.x===p.x&&l.y===p.y):undefined;if(place){this.dialog.querySelector('#atlas-place')!.textContent=place.name;const gate=PASSAGES.find(g=>g.id===place.id);if(gate)this.dialog.querySelector('#atlas-detail')!.textContent=passageOpen(gate,this.sim.unlocked)?'Travessia aberta. '+Math.round(distance/20)+' m até aqui.':gate.kind==='rockfall'?'A estrada está coberta por pedras. Leve uma carga de dinamite e afaste-se depois de acender.':'Leve '+gate.cost+' tábuas até a travessia e pressione E para reparar.';}this.dialog.querySelector('#atlas-discovery')!.textContent=`${this.sim.explored.size} setores registrados`;}
 draw(){if(!this.base||!this.dialog.open)return;const c=this.ctx,w=this.width,h=this.height,s=this.scale,o=this.toScreen({x:0,y:0});c.clearRect(0,0,w,h);c.fillStyle='#d8cfb0';c.fillRect(0,0,w,h);c.save();c.translate(o.x,o.y);c.scale(s,s);c.drawImage(this.layers.relief?this.relief!:this.base,0,0,WORLD.w,WORLD.h);
  // Unvisited paper is paler; secrets are never added as markers before exploration.
  c.fillStyle='#e9dfbe55';for(let x=0;x<WORLD.w;x+=EXPLORE)for(let y=0;y<WORLD.h;y+=EXPLORE)if(!this.sim.explored.has(chunkKey({x,y})))c.fillRect(x,y,EXPLORE,EXPLORE);
  c.strokeStyle='#718f85';c.lineWidth=150;c.beginPath();for(let y=0;y<=WORLD.h;y+=60){const x=riverX(y);y===0?c.moveTo(x,y):c.lineTo(x,y);}c.stroke();
  if(this.layers.roads){c.lineCap='round';c.lineJoin='round';for(const road of ROAD){c.beginPath();road.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.strokeStyle='#f2e4b8';c.lineWidth=Math.max(65,3/s);c.stroke();c.strokeStyle='#8c7d54';c.lineWidth=Math.max(18,.8/s);c.stroke();}}
  c.strokeStyle='#7a846333';c.lineWidth=1/s;for(let x=0;x<=WORLD.w;x+=3072){c.beginPath();c.moveTo(x,0);c.lineTo(x,WORLD.h);c.stroke();}for(let y=0;y<=WORLD.h;y+=3072){c.beginPath();c.moveTo(0,y);c.lineTo(WORLD.w,y);c.stroke();}c.strokeStyle='#566e4e';c.lineWidth=2/s;c.strokeRect(LAND.x,LAND.y,LAND.w,LAND.h);c.restore();
  c.textAlign='center';c.textBaseline='middle';for(const r of REGIONS){const p=this.toScreen({x:r.x+r.w*.5,y:r.y+r.h*.44});if(p.x<-100||p.x>w+100||p.y<-30||p.y>h+30)continue;const size=s>this.minimum*2?20:this.width<500?11:15;c.font=`italic ${size}px Georgia`;c.fillStyle='#425e49';const maxWidth=Math.max(58,Math.min(270,r.w*s*.85)),lines:string[]=[];let line='';for(const word of r.name.split(' ')){const next=line?line+' '+word:word;if(line&&c.measureText(next).width>maxWidth){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);lines.forEach((line,i)=>c.fillText(line,p.x,p.y+(i-(lines.length-1)/2)*(size+2)));}
  if(this.layers.places){for(const l of LANDMARKS){if(l.hidden&&!this.sim.explored.has(chunkKey(l)))continue;const p=this.toScreen(l);if(p.x<0||p.x>w||p.y<0||p.y>h)continue;const gate=PASSAGES.find(g=>g.id===l.id),locked=gate&&!passageOpen(gate,this.sim.unlocked);c.fillStyle=locked?'#a2754b':l.kind==='shop'?'#3e634e':'#6f7755';c.fillRect(p.x-3,p.y-3,6,6);if(s>this.minimum*2){c.font='11px "DM Sans", sans-serif';c.fillText(l.name,p.x,p.y+14);}}}
  if(this.sim.truck){const t=this.toScreen(this.sim.truck.body.position);c.fillStyle='#537d70';c.fillRect(t.x-4,t.y-3,8,6);}
  for(const e of this.sim.entities.values())if(e.kind==='mill'){const p=this.toScreen(e.body.position);c.fillStyle='#81754e';c.fillRect(p.x-3,p.y-3,6,6);}
  const player=this.toScreen(this.position);c.fillStyle='#f2e6c4';c.beginPath();c.arc(player.x,player.y,8,0,Math.PI*2);c.fill();c.fillStyle='#a1653d';c.beginPath();c.arc(player.x,player.y,4.5,0,Math.PI*2);c.fill();
  if(this.waypoint){const p=this.toScreen(this.waypoint);c.strokeStyle='#985f3c';c.lineWidth=1;c.setLineDash([3,5]);c.beginPath();c.moveTo(player.x,player.y);c.lineTo(p.x,p.y);c.stroke();c.setLineDash([]);c.beginPath();c.arc(p.x,p.y,7,0,Math.PI*2);c.stroke();c.beginPath();c.moveTo(p.x-11,p.y);c.lineTo(p.x+11,p.y);c.moveTo(p.x,p.y-11);c.lineTo(p.x,p.y+11);c.stroke();}
  c.fillStyle='#53664e';c.textAlign='left';c.font='11px "DM Sans",sans-serif';const meters=100,bar=meters*20*s;c.fillRect(24,h-27,bar,2);c.fillRect(24,h-31,1,6);c.fillRect(24+bar,h-31,1,6);c.fillText('100 m',24,h-42);c.textAlign='right';c.fillText('N ↑',w-24,26);
  const at=this.hover??this.position;this.dialog.querySelector('#atlas-coordinate')!.textContent=`${Math.round(at.x/20)} E · ${Math.round(at.y/20)} S · cota ${Math.round(heightAt(at))}`;
 }
}
