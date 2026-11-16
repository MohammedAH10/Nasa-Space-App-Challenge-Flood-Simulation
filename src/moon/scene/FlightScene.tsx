"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { makeGlowTexture } from "@/components/three/helpers";
import type { FlightPhase, RocketBuild } from "../types";
import {
  buildRocket,
  setBoostersSeparated,
  setRocketThrottle,
  type RocketVisual,
} from "./rocket";

interface FlightSceneProps {
  build: RocketBuild;
  phase: FlightPhase;
  phaseProgress: number;
  throttle: number;
  steer: number;
  staged: boolean;
  paused?: boolean;
  success?: boolean | null;
}

interface SceneState {
  phase: FlightPhase;
  phaseProgress: number;
  throttle: number;
  steer: number;
  staged: boolean;
  paused: boolean;
  success: boolean | null;
  hasBoosters: boolean;
}

const MOON_CENTER = new THREE.Vector3(0, 390, -180);
const MOON_RADIUS = 26;

function ease(value: number): number {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
}

function flightPosition(phase: FlightPhase, raw: number): THREE.Vector3 {
  const t = ease(raw);
  switch (phase) {
    case "countdown":
      return new THREE.Vector3(0, 0, 0);
    case "liftoff":
      return new THREE.Vector3(0, t * 9, 0);
    case "ascent":
      return new THREE.Vector3(0, 9 + t * 121, 0);
    case "staging":
      return new THREE.Vector3(0, 130 + t * 10, -10 * t);
    case "coast":
      return new THREE.Vector3(0, 140 + t * 240, -10 - t * 130);
    case "arrival":
      return new THREE.Vector3(0, 380 + t * 30, -140 - t * 14);
    case "landing":
      return new THREE.Vector3(0, 410 - t * 20, -154);
    case "done":
      return new THREE.Vector3(0, 390, -154);
  }
}

function makeStarField(): THREE.Points {
  const count = 1700;
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    const radius = 320 + Math.random() * 420;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[index * 3 + 1] = radius * Math.cos(phi);
    positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0xd7e6ff,
      size: 0.85,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    }),
  );
}

function makeEarthTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  const ocean = ctx.createLinearGradient(0, 0, 0, canvas.height);
  ocean.addColorStop(0, "#0b2f63");
  ocean.addColorStop(0.45, "#1565b0");
  ocean.addColorStop(1, "#0a244f");
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const land = [
    [190, 180, 130, 60],
    [250, 250, 70, 85],
    [480, 150, 110, 70],
    [540, 240, 60, 100],
    [760, 210, 120, 55],
    [860, 300, 70, 45],
    [330, 380, 90, 40],
  ];
  for (const [x, y, rx, ry] of land) {
    ctx.fillStyle = "#2f8f4e";
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#77b85b";
    ctx.beginPath();
    ctx.ellipse(x - rx * 0.2, y - ry * 0.25, rx * 0.55, ry * 0.42, 0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let index = 0; index < 28; index += 1) {
    const x = Math.random() * canvas.width;
    const y = 60 + Math.random() * (canvas.height - 120);
    ctx.fillStyle = `rgba(255,255,255,${0.12 + Math.random() * 0.24})`;
    ctx.beginPath();
    ctx.ellipse(x, y, 35 + Math.random() * 95, 8 + Math.random() * 20, Math.random(), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(240,248,255,0.9)";
  ctx.fillRect(0, 0, canvas.width, 22);
  ctx.fillRect(0, canvas.height - 22, canvas.width, 22);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function makeMoonTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.fillStyle = "#a9b2c7";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < 42; index += 1) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const radius = 8 + Math.random() * 52;
    ctx.fillStyle = `rgba(76,86,112,${0.12 + Math.random() * 0.26})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(232,238,252,${0.08 + Math.random() * 0.14})`;
    ctx.beginPath();
    ctx.arc(x - radius * 0.22, y - radius * 0.22, radius * 0.72, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let index = 0; index < 500; index += 1) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.08})`;
    ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function makeLaunchPad(): THREE.Group {
  const pad = new THREE.Group();

  const concrete = new THREE.Mesh(
    new THREE.CylinderGeometry(2.1, 2.3, 0.22, 48),
    new THREE.MeshStandardMaterial({
      color: 0x1c2748,
      roughness: 0.84,
      metalness: 0.2,
    }),
  );
  concrete.position.y = -0.11;
  pad.add(concrete);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.9, 0.02, 8, 64),
    new THREE.MeshBasicMaterial({
      color: 0x4cc9f0,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.012;
  pad.add(ring);

  const stripe = new THREE.Mesh(
    new THREE.TorusGeometry(1.5, 0.04, 8, 64),
    new THREE.MeshStandardMaterial({
      color: 0xffd166,
      roughness: 0.5,
      metalness: 0.2,
      emissive: 0x4d3a00,
      emissiveIntensity: 0.4,
    }),
  );
  stripe.rotation.x = Math.PI / 2;
  stripe.position.y = 0.02;
  pad.add(stripe);

  for (let index = 0; index < 4; index += 1) {
    const angle = (index / 4) * Math.PI * 2 + Math.PI / 4;
    const clamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.26, 0.42),
      new THREE.MeshStandardMaterial({
        color: 0x53658f,
        roughness: 0.4,
        metalness: 0.7,
      }),
    );
    clamp.position.set(Math.cos(angle) * 1.4, 0.12, Math.sin(angle) * 1.4);
    clamp.rotation.y = -angle;
    pad.add(clamp);
  }

  const tower = new THREE.Group();
  tower.position.set(2.35, 0, 0);
  const metal = new THREE.MeshStandardMaterial({
    color: 0x6f7fa8,
    roughness: 0.42,
    metalness: 0.72,
  });
  for (const x of [-0.22, 0.22]) {
    for (const z of [-0.22, 0.22]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 5.2, 0.07), metal);
      leg.position.set(x, 2.6, z);
      tower.add(leg);
    }
  }
  for (let level = 0; level < 7; level += 1) {
    const y = 0.5 + level * 0.72;
    const brace = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.055, 0.56), metal);
    brace.position.y = y;
    tower.add(brace);
  }
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.1, 0.14), metal);
  arm.position.set(-0.68, 3.1, 0);
  tower.add(arm);
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.085, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0xff5d73 }),
  );
  beacon.position.set(0, 5.25, 0);
  tower.add(beacon);
  pad.add(tower);

  return pad;
}

function makeSmoke(): THREE.Group {
  const group = new THREE.Group();
  const texture = makeGlowTexture("rgba(214,224,245,0.5)", "rgba(214,224,245,0)");
  for (let index = 0; index < 16; index += 1) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.4 + Math.random() * 1.9;
    sprite.position.set(Math.cos(angle) * radius, 0.15 + Math.random() * 0.4, Math.sin(angle) * radius);
    const scale = 1.4 + Math.random() * 2.8;
    sprite.scale.set(scale, scale, 1);
    sprite.userData.drift = 0.2 + Math.random() * 0.7;
    sprite.userData.baseX = sprite.position.x;
    sprite.userData.baseZ = sprite.position.z;
    group.add(sprite);
  }
  return group;
}

export default function FlightScene({
  build,
  phase,
  phaseProgress,
  throttle,
  steer,
  staged,
  paused = false,
  success = null,
}: FlightSceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<SceneState>({
    phase,
    phaseProgress,
    throttle,
    steer,
    staged,
    paused,
    success,
    hasBoosters: Boolean(build.parts.booster),
  });

  useEffect(() => {
    stateRef.current = {
      phase,
      phaseProgress,
      throttle,
      steer,
      staged,
      paused,
      success,
      hasBoosters: Boolean(build.parts.booster),
    };
  }, [phase, phaseProgress, throttle, steer, staged, paused, success, build.parts.booster]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030512, 0.0009);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1600);
    camera.position.set(11, 6.5, 15);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor(0x02030a, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    container.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xbcd6ff, 0x100d22, 1.2));

    const sun = new THREE.DirectionalLight(0xfff4e0, 2.9);
    sun.position.set(26, 36, 18);
    scene.add(sun);

    const rim = new THREE.PointLight(0x4cc9f0, 80, 200, 2);
    rim.position.set(-30, 20, -20);
    scene.add(rim);

    const stars = makeStarField();
    scene.add(stars);

    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(96, 72, 48),
      new THREE.MeshStandardMaterial({
        map: makeEarthTexture(),
        roughness: 0.68,
        metalness: 0.05,
        emissive: 0x061a33,
        emissiveIntensity: 0.45,
      }),
    );
    earth.position.set(0, -96, 0);
    scene.add(earth);

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(99, 64, 40),
      new THREE.MeshBasicMaterial({
        color: 0x4cc9f0,
        transparent: true,
        opacity: 0.16,
        side: THREE.BackSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    atmosphere.position.copy(earth.position);
    scene.add(atmosphere);

    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(MOON_RADIUS, 56, 36),
      new THREE.MeshStandardMaterial({
        map: makeMoonTexture(),
        roughness: 0.96,
        metalness: 0,
        emissive: 0x1d2538,
        emissiveIntensity: 0.35,
      }),
    );
    moon.position.copy(MOON_CENTER);
    scene.add(moon);

    const moonGlowTexture = makeGlowTexture("rgba(207,228,255,0.55)", "rgba(207,228,255,0)");
    const moonHalo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: moonGlowTexture,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    moonHalo.scale.set(92, 92, 1);
    moonHalo.position.copy(MOON_CENTER);
    scene.add(moonHalo);

    const pad = makeLaunchPad();
    scene.add(pad);

    const smoke = makeSmoke();
    scene.add(smoke);

    const rocket = buildRocket(build, { ghosts: false, showFlags: true });
    const rocketGroup = rocket.group;
    scene.add(rocketGroup);

    const glowTexture = makeGlowTexture("rgba(255,179,71,0.75)", "rgba(255,179,71,0)");
    const engineGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    engineGlow.scale.set(2.8, 2.8, 1);
    rocketGroup.add(engineGlow);

    const targetPosition = flightPosition(stateRef.current.phase, stateRef.current.phaseProgress);
    rocketGroup.position.copy(targetPosition);
    engineGlow.position.set(0, -0.35, 0);

    const lookTarget = new THREE.Vector3();
    const cameraTarget = new THREE.Vector3();
    const desiredCamera = new THREE.Vector3();
    const clock = new THREE.Clock();
    let elapsed = 0;

    const resize = () => {
      const width = container.clientWidth || 640;
      const height = container.clientHeight || 420;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05);
      const state = stateRef.current;
      if (!state.paused) elapsed += delta;

      const target = flightPosition(state.phase, state.phaseProgress);
      const follow = 1 - Math.exp(-delta * 7.5);
      rocketGroup.position.lerp(target, follow);

      const landTilt = state.phase === "done" && state.success === false ? 0.42 : 0;
      const tilt = state.steer * 0.2;
      rocketGroup.rotation.z += (tilt - rocketGroup.rotation.z) * (1 - Math.exp(-delta * 6));
      rocketGroup.rotation.x += (landTilt - rocketGroup.rotation.x) * (1 - Math.exp(-delta * 3));

      const visual: RocketVisual = rocket;
      setBoostersSeparated(visual, state.staged || !state.hasBoosters);
      setRocketThrottle(visual, state.throttle, state.hasBoosters && !state.staged);
      engineGlow.material.opacity = state.throttle > 0.02 ? 0.75 + Math.sin(elapsed * 22) * 0.18 : 0;
      engineGlow.scale.setScalar(2.3 + state.throttle * 1.3 + Math.sin(elapsed * 17) * 0.18);

      const height = rocketGroup.position.y;
      const launchFactor = Math.min(1, Math.max(0, 1 - height / 30));
      smoke.children.forEach((child, index) => {
        const sprite = child as THREE.Sprite;
        const material = sprite.material as THREE.SpriteMaterial;
        const drift = sprite.userData.drift as number;
        const baseX = sprite.userData.baseX as number;
        const baseZ = sprite.userData.baseZ as number;
        if (height > 0.5 && launchFactor > 0) {
          sprite.position.x = baseX + Math.cos(elapsed * 0.8 + index) * drift * elapsed * 0.2;
          sprite.position.z = baseZ + Math.sin(elapsed * 0.7 + index) * drift * elapsed * 0.2;
          material.opacity = launchFactor * 0.42 * Math.max(0, 1 - elapsed * 0.06);
        } else {
          material.opacity = 0;
        }
      });

      if (!reduceMotion) {
        stars.rotation.y = elapsed * 0.002;
        moon.rotation.y = elapsed * 0.004;
        moonHalo.material.opacity = 0.24 + Math.sin(elapsed * 0.9) * 0.04;
      }

      const rocketPos = rocketGroup.position;
      lookTarget.set(rocketPos.x, rocketPos.y + 2.1, rocketPos.z);
      const distance = state.phase === "landing" || state.phase === "done" ? 13 : 17;
      const lift = state.phase === "coast" || state.phase === "arrival" ? 5 : 3;
      desiredCamera.set(rocketPos.x + distance * 0.62, rocketPos.y + lift, rocketPos.z + distance);
      cameraTarget.lerp(desiredCamera, 1 - Math.exp(-delta * 3.2));
      camera.position.lerp(cameraTarget, 1 - Math.exp(-delta * 4));
      camera.lookAt(lookTarget);

      renderer.render(scene, camera);
    };

    cameraTarget.copy(camera.position);
    animate();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) material.forEach((item) => item.dispose());
          else material.dispose();
        }
      });
      rocket.flames.traverse((object) => {
        if (object instanceof THREE.Mesh) object.geometry.dispose();
      });
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [build]);

  return <div ref={containerRef} className="moon-flight-scene" aria-hidden="true" />;
}
