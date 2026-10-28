import type { GraphDocument } from "./schema";

export type Vec3 = { x: number; y: number; z: number };

export type KnowledgeStar = {
  id: string;
  title: string;
  content: GraphDocument;
};

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "的",
  "了",
  "和",
  "与",
  "及",
  "一个",
  "以及",
  "可以",
  "使用",
  "需要",
  "进行",
]);

export function rotateY(point: Vec3, angle: number): Vec3 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: point.x * cos - point.z * sin,
    y: point.y,
    z: point.x * sin + point.z * cos,
  };
}

export function rotateX(point: Vec3, angle: number): Vec3 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: point.x,
    y: point.y * cos - point.z * sin,
    z: point.y * sin + point.z * cos,
  };
}

export function orientPoint(point: Vec3, tilt: number, spin: number): Vec3 {
  return rotateY(rotateX(point, tilt), spin);
}

export function unorientPoint(point: Vec3, tilt: number, spin: number): Vec3 {
  return rotateX(rotateY(point, -spin), -tilt);
}

export function vecLength(point: Vec3) {
  return Math.hypot(point.x, point.y, point.z);
}

export function normalizeToRadius(point: Vec3, radius: number): Vec3 {
  const length = vecLength(point);
  if (length < 1e-9) return { x: 0, y: 0, z: radius };
  const scale = radius / length;
  return { x: point.x * scale, y: point.y * scale, z: point.z * scale };
}

export function sphereArc(from: Vec3, to: Vec3, steps = 16): Vec3[] {
  const count = Math.max(2, steps);
  const ra = vecLength(from);
  const rb = vecLength(to);
  const na = normalizeToRadius(from, 1);
  const nb = normalizeToRadius(to, 1);
  const dot = Math.min(1, Math.max(-1, na.x * nb.x + na.y * nb.y + na.z * nb.z));
  const omega = Math.acos(dot);
  const sinOmega = Math.sin(omega);
  if (omega < 1e-6 || Math.abs(sinOmega) < 1e-6) return [from, to];

  return Array.from({ length: count + 1 }, (_, index) => {
    if (index === 0) return from;
    if (index === count) return to;
    const t = index / count;
    const wa = Math.sin((1 - t) * omega) / sinOmega;
    const wb = Math.sin(t * omega) / sinOmega;
    const radius = ra + (rb - ra) * t;
    return {
      x: (na.x * wa + nb.x * wb) * radius,
      y: (na.y * wa + nb.y * wb) * radius,
      z: (na.z * wa + nb.z * wb) * radius,
    };
  });
}

export const STAR_SHELL_RADIUS = 1.78;

export function unprojectToSphere(
  mx: number,
  my: number,
  cx: number,
  cy: number,
  scale: number,
  radius: number,
  cameraZ = 4,
): Vec3 {
  const sx = (mx - cx) / scale;
  const sy = (cy - my) / scale;
  const k = sx * sx + sy * sy;
  const a = k + 1;
  const b = -2 * k * cameraZ;
  const c = k * cameraZ * cameraZ - radius * radius;
  const disc = b * b - 4 * a * c;

  if (disc >= 0) {
    const root = Math.sqrt(disc);
    const z1 = (-b + root) / (2 * a);
    const z2 = (-b - root) / (2 * a);
    const z = Math.max(z1, z2);
    return normalizeToRadius(
      { x: sx * (cameraZ - z), y: sy * (cameraZ - z), z },
      radius,
    );
  }

  const limbZ = (radius * radius) / cameraZ;
  const limbXY = Math.sqrt(Math.max(0, radius * radius - limbZ * limbZ));
  const len = Math.hypot(sx, sy) || 1;
  return { x: (sx / len) * limbXY, y: (sy / len) * limbXY, z: limbZ };
}

export function latLonToVec(lat: number, lon: number, radius: number): Vec3 {
  return {
    x: radius * Math.cos(lat) * Math.sin(lon),
    y: radius * Math.sin(lat),
    z: radius * Math.cos(lat) * Math.cos(lon),
  };
}

export function projectPoint(
  point: Vec3,
  cx: number,
  cy: number,
  scale: number,
  cameraZ = 4,
) {
  const depth = cameraZ - point.z;
  const factor = scale / depth;
  return {
    x: cx + point.x * factor,
    y: cy - point.y * factor,
    scale: factor,
    depth,
    visible: point.z < cameraZ - 0.15,
  };
}

export function globeGrid(radius: number, step = Math.PI / 6): Vec3[][] {
  const rings: Vec3[][] = [];
  for (let lat = -Math.PI / 2 + step; lat < Math.PI / 2; lat += step) {
    const ring: Vec3[] = [];
    for (let lon = 0; lon <= Math.PI * 2 + 0.001; lon += step / 2) {
      ring.push(latLonToVec(lat, lon, radius));
    }
    rings.push(ring);
  }
  for (let lon = 0; lon < Math.PI * 2; lon += step) {
    const meridian: Vec3[] = [];
    for (let lat = -Math.PI / 2; lat <= Math.PI / 2 + 0.001; lat += step / 2) {
      meridian.push(latLonToVec(lat, lon, radius));
    }
    rings.push(meridian);
  }
  return rings;
}

export function fibonacciPoints(count: number, radius: number): Vec3[] {
  if (count <= 0) return [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: count }, (_, index) => {
    const y = 1 - (index / Math.max(count - 1, 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * index;
    return { x: Math.cos(theta) * r * radius, y: y * radius, z: Math.sin(theta) * r * radius };
  });
}

export function knowledgeStarPositions(
  graphs: KnowledgeStar[],
  radius = STAR_SHELL_RADIUS,
): Array<{ id: string; title: string; position: Vec3 }> {
  const points = fibonacciPoints(graphs.length, radius);
  return graphs.map((graph, index) => ({
    id: graph.id,
    title: graph.title,
    position: points[index] ?? { x: 0, y: radius, z: 0 },
  }));
}

export function tokenizeKnowledge(title: string, graph: GraphDocument): Set<string> {
  const raw = [
    title,
    ...graph.nodes.flatMap((node) => [
      node.label,
      node.description,
      ...node.technologies,
      ...node.conditions,
    ]),
  ]
    .join(" ")
    .toLowerCase();
  const tokens = raw.match(/[\p{L}\p{N}]{2,}/gu) ?? [];
  return new Set(tokens.filter((token) => !STOP_WORDS.has(token)));
}

export function relatedKnowledgePairs(
  items: Array<{ id: string; title: string; content: GraphDocument }>,
): Array<[string, string]> {
  const indexed = items.map((item) => ({
    id: item.id,
    technologies: new Set(
      item.content.nodes.flatMap((node) =>
        node.technologies.map((tech) => tech.trim().toLowerCase()).filter(Boolean),
      ),
    ),
    tokens: tokenizeKnowledge(item.title, item.content),
  }));

  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < indexed.length; i += 1) {
    for (let j = i + 1; j < indexed.length; j += 1) {
      const sharedTech = [...indexed[i].technologies].some((tech) =>
        indexed[j].technologies.has(tech),
      );
      const sharedTokens = [...indexed[i].tokens].filter((token) =>
        indexed[j].tokens.has(token),
      ).length;
      if (sharedTech || sharedTokens >= 2) {
        pairs.push([indexed[i].id, indexed[j].id]);
      }
    }
  }
  return pairs;
}

export function nodeOrbitSeeds(graphs: KnowledgeStar[]): Array<{
  graphId: string;
  nodeId: string;
  lat: number;
  lon: number;
  radius: number;
  linkedTo: string[];
}> {
  return graphs.flatMap((graph, graphIndex) => {
    const baseLat = Math.asin(((graphIndex % 8) - 3.5) / 4);
    const baseLon = (graphIndex / Math.max(graphs.length, 1)) * Math.PI * 2;
    return graph.content.nodes.map((node, nodeIndex) => {
      const spread = (nodeIndex / Math.max(graph.content.nodes.length, 1)) * 0.7 - 0.35;
      return {
        graphId: graph.id,
        nodeId: `${graph.id}:${node.id}`,
        lat: baseLat + spread * 0.45,
        lon: baseLon + spread * 0.9 + nodeIndex * 0.17,
        radius: 1.52 + (nodeIndex % 5) * 0.04,
        linkedTo: graph.content.edges
          .filter((edge) => edge.source === node.id)
          .map((edge) => `${graph.id}:${edge.target}`),
      };
    });
  });
}
