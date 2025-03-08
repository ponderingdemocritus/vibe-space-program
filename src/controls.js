const keys = {};

window.addEventListener("keydown", (event) => {
  keys[event.code] = true;
  // Prevent default behavior for arrow keys to avoid page scrolling
  if (
    ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)
  ) {
    event.preventDefault();
  }
});

window.addEventListener("keyup", (event) => {
  keys[event.code] = false;
});

export function updateControls(rocket, deltaTime) {
  const rotationSpeed = 1.5; // Radians per second (reduced for more precise control)
  const thrustPower = 0.3; // Significantly increased from 0.15 to 0.3 for guaranteed liftoff

  if (keys["ArrowLeft"]) {
    rocket.rotate(rotationSpeed * deltaTime);
  }
  if (keys["ArrowRight"]) {
    rocket.rotate(-rotationSpeed * deltaTime);
  }

  // Set thrust based on up arrow key
  rocket.setThrustMagnitude(keys["ArrowUp"] ? thrustPower : 0);
}
