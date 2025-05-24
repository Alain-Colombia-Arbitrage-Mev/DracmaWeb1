
import React, { useEffect, useRef, useMemo } from 'react'; // Added useMemo
import * as THREE from 'three';

const ThreeBackground: React.FC = () => {
  const mountRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);

  // Memoize the texture creation function to prevent re-creation on every render
  const particleTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128; 
    canvas.height = 128;
    const context = canvas.getContext('2d');
    if (!context) return null;
    const gradient = context.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, canvas.width/2);
    gradient.addColorStop(0, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.5, 'rgba(200,220,255,0.3)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    return new THREE.CanvasTexture(canvas);
  }, []);


  useEffect(() => {
    if (!mountRef.current || typeof window === 'undefined' || !particleTexture) return;
    
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: mountRef.current, alpha: true, antialias: true }); // Added antialias
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Optimize pixel ratio

    const particleCount = 700; // Slightly increased for more density
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const color1 = new THREE.Color(0x7DF9FF); // aura-cyan
    const color2 = new THREE.Color(0xE0B0FF); // light purple/pinkish
    const color3 = new THREE.Color(0xFBBF24); // brand-accent-gold

    for (let i = 0; i < particleCount; i++) {
      const x = (Math.random() - 0.5) * 20; // Increased spread
      const y = (Math.random() - 0.5) * 20;
      const z = (Math.random() - 0.5) * 20;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      let randomColor;
      const r = Math.random();
      if (r < 0.45) randomColor = color1;
      else if (r < 0.9) randomColor = color2;
      else randomColor = color3;
      
      colors[i * 3] = randomColor.r;
      colors[i * 3 + 1] = randomColor.g;
      colors[i * 3 + 2] = randomColor.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.035, // Slightly larger particles
      vertexColors: true,
      transparent: true,
      opacity: 0.45, // Slightly more opaque
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: particleTexture,
      sizeAttenuation: true, // Particles smaller further away
    });
    
    const particleSystem = new THREE.Points(geometry, particleMaterial);
    scene.add(particleSystem);
    camera.position.z = 5;

    // Mouse movement interaction
    const mouse = new THREE.Vector2();
    const handleMouseMove = (event: MouseEvent) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove);

    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);
      
      const elapsedTime = clock.getElapsedTime();
      
      // Subtle particle movement & rotation
      particleSystem.rotation.y = elapsedTime * 0.02;
      particleSystem.rotation.x = elapsedTime * 0.01;

      // Parallax effect
      camera.position.x += (mouse.x * 0.5 - camera.position.x) * 0.02;
      camera.position.y += (mouse.y * 0.5 - camera.position.y) * 0.02;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      // Clean up Three.js resources
      if (renderer) renderer.dispose();
      if (geometry) geometry.dispose();
      if (particleMaterial) particleMaterial.dispose();
      // particleTexture is memoized, React handles its lifecycle.
      // If it were created inside useEffect, it would be disposed here:
      // if (particleTexture) particleTexture.dispose();
      // scene.traverse(object => {
      //   if (object.geometry) object.geometry.dispose();
      //   if (object.material) {
      //     if (Array.isArray(object.material)) {
      //       object.material.forEach(material => material.dispose());
      //     } else {
      //       object.material.dispose();
      //     }
      //   }
      // });
    };
  }, [particleTexture]); // Add particleTexture to dependency array

  return <canvas ref={mountRef} id="threejs-canvas-bg" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -2, opacity: 0.35 }} aria-hidden="true" />;
};

export default ThreeBackground;