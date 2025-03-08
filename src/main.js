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
const { scene, rocket, earthRadius } = createScene();
const camera = new THREE.PerspectiveCamera(
  60, // Reduced FOV for better zoom effect
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
// Move camera closer to make Earth appear larger
camera.position.set(0, 0, 6);
camera.lookAt(0, 0, 0);

// Simulation speed settings
const speedSettings = [1, 5, 100]; // Available speed multipliers
let currentSpeedIndex = 0; // Start at normal speed (1x)
let simulationSpeed = speedSettings[currentSpeedIndex];

// Zoom controls
const minZoom = 3; // Closest zoom (very close to Earth)
const maxZoom = 15; // Furthest zoom (see more of space)
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
  indicator.innerHTML = `
    <p>Zoom Controls:</p>
    <p>Mouse Wheel or +/- Keys</p>
  `;

  document.body.appendChild(indicator);
  return indicator;
}

createZoomIndicator();

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
  overlay.id = "fuel-overlay";
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
  rocket.reset();
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
    updateControls(rocket, fixedTimeStep);
    rocket.update(fixedTimeStep);
    accumulator -= fixedTimeStep;
  }

  // Calculate altitude (distance from Earth's center minus Earth radius)
  const altitude = rocket.position.length() - earthRadius; // Use the actual Earth radius
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
    simulationSpeed
  );

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

  // Render scene
  renderer.render(scene, camera);
}

// Start animation loop
animate();
