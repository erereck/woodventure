import {LEGACY_WORLD as WORLD} from './world';
import * as T from 'three';
import { box,cyl,material,person } from './models3d';
import { lettering } from './lettering3d';
import { makeGround } from './paint';
import { LAND,BUYER,SHOP,HARDWARE,SECRET,ROOMS,STOCK,PRODUCTS,riverX,rng,type ShopId } from './model';

function groundPlane(w:number,h:number,texture:T.Texture){const mesh=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map:texture,roughness:1}));mesh.rotation.x=-Math.PI/2;mesh.receiveShadow=true;return mesh;}
function sign(g:T.Group,x:number,z:number,title:string,w=130){for(const sx of [-w*.34,w*.34])box(g,4,48,4,x+sx,24,z,'#796949');box(g,w,28,5,x,45,z,'#76694e');const text=lettering(title,w-12,12,'#e5d4a8');text.position.set(x,45,z+2.7);g.add(text);}
function building(g:T.Group,x:number,z:number,east=false){const b=new T.Group();b.position.set(x,0,z-65);g.add(b);
 box(b,202,9,108,0,4,0,'#7b7c64');box(b,190,84,90,0,48,0,'#58725a');for(let xx=-90;xx<=90;xx+=15){box(b,2,81,2,xx,48,46,'#7b8768');box(b,2,81,2,xx,48,-46,'#7b8768');}
 box(b,35,59,3,0,33,47,'#304f40');box(b,3,60,3,-20,33,48,'#acac80');box(b,3,60,3,20,33,48,'#acac80');box(b,44,4,5,0,64,48,'#adad82');
 for(const xx of [-62,62]){box(b,35,33,4,xx,49,48,'#b3b78a');box(b,29,27,2,xx,49,51,'#698f82');box(b,2,29,2,xx,49,53,'#b3b78a');box(b,31,2,2,xx,49,53,'#b3b78a');}
 for(const side of [-1,1]){const roof=box(b,116,7,115,side*51,103,0,'#4a6353');roof.rotation.z=-side*.3;for(let xx=0;xx<110;xx+=12){const rib=box(b,2,3,116,side*(xx*.89+4),119-xx*.28,0,'#73816a');rib.rotation.z=-side*.3;}}
 box(b,225,5,52,0,69,68,'#849074');for(const xx of [-105,105])box(b,5,69,5,xx,34,87,'#998762');
 box(b,26,54,25,65,125,-14,'#8d8063');const lantern=new T.PointLight('#ffdda1',1900,190,2);lantern.position.set(0,56,67);b.add(lantern);
}
export function outdoors(){const g=new T.Group();const texture=new T.CanvasTexture(makeGround());texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;const terrain=groundPlane(WORLD.w,WORLD.h,texture);(terrain.material as T.MeshStandardMaterial).transparent=true;terrain.position.set(WORLD.w/2,.08,WORLD.h/2);g.add(terrain);
 // The painted terrain stays flat. Only edges, rails and meaningful surfaces gain volume.
 for(const x of [LAND.x,LAND.x+LAND.w])for(const z of [LAND.y,LAND.y+LAND.h]){box(g,6,25,6,x,12,z,'#86734d');box(g,8,6,8,x,25,z,'#dbcca0');}
 sign(g,LAND.x+60,LAND.y+LAND.h,'LOTE 04',107);sign(g,1860,2370,'PONTE VELHA →',165);
 building(g,SHOP.x,SHOP.y);building(g,HARDWARE.x,HARDWARE.y,true);
 const socket=new T.Group();socket.position.set(3507,0,SECRET.y);box(socket,28,58,31,0,29,0,'#8d9782');const ring=new T.Mesh(new T.TorusGeometry(13,4,5,12),material('#b59d66'));ring.position.set(-16,34,0);ring.rotation.y=Math.PI/2;socket.add(ring);const hole=cyl(socket,10,1,-16.2,34,0,'#344e41');hole.rotation.z=Math.PI/2;g.add(socket);
 const scale=new T.Group();scale.position.set(BUYER.x,0,BUYER.y);box(scale,190,2,160,0,.3,0,'#758571');for(let x=-85;x<95;x+=14)box(scale,2,.5,146,x,1.5,0,'#a6af91');for(const x of [-94,94])box(scale,2,1,160,x,2,0,'#d1bd79');for(const z of [-79,79])box(scale,190,1,2,0,2,z,'#d1bd79');const plaque=new T.Group();box(plaque,172,25,1.8,0,0,0,'#506451');const caption=lettering('BALANÇA · MADEIRA',156,11,'#dfd2a5');caption.position.z=1.05;plaque.add(caption);plaque.position.set(0,1,101);plaque.rotation.x=-Math.PI/2;scale.add(plaque);g.add(scale);
 const bridge=new T.Group();bridge.position.set(2420,0,2290);bridge.rotation.y=.31;box(bridge,302,7,128,0,0,0,'#75694d');for(let x=-145;x<151;x+=14)box(bridge,12,3,130,x,5,0,'#a18c62');for(const z of [-73,73]){for(let x=-145;x<160;x+=60)box(bridge,7,36,7,x,18,z,'#8f7d58');box(bridge,324,5,5,0,35,z,'#b5a174');box(bridge,324,4,4,0,19,z,'#9b8960');}g.add(bridge);
 const stones=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),material('#99a18a'),420);const random=rng(414),dummy=new T.Object3D();for(let i=0;i<420;i++){const z=random()*WORLD.h,x=riverX(z)+(i%2?1:-1)*(85+random()*22);dummy.position.set(x,1,z);dummy.scale.set(2+random()*5,2+random()*4,2+random()*5);dummy.rotation.y=random()*6;dummy.updateMatrix();stones.setMatrixAt(i,dummy.matrix);}stones.receiveShadow=true;g.add(stones);
 return g;
}
export function interior(id:ShopId){const g=new T.Group(),o=ROOMS[id];g.position.set(o.x,0,o.y);
 const canvas=document.createElement('canvas');canvas.width=800;canvas.height=600;const c=canvas.getContext('2d')!;c.fillStyle='#827552';c.fillRect(0,0,800,600);const r=rng(21);for(let y=0;y<600;y+=26)for(let x=-100;x<900;x+=100){const bx=x+(y/26%2)*50;c.fillStyle=r()>.4?'#a58f64':'#99845a';c.fillRect(bx,y,98,24);c.fillStyle='#c7b08144';c.fillRect(bx+5,y+6,83,1);}
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const floor=groundPlane(800,600,texture);floor.position.y=.2;g.add(floor);
 box(g,810,110,14,0,55,-295,'#52755d');box(g,815,6,20,0,113,-295,'#b4ab7e');for(const x of [-396,396]){box(g,9,112,13,x,56,-295,'#a08e65');box(g,12,24,590,x,12,0,'#6d795b');box(g,14,3,593,x,26,0,'#a8976f');}
 for(const x of [-327,324]){box(g,64,67,3,x,68,-286,'#c1b68a');box(g,56,59,2,x,68,-283,'#9cbba2');box(g,3,61,3,x,68,-281,'#c8bd90');box(g,60,3,3,x,68,-281,'#c8bd90');}
 STOCK[id].forEach((p,slot)=>{const x=-290+slot%3*225,z=-170+Math.floor(slot/3)*130;for(const sx of [-47,47])box(g,6,13,35,x+sx,6,z,'#716344');box(g,112,5,53,x,14,z,'#b39a6b');const plaque=new T.Group();box(plaque,168,34,2.5,0,0,0,'#c2b18a');const name=lettering(PRODUCTS[p].name.toUpperCase(),151,10,'#304938');name.position.set(0,7,1.4);plaque.add(name);const price=lettering('$ '+PRODUCTS[p].price,90,11,'#405540');price.position.set(0,-8,1.4);plaque.add(price);for(const px of [-79,79]){const screw=cyl(plaque,1,1,px,0,1.6,'#777d64');screw.rotation.x=Math.PI/2;}plaque.position.set(x,18,z+40);plaque.rotation.x=-Math.PI*.3;g.add(plaque);});
 box(g,190,34,55,190,17,45,'#577459');box(g,202,5,64,190,36,45,'#b59c6a');box(g,178,3,3,190,9,74,'#a99a71');const cashier=lettering('CAIXA',65,10,'#e4d5aa');cashier.position.set(171,22,72.8);g.add(cashier);
 box(g,30,22,23,270,49,42,'#344f40');box(g,24,9,1,270,53,54,'#bfc9a1');box(g,39,3,29,270,39,49,'#86977a');const vendor=person();vendor.position.set(160,0,-10);vendor.rotation.y=Math.PI;vendor.getObjectByName('axe')!.visible=false;g.add(vendor);
 const mat=box(g,124,.5,53,0,1,253,'#748c67');mat.castShadow=false;
 const light=new T.PointLight('#ffe1a6',15000,850,2);light.position.set(-130,180,20);g.add(light);return g;
}

