import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
export const modelLoader=new GLTFLoader();
const dracoLoader=new DRACOLoader();dracoLoader.setDecoderPath('/draco/');modelLoader.setDRACOLoader(dracoLoader);
export const ARTWORK_WIDTH=.64;
export const OBJECTS = [
  { name:'浪的形状', english:'The Tang Dynasty', reading:'tang-dynasty', particleColor:0x6aafc2, material:'青绿 · 泡沫白 · 流动的褶皱', model:'/models/blue-conch.glb', scale:1, rotation:-Math.PI/9, height:0, kind:'wave' },
  { name:'螺旋的回声', english:'The Jin Dynasty', reading:'jin-dynasty', particleColor:0xe4dbc7, material:'珠母光泽 · 奶油白 · 螺旋的回声', model:'/models/white-conch.glb', scale:.9, rotation:0, height:0, tableOffset:.16, kind:'pearl' },
  { name:'赤色的海', english:'The People’s Republic of China', reading:'peoples-republic-of-china', particleColor:0xc57458, material:'赤陶红 · 有机曲面 · 海螺的褶皱', model:'/models/red-conch.glb', scale:1, rotation:0, height:0, tableOffset:.16, kind:'conch' },
];
function surface(nu,nv,fn,colorFn) {
  const pos=[], colors=[], indices=[]; const color=new THREE.Color();
  for(let i=0;i<=nu;i++)for(let j=0;j<=nv;j++){
    const u=i/nu,v=j/nv,p=fn(u,v);pos.push(...p);
    if(colorFn){color.set(colorFn(u,v));colors.push(color.r,color.g,color.b);}
  }
  for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const a=i*(nv+1)+j,b=a+nv+1;indices.push(a,b,a+1,b,b+1,a+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  if(colorFn)g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
function tube(points,radius,mat){return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),points.length*3,radius,6,false),mat);}
const foamMaterial=new THREE.MeshPhysicalMaterial({color:0xe7ede3,roughness:.43,metalness:.08});
function wave(){
  const group=new THREE.Group();
  // A curved breaking wave: open crest, thin layered folds and irregular foam.
  for(let layer=0;layer<8;layer++){
    const material=new THREE.MeshPhysicalMaterial({color:new THREE.Color().setHSL(.48+layer*.005,.21,.20+layer*.039),roughness:.3,metalness:.26,side:THREE.DoubleSide,clearcoat:.75});
    const fn=(u,v)=>{
      const x=(u-.5)*1.55;
      const height=.68+.37*Math.sin(u*Math.PI)+.10*Math.sin(u*9+layer*.3);
      const theta=v*(Math.PI*1.40);
      const ridge=.022*Math.sin(u*80+v*4+layer);
      return [x+.1*Math.sin(theta)*Math.sin(u*8),.055+height*(1-Math.cos(theta))*.56+ridge*v, .26-height*Math.sin(theta)*.53+layer*.035];
    };
    group.add(new THREE.Mesh(surface(65,32,fn),material));
    if(layer%2===0){
      const pts=[];for(let k=0;k<=65;k++){const p=fn(k/65,.99);p[1]+=.014*Math.sin(k*4);pts.push(new THREE.Vector3(...p));}
      group.add(tube(pts,.022,foamMaterial));
      for(let n=0;n<24;n++){const p=fn(n/24,.96+Math.sin(n*12)*.03);const bead=new THREE.Mesh(new THREE.SphereGeometry(.024+(.5+.5*Math.sin(n*7))*.021,7,5),foamMaterial);bead.position.set(...p);bead.scale.set(1,1.5,.8);group.add(bead);}
    }
  }
  for(let n=0;n<9;n++){
    const points=[];for(let j=0;j<15;j++){const t=j/14;points.push(new THREE.Vector3(-.66+n*.16+.10*Math.sin(t*3),.035+t*t*.4,.5-t*.40));}
    group.add(tube(points,.009+n%2*.004,foamMaterial));
  }
  group.rotation.y=-.15;return group;
}
function pearl(){
  const group=new THREE.Group();
  const geom=surface(220,42,(u,v)=>{
    const theta=u*Math.PI*5.3, r=.035+.57*Math.pow(u,1.52),thick=.02+.255*Math.pow(u,1.8),a=v*Math.PI*2;
    const centerX=r*Math.cos(theta),centerY=r*Math.sin(theta);
    return [centerX+thick*Math.cos(a)*Math.cos(theta),centerY+thick*Math.cos(a)*Math.sin(theta),thick*Math.sin(a)+u*.14];
  },(u,v)=>new THREE.Color().setHSL(.12+.31*Math.sin(u*21+v*7),.12+.07*Math.cos(u*35),.65+.14*Math.sin(u*13+v*9)));
  const mesh=new THREE.Mesh(geom,new THREE.MeshPhysicalMaterial({vertexColors:true,roughness:.22,metalness:.18,clearcoat:1,iridescence:1,iridescenceIOR:1.4,iridescenceThicknessRange:[180,480],side:THREE.DoubleSide}));group.add(mesh);
  group.rotation.z=-.32;group.rotation.x=-.12;return group;
}
function conch(){
  const group=new THREE.Group();
  const fn=(u,v)=>{
    const theta=u*Math.PI*5.0,a=v*Math.PI*2;
    const r=.02+.18*u,tubeR=.025+.36*Math.pow(u,1.7);
    const flare=Math.pow(Math.max(0,(u-.82)/.18),2)*.22;
    const folds=1+.14*Math.sin(a*8+u*38)+.07*Math.sin(u*180);
    return [1.1-u*1.8+(tubeR+flare)*Math.sin(a)*.35,(r+(tubeR+flare)*Math.cos(a)*folds)*Math.cos(theta),(r+(tubeR+flare)*Math.cos(a)*folds)*Math.sin(theta)];
  };
  const mat=new THREE.MeshPhysicalMaterial({vertexColors:true,roughness:.52,metalness:.05,clearcoat:.20,side:THREE.DoubleSide});
  group.add(new THREE.Mesh(surface(230,52,fn,(u,v)=>new THREE.Color().setHSL(.015+.018*Math.sin(v*11+u*15),.59+.08*Math.sin(u*60),.17+.09*(.5+.5*Math.sin(u*110+v*13)))),mat));
  const lip=[];for(let k=0;k<=80;k++)lip.push(new THREE.Vector3(...fn(1,k/80)));group.add(tube(lip,.018,new THREE.MeshStandardMaterial({color:0xb46b51,roughness:.44})));
  group.rotation.z=.35;group.rotation.y=-.3;return group;
}
export function normalizeObject(model,width=1.55){
  model.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(model);const size=box.getSize(new THREE.Vector3());
  const center=box.getCenter(new THREE.Vector3());
  model.position.sub(new THREE.Vector3(center.x,box.min.y,center.z));
  // Keep the centering offset inside the pivot, so subsequent rotation stays centered.
  const pivot=new THREE.Group();pivot.add(model);pivot.scale.setScalar(width/Math.max(size.x,size.y,size.z));
  return pivot;
}
export function prepareInspectionModel(artwork){
  const model=artwork.clone(true);
  const box=new THREE.Box3().setFromObject(model);
  model.position.sub(box.getCenter(new THREE.Vector3()));
  return {model,radius:box.getBoundingSphere(new THREE.Sphere()).radius};
}
export function createArtwork(config){const root=new THREE.Group();const model=normalizeObject(config.kind==='wave'?wave():config.kind==='pearl'?pearl():conch());root.add(model);root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});return root;}
export async function replaceWithModel(root,config){
  if(!config.model)return;
  const gltf=await modelLoader.loadAsync(config.model);const model=normalizeObject(gltf.scene,config.width??ARTWORK_WIDTH);model.scale.multiplyScalar(config.scale);model.rotation.y=config.rotation;model.position.y+=config.height;
  root.clear();root.add(model);root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
}
