"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { disposeObject, makeGlowTexture } from "@/components/three/helpers";
import type { PartSlot, RocketBuild } from "../types";
import { buildRocket } from "./rocket";

interface AssemblySceneProps {
  build: RocketBuild;
  focusSlot: PartSlot | null;
  onSelectSlot: (slot: PartSlot | null) => void;
  onHoverSlot?: (slot: PartSlot | null) => void;
  lastFit?: { slot: PartSlot; nonce: number } | null;
}

function findSlot(object: THREE.Object3D | null): PartSlot | null {
  let node: THREE.Object3D | null = object;
  while (node) {
    const slot = node.userData.slot;
    if (typeof slot === "string") return slot as PartSlot;
    node = node.parent;
  }
  return null;
}

function makeStarField(): THREE.Points {
  const count = 520;
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    const radius = 12 + Math.random() * 26;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[index * 3 + 1] = radius * Math.cos(phi) * 0.7 + 2;
    positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xcfe4ff,
    size: 0.075,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.Points(geometry, material);
}

function makePad(): THREE.Group {
  const pad = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(2.05, 2.2, 0.18, 48),
    new THREE.MeshStandardMaterial({
      color: 0x101a36,
      roughness: 0.72,
      metalness: 0.35,
    }),
  );
  base.position.y = -0.09;
  pad.add(base);

  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0x4cc9f0,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.86, 0.018, 8, 64),
    ringMaterial,
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.015;
  pad.add(ring);

  for (const radius of [1.2, 0.72]) {
    const inner = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.008, 6, 48),
      new THREE.MeshBasicMaterial({
        color: 0x2b6f98,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
      }),
    );
    inner.rotation.x = Math.PI / 2;
    inner.position.y = 0.014;
    pad.add(inner);
  }

  for (let index = 0; index < 4; index += 1) {
    const angle = (index / 4) * Math.PI * 2 + Math.PI / 4;
    const clamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.24, 0.4),
      new THREE.MeshStandardMaterial({
        color: 0x32436f,
        roughness: 0.5,
        metalness: 0.6,
      }),
    );
    clamp.position.set(
      Math.cos(angle) * 1.36,
      0.1,
      Math.sin(angle) * 1.36,
    );
    clamp.rotation.y = -angle;
    pad.add(clamp);
  }

  return pad;
}

export default function AssemblyScene({
  build,
  focusSlot,
  onSelectSlot,
  onHoverSlot,
  lastFit,
}: AssemblySceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const focusRef = useRef<PartSlot | null>(focusSlot);
  const selectRef = useRef(onSelectSlot);
  const hoverRef = useRef(onHoverSlot);

  useEffect(() => {
    focusRef.current = focusSlot;
  }, [focusSlot]);

  useEffect(() => {
    selectRef.current = onSelectSlot;
  }, [onSelectSlot]);

  useEffect(() => {
    hoverRef.current = onHoverSlot;
  }, [onHoverSlot]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "none";
    container.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xcfe4ff, 0x18112e, 1.35));

    const key = new THREE.DirectionalLight(0xffffff, 2.6);
    key.position.set(6, 10, 8);
    scene.add(key);

    const rim = new THREE.PointLight(0xff5d73, 30, 30, 2);
    rim.position.set(-6, 4, -5);
    scene.add(rim);

    const fill = new THREE.PointLight(0x4cc9f0, 24, 26, 2);
    fill.position.set(7, 2, 6);
    scene.add(fill);

    const root = new THREE.Group();
    scene.add(root);

    const stars = makeStarField();
    root.add(stars);

    const glowTexture = makeGlowTexture(
      "rgba(76,201,240,0.42)",
      "rgba(76,201,240,0)",
    );
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.5,
      }),
    );
    glow.scale.set(7.5, 7.5, 1);
    glow.position.set(0, 2.1, -1.4);
    root.add(glow);

    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(2.4, 36, 24),
      new THREE.MeshStandardMaterial({
        color: 0xc7d4ee,
        roughness: 0.96,
        metalness: 0,
        emissive: 0x27314e,
        emissiveIntensity: 0.35,
      }),
    );
    moon.position.set(8.5, 7.4, -15);
    root.add(moon);
    const moonHalo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.18,
      }),
    );
    moonHalo.scale.set(6.4, 6.4, 1);
    moonHalo.position.copy(moon.position);
    root.add(moonHalo);

    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(3.3, 36, 24),
      new THREE.MeshStandardMaterial({
        color: 0x2f7fd0,
        roughness: 0.6,
        metalness: 0.1,
        emissive: 0x0b2a4d,
        emissiveIntensity: 0.6,
      }),
    );
    earth.position.set(-10, 5.6, -18);
    root.add(earth);

    const pad = makePad();
    root.add(pad);

    const turntable = new THREE.Group();
    root.add(turntable);

    const visual = buildRocket(build, { ghosts: true });
    turntable.add(visual.group);

    const focusBox = new THREE.BoxHelper(turntable, 0x4cc9f0);
    focusBox.visible = false;
    focusBox.material.transparent = true;
    focusBox.material.opacity = 0.75;
    focusBox.material.depthWrite = false;
    root.add(focusBox);

    let appearGroup: THREE.Object3D | null = null;
    let appear = 1;
    let flash: THREE.Sprite | null = null;
    if (lastFit) {
      appearGroup = visual.slotGroups[lastFit.slot] ?? null;
      if (appearGroup) {
        appear = 0;
        appearGroup.scale.setScalar(0.01);
        const box = new THREE.Box3().setFromObject(appearGroup);
        const center = box.getCenter(new THREE.Vector3());
        const flashTexture = makeGlowTexture(
          "rgba(255,209,102,0.95)",
          "rgba(255,209,102,0)",
        );
        flash = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: flashTexture,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            opacity: 0.95,
          }),
        );
        flash.position.copy(center);
        flash.position.y += 0.2;
        turntable.add(flash);
      }
    }

    let lastInteraction = performance.now();
    let dragging = false;
    let didDrag = false;
    let lastX = 0;
    let lastY = 0;
    let yaw = 0;
    let yawTarget = 0;
    let camHeight = visual.height * 0.52 + 1.4;
    let camHeightTarget = camHeight;
    let distance =
      container.clientWidth > 0 && container.clientWidth < 620 ? 14 : 10.5;
    let distanceTarget = distance;
    let hovered: PartSlot | null = null;
    let focusShown: PartSlot | null = null;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const updatePointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObject(visual.group, true);
      return findSlot(hits[0]?.object ?? null);
    };

    const onPointerDown = (event: PointerEvent) => {
      dragging = true;
      didDrag = false;
      lastX = event.clientX;
      lastY = event.clientY;
      lastInteraction = performance.now();
      renderer.domElement.setPointerCapture(event.pointerId);
      renderer.domElement.style.cursor = "grabbing";
    };

    const onPointerMove = (event: PointerEvent) => {
      lastInteraction = performance.now();
      if (dragging) {
        const dx = event.clientX - lastX;
        const dy = event.clientY - lastY;
        if (Math.abs(dx) + Math.abs(dy) > 6) didDrag = true;
        yawTarget -= dx * 0.009;
        camHeightTarget = THREE.MathUtils.clamp(
          camHeightTarget + dy * 0.012,
          1.2,
          8.2,
        );
        lastX = event.clientX;
        lastY = event.clientY;
        return;
      }
      const next = updatePointer(event);
      renderer.domElement.style.cursor = next ? "pointer" : "grab";
      if (next !== hovered) {
        hovered = next;
        hoverRef.current?.(next);
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      const wasDragging = dragging;
      dragging = false;
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
      renderer.domElement.style.cursor = hovered ? "pointer" : "grab";
      if (!wasDragging || didDrag) return;
      selectRef.current(updatePointer(event));
    };

    const onPointerLeave = () => {
      if (dragging) return;
      if (hovered) {
        hovered = null;
        hoverRef.current?.(null);
      }
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      lastInteraction = performance.now();
      distanceTarget = THREE.MathUtils.clamp(
        distanceTarget * (event.deltaY > 0 ? 1.08 : 0.92),
        7,
        17,
      );
    };

    const onDoubleClick = () => {
      yawTarget = 0;
      camHeightTarget = visual.height * 0.52 + 1.4;
      distanceTarget = 10.5;
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerUp);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
    renderer.domElement.addEventListener("dblclick", onDoubleClick);

    const updateCamera = () => {
      camera.aspect = Math.max(0.1, container.clientWidth / Math.max(1, container.clientHeight));
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight, false);
    };
    const observer = new ResizeObserver(updateCamera);
    observer.observe(container);
    updateCamera();

    const lookAt = new THREE.Vector3(0, visual.height * 0.47, 0);
    let raf = 0;
    let last = performance.now();

    const animate = (now: number) => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (!dragging && now - lastInteraction > 3200) {
        yawTarget += dt * 0.16;
      }
      yaw += (yawTarget - yaw) * 0.12;
      camHeight += (camHeightTarget - camHeight) * 0.1;
      distance += (distanceTarget - distance) * 0.1;
      turntable.rotation.y = yaw;

      camera.position.set(
        Math.sin(0.62) * distance,
        camHeight,
        Math.cos(0.62) * distance,
      );
      camera.lookAt(lookAt.x, lookAt.y, lookAt.z);

      if (appearGroup && appear < 1) {
        appear = Math.min(1, appear + dt * 3.2);
        const eased = 1 - Math.pow(1 - appear, 3);
        appearGroup.scale.setScalar(0.01 + eased * 0.99);
        if (appear >= 1) appearGroup.scale.setScalar(1);
      }
      if (flash) {
        flash.scale.setScalar(0.6 + (1 - appear) * 2.6);
        const material = flash.material as THREE.SpriteMaterial;
        material.opacity = Math.max(0, 0.95 - appear * 1.4);
        if (appear >= 1) {
          turntable.remove(flash);
          disposeObject(flash);
          flash = null;
        }
      }

      const active = focusRef.current ?? hovered;
      if (active !== focusShown) {
        focusShown = active;
        const group = active ? visual.slotGroups[active] : undefined;
        if (group) {
          focusBox.setFromObject(group);
          focusBox.visible = true;
        } else {
          focusBox.visible = false;
        }
      }
      if (focusBox.visible) {
        const material = focusBox.material as THREE.LineBasicMaterial;
        const isHover = !focusRef.current && Boolean(hovered);
        material.color.setHex(isHover ? 0xffd166 : 0x4cc9f0);
        material.opacity = 0.58 + Math.sin(now / 280) * 0.2;
      }

      stars.rotation.y += dt * 0.006;
      glow.material.opacity = 0.42 + Math.sin(now / 1600) * 0.06;

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerUp);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.domElement.removeEventListener("dblclick", onDoubleClick);
      disposeObject(scene);
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [build, lastFit]);

  return (
    <div
      ref={containerRef}
      className="moon-three-canvas"
      role="img"
      aria-label="Interactive 3D rocket. Drag to rotate, scroll to zoom, and click a rocket section to choose parts."
    />
  );
}
