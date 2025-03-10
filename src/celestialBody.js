import * as THREE from "three";

export class CelestialBody {
  constructor(options = {}) {
    // Default properties
    this.name = options.name || "Unnamed Body";
    this.radius = options.radius || 1.0;
    this.mass = options.mass || 1.0;
    this.position = options.position || new THREE.Vector3(0, 0, 0);
    this.color = options.color || 0x0077ff;
    this.hasAtmosphere =
      options.hasAtmosphere !== undefined ? options.hasAtmosphere : true;
    this.atmosphereColor = options.atmosphereColor || 0x4ca6ff;
    this.atmosphereThickness = options.atmosphereThickness || 0.025;
    this.atmosphereOpacity = options.atmosphereOpacity || 0.2;
    this.surfaceDetail = options.surfaceDetail || 64;
    this.roughness = options.roughness || 0.7;
    this.metalness = options.metalness || 0.1;

    // Texture properties
    this.textureMap = options.textureMap || null;
    this.bumpMap = options.bumpMap || null;
    this.specularMap = options.specularMap || null;
    this.cloudsMap = options.cloudsMap || null;

    // Rotation properties
    this.rotationSpeed = options.rotationSpeed || 0;
    this.rotationAxis = options.rotationAxis || new THREE.Vector3(0, 0, 1);
    this.tilt = options.tilt || 0;
    this.cloudsRotationSpeed =
      options.cloudsRotationSpeed || this.rotationSpeed * 1.2; // Clouds rotate slightly faster by default

    // Orbital properties
    this.isOrbiting = options.isOrbiting || false;
    this.orbitTarget = options.orbitTarget || null;
    this.orbitRadius = options.orbitRadius || 5.0;
    this.orbitSpeed = options.orbitSpeed || 0.1;
    this.orbitAngle = options.orbitAngle || 0;
    this.orbitTilt = options.orbitTilt || 0;
    this.orbitClockwise =
      options.orbitClockwise !== undefined ? options.orbitClockwise : false;
    this.showOrbitPath =
      options.showOrbitPath !== undefined ? options.showOrbitPath : true;
    this.orbitPathColor = options.orbitPathColor || 0x444444;
    this.orbitPath = null;

    // Create the mesh
    this.createMesh();

    // Create orbit path if needed
    if (this.isOrbiting && this.showOrbitPath) {
      this.createOrbitPath();
    }

    // Apply initial tilt if specified
    if (this.tilt !== 0 && this.mesh) {
      this.mesh.rotation.x = this.tilt * (Math.PI / 180); // Convert degrees to radians
    }
  }

  createMesh() {
    // Create the body geometry
    const geometry = new THREE.SphereGeometry(
      this.radius,
      this.surfaceDetail,
      this.surfaceDetail
    );

    // Create the material based on whether textures are provided
    let material;

    if (this.textureMap) {
      material = new THREE.MeshPhongMaterial({
        map: this.textureMap,
        bumpMap: this.bumpMap,
        bumpScale: 0.05,
        specularMap: this.specularMap,
        specular: new THREE.Color(0x333333),
        shininess: 25,
      });
    } else {
      material = new THREE.MeshStandardMaterial({
        color: this.color,
        roughness: this.roughness,
        metalness: this.metalness,
      });
    }

    // Create the mesh
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(this.position);

    // Add clouds if a clouds texture is provided
    if (this.cloudsMap) {
      const cloudsGeometry = new THREE.SphereGeometry(
        this.radius * 1.01,
        this.surfaceDetail,
        this.surfaceDetail
      );

      const cloudsMaterial = new THREE.MeshPhongMaterial({
        map: this.cloudsMap,
        transparent: true,
        opacity: 0.8,
        side: THREE.FrontSide,
      });

      this.clouds = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
      this.mesh.add(this.clouds);
    }

    // Add atmosphere if needed
    if (this.hasAtmosphere) {
      this.createAtmosphere();
    }
  }

  createAtmosphere() {
    const atmosphereGeometry = new THREE.SphereGeometry(
      this.radius * (1 + this.atmosphereThickness),
      this.surfaceDetail,
      this.surfaceDetail
    );

    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: this.atmosphereColor,
      transparent: true,
      opacity: this.atmosphereOpacity,
      side: THREE.BackSide,
    });

    this.atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    this.atmosphere.position.copy(this.position);
  }

  createOrbitPath() {
    if (!this.orbitTarget) return;

    // Create a circle geometry for the orbit path
    const orbitGeometry = new THREE.BufferGeometry();
    const orbitPoints = 64;
    const orbitVertices = new Float32Array(orbitPoints * 3);

    // Calculate points around the orbit
    for (let i = 0; i < orbitPoints; i++) {
      const angle = (i / orbitPoints) * Math.PI * 2;
      const x =
        this.orbitTarget.position.x + Math.cos(angle) * this.orbitRadius;
      const y =
        this.orbitTarget.position.y + Math.sin(angle) * this.orbitRadius;
      const z = this.orbitTarget.position.z;

      orbitVertices[i * 3] = x;
      orbitVertices[i * 3 + 1] = y;
      orbitVertices[i * 3 + 2] = z;
    }

    orbitGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(orbitVertices, 3)
    );

    // Create the orbit path line
    const orbitMaterial = new THREE.LineBasicMaterial({
      color: this.orbitPathColor,
      transparent: true,
      opacity: 0.5,
    });

    this.orbitPath = new THREE.LineLoop(orbitGeometry, orbitMaterial);
  }

  addToScene(scene) {
    scene.add(this.mesh);
    if (this.hasAtmosphere && this.atmosphere) {
      scene.add(this.atmosphere);
    }
    if (this.orbitPath) {
      scene.add(this.orbitPath);
    }
  }

  // Calculate gravitational force on an object at position with mass
  calculateGravityForce(objectPosition, objectMass) {
    // Vector from object to this celestial body
    const direction = new THREE.Vector3()
      .copy(this.position)
      .sub(objectPosition);

    // Distance between object and this celestial body
    const distance = direction.length();

    // Normalize the direction vector
    direction.normalize();

    // Calculate gravity magnitude using Newton's law of universal gravitation
    // F = G * (m1 * m2) / r^2
    // Using game-appropriate values instead of real-world values
    const G = 0.3; // Game gravitational constant (was 6.6743e-11)

    // Scale down the mass for game purposes
    const scaledMass =
      this.name === "Earth" ? 3 : this.name === "Moon" ? 0.5 : 1;

    const forceMagnitude =
      (G * scaledMass * objectMass) / (distance * distance);

    // Add stronger gravity near the surface to make liftoff more challenging
    let gravityMultiplier = 1.0;
    const altitude = distance - this.radius;
    if (altitude < 1.0) {
      // Increase gravity strength near the surface
      gravityMultiplier = 1.0 + (1.0 - altitude) * 0.5;
    }

    // Return the force vector
    return direction.multiplyScalar(forceMagnitude * gravityMultiplier);
  }

  // Check if an object at position has collided with this celestial body
  checkCollision(objectPosition, objectRadius = 0) {
    const distance = new THREE.Vector3()
      .copy(objectPosition)
      .sub(this.position)
      .length();

    return distance < this.radius + objectRadius;
  }

  // Update method for any animations or movements
  update(deltaTime) {
    // Apply rotation if rotation speed is set
    if (this.rotationSpeed !== 0 && this.mesh) {
      this.mesh.rotation.y += this.rotationSpeed * deltaTime;

      // Rotate clouds separately if they exist
      if (this.clouds && this.cloudsRotationSpeed !== 0) {
        this.clouds.rotation.y += this.cloudsRotationSpeed * deltaTime;
      }
    }

    // Update orbital position if this body is orbiting another body
    if (this.isOrbiting && this.orbitTarget) {
      // Update orbit angle based on orbit speed
      const direction = this.orbitClockwise ? -1 : 1;
      this.orbitAngle += this.orbitSpeed * deltaTime * direction;

      // Calculate new position based on orbit parameters
      const x =
        this.orbitTarget.position.x +
        Math.cos(this.orbitAngle) * this.orbitRadius;
      const y =
        this.orbitTarget.position.y +
        Math.sin(this.orbitAngle) * this.orbitRadius;
      const z = this.orbitTarget.position.z;

      // Update position
      this.position.set(x, y, z);

      // Update mesh position
      if (this.mesh) {
        this.mesh.position.copy(this.position);
      }

      // Update atmosphere position
      if (this.atmosphere) {
        this.atmosphere.position.copy(this.position);
      }
    }
  }

  // Update orbital parameters
  setOrbitParameters(params = {}) {
    // Update orbital properties if provided
    if (params.orbitRadius !== undefined) this.orbitRadius = params.orbitRadius;
    if (params.orbitSpeed !== undefined) this.orbitSpeed = params.orbitSpeed;
    if (params.orbitAngle !== undefined) this.orbitAngle = params.orbitAngle;
    if (params.orbitTilt !== undefined) this.orbitTilt = params.orbitTilt;
    if (params.orbitClockwise !== undefined)
      this.orbitClockwise = params.orbitClockwise;

    // Update orbit path if it exists
    if (this.orbitPath && this.orbitTarget) {
      // Remove old orbit path from parent
      if (this.orbitPath.parent) {
        this.orbitPath.parent.remove(this.orbitPath);
      }

      // Create new orbit path
      this.createOrbitPath();

      // Add back to scene if it was in a scene
      if (this.mesh.parent) {
        this.mesh.parent.add(this.orbitPath);
      }
    }
  }
}
