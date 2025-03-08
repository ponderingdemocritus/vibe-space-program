Here’s a complete and self-contained design for your Three.js project layout for a low-fidelity Kerbal Space Program clone, where the goal is to launch a rocket from Earth and attempt to get it into orbit. The project uses Vite as the development server, as requested. This layout is modular, separating concerns like scene setup, rocket physics, user controls, and UI, making it easy to develop and extend.
Project Overview
The project will use Three.js to create a 3D scene with an Earth model, a rocket, and basic lighting. The rocket’s motion will be constrained to a 2D plane (XY plane) for simplicity, with a fixed camera view along the Z-axis to provide a side perspective. Users will control the rocket’s orientation and thrust using keyboard inputs, and a simple HTML-based UI will display the rocket’s altitude and speed. Vite will serve the application, leveraging its fast development server and ES module support.
Project Layout
Below is the directory structure for the project:
ksp-clone/
├── index.html
├── package.json
├── src/
│ ├── main.js
│ ├── sceneSetup.js
│ ├── rocket.js
│ ├── controls.js
│ ├── ui.js
│ └── assets/
│ ├── (textures and models, if used later)
└── vite.config.js (optional)
File Descriptions
index.html
The main HTML file that defines the structure of the web page. It includes a container for the Three.js canvas and UI elements to display altitude and speed.
package.json
Manages project metadata and dependencies, including Three.js and Vite, and defines scripts for running and building the project.
src/main.js
The entry point of the application. It initializes the Three.js renderer, camera, and scene, and runs the animation loop to update controls, physics, and UI, and render the scene.
src/sceneSetup.js
Sets up the Three.js scene by creating the Earth (a simple sphere), the rocket (a basic geometry), and a light source (e.g., directional light to simulate the sun).
src/rocket.js
Defines the Rocket class, which manages the rocket’s properties (position, velocity, thrust) and methods for simulating physics (gravity and thrust).
src/controls.js
Handles keyboard inputs to control the rocket’s orientation (left/right arrow keys) and thrust (up arrow key).
src/ui.js
Updates the HTML UI elements with the rocket’s current altitude and speed.
src/assets/
A directory for future use to store textures (e.g., Earth surface) or 3D models (e.g., GLTF files for a detailed rocket). For this low-fidelity version, basic geometries will suffice, so it can remain empty initially.
vite.config.js
An optional configuration file for Vite. The default Vite setup should work for this simple project, but this file can be added later for custom settings (e.g., plugins).
Detailed Implementation Notes
index.html
This file sets up the page with a container for the Three.js renderer and a UI overlay. Example:
html

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KSP Clone</title>
    <style>
        body { margin: 0; }
        #container { position: relative; }
        #ui { position: absolute; top: 10px; left: 10px; color: white; }
    </style>
</head>
<body>
    <div id="container"></div>
    <div id="ui">
        <p>Altitude: <span id="altitude">0</span> units</p>
        <p>Speed: <span id="speed">0</span> units/s</p>
    </div>
    <script type="module" src="/src/main.js"></script>
</body>
</html>
The #container div holds the Three.js canvas.
The #ui div overlays altitude and speed information.
The script tag uses type="module" to support ES module imports with Vite.
package.json
This file lists dependencies and scripts. Example:
json
{
  "name": "ksp-clone",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "serve": "vite preview"
  },
  "dependencies": {
    "three": "^0.142.0"
  },
  "devDependencies": {
    "vite": "^2.9.9"
  }
}
Run npm install to install Three.js and Vite.
Use npm run dev to start the Vite development server.
src/main.js
The main script initializes the Three.js environment and runs the game loop. Example:
javascript
import * as THREE from 'three';
import { createScene } from './sceneSetup.js';
import { updateControls } from './controls.js';
import { updateUI } from './ui.js';

const container = document.getElementById('container');
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

const { scene, rocket } = createScene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

const clock = new THREE.Clock();

function animate() {
requestAnimationFrame(animate);
const deltaTime = clock.getDelta();

    updateControls(rocket, deltaTime);
    rocket.update(deltaTime);

    const altitude = rocket.position.length() - 1; // Earth radius = 1
    const speed = rocket.velocity.length();
    updateUI(altitude, speed);

    renderer.render(scene, camera);

}

animate();
The camera is positioned at (0, 0, 10) to view the XY plane where the rocket moves.
The animation loop updates controls, physics, and UI, then renders the scene.
src/sceneSetup.js
Sets up the initial scene. Example:
javascript
import \* as THREE from 'three';
import { Rocket } from './rocket.js';

export function createScene() {
const scene = new THREE.Scene();

    // Earth
    const earthGeometry = new THREE.SphereGeometry(1, 32, 32);
    const earthMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    scene.add(earth);

    // Rocket
    const rocket = new Rocket();
    scene.add(rocket.mesh);

    // Light
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 3, 5);
    scene.add(light);

    return { scene, rocket };

}
Earth is a blue sphere with radius 1.
The rocket is instantiated from the Rocket class.
A directional light simulates sunlight.
src/rocket.js
Defines the rocket with physics simulation. Example:
javascript
import \* as THREE from 'three';

export class Rocket {
constructor() {
this.mesh = new THREE.Mesh(
new THREE.CylinderGeometry(0.05, 0.05, 0.2, 16),
new THREE.MeshBasicMaterial({ color: 0xffffff })
);
this.mesh.position.set(0, 1.01, 0); // Just above Earth

        this.mass = 1;
        this.position = this.mesh.position;
        this.velocity = new THREE.Vector3();
        this.force = new THREE.Vector3();
        this.thrustDirection = new THREE.Vector3(0, 1, 0);
        this.thrustMagnitude = 0;
    }

    applyGravity() {
        const G = 1; // Arbitrary gravitational constant
        const M_earth = 1;
        const r = this.position.length();
        const directionToEarth = new THREE.Vector3().subVectors(new THREE.Vector3(), this.position).normalize();
        const gravityMagnitude = (G * M_earth * this.mass) / (r * r);
        this.force.add(directionToEarth.multiplyScalar(-gravityMagnitude));
    }

    applyThrust() {
        const thrustVector = this.thrustDirection.clone().multiplyScalar(this.thrustMagnitude);
        this.force.add(thrustVector);
    }

    update(deltaTime) {
        this.force.set(0, 0, 0);
        this.applyGravity();
        this.applyThrust();

        const acceleration = this.force.clone().divideScalar(this.mass);
        this.velocity.add(acceleration.multiplyScalar(deltaTime));
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));

        // Update mesh orientation
        const angle = Math.atan2(this.thrustDirection.y, this.thrustDirection.x) - Math.PI / 2;
        this.mesh.rotation.z = angle;
    }

    setThrustMagnitude(mag) {
        this.thrustMagnitude = mag;
    }

    rotate(angle) {
        this.thrustDirection.applyAxisAngle(new THREE.Vector3(0, 0, 1), angle);
    }

}
The rocket is a simple cylinder starting just above Earth.
Physics includes gravity (inverse square law) and thrust, updated each frame.
Rotation adjusts the thrust direction in the XY plane.
src/controls.js
Manages user input. Example:
javascript
const keys = {};

window.addEventListener('keydown', (event) => {
keys[event.code] = true;
});

window.addEventListener('keyup', (event) => {
keys[event.code] = false;
});

export function updateControls(rocket, deltaTime) {
const rotationSpeed = 2; // Radians per second
const thrustPower = 0.5; // Arbitrary units

    if (keys['ArrowLeft']) {
        rocket.rotate(rotationSpeed * deltaTime);
    }
    if (keys['ArrowRight']) {
        rocket.rotate(-rotationSpeed * deltaTime);
    }
    rocket.setThrustMagnitude(keys['ArrowUp'] ? thrustPower : 0);

}
Left/right arrows rotate the rocket; up arrow applies thrust.
src/ui.js
Updates the UI. Example:
javascript
export function updateUI(altitude, speed) {
document.getElementById('altitude').textContent = altitude.toFixed(2);
document.getElementById('speed').textContent = speed.toFixed(2);
}
Displays altitude (distance from Earth’s center minus radius) and speed.
Getting Started
Initialize the Project:
Create the directory structure above.
Run npm init -y to create package.json, then update it with the dependencies.
Install dependencies: npm install.
Run the Development Server:
Start Vite: npm run dev.
Open your browser to http://localhost:3000 (or the port Vite assigns).
Gameplay:
Use the left/right arrow keys to rotate the rocket.
Hold the up arrow key to apply thrust.
Attempt to achieve orbit by balancing vertical ascent and horizontal velocity.
Notes for Tuning and Expansion
Physics Parameters: The values for gravity (G), thrust (thrustPower), and rotation speed (rotationSpeed) are arbitrary. Adjust them to make orbiting achievable and fun within a short playtime.
Units: The simulation uses arbitrary units (Earth radius = 1). You can scale them later to match real-world units if desired.
Future Enhancements: Add textures in assets/, implement a following camera, or expand physics to 3D motion.
This layout provides a solid foundation for your low-fidelity Kerbal Space Program clone, balancing simplicity with the core mechanics of launching and orbiting.
