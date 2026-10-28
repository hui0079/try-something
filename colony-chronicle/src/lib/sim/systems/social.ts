import type { TickContext } from "../context";
import { makeEvent, type SimEvent } from "../events";
import { average } from "../math";
import { adjustRelation, decayRelations, relationBetween } from "../relations";
import type { Rng } from "../rng";
import type { Villager, World } from "../types";

const FACTION_CHECK_INTERVAL = 20;
/** High enough that strangers do not marry, low enough that people who grew up together can. */
const CLIQUE_RELATION = 32;
const ADULT_AGE = 16;
/** How badly two people have to fall out before the village picks sides. */
const FEUD_SPLIT = -40;
/** Past this, the two of them will not live in the same place again. */
const SCHISM_REGARD = -70;

export function stepSocial(world: World, ctx: TickContext, rng: Rng): SimEvent[] {
  const events: SimEvent[] = [];

  for (const villager of world.villagers) decayRelations(villager, 0.04);

  events.push(...scarcityFriction(world, ctx, rng));
  events.push(...temperamentFriction(world, ctx, rng));
  events.push(...formPairs(world, ctx, rng));
  if (world.tick > 0 && world.tick % FACTION_CHECK_INTERVAL === 0) {
    events.push(...checkFactions(world, ctx));
  }
  return events;
}

/**
 * A thin granary turns neighbours into rivals. This fires while there is still
 * something to argue over, not once the shelves are bare: by the time a region
 * is at zero the quarrel has no time to grow into a feud, and without feuds a
 * settlement can never split.
 */
const RIVALRY_RATION = 1.5;

function scarcityFriction(world: World, ctx: TickContext, rng: Rng): SimEvent[] {
  const events: SimEvent[] = [];
  for (const [regionId, regionCtx] of ctx.regions) {
    if (regionCtx.population < 2) continue;
    if (regionCtx.region.food / regionCtx.population >= RIVALRY_RATION) continue;
    const here = world.villagers.filter((v) => v.regionId === regionId);
    const quarrels = Math.min(2, Math.floor(here.length / 2));
    for (let i = 0; i < quarrels; i += 1) {
      const pair = pickQuarrel(here, rng);
      if (!pair) continue;
      const [a, b] = pair;
      const temper = a.traits.includes("hotheaded") || b.traits.includes("hotheaded") ? 1.8 : 1;
      const crossing = adjustRelation(a, b, -rng.range(3, 7) * temper);
      // A village that argues over its last grain is a miserable place to live,
      // which is what eventually drives people out of it.
      for (const person of pair) person.mood = Math.max(0, person.mood - 1.5);
      if (crossing === "feud") {
        events.push(
          makeEvent(world.tick, "notable", {
            type: "feud",
            a: a.name,
            b: b.name,
            region: regionCtx.region.name,
            regionId,
          }),
        );
      }
    }
  }
  return events;
}

/**
 * Grudges compound. Drawing a fresh pair every day would spread the damage so
 * thinly that nobody ever ends up hating anybody; sampling a few and taking the
 * pair who already get on worst is what lets a real feud form.
 */
function pickQuarrel(here: readonly Villager[], rng: Rng): [Villager, Villager] | null {
  let pair: [Villager, Villager] | null = null;
  let worst = Infinity;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const [a, b] = rng.shuffled(here);
    if (!a || !b || a.id === b.id) continue;
    const regard = relationBetween(a, b);
    if (regard < worst) {
      worst = regard;
      pair = [a, b];
    }
  }
  return pair;
}

/**
 * Full granaries used to mean a perfectly peaceable village: the only quarrels
 * were over the last of the grain, and a settlement that never went hungry
 * never fell out with itself. People still grate on each other.
 */
const SPAT_CHANCE = 0.045;

function temperamentFriction(world: World, ctx: TickContext, rng: Rng): SimEvent[] {
  const events: SimEvent[] = [];
  for (const [regionId, regionCtx] of ctx.regions) {
    if (regionCtx.population < 3) continue;
    if (regionCtx.region.food / regionCtx.population < RIVALRY_RATION) continue;
    if (!rng.chance(SPAT_CHANCE)) continue;
    const here = world.villagers.filter((v) => v.regionId === regionId && v.age >= ADULT_AGE);
    const pair = pickQuarrel(here, rng);
    if (!pair) continue;
    const [a, b] = pair;
    if (relationBetween(a, b) <= FEUD_THRESHOLD_STICK) continue;
    const temper = a.traits.includes("hotheaded") || b.traits.includes("hotheaded") ? 1.7 : 1;
    const crossing = adjustRelation(a, b, -rng.range(2, 5) * temper);
    if (crossing === "feud") {
      events.push(
        makeEvent(world.tick, "notable", {
          type: "feud",
          a: a.name,
          b: b.name,
          region: regionCtx.region.name,
          regionId,
        }),
      );
    }
  }
  return events;
}

/** Once a grudge is this deep, daily bickering stops; the feud has already been told. */
const FEUD_THRESHOLD_STICK = -55;

function formPairs(world: World, ctx: TickContext, rng: Rng): SimEvent[] {
  const events: SimEvent[] = [];
  for (const [regionId, regionCtx] of ctx.regions) {
    const single = world.villagers.filter(
      (v) => v.regionId === regionId && v.partnerId === null && v.age >= ADULT_AGE,
    );
    if (single.length < 2) continue;
    // At most one match per region per day, so pairings stay newsworthy.
    const candidates: Array<[Villager, Villager]> = [];
    for (let i = 0; i < single.length; i += 1) {
      for (let j = i + 1; j < single.length; j += 1) {
        const a = single[i];
        const b = single[j];
        if (a.sex === b.sex) continue;
        if (a.parents.includes(b.id) || b.parents.includes(a.id)) continue;
        if (a.parents.length > 0 && a.parents.some((p) => b.parents.includes(p))) continue;
        if (relationBetween(a, b) < CLIQUE_RELATION) continue;
        candidates.push([a, b]);
      }
    }
    if (candidates.length === 0) continue;
    const [a, b] = rng.pick(candidates);
    a.partnerId = b.id;
    b.partnerId = a.id;
    events.push(
      makeEvent(world.tick, "notable", {
        type: "pairing",
        a: a.name,
        b: b.name,
        region: regionCtx.region.name,
        regionId,
      }),
    );
  }
  return events;
}

/**
 * A settlement does not split along the lines of who likes whom - in a village
 * small enough that everyone talks to everyone, friendship makes a single
 * connected blob and no split is ever possible. It splits around a quarrel: find
 * the bitterest pair, and everyone else takes the side of whichever of the two
 * they think better of.
 */
type Camps = { major: Villager[]; minor: Villager[]; regard: number };

function campsAround(members: readonly Villager[]): Camps | null {
  let worst: [Villager, Villager] | null = null;
  let worstRegard = FEUD_SPLIT;
  for (let i = 0; i < members.length; i += 1) {
    for (let j = i + 1; j < members.length; j += 1) {
      const regard = relationBetween(members[i], members[j]);
      if (regard < worstRegard) {
        worstRegard = regard;
        worst = [members[i], members[j]];
      }
    }
  }
  if (!worst) return null;

  const [head, rival] = worst;
  const withHead = [head];
  const withRival = [rival];
  for (const member of members) {
    if (member.id === head.id || member.id === rival.id) continue;
    const toHead = relationBetween(member, head);
    const toRival = relationBetween(member, rival);
    // Only someone's actual friend takes their side. Everyone who merely knows
    // both of them stays out of it, which is why a feud between two loners
    // never becomes a faction.
    if (toHead >= CLIQUE_RELATION && toHead > toRival) withHead.push(member);
    else if (toRival >= CLIQUE_RELATION && toRival > toHead) withRival.push(member);
  }
  const [major, minor] =
    withHead.length >= withRival.length ? [withHead, withRival] : [withRival, withHead];
  return { major, minor, regard: worstRegard };
}

/** Whoever the camp thinks most of speaks for it. */
function leaderOf(group: readonly Villager[]): Villager {
  let best = group[0];
  let bestScore = -Infinity;
  for (const member of group) {
    const score = average(
      group.filter((m) => m.id !== member.id).map((m) => relationBetween(member, m)),
    );
    if (score > bestScore) {
      bestScore = score;
      best = member;
    }
  }
  return best;
}

/**
 * Two tight cliques that dislike each other are a faction. If the smaller one
 * is also miserable, it walks out - which is how a settlement splits in two.
 */
function checkFactions(world: World, ctx: TickContext): SimEvent[] {
  const events: SimEvent[] = [];
  // Keyed by who is in it: a faction that merely gains a member is the same
  // faction, and re-announcing it every twenty days would bury the chronicle.
  const known = new Map(world.factions.map((f) => [[...f.memberIds].sort().join(","), f]));
  world.factions = [];

  for (const [regionId, regionCtx] of ctx.regions) {
    const members = world.villagers.filter((v) => v.regionId === regionId && v.age >= ADULT_AGE);
    if (members.length < 4) continue;
    const camps = campsAround(members);
    if (!camps || camps.minor.length < 2) continue;

    const { minor } = camps;
    const memberIds = minor.map((m) => m.id);
    const existing = known.get([...memberIds].sort().join(","));
    const leader = existing
      ? (world.villagers.find((v) => v.id === existing.leaderId) ?? leaderOf(minor))
      : leaderOf(minor);
    world.factions.push({
      id: existing?.id ?? `f${world.nextId++}`,
      regionId,
      leaderId: leader.id,
      memberIds,
      formedTick: existing?.formedTick ?? world.tick,
    });
    if (!existing) {
      events.push(
        makeEvent(world.tick, "major", {
          type: "faction",
          region: regionCtx.region.name,
          regionId,
          leaderName: leader.name,
          size: minor.length,
        }),
      );
    }

    // Being the side that lost the argument wears on you.
    for (const member of minor) member.mood = Math.max(0, member.mood - 3);
    // Either the quarrel is past mending, or the losing side is simply too
    // unhappy to stay. Anything less and they live with it.
    const irreconcilable = camps.regard <= SCHISM_REGARD;
    if (!irreconcilable && average(minor.map((m) => m.mood)) >= 45) continue;

    // They leave for the best place a road reaches.
    let target: string | null = null;
    let bestScore = -Infinity;
    for (const id of regionCtx.region.neighbors) {
      const candidate = ctx.regions.get(id);
      if (!candidate) continue;
      if (candidate.attractiveness > bestScore) {
        bestScore = candidate.attractiveness;
        target = id;
      }
    }
    if (!target) continue;
    const targetName = ctx.regions.get(target)!.region.name;
    for (const member of minor) {
      member.regionId = target;
      member.movedTick = world.tick;
    }
    events.push(
      makeEvent(world.tick, "major", {
        type: "schism",
        from: regionCtx.region.name,
        fromId: regionId,
        to: targetName,
        toId: target,
        names: minor.map((m) => m.name),
      }),
    );
  }
  return events;
}
