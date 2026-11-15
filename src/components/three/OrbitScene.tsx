"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { MissionMetrics, ResolvedMission } from "@/engine/types";
import {
  attachPanZoom,
  disposeObject,
  makeEarthTexture,
  makeGlowTexture,
  makeLabelSprite,
  makeStarTexture,
} from "./helpers";

interface OrbitSceneProps {
  resolved: ResolvedMission;
  metrics: MissionMetrics;
  paused: boolean;
  speed: number;
  onTogglePause: () => void;
}

export default function OrbitScene({
  resolved,
  metrics,
  paused,
  speed,
  onTogglePause,
}: OrbitSceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useRef(paused);
  const speedRef = useRef(speed);
  const toggleRef = useRef(onTogglePause);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    toggleRef.current = onTogglePause;
  }, [onTogglePause]);

  const signature = [
    resolved.orbit.id,
    resolved.rocket.id,
    resolved.parts.camera.id,
    resolved.parts.panel.id,
    resolved.parts.battery.id,
    resolved.parts.radio.id,
    resolved.parts.computer.id,
    Math.round(metrics.totalMassKg),
    resolved.weather.kpIndex,
  ].join("|");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const { orbit, parts } = resolved;
    const sunAngle = -0.62;
    const orbitRadius = 1.32 + Math.log10(1 + orbit.altitudeKm / 300) * 0.82;
    const earthRadius = 1.22;
    const wingLength = THREE.MathUtils.clamp(0.22 + parts.panel.areaM2 * 0.16, 0.22, 0.62);
    const bodyScale = THREE.MathUtils.clamp(0.78 + metrics.totalMassKg / 320, 0.8, 1.42);
    const lensRadius = THREE.MathUtils.clamp(
      0.048 + (1 - Math.min(1, parts.camera.resolutionM / 120)) * 0.045,
      0.048,
      0.094,
    );

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-3.45, 3.45, 2.65, -2.65, 0.1, 100);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    const root = new THREE.Group();
    scene.add(root);

    const starTexture = makeStarTexture();
    const makeStars = (count: number, size: number, opacity: number, color: number) => {
      const positions = new Float32Array(count * 3);
      for (let index = 0; index < count; index += 1) {
        positions[index * 3] = (Math.random() - 0.5) * 13;
        positions[index * 3 + 1] = (Math.random() - 0.5) * 9;
        positions[index * 3 + 2] = -4 - Math.random() * 3;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const material = new THREE.PointsMaterial({
        map: starTexture,
        color,
        size,
        transparent: true,
        opacity,
        depthWrite: false,
      });
      const stars = new THREE.Points(geometry, material);
      root.add(stars);
      return stars;
    };
    const starsA = makeStars(320, 0.055, 0.8, 0xe2e8f0);

    const earthGroup = new THREE.Group();
    root.add(earthGroup);

    const earthTexture = makeEarthTexture();
    const earth = new THREE.Mesh(
      new THREE.CircleGeometry(earthRadius, 96),
      new THREE.MeshBasicMaterial({ map: earthTexture, transparent: true }),
    );
    earth.position.z = 0.1;
    earthGroup.add(earth);

    const atmosphere = new THREE.Mesh(
      new THREE.RingGeometry(earthRadius * 1.005, earthRadius * 1.075, 96),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    atmosphere.position.z = 0.05;
    earthGroup.add(atmosphere);

    const orbitPoints: THREE.Vector3[] = [];
    const segmentCount = 192;
    for (let index = 0; index <= segmentCount; index += 1) {
      const theta = (index / segmentCount) * Math.PI * 2;
      orbitPoints.push(
        new THREE.Vector3(Math.cos(theta) * orbitRadius, Math.sin(theta) * orbitRadius, 0),
      );
    }
    const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
    const orbitLine = new THREE.Line(
      orbitGeometry,
      new THREE.LineDashedMaterial({
        color: 0x38bdf8,
        dashSize: 0.09,
        gapSize: 0.055,
        transparent: true,
        opacity: 0.58,
      }),
    );
    orbitLine.computeLineDistances();
    root.add(orbitLine);

    const eclipsePoints: THREE.Vector3[] = [];
    for (let index = 0; index <= segmentCount; index += 1) {
      const theta = (index / segmentCount) * Math.PI * 2;
      if (Math.cos(theta - sunAngle) < 0) {
        eclipsePoints.push(
          new THREE.Vector3(Math.cos(theta) * (orbitRadius + 0.035), Math.sin(theta) * (orbitRadius + 0.035), 0),
        );
      }
    }
    if (eclipsePoints.length > 1) {
      const eclipseGeometry = new THREE.BufferGeometry().setFromPoints(eclipsePoints);
      const eclipseLine = new THREE.Line(
        eclipseGeometry,
        new THREE.LineDashedMaterial({
          color: 0x64748b,
          dashSize: 0.05,
          gapSize: 0.07,
          transparent: true,
          opacity: 0.55,
        }),
      );
      eclipseLine.computeLineDistances();
      root.add(eclipseLine);

      const eclipseLabel = makeLabelSprite("ECLIPSE", {
        color: "#94a3b8",
        border: "rgba(100,116,139,0.4)",
        fontSize: 34,
        scale: [1.2, 0.28],
      });
      eclipseLabel.position.set(
        Math.cos(sunAngle + Math.PI) * orbitRadius,
        Math.sin(sunAngle + Math.PI) * orbitRadius,
        0.4,
      );
      root.add(eclipseLabel);
    }

    const stationAngles = orbit.groundStations.map(
      (_, index) => -0.9 + index * (1.8 / Math.max(1, orbit.groundStations.length - 1)),
    );
    const stationDots: { ring: THREE.Mesh; angle: number; cooldown: number }[] = [];
    orbit.groundStations.forEach((name, index) => {
      const angle = stationAngles[index] ?? -0.9 + index * 0.9;
      const x = Math.cos(angle) * earthRadius;
      const y = Math.sin(angle) * earthRadius;
      const dot = new THREE.Mesh(
        new THREE.CircleGeometry(0.038, 24),
        new THREE.MeshBasicMaterial({ color: 0x34d399 }),
      );
      dot.position.set(x, y, 0.3);
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.055, 0.07, 32),
        new THREE.MeshBasicMaterial({
          color: 0x34d399,
          transparent: true,
          opacity: 0.35,
          side: THREE.DoubleSide,
        }),
      );
      ring.position.set(x, y, 0.29);
      root.add(dot, ring);
      stationDots.push({ ring, angle, cooldown: 0 });

      const label = makeLabelSprite(name.toUpperCase(), {
        color: "#6ee7b7",
        border: "rgba(52,211,153,0.28)",
        fontSize: 30,
        scale: [1.1, 0.25],
      });
      label.position.set(x * 1.32, y * 1.32, 0.35);
      root.add(label);
    });

    const sunDistance = Math.min(3.22, Math.max(2.4, orbitRadius + 0.78));
    const sunX = Math.cos(sunAngle) * sunDistance;
    const sunY = Math.sin(sunAngle) * sunDistance;
    const sunGlowTexture = makeGlowTexture(
      "rgba(251,191,36,0.85)",
      "rgba(251,191,36,0)",
    );
    const sunGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: sunGlowTexture,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    sunGlow.scale.set(1.35, 1.35, 1);
    sunGlow.position.set(sunX, sunY, -0.2);
    root.add(sunGlow);

    const sun = new THREE.Mesh(
      new THREE.CircleGeometry(0.15, 32),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 }),
    );
    sun.position.set(sunX, sunY, -0.1);
    root.add(sun);

    const sunLabel = makeLabelSprite("SOL", {
      color: "#fde68a",
      border: "rgba(251,191,36,0.3)",
      fontSize: 30,
      scale: [0.75, 0.23],
    });
    sunLabel.position.set(sunX, sunY - 0.34, 0.1);
    root.add(sunLabel);

    const satellite = new THREE.Group();
    satellite.scale.setScalar(bodyScale);
    const haloTexture = makeGlowTexture("rgba(56,189,248,0.5)", "rgba(56,189,248,0)");
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: haloTexture,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.65,
      }),
    );
    halo.scale.set(0.85, 0.85, 1);
    halo.position.z = -0.2;
    satellite.add(halo);

    const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.18, 0.06), bodyMaterial);
    satellite.add(body);
    const bodyEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(body.geometry),
      new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.9 }),
    );
    satellite.add(bodyEdges);

    const wingMaterial = new THREE.MeshBasicMaterial({ color: 0x1d4ed8 });
    const wingGeometry = new THREE.PlaneGeometry(wingLength, 0.095);
    const wingOffsets = [-(0.135 + wingLength / 2), 0.135 + wingLength / 2];
    const wings = wingOffsets.map((x) => {
      const wing = new THREE.Mesh(wingGeometry, wingMaterial);
      wing.position.set(x, 0, 0);
      satellite.add(wing);
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(wingGeometry),
        new THREE.LineBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.8 }),
      );
      edges.position.copy(wing.position);
      satellite.add(edges);
      return wing;
    });

    const lensMaterial = new THREE.MeshBasicMaterial({ color: 0x0ea5e9 });
    const lens = new THREE.Mesh(new THREE.CircleGeometry(lensRadius, 24), lensMaterial);
    lens.position.set(0, -0.125, 0.04);
    satellite.add(lens);
    const lensRing = new THREE.Mesh(
      new THREE.RingGeometry(lensRadius * 1.12, lensRadius * 1.4, 24),
      new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.75 }),
    );
    lensRing.position.copy(lens.position);
    satellite.add(lensRing);

    const antennaLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0.09, 0.04),
        new THREE.Vector3(0, 0.23, 0.04),
      ]),
      new THREE.LineBasicMaterial({ color: 0xcbd5e1 }),
    );
    satellite.add(antennaLine);
    const antennaDish = new THREE.Mesh(
      new THREE.CircleGeometry(0.035, 20),
      new THREE.MeshBasicMaterial({ color: 0xe2e8f0 }),
    );
    antennaDish.position.set(0, 0.245, 0.04);
    satellite.add(antennaDish);

    const satelliteLabel = makeLabelSprite("FLOOD-1", {
      color: "#bae6fd",
      border: "rgba(56,189,248,0.45)",
      fontSize: 34,
      scale: [1.12, 0.28],
    });
    satelliteLabel.position.set(0, -0.38, 0.1);
    satellite.add(satelliteLabel);

    root.add(satellite);

    const trailMax = 56;
    const trailPositions = new Float32Array(trailMax * 3);
    const trailGeometry = new THREE.BufferGeometry();
    trailGeometry.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
    trailGeometry.setDrawRange(0, 0);
    const trail = new THREE.Line(
      trailGeometry,
      new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.4,
      }),
    );
    root.add(trail);
    let trailCount = 0;
    let lastTrailAngle = -10;
    let previousLoopAngle = 0;

    const pulses: {
      mesh: THREE.Mesh;
      active: boolean;
      t: number;
      x: number;
      y: number;
    }[] = [];
    for (let index = 0; index < 5; index += 1) {
      const mesh = new THREE.Mesh(
        new THREE.RingGeometry(0.055, 0.07, 32),
        new THREE.MeshBasicMaterial({
          color: 0x34d399,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      mesh.visible = false;
      root.add(mesh);
      pulses.push({ mesh, active: false, t: 0, x: 0, y: 0 });
    }

    const fitCamera = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width === 0 || height === 0) return;
      const aspect = width / height;
      const targetWidth = 6.9;
      const targetHeight = 5.3;
      let viewWidth = targetWidth;
      let viewHeight = targetHeight;
      if (aspect > targetWidth / targetHeight) {
        viewHeight = targetHeight;
        viewWidth = viewHeight * aspect;
      } else {
        viewWidth = targetWidth;
        viewHeight = viewWidth / aspect;
      }
      camera.left = -viewWidth / 2;
      camera.right = viewWidth / 2;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      const size = Math.min(width, height);
      const labelScale = THREE.MathUtils.clamp(size / 520, 0.65, 1.15);
      satelliteLabel.scale.set(1.12 * labelScale, 0.28 * labelScale, 1);
      sunLabel.scale.set(0.75 * labelScale, 0.23 * labelScale, 1);
    };

    const observer = new ResizeObserver(fitCamera);
    observer.observe(container);
    fitCamera();

    const panZoom = attachPanZoom(renderer.domElement, camera);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDown: { x: number; y: number } | null = null;

    const onPointerDownCapture = (event: PointerEvent) => {
      pointerDown = { x: event.clientX, y: event.clientY };
    };
    const onPointerUpCapture = (event: PointerEvent) => {
      if (!pointerDown) return;
      const distance = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
      pointerDown = null;
      if (distance > 6) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects([body, ...wings, lens], false);
      if (intersects.length > 0) {
        toggleRef.current();
      }
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDownCapture);
    renderer.domElement.addEventListener("pointerup", onPointerUpCapture);

    let angle = 2.05;
    let lastTime = performance.now();
    let raf = 0;
    let wasEclipsed = false;

    const setEclipse = (eclipsed: boolean) => {
      if (eclipsed === wasEclipsed) return;
      wasEclipsed = eclipsed;
      bodyMaterial.color.set(eclipsed ? "#94a3b8" : "#e2e8f0");
      wingMaterial.color.set(eclipsed ? "#1e293b" : "#1d4ed8");
      lensMaterial.color.set(eclipsed ? "#0e7490" : "#0ea5e9");
      (halo.material as THREE.SpriteMaterial).opacity = eclipsed ? 0.2 : 0.65;
    };

    const animate = (now: number) => {
      raf = requestAnimationFrame(animate);
      const delta = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      if (!pausedRef.current) {
        angle += delta * speedRef.current * ((Math.PI * 2) / 9);
      }

      const x = Math.cos(angle) * orbitRadius;
      const y = Math.sin(angle) * orbitRadius;
      satellite.position.set(x, y, 0.2);
      satellite.rotation.z = Math.sin(now / 2200) * 0.03;

      const eclipsed = Math.cos(angle - sunAngle) < 0;
      setEclipse(eclipsed);

      const loopAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      if (loopAngle < previousLoopAngle) {
        trailCount = 0;
        trailGeometry.setDrawRange(0, 0);
        lastTrailAngle = -10;
      }
      previousLoopAngle = loopAngle;
      if (Math.abs(angle - lastTrailAngle) > 0.055 && trailCount < trailMax) {
        trailPositions[trailCount * 3] = x;
        trailPositions[trailCount * 3 + 1] = y;
        trailPositions[trailCount * 3 + 2] = 0.15;
        trailCount += 1;
        lastTrailAngle = angle;
        const attribute = trailGeometry.getAttribute("position") as THREE.BufferAttribute;
        attribute.needsUpdate = true;
        trailGeometry.setDrawRange(0, trailCount);
      }

      for (const station of stationDots) {
        station.cooldown = Math.max(0, station.cooldown - delta);
        const angularDistance = Math.abs(
          Math.atan2(Math.sin(angle - station.angle), Math.cos(angle - station.angle)),
        );
        station.ring.scale.setScalar(1 + Math.sin(now / 400 + station.angle) * 0.08);
        (station.ring.material as THREE.MeshBasicMaterial).opacity =
          0.28 + Math.max(0, 0.35 - angularDistance) * 1.5;

        if (angularDistance < 0.075 && station.cooldown <= 0) {
          station.cooldown = 3.2;
          const pulse = pulses.find((candidate) => !candidate.active);
          if (pulse) {
            pulse.active = true;
            pulse.t = 0;
            pulse.x = Math.cos(station.angle) * earthRadius;
            pulse.y = Math.sin(station.angle) * earthRadius;
            pulse.mesh.visible = true;
            pulse.mesh.position.set(pulse.x, pulse.y, 0.32);
          }
        }
      }

      for (const pulse of pulses) {
        if (!pulse.active) continue;
        pulse.t += delta;
        const progress = pulse.t / 0.85;
        if (progress >= 1) {
          pulse.active = false;
          pulse.mesh.visible = false;
          continue;
        }
        pulse.mesh.scale.setScalar(1 + progress * 5.5);
        (pulse.mesh.material as THREE.MeshBasicMaterial).opacity = 0.75 * (1 - progress);
      }

      sunGlow.scale.setScalar(1.35 + Math.sin(now / 900) * 0.05);
      const starMaterialA = starsA.material as THREE.PointsMaterial;
      starMaterialA.opacity = 0.7 + Math.sin(now / 1400) * 0.1;

      panZoom.update();
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDownCapture);
      renderer.domElement.removeEventListener("pointerup", onPointerUpCapture);
      panZoom.dispose();
      disposeObject(scene);
      earthTexture.dispose();
      starTexture.dispose();
      sunGlowTexture.dispose();
      haloTexture.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return <div ref={containerRef} className="three-canvas" aria-label="Interactive orbit view" />;
}
