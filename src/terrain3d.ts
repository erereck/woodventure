import * as T from 'three';
import {CHUNK,WORLD,LEGACY_WORLD,LANDMARKS,PASSAGES,PLATEAUS,ROAD,groundColor,regionAt,heightAt,roadDistance,riverX,hash,passageOpen,type Point} from './world';
import {box,cyl,material} from './models3d';
import {lettering} from './lettering3d';

export class TerrainView {
 readonly root=new T.Group();readonly surfaces:T.Mesh[]=[];
 private chunks=new Map<string,T.Mesh>();private fixtures=new Map<string,T.Group>();private key='';
 private groundMaterial:T.MeshStandardMaterial;
 private roadMaterial(){const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;const c=canvas.getContext('2d')!;c.fillStyle='#b1a27c';c.fillRect(0,0,256,128);for(const y of [32,96]){c.fillStyle='#80795744';c.fillRect(0,y-5,256,10);c.fillStyle='#c7b98e55';c.fillRect(0,y-7,256,2);}for(let i=0;i<5000;i++){c.fillStyle=i%2?'#e5cf9d44':'#686c492d';c.fillRect(hash(i,5)*256,hash(i,6)*128,1+hash(i,7)*2,1);}c.globalCompositeOperation='destination-in';const fade=c.createLinearGradient(0,0,0,128);for(const [at,color] of [[0,'#0000'],[.12,'#000'],[.88,'#000'],[1,'#0000']] as const)fade.addColorStop(at,color);c.fillStyle=fade;c.fillRect(0,0,256,128);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=T.RepeatWrapping;texture.anisotropy=4;return new T.MeshStandardMaterial({map:texture,transparent:true,roughness:1,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});}
 constructor(){
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const c=canvas.getContext('2d')!;c.fillStyle='#f0eee5';c.fillRect(0,0,128,128);for(let i=0;i<1600;i++){c.fillStyle=i%2?'#b9bea55c':'#ffffff66';c.fillRect(hash(i,2)*128,hash(i,3)*128,1,1+hash(i,4)*2);}const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;
  this.groundMaterial=new T.MeshStandardMaterial({vertexColors:true,map:texture,roughness:1});
  this.roads();
  for(const p of PASSAGES){if(p.id==='old-bridge')continue;const g=new T.Group();g.position.set(p.x,heightAt(p),p.y);g.userData.passage=p;this.fixtures.set(p.id,g);this.root.add(g);this.passage(g,false);}
  for(const l of LANDMARKS){if(l.kind!=='camp'&&l.kind!=='lookout')continue;const g=new T.Group();g.position.set(l.x,heightAt(l),l.y);box(g,138,5,108,0,2,0,'#9c8d66');for(let z=-46;z<54;z+=12)box(g,136,1,10,0,5,z,'#b3a079');
   if(l.kind==='camp'){for(const x of [-57,57])for(const z of [-39,39])box(g,6,71,6,x,36,z,'#7b7658');box(g,155,6,126,0,74,0,'#6a8062');box(g,75,12,18,0,13,-30,'#8d7952');box(g,5,41,5,-42,21,-32,'#8d7952');box(g,5,41,5,42,21,-32,'#8d7952');}
   else {for(const z of [-51,51]){box(g,138,4,4,0,40,z,'#a69570');for(const x of [-65,65])box(g,5,40,5,x,22,z,'#8b8063');}const scope=cyl(g,5,42,0,30,0,'#677c6c');scope.rotation.z=.3;}
   this.root.add(g);
  }
 }
 private roads(){const vertices:number[]=[],indices:number[]=[],uvs:number[]=[];for(const road of ROAD)for(let k=1;k<road.length;k++){const a=road[k-1],b=road[k],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),nx=-dy/length*58,ny=dx/length*58,n=Math.ceil(length/25);for(let i=0;i<n;i++){const p={x:a.x+dx*i/n,y:a.y+dy*i/n},q={x:a.x+dx*(i+1)/n,y:a.y+dy*(i+1)/n};if(p.x<LEGACY_WORLD.w&&p.y<LEGACY_WORLD.h)continue;if(Math.abs(p.x-riverX(p.y))<85)continue;const index=vertices.length/3;for(const v of [{x:p.x+nx,y:p.y+ny},{x:p.x-nx,y:p.y-ny},{x:q.x+nx,y:q.y+ny},{x:q.x-nx,y:q.y-ny}])vertices.push(v.x,heightAt(v)+.5,v.y);uvs.push(i/n*length/256,0,i/n*length/256,1,(i+1)/n*length/256,0,(i+1)/n*length/256,1);indices.push(index,index+2,index+1,index+1,index+2,index+3);}}const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();const road=new T.Mesh(geometry,this.roadMaterial());road.receiveShadow=true;this.root.add(road);}
 private passage(g:T.Group,open:boolean){g.clear();const p=g.userData.passage;g.userData.open=open;
  if(p.kind==='rockfall'){if(!open)for(let i=0;i<7;i++){const rock=new T.Mesh(new T.DodecahedronGeometry(1,0),material(i%2?'#879587':'#6e8177'));rock.position.set((i-3)*47,35+hash(i,2)*20,(i%2)*30);rock.scale.set(42,55,65);rock.castShadow=true;g.add(rock);}return;}
  const elevated=p.id==='amber-crossing';g.rotation.set(0,elevated?.644:0,elevated?.15:0);
  for(const z of [-65,65]){box(g,320,8,8,0,4,z,'#796e52');for(const x of [-150,150])box(g,9,44,9,x,20,z,'#8a7b58');box(g,325,5,5,0,43,z,'#afa17b');}
  for(let x=-150;x<160;x+=16)if(open||Math.abs(x)>110)box(g,14,5,128,x,10,0,'#aa976e');
  if(!open){for(const x of [-180,180]){const beam=box(g,7,35,130,x,25,0,'#a78c58');beam.rotation.z=.1;}}
 }
 private tile(cx:number,cy:number){const size=CHUNK,segments=24,geo=new T.PlaneGeometry(size,size,segments,segments);geo.rotateX(-Math.PI/2);geo.translate((cx+.5)*size,0,(cy+.5)*size);const positions=geo.getAttribute('position'),colors=new Float32Array(positions.count*3);const color=new T.Color();for(let i=0;i<positions.count;i++){const x=positions.getX(i),y=positions.getZ(i),p={x,y},h=heightAt(p),r=regionAt(p);positions.setY(i,h);const rgb=groundColor(p);color.setRGB(rgb[0]/255,rgb[1]/255,rgb[2]/255,T.SRGBColorSpace);color.multiplyScalar(.91+hash(Math.floor(x/24),Math.floor(y/24))*.15);if(roadDistance(p)<65)color.set('#ac9d79');if(Math.abs(x-riverX(y))<80)color.set('#466e65');if(Math.abs(heightAt({x:x+33,y})-heightAt({x:x-33,y}))>90||Math.abs(heightAt({x,y:y+33})-heightAt({x,y:y-33}))>90)color.set(h>450?'#9eaea6':'#7d8a7b');color.toArray(colors,i*3);}geo.setAttribute('color',new T.BufferAttribute(colors,3));const uv=geo.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*6,uv.getY(i)*6);geo.computeVertexNormals();geo.computeBoundingSphere();const mesh=new T.Mesh(geo,this.groundMaterial);mesh.receiveShadow=true;return mesh;}
 update(focus:Point,unlocks:ReadonlySet<string>,radius=2){const cx=Math.floor(focus.x/CHUNK),cy=Math.floor(focus.y/CHUNK),key=cx+','+cy+','+radius;
  if(key!==this.key){this.key=key;const wanted=new Set<string>();for(let x=cx-radius;x<=cx+radius;x++)for(let y=cy-radius;y<=cy+radius;y++){if(x<0||y<0||x*CHUNK>=WORLD.w||y*CHUNK>=WORLD.h)continue;const id=x+','+y;wanted.add(id);if(!this.chunks.has(id)){const mesh=this.tile(x,y);this.chunks.set(id,mesh);this.root.add(mesh);}}
   for(const [id,mesh] of this.chunks)if(!wanted.has(id)){mesh.geometry.dispose();this.root.remove(mesh);this.chunks.delete(id);}this.surfaces.splice(0,this.surfaces.length,...this.chunks.values());
  }
  for(const [id,g] of this.fixtures){const p=g.userData.passage,open=passageOpen(p,unlocks);if(g.userData.open!==open)this.passage(g,open);g.visible=Math.hypot(p.x-focus.x,p.y-focus.y)<3500;}
 }
}
