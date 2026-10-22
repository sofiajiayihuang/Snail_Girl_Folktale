import * as THREE from 'three';

const canvas=document.createElement('canvas');canvas.width=canvas.height=32;
const context=canvas.getContext('2d');
const glow=context.createRadialGradient(16,16,0,16,16,16);
glow.addColorStop(0,'rgba(255,255,255,1)');
glow.addColorStop(.22,'rgba(255,255,255,.8)');
glow.addColorStop(.6,'rgba(255,255,255,.2)');
glow.addColorStop(1,'rgba(255,255,255,0)');
context.fillStyle=glow;context.fillRect(0,0,32,32);
const sprite=new THREE.CanvasTexture(canvas);

export function createContourParticles(artwork,color){
 // Sample actual triangle surfaces, then lift particles just outside the shell.
 const count=4800,base=new Float32Array(count*3),positions=new Float32Array(count*3),normals=new Float32Array(count*3),motion=new Float32Array(count*3);
 const meshes=[],a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),cross=new THREE.Vector3();
 artwork.updateWorldMatrix(true,true);
 const inverse=artwork.matrixWorld.clone().invert();let total=0;
 artwork.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const geometry=mesh.geometry,position=geometry.attributes.position,index=geometry.index;
  const matrix=new THREE.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld);
  const triangles=Math.floor((index?index.count:position.count)/3),areas=new Float64Array(triangles);
  let area=0;
  for(let t=0;t<triangles;t++){
   const start=t*3;
   a.fromBufferAttribute(position,index?index.getX(start):start).applyMatrix4(matrix);
   b.fromBufferAttribute(position,index?index.getX(start+1):start+1).applyMatrix4(matrix);
   c.fromBufferAttribute(position,index?index.getX(start+2):start+2).applyMatrix4(matrix);
   area+=cross.subVectors(b,a).cross(c.sub(a)).length()*.5;areas[t]=area;
  }
  if(area>0){total+=area;meshes.push({geometry,matrix,normalMatrix:new THREE.Matrix3().getNormalMatrix(matrix),areas,area,end:total});}
 });
 let seed=731;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const normal=new THREE.Vector3(),other=new THREE.Vector3();
 for(let i=0;i<count&&total>0;i++){
  const target=(i+.5)/count*total,mesh=meshes.find(mesh=>target<mesh.end);
  const local=target-(mesh.end-mesh.area);let lo=0,hi=mesh.areas.length-1;
  while(lo<hi){const mid=(lo+hi)>>1;if(mesh.areas[mid]<local)lo=mid+1;else hi=mid;}
  const {geometry,matrix,normalMatrix}=mesh,index=geometry.index,attribute=geometry.attributes.position;
  const ids=[0,1,2].map(k=>index?index.getX(lo*3+k):lo*3+k);
  const root=Math.sqrt(random()),u=1-root,v=root*(1-random()),w=1-u-v;
  a.fromBufferAttribute(attribute,ids[0]).applyMatrix4(matrix);
  b.fromBufferAttribute(attribute,ids[1]).applyMatrix4(matrix);
  c.fromBufferAttribute(attribute,ids[2]).applyMatrix4(matrix);
  if(geometry.attributes.normal){
   normal.fromBufferAttribute(geometry.attributes.normal,ids[0]).multiplyScalar(u);
   normal.addScaledVector(other.fromBufferAttribute(geometry.attributes.normal,ids[1]),v);
   normal.addScaledVector(other.fromBufferAttribute(geometry.attributes.normal,ids[2]),w).applyMatrix3(normalMatrix).normalize();
  }else normal.subVectors(b,a).cross(other.subVectors(c,a)).normalize();
  a.multiplyScalar(u).addScaledVector(b,v).addScaledVector(c,w).addScaledVector(normal,.018+random()*.035);
  a.toArray(base,i*3);normal.toArray(normals,i*3);
  motion[i*3]=random()*Math.PI*2;motion[i*3+1]=.2+random()*.8;motion[i*3+2]=.002+random()*.012;
 }
 positions.set(base);
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
 geometry.setAttribute('shellNormal',new THREE.BufferAttribute(normals,3));
 const material=new THREE.PointsMaterial({color,map:sprite,size:.032,transparent:true,opacity:.2,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
 // Reduce front-facing samples so the visible contour carries most of the glow.
 material.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 shellNormal;\nvarying float contourOpacity;').replace('#include <project_vertex>','#include <project_vertex>\ncontourOpacity=.12+.88*pow(1.-clamp(abs(dot(normalize(normalMatrix*shellNormal),normalize(-mvPosition.xyz))),0.,1.),1.2);');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float contourOpacity;').replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=contourOpacity;');
 };
 const points=new THREE.Points(geometry,material);points.name='shell-contour-particles';
 // Decorative particles never take part in picking or open the inspector.
 points.raycast=()=>{};points.frustumCulled=false;
 function update(seconds){
  for(let i=0;i<count;i++){
   const phase=motion[i*3],frequency=motion[i*3+1],amplitude=motion[i*3+2];
   const drift=(Math.sin(seconds*frequency+phase)+.25*Math.sin(seconds*frequency*1.73+phase*2.1))*amplitude;
   for(let axis=0;axis<3;axis++)positions[i*3+axis]=base[i*3+axis]+normals[i*3+axis]*drift;
  }
  geometry.attributes.position.needsUpdate=true;
 }
 return {points,update};
}
