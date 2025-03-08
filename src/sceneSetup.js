import * as THREE from "three";
import { Rocket } from "./rocket.js";

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000); // Black background for space

  // Earth - increased size from 1 to 2
  const earthRadius = 2;
  const earthGeometry = new THREE.SphereGeometry(earthRadius, 64, 64); // Increased detail
  const earthMaterial = new THREE.MeshStandardMaterial({
    color: 0x0077ff,
    roughness: 0.7,
    metalness: 0.1,
  });
  const earth = new THREE.Mesh(earthGeometry, earthMaterial);
  scene.add(earth);

  // Add simple atmosphere glow
  const atmosphereGeometry = new THREE.SphereGeometry(
    earthRadius * 1.025,
    64,
    64
  );
  const atmosphereMaterial = new THREE.MeshBasicMaterial({
    color: 0x4ca6ff,
    transparent: true,
    opacity: 0.2,
    side: THREE.BackSide,
  });
  const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
  scene.add(atmosphere);

  // Add stars (simple particles)
  const starsGeometry = new THREE.BufferGeometry();
  const starsCount = 1000;
  const starsPositions = new Float32Array(starsCount * 3);

  for (let i = 0; i < starsCount; i++) {
    const i3 = i * 3;
    // Random positions in a sphere with radius 50
    const radius = 50;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    starsPositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
    starsPositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    starsPositions[i3 + 2] = radius * Math.cos(phi);
  }

  starsGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(starsPositions, 3)
  );
  const starsMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.1,
  });
  const stars = new THREE.Points(starsGeometry, starsMaterial);
  scene.add(stars);

  // Rocket
  const rocket = new Rocket();
  scene.add(rocket.mesh);
  rocket.addTrailToScene(scene);

  // Ambient light for basic illumination
  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);

  // Directional light to simulate sun
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(5, 3, 5);
  scene.add(light);

  return { scene, rocket, earthRadius };
}
