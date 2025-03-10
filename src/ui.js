export function updateUI(
  altitude,
  speed,
  isCrashed = false,
  fuelPercentage = 100,
  isOutOfFuel = false,
  isInOrbit = false,
  orbitTime = "N/A",
  simulationSpeed = 1,
  closestBody = "Earth"
) {
  document.getElementById("altitude").textContent = altitude.toFixed(2);
  document.getElementById("speed").textContent = speed.toFixed(2);

  // Add orbit status indicator and fuel gauge
  const orbitStatus = document.getElementById("orbit-status");
  const fuelGauge = document.getElementById("fuel-gauge");
  const orbitTimeElement = document.getElementById("orbit-time");
  const simSpeedElement = document.getElementById("sim-speed");
  const closestBodyElement = document.getElementById("closest-body");

  if (!orbitStatus) {
    const uiElement = document.getElementById("ui");

    // Add simulation speed indicator
    const simSpeedContainer = document.createElement("p");
    simSpeedContainer.innerHTML =
      'Simulation Speed: <span id="sim-speed">1x</span>';
    uiElement.appendChild(simSpeedContainer);

    // Add closest body indicator
    const closestBodyContainer = document.createElement("p");
    closestBodyContainer.innerHTML =
      'Closest Body: <span id="closest-body">Earth</span>';
    uiElement.appendChild(closestBodyContainer);

    // Add fuel gauge
    const fuelElement = document.createElement("div");
    fuelElement.innerHTML = `
      <p>Fuel: <span id="fuel-percentage">100</span>%</p>
      <div style="width: 100%; background-color: #333; height: 10px; border-radius: 5px;">
        <div id="fuel-gauge" style="width: 100%; background-color: #00ff00; height: 10px; border-radius: 5px;"></div>
      </div>
    `;
    uiElement.appendChild(fuelElement);

    // Add thrust indicator
    const thrustElement = document.createElement("p");
    thrustElement.innerHTML = 'Thrust: <span id="thrust-indicator">OFF</span>';
    uiElement.appendChild(thrustElement);

    // Add status element
    const statusElement = document.createElement("p");
    statusElement.innerHTML =
      'Status: <span id="orbit-status">Ready to Launch</span>';
    uiElement.appendChild(statusElement);

    // Add orbit time element
    const orbitTimeContainer = document.createElement("p");
    orbitTimeContainer.innerHTML =
      'Orbit Time: <span id="orbit-time">N/A</span>';
    orbitTimeContainer.style.display = "none"; // Initially hidden
    orbitTimeContainer.id = "orbit-time-container";
    uiElement.appendChild(orbitTimeContainer);

    // Add orbit parameters
    const orbitInfoElement = document.createElement("div");
    orbitInfoElement.id = "orbit-info";
    orbitInfoElement.style.display = "none";
    orbitInfoElement.innerHTML = `
      <p>Orbit Parameters:</p>
      <p>Apoapsis: <span id="apoapsis">0</span> units</p>
      <p>Periapsis: <span id="periapsis">0</span> units</p>
    `;
    uiElement.appendChild(orbitInfoElement);

    // Add debug info
    const debugElement = document.createElement("div");
    debugElement.id = "debug-info";
    debugElement.style.fontSize = "0.8em";
    debugElement.style.opacity = "0.7";
    debugElement.style.marginTop = "10px";
    debugElement.innerHTML = `
      <p>Gravity: Increased for more realistic liftoff challenge</p>
      <p>Drag: Minimal to help achieve orbit</p>
      <p>Speed Controls: Press 1, 2, or 3 to change simulation speed</p>
    `;
    uiElement.appendChild(debugElement);
  } else {
    // Update simulation speed
    if (simSpeedElement) {
      simSpeedElement.textContent = `${simulationSpeed}x`;

      // Highlight speed when it's not 1x
      if (simulationSpeed > 1) {
        simSpeedElement.style.color = "#ffcc00";
        simSpeedElement.style.fontWeight = "bold";
      } else {
        simSpeedElement.style.color = "white";
        simSpeedElement.style.fontWeight = "normal";
      }
    }

    // Update fuel gauge
    const fuelPercentageElement = document.getElementById("fuel-percentage");
    if (fuelPercentageElement) {
      fuelPercentageElement.textContent = Math.round(fuelPercentage);
    }

    const fuelGauge = document.getElementById("fuel-gauge");
    if (fuelGauge) {
      fuelGauge.style.width = `${fuelPercentage}%`;

      // Change color based on fuel level
      if (fuelPercentage > 60) {
        fuelGauge.style.backgroundColor = "#00ff00"; // Green
      } else if (fuelPercentage > 30) {
        fuelGauge.style.backgroundColor = "#ffcc00"; // Yellow
      } else {
        fuelGauge.style.backgroundColor = "#ff3300"; // Red
      }
    }

    // Update thrust indicator
    const thrustIndicator = document.getElementById("thrust-indicator");
    if (thrustIndicator) {
      // Check if up arrow is pressed (simple approximation)
      const isThrusting =
        document
          .querySelector(".key:nth-child(2)")
          .parentElement.nextElementSibling.querySelector(".key").parentElement
          .style.color === "yellow";

      if (isOutOfFuel) {
        thrustIndicator.textContent = "NO FUEL";
        thrustIndicator.style.color = "#ff3300";
      } else {
        thrustIndicator.textContent = isThrusting && !isCrashed ? "ON" : "OFF";
        thrustIndicator.style.color =
          isThrusting && !isCrashed ? "#00ff00" : "#ff0000";
      }
    }

    // Update orbit time display
    const orbitTimeContainer = document.getElementById("orbit-time-container");
    if (orbitTimeContainer) {
      if (isInOrbit) {
        orbitTimeContainer.style.display = "block";
        const orbitTimeElement = document.getElementById("orbit-time");
        if (orbitTimeElement) {
          orbitTimeElement.textContent = orbitTime;
        }
      } else {
        orbitTimeContainer.style.display = "none";
      }
    }

    // Update closest body
    if (closestBodyElement) {
      closestBodyElement.textContent = closestBody;
    }

    // Determine orbit status based on altitude and speed
    const orbitInfoElement = document.getElementById("orbit-info");

    // If crashed, update status
    if (isCrashed) {
      orbitStatus.textContent = "CRASHED";
      orbitStatus.style.color = "#ff0000";
      if (orbitInfoElement) orbitInfoElement.style.display = "none";
      return;
    }

    // If out of fuel but not in orbit, show warning
    if (isOutOfFuel && altitude < 3.0) {
      orbitStatus.textContent = "OUT OF FUEL";
      orbitStatus.style.color = "#ff3300";
      if (orbitInfoElement) orbitInfoElement.style.display = "none";
      return;
    }

    // Adjusted orbit detection parameters for larger Earth (radius 2 instead of 1)
    if (isInOrbit) {
      orbitStatus.textContent = "In Stable Orbit!";
      orbitStatus.style.color = "#00ff00";

      // Show orbit parameters
      if (orbitInfoElement) {
        orbitInfoElement.style.display = "block";
        // Simplified orbit parameters (in a real simulation these would be calculated properly)
        document.getElementById("apoapsis").textContent = (
          altitude + 0.2
        ).toFixed(2);
        document.getElementById("periapsis").textContent = (
          altitude - 0.2
        ).toFixed(2);
      }
    } else if (altitude > 3.0 && speed >= 0.9) {
      orbitStatus.textContent = "Escape Trajectory";
      orbitStatus.style.color = "#ff9900";
      if (orbitInfoElement) orbitInfoElement.style.display = "none";
    } else if (speed === 0) {
      orbitStatus.textContent = "Ready to Launch";
      orbitStatus.style.color = "#ffffff";
      if (orbitInfoElement) orbitInfoElement.style.display = "none";
    } else if (altitude < 0.1) {
      orbitStatus.textContent = "On Launchpad";
      orbitStatus.style.color = "#ffffff";
      if (orbitInfoElement) orbitInfoElement.style.display = "none";
    } else if (altitude > 0) {
      orbitStatus.textContent = "Sub-orbital";
      orbitStatus.style.color = "#ffff00";
      if (orbitInfoElement) orbitInfoElement.style.display = "none";
    } else {
      orbitStatus.textContent = "Crashed";
      orbitStatus.style.color = "#ff0000";
      if (orbitInfoElement) orbitInfoElement.style.display = "none";
    }
  }
}
