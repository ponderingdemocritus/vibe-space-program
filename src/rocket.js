import * as THREE from "three";

export class Rocket {
  constructor(celestialBodies = []) {
    this.celestialBodies = celestialBodies;
    this.initializeRocket();
  }

  // Initialize or reset the rocket
  initializeRocket() {
    // Get the primary body (Earth) from the celestial bodies array
    const primaryBody =
      this.celestialBodies && this.celestialBodies.length > 0
        ? this.celestialBodies[0]
        : null;

    // Set default values if no primary body
    this.earthRadius = primaryBody ? primaryBody.radius : 2;
    this.earthMass = 3; // Game-appropriate Earth mass (was using real Earth mass)
    this.G = 0.3; // Game gravitational constant (was using real G constant)

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

    // Reset position and orientation
    if (primaryBody) {
      // Position just above the primary body (Earth)
      const startPosition = new THREE.Vector3(0, primaryBody.radius + 0.1, 0);
      startPosition.add(primaryBody.position); // Add the body's position
      this.mesh.position.copy(startPosition);
    } else {
      // Fallback to default position
      this.mesh.position.set(0, this.earthRadius + 0.1, 0); // Just above Earth surface
    }

    this.mesh.rotation.z = 0; // Reset rotation

    // Reset physics properties
    this.mass = 2;
    this.position = this.mesh.position;
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.force = new THREE.Vector3(0, 0, 0);

    // Set thrust direction to point away from the primary body
    if (primaryBody) {
      // Calculate direction from primary body to rocket
      this.thrustDirection = new THREE.Vector3()
        .copy(this.position)
        .sub(primaryBody.position)
        .normalize();
    } else {
      // Default thrust direction (up)
      this.thrustDirection = new THREE.Vector3(0, 1, 0);
    }

    this.thrustMagnitude = 0;

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

    // Reset trail using a fixed-size circular buffer
    this.trailMaxPoints = 100;
    this.trailPoints = new Array(this.trailMaxPoints).fill(null);
    this.trailIndex = 0;
    this.trailCount = 0;
    this.trailUpdateInterval = 0.1;
    this.trailTimer = 0;

    // Initialize trail geometry with empty positions
    const positions = new Float32Array(this.trailMaxPoints * 3);
    this.trail.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );

    // Atmosphere parameters
    this.dragCoefficient = 0.005;
    this.atmosphereHeight = 3.0;

    // Reset simulation state
    this.hasStarted = false;
    this.hasCrashed = false;
    this.crashCount = 0;
    this.crashVelocityThreshold = 0.5; // Not used anymore since any collision causes a crash
    this.lastCollisionTime = 0;
    this.collisionCooldown = 0.1; // Reduced from 0.5 to make collision detection more responsive
    this.maxCrashCount = 1; // Reduced from 3 to 1 since any collision should cause a crash

    // Feedback flags
    this.orbitFeedbackTriggered = false;
    this.crashEffectTriggered = false;
  }

  applyGravity() {
    // Only apply gravity if the simulation has started
    if (!this.hasStarted || this.hasCrashed) return;

    // Apply gravity from each celestial body, but only consider nearby bodies
    if (this.celestialBodies && this.celestialBodies.length > 0) {
      for (const body of this.celestialBodies) {
        // Calculate distance to the body
        const distanceVector = new THREE.Vector3()
          .copy(this.position)
          .sub(body.position);
        const distance = distanceVector.length();

        // Only consider bodies that are close enough to have significant gravity
        // (typically within 10x the body's radius)
        if (distance < body.radius * 20) {
          // Calculate gravity force from this body
          const gravityForce = body.calculateGravityForce(
            this.position,
            this.mass
          );

          // Add the force to the rocket
          this.force.add(gravityForce);
        }
      }
    } else {
      // Fallback to original Earth-only gravity calculation
      const G = this.G; // Gravitational constant
      const M_earth = this.earthMass;
      const r = this.position.length();

      // Add stronger gravity near the surface to make liftoff more challenging
      let gravityMultiplier = 1.0;
      const altitude = r - this.earthRadius;
      if (altitude < 1.0) {
        // Increase gravity strength near the surface
        gravityMultiplier = 1.0 + (1.0 - altitude) * 0.5;
      }

      const directionToEarth = new THREE.Vector3()
        .copy(this.position)
        .negate()
        .normalize();
      const gravityMagnitude =
        ((G * M_earth * this.mass) / (r * r)) * gravityMultiplier;
      this.force.add(directionToEarth.multiplyScalar(gravityMagnitude));
    }
  }

  applyDrag() {
    // Only apply drag if the simulation has started
    if (!this.hasStarted || this.hasCrashed) return;

    // Apply drag from celestial bodies with atmospheres
    if (this.celestialBodies && this.celestialBodies.length > 0) {
      for (const body of this.celestialBodies) {
        // Skip bodies without atmospheres
        if (!body.hasAtmosphere) continue;

        // Calculate distance from body center
        const distanceVector = new THREE.Vector3()
          .copy(this.position)
          .sub(body.position);
        const distance = distanceVector.length();

        // Calculate altitude above body surface
        const altitude = distance - body.radius;

        // Only apply drag if within atmosphere (default atmosphere height is 3.0)
        const atmosphereHeight = 3.0;
        if (altitude < atmosphereHeight) {
          // Use exponential decay model for more realistic atmospheric density
          // Density decreases exponentially with altitude
          const scaleHeight = atmosphereHeight / 3; // Scale height is typically 1/3 of atmosphere height
          const atmosphereDensity = Math.exp(-altitude / scaleHeight);

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

          // Only apply drag from one body (the closest one with atmosphere)
          break;
        }
      }
    } else {
      // Fallback to original Earth-only drag calculation
      // Calculate altitude (distance from Earth's center minus Earth radius)
      const altitude = this.position.length() - this.earthRadius;

      // Only apply drag if within atmosphere
      if (altitude < this.atmosphereHeight) {
        // Use exponential decay model for more realistic atmospheric density
        const scaleHeight = this.atmosphereHeight / 3;
        const atmosphereDensity = Math.exp(-altitude / scaleHeight);

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

        // Add a small upward impulse to help with takeoff
        // This prevents the rocket from getting stuck on the surface
        const upwardImpulse = this.thrustDirection.clone().multiplyScalar(0.05);
        this.velocity.add(upwardImpulse);
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
    if (!this.hasStarted || this.hasCrashed) return;

    this.trailTimer += deltaTime;
    if (this.trailTimer >= this.trailUpdateInterval) {
      this.trailTimer = 0;

      // Add current position to trail
      this.trailPoints[this.trailIndex] = this.position.clone();
      this.trailIndex = (this.trailIndex + 1) % this.trailMaxPoints;
      this.trailCount = Math.min(this.trailCount + 1, this.trailMaxPoints);

      // Update trail geometry
      const positions = new Float32Array(this.trailMaxPoints * 3);

      for (let i = 0; i < this.trailCount; i++) {
        const pointIndex =
          (this.trailIndex - this.trailCount + i + this.trailMaxPoints) %
          this.trailMaxPoints;
        const point = this.trailPoints[pointIndex];

        if (point) {
          positions[i * 3] = point.x;
          positions[i * 3 + 1] = point.y;
          positions[i * 3 + 2] = point.z;
        }
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
    // Find the closest celestial body
    let closestBody = null;
    let minDistance = Infinity;

    if (this.celestialBodies && this.celestialBodies.length > 0) {
      for (const body of this.celestialBodies) {
        const distanceVector = new THREE.Vector3()
          .copy(this.position)
          .sub(body.position);
        const distance = distanceVector.length();

        if (distance < minDistance) {
          minDistance = distance;
          closestBody = body;
        }
      }
    }

    // If no closest body found, use default Earth values
    if (!closestBody) {
      closestBody = {
        name: "Earth",
        radius: this.earthRadius,
        mass: this.earthMass,
        position: new THREE.Vector3(0, 0, 0),
      };
    }

    // Calculate altitude from the closest body
    const altitude = minDistance - closestBody.radius;
    const speed = this.velocity.length();

    // Calculate orbital parameters
    const G = this.G;
    const M =
      closestBody.name === "Earth" ? 3 : closestBody.name === "Moon" ? 0.5 : 1;

    // Calculate escape velocity at current altitude
    const escapeVelocity = Math.sqrt((2 * G * M) / minDistance);

    // Calculate circular orbit velocity at current altitude
    const circularOrbitVelocity = Math.sqrt((G * M) / minDistance);

    // Adjust orbit detection parameters based on the body
    const minAltitude = closestBody.name === "Earth" ? 2.0 : 1.0; // Lower minimum altitude
    const minSpeed = circularOrbitVelocity * 0.8; // 80% of circular orbit velocity
    const maxSpeed = escapeVelocity * 0.9; // 90% of escape velocity

    // Check if we're in a stable orbit
    // 1. Altitude must be above minimum
    // 2. Speed must be between min and max (not too slow to fall, not too fast to escape)
    // 3. Velocity must be mostly perpendicular to position vector (orbital motion)
    if (altitude > minAltitude && speed > minSpeed && speed < maxSpeed) {
      // Calculate the angle between velocity and position vectors
      const positionNorm = new THREE.Vector3()
        .copy(this.position)
        .sub(closestBody.position)
        .normalize();
      const velocityNorm = new THREE.Vector3().copy(this.velocity).normalize();
      const dotProduct = positionNorm.dot(velocityNorm);

      // Dot product close to 0 means vectors are perpendicular (good orbital motion)
      // Allow some deviation (±0.5) from perfect perpendicular
      if (Math.abs(dotProduct) < 0.5) {
        this.isInOrbit = true;

        // Calculate semi-major axis (approximated as distance from body's center)
        const semiMajorAxis = minDistance;

        // Kepler's Third Law: T² = (4π²/GM) * a³
        const orbitalPeriod = Math.sqrt(
          ((4 * Math.PI * Math.PI) / (G * M)) * Math.pow(semiMajorAxis, 3)
        );

        this.orbitPeriod = orbitalPeriod;

        // Trigger orbit feedback if not already triggered
        if (!this.orbitFeedbackTriggered) {
          window.dispatchEvent(new CustomEvent("orbitAchieved"));
          this.orbitFeedbackTriggered = true;
        }

        return orbitalPeriod;
      }
    }

    // Not in orbit
    this.isInOrbit = false;
    this.orbitPeriod = 0;
    this.orbitFeedbackTriggered = false;
    return 0;
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

      // Prevent NaN or Infinity in position or velocity
      if (
        !isFinite(this.position.length()) ||
        !isFinite(this.velocity.length())
      ) {
        console.warn("Invalid physics state detected, resetting velocity.");
        this.velocity.set(0, 0, 0);
      }

      // Update collision cooldown
      this.lastCollisionTime += deltaTime;

      // Check for collision with any celestial body, but only if cooldown has elapsed
      if (this.lastCollisionTime > this.collisionCooldown) {
        let collisionDetected = false;

        if (this.celestialBodies && this.celestialBodies.length > 0) {
          for (const body of this.celestialBodies) {
            if (body.checkCollision(this.position, 0.1)) {
              collisionDetected = true;

              // Reset collision timer
              this.lastCollisionTime = 0;

              // Get impact velocity
              const impactVelocity = this.velocity.length();

              // Only crash if the rocket is moving at a significant speed
              // AND the simulation has started (thrust has been applied)
              if (impactVelocity > 0.3 && this.hasStarted) {
                this.hasCrashed = true;

                // Create a custom event for the crash
                const crashEvent = new CustomEvent("rocketCrash");
                window.dispatchEvent(crashEvent);

                // Trigger crash effect if not already triggered
                if (!this.crashEffectTriggered) {
                  window.dispatchEvent(new CustomEvent("rocketCrashEffect"));
                  this.crashEffectTriggered = true;
                }

                return;
              } else {
                // For low-velocity collisions or before simulation starts,
                // just stop the rocket - this allows it to sit on the surface

                // Calculate normal vector (direction from body center to rocket)
                const normal = new THREE.Vector3()
                  .copy(this.position)
                  .sub(body.position)
                  .normalize();

                // Move slightly away from the surface to prevent getting stuck
                this.position.copy(
                  normal.multiplyScalar(body.radius + 0.1).add(body.position)
                );

                // Zero out velocity in the normal direction (stop falling)
                const normalVelocity = normal
                  .clone()
                  .multiplyScalar(this.velocity.dot(normal));
                this.velocity.sub(normalVelocity);

                // Add a small damping to horizontal velocity to simulate friction
                this.velocity.multiplyScalar(0.95);
              }

              break; // Only handle one collision per frame
            }
          }
        } else {
          // Fallback to original Earth-only collision detection
          if (this.position.length() < this.earthRadius) {
            collisionDetected = true;

            // Reset collision timer
            this.lastCollisionTime = 0;

            // Get impact velocity
            const impactVelocity = this.velocity.length();

            // Only crash if the rocket is moving at a significant speed
            // AND the simulation has started (thrust has been applied)
            if (impactVelocity > 0.3 && this.hasStarted) {
              this.hasCrashed = true;

              // Create a custom event for the crash
              const crashEvent = new CustomEvent("rocketCrash");
              window.dispatchEvent(crashEvent);

              // Trigger crash effect if not already triggered
              if (!this.crashEffectTriggered) {
                window.dispatchEvent(new CustomEvent("rocketCrashEffect"));
                this.crashEffectTriggered = true;
              }

              return;
            } else {
              // For low-velocity collisions or before simulation starts,
              // just stop the rocket - this allows it to sit on the surface

              // Calculate normal vector (direction from Earth center to rocket)
              const normal = new THREE.Vector3()
                .copy(this.position)
                .normalize();

              // Move slightly away from the surface to prevent getting stuck
              this.position.copy(normal.multiplyScalar(this.earthRadius + 0.1));

              // Zero out velocity in the normal direction (stop falling)
              const normalVelocity = normal
                .clone()
                .multiplyScalar(this.velocity.dot(normal));
              this.velocity.sub(normalVelocity);

              // Add a small damping to horizontal velocity to simulate friction
              this.velocity.multiplyScalar(0.95);
            }
          }
        }

        // Reset crash count if no collision
        if (!collisionDetected) {
          this.crashCount = 0;
        }
      }

      // Update the rocket's position and rotation
      this.mesh.position.copy(this.position);

      // Update the trail
      this.updateTrail(deltaTime);

      // Calculate orbit parameters
      this.calculateOrbitPeriod();
    }

    // Update mesh orientation (always allow rotation even if not started)
    const angle =
      Math.atan2(this.thrustDirection.y, this.thrustDirection.x) - Math.PI / 2;
    this.mesh.rotation.z = angle;
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

    // Apply rotation to thrust direction
    this.thrustDirection.applyAxisAngle(new THREE.Vector3(0, 0, 1), angle);

    // Normalize to prevent any potential floating-point errors
    this.thrustDirection.normalize();

    // Debug log to verify rotation is being called
    console.log("Rotating rocket, new direction:", this.thrustDirection);
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

  // Method to refill fuel
  refillFuel(amount = this.maxFuel) {
    this.fuel = Math.min(this.maxFuel, this.fuel + amount);
    this.outOfFuel = this.fuel <= 0;
    return this.fuel;
  }

  // Method to recover from a crash
  recoverFromCrash() {
    this.hasCrashed = false;
    this.crashCount = 0;
    this.crashEffectTriggered = false;
    this.velocity.set(0, 0, 0); // Reset motion

    // Refill fuel
    this.refillFuel();

    return true;
  }

  // Method to get debug info
  getDebugInfo() {
    return {
      position: this.position.toArray(),
      velocity: this.velocity.toArray(),
      speed: this.velocity.length(),
      force: this.force.toArray(),
      fuel: this.fuel,
      fuelPercentage: this.getFuelPercentage(),
      isOutOfFuel: this.outOfFuel,
      isInOrbit: this.isInOrbit,
      orbitPeriod: this.orbitPeriod,
      hasCrashed: this.hasCrashed,
      hasStarted: this.hasStarted,
      altitude: this.position.length() - this.earthRadius,
      thrustDirection: this.thrustDirection.toArray(),
      thrustMagnitude: this.thrustMagnitude,
      lastCollisionTime: this.lastCollisionTime,
      collisionCooldown: this.collisionCooldown,
    };
  }
}
