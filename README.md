# KSP Clone

A low-fidelity Kerbal Space Program clone built with Three.js and Vite.

## Description

This project is a simple 2D rocket simulation where you can launch a rocket from Earth and attempt to get it into orbit. The physics are simplified and constrained to a 2D plane.

## Getting Started

### Prerequisites

- Node.js (v14 or higher recommended)
- npm (v6 or higher recommended)

### Installation

1. Clone the repository
2. Navigate to the project directory
3. Install dependencies:

```bash
npm install
```

### Running the Development Server

Start the Vite development server:

```bash
npm run dev
```

Open your browser to the URL shown in the terminal (typically http://localhost:3000).

## How to Play

- Use the **Left/Right Arrow Keys** to rotate the rocket
- Use the **Up Arrow Key** to apply thrust
- Try to achieve orbit by balancing vertical ascent and horizontal velocity

## Physics

The simulation uses simplified physics:

- Gravity follows the inverse square law
- Thrust is applied in the direction the rocket is pointing
- All motion is constrained to the XY plane

## Units

The simulation uses arbitrary units:

- Earth radius = 1 unit
- Altitude is measured in units from Earth's surface
- Speed is measured in units per second
