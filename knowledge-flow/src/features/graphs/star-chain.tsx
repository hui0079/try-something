"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  fibonacciPoints,
  globeGrid,
  knowledgeStarPositions,
  latLonToVec,
  nodeOrbitSeeds,
  orientPoint,
  projectPoint,
  relatedKnowledgePairs,
  sphereArc,
  STAR_SHELL_RADIUS,
  unorientPoint,
  unprojectToSphere,
  type KnowledgeStar,
  type Vec3,
} from "@/lib/graph/star-chain";

const TILT = -0.38;
const CAMERA_Z = 4;
const GLOBE_R = 1;
const CITY_LIGHTS: Array<[number, number]> = [
  [40.7, -74],
  [34.05, -118.2],
  [41.8, -87.6],
  [49.2, -123.1],
  [29.7, -95.3],
  [43.7, -79.4],
  [25.7, -80.2],
  [37.7, -122.4],
  [33.4, -112],
  [45.5, -73.5],
  [51.5, -0.1],
  [48.8, 2.3],
  [52.5, 13.4],
  [41.9, 12.5],
  [40.4, -3.7],
  [52.3, 4.9],
  [59.3, 18],
  [55.7, 12.5],
  [50, 14.4],
  [47.3, 8.5],
  [31.2, 121.5],
  [39.9, 116.4],
  [35.6, 139.7],
  [37.5, 127],
  [22.3, 114.1],
  [1.3, 103.8],
  [13.7, 100.5],
  [14.6, 121],
  [35.1, 129],
  [25, 121.5],
  [19, 72.8],
  [28.6, 77.2],
  [13, 77.6],
  [23.8, 90.4],
  [-23.5, -46.6],
  [-34.6, -58.3],
  [-33.4, -70.6],
  [4.7, -74],
  [-12, -77],
  [30, 31.2],
  [-26.2, 28],
  [6.5, 3.4],
  [-1.3, 36.8],
  [33.5, -7.6],
  [-33.8, 151.2],
  [-37.8, 144.9],
  [-31.9, 115.8],
  [-27.4, 153],
];

function deg(lat: number, lon: number, radius = 1.012): Vec3 {
  return latLonToVec((lat * Math.PI) / 180, (lon * Math.PI) / 180, radius);
}

function occluded(
  point: Vec3,
  projected: { x: number; y: number },
  cx: number,
  cy: number,
  globeScreenR: number,
) {
  if (point.z >= 0.02) return false;
  const dx = projected.x - cx;
  const dy = projected.y - cy;
  return dx * dx + dy * dy < globeScreenR * globeScreenR;
}

function globeView(size: { width: number; height: number }) {
  return {
    cx: size.width / 2,
    cy: size.height / 2 + 8,
    scale: Math.min(size.width, size.height) * 0.72,
  };
}

function drawSphereArc(
  ctx: CanvasRenderingContext2D,
  from: Vec3,
  to: Vec3,
  cx: number,
  cy: number,
  scale: number,
  globeScreenR: number,
  color: (alpha: number) => string,
  width: number,
  steps = 18,
) {
  const points = sphereArc(from, to, steps);
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index];
    const b = points[index + 1];
    const pa = projectPoint(a, cx, cy, scale, CAMERA_Z);
    const pb = projectPoint(b, cx, cy, scale, CAMERA_Z);
    const hideA = occluded(a, pa, cx, cy, globeScreenR);
    const hideB = occluded(b, pb, cx, cy, globeScreenR);
    if (hideA && hideB) continue;
    const alpha = a.z + b.z > 0.1 ? 1 : hideA || hideB ? 0.16 : 0.28;
    ctx.strokeStyle = color(alpha);
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
  }
}

export function StarChain({ graphs }: { graphs: KnowledgeStar[] }) {
  const router = useRouter();
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const titleRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const rotationRef = useRef(0.6);
  const pausedRef = useRef(false);
  const sizeRef = useRef({ width: 900, height: 620 });
  const positionsRef = useRef<Record<string, Vec3>>({});
  const stars = useMemo(() => knowledgeStarPositions(graphs), [graphs]);
  const links = useMemo(() => relatedKnowledgePairs(graphs), [graphs]);
  const mesh = useMemo(() => nodeOrbitSeeds(graphs), [graphs]);
  const dust = useMemo(
    () => [...fibonacciPoints(720, 1.58), ...fibonacciPoints(380, 1.72)],
    [],
  );
  const grid = useMemo(() => globeGrid(GLOBE_R, Math.PI / 7), []);
  const cities = useMemo(
    () =>
      CITY_LIGHTS.flatMap(([lat, lon], index) => {
        const around = index % 3 === 0 ? 4 : 2;
        return Array.from({ length: around }, (_, offset) =>
          deg(lat + (offset - 1) * 1.8, lon + (offset - 1) * 2.4, 1.012),
        );
      }),
    [],
  );

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;

    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (!box) return;
      sizeRef.current = { width: box.width, height: box.height };
    });
    observer.observe(stage);

    let frame = 0;
    const tick = () => {
      if (!pausedRef.current) rotationRef.current += 0.0032;
      drawGlobe({
        canvas,
        size: sizeRef.current,
        spin: rotationRef.current,
        stars,
        links,
        mesh,
        dust,
        grid,
        cities,
        positions: positionsRef.current,
        titleRefs: titleRefs.current,
      });
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [cities, dust, grid, links, mesh, stars]);

  function startDrag(event: React.PointerEvent<HTMLButtonElement>, starId: string) {
    event.preventDefault();
    pausedRef.current = true;
    const originX = event.clientX;
    const originY = event.clientY;
    const stage = stageRef.current;
    let moved = 0;
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);

    function placeAtPointer(clientX: number, clientY: number) {
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      const view = globeView(sizeRef.current);
      const viewPoint = unprojectToSphere(
        clientX - rect.left,
        clientY - rect.top,
        view.cx,
        view.cy,
        view.scale,
        STAR_SHELL_RADIUS,
        CAMERA_Z,
      );
      positionsRef.current[starId] = unorientPoint(viewPoint, TILT, rotationRef.current);
    }

    function move(moveEvent: PointerEvent) {
      moved = Math.hypot(moveEvent.clientX - originX, moveEvent.clientY - originY);
      placeAtPointer(moveEvent.clientX, moveEvent.clientY);
    }

    function stop() {
      target.releasePointerCapture(event.pointerId);
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", stop);
      pausedRef.current = false;
      if (moved < 6) router.push(`/graphs/${starId}`);
    }

    placeAtPointer(event.clientX, event.clientY);
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", stop);
  }

  if (graphs.length === 0) return null;

  return (
    <section className="mt-8 overflow-hidden rounded-3xl border border-cyan-400/20 bg-black">
      <div className="flex items-end justify-between px-5 pt-5">
        <div>
          <p className="text-[10px] font-bold tracking-[0.22em] text-cyan-300">STARLINK</p>
          <h2 className="mt-1 text-lg font-bold text-white">知识星链</h2>
        </div>
        <p className="text-xs text-slate-500">有关联才连线 · 拖动标题沿球面移动 · 星链自动旋转</p>
      </div>
      <div ref={stageRef} className="relative h-[620px] w-full">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
        {stars.map((star) => (
          <button
            key={star.id}
            type="button"
            ref={(node) => {
              if (node) titleRefs.current.set(star.id, node);
              else titleRefs.current.delete(star.id);
            }}
            onPointerDown={(event) => startDrag(event, star.id)}
            className="absolute z-10 max-w-[160px] -translate-x-1/2 -translate-y-[140%] cursor-grab rounded-full border border-amber-200/40 bg-black/70 px-3 py-1 text-left text-[11px] font-semibold text-amber-50 shadow-[0_0_16px_rgba(250,204,21,0.25)] backdrop-blur-sm active:cursor-grabbing"
            style={{ left: "50%", top: "50%" }}
          >
            <span className="line-clamp-2">{star.title}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function drawGlobe({
  canvas,
  size,
  spin,
  stars,
  links,
  mesh,
  dust,
  grid,
  cities,
  positions,
  titleRefs,
}: {
  canvas: HTMLCanvasElement;
  size: { width: number; height: number };
  spin: number;
  stars: Array<{ id: string; title: string; position: Vec3 }>;
  links: Array<[string, string]>;
  mesh: ReturnType<typeof nodeOrbitSeeds>;
  dust: Vec3[];
  grid: Vec3[][];
  cities: Vec3[];
  positions: Record<string, Vec3>;
  titleRefs: Map<string, HTMLButtonElement>;
}) {
  const ctx = canvas.getContext("2d");
  if (!ctx || size.width < 2 || size.height < 2) return;

  const dpr = window.devicePixelRatio || 1;
  const nextWidth = Math.floor(size.width * dpr);
  const nextHeight = Math.floor(size.height * dpr);
  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth;
    canvas.height = nextHeight;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size.width, size.height);

  const { cx, cy, scale } = globeView(size);
  const globeScreenR = Math.abs(
    projectPoint({ x: GLOBE_R, y: 0, z: 0 }, cx, cy, scale, CAMERA_Z).x - cx,
  );

  const atmosphere = ctx.createRadialGradient(cx, cy, globeScreenR * 0.2, cx, cy, globeScreenR * 1.55);
  atmosphere.addColorStop(0, "rgba(8, 47, 73, 0.0)");
  atmosphere.addColorStop(0.55, "rgba(14, 116, 144, 0.08)");
  atmosphere.addColorStop(1, "rgba(6, 182, 212, 0.16)");
  ctx.fillStyle = atmosphere;
  ctx.beginPath();
  ctx.arc(cx, cy, globeScreenR * 1.55, 0, Math.PI * 2);
  ctx.fill();

  const globe = ctx.createRadialGradient(
    cx - globeScreenR * 0.28,
    cy - globeScreenR * 0.32,
    globeScreenR * 0.08,
    cx,
    cy,
    globeScreenR,
  );
  globe.addColorStop(0, "#16324a");
  globe.addColorStop(0.45, "#0b1c2e");
  globe.addColorStop(1, "#020617");
  ctx.fillStyle = globe;
  ctx.beginPath();
  ctx.arc(cx, cy, globeScreenR, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(34, 211, 238, 0.22)";
  ctx.lineWidth = 1;
  for (const ring of grid) {
    for (let index = 0; index < ring.length - 1; index += 1) {
      const a = orientPoint(ring[index], TILT, spin);
      const b = orientPoint(ring[index + 1], TILT, spin);
      const pa = projectPoint(a, cx, cy, scale, CAMERA_Z);
      const pb = projectPoint(b, cx, cy, scale, CAMERA_Z);
      const alpha = a.z + b.z > 0 ? 0.28 : 0.07;
      ctx.strokeStyle = `rgba(103, 232, 249, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    }
  }

  for (const city of cities) {
    const point = orientPoint(city, TILT, spin);
    if (point.z < 0) continue;
    const projected = projectPoint(point, cx, cy, scale, CAMERA_Z);
    ctx.fillStyle = "rgba(251, 191, 36, 0.85)";
    ctx.beginPath();
    ctx.arc(projected.x, projected.y, 1.35, 0, Math.PI * 2);
    ctx.fill();
  }

  const meshById = new Map(
    mesh.map((seed) => {
      const point = orientPoint(latLonToVec(seed.lat, seed.lon, seed.radius), TILT, spin);
      return [seed.nodeId, { seed, point, projected: projectPoint(point, cx, cy, scale, CAMERA_Z) }];
    }),
  );

  ctx.lineWidth = 0.7;
  for (const item of meshById.values()) {
    for (const targetId of item.seed.linkedTo) {
      const target = meshById.get(targetId);
      if (!target) continue;
      if (
        occluded(item.point, item.projected, cx, cy, globeScreenR) &&
        occluded(target.point, target.projected, cx, cy, globeScreenR)
      ) {
        continue;
      }
      drawSphereArc(
        ctx,
        item.point,
        target.point,
        cx,
        cy,
        scale,
        globeScreenR,
        (alpha) => `rgba(186, 230, 253, ${0.22 * alpha})`,
        0.8,
        10,
      );
    }
  }

  for (const item of meshById.values()) {
    if (occluded(item.point, item.projected, cx, cy, globeScreenR)) continue;
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    ctx.beginPath();
    ctx.arc(item.projected.x, item.projected.y, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const speck of dust) {
    const point = orientPoint(speck, TILT, spin);
    const projected = projectPoint(point, cx, cy, scale, CAMERA_Z);
    if (occluded(point, projected, cx, cy, globeScreenR)) continue;
    const alpha = point.z > 0 ? 0.7 : 0.28;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(projected.x, projected.y, point.z > 0 ? 1.15 : 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  const starView = new Map(
    stars.map((star) => {
      const local = positions[star.id] ?? star.position;
      const point = orientPoint(local, TILT, spin);
      const projected = projectPoint(point, cx, cy, scale, CAMERA_Z);
      const hidden = occluded(point, projected, cx, cy, globeScreenR);
      return [star.id, { point, x: projected.x, y: projected.y, hidden, depth: projected.depth }];
    }),
  );

  ctx.lineWidth = 1.35;
  for (const [from, to] of links) {
    const a = starView.get(from);
    const b = starView.get(to);
    if (!a || !b) continue;
    const strength = a.hidden && b.hidden ? 0.12 : 0.85;
    drawSphereArc(
      ctx,
      a.point,
      b.point,
      cx,
      cy,
      scale,
      globeScreenR,
      (alpha) => `rgba(224, 242, 254, ${strength * alpha})`,
      1.6,
      22,
    );
  }

  for (const [id, star] of starView) {
    const button = titleRefs.get(id);
    if (button) {
      button.style.left = `${star.x}px`;
      button.style.top = `${star.y}px`;
      button.style.opacity = star.hidden ? "0.2" : "1";
      button.style.zIndex = String(Math.round(1200 - star.depth * 80));
      button.style.pointerEvents = star.hidden ? "none" : "auto";
    }
    if (star.hidden) continue;
    ctx.fillStyle = "#facc15";
    ctx.shadowColor = "rgba(250, 204, 21, 0.8)";
    ctx.shadowBlur = 12;
    ctx.fillRect(star.x - 3.5, star.y - 3.5, 7, 7);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(254, 240, 138, 0.9)";
    ctx.strokeRect(star.x - 3.5, star.y - 3.5, 7, 7);
  }
}
