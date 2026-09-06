import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { WOODS, rng, type Entity } from '../model';
import { cube, sphere } from './primitives';

function colored(geometry:T.BufferGeometry,color:string,matrix:T.Matrix4){const g=geometry.index?geometry.toNonIndexed():geometry.clone();g.applyMatrix4(matrix);const c=new T.Color(color),a=new Float32Array(g.getAttribute('position').count*3);for(let i=0;i<a.length;i+=3)c.toArray(a,i);g.setAttribute('color',new T.BufferAttribute(a,3));return g;}
const treeGeometries=new Map<string,{trunk:T.BufferGeometry;crown:T.BufferGeometry}>();
const vertexMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:.97,flatShading:true});

export function treeModel(e:Entity){
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
