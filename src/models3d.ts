import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { WOODS, PRODUCTS, rng, type Entity, type Piece } from './model';

// World coordinates: physics (x, y) becomes Three (x, height, z).
const materials=new Map<string,T.MeshStandardMaterial>();
export function material(color:string){let m=materials.get(color);if(!m){m=new T.MeshStandardMaterial({color,roughness:.88,metalness:.02,flatShading:true});materials.set(color,m);}return m;}
const cube=new T.BoxGeometry(1,1,1),sphere=new T.IcosahedronGeometry(1,1),cylinder=new T.CylinderGeometry(1,1,1,10);
for(const geometry of [cube,sphere,cylinder])geometry.userData.shared=true;
export function box(g:T.Object3D,w:number,h:number,d:number,x:number,y:number,z:number,color:string){const m=new T.Mesh(cube,material(color));m.scale.set(w,h,d);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
export function cyl(g:T.Object3D,r:number,h:number,x:number,y:number,z:number,color:string){const m=new T.Mesh(cylinder,material(color));m.scale.set(r,h,r);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
function ball(g:T.Object3D,x:number,y:number,z:number,sx:number,sy:number,sz:number,color:string){const m=new T.Mesh(sphere,material(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
function colored(geometry:T.BufferGeometry,color:string,matrix:T.Matrix4){const g=geometry.index?geometry.toNonIndexed():geometry.clone();g.applyMatrix4(matrix);const c=new T.Color(color),a=new Float32Array(g.getAttribute('position').count*3);for(let i=0;i<a.length;i+=3)c.toArray(a,i);g.setAttribute('color',new T.BufferAttribute(a,3));return g;}
const treeGeometries=new Map<string,{trunk:T.BufferGeometry;crown:T.BufferGeometry}>();
const vertexMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:.97,flatShading:true});
function tree(e:Entity){
 const species=e.species??'pine',key=species+'-'+e.seed%7,palette=WOODS[species],random=rng(e.seed%7*915+3);let geo=treeGeometries.get(key);
 if(!geo){const crowns:T.BufferGeometry[]=[],trunks:T.BufferGeometry[]=[],matrix=new T.Matrix4();
  const add=(list:T.BufferGeometry[],shape:T.BufferGeometry,color:string,x:number,y:number,z:number,sx:number,sy:number,sz:number)=>{matrix.compose(new T.Vector3(x,y,z),new T.Quaternion(),new T.Vector3(sx,sy,sz));list.push(colored(shape,color,matrix));};
  add(trunks,new T.CylinderGeometry(5,9,1,7),palette.bark,0,62,0,1,124,1);
  for(let k=0;k<4;k++){const a=k*2.4,branch=new T.CylinderGeometry(1.5,3,43,5);matrix.makeRotationZ(-.9);matrix.setPosition(Math.cos(a)*14,66+k*14,Math.sin(a)*14);trunks.push(colored(branch,palette.bark,matrix));}
  if(species==='birch'||species==='gold'){
   for(let i=0;i<15;i++){const a=i*2.399,r=i<3?12:25+random()*21;add(crowns,sphere,palette.foliage[i%4],Math.cos(a)*r,118+random()*58,Math.sin(a)*r,25+random()*16,27+random()*19,25+random()*16);}
   if(species==='birch')for(let y=14;y<100;y+=14)add(trunks,cube,'#545844',2,y,7,7,2,1);
  }else{
   for(let i=0;i<6;i++){const radius=57-i*8,cone=new T.ConeGeometry(radius,68-i*3,11,1);const p=cone.getAttribute('position');for(let j=0;j<p.count;j++)if(p.getY(j)<0)p.setY(j,p.getY(j)-random()*9);cone.computeVertexNormals();add(crowns,cone,palette.foliage[i%3+1],Math.sin(i*7)*3,67+i*23,Math.cos(i*6)*3,1,1,1);if(species==='snow')add(crowns,new T.ConeGeometry(radius*.78,50-i*2,11), '#d1dbce',0,77+i*23,0,1,1,1);}
  }
  geo={trunk:mergeGeometries(trunks)!,crown:mergeGeometries(crowns)!};geo.trunk.userData.shared=geo.crown.userData.shared=true;trunks.concat(crowns).forEach(g=>g.dispose());treeGeometries.set(key,geo);
 }
 const g=new T.Group(),trunk=new T.Mesh(geo.trunk,vertexMaterial),crown=new T.Mesh(geo.crown,vertexMaterial.clone());trunk.castShadow=crown.castShadow=true;trunk.receiveShadow=crown.receiveShadow=true;crown.name='crown';g.add(trunk,crown);g.scale.setScalar(e.size);return g;
}
export function axe(){const g=new T.Group();box(g,3,3,29,0,0,0,'#a48655');box(g,11,7,4,3,0,-13,'#a9b9b2');const blade=box(g,3,8,6,9,0,-13,'#d5dbcd');blade.rotation.z=-.12;return g;}
export function person(){
 const g=new T.Group();for(const x of [-5,5]){const leg=new T.Group();leg.position.set(x,17,0);leg.name=x<0?'legL':'legR';box(leg,6,14,6,0,-6,0,'#354a42');box(leg,7,5,10,0,-13,-2,'#333e34');g.add(leg);}
 box(g,17,19,10,0,27,0,'#b7a478');box(g,11,15,5,0,27,7,'#627766');box(g,7,7,3,0,26,10,'#8d9679');cyl(g,6.5,11,0,43,0,'#ceb18b');box(g,3,3,3,0,43,-7,'#ceb18b');cyl(g,11,2,0,50,0,'#ae9d70');cyl(g,7,5,0,52,0,'#b6a67e');box(g,7,1,7,0,50,-8,'#b6a67e');
 for(const x of [-11,11]){const arm=new T.Group();arm.name=x<0?'armL':'armR';arm.position.set(x,33,0);box(arm,5,13,5,0,-5,0,'#b7a478');ball(arm,0,-13,0,3,3,3,'#ceb18b');g.add(arm);}
 const tool=axe();tool.name='axe';tool.position.set(12,19,-10);g.add(tool);return g;
}
function truck(){
 const g=new T.Group();box(g,59,8,112,0,17,0,'#293c35');box(g,69,10,120,0,26,0,'#437c6c');
 // The bed is an actual recessed volume: floor, sides and tailgate are separate.
 box(g,58,3,57,0,33,33,'#496459');for(let x=-23;x<28;x+=9)box(g,2,1,52,x,35,32,'#789080');
 for(const x of [-33,33]){box(g,5,17,61,x,40,32,'#62947e');box(g,6,2,62,x,49,32,'#86a38a');}
 box(g,64,16,4,0,40,62,'#568973');box(g,18,2,2,0,43,65,'#afbaa3');
 box(g,65,23,33,0,36,-44,'#5b8e79');box(g,65,3,36,0,49,-44,'#79a08a');box(g,63,25,35,0,47,-9,'#63947d');
 box(g,56,21,2,0,59,-28,'#719c99');box(g,54,21,2,0,59,9,'#658b88');
 for(const x of [-31,31]){box(g,2,20,28,x,59,-9,'#729f9b');for(const z of [-27,8])box(g,4,26,4,x,59,z,'#72967e');box(g,2,1,9,x*1.06,39,-7,'#c2c7ab');box(g,8,5,4,x*1.2,51,-24,'#adc1ac');}
 box(g,68,4,43,0,73,-9,'#87a18a');box(g,70,5,7,0,20,-65,'#b6bba1');box(g,69,5,6,0,24,68,'#adb49b');
 box(g,29,11,2,0,34,-62,'#2c443c');for(let x=-12;x<15;x+=5)box(g,2,8,2,x,34,-64,'#a3b19b');
 for(const x of [-25,25]){box(g,12,9,3,x,38,-63,'#e7d59a');box(g,7,8,2,x,36,65,'#b96f4e');}
 for(const x of [-35,35])for(const z of [-41,41]){const wheel=new T.Group();wheel.name='wheel';const tire=cyl(wheel,14,10,0,0,0,'#28362f');tire.rotation.z=Math.PI/2;const hub=cyl(wheel,7,11,0,0,0,'#a4ac96');hub.rotation.z=Math.PI/2;wheel.position.set(x,14,z);g.add(wheel);}
 return g;
}
function mill(){
 const g=new T.Group();for(const x of [-90,80])for(const z of [-24,24])box(g,7,23,7,x,12,z,'#506a57');box(g,200,7,63,0,25,0,'#697e65');box(g,190,2,47,0,30,0,'#34493f');
 for(let x=-93;x<98;x+=13){const roller=cyl(g,4,46,x,34,0,'#a2ab8e');roller.rotation.x=Math.PI/2;roller.name='roller';}
 for(const z of [-31,31])box(g,207,6,4,0,35,z,'#b5b28b');
 box(g,58,43,6,13,54,-27,'#71876c');box(g,58,43,6,13,54,27,'#71876c');box(g,62,9,63,13,77,0,'#aab18b');
 const blade=new T.Mesh(new T.CylinderGeometry(23,23,2,24),material('#c3c5ac'));blade.rotation.x=Math.PI/2;blade.position.set(10,51,0);blade.name='blade';g.add(blade);
 box(g,29,24,26,20,39,46,'#49694f');cyl(g,6,4,32,54,49,'#b59b52');
 // Material and roller direction identify the feed, without floating signs.
 for(const z of [-23,23])box(g,22,.7,3,-86,38,z,'#d0be83');
 return g;
}
function structure(piece:Piece,w:number,h:number){const g=new T.Group();
 if(piece==='floor'){for(let z=-28;z<32;z+=8)box(g,w,4,7,0,2,z,'#aa8d5f');}
 if(piece==='wall'){for(let y=6;y<69;y+=10)box(g,w,9,h,0,y,0,y%20===6?'#a38454':'#b29361');for(const x of [-w/2+5,w/2-5])box(g,5,70,h+3,x,35,0,'#756447');}
 if(piece==='post')box(g,14,80,14,0,40,0,'#a78e61');
 if(piece==='lamp'){box(g,6,82,6,0,41,0,'#64775c');box(g,18,5,18,0,85,0,'#aaab81');box(g,13,16,13,0,75,0,'#e6d496');const glow=new T.PointLight('#ffd993',800,160,2);glow.position.y=78;g.add(glow);}
 if(piece==='conveyor'){box(g,96,12,40,0,6,0,'#566f59');for(let x=-43;x<48;x+=9){const r=cyl(g,3,34,x,14,0,'#a9b293');r.rotation.x=Math.PI/2;r.name='roller';}}
 return g;
}
export function entityModel(e:Entity):T.Group {
 if(e.kind==='tree')return tree(e);if(e.kind==='player')return person();if(e.kind==='truck')return truck();if(e.kind==='mill')return mill();if(e.kind==='structure')return structure(e.piece!,e.w,e.h);
 const g=new T.Group(),wood=WOODS[e.species??'pine'];
 if(e.kind==='log'){
  const log=cyl(g,e.h/2,e.w,0,e.h/2,0,wood.bark);log.rotation.z=Math.PI/2;
  for(const x of [-e.w/2-.1,e.w/2+.1]){const end=cyl(g,e.h*.45,.3,x,e.h/2,0,wood.heart);end.rotation.z=Math.PI/2;const ring=new T.Mesh(new T.RingGeometry(e.h*.27,e.h*.3,12),material('#a88152'));ring.rotation.y=Math.PI/2;ring.position.set(x>0?x+.2:x-.2,e.h/2,0);ring.material.side=T.DoubleSide;g.add(ring);}
  for(let z=-e.h*.32;z<e.h*.4;z+=e.h*.3)box(g,e.w-4,1,1,0,e.h*.91,z,'#98734d');
 }else if(e.kind==='plank'){box(g,e.w,7,e.h,0,3.5,0,wood.heart);for(const z of [-4,2])box(g,e.w-6,.2,.6,0,7.2,z,'#ae8856');}
 else if(e.kind==='box'){
  const w=e.w,h=29,d=e.h;box(g,w,h,d,0,h/2,0,'#b89e6a');box(g,w+1,3,d+1,0,h,0,'#c9b180');box(g,6,h+3,d+2,0,(h+3)/2,0,'#e0cca0');box(g,w+2,2,6,0,h+2,0,'#ded1a7');
  box(g,15,10,1,10,17,d/2+.6,PRODUCTS[e.product!]?.color??'#7e9072');if(e.paid)box(g,6,5,1,-10,8,d/2+1,'#588268');
 }else if(e.kind==='dynamite'){
  for(const z of [-5,0,5]){const stick=cyl(g,3,27,0,4,z,z===0?'#c27752':'#a75640');stick.rotation.z=Math.PI/2;}
  for(const x of [-7,7])box(g,3,8,17,x,4,0,'#bbaa75');const fuse=box(g,1,7,1,13,9,0,'#d9bf75');fuse.rotation.z=-.3;const ember=ball(g,15,13,0,2,2,2,'#ffe69a');ember.name='ember';ember.visible=false;
 }else if(e.kind==='tool'){const a=axe();a.rotation.x=Math.PI/2;a.position.y=5;g.add(a);}
 else if(e.kind==='rock'){const random=rng(e.seed);ball(g,0,e.h*.3,0,e.w*.62,e.h*.52,e.h*.53,'#798674');ball(g,-e.w*.2,e.h*.22,e.h*.22,e.w*.32,e.h*.31,e.h*.34,'#8d9680');g.rotation.y=random()*Math.PI;}
 else if(e.kind==='relic'){const torus=new T.Mesh(new T.TorusGeometry(11,4,5,12),material('#b4995e'));torus.rotation.x=Math.PI/2;torus.position.y=5;g.add(torus);for(let i=0;i<8;i++){const a=i*Math.PI/4;const tooth=box(g,7,7,7,Math.cos(a)*15,5,Math.sin(a)*15,'#b4995e');tooth.rotation.y=-a;}}
 return g;
}
export function disposeModel(g:T.Object3D){g.traverse(o=>{if(o instanceof T.Mesh){if(!o.geometry.userData.shared)o.geometry.dispose();if(o.name==='crown')(o.material as T.Material).dispose();}});}
