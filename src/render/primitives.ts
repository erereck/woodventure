import * as T from 'three';

const materials=new Map<string,T.MeshStandardMaterial>();
export function material(color:string){let m=materials.get(color);if(!m){m=new T.MeshStandardMaterial({color,roughness:.88,metalness:.02,flatShading:true});materials.set(color,m);}return m;}
export const cube=new T.BoxGeometry(1,1,1),sphere=new T.IcosahedronGeometry(1,1),cylinder=new T.CylinderGeometry(1,1,1,10);
for(const geometry of [cube,sphere,cylinder])geometry.userData.shared=true;
export function box(g:T.Object3D,w:number,h:number,d:number,x:number,y:number,z:number,color:string){const m=new T.Mesh(cube,material(color));m.scale.set(w,h,d);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
export function cyl(g:T.Object3D,r:number,h:number,x:number,y:number,z:number,color:string){const m=new T.Mesh(cylinder,material(color));m.scale.set(r,h,r);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
export function ball(g:T.Object3D,x:number,y:number,z:number,sx:number,sy:number,sz:number,color:string){const m=new T.Mesh(sphere,material(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
