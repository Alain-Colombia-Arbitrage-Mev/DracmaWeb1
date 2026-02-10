import { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';

const ThreeBackground: React.FC = () => {
  const mountRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);

  const particleTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    if (!context) return null;
    const gradient = context.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, canvas.width/2);
    gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
    gradient.addColorStop(0.4, 'rgba(160,170,255,0.4)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    return new THREE.CanvasTexture(canvas);
  }, []);

  useEffect(() => {
    if (!mountRef.current || typeof window === 'undefined' || !particleTexture) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: mountRef.current, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // --- Particles (indigo / blue-violet / gold palette) ---
    const particleCount = 800;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const colorIndigo = new THREE.Color(0x6366F1);
    const colorViolet = new THREE.Color(0x8B5CF6);
    const colorSky = new THREE.Color(0x38BDF8);
    const colorGold = new THREE.Color(0xFBBF24);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 22;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 22;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 22;

      const r = Math.random();
      let c;
      if (r < 0.35) c = colorIndigo;
      else if (r < 0.6) c = colorViolet;
      else if (r < 0.85) c = colorSky;
      else c = colorGold;

      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.04,
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: particleTexture,
      sizeAttenuation: true,
    });

    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleSystem);

    // --- Wireframe icosahedron (crypto orb) ---
    const icoGeometry = new THREE.IcosahedronGeometry(1.8, 1);
    const icoMaterial = new THREE.MeshBasicMaterial({
      color: 0x6366F1,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
    });
    const icosahedron = new THREE.Mesh(icoGeometry, icoMaterial);
    icosahedron.position.set(2.5, 0, -2);
    scene.add(icosahedron);

    // --- Second smaller orb ---
    const ico2Geometry = new THREE.IcosahedronGeometry(0.9, 1);
    const ico2Material = new THREE.MeshBasicMaterial({
      color: 0x8B5CF6,
      wireframe: true,
      transparent: true,
      opacity: 0.08,
    });
    const icosahedron2 = new THREE.Mesh(ico2Geometry, ico2Material);
    icosahedron2.position.set(-3, 1.5, -3);
    scene.add(icosahedron2);

    // --- Torus ring (orbital ring) ---
    const torusGeometry = new THREE.TorusGeometry(2.8, 0.015, 16, 100);
    const torusMaterial = new THREE.MeshBasicMaterial({
      color: 0x38BDF8,
      transparent: true,
      opacity: 0.1,
    });
    const torus = new THREE.Mesh(torusGeometry, torusMaterial);
    torus.position.set(2.5, 0, -2);
    torus.rotation.x = Math.PI * 0.35;
    scene.add(torus);

    camera.position.z = 5;

    const mouse = new THREE.Vector2();
    const handleMouseMove = (event: MouseEvent) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Particles
      particleSystem.rotation.y = t * 0.015;
      particleSystem.rotation.x = t * 0.008;

      // Icosahedrons — slow independent rotations
      icosahedron.rotation.y = t * 0.08;
      icosahedron.rotation.x = t * 0.05;
      icosahedron2.rotation.y = -t * 0.06;
      icosahedron2.rotation.z = t * 0.04;

      // Torus — orbiting ring
      torus.rotation.z = t * 0.03;
      torus.rotation.y = t * 0.02;

      // Mouse parallax
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
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      renderer.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      icoGeometry.dispose();
      icoMaterial.dispose();
      ico2Geometry.dispose();
      ico2Material.dispose();
      torusGeometry.dispose();
      torusMaterial.dispose();
    };
  }, [particleTexture]);

  return <canvas ref={mountRef} id="threejs-canvas-bg" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -2, opacity: 0.4 }} aria-hidden="true" />;
};

export default ThreeBackground;
