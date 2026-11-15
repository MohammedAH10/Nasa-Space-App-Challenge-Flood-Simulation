"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type {
  MissionMetrics,
  PartCategory,
  ResolvedMission,
} from "@/engine/types";
import {
  attachPanZoom,
  disposeObject,
  makeGlowTexture,
  makeLabelSprite,
  makeRoundedPanel,
} from "./helpers";

interface AssemblySceneProps {
  resolved: ResolvedMission;
  metrics: MissionMetrics;
  focusCategory: PartCategory | null;
  onSelectPart: (category: PartCategory | null) => void;
}

interface NodeHandle {
  category: PartCategory;
  group: THREE.Group;
  halo: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
}

const CATEGORY_COLORS: Record<PartCategory, number> = {
  camera: 0xfbbf24,
  panel: 0x60a5fa,
  battery: 0x34d399,
  radio: 0xf472b6,
  computer: 0xa78bfa,
};

function roundedOutline(
  width: number,
  height: number,
  radius: number,
  color: number,
  opacity = 0.8,
): THREE.Line {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  const r = Math.min(radius, width / 2, height / 2);
  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + height - r);
  shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  shape.lineTo(x + r, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  const points = shape.getPoints(32).map((point) => new THREE.Vector3(point.x, point.y, 0));
  points.push(points[0].clone());
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  return new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
  );
}

export default function AssemblyScene({
  resolved,
  metrics,
  focusCategory,
  onSelectPart,
}: AssemblySceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const focusRef = useRef<PartCategory | null>(focusCategory);
  const selectRef = useRef(onSelectPart);
  useEffect(() => {
    focusRef.current = focusCategory;
  }, [focusCategory]);

  useEffect(() => {
    selectRef.current = onSelectPart;
  }, [onSelectPart]);

  const signature = [
    resolved.parts.camera.id,
    resolved.parts.panel.id,
    resolved.parts.battery.id,
    resolved.parts.radio.id,
    resolved.parts.computer.id,
    Math.round(metrics.totalMassKg),
  ].join("|");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const { parts } = resolved;
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-3.2, 3.2, 2.6, -2.6, 0.1, 100);
    camera.position.set(0, 0, 10);

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

    const glowTexture = makeGlowTexture("rgba(56,189,248,0.3)", "rgba(56,189,248,0)");
    const ambient = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.25,
      }),
    );
    ambient.scale.set(4.8, 4.8, 1);
    ambient.position.set(0, 0.1, -0.8);
    root.add(ambient);

    const gridPositions: number[] = [];
    for (let x = -4; x <= 4; x += 0.5) {
      gridPositions.push(x, -3.2, -0.9, x, 3.2, -0.9);
    }
    for (let y = -3; y <= 3; y += 0.5) {
      gridPositions.push(-4, y, -0.9, 4, y, -0.9);
    }
    const gridGeometry = new THREE.BufferGeometry();
    gridGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(gridPositions, 3),
    );
    root.add(
      new THREE.LineSegments(
        gridGeometry,
        new THREE.LineBasicMaterial({
          color: 0x1e3a5f,
          transparent: true,
          opacity: 0.35,
          depthWrite: false,
        }),
      ),
    );

    const corner = (x: number, y: number, sx: number, sy: number) => {
      const points = [
        new THREE.Vector3(x, y + sy * 0.18, 0),
        new THREE.Vector3(x, y, 0),
        new THREE.Vector3(x + sx * 0.18, y, 0),
      ];
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.45,
        }),
      );
      root.add(line);
    };
    corner(-3.05, 2.35, 1, -1);
    corner(3.05, 2.35, -1, -1);
    corner(-3.05, -2.35, 1, 1);
    corner(3.05, -2.35, -1, 1);

    const title = makeLabelSprite("SPACECRAFT ASSEMBLY", {
      color: "#bae6fd",
      background: "rgba(8,15,30,0.55)",
      border: "rgba(56,189,248,0.4)",
      fontSize: 34,
      scale: [2.6, 0.42],
    });
    title.position.set(0, 2.38, 0.6);
    root.add(title);

    const bus = new THREE.Group();
    const busPanel = makeRoundedPanel(1.24, 0.86, 0.12, 0x0b1a30, 0.96);
    bus.add(busPanel);
    const busOutline = roundedOutline(1.24, 0.86, 0.12, 0x38bdf8, 0.8);
    bus.add(busOutline);
    const busCore = makeRoundedPanel(0.82, 0.5, 0.08, 0x102a47, 0.9);
    busCore.position.z = 0.02;
    bus.add(busCore);
    const busLabel = makeLabelSprite("BUS", {
      color: "#7dd3fc",
      background: "transparent",
      fontSize: 30,
      scale: [0.7, 0.2],
    });
    busLabel.position.set(0, 0.0, 0.4);
    bus.add(busLabel);
    root.add(bus);

    const nodes: NodeHandle[] = [];
    const hitMeshes: THREE.Mesh[] = [];
    const connectionLines: THREE.Line[] = [];

    const addConnection = (from: [number, number], to: [number, number]) => {
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(from[0], from[1], -0.2),
          new THREE.Vector3(to[0], to[1], -0.2),
        ]),
        new THREE.LineDashedMaterial({
          color: 0x38bdf8,
          dashSize: 0.045,
          gapSize: 0.045,
          transparent: true,
          opacity: 0.32,
        }),
      );
      line.computeLineDistances();
      root.add(line);
      connectionLines.push(line);
    };

    const addNode = (
      category: PartCategory,
      x: number,
      y: number,
      hitWidth: number,
      hitHeight: number,
      build: (group: THREE.Group) => void,
      labelOffset: [number, number],
      spec: string,
      specOffset: [number, number],
    ) => {
      const group = new THREE.Group();
      group.position.set(x, y, 0.1);
      const color = CATEGORY_COLORS[category];
      const halo = makeRoundedPanel(hitWidth + 0.18, hitHeight + 0.18, 0.16, color, 0.14);
      halo.position.z = -0.15;
      group.add(halo);
      build(group);

      const nameLabel = makeLabelSprite(categoryLabelFor(parts[category].name), {
        color: "#e2e8f0",
        border: "rgba(148,163,184,0.28)",
        fontSize: 32,
        scale: [1.5, 0.3],
      });
      nameLabel.position.set(labelOffset[0], labelOffset[1], 0.5);
      group.add(nameLabel);

      const specLabel = makeLabelSprite(spec, {
        color: "#94a3b8",
        background: "transparent",
        border: "transparent",
        fontSize: 28,
        scale: [1.25, 0.24],
      });
      specLabel.position.set(specOffset[0], specOffset[1], 0.5);
      group.add(specLabel);

      const hit = new THREE.Mesh(
        new THREE.PlaneGeometry(hitWidth, hitHeight),
        new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0,
          depthWrite: false,
        }),
      );
      hit.position.z = 0.9;
      hit.userData.category = category;
      group.add(hit);
      hitMeshes.push(hit);

      root.add(group);
      nodes.push({
        category,
        group,
        halo,
        material: halo.material as THREE.MeshBasicMaterial,
      });
      return group;
    };

    const cameraR = THREE.MathUtils.clamp(
      0.16 + Math.min(1, parts.camera.science) * 0.08,
      0.16,
      0.26,
    );
    addNode(
      "camera",
      0,
      1.42,
      0.7,
      0.7,
      (group) => {
        const bodySquare = makeRoundedPanel(0.56, 0.4, 0.08, 0x1a2338, 1);
        group.add(bodySquare);
        const bodyEdge = roundedOutline(0.56, 0.4, 0.08, 0xfbbf24, 0.7);
        group.add(bodyEdge);
        const outer = new THREE.Mesh(
          new THREE.CircleGeometry(cameraR, 40),
          new THREE.MeshBasicMaterial({ color: 0x0f172a }),
        );
        outer.position.z = 0.04;
        group.add(outer);
        const lens = new THREE.Mesh(
          new THREE.CircleGeometry(cameraR * 0.72, 40),
          new THREE.MeshBasicMaterial({ color: 0xfbbf24 }),
        );
        lens.position.z = 0.05;
        group.add(lens);
        const lensGlint = new THREE.Mesh(
          new THREE.CircleGeometry(cameraR * 0.24, 24),
          new THREE.MeshBasicMaterial({ color: 0xfef3c7 }),
        );
        lensGlint.position.set(-cameraR * 0.22, cameraR * 0.22, 0.06);
        group.add(lensGlint);
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(cameraR * 1.05, cameraR * 1.16, 40),
          new THREE.MeshBasicMaterial({
            color: 0xfbbf24,
            transparent: true,
            opacity: 0.55,
          }),
        );
        ring.position.z = 0.05;
        group.add(ring);
      },
      [0, 0.4],
      `${parts.camera.resolutionM} m · ${parts.camera.dataGbPerDay} GB/d`,
      [0, -0.4],
    );

    const wingLength = THREE.MathUtils.clamp(
      0.4 + parts.panel.areaM2 * 0.32,
      0.42,
      1.2,
    );
    addNode(
      "panel",
      0,
      0.38,
      wingLength * 2 + 1.6,
      0.75,
      (group) => {
        const wingGeometry = new THREE.PlaneGeometry(wingLength, 0.24);
        [-1, 1].forEach((direction) => {
          const wing = new THREE.Mesh(
            wingGeometry,
            new THREE.MeshBasicMaterial({ color: 0x1d4ed8 }),
          );
          wing.position.set(
            direction * (0.62 + wingLength / 2),
            0,
            0.02,
          );
          group.add(wing);
          const outline = new THREE.LineSegments(
            new THREE.EdgesGeometry(wingGeometry),
            new THREE.LineBasicMaterial({
              color: 0x93c5fd,
              transparent: true,
              opacity: 0.85,
            }),
          );
          outline.position.copy(wing.position);
          group.add(outline);
          for (let line = 1; line < 4; line += 1) {
            const offset = -wingLength / 2 + (wingLength / 4) * line;
            const segment = new THREE.Line(
              new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(offset, -0.12, 0.03),
                new THREE.Vector3(offset, 0.12, 0.03),
              ]),
              new THREE.LineBasicMaterial({
                color: 0x3b82f6,
                transparent: true,
                opacity: 0.6,
              }),
            );
            segment.position.x = wing.position.x;
            group.add(segment);
          }
          const hinge = new THREE.Mesh(
            new THREE.CircleGeometry(0.045, 16),
            new THREE.MeshBasicMaterial({ color: 0xbfdbfe }),
          );
          hinge.position.set(direction * 0.62, 0, 0.04);
          group.add(hinge);
        });
      },
      [1.95, 0.34],
      `${parts.panel.peakW} W · ${parts.panel.areaM2} m²`,
      [1.95, 0.1],
    );

    addNode(
      "battery",
      -1.3,
      -1.02,
      0.95,
      0.85,
      (group) => {
        const pack = makeRoundedPanel(0.6, 0.44, 0.07, 0x0f2a2a, 1);
        group.add(pack);
        group.add(roundedOutline(0.6, 0.44, 0.07, 0x34d399, 0.8));
        const terminal = makeRoundedPanel(0.12, 0.08, 0.02, 0x34d399, 0.8);
        terminal.position.set(0, 0.26, 0.02);
        group.add(terminal);
        for (let bar = 0; bar < 3; bar += 1) {
          const cell = makeRoundedPanel(0.11, 0.24 - bar * 0.05, 0.02, 0x34d399, 0.85 - bar * 0.18);
          cell.position.set(-0.15 + bar * 0.15, -0.02, 0.03);
          group.add(cell);
        }
      },
      [0, -0.44],
      `${parts.battery.capacityWh} Wh`,
      [0, -0.67],
    );

    addNode(
      "radio",
      1.3,
      -1.02,
      0.95,
      0.9,
      (group) => {
        const mast = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, -0.24, 0.02),
            new THREE.Vector3(0, 0.02, 0.02),
          ]),
          new THREE.LineBasicMaterial({ color: 0xf9a8d4 }),
        );
        group.add(mast);
        const dish = new THREE.Mesh(
          new THREE.CircleGeometry(0.24, 32),
          new THREE.MeshBasicMaterial({ color: 0xf472b6 }),
        );
        dish.position.set(0, 0.13, 0.03);
        group.add(dish);
        const inner = new THREE.Mesh(
          new THREE.CircleGeometry(0.15, 32),
          new THREE.MeshBasicMaterial({ color: 0x831843 }),
        );
        inner.position.set(0, 0.13, 0.04);
        group.add(inner);
        const feed = new THREE.Mesh(
          new THREE.CircleGeometry(0.035, 16),
          new THREE.MeshBasicMaterial({ color: 0xfdf2f8 }),
        );
        feed.position.set(0, 0.13, 0.05);
        group.add(feed);
        const arc = new THREE.Mesh(
          new THREE.RingGeometry(0.26, 0.29, 32, 1, Math.PI * 0.15, Math.PI * 0.7),
          new THREE.MeshBasicMaterial({
            color: 0xf9a8d4,
            transparent: true,
            opacity: 0.55,
            side: THREE.DoubleSide,
          }),
        );
        arc.position.set(0, 0.13, 0.03);
        group.add(arc);
      },
      [0, -0.48],
      `${parts.radio.downlinkMbps} Mbps`,
      [0, -0.7],
    );

    addNode(
      "computer",
      0,
      -1.36,
      0.8,
      0.75,
      (group) => {
        const chip = makeRoundedPanel(0.46, 0.46, 0.06, 0x1e1b4b, 1);
        group.add(chip);
        group.add(roundedOutline(0.46, 0.46, 0.06, 0xa78bfa, 0.8));
        const die = makeRoundedPanel(0.22, 0.22, 0.03, 0xa78bfa, 0.75);
        die.position.z = 0.03;
        group.add(die);
        for (let pin = 0; pin < 4; pin += 1) {
          const offset = -0.15 + pin * 0.1;
          const vertical = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(offset, -0.25, 0.02),
              new THREE.Vector3(offset, -0.32, 0.02),
            ]),
            new THREE.LineBasicMaterial({ color: 0xc4b5fd }),
          );
          group.add(vertical);
          const horizontal = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(0.25, offset, 0.02),
              new THREE.Vector3(0.32, offset, 0.02),
            ]),
            new THREE.LineBasicMaterial({ color: 0xc4b5fd }),
          );
          group.add(horizontal);
        }
      },
      [0, -0.43],
      `${parts.computer.throughputGbPerDay} GB/d`,
      [0, -0.65],
    );

    addConnection([0, 0.46], [0, 1.18]);
    addConnection([-0.62, 0.3], [-1.0, -0.82]);
    addConnection([0.62, 0.3], [1.0, -0.82]);
    addConnection([0, -0.43], [0, -1.12]);

    const scanline = new THREE.Mesh(
      new THREE.PlaneGeometry(0.018, 4.8),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.09,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    scanline.position.z = -0.3;
    root.add(scanline);

    const fitCamera = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width === 0 || height === 0) return;
      const aspect = width / height;
      const targetWidth = 6.5;
      const targetHeight = 5.4;
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
    };
    const observer = new ResizeObserver(fitCamera);
    observer.observe(container);
    fitCamera();

    const panZoom = attachPanZoom(renderer.domElement, camera);
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hovered: PartCategory | null = null;
    let isDown = false;
    let pointerDown: { x: number; y: number } | null = null;

    const updatePointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(hitMeshes, false);
      hovered = (intersects[0]?.object.userData.category as PartCategory | undefined) ?? null;
    };

    const onPointerDown = (event: PointerEvent) => {
      isDown = true;
      pointerDown = { x: event.clientX, y: event.clientY };
      updatePointer(event);
    };
    const onPointerMove = (event: PointerEvent) => {
      updatePointer(event);
    };
    const onPointerUp = (event: PointerEvent) => {
      isDown = false;
      if (!pointerDown) return;
      const distance = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
      pointerDown = null;
      if (distance > 6) return;
      updatePointer(event);
      selectRef.current(hovered);
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerUp);

    let raf = 0;
    let last = performance.now();

    const animate = (now: number) => {
      raf = requestAnimationFrame(animate);
      const delta = Math.min(0.05, (now - last) / 1000);
      last = now;
      scanline.position.x = Math.sin(now / 2600) * 2.6;

      const focus = focusRef.current;
      for (const node of nodes) {
        const active = focus === node.category || hovered === node.category;
        const targetScale = active ? 1.045 : 1;
        node.group.scale.x += (targetScale - node.group.scale.x) * 0.18;
        node.group.scale.y += (targetScale - node.group.scale.y) * 0.18;
        const targetOpacity = active ? 0.34 : 0.1;
        node.material.opacity += (targetOpacity - node.material.opacity) * 0.2;
      }
      for (const line of connectionLines) {
        const material = line.material as THREE.LineDashedMaterial;
        material.opacity = 0.26 + Math.sin(now / 1600) * 0.06;
      }

      renderer.domElement.style.cursor = isDown ? "grabbing" : hovered ? "pointer" : "grab";
      panZoom.update();
      renderer.render(scene, camera);
      void delta;
    };
    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerUp);
      panZoom.dispose();
      disposeObject(scene);
      glowTexture.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return <div ref={containerRef} className="three-canvas" aria-label="Interactive spacecraft assembly" />;
}

function categoryLabelFor(name: string): string {
  return name.length > 18 ? `${name.slice(0, 17)}…` : name;
}
