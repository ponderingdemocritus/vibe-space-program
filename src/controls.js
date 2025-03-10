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
  const thrustPower = 0.6; // Increased to 0.6 to compensate for stronger gravity

  if (keys["ArrowLeft"]) {
    console.log("Left arrow pressed, rotating clockwise");
    rocket.rotate(rotationSpeed * deltaTime);
  }
  if (keys["ArrowRight"]) {
    console.log("Right arrow pressed, rotating counter-clockwise");
    rocket.rotate(-rotationSpeed * deltaTime);
  }

  // Set thrust based on up arrow key
  rocket.setThrustMagnitude(keys["ArrowUp"] ? thrustPower : 0);
}
