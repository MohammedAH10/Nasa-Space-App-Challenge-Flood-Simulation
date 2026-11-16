# Moon Squad

Moon Squad is a kid-friendly browser game about building a rocket and flying it to the Moon. Pick parts, balance thrust and fuel, pass the mission check, then steer and stage your way through a short interactive flight.

The original satellite mission-control experience is preserved at `/mission-control`.

## Play

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How to play

1. **Build** - Tap a rocket slot or drag a part from the tray. Nose, capsule, fuel tank, and main engine are required. Boosters, fins, and landing legs are optional but helpful.
2. **Check** - Watch the mission check gauges. Range, stability, liftoff power, reliability, and landing gear all affect the flight.
3. **Fly** - During ascent, hold **Left** / **Right** to follow the green steering marker. Tap **Stage** while it glows to drop the boosters at the right moment.
4. **Land** - A complete rocket with landing legs, enough range, and a clean flight reaches the Moon. The mission report shows the score, grade, breakdown, and new badges.

### Controls

- **Mouse / touch** - Drag parts, rotate and zoom the 3D rocket, press the on-screen controls.
- **A / D** or **Left / Right arrows** - Steer during ascent.
- **Space** - Stage the boosters.
- **Tab / Enter** - Navigate the interface with the keyboard. The top bar has a Guide button and a sound toggle.

## Features

- Interactive Three.js rocket assembly with drag-and-drop and click-to-fit parts.
- Seven rocket slots and a part catalog with mass, thrust, efficiency, stability, reliability, and cost.
- Delta-v, TWR, drag, stability, and reliability model.
- Deterministic flight timeline with steering and staging mini-games.
- Mission report with score, grade, stars, flight breakdown, and replay.
- Achievements, badge gallery, and toast notifications.
- Local save data for the current rocket, best score, runs, badges, sound preference, and tutorial state.
- Nova tutorial, keyboard support, focus styles, reduced-motion support, and responsive layouts.

## Scripts

```bash
npm run dev        # Start the development server
npm run build      # Production build
npm run start      # Start the production server
npm run lint       # ESLint
npm run typecheck  # TypeScript
npm test           # Vitest
```

## Project structure

```text
src/app/                 Next.js routes, global styles, and Moon Squad styles
src/app/mission-control/ Preserved satellite mission-control game
src/moon/                Moon Squad game domain
  components/            Screens and UI controls
  scene/                 Three.js assembly and flight scenes
  audio.ts               Procedural Web Audio effects
  constants.ts           Mission constants and save key
  parts.ts               Rocket slots and part catalog
  physics.ts             Delta-v and rocket stats
  validation.ts          Readiness checks
  flight.ts              Flight timeline, mini-game rules, and scoring
  store.ts               Zustand state, achievements, and persistence
src/moon/moon.test.ts    Physics, validation, and flight tests
```

## Save data

Progress is stored in `localStorage` under `moon-squad-v1`. It includes the saved rocket, best score, mission count, unlocked badges, sound preference, and tutorial state.
