import * as THREE from 'three';
const cloth=new THREE.MeshStandardMaterial({color:0xd7d0bb,roughness:.93,side:THREE.DoubleSide});
function mesh(g,m,parent,x=0,y=0,z=0){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function edgePoints(r){return [new THREE.Vector3(-Math.sqrt(3)*r/2,0,r/2),new THREE.Vector3(Math.sqrt(3)*r/2,0,r/2),new THREE.Vector3(0,0,-r)];}
function clothSkirt(parent,a,b,inside=false){
 const positions=[],indices=[],width=a.distanceTo(b),normal=new THREE.Vector3().addVectors(a,b).normalize().multiplyScalar(inside?-1:1);
 const N=110,M=18;
 for(let i=0;i<=N;i++)for(let j=0;j<=M;j++){
  const u=i/N,v=j/M,p=a.clone().lerp(b,u);
  const folds=(Math.sin(u*width*17)*.035+Math.sin(u*width*7+.4)*.027)*Math.pow(v,.7);
  p.addScaledVector(normal,folds+.038*Math.sin(v*Math.PI));
  positions.push(p.x,1.43-v*(inside?.86:1.15)+Math.sin(u*width*17)*.017*v*v,p.z);
 }
 for(let i=0;i<N;i++)for(let j=0;j<M;j++){let a=i*(M+1)+j,b=a+M+1;indices.push(a,b,a+1,b,b+1,a+1);}
 const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geom.setIndex(indices);geom.computeVertexNormals();mesh(geom,cloth,parent);
 // Fine stitched hem catches the gallery light without a bold decorative band.
 const line=[];for(let i=0;i<=N;i++){const k=(i*(M+1)+M)*3;line.push(new THREE.Vector3(positions[k],positions[k+1]+.06,positions[k+2]));}
 mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(line),N,.006,4,false),new THREE.MeshStandardMaterial({color:0xb3a58b,roughness:1}),parent);
}
const TABLE_SIDE=8.495;
const TABLE_RADIUS=TABLE_SIDE/Math.sqrt(3);
export function alignTableModel(model){
 // Measured tabletop corners of this GLB after normalization and its 180° turn.
 // Map them to an equilateral triangle whose centroid is the shared rotation pivot.
 const a={x:-.006593,z:-4.089715},b={x:4.250953,z:4.000720},c={x:-4.244361,z:4.012256};
 const ex=b.x-a.x,ez=b.z-a.z,fx=c.x-a.x,fz=c.z-a.z,det=ex*fz-ez*fx;
 const ux=TABLE_SIDE/2,uz=TABLE_RADIUS*1.5,vx=-TABLE_SIDE/2,vz=uz;
 const xx=(ux*fz-vx*ez)/det,xz=(-ux*fx+vx*ex)/det;
 const zx=(uz*fz-vz*ez)/det,zz=(-uz*fx+vz*ex)/det;
 const matrix=new THREE.Matrix4().set(xx,0,xz,-xx*a.x-xz*a.z,0,1,0,0,zx,0,zz,-TABLE_RADIUS-zx*a.x-zz*a.z,0,0,0,1);
 const aligned=new THREE.Group();aligned.name='table-user-model';model.updateMatrixWorld(true);
 model.traverse(node=>{
  if(!node.isMesh)return;
  const geometry=node.geometry.clone().applyMatrix4(node.matrixWorld).applyMatrix4(matrix);
  aligned.add(new THREE.Mesh(geometry,node.material));
 });
 return aligned;
}
export function fitPlacesToTable(places,model,configs=[]){
 // One repeated anchor places each composition at an equal side midpoint.
 model.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(model),radius=TABLE_RADIUS/2-.31;
 const ray=new THREE.Raycaster();
 places.forEach((place,i)=>{
  // Move broader sculptures away from the inner lip without changing their size.
  const distance=radius+(configs[i]?.tableOffset??0);
  const angle=i*Math.PI*2/3,x=Math.sin(angle)*distance,z=Math.cos(angle)*distance;
  ray.set(new THREE.Vector3(x,box.max.y+1,z),new THREE.Vector3(0,-1,0));
  const surface=ray.intersectObject(model,true)[0];
  if(!surface)throw new Error(`Table has no supporting surface for place ${i}`);
  place.position.set(x,surface.point.y+.006,z);place.rotation.y=angle;
  place.userData.side=i;
 });
}
export function buildTable(){
 const root=new THREE.Group();root.name='table';const outer=edgePoints(4.5),inner=edgePoints(2.05);
 const shape=new THREE.Shape();shape.moveTo(outer[0].x,-outer[0].z);outer.slice(1).forEach(p=>shape.lineTo(p.x,-p.z));shape.closePath();
 const hole=new THREE.Path();hole.moveTo(inner[0].x,-inner[0].z);[inner[2],inner[1]].forEach(p=>hole.lineTo(p.x,-p.z));hole.closePath();shape.holes.push(hole);
 const top=mesh(new THREE.ExtrudeGeometry(shape,{depth:.075,bevelEnabled:true,bevelThickness:.04,bevelSize:.045,bevelSegments:3,steps:1}),cloth,root,0,1.38,0);top.rotation.x=-Math.PI/2;
 for(let i=0;i<3;i++){clothSkirt(root,outer[i],outer[(i+1)%3]);clothSkirt(root,inner[i],inner[(i+1)%3],true);}
 const places=[];
 for(let i=0;i<3;i++){
  const angle=i*Math.PI*2/3,place=new THREE.Group();place.position.set(Math.sin(angle)*1.65,1.48,Math.cos(angle)*1.65);place.rotation.y=angle;place.userData.index=i;root.add(place);
  places.push(place);
 }
 return {root,places};
}
