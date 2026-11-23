 'use client';
import {Suspense,useEffect,useMemo,useRef,useState} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {Center,Environment,Lightformer,useGLTF} from '@react-three/drei';
import * as THREE from 'three';
function TravelingCamera({reduced}:{reduced:boolean}){
 const {scene}=useGLTF('/camera.glb');const group=useRef<THREE.Group>(null);const {viewport}=useThree();
 const model=useMemo(()=>{const clone=scene.clone(true);clone.traverse(object=>{if(object instanceof THREE.Mesh){object.material=object.material.clone();if(object.material.name==='camera_body_pbr'){object.material.color.set('#90999c');object.material.metalness=.8;object.material.roughness=.3;}}});return clone;},[scene]);
 useFrame(({clock},delta)=>{if(!group.current)return;const mobile=innerWidth<761;const isHome=document.querySelector('.cinema-site')?.getAttribute('data-page')==='home';const total=Math.max(1,document.documentElement.scrollHeight-innerHeight);const progress=Math.min(1,scrollY/total);const leave=isHome?THREE.MathUtils.smoothstep(scrollY,80,innerHeight*.7):1;const finale=THREE.MathUtils.smoothstep(progress,.86,1);const width=mobile?THREE.MathUtils.lerp(.84,.21,leave):THREE.MathUtils.lerp(.38,.13,leave)+finale*.09;const x=mobile?THREE.MathUtils.lerp(0,.365,leave):THREE.MathUtils.lerp(.24,.405,leave)-finale*.05;const y=mobile?THREE.MathUtils.lerp(-.22,-.14,leave):Math.sin(progress*Math.PI*3)*.12-.015;const smoothing=1-Math.exp(-delta*5);
 group.current.position.lerp(new THREE.Vector3(viewport.width*x,viewport.height*y+(reduced?0:Math.sin(clock.elapsedTime*.65)*.035),0),smoothing);
 const scale=viewport.width*width/.15;group.current.scale.lerp(new THREE.Vector3(scale,scale,scale),smoothing);
 group.current.rotation.y=THREE.MathUtils.lerp(group.current.rotation.y,reduced?-.45:-.45+progress*Math.PI*4,smoothing);
 group.current.rotation.x=THREE.MathUtils.lerp(group.current.rotation.x,.12+(reduced?0:Math.sin(progress*Math.PI*4)*.3),smoothing);
 group.current.rotation.z=THREE.MathUtils.lerp(group.current.rotation.z,reduced?-.08:-.08+Math.sin(progress*Math.PI*3)*.18,smoothing);
 });
 return <group ref={group} scale={0} rotation={[.12,-.45,-.08]}><Center><primitive object={model}/></Center></group>;
}
export default function CameraScene(){const [reduced,setReduced]=useState(false);const [active,setActive]=useState(true);useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setReduced(media.matches);const visibility=()=>setActive(!document.hidden);update();media.addEventListener('change',update);document.addEventListener('visibilitychange',visibility);return()=>{media.removeEventListener('change',update);document.removeEventListener('visibilitychange',visibility);};},[]);return <Canvas dpr={[1,1.5]} camera={{position:[0,0,8],fov:36}} gl={{alpha:true,antialias:true,powerPreference:'low-power'}} frameloop={active?'always':'never'}><ambientLight intensity={.8}/><directionalLight intensity={2} position={[3,5,5]}/><Suspense fallback={null}><TravelingCamera reduced={reduced}/><Environment resolution={128}><Lightformer intensity={5} position={[-4,3,4]} scale={[3,7,1]}/><Lightformer intensity={6} position={[5,2,3]} rotation={[0,-Math.PI/3,0]} scale={[3,6,1]}/><Lightformer color="#b4c8e2" intensity={3} position={[0,-4,2]} scale={[8,2,1]}/></Environment></Suspense></Canvas>;}
