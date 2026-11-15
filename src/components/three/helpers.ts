import * as THREE from "three";

export function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

export interface LabelOptions {
  color?: string;
  background?: string;
  border?: string;
  fontSize?: number;
  width?: number;
  height?: number;
  scale?: [number, number];
}

export function makeLabelSprite(text: string, options: LabelOptions = {}): THREE.Sprite {
  const {
    color = "#dbeafe",
    background = "rgba(8, 15, 30, 0.72)",
    border = "rgba(56, 189, 248, 0.35)",
    fontSize = 40,
    width = 512,
    height = 112,
    scale = [2.3, 0.5],
  } = options;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.clearRect(0, 0, width, height);
  if (background !== "transparent") {
    roundedRect(ctx, 3, 3, width - 6, height - 6, 22);
    ctx.fillStyle = background;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = border;
    ctx.stroke();
  }

  ctx.font = `600 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, width / 2, height / 2 + 2, width - 40);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(scale[0], scale[1], 1);
  return sprite;
}

export function makeEarthTexture(): THREE.Texture {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  const ocean = ctx.createRadialGradient(660, 380, 60, 512, 512, 680);
  ocean.addColorStop(0, "#0d4b7a");
  ocean.addColorStop(0.45, "#08345c");
  ocean.addColorStop(1, "#04172c");
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, size, size);

  let seed = 20261115;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  ctx.save();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 8, 0, Math.PI * 2);
  ctx.clip();

  const landColors = ["#12553f", "#166534", "#1d6b47", "#0f4f3b", "#2f6b3e"];
  for (let blob = 0; blob < 34; blob += 1) {
    const angle = random() * Math.PI * 2;
    const radius = Math.sqrt(random()) * 400;
    const x = size / 2 + Math.cos(angle) * radius;
    const y = size / 2 + Math.sin(angle) * radius * 0.92;
    const rx = 26 + random() * 105;
    const ry = 18 + random() * 82;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, random() * Math.PI, 0, Math.PI * 2);
    ctx.fillStyle = landColors[Math.floor(random() * landColors.length)];
    ctx.globalAlpha = 0.55 + random() * 0.35;
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (let cloud = 0; cloud < 18; cloud += 1) {
    const angle = random() * Math.PI * 2;
    const radius = Math.sqrt(random()) * 390;
    const x = size / 2 + Math.cos(angle) * radius;
    const y = size / 2 + Math.sin(angle) * radius * 0.9;
    ctx.beginPath();
    ctx.ellipse(x, y, 30 + random() * 90, 8 + random() * 20, random() * Math.PI, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(226, 244, 255, 0.16)";
    ctx.fill();
  }

  ctx.fillStyle = "rgba(235, 248, 255, 0.55)";
  ctx.beginPath();
  ctx.ellipse(size / 2, 86, 230, 46, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(size / 2, size - 76, 260, 52, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = "#7dd3fc";
  ctx.lineWidth = 1.5;
  for (let line = 1; line < 8; line += 1) {
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, (size / 2 - 8) * (line / 8), 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let spoke = 0; spoke < 12; spoke += 1) {
    const angle = (spoke / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(size / 2, size / 2);
    ctx.lineTo(
      size / 2 + Math.cos(angle) * (size / 2 - 8),
      size / 2 + Math.sin(angle) * (size / 2 - 8),
    );
    ctx.stroke();
  }
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

export function makeGlowTexture(inner = "rgba(56,189,248,0.7)", outer = "rgba(56,189,248,0)"): THREE.Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(1, outer);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function makeStarTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.25, "rgba(210,235,255,0.8)");
  gradient.addColorStop(1, "rgba(210,235,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function makeRoundedPanel(
  width: number,
  height: number,
  radius: number,
  color: number | string,
  opacity = 1,
): THREE.Mesh {
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
  const geometry = new THREE.ShapeGeometry(shape);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
  });
  return new THREE.Mesh(geometry, material);
}

export function disposeObject(root: THREE.Object3D): void {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const material = (object as THREE.Mesh).material as
      | THREE.Material
      | THREE.Material[]
      | undefined;
    if (Array.isArray(material)) {
      material.forEach(disposeMaterial);
    } else if (material) {
      disposeMaterial(material);
    }
  });
}

function disposeMaterial(material: THREE.Material): void {
  const record = material as THREE.Material & {
    map?: THREE.Texture | null;
    alphaMap?: THREE.Texture | null;
  };
  record.map?.dispose();
  record.alphaMap?.dispose();
  material.dispose();
}

export interface PanZoomController {
  update: () => void;
  dispose: () => void;
}

export function attachPanZoom(
  dom: HTMLElement,
  camera: THREE.OrthographicCamera,
): PanZoomController {
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let targetX = 0;
  let targetY = 0;

  const onPointerDown = (event: PointerEvent) => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    dom.setPointerCapture(event.pointerId);
    dom.style.cursor = "grabbing";
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!dragging) return;
    const scale = 5.5 / Math.max(1, dom.clientHeight);
    targetX -= (event.clientX - lastX) * scale;
    targetY += (event.clientY - lastY) * scale;
    targetX = THREE.MathUtils.clamp(targetX, -2.2, 2.2);
    targetY = THREE.MathUtils.clamp(targetY, -1.8, 1.8);
    lastX = event.clientX;
    lastY = event.clientY;
  };

  const onPointerUp = (event: PointerEvent) => {
    dragging = false;
    if (dom.hasPointerCapture(event.pointerId)) {
      dom.releasePointerCapture(event.pointerId);
    }
    dom.style.cursor = "grab";
  };

  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    camera.zoom = THREE.MathUtils.clamp(
      camera.zoom * (event.deltaY > 0 ? 0.92 : 1.08),
      0.55,
      2.4,
    );
    camera.updateProjectionMatrix();
  };

  const onDoubleClick = () => {
    targetX = 0;
    targetY = 0;
    camera.zoom = 1;
    camera.position.x = 0;
    camera.position.y = 0;
    camera.updateProjectionMatrix();
  };

  dom.style.cursor = "grab";
  dom.style.touchAction = "none";
  dom.addEventListener("pointerdown", onPointerDown);
  dom.addEventListener("pointermove", onPointerMove);
  dom.addEventListener("pointerup", onPointerUp);
  dom.addEventListener("pointercancel", onPointerUp);
  dom.addEventListener("wheel", onWheel, { passive: false });
  dom.addEventListener("dblclick", onDoubleClick);

  return {
    update: () => {
      camera.position.x += (targetX - camera.position.x) * 0.12;
      camera.position.y += (targetY - camera.position.y) * 0.12;
    },
    dispose: () => {
      dom.removeEventListener("pointerdown", onPointerDown);
      dom.removeEventListener("pointermove", onPointerMove);
      dom.removeEventListener("pointerup", onPointerUp);
      dom.removeEventListener("pointercancel", onPointerUp);
      dom.removeEventListener("wheel", onWheel);
      dom.removeEventListener("dblclick", onDoubleClick);
      dom.style.cursor = "default";
    },
  };
}
