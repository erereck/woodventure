import { Atlas } from './atlas';
import { regionAt, heightAt } from './world';
import './style.css';
import { Simulation } from './simulation';
import { LocalTransport } from './transport';
import { Renderer } from './renderer';
import { Soundscape } from './audio';
import { HARDWARE, SHOP, WOODS, PRODUCTS, roomCounter, roomDoor, biome, dist, inLand, type Piece } from './model';
import { icon, mountUi } from './app/ui-template';

mountUi();

const $=<T extends HTMLElement=HTMLElement>(s:string)=>document.querySelector<T>(s)!;
const sim=new Simulation();const transport=new LocalTransport(e=>sim.receive(e),()=>sim.tick);
const renderer=new Renderer($('#world'),sim);const audio=new Soundscape();
const SAVE='entre-pinheiros.world.v3',BACKUP='entre-pinheiros.world.previous';let hasSave=false;
try{const raw=localStorage.getItem(SAVE)??localStorage.getItem('entre-pinheiros.world.v2')??localStorage.getItem('entre-pinheiros.world.v1');if(raw){sim.restore(JSON.parse(raw));hasSave=true;$('#begin').innerHTML=`Voltar ao vale ${icon('arrow')}`;$('#new-intro').hidden=false;}$('#previous-world').toggleAttribute('disabled',!localStorage.getItem(BACKUP));}catch(error){console.warn('Não foi possível restaurar o mundo salvo.',error);}
let started=false,tool=0,piece:Piece='floor',paused=false,photo=false,toastUntil=0,lastSave=0,lastHud=0;
const keys=new Set<string>();const pointer={x:innerWidth/2,y:innerHeight/2,down:false,right:false};let clock=performance.now(),accumulator=0;
function toast(message:string){$('#toast').textContent=message;$('#toast').classList.add('show');toastUntil=performance.now()+3700;}
function resetInput(){keys.clear();pointer.down=false;pointer.right=false;transport.send({type:'move',x:0,y:0});transport.send({type:'release'});}
function openDialog(id:string){resetInput();document.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach(d=>d.close());const dialog=$<HTMLDialogElement>(id);dialog.setAttribute('aria-label',dialog.querySelector('h2')?.textContent??'Menu');dialog.showModal();paused=true;}
document.querySelectorAll<HTMLDialogElement>('dialog').forEach(d=>{d.querySelector('.close')!.addEventListener('click',()=>d.close());d.addEventListener('close',()=>{paused=!!document.querySelector('dialog[open]');resetInput();});d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if((e as MouseEvent).clientX<r.left||(e as MouseEvent).clientX>r.right||(e as MouseEvent).clientY<r.top||(e as MouseEvent).clientY>r.bottom)d.close();}});});
function save(silent=false){try{localStorage.setItem(SAVE,JSON.stringify(sim.capture()));$('#save-state').textContent='MUNDO SALVO';lastSave=sim.elapsed;if(!silent)toast('Seu mundo foi salvo.');return true;}catch{if(!silent)toast('Não foi possível salvar aqui. Baixe uma cópia pelo menu.');$('#save-state').textContent='SALVAMENTO INDISPONÍVEL';return false;}}
$('#begin').onclick=async()=>{started=true;renderer.title=false;$('#intro').hidden=true;$('#hud').hidden=false;renderer.camera={...sim.position};if(!hasSave)toast('W A S D para caminhar. H abre os controles.');try{await audio.start();}catch{toast('O som não pôde iniciar. O vale continua disponível.');}};
$('#intro-guide').onclick=()=>openDialog('#help-dialog');$('#pause').onclick=()=>openDialog('#pause-dialog');$('#resume').onclick=()=>$<HTMLDialogElement>('#pause-dialog').close();$('#save').onclick=()=>{save();$<HTMLDialogElement>('#pause-dialog').close();};
$('#help-button').onclick=$('#guide-menu').onclick=()=>openDialog('#help-dialog');
const atlas=new Atlas($('#map-canvas'),$<HTMLDialogElement>('#map-dialog'),sim);
function map(){openDialog('#map-dialog');atlas.open();}$('#map-button').onclick=map;$('#camera-button').onclick=()=>renderer.rotateCamera();
$('#sound').onclick=()=>{audio.toggle();$('#sound').textContent=`Som ambiente · ${audio.enabled?'ligado':'desligado'}`;};
$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('Use F11 para tela cheia neste navegador.');}};
$('#export').onclick=()=>{const blob=new Blob([JSON.stringify(sim.capture())],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='woodventure-mundo.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);};
$('#import').onclick=()=>$<HTMLInputElement>('#import-file').click();
$<HTMLInputElement>('#import-file').onchange=async e=>{const input=e.target as HTMLInputElement;const f=input.files?.[0];if(!f)return;try{if(f.size>6e6)throw new Error('Arquivo muito grande.');sim.restore(JSON.parse(await f.text()));renderer.camera={...sim.position};save(true);$<HTMLDialogElement>('#pause-dialog').close();toast('O mundo foi carregado.');}catch(error){alert(error instanceof Error?error.message:'Arquivo inválido.');}input.value='';};
function setTool(n:number){renderer.package=undefined;tool=n;renderer.build=tool===2?piece:null;$('#build-menu').hidden=tool!==2;document.querySelectorAll<HTMLElement>('[data-tool]').forEach(b=>b.classList.toggle('active',Number(b.dataset.tool)===n));if(n!==1)transport.send({type:'release'});}
document.querySelectorAll<HTMLElement>('[data-tool]').forEach(b=>b.onclick=()=>setTool(Number(b.dataset.tool)));
document.querySelectorAll<HTMLElement>('[data-piece]').forEach(b=>b.onclick=()=>{piece=b.dataset.piece as Piece;renderer.build=piece;document.querySelectorAll<HTMLElement>('[data-piece]').forEach(x=>x.classList.toggle('active',x===b));});
function photoMode(){photo=!photo;renderer.photo=photo;$('#hud').hidden=photo;$('#photo-hint').hidden=!photo;renderer.build=photo?null:tool===2?piece:null;}$('#photo-button').onclick=photoMode;
function interact(){transport.send({type:'interact'});}
function openObject(){
  const e=(sim.held?sim.entities.get(sim.held):undefined)??candidate(['box','tool','mill'],85)??sim.closest(sim.position,['box','tool','mill'],120);
  if(!e)return;
  if(e.paid!==false&&(e.kind==='mill'||e.kind==='box'&&['truck','mill'].includes(e.product!))){
    if(sim.interior||!inLand(e.body.position)||dist(sim.position,e.body.position)>145){toast('Leve a caixa até seu terreno antes de abrir.');return;}
    transport.send({type:'release'});renderer.package=e;renderer.build=null;$('#build-menu').hidden=true;renderer.buildAngle=e.kind==='mill'?e.body.angle:0;
  }else transport.send({type:'open',target:e.id});
}
function freshWorld(){
  try{localStorage.setItem(BACKUP,JSON.stringify(sim.capture()));}catch{toast('Não foi possível guardar o mundo atual. Baixe uma cópia antes.');return;}
  sim.restore(new Simulation().capture());renderer.camera={...sim.position};renderer.package=undefined;renderer.build=null;setTool(0);save(true);hasSave=false;$('#previous-world').removeAttribute('disabled');
  document.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach(d=>d.close());if(!started)$('#begin').click();else toast('Um terreno vazio. Um machado gasto.');
}
$('#new-intro').onclick=$('#new-world').onclick=freshWorld;
$('#previous-world').onclick=()=>{try{const raw=localStorage.getItem(BACKUP);if(!raw)return;const current=sim.capture();sim.restore(JSON.parse(raw));localStorage.setItem(BACKUP,JSON.stringify(current));renderer.camera={...sim.position};save(true);$<HTMLDialogElement>('#pause-dialog').close();toast('Mundo anterior restaurado.');}catch{toast('Não foi possível recuperar o mundo anterior.');}};
function worldPointer(){return renderer.screenToWorld(pointer.x,pointer.y);}
function candidate(kinds:Parameters<Simulation['closest']>[1],range=50){return renderer.pickEntity(pointer.x,pointer.y,kinds)??sim.closest(worldPointer(),kinds,range);}
function act(){const wp=worldPointer();transport.send({type:'aim',...wp});if(renderer.package){transport.send({type:'deploy',target:renderer.package.id,x:renderer.ghost.x,y:renderer.ghost.y,angle:renderer.buildAngle});return;}if(tool===0){const e=candidate(['tree','log'],80)??sim.closest(sim.position,['tree'],92);if(e)transport.send({type:'chop',target:e.id});}
  else if(tool===1){if(sim.held)transport.send({type:'release'});else{const e=candidate(['log','plank','relic','box','tool','dynamite'],50);if(e)transport.send({type:'grab',target:e.id});}}
  else if(tool===2)transport.send({type:'build',piece,x:renderer.ghost.x,y:renderer.ghost.y,angle:renderer.buildAngle});
  else if(tool===3){const e=candidate(['dynamite'],55)??sim.closest(sim.position,['dynamite'],100);if(e)transport.send({type:'ignite',target:e.id});else toast('Aproxime-se de uma dinamite para acender o pavio.');}}
window.addEventListener('keydown',e=>{
  if(e.target instanceof HTMLInputElement)return;
  const k=e.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright','tab'].includes(k)&&started&&!paused)e.preventDefault();
  if(!started)return;
  if(k==='m'&&$<HTMLDialogElement>('#map-dialog').open){$<HTMLDialogElement>('#map-dialog').close();return;}
  if(k==='escape'&&!document.querySelector('dialog[open]')){e.preventDefault();if(renderer.package){renderer.package=undefined;setTool(tool);}else if(photo)photoMode();else openDialog('#pause-dialog');return;}
  if(paused)return;
  keys.add(k);if(e.repeat)return;
  if(['1','2','3','4'].includes(k))setTool(+k-1);
  if(k==='b')setTool(tool===2?0:2);
  if(k==='e')interact();if(k==='x')openObject();if(k==='r')transport.send({type:'rope'});if(k==='f')transport.send({type:'lights'});
  if(k==='q'&&(tool===2||renderer.package))renderer.buildAngle+=Math.PI/2;
  if(k==='c')renderer.rotateCamera(e.shiftKey?-1:1);if(k==='v')renderer.tiltCamera();if(k==='home')renderer.resetCamera();
  if(k==='m')map();if(k==='h')openDialog('#help-dialog');if(k==='p')photoMode();
});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{resetInput();if(started&&!paused){save(true);openDialog('#pause-dialog');}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){resetInput();if(started)save(true);}});
const canvas=$<HTMLCanvasElement>('#world');canvas.addEventListener('pointermove',e=>{pointer.x=e.clientX;pointer.y=e.clientY;});
canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('pointerdown',e=>{if(!started||paused)return;pointer.x=e.clientX;pointer.y=e.clientY;canvas.setPointerCapture(e.pointerId);if(e.button===2){pointer.right=true;if(renderer.package){renderer.package=undefined;return;}if(tool===2){const s=candidate(['structure'],45);if(s)transport.send({type:'remove',target:s.id});}else{const item=candidate(['log','plank','relic','box','tool','dynamite'],60);if(item)transport.send({type:'grab',target:item.id});}}else{pointer.down=true;act();}});
canvas.addEventListener('pointerup',e=>{pointer.down=false;if(e.button===2){pointer.right=false;transport.send({type:'release'});}});canvas.addEventListener('pointercancel',resetInput);
canvas.addEventListener('wheel',e=>{e.preventDefault();renderer.targetZoom=Math.max(.55,Math.min(1.75,renderer.targetZoom-e.deltaY*.001));},{passive:false});
window.addEventListener('resize',()=>renderer.resize());window.addEventListener('beforeunload',()=>{if(started)save(true);});
document.querySelectorAll<HTMLElement>('[data-key]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();keys.add(b.dataset.key!);b.setPointerCapture(e.pointerId);};b.onpointerup=b.onpointercancel=()=>keys.delete(b.dataset.key!);});
document.querySelectorAll<HTMLElement>('[data-action]').forEach(b=>b.onclick=()=>{if(b.dataset.action==='interact')interact();if(b.dataset.action==='rope')transport.send({type:'rope'});if(b.dataset.action==='chop'){const e=sim.closest(sim.position,['tree','log'],105);if(e)transport.send({type:'chop',target:e.id});}});
function drainEvents(){for(const e of sim.events){renderer.event(e);audio.event(e,dist(e,sim.position));if(e.message)toast(e.message);if(e.type==='transition'){renderer.camera={...sim.position};pointer.x=innerWidth/2;pointer.y=innerHeight/2;keys.clear();}if(e.type==='build'&&renderer.package){renderer.package=undefined;setTool(tool);}}sim.events.length=0;}
function updateHud(){
  $('#money').textContent=sim.money.toLocaleString('pt-BR');const h=renderer.hour;$('#time').textContent=`${String(Math.floor(h)).padStart(2,'0')}:${String(Math.floor(h%1*60)).padStart(2,'0')}`;
  const b=biome(sim.position);$('#region').textContent=sim.interior?(sim.interior==='vale'?'Armazém do Vale':'Armazém do Outro Lado'):inLand(sim.position)?'Sua propriedade':regionAt(sim.position).name;$('#weather').textContent=sim.interior?'PORTAS ABERTAS':heightAt(sim.position)>100?'COTA '+Math.round(heightAt(sim.position)):b==='snow'?'AR FRIO':'BRISA LEVE';
  $('#driving').hidden=!sim.driving;const velocity=sim.truck?.body.velocity??{x:0,y:0};$('#speed').textContent=Math.round(Math.hypot(velocity.x,velocity.y)*8)+' KM/H';$('#fuel').style.width=sim.fuel+'%';$('#fuel-label').textContent=sim.fuel<10?'RESERVA':'TANQUE';
  $('#death').hidden=!sim.deadUntil;$('#placement').hidden=!renderer.package;
  if(renderer.package)$('#placement-name').textContent=renderer.package.kind==='mill'?'Reposicionar refinadora':PRODUCTS[renderer.package.product!].name;
  const axeLabel=document.querySelector('[data-tool="0"] .toolname');if(axeLabel)axeLabel.textContent=sim.axe<1?'Machado gasto':sim.axe>1?'Machado de aço':'Machado de ferro';
  let context='';const nearTruck=!!sim.truck&&dist(sim.position,sim.truck.body.position)<120;
  const held=sim.held?sim.entities.get(sim.held):undefined,e=renderer.hover;
  if(sim.interior&&dist(sim.position,roomDoor(sim.interior))<110)context='<kbd>E</kbd> Sair da loja'+(held?.paid===false?' · Produto ainda não pago':'');
  else if(sim.interior&&dist(sim.position,roomCounter(sim.interior))<145)context=held&&sim.counterPlacement(held)?'Solte para apoiar no balcão · <kbd>E</kbd> Apoiar e pagar':'<kbd>E</kbd> Conversar e pagar os produtos no balcão';
  else if(sim.driving)context='<kbd>W S</kbd> Acelerar / ré &nbsp; <kbd>A D</kbd> Esterçar &nbsp; <kbd>E</kbd> Sair';
  else if(!sim.interior&&(dist(sim.position,SHOP)<155||dist(sim.position,HARDWARE)<155))context='<kbd>E</kbd> Entrar no armazém';
  else if(held)context=held.product?(PRODUCTS[held.product].name+(held.paid===false?' · $ '+PRODUCTS[held.product].price+' · leve ao caixa':held.kind==='dynamite'?(held.fuse!==undefined?' · Pavio aceso. Afaste-se!':' · 4 + clique para acender'):' · Pago · X para abrir')):'<kbd>MOUSE</kbd> Puxar &nbsp; <kbd>Q</kbd> Girar &nbsp; <kbd>R</kbd> Amarrar na caçamba';
  else if(e&&dist(sim.position,e.body.position)<135){context=e.product?(PRODUCTS[e.product].name+(e.paid===false?' · $ '+PRODUCTS[e.product].price:' · seu')+' · Botão direito para pegar'):
    e.kind==='tree'?'<kbd>CLIQUE</kbd> '+WOODS[e.species??'pine'].name:e.kind==='log'||e.kind==='plank'?'<kbd>BOTÃO DIREITO</kbd> Arrastar madeira':e.kind==='mill'?'Use a mesa com faixas claras · X para reposicionar':e.kind==='tool'?'<kbd>X</kbd> Equipar machado':'<kbd>BOTÃO DIREITO</kbd> Pegar objeto';
    if(e.kind==='dynamite'&&e.paid!==false)context=e.fuse!==undefined?'Pavio aceso. Afaste-se!':'<kbd>4 + CLIQUE</kbd> Acender · Botão direito para carregar';
    if(e.kind==='box'&&e.paid)context+='<br><kbd>X</kbd> Abrir / posicionar';
  }else if(nearTruck)context='<kbd>E</kbd> Entrar na caminhonete &nbsp; <kbd>R</kbd> Amarrar / soltar carga';
  $('#context').innerHTML=context;$('#context').hidden=!context||photo||tool===2||!!renderer.package;
  if(performance.now()>toastUntil)$('#toast').classList.remove('show');if(sim.elapsed-lastSave>5)$('#save-state').textContent='';
}
function frame(now:number){
  const dt=Math.min(.05,(now-clock)/1000);clock=now;
  if(started&&!paused){
    const move={x:(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),y:(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0)};
    transport.send({type:'move',...(sim.driving?move:renderer.movementToWorld(move.x,move.y)),brake:keys.has(' ')});
    const wp=worldPointer();transport.send({type:'aim',...wp});renderer.ghost={x:Math.round(wp.x/32)*32,y:Math.round(wp.y/32)*32};
    if(keys.has('q')&&sim.held&&!renderer.package)transport.send({type:'rotate',direction:1});
    if(pointer.down&&tool===0&&!photo&&!renderer.package)act();
    if(keys.has(' ')&&!sim.driving&&!photo){const e=sim.closest(sim.position,['tree','log'],100);if(e)transport.send({type:'chop',target:e.id});}
    accumulator+=dt;while(accumulator>=1/60){sim.step();accumulator-=1/60;}drainEvents();
    if(sim.elapsed-lastSave>25)save(true);
    renderer.hover=candidate(['tree','log','plank','relic','structure','box','tool','dynamite','mill'],65);if(renderer.package&&!sim.entities.has(renderer.package.id))renderer.package=undefined;
  }
  renderer.draw(paused?0:dt);audio.update(dt,sim.driving,Math.hypot(sim.truck?.body.velocity.x??0,sim.truck?.body.velocity.y??0),paused);
  if(now-lastHud>100){updateHud();lastHud=now;}
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// Development-only observability. Never part of the authority or release UI.
if((import.meta as ImportMeta & {env:{DEV:boolean}}).env.DEV)Object.assign(window,{__game:{sim,renderer,transport,get started(){return started;},get paused(){return paused;},save}});
