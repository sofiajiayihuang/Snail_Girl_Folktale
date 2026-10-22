import test from 'node:test';
import assert from 'node:assert/strict';
import {TableTurn,STEP,clampScale} from '../src/state.js';
import {buildTable,alignTableModel} from '../src/table.js';
import {createArtwork,OBJECTS,normalizeObject,prepareInspectionModel} from '../src/objects.js';
import {Box3,BoxGeometry,BufferGeometry,Float32BufferAttribute,Group,Mesh,MeshBasicMaterial,Vector3} from 'three';
function finish(t){for(let time=0;time<10000&&t.busy;time+=20)t.update(time);}
test('three left or right turns return to the original side without resetting the accumulated angle',()=>{for(const d of [-1,1]){const t=new TableTurn();for(let i=0;i<3;i++)t.turn(d);finish(t);assert.equal(t.side,0);assert.ok(Math.abs(t.angle-d*2*Math.PI)<1e-9);}});
test('opposite turns cancel; rapid mixed input is processed in order',()=>{const t=new TableTurn();t.turn(-1);t.turn(1);finish(t);assert.equal(t.angle,0);const q=new TableTurn(100);[-1,1,1,-1,-1].forEach(x=>q.turn(x));finish(q);assert.equal(q.steps,-1);assert.equal(q.side,1);});
test('angle is monotonic across three same-direction turns, including the third boundary',()=>{const t=new TableTurn(100);[1,1,1].forEach(d=>t.turn(d));let last=0;for(let time=0;time<=400;time+=5){t.update(time);assert.ok(t.angle>=last);last=t.angle;}assert.equal(t.angle,3*STEP);});
test('reduced motion consumes each queued turn without tweening',()=>{const t=new TableTurn();[1,1,1].forEach(d=>t.turn(d));t.update(0,true);assert.equal(t.steps,1);t.update(1,true);t.update(2,true);assert.equal(t.side,0);assert.equal(t.busy,false);});
test('object scale stays within the permitted viewing range',()=>{assert.equal(clampScale(.1),.75);assert.equal(clampScale(3),1.8);assert.equal(clampScale(1.12),1.12);});
test('an off-center imported model stays centered and grounded after rotation',()=>{
 const asset=new Group();asset.add(new Mesh(new BoxGeometry(2,1,3).translate(4,2,-9),new MeshBasicMaterial()));
 const normalized=normalizeObject(asset,3);
 for(const angle of [0,Math.PI/2,Math.PI,Math.PI*2]){
  normalized.rotation.y=angle;normalized.updateMatrixWorld(true);
  const box=new Box3().setFromObject(normalized),center=box.getCenter(new Vector3());
  assert.ok(Math.abs(center.x)<1e-6);assert.ok(Math.abs(center.z)<1e-6);assert.ok(Math.abs(box.min.y)<1e-6);
 }
});
test('the tabletop triangle retains the same corner positions at each 120 degree stop',()=>{
 const geometry=new BufferGeometry();
 geometry.setAttribute('position',new Float32BufferAttribute([-.006593,1,-4.089715,4.250953,1,4.000720,-4.244361,1,4.012256],3));
 const model=alignTableModel(new Mesh(geometry,new MeshBasicMaterial()));
 const points=Array.from({length:3},(_,i)=>new Vector3().fromBufferAttribute(model.children[0].geometry.attributes.position,i));
 const center=points.reduce((sum,p)=>sum.add(p),new Vector3()).multiplyScalar(1/3);
 assert.ok(Math.hypot(center.x,center.z)<1e-5);
 for(const angle of [STEP,-STEP,STEP*2])for(const p of points){
  const rotated=p.clone().applyAxisAngle(new Vector3(0,1,0),angle);
  assert.ok(Math.min(...points.map(q=>q.distanceTo(rotated)))<1e-5);
 }
});
test('reopening the viewer retains its framing regardless of the previous inspection transform',()=>{
 const artwork=new Group();artwork.add(new Mesh(new BoxGeometry(.6,.4,.5).translate(.2,.2,0),new MeshBasicMaterial()));
 const stage=new Group();stage.rotation.y=2;stage.position.set(2,1,-1);stage.add(artwork);stage.updateMatrixWorld(true);
 const inspector=new Group();let radius;
 for(const scale of [1.8,3.24,1.35,1.8]){
  const prepared=prepareInspectionModel(artwork);
  if(radius===undefined)radius=prepared.radius;else assert.equal(prepared.radius,radius);
  const center=new Box3().setFromObject(prepared.model).getCenter(new Vector3());assert.ok(center.length()<1e-7);
  inspector.clear();inspector.add(prepared.model);inspector.scale.setScalar(scale);inspector.rotation.set(1.5,-2.1,.3);inspector.updateMatrixWorld(true);
 }
});
test('three artwork anchors without tableware; sculptures stay grounded when scaled',()=>{const {root,places}=buildTable();assert.equal(places.length,3);assert.equal(places.every(p=>p.children.length===0),true);const counts=[];OBJECTS.forEach((c,i)=>{const obj=createArtwork(c);places[i].add(obj);obj.updateMatrixWorld(true);let meshes=0;obj.traverse(n=>{if(n.isMesh){meshes++;for(const v of n.geometry.attributes.position.array)assert.ok(Number.isFinite(v));}});counts.push(meshes);places[i].remove(obj);for(const scale of [.75,1,1.8]){obj.scale.setScalar(scale);obj.updateMatrixWorld(true);const b=new Box3().setFromObject(obj);assert.ok(Math.abs(b.min.y)<1e-5);assert.ok(b.max.y>0);}});assert.equal(new Set(counts).size,3);assert.equal(root.children.includes(places[0]),true);});
