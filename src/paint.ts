import {LEGACY_WORLD as WORLD} from './world';
import { BUILD, BUYER, GATE, HARDWARE, LAND, ROAD, SECRET, SHOP, WOODS, PRODUCTS, ROOMS, STOCK, roomCounter, worldPoint, biome, clamp, dist, inLand, inRiver, riverX, rng, roadDistance, type Entity, type GameEvent, type Piece, type Vec } from './model';
import type { Simulation } from './simulation';
type Ctx=CanvasRenderingContext2D;
function ellipse(c:Ctx,x:number,y:number,rx:number,ry:number,color:string){c.fillStyle=color;c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,Math.PI*2);c.fill();}
function poly(c:Ctx,points:number[][],color:string){c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}
function line(c:Ctx,points:number[][],color:string,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}

export function makeGround(){
    const a=document.createElement('canvas');a.width=WORLD.w;a.height=WORLD.h;const c=a.getContext('2d')!;const r=rng(39273);
    c.fillStyle='#536b4a';c.fillRect(0,0,a.width,a.height);
    c.globalAlpha=.18;
    for(let i=0;i<10000;i++){const x=r()*a.width,y=r()*a.height;const b=biome({x,y});const colors=b==='snow'?['#b9c8bb','#cbd4c6','#a4b8ad']:b==='gold'?['#6e7247','#807444','#75784a']:b==='marsh'?['#3a5e51','#426656','#475b48']:['#5b7350','#4b6548','#627953','#536e4a'];ellipse(c,x,y,20+r()*85,15+r()*70,colors[Math.floor(r()*colors.length)]);}
    c.globalAlpha=1;
    // Snow line and old cliff apron.
    const snow=document.createElement('canvas');snow.width=2300;snow.height=1230;const sc=snow.getContext('2d')!,sy=sc.createLinearGradient(0,780,0,1230);sy.addColorStop(0,'#b9c8bd');sy.addColorStop(1,'#b9c8bd00');sc.fillStyle=sy;sc.fillRect(0,0,2300,1230);sc.globalCompositeOperation='destination-in';const sx=sc.createLinearGradient(0,0,400,0);sx.addColorStop(0,'#0000');sx.addColorStop(1,'#000');sc.fillStyle=sx;sc.fillRect(0,0,2300,1230);c.drawImage(snow,2300,0);
    for(let i=0;i<2000;i++){const x=2500+r()*2100,y=r()*1040;c.globalAlpha=clamp((x-2500)/180,0,1)*clamp((1110-y)/250,0,1);ellipse(c,x,y,r()*28+2,r()*12+2,['#c6d1c3','#b3c1b7','#d0d7c8'][i%3]);}
    c.globalAlpha=1;for(let i=0;i<35000;i++){const x=r()*a.width,y=r()*a.height;const b=biome({x,y});c.fillStyle=b==='snow'?(r()>.5?'#ffffff22':'#748f821d'):r()>.5?'#c6ce7a26':'#173e3529';c.fillRect(x,y,r()*3+1,r()*4+1);}
    // Worn ground in the settlement and on the owned lot.
    for(const [x,y,w,h]of [[LAND.x,LAND.y,LAND.w,LAND.h],[530,1810,340,370],[3070,2530,350,190]]){c.fillStyle='#8c8a66';c.fillRect(x,y,w,h);for(let i=0;i<1600;i++){c.fillStyle=r()>.5?'#b9ad7c35':'#595f442b';c.fillRect(x+r()*w,y+r()*h,2+r()*4,1+r()*2);}}
    for(const road of ROAD){const pts=road.map(p=>[p.x,p.y]);c.lineJoin='round';c.lineCap='round';line(c,pts,'#4b6048',144);line(c,pts,'#8d8967',124);line(c,pts,'#a49a74',94);line(c,pts,'#b0a17c',48);for(let i=1;i<road.length;i++){const p=road[i-1],q=road[i];const d=dist(p,q);const nx=-(q.y-p.y)/d,ny=(q.x-p.x)/d;for(const v of [-28,28])line(c,[[p.x+nx*v,p.y+ny*v],[q.x+nx*v,q.y+ny*v]],'#7b78564a',8);}}
    // River: dark center, pale stones, reeds and transparent shallows.
    const points=[];for(let y=-50;y<WORLD.h+100;y+=20)points.push([riverX(y),y]);line(c,points,'#7b8165',216);line(c,points,'#879580',190);line(c,points,'#476e67',168);line(c,points,'#315b57',136);line(c,points,'#2d5553',95);
    for(let i=0;i<750;i++){const y=r()*WORLD.h,x=riverX(y)+(r()>.5?1:-1)*(85+r()*26);ellipse(c,x,y,3+r()*7,3+r()*6,['#858f76','#a4a48a','#687967'][i%3]);}
    // Crossing follows the road, so vehicles can cross without collision tricks.
    c.save();c.translate(2420,2290);c.rotate(-.31);c.fillStyle='#3c493d';c.fillRect(-150,-76,300,155);c.fillStyle='#776c50';c.fillRect(-151,-64,302,128);for(let x=-148;x<151;x+=14){c.fillStyle=(Math.round(x)%3===0)?'#a08a63':'#8f7d5d';c.fillRect(x,-65,12,130);line(c,[[x+2,-60],[x+2,60]],'#b09b6c55');}c.fillStyle='#c2ad79';c.fillRect(-165,-76,330,8);c.fillRect(-165,68,330,8);c.restore();
    // An open gravel yard makes delivered timber readable from every approach.
    c.fillStyle='#8b8d76';c.fillRect(BUYER.x-245,BUYER.y-190,490,460);
    line(c,[[BUYER.x,BUYER.y],[930,2010]],'#a39877',100);
    for(let i=0;i<5000;i++){const x=BUYER.x-245+r()*490,y=BUYER.y-190+r()*460;c.fillStyle=i%2?'#d2c7a144':'#454f402b';c.fillRect(x,y,2+r()*3,1+r()*2);}
    for(let i=0;i<1800;i++){const p={x:r()*WORLD.w,y:r()*WORLD.h};if(inRiver(p)||roadDistance(p)<90||inLand(p))continue;const b=biome(p);if(b==='snow')continue;for(let j=0;j<3;j++)line(c,[[p.x+j*3,p.y],[p.x+j*3+(r()-.5)*9,p.y-5-r()*7]],'#96a66a65',1);if(i%8===0)ellipse(c,p.x,p.y-5,1.8,1.8,'#d4c893');}
    c.globalCompositeOperation='destination-in';for(const axis of ['x','y']){const max=axis==='x'?a.width:a.height,g=c.createLinearGradient(axis==='x'?max-420:0,axis==='y'?max-420:0,axis==='x'?max:0,axis==='y'?max:0);g.addColorStop(0,'#000');g.addColorStop(1,'#0000');c.fillStyle=g;c.fillRect(0,0,a.width,a.height);}c.globalCompositeOperation='source-over';
    return a;
  }

