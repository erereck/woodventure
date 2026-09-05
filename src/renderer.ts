import { TerrainView } from './terrain3d';
import {heightAt} from './world';
import * as T from 'three';
import { entityModel, disposeModel, box, material } from './models3d';
import { outdoors, interior } from './scenery3d';
import { onTruckBed } from './layers';
import { BUILD,ROOMS,STOCK,roomCounter,clamp,dist,inLand,riverX,WORLD,type Entity,type GameEvent,type Piece,type Vec } from './model';
import type { Simulation } from './simulation';

type Visual={root:T.Group;signature:string;height:number;orientation?:T.Quaternion};
type Particle={mesh:T.Mesh;v:T.Vector3;life:number};
export class Renderer {
 width=0;height=0;dpr=1;camera={x:1390,y:1970};zoom=1;targetZoom=1;time=0;
 hover:Entity|undefined;build:Piece|null=null;ghost:Vec={x:0,y:0};buildAngle=0;title=true;photo=false;package:Entity|undefined;
 reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 readonly scene=new T.Scene();readonly view=new T.OrthographicCamera(-720,720,480,-480,1,7000);readonly gpu:T.WebGLRenderer;
 private terrain=new TerrainView();private altitude=0;
 private visuals=new Map<string,Visual>();private outside:T.Group;private rooms:Record<string,T.Group>={};
 private sun=new T.DirectionalLight('#fff0dc',2.0);private ambient=new T.HemisphereLight('#d6e3df','#68796a',2.3);
 private ray=new T.Raycaster();private plane=new T.Plane(new T.Vector3(0,1,0),0);private projected=new T.Vector3();
 private yaw=.25;private targetYaw=.25;private elevation=.86;private targetElevation=.86;
 private ghostModel:T.Group|undefined;private ghostKey='';private ring:T.Mesh;private tray:T.Mesh;private rope:T.Line;private particles:Particle[]=[];
 private ripples:T.InstancedMesh;private dummy=new T.Object3D();private flash=new T.PointLight('#ffdf96',0,450,2);
 private lamp=new T.SpotLight('#fff0ba',0,450,Math.PI/5,.65,1.4);private contextLost=false;
 constructor(readonly canvas:HTMLCanvasElement,readonly sim:Simulation){
  this.gpu=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});this.gpu.outputColorSpace=T.SRGBColorSpace;this.gpu.toneMapping=T.ACESFilmicToneMapping;this.gpu.toneMappingExposure=1.04;
  this.gpu.shadowMap.enabled=true;this.gpu.shadowMap.type=T.PCFShadowMap;this.scene.background=new T.Color('#405e4c');this.scene.fog=new T.Fog('#718471',2500,4600);
  this.scene.add(this.ambient,this.sun,this.sun.target,this.flash,this.lamp,this.lamp.target);this.sun.castShadow=true;this.sun.shadow.intensity=.65;this.sun.shadow.mapSize.set(2048,2048);this.sun.shadow.camera.left=-1050;this.sun.shadow.camera.right=1050;this.sun.shadow.camera.top=1050;this.sun.shadow.camera.bottom=-1050;this.sun.shadow.camera.near=100;this.sun.shadow.camera.far=2500;this.sun.shadow.normalBias=1.5;this.sun.shadow.bias=-.0001;
  this.scene.add(this.terrain.root);this.outside=outdoors();this.scene.add(this.outside);for(const id of ['vale','east'] as const){this.rooms[id]=interior(id);this.scene.add(this.rooms[id]);}
  this.ring=new T.Mesh(new T.RingGeometry(17,18.2,48),new T.MeshBasicMaterial({color:'#efdaa2',transparent:true,opacity:.8,side:T.DoubleSide,depthWrite:false}));this.ring.rotation.x=-Math.PI/2;this.scene.add(this.ring);
  this.tray=new T.Mesh(new T.PlaneGeometry(49,41),new T.MeshBasicMaterial({color:'#e4d7a3',transparent:true,opacity:.35,side:T.DoubleSide,depthWrite:false}));this.tray.rotation.x=-Math.PI/2;this.scene.add(this.tray);
  const ropeGeo=new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]);this.rope=new T.Line(ropeGeo,new T.LineBasicMaterial({color:'#e0cc9f',transparent:true,opacity:.75}));this.rope.frustumCulled=false;this.scene.add(this.rope);
  this.ripples=new T.InstancedMesh(new T.BoxGeometry(1,1,1),new T.MeshBasicMaterial({color:'#a5c6b6',transparent:true,opacity:.19}),140);this.ripples.frustumCulled=false;this.scene.add(this.ripples);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.contextLost=true;const message=document.createElement('div');message.id='graphics-error';message.textContent='A imagem foi interrompida. Seu mundo continua salvo. Recarregue a página para voltar ao vale.';document.body.append(message);});
  this.resize();this.updateCamera();
 }
 resize(){this.width=innerWidth;this.height=innerHeight;this.dpr=Math.min(devicePixelRatio,1.5);this.gpu.setPixelRatio(this.dpr);this.gpu.setSize(this.width,this.height);this.view.left=-this.width/2;this.view.right=this.width/2;this.view.top=this.height/2;this.view.bottom=-this.height/2;this.view.updateProjectionMatrix();}
 rotateCamera(direction=1){this.targetYaw+=direction*Math.PI/4;}
 tiltCamera(){this.targetElevation=this.targetElevation>.9?.70:1.04;}
 resetCamera(){this.targetYaw=.25;this.targetElevation=.86;}
 movementToWorld(x:number,y:number){const a=this.yaw;return{x:x*Math.cos(a)+y*Math.sin(a),y:-x*Math.sin(a)+y*Math.cos(a)};}
 private updateCamera(){const a=this.yaw,e=this.sim.interior&&!this.title?.91:this.elevation,range=1900;this.view.position.set(this.camera.x+Math.sin(a)*Math.cos(e)*range,this.altitude+Math.sin(e)*range,this.camera.y+Math.cos(a)*Math.cos(e)*range);this.view.lookAt(this.camera.x,this.altitude,this.camera.y);this.view.zoom=this.zoom;this.view.updateProjectionMatrix();this.view.updateMatrixWorld();}
 private setRay(x:number,y:number){this.ray.setFromCamera(new T.Vector2(x/this.width*2-1,1-y/this.height*2),this.view);}
 screenToWorld(x:number,y:number):Vec{this.setRay(x,y);const held=this.sim.held?this.visuals.get(this.sim.held):undefined;if(!held&&!this.sim.interior){const hit=this.ray.intersectObjects(this.terrain.surfaces,false)[0];if(hit)return{x:hit.point.x,y:hit.point.z};}
  this.plane.constant=-(held?.height??(this.sim.interior?0:heightAt(this.camera)));const p=this.ray.ray.intersectPlane(this.plane,this.projected);return p?{x:p.x,y:p.z}:{...this.camera};}
 worldToScreen(p:Vec,height=0):Vec{this.projected.set(p.x,height+(this.sim.interior?0:heightAt(p)),p.y).project(this.view);return{x:(this.projected.x+1)*this.width/2,y:(1-this.projected.y)*this.height/2};}
 pickEntity(x:number,y:number,kinds:Entity['kind'][]){this.setRay(x,y);const objects:T.Object3D[]=[];for(const [id,v] of this.visuals){const e=this.sim.entities.get(id);if(e&&v.root.visible&&kinds.includes(e.kind)&&e.room===this.sim.interior&&e.fallAt===undefined)objects.push(v.root);}
  const hit=this.ray.intersectObjects(objects,true)[0];if(!hit)return;let root:T.Object3D|null=hit.object;while(root&&!root.userData.entityId)root=root.parent;return root?this.sim.entities.get(root.userData.entityId):undefined;
 }
 get hour(){return(16.2+this.sim.elapsed/150)%24;}
 event(e:GameEvent){if(!['chop','fall','wood','build','explode'].includes(e.type))return;const count=e.type==='explode'?65:e.type==='fall'?25:10;for(let i=0;i<count;i++){const mesh=new T.Mesh(new T.BoxGeometry(2+Math.random()*2,2,2),material(e.type==='explode'?(i%2?'#d9b177':'#807c68'):'#dab57d'));mesh.position.set(e.x,18+(this.sim.interior?0:heightAt(e)),e.y);this.scene.add(mesh);this.particles.push({mesh,life:1+Math.random(),v:new T.Vector3((Math.random()-.5)*130,40+Math.random()*95,(Math.random()-.5)*130)});}if(e.type==='explode'){this.flash.position.set(e.x,40+(this.sim.interior?0:heightAt(e)),e.y);this.flash.intensity=45000;}}
 private support(e:Entity){
  const ground=e.room?0:heightAt(e.body.position);
  if(onTruckBed(e,this.sim.truck))return heightAt(this.sim.truck!.body.position)+36;
  if(e.millId)return ground+37;
  if(['log','plank'].includes(e.kind)&&!e.room){for(const m of this.sim.entities.values())if(m.kind==='mill'){const dx=e.body.position.x-m.body.position.x,dz=e.body.position.y-m.body.position.y,a=m.body.angle;const x=dx*Math.cos(a)+dz*Math.sin(a),z=-dx*Math.sin(a)+dz*Math.cos(a);if(Math.abs(x)<110&&Math.abs(z)<32)return ground+37;}}
  if(e.room&&['box','dynamite','tool'].includes(e.kind)){const counter=roomCounter(e.room);if(Math.abs(e.body.position.x-counter.x)<101&&Math.abs(e.body.position.y-counter.y+35)<49)return 40;
   const room=ROOMS[e.room];for(let slot=0;slot<STOCK[e.room].length;slot++){if(Math.abs(e.body.position.x-room.x-(-290+slot%3*225))<56&&Math.abs(e.body.position.y-room.y-(-170+Math.floor(slot/3)*130))<28)return 17;}}
  return ground+.6;
 }
 private syncEntity(e:Entity,dt:number){
  const signature=[e.kind,e.species,e.size,e.w,e.h,e.piece,e.paid,e.product,e.toolPower].join('/');let v=this.visuals.get(e.id);
  if(v&&v.signature!==signature){this.scene.remove(v.root);disposeModel(v.root);this.visuals.delete(e.id);v=undefined;}
  const near=Math.abs(e.body.position.x-this.camera.x)<this.width/this.zoom*.8+350&&Math.abs(e.body.position.y-this.camera.y)<this.height/this.zoom+400;
  if(!v&&(!near||e.room!==this.sim.interior&&!(this.title&&!e.room)))return;
  if(!v){const root=entityModel(e);root.userData.entityId=e.id;v={root,signature,height:this.support(e)};this.visuals.set(e.id,v);this.scene.add(root);}
  const g=v.root;g.visible=near&&(this.title?!e.room:e.room===this.sim.interior)&&!(e.kind==='player'&&(this.sim.driving||!!this.sim.deadUntil));if(!g.visible)return;
  const target=this.support(e);v.height+=(target-v.height)*(1-Math.exp(-dt*14));g.position.set(e.body.position.x,v.height,e.body.position.y);g.rotation.set(0,-e.body.angle,0);if(!e.room&&['truck','log','plank','box'].includes(e.kind)){const p=onTruckBed(e,this.sim.truck)?this.sim.truck!.body.position:e.body.position,span=e.kind==='truck'?52:24,dx=clamp((heightAt({x:p.x+span,y:p.y})-heightAt({x:p.x-span,y:p.y}))/(span*2),-.7,.7),dz=clamp((heightAt({x:p.x,y:p.y+span})-heightAt({x:p.x,y:p.y-span}))/(span*2),-.7,.7),up=new T.Vector3(-dx,1,-dz).normalize(),back=new T.Vector3(-Math.sin(e.body.angle),0,Math.cos(e.body.angle));back.addScaledVector(up,-back.dot(up)).normalize();const right=new T.Vector3().crossVectors(up,back),q=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(right,up,back));v.orientation??=q.clone();v.orientation.slerp(q,1-Math.exp(-dt*12));g.quaternion.copy(v.orientation);}
  if(e.kind==='tree'){
   const crown=g.getObjectByName('crown') as T.Mesh<T.BufferGeometry,T.MeshStandardMaterial>;const focus=this.worldToScreen(this.sim.position,30),cp=this.worldToScreen(e.body.position,115*e.size),ground=this.worldToScreen(e.body.position);const held=this.sim.held?this.sim.entities.get(this.sim.held):undefined;
   const occludes=(point:Vec)=>{const dx=Math.max(0,Math.abs(cp.x-point.x)-65*e.size*this.zoom),dy=Math.max(0,Math.abs(cp.y-point.y)-70*e.size*this.zoom);const d=Math.hypot(dx,dy);return ground.y>point.y-45*this.zoom?clamp(d/(110*this.zoom),0,1):1;};
   let fade=this.title?1:occludes(focus);if(held&&!this.title)fade=Math.min(fade,occludes(this.worldToScreen(held.body.position,25)));const opacity=.18+.82*fade*fade*(3-2*fade);crown.material.opacity+=(opacity-crown.material.opacity)*(1-Math.exp(-dt*9));const transparent=crown.material.opacity<.99;if(crown.material.transparent!==transparent){crown.material.transparent=transparent;crown.material.needsUpdate=true;}crown.material.depthWrite=!transparent;crown.castShadow=!transparent;
   if(!this.reduced){g.rotation.z=Math.sin(this.time*.7+e.seed)*.008;g.rotation.x=Math.cos(this.time*.6+e.seed)*.004;}
   if(e.cutAt!==undefined)g.rotation.z+=Math.sin((this.sim.elapsed-e.cutAt)*45)*Math.max(0,1-(this.sim.elapsed-e.cutAt)*4)*.025;
   if(e.fallAt!==undefined){const t=clamp((this.sim.elapsed-e.fallAt)/1.3,0,1),a=e.fallAngle??0;g.quaternion.setFromAxisAngle(new T.Vector3(Math.sin(a),0,-Math.cos(a)),t*t*Math.PI*.49);}
  }else if(e.kind==='player')this.animatePlayer(g);
  else if(e.kind==='truck'){const speed=Math.hypot(e.body.velocity.x,e.body.velocity.y);g.children.filter(c=>c.name==='wheel').forEach(w=>w.rotation.x=this.time*speed*.5);}
  else if(e.kind==='dynamite'){const ember=g.getObjectByName('ember')!;ember.visible=e.fuse!==undefined;if(ember.visible)ember.scale.setScalar(1+Math.sin(this.time*35)*.25);}
  if(e.kind==='mill'||e.kind==='structure'&&e.piece==='conveyor'){const active=e.kind!=='mill'||[...this.sim.entities.values()].some(l=>l.millId===e.id);for(const r of g.children)if(r.name==='roller'&&active)r.rotation.y=this.time*2;const blade=g.getObjectByName('blade');if(blade&&active)blade.rotation.z=this.time*14;}
  let ties=g.getObjectByName('ties');if(e.tied&&!ties){ties=new T.Group();ties.name='ties';for(const x of [-e.w*.25,e.w*.25])box(ties,2,e.kind==='box'?33:e.h+2,e.h+3,x,e.kind==='box'?16:e.h/2,0,'#c8b58b');g.add(ties);}if(ties)ties.visible=!!e.tied;
 }
 private animatePlayer(g:T.Group){const s=this.sim,t=s.elapsed-s.swing.at,attacking=t>=0&&t<.48,angle=attacking?s.swing.angle:s.facing;g.rotation.y=-angle-Math.PI/2;const speed=Math.hypot(s.player.body.velocity.x,s.player.body.velocity.y),walk=Math.sin(this.time*11)*Math.min(speed/3,1)*.55;
  g.getObjectByName('legL')!.rotation.x=walk;g.getObjectByName('legR')!.rotation.x=-walk;g.getObjectByName('armL')!.rotation.x=-walk*.6;
  const arm=g.getObjectByName('armR')!,tool=g.getObjectByName('axe')!;
  if(attacking){const f=clamp(t/.22,0,1),reach=22+(s.swing.reach-22)*Math.sin(f*Math.PI/2),recover=clamp((t-.22)/.26,0,1),arc=(1-f)*1.1+recover*.35;const r=reach+(28-reach)*recover;tool.position.set(Math.sin(arc)*r,18+Math.sin((1-f)*Math.PI/2)*26,-Math.cos(arc)*r+13);tool.rotation.set(0,arc,0);arm.rotation.x=-1.1;arm.rotation.z=-arc*.4;
  }else{tool.position.set(13,19,-9);tool.rotation.set(-.4,0,-.12);arm.rotation.x=.1;arm.rotation.z=0;}
 }
 private updateGhost(){const e=this.package,key=e?'package/'+e.id+'/'+e.kind+'/'+e.product:this.build?'build/'+this.build:'';if(key!==this.ghostKey){if(this.ghostModel){this.scene.remove(this.ghostModel);this.ghostModel.traverse(o=>{if(o instanceof T.Mesh){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>m.dispose());}});disposeModel(this.ghostModel);}this.ghostModel=undefined;this.ghostKey=key;
  if(key){const sample=e?{...e,kind:e.kind==='mill'||e.product==='mill'?'mill':'truck'}:{kind:'structure',piece:this.build,w:BUILD[this.build!].w,h:BUILD[this.build!].h};const g=entityModel(sample as Entity);g.traverse(o=>{if(o instanceof T.Mesh){const m=(o.material as T.Material).clone();m.transparent=true;m.opacity=.46;m.depthWrite=false;o.material=m;o.castShadow=false;}});this.ghostModel=g;this.scene.add(g);}}
  if(this.ghostModel){this.ghostModel.visible=!this.title&&!this.photo&&!this.sim.interior;this.ghostModel.position.set(this.ghost.x,heightAt(this.ghost)+2,this.ghost.y);this.ghostModel.rotation.y=-this.buildAngle;}
 }
 draw(dt:number){if(this.contextLost)return;this.time+=dt;const s=this.sim;const target=this.title?{x:1420,y:1975}:s.interior&&this.width>900?{x:ROOMS[s.interior].x,y:ROOMS[s.interior].y-20}:s.position;
  const ease=1-Math.exp(-dt*(this.title?.8:6));this.camera.x+=(target.x-this.camera.x)*ease;this.camera.y+=(target.y-this.camera.y)*ease;this.zoom+=(this.targetZoom-this.zoom)*(1-Math.exp(-dt*5));this.yaw+=(this.targetYaw-this.yaw)*(1-Math.exp(-dt*6));this.elevation+=(this.targetElevation-this.elevation)*(1-Math.exp(-dt*6));this.altitude+=((s.interior?0:heightAt(s.position))-this.altitude)*(1-Math.exp(-dt*7));this.updateCamera();
  this.terrain.root.visible=!s.interior||this.title;if(this.terrain.root.visible)this.terrain.update(this.camera,s.unlocked,this.zoom<.7?3:2);
  this.outside.visible=!s.interior||this.title;for(const [id,room] of Object.entries(this.rooms))room.visible=s.interior===id&&!this.title;
  for(const [id,v] of this.visuals)if(!s.entities.has(id)){this.scene.remove(v.root);disposeModel(v.root);this.visuals.delete(id);}
  for(const e of s.entities.values())this.syncEntity(e,dt);
  this.scene.background=new T.Color(s.interior&&!this.title?'#203c30':'#61755b');this.scene.fog!.color.copy(this.scene.background as T.Color);
  const dark=this.hour>19?clamp((this.hour-19)/2,0,.8):this.hour<6?.8:this.hour<8?.8-(this.hour-6)*.4:0;
  this.sun.intensity=s.interior?1.1:2.0*(1-dark);this.ambient.intensity=s.interior?2.3:2.3-dark*1.6;
  this.sun.position.set(this.camera.x-550,this.altitude+950,this.camera.y-460);this.sun.target.position.set(this.camera.x,this.altitude,this.camera.y);
  this.flash.intensity*=Math.exp(-dt*7);
  this.lamp.intensity=s.lights?8500:0;const heading=s.driving&&s.truck?s.truck.body.angle-Math.PI/2:s.facing,p=s.position;this.lamp.position.set(p.x,this.altitude+40,p.y);this.lamp.target.position.set(p.x+Math.cos(heading)*200,this.altitude,p.y+Math.sin(heading)*200);
  this.ring.visible=!!this.hover&&!this.title&&!this.photo&&!this.package;if(this.hover){this.ring.position.set(this.hover.body.position.x,this.support(this.hover)+.6,this.hover.body.position.y);this.ring.scale.setScalar(this.hover.kind==='tree'?1.3:Math.max(1,this.hover.w/35));}
  const offered=s.held?s.entities.get(s.held):undefined,slot=offered?s.counterPlacement(offered):undefined;this.tray.visible=!!slot;if(slot)this.tray.position.set(slot.x,40,slot.y);
  this.rope.visible=!!s.held&&!this.photo;const held=s.held?s.entities.get(s.held):undefined;if(held){const points=this.rope.geometry.getAttribute('position') as T.BufferAttribute;points.setXYZ(0,s.player.body.position.x,(s.interior?0:heightAt(s.position))+24,s.player.body.position.y);points.setXYZ(1,held.body.position.x,(this.visuals.get(held.id)?.height??0)+12,held.body.position.y);points.needsUpdate=true;}
  this.ripples.visible=!s.interior;for(let i=0;i<140;i++){const z=(i*27.17+this.time*8)%WORLD.h,x=riverX(z)+Math.sin(i*7)*55;this.dummy.position.set(x,.05,z);this.dummy.scale.set(z>2170&&z<2400?0:7+Math.sin(i)*4,.1,1);this.dummy.updateMatrix();this.ripples.setMatrixAt(i,this.dummy.matrix);}this.ripples.instanceMatrix.needsUpdate=true;
  for(const p of this.particles){p.life-=dt;p.v.y-=170*dt;p.mesh.position.addScaledVector(p.v,dt);p.mesh.rotation.x+=dt*2;const floor=s.interior?1:heightAt({x:p.mesh.position.x,y:p.mesh.position.z})+1;if(p.mesh.position.y<floor){p.mesh.position.y=floor;p.v.y*=-.2;p.v.x*=.9;p.v.z*=.9;}}
  this.particles=this.particles.filter(p=>{if(p.life>0)return true;this.scene.remove(p.mesh);p.mesh.geometry.dispose();return false;});this.updateGhost();this.gpu.render(this.scene,this.view);
 }
}
