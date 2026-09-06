import * as T from 'three';
import type { Entity } from './model';
import { treeModel } from './render/tree-model';
import { mill, person, structure, truck } from './render/machinery-models';
import { propModel } from './render/prop-models';

// Compatibility facade for renderer/scenery imports.
export { material, box, cyl } from './render/primitives';
export { axe, person, truck, mill, structure } from './render/machinery-models';

export function entityModel(e:Entity):T.Group {
  if(e.kind==='tree')return treeModel(e);
  if(e.kind==='player')return person();
  if(e.kind==='truck')return truck();
  if(e.kind==='mill')return mill();
  if(e.kind==='structure')return structure(e.piece!,e.w,e.h);
  return propModel(e);
}

export function disposeModel(g:T.Object3D){g.traverse(o=>{if(o instanceof T.Mesh){if(!o.geometry.userData.shared)o.geometry.dispose();if(o.name==='crown')(o.material as T.Material).dispose();}});}
