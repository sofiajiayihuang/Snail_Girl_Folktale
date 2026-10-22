import './style.css';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildTable, alignTableModel, fitPlacesToTable } from './table.js';
import { OBJECTS, ARTWORK_WIDTH, createArtwork, modelLoader, normalizeObject, replaceWithModel, prepareInspectionModel } from './objects.js';
import { TableTurn, STEP, clampScale } from './state.js';
import { createContourParticles } from './particles.js';

const $=s=>document.querySelector(s);
const host=$('#scene'),detailHost=$('#detail-scene'),dialog=$('#inspector');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
function makeRenderer(parent){
 const r=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 r.setClearColor(0x000000,1);r.setPixelRatio(Math.min(devicePixelRatio,2));
 r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=.92;
 parent.prepend(r.domElement);return r;
}
let renderer;
try{renderer=makeRenderer(host);}catch(error){$('#loading').textContent='Unable to start the 3D scene. Please use a browser that supports WebGL.';throw error;}
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.domElement.setAttribute('aria-label','3D triangular table');
const scene=new THREE.Scene();scene.background=new THREE.Color(0x000000);
const camera=new THREE.PerspectiveCamera(28,1,.1,100);
const pmrem=new THREE.PMREMGenerator(renderer),environment=new RoomEnvironment();
const env=pmrem.fromScene(environment,.04);scene.environment=env.texture;scene.environmentIntensity=.10;
environment.dispose();pmrem.dispose();
function addLights(target,shadows=false){
 target.add(new THREE.HemisphereLight(0xcdd1d3,0x151410,.38));
 const key=new THREE.DirectionalLight(0xf5efdf,1.15);key.position.set(-3,8,5);key.castShadow=shadows;
 if(shadows){key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-7,right:7,top:7,bottom:-7,near:1,far:25});key.shadow.normalBias=.01;key.shadow.bias=-.0001;key.shadow.radius=4;}
 target.add(key);const fill=new THREE.DirectionalLight(0xc5d0d1,.18);fill.position.set(5,5,-5);target.add(fill);
}
function addArtworkLight(parent){
 const target=new THREE.Object3D();target.position.y=.28;parent.add(target);
 const light=new THREE.SpotLight(0xfff3df,14,4.5,.3,.85,2);light.position.set(0,2.1,0);light.target=target;parent.add(light);
}
addLights(scene,true);
const {root:table,places}=buildTable();scene.add(table);
let tableSurfaces=table.children.filter(child=>!places.includes(child));
const baseAngle=Math.PI+STEP,turn=new TableTurn();
const artworks=OBJECTS.map(()=>new THREE.Group()),buttons=[];
const halos=[];
host.dataset.particleTransparency='80';
const scales=[1,1,1],orientations=OBJECTS.map(()=>new THREE.Quaternion());
const DETAIL_BASE_SCALE=1.8;
let selected=-1,drag=null,lastSide=0,assetsReady=false;
let titleAligned=false;
let detailRenderer,detailScene,detailCamera,detailRoot,detailArtwork,detailRadius;
const dragRotation=new THREE.Quaternion(),dragEuler=new THREE.Euler(),cameraInverse=new THREE.Quaternion();
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
let hoverTimer=null,hoverCandidate=-1,hoverOrigin=null,pointerPosition=null,hoverArmed=true,lastHitAt=0;

function castShadows(root){root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});}
function clearHover(){clearTimeout(hoverTimer);hoverTimer=null;hoverCandidate=-1;hoverOrigin=null;host.dataset.hover='';}
OBJECTS.forEach((config,i)=>{
 places[i].add(artworks[i]);artworks[i].position.y=.004;addArtworkLight(places[i]);
 const b=document.createElement('button');b.className='hotspot';b.disabled=true;
 b.setAttribute('aria-label',`Explore ${config.english}`);
 // These buttons are keyboard alternatives; pointer hits use the visible meshes.
 b.addEventListener('click',()=>openDetail(i));$('#hotspots').append(b);buttons.push(b);
});

async function loadAssets(){
 const errors=[];
 const tableTask=modelLoader.loadAsync('/models/table.glb').then(gltf=>{
  const source=normalizeObject(gltf.scene,9);source.rotation.y=Math.PI;
  const model=alignTableModel(source);
  fitPlacesToTable(places,model,OBJECTS);
  tableSurfaces.forEach(child=>table.remove(child));tableSurfaces=[model];table.add(model);castShadows(model);
 }).catch(error=>{errors.push(error);console.error('Table model loading failed:',error);});
 const artTasks=OBJECTS.map((config,i)=>replaceWithModel(artworks[i],config).catch(error=>{
  errors.push(error);const fallback=createArtwork(config);fallback.scale.setScalar(ARTWORK_WIDTH/1.55);artworks[i].add(fallback);
  console.error('Artwork model loading failed:',error);
 }));
 await Promise.all([tableTask,...artTasks]);
 artworks.forEach((artwork,i)=>{
  const halo=createContourParticles(artwork,OBJECTS[i].particleColor);
  halo.points.position.copy(artwork.position);halos.push(halo);places[i].add(halo.points);
 });
 assetsReady=true;host.dataset.ready='true';$('#loading').remove();
 host.dataset.layout=JSON.stringify(places.map((place,i)=>({side:i,position:place.position.toArray(),artworkWidth:ARTWORK_WIDTH*OBJECTS[i].scale})));
 $('#status').textContent=errors.length?'Some models could not be loaded. Fallback shapes are shown.':'The three shells are ready to explore.';
}

function setupDetail(){
 if(detailRenderer)return;
 detailRenderer=makeRenderer(detailHost);
 detailRenderer.domElement.setAttribute('aria-label','Interactive shell model');
 detailScene=new THREE.Scene();detailScene.environment=env.texture;detailScene.environmentIntensity=.16;addLights(detailScene);
 const detailLight=new THREE.Group();addArtworkLight(detailLight);detailScene.add(detailLight);
 detailCamera=new THREE.PerspectiveCamera(37,1,.02,30);detailRoot=new THREE.Group();detailScene.add(detailRoot);
 detailHost.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;e.preventDefault();drag={x:e.clientX,y:e.clientY,id:e.pointerId};
  detailHost.setPointerCapture(e.pointerId);detailHost.classList.add('dragging');
 });
 detailHost.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.id)return;
  // Apply screen-space rotations around the sculpture's center, with no pole limits.
  dragEuler.set((e.clientY-drag.y)*.012,(e.clientX-drag.x)*.012,0);
  cameraInverse.copy(detailCamera.quaternion).invert();
  dragRotation.setFromEuler(dragEuler).premultiply(detailCamera.quaternion).multiply(cameraInverse);
  orientations[selected].premultiply(dragRotation).normalize();
  detailRoot.quaternion.copy(orientations[selected]);drag.x=e.clientX;drag.y=e.clientY;
 });
 detailHost.addEventListener('pointerup',endDrag);detailHost.addEventListener('pointercancel',endDrag);
 detailHost.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(-Math.max(-150,Math.min(150,e.deltaY))*.0015));},{passive:false});
}
function populateDetail(i){
 detailRoot.clear();
 $('#detail-link').textContent=OBJECTS[i].english;
 $('#detail-link').href=`/readings/index.html#/read/${OBJECTS[i].reading}`;
 detailRoot.quaternion.identity();detailRoot.scale.setScalar(1);
 // Measure the detached clone; a previous inspection's parent scale must not
 // change its measured radius and push the camera farther away on reopening.
 const prepared=prepareInspectionModel(artworks[i]);
 detailArtwork=prepared.model;detailRoot.add(detailArtwork);detailRadius=prepared.radius;
 // Frame the unscaled composition once so wheel zoom remains a visible size change.
 frameDetail();detailRoot.quaternion.copy(orientations[i]);detailRoot.scale.setScalar(DETAIL_BASE_SCALE*scales[i]);
 $('#scale-label').value=`${Math.round(scales[i]*100)}%`;
}
function openDetail(i){
 if(!assetsReady||turn.busy||dialog.open)return;
 clearHover();selected=i;setupDetail();populateDetail(i);
 dialog.showModal();resizeDetail();$('#close-inspector').focus({preventScroll:true});
 $('#status').textContent=`${OBJECTS[i].english} opened. Drag to rotate and scroll to zoom.`;
}
function closeDetail(){if(dialog.open)dialog.close();}
function endDrag(){
 if(drag&&detailHost.hasPointerCapture(drag.id))detailHost.releasePointerCapture(drag.id);
 drag=null;detailHost.classList.remove('dragging');
}
dialog.addEventListener('close',()=>{endDrag();clearHover();hoverArmed=false;renderer.domElement.style.cursor='default';});
$('#close-inspector').onclick=closeDetail;
dialog.addEventListener('click',e=>{
 if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();
 if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDetail();
});
function zoom(factor){
 if(selected<0||!dialog.open)return;
 scales[selected]=clampScale(scales[selected]*factor);detailRoot.scale.setScalar(DETAIL_BASE_SCALE*scales[selected]);
 $('#scale-label').value=`${Math.round(scales[selected]*100)}%`;
}
$('#smaller').onclick=()=>zoom(1/1.12);$('#larger').onclick=()=>zoom(1.12);
$('#reset').onclick=()=>{endDrag();scales[selected]=1;orientations[selected].identity();detailRoot.scale.setScalar(DETAIL_BASE_SCALE);detailRoot.quaternion.identity();$('#scale-label').value='100%';};
function rotateTable(d){clearHover();hoverArmed=false;closeDetail();endDrag();turn.turn(d);}
$('#previous').onclick=()=>rotateTable(-1);$('#next').onclick=()=>rotateTable(1);
addEventListener('keydown',e=>{
 if(e.repeat||e.altKey||e.ctrlKey||e.metaKey||e.target.closest('input,textarea,select,[contenteditable="true"]'))return;
 const k=e.key.toLowerCase();if(k==='a'||k==='d'){e.preventDefault();rotateTable(k==='a'?-1:1);}
});
function hit(position){
 const r=renderer.domElement.getBoundingClientRect();
 pointer.set((position.x-r.left)/r.width*2-1,-(position.y-r.top)/r.height*2+1);
 raycaster.setFromCamera(pointer,camera);
 const first=raycaster.intersectObjects([...places,...tableSurfaces],true)[0];
 if(!first)return -1;
 for(let o=first.object;o&&o!==table;o=o.parent)if(Number.isInteger(o.userData.index))return o.userData.index;
 return -1;
}
renderer.domElement.addEventListener('pointermove',e=>{
 pointerPosition={x:e.clientX,y:e.clientY};
 if(!assetsReady||turn.busy||dialog.open||e.buttons){clearHover();return;}
 const now=performance.now();if(now-lastHitAt<45)return;lastHitAt=now;
 const i=hit(pointerPosition);renderer.domElement.style.cursor=i>=0?'pointer':'default';
 if(!hoverArmed){if(i<0)hoverArmed=true;clearHover();return;}
 if(i<0){clearHover();return;}
 if(i===hoverCandidate&&hoverOrigin&&Math.hypot(e.clientX-hoverOrigin.x,e.clientY-hoverOrigin.y)<8)return;
 clearHover();hoverCandidate=i;hoverOrigin={...pointerPosition};host.dataset.hover=String(i);
 hoverTimer=setTimeout(()=>{
  if(!assetsReady||turn.busy||dialog.open||!pointerPosition||hoverCandidate!==i)return;
  if(hit(pointerPosition)===i)openDetail(i);else clearHover();
 },450);
});
renderer.domElement.addEventListener('pointerleave',()=>{clearHover();pointerPosition=null;hoverArmed=true;renderer.domElement.style.cursor='default';});
renderer.domElement.addEventListener('pointerdown',clearHover);
renderer.domElement.addEventListener('click',e=>{if(e.button===0){const i=hit({x:e.clientX,y:e.clientY});if(i>=0)openDetail(i);}});
addEventListener('blur',()=>{clearHover();endDrag();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearHover();});
function frameDetail(){
 if(!detailArtwork)return;
 const fov=THREE.MathUtils.degToRad(detailCamera.fov),limitingAngle=Math.min(fov/2,Math.atan(Math.tan(fov/2)*detailCamera.aspect));
 const distance=Math.max(1.6,detailRadius/Math.sin(limitingAngle)*1.35);
 detailCamera.position.set(0,.40*distance,.9165*distance);detailCamera.lookAt(0,0,0);
 detailHost.dataset.modelRadius=String(detailRadius);detailHost.dataset.cameraDistance=String(distance);
}
function resizeDetail(){
 if(!detailRenderer||!dialog.open)return;
 const w=detailHost.clientWidth,h=detailHost.clientHeight;detailCamera.aspect=w/h;detailCamera.updateProjectionMatrix();detailRenderer.setSize(w,h);
 frameDetail();
}
function alignSiteTitle(){
 if(!assetsReady)return;
 table.updateMatrixWorld(true);
 // Use the initial table orientation so A/D turns never move the title.
 const initialOrientation=new THREE.Matrix4().makeRotationY(baseAngle-table.rotation.y);
 const point=new THREE.Vector3();let left=Infinity;
 tableSurfaces.forEach(surface=>surface.traverse(node=>{
  if(!node.isMesh)return;
  const positions=node.geometry.attributes.position;
  for(let i=0;i<positions.count;i++){
   point.fromBufferAttribute(positions,i).applyMatrix4(node.matrixWorld).applyMatrix4(initialOrientation).project(camera);
   if(point.z>=-1&&point.z<=1&&point.y>=-1&&point.y<=1)left=Math.min(left,(point.x*.5+.5)*host.clientWidth);
  }
 }));
 if(Number.isFinite(left)){
  left=Math.max(16,left);document.documentElement.style.setProperty('--site-title-left',`${left}px`);
  try{sessionStorage.setItem('snail-header-left',JSON.stringify({left,width:host.clientWidth}));}catch{}
 }
 titleAligned=true;
}
function resize(){
 const w=host.clientWidth,h=host.clientHeight;camera.aspect=w/h;
 const distance=Math.max(7.2,8.495/(1.8*Math.tan(THREE.MathUtils.degToRad(14))*camera.aspect)-2.45);
 camera.position.set(0,1.16+(distance+2.45)*.14,distance);camera.lookAt(0,.91,-2.45);
 camera.updateProjectionMatrix();renderer.setSize(w,h);resizeDetail();alignSiteTitle();
}
addEventListener('resize',resize);resize();
const projected=new THREE.Vector3();
function animate(now){
 const seconds=reduced.matches?0:now*.001;
 halos.forEach(halo=>halo.update(seconds));
 turn.update(now,reduced.matches);table.rotation.y=baseAngle+turn.angle;
 if(lastSide!==turn.side){lastSide=turn.side;$('#side').value=`${String(lastSide+1).padStart(2,'0')} / 03`;$('#status').textContent=`Table orientation ${lastSide+1} of 3`;}
 table.updateMatrixWorld(true);
 if(assetsReady&&!titleAligned)alignSiteTitle();
 buttons.forEach((b,i)=>{
  projected.set(0,.05,0);places[i].localToWorld(projected);projected.project(camera);
  b.style.left=`${(projected.x*.5+.5)*host.clientWidth}px`;b.style.top=`${(-projected.y*.5+.5)*host.clientHeight}px`;b.disabled=!assetsReady||turn.busy;
 });
 renderer.render(scene,camera);if(dialog.open&&detailRenderer)detailRenderer.render(detailScene,detailCamera);
 host.dataset.side=String(turn.side);host.dataset.angle=String(turn.angle);host.dataset.busy=String(turn.busy);
 host.dataset.scales=scales.join(',');host.dataset.rotations=JSON.stringify(orientations.map(q=>q.toArray()));host.dataset.inspected=dialog.open?String(selected):'';
}
renderer.setAnimationLoop(animate);loadAssets();
renderer.domElement.addEventListener('webglcontextlost',e=>{
 e.preventDefault();clearHover();renderer.setAnimationLoop(null);
 const p=document.createElement('p');p.id='loading';p.textContent='The 3D scene was interrupted. Please refresh to restore it.';host.append(p);
});
