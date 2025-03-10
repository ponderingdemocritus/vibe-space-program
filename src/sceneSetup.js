import * as THREE from "three";
import { Rocket } from "./rocket.js";
import { CelestialBody } from "./celestialBody.js";

// Function to load textures
function loadTextures() {
  const textureLoader = new THREE.TextureLoader();

  // Add error handling
  textureLoader.onError = function (url) {
    console.error("Error loading texture:", url);
  };

  // Earth textures
  const earthTextures = {
    map: textureLoader.load(
      "assets/earth_texture.jpg",
      undefined,
      undefined,
      () => console.error("Error loading Earth texture map")
    ),
    bumpMap: textureLoader.load(
      "assets/earth_bump.jpg",
      undefined,
      undefined,
      () => console.error("Error loading Earth bump map")
    ),
    specularMap: textureLoader.load(
      "assets/earth_specular.jpg",
      undefined,
      undefined,
      () => console.error("Error loading Earth specular map")
    ),
    cloudsMap: textureLoader.load(
      "assets/earth_clouds.png",
      undefined,
      undefined,
      () => console.error("Error loading Earth clouds map")
    ),
  };

  // Moon textures
  const moonTextures = {
    map: textureLoader.load(
      "assets/moon_texture.jpg",
      undefined,
      undefined,
      () => console.error("Error loading Moon texture map")
    ),
    bumpMap: textureLoader.load(
      "assets/moon_bump.jpg",
      undefined,
      undefined,
      () => console.error("Error loading Moon bump map")
    ),
  };

  return { earthTextures, moonTextures };
}

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000); // Black background for space

  // Load textures
  const { earthTextures, moonTextures } = loadTextures();

  // Create celestial bodies
  const celestialBodies = [];

  // Earth
  const earth = new CelestialBody({
    name: "Earth",
    radius: 2,
    mass: 5.972e24, // Earth's mass in kg
    color: 0x0077ff, // Fallback color if texture fails to load
    hasAtmosphere: true,
    atmosphereColor: 0x4ca6ff,
    position: new THREE.Vector3(0, 0, 0),
    textureMap: earthTextures.map,
    bumpMap: earthTextures.bumpMap,
    specularMap: earthTextures.specularMap,
    cloudsMap: earthTextures.cloudsMap,
    rotationSpeed: 0.05, // Earth rotation speed
    cloudsRotationSpeed: 0.07, // Clouds rotate faster than the Earth
    tilt: 23.5, // Earth's axial tilt in degrees
  });
  earth.addToScene(scene);
  celestialBodies.push(earth);

  // Moon
  const moon = new CelestialBody({
    name: "Moon",
    radius: 0.5, // Moon is about 1/4 the size of Earth
    mass: 7.342e22, // Moon's mass in kg
    color: 0xcccccc, // Fallback color if texture fails to load
    hasAtmosphere: false, // Moon has no atmosphere
    position: new THREE.Vector3(5, 0, 0), // Initial position
    textureMap: moonTextures.map,
    bumpMap: moonTextures.bumpMap,
    rotationSpeed: 0.01, // Moon rotation speed (slower than Earth)
    isOrbiting: true, // Make the moon orbit
    orbitTarget: earth, // Orbit around Earth
    orbitRadius: 5.0, // Orbit radius
    orbitSpeed: 0.1, // Orbit speed (radians per second)
    orbitAngle: 0, // Initial orbit angle
    orbitClockwise: false, // Counter-clockwise orbit (like most moons)
    showOrbitPath: true, // Show the orbit path
    orbitPathColor: 0x888888, // Light gray orbit path
  });
  moon.addToScene(scene);
  celestialBodies.push(moon);

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
  const rocket = new Rocket(celestialBodies);
  scene.add(rocket.mesh);
  rocket.addTrailToScene(scene);

  // Ambient light for basic illumination
  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);

  // Directional light to simulate sun
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(5, 3, 5);
  scene.add(light);

  return { scene, rocket, celestialBodies };
}
