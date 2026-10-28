import type { ActiveEffect, EffectKind, World } from "./types";

/** Total strength of an effect in a region; empty `regionIds` means world-wide. */
export function effectMagnitude(world: World, kind: EffectKind, regionId?: string): number {
  let total = 0;
  for (const effect of world.effects) {
    if (effect.kind !== kind) continue;
    if (effect.regionIds.length > 0 && (!regionId || !effect.regionIds.includes(regionId))) continue;
    total += effect.magnitude;
  }
  return total;
}

export function addEffect(world: World, effect: Omit<ActiveEffect, "id">): void {
  world.effects.push({ ...effect, id: `e${world.nextId++}` });
}

export function ageEffects(world: World): void {
  for (const effect of world.effects) effect.daysLeft -= 1;
  world.effects = world.effects.filter((effect) => effect.daysLeft > 0);
}
