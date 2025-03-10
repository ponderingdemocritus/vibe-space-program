import * as THREE from "three";
import { createScene } from "./sceneSetup.js";
import { updateControls } from "./controls.js";
import { updateUI } from "./ui.js";

// Initialize renderer
const container = document.getElementById("container");
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

// Create scene and camera
const { scene, rocket, celestialBodies } = createScene();
const camera = new THREE.PerspectiveCamera(
  60, // Reduced FOV for better zoom effect
  window.innerWidth / window.innerHeight,
  0.1,
  1000 // Initial far clipping plane, will be adjusted dynamically
);
// Move camera closer to make Earth appear larger
camera.position.set(0, 0, 6);
camera.lookAt(0, 0, 0);

// Get Earth (primary body) from celestial bodies
const earth = celestialBodies[0];
const earthRadius = earth ? earth.radius : 2;

// Get Moon from celestial bodies
const moon = celestialBodies.length > 1 ? celestialBodies[1] : null;

// Simulation speed settings
const speedSettings = [1, 5, 100]; // Available speed multipliers
let currentSpeedIndex = 0; // Start at normal speed (1x)
let simulationSpeed = speedSettings[currentSpeedIndex];

// Zoom controls
const minZoom = 3; // Closest zoom (very close to Earth)
const maxZoom = 30; // Increased furthest zoom to see more of space
const zoomSpeed = 0.5; // How fast to zoom with each scroll

// Add zoom functionality with mouse wheel
container.addEventListener("wheel", (event) => {
  event.preventDefault();

  // Determine zoom direction
  const zoomDirection = event.deltaY > 0 ? 1 : -1;

  // Calculate new camera position
  const newZ = camera.position.z + zoomDirection * zoomSpeed;

  // Clamp to min/max zoom levels
  camera.position.z = Math.max(minZoom, Math.min(maxZoom, newZ));

  // Update zoom indicator
  updateZoomIndicator();
});

// Add keyboard zoom controls
window.addEventListener("keydown", (event) => {
  // Plus key to zoom in
  if (event.key === "+" || event.key === "=") {
    camera.position.z = Math.max(minZoom, camera.position.z - zoomSpeed);
  }
  // Minus key to zoom out
  else if (event.key === "-" || event.key === "_") {
    camera.position.z = Math.min(maxZoom, camera.position.z + zoomSpeed);
  }
  // Number keys 1, 2, 3 for simulation speed
  else if (event.key === "1") {
    currentSpeedIndex = 0; // 1x speed
    simulationSpeed = speedSettings[currentSpeedIndex];
    updateSpeedControls();
  } else if (event.key === "2") {
    currentSpeedIndex = 1; // 5x speed
    simulationSpeed = speedSettings[currentSpeedIndex];
    updateSpeedControls();
  } else if (event.key === "3") {
    currentSpeedIndex = 2; // 100x speed
    simulationSpeed = speedSettings[currentSpeedIndex];
    updateSpeedControls();
  }
});

// Handle window resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Create speed controls
function createSpeedControls() {
  const speedControlsContainer = document.createElement("div");
  speedControlsContainer.id = "speed-controls";
  speedControlsContainer.style.position = "absolute";
  speedControlsContainer.style.bottom = "10px";
  speedControlsContainer.style.right = "120px";
  speedControlsContainer.style.display = "flex";
  speedControlsContainer.style.gap = "5px";

  // Create speed buttons
  const speeds = [
    { label: "1x", key: "1", speed: 1 },
    { label: "5x", key: "2", speed: 5 },
    { label: "100x", key: "3", speed: 100 },
  ];

  speeds.forEach((speedOption, index) => {
    const button = document.createElement("button");
    button.textContent = speedOption.label;
    button.dataset.speedIndex = index;
    button.style.backgroundColor =
      index === 0 ? "rgba(0, 255, 0, 0.5)" : "rgba(0, 0, 0, 0.5)";
    button.style.color = "white";
    button.style.border = "1px solid #666";
    button.style.borderRadius = "5px";
    button.style.padding = "5px 10px";
    button.style.cursor = "pointer";
    button.style.fontSize = "12px";

    button.addEventListener("click", () => {
      currentSpeedIndex = index;
      simulationSpeed = speedSettings[currentSpeedIndex];
      updateSpeedControls();
    });

    speedControlsContainer.appendChild(button);
  });

  document.body.appendChild(speedControlsContainer);
  return speedControlsContainer;
}

const speedControls = createSpeedControls();

// Update speed control buttons to highlight the active speed
function updateSpeedControls() {
  const buttons = speedControls.querySelectorAll("button");
  buttons.forEach((button, index) => {
    if (index === currentSpeedIndex) {
      button.style.backgroundColor = "rgba(0, 255, 0, 0.5)"; // Highlight active speed
    } else {
      button.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    }
  });
}

// Create reset button
function createResetButton() {
  const resetButton = document.createElement("button");
  resetButton.id = "reset-button";
  resetButton.textContent = "Reset Game";
  resetButton.style.position = "absolute";
  resetButton.style.top = "50px";
  resetButton.style.right = "10px";
  resetButton.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
  resetButton.style.color = "white";
  resetButton.style.border = "1px solid #666";
  resetButton.style.borderRadius = "5px";
  resetButton.style.padding = "5px 10px";
  resetButton.style.cursor = "pointer";
  resetButton.style.display = "none"; // Initially hidden

  resetButton.addEventListener("click", resetGame);

  document.body.appendChild(resetButton);
  return resetButton;
}

const resetButton = createResetButton();

// Create zoom indicator
function createZoomIndicator() {
  const indicator = document.createElement("div");
  indicator.id = "zoom-indicator";
  indicator.style.position = "absolute";
  indicator.style.bottom = "10px";
  indicator.style.right = "10px";
  indicator.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
  indicator.style.color = "white";
  indicator.style.padding = "5px 10px";
  indicator.style.borderRadius = "5px";
  indicator.style.fontSize = "12px";

  // Create zoom level display
  const zoomLevelDisplay = document.createElement("div");
  zoomLevelDisplay.style.marginBottom = "5px";
  zoomLevelDisplay.innerHTML = `Zoom Level: <span id="zoom-level">6.0</span>x`;
  indicator.appendChild(zoomLevelDisplay);

  // Create zoom scale
  const zoomScale = document.createElement("div");
  zoomScale.style.width = "100px";
  zoomScale.style.height = "10px";
  zoomScale.style.backgroundColor = "#333";
  zoomScale.style.borderRadius = "5px";
  zoomScale.style.position = "relative";
  zoomScale.style.marginTop = "5px";

  // Create zoom indicator marker
  const zoomMarker = document.createElement("div");
  zoomMarker.id = "zoom-marker";
  zoomMarker.style.width = "5px";
  zoomMarker.style.height = "14px";
  zoomMarker.style.backgroundColor = "#fff";
  zoomMarker.style.borderRadius = "2px";
  zoomMarker.style.position = "absolute";
  zoomMarker.style.top = "-2px";
  zoomMarker.style.left = "0";
  zoomMarker.style.transform = "translateX(-50%)";
  zoomScale.appendChild(zoomMarker);

  // Add min and max labels
  const minLabel = document.createElement("span");
  minLabel.style.position = "absolute";
  minLabel.style.left = "0";
  minLabel.style.top = "12px";
  minLabel.style.fontSize = "10px";
  minLabel.textContent = minZoom;
  zoomScale.appendChild(minLabel);

  const maxLabel = document.createElement("span");
  maxLabel.style.position = "absolute";
  maxLabel.style.right = "0";
  maxLabel.style.top = "12px";
  maxLabel.style.fontSize = "10px";
  maxLabel.textContent = maxZoom;
  zoomScale.appendChild(maxLabel);

  indicator.appendChild(zoomScale);

  // Add controls hint
  const controlsHint = document.createElement("div");
  controlsHint.style.marginTop = "15px";
  controlsHint.style.fontSize = "10px";
  controlsHint.innerHTML = `
    Mouse Wheel or +/- Keys<br>
    Press Z to fit orbit
  `;
  indicator.appendChild(controlsHint);

  document.body.appendChild(indicator);
  updateZoomIndicator(); // Initialize zoom level display
  return indicator;
}

// Update zoom indicator with current zoom level
function updateZoomIndicator() {
  const zoomLevelElement = document.getElementById("zoom-level");
  if (zoomLevelElement) {
    zoomLevelElement.textContent = camera.position.z.toFixed(1);
  }

  // Update zoom marker position
  const zoomMarker = document.getElementById("zoom-marker");
  if (zoomMarker) {
    // Calculate position percentage based on current zoom
    const zoomRange = maxZoom - minZoom;
    const zoomPercentage = ((camera.position.z - minZoom) / zoomRange) * 100;
    zoomMarker.style.left = `${zoomPercentage}%`;
  }

  // Adjust camera's far clipping plane based on zoom level
  // This ensures distant objects remain visible when zoomed out far
  camera.far = Math.max(1000, camera.position.z * 50);
  camera.updateProjectionMatrix();
}

// Create crash overlay
function createCrashOverlay() {
  const overlay = document.createElement("div");
  overlay.id = "crash-overlay";
  overlay.style.position = "absolute";
  overlay.style.top = "50%";
  overlay.style.left = "50%";
  overlay.style.transform = "translate(-50%, -50%)";
  overlay.style.backgroundColor = "rgba(255, 0, 0, 0.3)";
  overlay.style.color = "white";
  overlay.style.padding = "20px";
  overlay.style.borderRadius = "10px";
  overlay.style.textAlign = "center";
  overlay.style.display = "none"; // Initially hidden
  overlay.style.zIndex = "1000";

  const message = document.createElement("h2");
  message.textContent = "CRASH!";

  const subMessage = document.createElement("p");
  subMessage.textContent =
    "Your rocket has crashed. Click the Reset button to try again.";

  overlay.appendChild(message);
  overlay.appendChild(subMessage);

  document.body.appendChild(overlay);
  return overlay;
}

const crashOverlay = createCrashOverlay();

// Create out of fuel overlay
function createOutOfFuelOverlay() {
  const overlay = document.createElement("div");
  overlay.id = "out-of-fuel-overlay";
  overlay.style.position = "absolute";
  overlay.style.top = "50%";
  overlay.style.left = "50%";
  overlay.style.transform = "translate(-50%, -50%)";
  overlay.style.backgroundColor = "rgba(255, 165, 0, 0.3)"; // Orange background
  overlay.style.color = "white";
  overlay.style.padding = "20px";
  overlay.style.borderRadius = "10px";
  overlay.style.textAlign = "center";
  overlay.style.display = "none"; // Initially hidden
  overlay.style.zIndex = "1000";

  const message = document.createElement("h2");
  message.textContent = "OUT OF FUEL!";

  const subMessage = document.createElement("p");
  subMessage.textContent =
    "Your rocket has run out of fuel. Click the Reset button to try again.";

  overlay.appendChild(message);
  overlay.appendChild(subMessage);

  document.body.appendChild(overlay);
  return overlay;
}

const fuelOverlay = createOutOfFuelOverlay();

// Reset game function
function resetGame() {
  // Reset the rocket
  rocket.reset();

  // Reset the moon's position if it exists
  if (moon) {
    moon.orbitAngle = 0; // Reset orbit angle
    // Update the moon's position based on its orbit parameters
    const x = earth.position.x + Math.cos(moon.orbitAngle) * moon.orbitRadius;
    const y = earth.position.y + Math.sin(moon.orbitAngle) * moon.orbitRadius;
    const z = earth.position.z;
    moon.position.set(x, y, z);

    // Update mesh position
    if (moon.mesh) {
      moon.mesh.position.copy(moon.position);
    }

    // Update atmosphere position
    if (moon.atmosphere) {
      moon.atmosphere.position.copy(moon.position);
    }
  }

  // Reset Earth's rotation if it exists
  if (earth && earth.mesh) {
    // Reset rotation but keep tilt
    earth.mesh.rotation.set(earth.tilt * (Math.PI / 180), 0, 0);

    // Reset clouds rotation if they exist
    if (earth.clouds) {
      earth.clouds.rotation.set(0, 0, 0);
    }
  }

  resetButton.style.display = "none";
  crashOverlay.style.display = "none";
  fuelOverlay.style.display = "none";

  // Reset simulation speed to 1x
  currentSpeedIndex = 0;
  simulationSpeed = speedSettings[currentSpeedIndex];
  updateSpeedControls();
}

// Make resetGame available globally for the R key shortcut
window.resetGame = resetGame;

// Listen for rocket crash events
window.addEventListener("rocketCrash", () => {
  console.log("Rocket crashed!");
  resetButton.style.display = "block";
  crashOverlay.style.display = "block";
});

// Create clock for timing
const clock = new THREE.Clock();
clock.start(); // Explicitly start the clock

// Fixed time step for physics (60 updates per second)
const fixedTimeStep = 1 / 60;
let accumulator = 0;

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  // Get elapsed time since last frame, capped to prevent large jumps
  const frameTime = Math.min(clock.getDelta(), 0.25);

  // Apply simulation speed multiplier
  const scaledFrameTime = frameTime * simulationSpeed;
  accumulator += scaledFrameTime;

  // Run physics updates at fixed time steps for stability
  while (accumulator >= fixedTimeStep) {
    // Update celestial bodies
    for (const body of celestialBodies) {
      body.update(fixedTimeStep);
    }

    updateControls(rocket, fixedTimeStep);
    rocket.update(fixedTimeStep);
    accumulator -= fixedTimeStep;
  }

  // Calculate altitude based on the closest celestial body
  let closestBody = null;
  let minDistance = Infinity;
  let altitude = 0;

  for (const body of celestialBodies) {
    const distanceVector = new THREE.Vector3()
      .copy(rocket.position)
      .sub(body.position);
    const distance = distanceVector.length() - body.radius;

    if (distance < minDistance) {
      minDistance = distance;
      closestBody = body;
      altitude = distance;
    }
  }

  // If no bodies found, fallback to Earth calculation
  if (!closestBody && earthRadius) {
    altitude = rocket.position.length() - earthRadius;
  }

  const speed = rocket.velocity.length();
  const fuelPercentage = rocket.getFuelPercentage();
  const isOutOfFuel = rocket.isOutOfFuel();
  const isInOrbit = rocket.isInStableOrbit();
  const orbitTime = rocket.getFormattedOrbitTime();

  // Update UI with all rocket information
  updateUI(
    altitude,
    speed,
    rocket.isCrashed(),
    fuelPercentage,
    isOutOfFuel,
    isInOrbit,
    orbitTime,
    simulationSpeed,
    closestBody ? closestBody.name : "Earth" // Add the name of the closest body
  );

  // Update debug overlay
  updateDebugOverlay();

  // Show out of fuel overlay if needed - updated for new Earth size
  if (
    isOutOfFuel &&
    !rocket.isCrashed() &&
    altitude < 3.0 &&
    fuelOverlay.style.display !== "block"
  ) {
    resetButton.style.display = "block";
    fuelOverlay.style.display = "block";
  }

  // Render the scene
  renderer.render(scene, camera);
}

// Create moon orbit controls
function createMoonOrbitControls() {
  if (!moon) return;

  const controlsContainer = document.createElement("div");
  controlsContainer.style.position = "absolute";
  controlsContainer.style.bottom = "10px";
  controlsContainer.style.right = "10px";
  controlsContainer.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
  controlsContainer.style.padding = "10px";
  controlsContainer.style.borderRadius = "5px";
  controlsContainer.style.color = "white";
  controlsContainer.style.fontFamily = "Arial, sans-serif";

  // Title
  const title = document.createElement("div");
  title.textContent = "Moon Orbit Controls";
  title.style.marginBottom = "10px";
  title.style.fontWeight = "bold";
  controlsContainer.appendChild(title);

  // Orbit Speed Control
  const speedContainer = document.createElement("div");
  speedContainer.style.marginBottom = "5px";

  const speedLabel = document.createElement("label");
  speedLabel.textContent = "Orbit Speed: ";
  speedLabel.setAttribute("for", "moon-orbit-speed");
  speedContainer.appendChild(speedLabel);

  const speedValue = document.createElement("span");
  speedValue.textContent = moon.orbitSpeed.toFixed(2);
  speedValue.id = "moon-orbit-speed-value";
  speedContainer.appendChild(speedValue);

  controlsContainer.appendChild(speedContainer);

  // Speed slider
  const speedSlider = document.createElement("input");
  speedSlider.type = "range";
  speedSlider.id = "moon-orbit-speed";
  speedSlider.min = "0.01";
  speedSlider.max = "0.5";
  speedSlider.step = "0.01";
  speedSlider.value = moon.orbitSpeed;
  speedSlider.style.width = "100%";

  speedSlider.addEventListener("input", (e) => {
    const newSpeed = parseFloat(e.target.value);
    moon.setOrbitParameters({ orbitSpeed: newSpeed });
    document.getElementById("moon-orbit-speed-value").textContent =
      newSpeed.toFixed(2);
  });

  controlsContainer.appendChild(speedSlider);

  // Orbit Radius Control
  const radiusContainer = document.createElement("div");
  radiusContainer.style.marginTop = "10px";
  radiusContainer.style.marginBottom = "5px";

  const radiusLabel = document.createElement("label");
  radiusLabel.textContent = "Orbit Radius: ";
  radiusLabel.setAttribute("for", "moon-orbit-radius");
  radiusContainer.appendChild(radiusLabel);

  const radiusValue = document.createElement("span");
  radiusValue.textContent = moon.orbitRadius.toFixed(1);
  radiusValue.id = "moon-orbit-radius-value";
  radiusContainer.appendChild(radiusValue);

  controlsContainer.appendChild(radiusContainer);

  // Radius slider
  const radiusSlider = document.createElement("input");
  radiusSlider.type = "range";
  radiusSlider.id = "moon-orbit-radius";
  radiusSlider.min = "3";
  radiusSlider.max = "10";
  radiusSlider.step = "0.1";
  radiusSlider.value = moon.orbitRadius;
  radiusSlider.style.width = "100%";

  radiusSlider.addEventListener("input", (e) => {
    const newRadius = parseFloat(e.target.value);
    moon.setOrbitParameters({ orbitRadius: newRadius });
    document.getElementById("moon-orbit-radius-value").textContent =
      newRadius.toFixed(1);
  });

  controlsContainer.appendChild(radiusSlider);

  // Direction Control
  const directionContainer = document.createElement("div");
  directionContainer.style.marginTop = "10px";

  const directionLabel = document.createElement("label");
  directionLabel.textContent = "Orbit Direction: ";
  directionLabel.setAttribute("for", "moon-orbit-direction");
  directionContainer.appendChild(directionLabel);

  const directionCheckbox = document.createElement("input");
  directionCheckbox.type = "checkbox";
  directionCheckbox.id = "moon-orbit-direction";
  directionCheckbox.checked = moon.orbitClockwise;

  directionCheckbox.addEventListener("change", (e) => {
    moon.setOrbitParameters({ orbitClockwise: e.target.checked });
  });

  directionContainer.appendChild(directionCheckbox);

  const directionText = document.createElement("span");
  directionText.textContent = " Clockwise";
  directionText.style.marginLeft = "5px";
  directionContainer.appendChild(directionText);

  controlsContainer.appendChild(directionContainer);

  // Add to document
  document.body.appendChild(controlsContainer);
}

// Create Earth rotation controls
function createEarthRotationControls() {
  if (!earth) return;

  const controlsContainer = document.createElement("div");
  controlsContainer.style.position = "absolute";
  controlsContainer.style.top = "10px";
  controlsContainer.style.right = "10px";
  controlsContainer.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
  controlsContainer.style.padding = "10px";
  controlsContainer.style.borderRadius = "5px";
  controlsContainer.style.color = "white";
  controlsContainer.style.fontFamily = "Arial, sans-serif";

  // Title
  const title = document.createElement("div");
  title.textContent = "Earth Rotation Controls";
  title.style.marginBottom = "10px";
  title.style.fontWeight = "bold";
  controlsContainer.appendChild(title);

  // Earth Rotation Speed Control
  const speedContainer = document.createElement("div");
  speedContainer.style.marginBottom = "5px";

  const speedLabel = document.createElement("label");
  speedLabel.textContent = "Earth Rotation: ";
  speedLabel.setAttribute("for", "earth-rotation-speed");
  speedContainer.appendChild(speedLabel);

  const speedValue = document.createElement("span");
  speedValue.textContent = earth.rotationSpeed.toFixed(2);
  speedValue.id = "earth-rotation-speed-value";
  speedContainer.appendChild(speedValue);

  controlsContainer.appendChild(speedContainer);

  // Speed slider
  const speedSlider = document.createElement("input");
  speedSlider.type = "range";
  speedSlider.id = "earth-rotation-speed";
  speedSlider.min = "0";
  speedSlider.max = "0.2";
  speedSlider.step = "0.01";
  speedSlider.value = earth.rotationSpeed;
  speedSlider.style.width = "100%";

  speedSlider.addEventListener("input", (e) => {
    const newSpeed = parseFloat(e.target.value);
    earth.rotationSpeed = newSpeed;
    document.getElementById("earth-rotation-speed-value").textContent =
      newSpeed.toFixed(2);

    // Update clouds rotation speed to be slightly faster
    earth.cloudsRotationSpeed = newSpeed * 1.4;
  });

  controlsContainer.appendChild(speedSlider);

  // Add to document
  document.body.appendChild(controlsContainer);
}

// Create UI elements
createSpeedControls();
createResetButton();
createZoomIndicator();
createCrashOverlay();
createOutOfFuelOverlay();
createMoonOrbitControls(); // Add moon orbit controls
createEarthRotationControls(); // Add Earth rotation controls
createDebugOverlay(); // Add debug overlay
createOrbitAchievedFeedback(); // Add orbit achieved feedback
createCrashEffectFeedback(); // Add crash effect feedback
createHelpOverlay(); // Add help overlay

// Create debug overlay
function createDebugOverlay() {
  const debugContainer = document.createElement("div");
  debugContainer.id = "debug-overlay";
  debugContainer.style.position = "absolute";
  debugContainer.style.top = "10px";
  debugContainer.style.left = "10px";
  debugContainer.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
  debugContainer.style.padding = "10px";
  debugContainer.style.borderRadius = "5px";
  debugContainer.style.color = "white";
  debugContainer.style.fontFamily = "monospace";
  debugContainer.style.fontSize = "12px";
  debugContainer.style.maxWidth = "300px";
  debugContainer.style.display = "none"; // Hidden by default

  // Create debug content
  const debugContent = document.createElement("pre");
  debugContent.id = "debug-content";
  debugContainer.appendChild(debugContent);

  // Create toggle button
  const toggleButton = document.createElement("button");
  toggleButton.textContent = "Toggle Debug Info";
  toggleButton.style.position = "absolute";
  toggleButton.style.top = "10px";
  toggleButton.style.left = "10px";
  toggleButton.style.padding = "5px";
  toggleButton.style.backgroundColor = "#333";
  toggleButton.style.color = "white";
  toggleButton.style.border = "none";
  toggleButton.style.borderRadius = "3px";
  toggleButton.style.cursor = "pointer";

  toggleButton.addEventListener("click", () => {
    const overlay = document.getElementById("debug-overlay");
    if (overlay.style.display === "none") {
      overlay.style.display = "block";
      toggleButton.style.display = "none";
    } else {
      overlay.style.display = "none";
    }
  });

  // Create close button
  const closeButton = document.createElement("button");
  closeButton.textContent = "×";
  closeButton.style.position = "absolute";
  closeButton.style.top = "5px";
  closeButton.style.right = "5px";
  closeButton.style.backgroundColor = "transparent";
  closeButton.style.color = "white";
  closeButton.style.border = "none";
  closeButton.style.fontSize = "16px";
  closeButton.style.cursor = "pointer";

  closeButton.addEventListener("click", () => {
    debugContainer.style.display = "none";
    toggleButton.style.display = "block";
  });

  debugContainer.appendChild(closeButton);
  document.body.appendChild(debugContainer);
  document.body.appendChild(toggleButton);

  return { debugContainer, debugContent, toggleButton };
}

// Update debug overlay
function updateDebugOverlay() {
  const debugContent = document.getElementById("debug-content");
  if (!debugContent || debugContent.parentElement.style.display === "none")
    return;

  const debugInfo = rocket.getDebugInfo();

  // Format the debug info
  let content = "";
  content += `Position: ${formatVector(debugInfo.position)}\n`;
  content += `Velocity: ${formatVector(debugInfo.velocity)}\n`;
  content += `Speed: ${debugInfo.speed.toFixed(2)}\n`;
  content += `Altitude: ${debugInfo.altitude.toFixed(2)}\n`;
  content += `Fuel: ${debugInfo.fuel.toFixed(1)}/${
    rocket.maxFuel
  } (${debugInfo.fuelPercentage.toFixed(1)}%)\n`;
  content += `In Orbit: ${debugInfo.isInOrbit ? "YES" : "NO"}\n`;

  if (debugInfo.isInOrbit) {
    content += `Orbit Period: ${debugInfo.orbitPeriod.toFixed(1)}s\n`;
  }

  // Calculate orbital parameters
  const closestBody = findClosestBody(rocket.position);
  if (closestBody) {
    const G = rocket.G;
    const M =
      closestBody.name === "Earth" ? 3 : closestBody.name === "Moon" ? 0.5 : 1;
    const distance = new THREE.Vector3()
      .copy(rocket.position)
      .sub(closestBody.position)
      .length();

    // Calculate escape velocity at current altitude
    const escapeVelocity = Math.sqrt((2 * G * M) / distance);

    // Calculate circular orbit velocity at current altitude
    const circularOrbitVelocity = Math.sqrt((G * M) / distance);

    content += `\nOrbital Parameters (${closestBody.name}):\n`;
    content += `Distance: ${distance.toFixed(2)}\n`;
    content += `Escape Velocity: ${escapeVelocity.toFixed(2)}\n`;
    content += `Circular Orbit Velocity: ${circularOrbitVelocity.toFixed(2)}\n`;
    content += `Current Speed: ${debugInfo.speed.toFixed(2)}\n`;

    // Calculate the angle between velocity and position vectors
    const positionVector = new THREE.Vector3()
      .copy(rocket.position)
      .sub(closestBody.position);
    const positionNorm = positionVector.clone().normalize();
    const velocityNorm = new THREE.Vector3().copy(rocket.velocity).normalize();
    const dotProduct = positionNorm.dot(velocityNorm);
    const angle =
      Math.acos(Math.min(1, Math.max(-1, dotProduct))) * (180 / Math.PI);

    content += `Velocity-Position Angle: ${angle.toFixed(1)}° (ideal: 90°)\n`;
  }

  debugContent.textContent = content;
}

// Helper function to format vectors
function formatVector(vec) {
  return `[${vec[0].toFixed(1)}, ${vec[1].toFixed(1)}, ${vec[2].toFixed(1)}]`;
}

// Helper function to find the closest celestial body
function findClosestBody(position) {
  let closestBody = null;
  let minDistance = Infinity;

  if (celestialBodies && celestialBodies.length > 0) {
    for (const body of celestialBodies) {
      const distance = new THREE.Vector3()
        .copy(position)
        .sub(body.position)
        .length();
      if (distance < minDistance) {
        minDistance = distance;
        closestBody = body;
      }
    }
  }

  return closestBody;
}

// Create orbit achieved feedback
function createOrbitAchievedFeedback() {
  // Create the overlay
  const overlay = document.createElement("div");
  overlay.id = "orbit-achieved-overlay";
  overlay.style.position = "absolute";
  overlay.style.top = "50%";
  overlay.style.left = "50%";
  overlay.style.transform = "translate(-50%, -50%)";
  overlay.style.backgroundColor = "rgba(0, 128, 0, 0.7)";
  overlay.style.color = "white";
  overlay.style.padding = "20px";
  overlay.style.borderRadius = "10px";
  overlay.style.textAlign = "center";
  overlay.style.fontFamily = "Arial, sans-serif";
  overlay.style.fontSize = "24px";
  overlay.style.fontWeight = "bold";
  overlay.style.display = "none";
  overlay.style.zIndex = "1000";
  overlay.style.pointerEvents = "none";
  overlay.textContent = "Stable Orbit Achieved!";

  document.body.appendChild(overlay);

  // Add event listener for orbit achieved
  window.addEventListener("orbitAchieved", () => {
    overlay.style.display = "block";

    // Play a success sound
    const audio = new Audio();
    audio.src =
      "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";
    audio.play().catch((e) => console.log("Audio play failed:", e));

    // Automatically zoom out to show the orbit
    setTimeout(() => {
      zoomToFitOrbit();
    }, 500); // Small delay to ensure orbit parameters are calculated

    // Hide the overlay after 3 seconds
    setTimeout(() => {
      overlay.style.display = "none";
    }, 3000);
  });

  return overlay;
}

// Create crash effect feedback
function createCrashEffectFeedback() {
  // Add event listener for crash effect
  window.addEventListener("rocketCrashEffect", () => {
    // Create explosion effect
    const explosion = document.createElement("div");
    explosion.style.position = "absolute";
    explosion.style.top = "50%";
    explosion.style.left = "50%";
    explosion.style.transform = "translate(-50%, -50%)";
    explosion.style.width = "100px";
    explosion.style.height = "100px";
    explosion.style.borderRadius = "50%";
    explosion.style.backgroundColor = "orange";
    explosion.style.boxShadow = "0 0 50px 20px rgba(255, 165, 0, 0.8)";
    explosion.style.zIndex = "1000";
    explosion.style.pointerEvents = "none";

    document.body.appendChild(explosion);

    // Play a crash sound
    const audio = new Audio();
    audio.src =
      "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";
    audio.play().catch((e) => console.log("Audio play failed:", e));

    // Animate the explosion
    let size = 100;
    let opacity = 1;
    const animate = () => {
      size += 5;
      opacity -= 0.02;

      explosion.style.width = `${size}px`;
      explosion.style.height = `${size}px`;
      explosion.style.opacity = opacity;

      if (opacity > 0) {
        requestAnimationFrame(animate);
      } else {
        document.body.removeChild(explosion);
      }
    };

    animate();
  });
}

// Create help overlay
function createHelpOverlay() {
  const helpContainer = document.createElement("div");
  helpContainer.id = "help-overlay";
  helpContainer.style.position = "absolute";
  helpContainer.style.top = "50%";
  helpContainer.style.left = "50%";
  helpContainer.style.transform = "translate(-50%, -50%)";
  helpContainer.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
  helpContainer.style.padding = "20px";
  helpContainer.style.borderRadius = "10px";
  helpContainer.style.color = "white";
  helpContainer.style.fontFamily = "Arial, sans-serif";
  helpContainer.style.fontSize = "16px";
  helpContainer.style.maxWidth = "500px";
  helpContainer.style.display = "none";
  helpContainer.style.zIndex = "1000";

  // Create help content
  const helpContent = document.createElement("div");
  helpContent.innerHTML = `
    <h2 style="text-align: center; margin-top: 0;">Game Controls</h2>
    <p><strong>Arrow Keys:</strong></p>
    <ul>
      <li>↑ - Apply thrust</li>
      <li>← → - Rotate rocket</li>
    </ul>
    <p><strong>Zoom Controls:</strong></p>
    <ul>
      <li><strong>Mouse Wheel</strong> - Zoom in/out</li>
      <li><strong>+</strong> - Zoom in</li>
      <li><strong>-</strong> - Zoom out</li>
      <li><strong>Z</strong> - Zoom to fit orbit (when in stable orbit)</li>
    </ul>
    <p><strong>Keyboard Shortcuts:</strong></p>
    <ul>
      <li><strong>R</strong> - Reset game</li>
      <li><strong>F</strong> - Refill fuel (when out of fuel)</li>
      <li><strong>C</strong> - Recover from crash</li>
      <li><strong>D</strong> - Toggle debug overlay</li>
      <li><strong>H</strong> - Toggle this help screen</li>
    </ul>
    <p><strong>Tips for Achieving Orbit:</strong></p>
    <ul>
      <li>Launch straight up until you reach an altitude of about 3 units</li>
      <li>Then gradually turn to the side to build horizontal velocity</li>
      <li>For a stable orbit, your velocity should be perpendicular to your position vector</li>
      <li>Your speed should be between the circular orbit velocity and escape velocity</li>
      <li>Use the debug overlay (press D) to see these values</li>
      <li>Zoom out (- key or mouse wheel) to see your full orbit path</li>
    </ul>
    <p style="text-align: center; margin-top: 20px;"><em>Press H to close this help</em></p>
  `;
  helpContainer.appendChild(helpContent);

  // Create close button
  const closeButton = document.createElement("button");
  closeButton.textContent = "×";
  closeButton.style.position = "absolute";
  closeButton.style.top = "10px";
  closeButton.style.right = "10px";
  closeButton.style.backgroundColor = "transparent";
  closeButton.style.color = "white";
  closeButton.style.border = "none";
  closeButton.style.fontSize = "24px";
  closeButton.style.cursor = "pointer";

  closeButton.addEventListener("click", () => {
    helpContainer.style.display = "none";
  });

  helpContainer.appendChild(closeButton);
  document.body.appendChild(helpContainer);

  // Show help on first load
  helpContainer.style.display = "block";

  return helpContainer;
}

// Start animation loop
animate();

// Add keyboard shortcuts
window.addEventListener("keydown", (event) => {
  // R key to reset game
  if (event.code === "KeyR") {
    resetGame();
  }

  // F key to refill fuel
  if (event.code === "KeyF") {
    if (rocket.isOutOfFuel()) {
      rocket.refillFuel();
      // Hide out of fuel overlay
      const fuelOverlay = document.getElementById("out-of-fuel-overlay");
      if (fuelOverlay) {
        fuelOverlay.style.display = "none";
      }
      console.log("Fuel refilled!");
    }
  }

  // C key to recover from crash
  if (event.code === "KeyC") {
    if (rocket.isCrashed()) {
      rocket.recoverFromCrash();
      // Hide crash overlay
      const crashOverlay = document.getElementById("crash-overlay");
      if (crashOverlay) {
        crashOverlay.style.display = "none";
      }
      console.log("Recovered from crash!");
    }
  }

  // D key to toggle debug overlay
  if (event.code === "KeyD") {
    const debugOverlay = document.getElementById("debug-overlay");
    const toggleButton = document.querySelector("button");
    if (debugOverlay) {
      if (debugOverlay.style.display === "none") {
        debugOverlay.style.display = "block";
        if (toggleButton) toggleButton.style.display = "none";
      } else {
        debugOverlay.style.display = "none";
        if (toggleButton) toggleButton.style.display = "block";
      }
    }
  }

  // H key to toggle help overlay
  if (event.code === "KeyH") {
    const helpOverlay = document.getElementById("help-overlay");
    if (helpOverlay) {
      helpOverlay.style.display =
        helpOverlay.style.display === "none" ? "block" : "none";
    }
  }

  // + key to zoom in (NumpadAdd or Equal with Shift)
  if (
    event.code === "NumpadAdd" ||
    (event.code === "Equal" && !event.shiftKey)
  ) {
    const newZ = camera.position.z - zoomSpeed;
    camera.position.z = Math.max(minZoom, newZ);
    updateZoomIndicator();
  }

  // - key to zoom out (NumpadSubtract or Minus)
  if (event.code === "NumpadSubtract" || event.code === "Minus") {
    const newZ = camera.position.z + zoomSpeed;
    camera.position.z = Math.min(maxZoom, newZ);
    updateZoomIndicator();
  }

  // Z key to zoom to fit orbit
  if (event.code === "KeyZ") {
    zoomToFitOrbit();
  }
});

// Function to zoom out to fit the entire orbit
function zoomToFitOrbit() {
  // Only zoom to fit if in orbit
  if (!rocket.isInStableOrbit()) return;

  // Find the closest celestial body
  const closestBody = findClosestBody(rocket.position);
  if (!closestBody) return;

  // Calculate the distance from the body to the rocket
  const distance = new THREE.Vector3()
    .copy(rocket.position)
    .sub(closestBody.position)
    .length();

  // Set camera position to see the entire orbit
  // Add a margin to ensure the entire orbit is visible
  const orbitSize = distance * 1.2;

  // Calculate new zoom level (camera.position.z)
  // We want to ensure the orbit is fully visible
  const newZoom = Math.max(orbitSize, minZoom);

  // Apply zoom with smooth transition
  const startZoom = camera.position.z;
  const zoomDifference = newZoom - startZoom;
  const zoomDuration = 1.0; // seconds
  let zoomTimer = 0;

  // Create animation function
  function animateZoom() {
    zoomTimer += 0.016; // Approximately 60fps
    const progress = Math.min(zoomTimer / zoomDuration, 1.0);

    // Use easing function for smooth transition
    const easedProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease out

    // Update camera position
    camera.position.z = startZoom + zoomDifference * easedProgress;

    // Update zoom indicator
    updateZoomIndicator();

    // Continue animation if not complete
    if (progress < 1.0) {
      requestAnimationFrame(animateZoom);
    }
  }

  // Start animation
  animateZoom();
}
