import * as T from 'three';
import type { Piece } from '../model';
import { ball, box, cyl, material } from './primitives';

export function axe(){const g=new T.Group();box(g,3,3,29,0,0,0,'#a48655');box(g,11,7,4,3,0,-13,'#a9b9b2');const blade=box(g,3,8,6,9,0,-13,'#d5dbcd');blade.rotation.z=-.12;return g;}
export function person(){
 const g=new T.Group();for(const x of [-5,5]){const leg=new T.Group();leg.position.set(x,17,0);leg.name=x<0?'legL':'legR';box(leg,6,14,6,0,-6,0,'#354a42');box(leg,7,5,10,0,-13,-2,'#333e34');g.add(leg);}
 box(g,17,19,10,0,27,0,'#b7a478');box(g,11,15,5,0,27,7,'#627766');box(g,7,7,3,0,26,10,'#8d9679');cyl(g,6.5,11,0,43,0,'#ceb18b');box(g,3,3,3,0,43,-7,'#ceb18b');cyl(g,11,2,0,50,0,'#ae9d70');cyl(g,7,5,0,52,0,'#b6a67e');box(g,7,1,7,0,50,-8,'#b6a67e');
 for(const x of [-11,11]){const arm=new T.Group();arm.name=x<0?'armL':'armR';arm.position.set(x,33,0);box(arm,5,13,5,0,-5,0,'#b7a478');ball(arm,0,-13,0,3,3,3,'#ceb18b');g.add(arm);}
 const tool=axe();tool.name='axe';tool.position.set(12,19,-10);g.add(tool);return g;
}
export function truck(){
 const g=new T.Group();box(g,59,8,112,0,17,0,'#293c35');box(g,69,10,120,0,26,0,'#437c6c');
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
export function mill(){
 const g=new T.Group();for(const x of [-90,80])for(const z of [-24,24])box(g,7,23,7,x,12,z,'#506a57');box(g,200,7,63,0,25,0,'#697e65');box(g,190,2,47,0,30,0,'#34493f');
 for(let x=-93;x<98;x+=13){const roller=cyl(g,4,46,x,34,0,'#a2ab8e');roller.rotation.x=Math.PI/2;roller.name='roller';}
 for(const z of [-31,31])box(g,207,6,4,0,35,z,'#b5b28b');
 box(g,58,43,6,13,54,-27,'#71876c');box(g,58,43,6,13,54,27,'#71876c');box(g,62,9,63,13,77,0,'#aab18b');
 const blade=new T.Mesh(new T.CylinderGeometry(23,23,2,24),material('#c3c5ac'));blade.rotation.x=Math.PI/2;blade.position.set(10,51,0);blade.name='blade';g.add(blade);
 box(g,29,24,26,20,39,46,'#49694f');cyl(g,6,4,32,54,49,'#b59b52');
 for(const z of [-23,23])box(g,22,.7,3,-86,38,z,'#d0be83');
 return g;
}
export function structure(piece:Piece,w:number,h:number){const g=new T.Group();
 if(piece==='floor'){for(let z=-28;z<32;z+=8)box(g,w,4,7,0,2,z,'#aa8d5f');}
 if(piece==='wall'){for(let y=6;y<69;y+=10)box(g,w,9,h,0,y,0,y%20===6?'#a38454':'#b29361');for(const x of [-w/2+5,w/2-5])box(g,5,70,h+3,x,35,0,'#756447');}
 if(piece==='post')box(g,14,80,14,0,40,0,'#a78e61');
 if(piece==='lamp'){box(g,6,82,6,0,41,0,'#64775c');box(g,18,5,18,0,85,0,'#aaab81');box(g,13,16,13,0,75,0,'#e6d496');const glow=new T.PointLight('#ffd993',800,160,2);glow.position.y=78;g.add(glow);}
 if(piece==='conveyor'){box(g,96,12,40,0,6,0,'#566f59');for(let x=-43;x<48;x+=9){const r=cyl(g,3,34,x,14,0,'#a9b293');r.rotation.x=Math.PI/2;r.name='roller';}}
 return g;
}
