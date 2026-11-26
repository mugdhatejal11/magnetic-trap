# Magnetic Trap

An interactive 3D simulation of a charged particle trapped in Earth's magnetic field (the physics of the Van Allen belts), written for an audience that thinks in code rather than in physics.

**Live demo:** https://mugdhatejal11.github.io/magnetic-trap/

## What it shows

The particle runs three nested loops at very different speeds: a fast **spin** around a field line, a slower **bounce** between the hemispheres, and a very slow **drift** around the Earth. The bounce happens because the field never adds speed, it only moves it between "forward" and "sideways". A stronger field near the poles pulls more into sideways until none is left to go forward.

The page keeps the physics light by default. The graphs and equations are folded into a "Show me the math" section.

## Live unit tests

Three checks run while the simulation does:

1. Speed is constant (a magnetic field does no work).
2. The magnetic moment `v_perp^2 / 2B` stays nearly constant.
3. The turning latitude matches the dipole-field formula.

The scenario buttons show how a naive solver (Euler) or a too-large time step (RK4) fails check 1 while the animation still looks plausible.

## Run it

It is one static file with no build step. Open `index.html` in a browser, or serve the folder:

    python3 -m http.server

Tests for the physics core (Node, no dependencies):

    node test/regress.js

## Layout

- `index.html` is the whole page. It contains a copy of `src/physics_core.js` inline.
- `src/physics_core.js` is the field, the three solvers (Boris, RK4, Euler), and the theory formulas.
- `test/regress.js` checks the core against theory: speed conservation, the turning point, and the loss cone across distances and pitch angles.

If you edit `src/physics_core.js`, paste the change into the matching block in `index.html` (it is marked `PHYSICS CORE`).

## Model notes

The field shape, turning points and loss cone are real physics. The particle is a stand-in: its charge-to-mass ratio is chosen so the spin is much tighter than the field's curvature (which is what makes the textbook theory apply), distances are in Earth radii, and time is in arbitrary units, so speeds are not those of a real proton or electron. The drift loop is simulated but its rate is not validated against theory.
