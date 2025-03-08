import * as THREE from "three";

export class Rocket {
  constructor() {
    this.initializeRocket();
  }

  // Initialize or reset the rocket
  initializeRocket() {
    // Earth radius is now 2 instead of 1
    const earthRadius = 2;

    // Create rocket mesh (simple cylinder) if it doesn't exist
    if (!this.mesh) {
      this.mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.2, 16),
        new THREE.MeshStandardMaterial({ color: 0xffffff })
      );

      // Create thrust indicator
      this.thrustIndicator = new THREE.Mesh(
        new THREE.ConeGeometry(0.03, 0.1, 8),
        new THREE.MeshBasicMaterial({
          color: 0xff3300,
          transparent: true,
          opacity: 0,
        })
      );
      this.thrustIndicator.position.y = -0.15; // Position at bottom of rocket
      this.thrustIndicator.rotation.z = Math.PI; // Point downward
      this.mesh.add(this.thrustIndicator);

      // Create trail
      const trailGeometry = new THREE.BufferGeometry();
      const trailMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.5,
      });
      this.trail = new THREE.Line(trailGeometry, trailMaterial);
    }

    // Reset position and orientation - adjusted for new Earth radius
    this.mesh.position.set(0, earthRadius + 0.05, 0); // Just above Earth surface
    this.mesh.rotation.z = 0; // Reset rotation

    // Reset physics properties
    this.mass = 2;
    this.position = this.mesh.position;
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.force = new THREE.Vector3(0, 0, 0);
    this.thrustDirection = new THREE.Vector3(0, 1, 0);
    this.thrustMagnitude = 0;

    // Earth properties
    this.earthRadius = earthRadius;
    this.earthMass = 1; // Arbitrary mass for Earth
    this.G = 0.4; // Gravitational constant

    // Orbit properties
    this.isInOrbit = false;
    this.orbitPeriod = 0; // Time in seconds for one complete orbit
    this.orbitDistance = 0; // Average distance from Earth center
    this.orbitSpeed = 0; // Average orbital speed

    // Fuel system
    this.maxFuel = 100;
    this.fuel = this.maxFuel;
    this.fuelConsumptionRate = 7; // Units per second at full thrust
    this.outOfFuel = false;

    // Reset trail
    this.trailPoints = [];
    this.trailMaxPoints = 100;
    this.trailUpdateInterval = 0.1;
    this.trailTimer = 0;
    this.trail.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(0), 3)
    );

    // Atmosphere parameters
    this.dragCoefficient = 0.005;
    this.atmosphereHeight = 3.0;

    // Reset simulation state
    this.hasStarted = false;
    this.hasCrashed = false;

    // Collision handling
    this.lastCollisionTime = 0;
    this.collisionCooldown = 0.5;
    this.crashVelocityThreshold = 0.3; // Velocity threshold for considering a crash
    this.crashCount = 0; // Count consecutive collisions
    this.maxCrashCount = 3; // Number of consecutive collisions before declaring a crash
  }

  applyGravity() {
    // Only apply gravity if the simulation has started
    if (!this.hasStarted || this.hasCrashed) return;

    const G = this.G; // Gravitational constant
    const M_earth = this.earthMass;
    const r = this.position.length();
    const directionToEarth = new THREE.Vector3()
      .copy(this.position)
      .negate()
      .normalize();
    const gravityMagnitude = (G * M_earth * this.mass) / (r * r);
    this.force.add(directionToEarth.multiplyScalar(gravityMagnitude));
  }

  applyDrag() {
    // Only apply drag if the simulation has started
    if (!this.hasStarted || this.hasCrashed) return;

    // Calculate altitude (distance from Earth's center minus Earth radius)
    const altitude = this.position.length() - this.earthRadius;

    // Only apply drag if within atmosphere
    if (altitude < this.atmosphereHeight) {
      // Drag decreases with altitude (linear falloff)
      const atmosphereDensity = 1 - altitude / this.atmosphereHeight;

      // Drag is proportional to velocity squared and in opposite direction
      const dragMagnitude =
        this.dragCoefficient * atmosphereDensity * this.velocity.lengthSq();

      if (this.velocity.lengthSq() > 0.0001) {
        // Avoid normalizing zero vector
        const dragForce = this.velocity
          .clone()
          .normalize()
          .multiplyScalar(-dragMagnitude);
        this.force.add(dragForce);
      }
    }
  }

  applyThrust() {
    // Don't apply thrust if crashed or out of fuel
    if (this.hasCrashed || this.outOfFuel) {
      this.thrustIndicator.material.opacity = 0;
      return;
    }

    // Apply thrust if there's fuel and thrust is requested
    if (this.thrustMagnitude > 0 && this.fuel > 0) {
      const thrustVector = this.thrustDirection
        .clone()
        .multiplyScalar(this.thrustMagnitude);
      this.force.add(thrustVector);

      // Update thrust indicator visibility
      this.thrustIndicator.material.opacity = 1;

      // Start the simulation when thrust is first applied
      if (!this.hasStarted) {
        this.hasStarted = true;
      }
    } else {
      // No thrust if no fuel or thrust not requested
      this.thrustIndicator.material.opacity = 0;
    }
  }

  consumeFuel(deltaTime) {
    // Only consume fuel if thrusting and has fuel
    if (this.thrustMagnitude > 0 && this.fuel > 0) {
      // Consume fuel based on thrust magnitude and time
      const fuelConsumed =
        this.fuelConsumptionRate * this.thrustMagnitude * deltaTime;
      this.fuel = Math.max(0, this.fuel - fuelConsumed);

      // Check if we've run out of fuel
      if (this.fuel <= 0) {
        this.fuel = 0;
        this.outOfFuel = true;
      }
    }
  }

  updateTrail(deltaTime) {
    // Only update trail if the simulation has started
    if (!this.hasStarted || this.hasCrashed) return;

    this.trailTimer += deltaTime;

    if (this.trailTimer >= this.trailUpdateInterval) {
      this.trailTimer = 0;

      // Add current position to trail
      this.trailPoints.push(this.position.clone());

      // Limit trail length
      if (this.trailPoints.length > this.trailMaxPoints) {
        this.trailPoints.shift();
      }

      // Update trail geometry
      const positions = new Float32Array(this.trailPoints.length * 3);

      for (let i = 0; i < this.trailPoints.length; i++) {
        positions[i * 3] = this.trailPoints[i].x;
        positions[i * 3 + 1] = this.trailPoints[i].y;
        positions[i * 3 + 2] = this.trailPoints[i].z;
      }

      this.trail.geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
      );
      this.trail.geometry.attributes.position.needsUpdate = true;
    }
  }

  // Calculate the orbital period using Kepler's Third Law
  calculateOrbitPeriod() {
    // Only calculate if we have sufficient velocity and altitude
    const altitude = this.position.length() - this.earthRadius;
    const speed = this.velocity.length();

    // Check if we're in a stable orbit
    if (altitude > 3.0 && speed > 0.5 && speed < 0.9) {
      this.isInOrbit = true;

      // Calculate semi-major axis (approximated as distance from Earth center)
      const semiMajorAxis = this.position.length();

      // Kepler's Third Law: T² = (4π²/GM) * a³
      // Where T is the orbital period, G is the gravitational constant,
      // M is the mass of the central body, and a is the semi-major axis
      const orbitalPeriod =
        2 *
        Math.PI *
        Math.sqrt(Math.pow(semiMajorAxis, 3) / (this.G * this.earthMass));

      // Store orbit properties
      this.orbitPeriod = orbitalPeriod;
      this.orbitDistance = semiMajorAxis;
      this.orbitSpeed = speed;

      return orbitalPeriod;
    } else {
      this.isInOrbit = false;
      this.orbitPeriod = 0;
      return 0;
    }
  }

  // Format the orbit time in minutes:seconds
  getFormattedOrbitTime() {
    if (!this.isInOrbit) return "N/A";

    const totalSeconds = Math.round(this.orbitPeriod);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  update(deltaTime) {
    // Skip physics updates if crashed
    if (this.hasCrashed) return;

    // Consume fuel if thrusting
    this.consumeFuel(deltaTime);

    this.force.set(0, 0, 0);
    this.applyGravity();
    this.applyDrag(); // Apply air resistance
    this.applyThrust();

    // Only update physics if the simulation has started or if rotation is happening
    if (this.hasStarted) {
      const acceleration = this.force.clone().divideScalar(this.mass);
      this.velocity.add(acceleration.multiplyScalar(deltaTime));
      this.position.add(this.velocity.clone().multiplyScalar(deltaTime));

      // Update collision cooldown
      this.lastCollisionTime += deltaTime;

      // Check for collision with Earth, but only if cooldown has elapsed
      if (
        this.position.length() < this.earthRadius &&
        this.lastCollisionTime > this.collisionCooldown
      ) {
        // Earth radius is now 2
        // Reset collision timer
        this.lastCollisionTime = 0;

        // Check if this is a crash (high velocity impact or multiple collisions)
        const impactVelocity = this.velocity.length();
        if (impactVelocity > this.crashVelocityThreshold) {
          this.crashCount++;

          // If we've had multiple high-velocity impacts, consider it a crash
          if (this.crashCount >= this.maxCrashCount) {
            this.hasCrashed = true;
            // Create a custom event for the crash
            const crashEvent = new CustomEvent("rocketCrash");
            window.dispatchEvent(crashEvent);
            return;
          }
        } else {
          // Reset crash count if this was a gentle collision
          this.crashCount = 0;
        }

        // Place rocket just above Earth surface in the same direction
        this.position.normalize().multiplyScalar(this.earthRadius + 0.05);

        // Dampen velocity to prevent excessive bouncing
        this.velocity.multiplyScalar(0.2);

        // Add a small upward impulse to help escape the surface
        if (this.thrustMagnitude > 0 && !this.outOfFuel) {
          const upwardImpulse = this.thrustDirection
            .clone()
            .multiplyScalar(0.1);
          this.velocity.add(upwardImpulse);
        }
      }

      // Calculate orbit period if we're moving
      if (this.velocity.lengthSq() > 0.01) {
        this.calculateOrbitPeriod();
      }
    }

    // Update mesh orientation (always allow rotation)
    const angle =
      Math.atan2(this.thrustDirection.y, this.thrustDirection.x) - Math.PI / 2;
    this.mesh.rotation.z = angle;

    // Update trail
    this.updateTrail(deltaTime);
  }

  setThrustMagnitude(mag) {
    // Don't allow thrust if crashed or out of fuel
    if (this.hasCrashed || this.outOfFuel) {
      this.thrustMagnitude = 0;
      return;
    }
    this.thrustMagnitude = mag;
  }

  rotate(angle) {
    // Don't allow rotation if crashed
    if (this.hasCrashed) return;
    this.thrustDirection.applyAxisAngle(new THREE.Vector3(0, 0, 1), angle);
  }

  // Method to add trail to scene
  addTrailToScene(scene) {
    scene.add(this.trail);
  }

  // Method to reset the rocket
  reset() {
    this.initializeRocket();
  }

  // Check if the rocket has crashed
  isCrashed() {
    return this.hasCrashed;
  }

  // Get fuel percentage (0-100)
  getFuelPercentage() {
    return (this.fuel / this.maxFuel) * 100;
  }

  // Check if out of fuel
  isOutOfFuel() {
    return this.outOfFuel;
  }

  // Check if in stable orbit
  isInStableOrbit() {
    return this.isInOrbit;
  }

  // Get orbit period in seconds
  getOrbitPeriod() {
    return this.orbitPeriod;
  }
}
