import * as THREE from "three";
import { getPart } from "../parts";
import type { MoonPart, PartSlot, RocketBuild } from "../types";

const ENGINE_HEIGHT = 0.64;
const CAPSULE_HEIGHT = 0.78;
const NOSE_HEIGHT = 0.8;
const BODY_RADIUS = 0.42;
const CAPSULE_RADIUS = 0.46;

const FUEL_HEIGHTS: Record<string, number> = {
  "fuel-small": 0.9,
  "fuel-medium": 1.18,
  "fuel-large": 1.5,
  "fuel-mega": 1.9,
};

export interface RocketVisual {
  group: THREE.Group;
  slotGroups: Partial<Record<PartSlot, THREE.Object3D>>;
  flames: THREE.Group;
  boosterFlames: THREE.Group;
  boosters: THREE.Object3D | null;
  legs: THREE.Object3D | null;
  height: number;
}

interface BuildOptions {
  ghosts?: boolean;
  showFlags?: boolean;
}

function standard(
  color: number,
  options: { roughness?: number; metalness?: number; emissive?: number; emissiveIntensity?: number } = {},
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.58,
    metalness: options.metalness ?? 0.24,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
  });
}

function tagSlot(group: THREE.Object3D, slot: PartSlot): void {
  group.userData.slot = slot;
  group.traverse((child) => {
    child.userData.slot = slot;
  });
}

function makeFlagTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.fillStyle = "#12306a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#4cc9f0";
  ctx.fillRect(0, 0, canvas.width, 16);
  ctx.fillStyle = "#ffd166";
  ctx.beginPath();
  const cx = 96;
  const cy = 58;
  for (let point = 0; point < 10; point += 1) {
    const radius = point % 2 === 0 ? 24 : 10;
    const angle = -Math.PI / 2 + (point * Math.PI) / 5;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (point === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#eef4ff";
  ctx.font = "700 22px Trebuchet MS, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("MOON SQUAD", 96, 105);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function makeTankBand(radius: number, height: number, color: number): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.CylinderGeometry(radius + 0.006, radius + 0.006, height, 28, 1, true),
    standard(color, { roughness: 0.45, metalness: 0.35 }),
  );
}

function addStackPart(
  group: THREE.Group,
  part: MoonPart,
  y: number,
  height: number,
  radius: number,
): void {
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, 28, 1, false),
    standard(part.color, { roughness: 0.52, metalness: 0.2 }),
  );
  body.position.y = y + height / 2;
  group.add(body);

  if (part.slot === "fuel") {
    const bandTop = new THREE.Mesh(
      new THREE.TorusGeometry(radius + 0.002, 0.025, 8, 32),
      standard(0xdbe7ff, { roughness: 0.4, metalness: 0.4 }),
    );
    bandTop.rotation.x = Math.PI / 2;
    bandTop.position.y = y + height - 0.08;
    group.add(bandTop);
    const bandBottom = bandTop.clone();
    bandBottom.position.y = y + 0.08;
    group.add(bandBottom);

    const stripe = new THREE.Mesh(
      new THREE.CylinderGeometry(radius + 0.004, radius + 0.004, 0.1, 28, 1, true),
      standard(0xf72585, {
        roughness: 0.4,
        metalness: 0.2,
        emissive: 0x5a0a30,
        emissiveIntensity: 0.4,
      }),
    );
    stripe.position.y = y + height * 0.66;
    group.add(stripe);
  }

  if (part.slot === "capsule") {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2),
      standard(part.color, { roughness: 0.4, metalness: 0.22 }),
    );
    dome.scale.y = 0.55;
    dome.position.y = y + height;
    group.add(dome);

    const windowRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.15, 0.035, 10, 28),
      standard(0xdbe7ff, { roughness: 0.35, metalness: 0.5 }),
    );
    windowRing.position.set(0, y + height * 0.58, radius * 0.98);
    group.add(windowRing);
    const glass = new THREE.Mesh(
      new THREE.CircleGeometry(0.13, 28),
      standard(0x0b3552, {
        roughness: 0.15,
        metalness: 0.4,
        emissive: 0x0e5c8a,
        emissiveIntensity: 0.7,
      }),
    );
    glass.position.set(0, y + height * 0.58, radius * 0.99);
    group.add(glass);
    const glint = new THREE.Mesh(
      new THREE.CircleGeometry(0.04, 16),
      new THREE.MeshBasicMaterial({ color: 0xbff3ff }),
    );
    glint.position.set(-0.045, y + height * 0.62, radius * 1.005);
    group.add(glint);
  }

  if (part.slot === "nose") {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(radius, height, 32),
      standard(part.color, { roughness: 0.42, metalness: 0.3 }),
    );
    cone.position.y = y + height / 2;
    group.add(cone);
    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 14, 10),
      standard(0xffffff, { roughness: 0.2, metalness: 0.7 }),
    );
    tip.position.y = y + height + 0.01;
    group.add(tip);
  }
}

function addEngine(group: THREE.Group, part: MoonPart): void {
  const mount = new THREE.Mesh(
    new THREE.CylinderGeometry(BODY_RADIUS * 0.86, BODY_RADIUS * 0.94, 0.2, 24),
    standard(0x9aa8c7, { roughness: 0.4, metalness: 0.6 }),
  );
  mount.position.y = 0.54;
  group.add(mount);

  const bell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.36, 0.36, 24, 1, true),
    standard(part.color, { roughness: 0.32, metalness: 0.55 }),
  );
  bell.position.y = 0.26;
  group.add(bell);

  const inner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.28, 0.34, 24, 1, true),
    standard(0x2b2440, {
      roughness: 0.5,
      metalness: 0.2,
      emissive: part.color,
      emissiveIntensity: 0.25,
    }),
  );
  inner.position.y = 0.25;
  group.add(inner);

  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(0.22, 24),
    new THREE.MeshBasicMaterial({
      color: 0xffb347,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  glow.rotation.x = Math.PI / 2;
  glow.position.y = 0.075;
  group.add(glow);
}

function addFins(group: THREE.Group, part: MoonPart): void {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0.52, 0.12);
  shape.lineTo(0.46, 0.52);
  shape.lineTo(0.02, 0.78);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.045,
    bevelEnabled: false,
  });
  geometry.center();
  const material = standard(part.color, { roughness: 0.4, metalness: 0.25 });
  for (let index = 0; index < 4; index += 1) {
    const fin = new THREE.Mesh(geometry, material);
    const angle = (index / 4) * Math.PI * 2;
    fin.position.set(
      Math.cos(angle) * (BODY_RADIUS + 0.17),
      0.54,
      Math.sin(angle) * (BODY_RADIUS + 0.17),
    );
    fin.rotation.y = -angle;
    fin.rotation.z = Math.PI / 2;
    group.add(fin);
  }
}

function addLegs(group: THREE.Group, part: MoonPart): void {
  const legMaterial = standard(part.color, { roughness: 0.35, metalness: 0.5 });
  const footMaterial = standard(0xdbe7ff, { roughness: 0.3, metalness: 0.6 });
  for (let index = 0; index < 4; index += 1) {
    const angle = (index / 4) * Math.PI * 2 + Math.PI / 4;
    const pivot = new THREE.Group();
    pivot.position.set(
      Math.cos(angle) * (BODY_RADIUS * 0.86),
      0.62,
      Math.sin(angle) * (BODY_RADIUS * 0.86),
    );
    pivot.rotation.y = -angle;
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.042, 0.66, 10),
      legMaterial,
    );
    leg.geometry.translate(0, -0.33, 0);
    leg.position.set(0.18, 0, 0);
    leg.rotation.z = -0.5;
    pivot.add(leg);
    const foot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.085, 0.045, 14),
      footMaterial,
    );
    foot.position.set(0.48, -0.61, 0);
    pivot.add(foot);
    group.add(pivot);
  }
}

function addBoosters(
  group: THREE.Group,
  part: MoonPart,
): { boosters: THREE.Group; flames: THREE.Group } {
  const boosters = new THREE.Group();
  const flames = new THREE.Group();
  const count = part.boosterCount ?? 2;
  const positions: [number, number][] =
    count >= 4
      ? [
          [-0.68, 0],
          [0.68, 0],
          [0, -0.68],
          [0, 0.68],
        ]
      : [
          [-0.68, 0],
          [0.68, 0],
        ];

  for (const [x, z] of positions) {
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.19, 0.19, 1.18, 18),
      standard(part.color, { roughness: 0.46, metalness: 0.28 }),
    );
    body.position.set(x, 0.72, z);
    boosters.add(body);
    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.19, 0.34, 18),
      standard(0xe8f0ff, { roughness: 0.4, metalness: 0.35 }),
    );
    nose.position.set(x, 1.48, z);
    boosters.add(nose);
    const nozzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.17, 0.24, 16, 1, true),
      standard(0x2b2440, { roughness: 0.5, metalness: 0.4 }),
    );
    nozzle.position.set(x, 0.13, z);
    boosters.add(nozzle);

    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.14, 0.85, 14, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xffb347,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    flame.position.set(x, -0.3, z);
    flame.rotation.x = Math.PI;
    flames.add(flame);
    const core = new THREE.Mesh(
      new THREE.ConeGeometry(0.07, 0.55, 12, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xfff3b0,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    core.position.set(x, -0.18, z);
    core.rotation.x = Math.PI;
    flames.add(core);
  }

  boosters.name = "boosters";
  flames.name = "booster-flames";
  group.add(boosters);
  group.add(flames);
  return { boosters, flames };
}

function addMainFlame(group: THREE.Group): THREE.Group {
  const flames = new THREE.Group();
  const outer = new THREE.Mesh(
    new THREE.ConeGeometry(0.27, 1.25, 18, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xff8a00,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  outer.position.y = -0.63;
  outer.rotation.x = Math.PI;
  flames.add(outer);
  const inner = new THREE.Mesh(
    new THREE.ConeGeometry(0.14, 0.8, 14, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xfff3b0,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  inner.position.y = -0.4;
  inner.rotation.x = Math.PI;
  flames.add(inner);
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.36, 18, 12),
    new THREE.MeshBasicMaterial({
      color: 0xffb347,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  glow.position.y = 0.05;
  flames.add(glow);
  flames.visible = false;
  group.add(flames);
  return flames;
}

function ghostMaterial(color: number, opacity: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    wireframe: false,
  });
}

function addGhost(
  parent: THREE.Group,
  slot: PartSlot,
  color: number,
  position: THREE.Vector3,
  height: number,
  radius: number,
  opacity: number,
): THREE.Group {
  const ghost = new THREE.Group();
  ghost.position.copy(position);
  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, 20, 1, true),
    ghostMaterial(color, opacity),
  );
  shell.position.y = height / 2;
  ghost.add(shell);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.CylinderGeometry(radius, radius, height, 12)),
    new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: Math.min(0.8, opacity * 3.6),
    }),
  );
  edges.position.y = height / 2;
  ghost.add(edges);
  tagSlot(ghost, slot);
  parent.add(ghost);
  return ghost;
}

function addFlag(group: THREE.Group, y: number): void {
  const texture = makeFlagTexture();
  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.28),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    }),
  );
  flag.position.set(0.28, y, 0.38);
  flag.rotation.y = -0.35;
  group.add(flag);
}

export function buildRocket(
  build: RocketBuild,
  options: BuildOptions = {},
): RocketVisual {
  const group = new THREE.Group();
  group.name = "moon-rocket";
  const slotGroups: Partial<Record<PartSlot, THREE.Object3D>> = {};

  const nose = getPart(build.parts.nose);
  const capsule = getPart(build.parts.capsule);
  const fuel = getPart(build.parts.fuel);
  const engine = getPart(build.parts.engine);
  const boostersPart = getPart(build.parts.booster);
  const fins = getPart(build.parts.fins);
  const legs = getPart(build.parts.legs);

  const fuelHeight = fuel ? (FUEL_HEIGHTS[fuel.id] ?? 1.18) : 1.18;
  const fuelY = ENGINE_HEIGHT;
  const capsuleY = fuelY + fuelHeight;
  const noseY = capsuleY + CAPSULE_HEIGHT;
  const totalHeight = noseY + NOSE_HEIGHT;

  if (engine) {
    const engineGroup = new THREE.Group();
    engineGroup.position.y = 0;
    addEngine(engineGroup, engine);
    tagSlot(engineGroup, "engine");
    group.add(engineGroup);
    slotGroups.engine = engineGroup;
  }

  if (fuel) {
    const fuelGroup = new THREE.Group();
    addStackPart(fuelGroup, fuel, fuelY, fuelHeight, BODY_RADIUS);
    tagSlot(fuelGroup, "fuel");
    group.add(fuelGroup);
    slotGroups.fuel = fuelGroup;
  }

  if (capsule) {
    const capsuleGroup = new THREE.Group();
    addStackPart(capsuleGroup, capsule, capsuleY, CAPSULE_HEIGHT, CAPSULE_RADIUS);
    if (options.showFlags !== false && capsule.crew) {
      addFlag(capsuleGroup, capsuleY + CAPSULE_HEIGHT * 0.36);
    }
    tagSlot(capsuleGroup, "capsule");
    group.add(capsuleGroup);
    slotGroups.capsule = capsuleGroup;
  }

  if (nose) {
    const noseGroup = new THREE.Group();
    addStackPart(noseGroup, nose, noseY, NOSE_HEIGHT, CAPSULE_RADIUS);
    tagSlot(noseGroup, "nose");
    group.add(noseGroup);
    slotGroups.nose = noseGroup;
  }

  if (fins) {
    const finGroup = new THREE.Group();
    addFins(finGroup, fins);
    tagSlot(finGroup, "fins");
    group.add(finGroup);
    slotGroups.fins = finGroup;
  }

  if (legs) {
    const legGroup = new THREE.Group();
    addLegs(legGroup, legs);
    tagSlot(legGroup, "legs");
    group.add(legGroup);
    slotGroups.legs = legGroup;
  }

  let boosterGroup: THREE.Group | null = null;
  let boosterFlames = new THREE.Group();
  if (boostersPart) {
    const built = addBoosters(group, boostersPart);
    boosterGroup = built.boosters;
    boosterFlames = built.flames;
    tagSlot(boosterGroup, "booster");
    tagSlot(boosterFlames, "booster");
    slotGroups.booster = boosterGroup;
  }

  const flames = addMainFlame(group);

  if (options.ghosts !== false) {
    if (!engine) {
      slotGroups.engine = addGhost(
        group,
        "engine",
        0xf72585,
        new THREE.Vector3(0, 0, 0),
        ENGINE_HEIGHT,
        BODY_RADIUS,
        0.18,
      );
    }
    if (!fuel) {
      slotGroups.fuel = addGhost(
        group,
        "fuel",
        0x3b82f6,
        new THREE.Vector3(0, fuelY, 0),
        fuelHeight,
        BODY_RADIUS,
        0.18,
      );
    }
    if (!capsule) {
      slotGroups.capsule = addGhost(
        group,
        "capsule",
        0x4cc9f0,
        new THREE.Vector3(0, capsuleY, 0),
        CAPSULE_HEIGHT,
        CAPSULE_RADIUS,
        0.18,
      );
    }
    if (!nose) {
      slotGroups.nose = addGhost(
        group,
        "nose",
        0xffd166,
        new THREE.Vector3(0, noseY, 0),
        NOSE_HEIGHT,
        CAPSULE_RADIUS,
        0.18,
      );
    }
    if (!fins) {
      for (let index = 0; index < 4; index += 1) {
        const angle = (index / 4) * Math.PI * 2;
        const ghost = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.58, 0.04),
          ghostMaterial(0x00b4d8, 0.1),
        );
        ghost.position.set(
          Math.cos(angle) * (BODY_RADIUS + 0.2),
          0.55,
          Math.sin(angle) * (BODY_RADIUS + 0.2),
        );
        ghost.rotation.y = -angle;
        tagSlot(ghost, "fins");
        group.add(ghost);
        if (!slotGroups.fins) slotGroups.fins = ghost;
      }
    }
    if (!legs) {
      for (let index = 0; index < 4; index += 1) {
        const angle = (index / 4) * Math.PI * 2 + Math.PI / 4;
        const ghost = new THREE.Mesh(
          new THREE.CylinderGeometry(0.028, 0.04, 0.62, 8),
          ghostMaterial(0x70e000, 0.1),
        );
        ghost.position.set(
          Math.cos(angle) * 0.4,
          0.32,
          Math.sin(angle) * 0.4,
        );
        tagSlot(ghost, "legs");
        group.add(ghost);
        if (!slotGroups.legs) slotGroups.legs = ghost;
      }
    }
    if (!boostersPart) {
      const ghost = new THREE.Group();
      for (const x of [-0.68, 0.68]) {
        const shell = new THREE.Mesh(
          new THREE.CylinderGeometry(0.19, 0.19, 1.18, 14, 1, true),
          ghostMaterial(0xf9c74f, 0.1),
        );
        shell.position.set(x, 0.72, 0);
        ghost.add(shell);
      }
      tagSlot(ghost, "booster");
      group.add(ghost);
      slotGroups.booster = ghost;
    }
  }

  return {
    group,
    slotGroups,
    flames,
    boosterFlames,
    boosters: boosterGroup,
    legs: legs ? (slotGroups.legs ?? null) : null,
    height: totalHeight,
  };
}

export function setRocketThrottle(
  visual: RocketVisual,
  throttle: number,
  hasBoosters: boolean,
): void {
  const active = throttle > 0.02;
  visual.flames.visible = active;
  if (active) {
    const pulse = 0.85 + Math.random() * 0.3;
    visual.flames.scale.set(
      0.9 + throttle * 0.2,
      (0.6 + throttle * 0.65) * pulse,
      0.9 + throttle * 0.2,
    );
  }
  if (visual.boosters) {
    visual.boosters.visible = hasBoosters;
  }
  visual.boosterFlames.visible = active && hasBoosters;
}

export function setBoostersSeparated(
  visual: RocketVisual,
  separated: boolean,
): void {
  if (visual.boosters) visual.boosters.visible = !separated;
  if (separated) visual.boosterFlames.visible = false;
}
