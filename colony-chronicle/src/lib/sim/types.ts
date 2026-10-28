export type Season = "spring" | "summer" | "autumn" | "winter";

export type Weather =
  | "clear"
  | "overcast"
  | "rain"
  | "storm"
  | "drought"
  | "coldSnap";

export type SkillKey = "farming" | "hunting" | "crafting" | "healing";

export type Trait =
  | "greedy"
  | "devout"
  | "lazy"
  | "curious"
  | "stoic"
  | "hotheaded"
  | "nurturing";

export type ActionKind =
  | "eat"
  | "fetchWater"
  | "farm"
  | "hunt"
  | "forage"
  | "build"
  | "mine"
  | "gatherSalt"
  | "socialize"
  | "pray"
  | "rest"
  | "migrate"
  | "leave";

export type DeathCause =
  | "starvation"
  | "thirst"
  | "cold"
  | "plague"
  | "beast"
  | "age"
  | "frailty"
  | "battle";

export type Region = {
  id: string;
  name: string;
  terrain: string;
  /** Granary, in person-days of rations. */
  food: number;
  water: number;
  waterCap: number;
  /**
   * Units of water flowing in per day. A river or spring is a flow, not a
   * finite tank: without this, six people drinking will empty any region and
   * the whole settlement dies of thirst beside a river.
   */
  waterRecharge: number;
  wood: number;
  woodCap: number;
  /** Quarried stone lying ready for building. */
  stone: number;
  /** How fast mining pays off here, 0..1. */
  stoneRichness: number;
  /** Salt deposit left in the ground; gathering draws it into the world store. */
  salt: number;
  /** Live quarry stock; regrows logistically. */
  game: number;
  gameCap: number;
  /** Topsoil, consumed by farming and recovered when fallow. */
  fertility: number;
  /** Housing quality; blunts winter health loss. */
  shelter: number;
  hasSalt: boolean;
  shrine: boolean;
  /** Roads: people can migrate along these. */
  neighbors: string[];
  /** Canals: water levels equalise along these. */
  channels: string[];
};

export type Villager = {
  id: string;
  name: string;
  age: number;
  sex: "m" | "f";
  regionId: string;
  satiety: number;
  hydration: number;
  health: number;
  mood: number;
  skills: Record<SkillKey, number>;
  traits: Trait[];
  relations: Record<string, number>;
  parents: string[];
  partnerId: string | null;
  /** Days elapsed, or null when not expecting. */
  pregnancy: number | null;
  lastAction: ActionKind | null;
  bornTick: number;
  /**
   * The day they last picked up and moved. People do not change home every
   * week: without this, two regions of similar worth trade the same villager
   * back and forth forever and the chronicle is nothing but travel notes.
   */
  movedTick: number;
  /** Whatever last took health off them, so a death can name its cause. */
  harmCause: DeathCause | null;
};

/** A villager who left the story, by death or by walking out. */
export type Grave = {
  id: string;
  name: string;
  age: number;
  kind: "death" | "departure";
  cause: DeathCause | null;
  regionId: string;
  regionName: string;
  tick: number;
  bornTick: number;
  epitaph: string;
  /** Kept so a dead child still shows on a parent's page. */
  parents: string[];
};

export type EffectKind =
  | "rain"
  | "drought"
  | "cold"
  | "warm"
  | "plague"
  | "blessing";

export type ActiveEffect = {
  id: string;
  kind: EffectKind;
  daysLeft: number;
  magnitude: number;
  /** Empty means world-wide. */
  regionIds: string[];
};

export type Faction = {
  id: string;
  regionId: string;
  leaderId: string;
  memberIds: string[];
  formedTick: number;
};

/**
 * Someone who used to be named and stepped back into the unnamed crowd, so a
 * child of a tracked family could keep a place in the cast. They no longer
 * eat, work, or take a turn, but the family page can still name them.
 */
export type Kin = {
  id: string;
  name: string;
  sex: "m" | "f";
  parents: string[];
  bornTick: number;
  regionId: string;
};

export type OrderKind = "clan" | "craft" | "hunt" | "shrine";

/** A clan, workshop, hunting band, or shrine fellowship. Not yet a state. */
export type Order = {
  id: string;
  name: string;
  kind: OrderKind;
  regionId: string;
  leaderId: string;
  formedTick: number;
};

/** A house that rules land, keeps weapons, and can go to war. */
export type Realm = {
  id: string;
  name: string;
  era: string;
  house: string;
  rulerId: string;
  heirId: string | null;
  regionIds: string[];
  arms: number;
  formedTick: number;
  lastWarTick: number;
};

export type StatPoint = {
  tick: number;
  population: number;
  food: number;
  satiety: number;
  health: number;
  mood: number;
  faith: number;
};

export type World = {
  version: number;
  seed: string;
  rngState: number;
  /** Days since founding. */
  tick: number;
  regions: Region[];
  villagers: Villager[];
  graves: Grave[];
  weather: Weather;
  /**
   * Days the current weather has left to run. Without spells, a drought rolled
   * for a single day is meaningless and the climate can never threaten anyone.
   */
  weatherDays: number;
  faith: number;
  influence: number;
  /** Preserving salt, shared by the whole settlement; slows food spoilage. */
  saltStore: number;
  effects: ActiveEffect[];
  /**
   * `regionId:resource` for every scarcity the chronicle has already announced.
   * Recovery is only reported for an alarm that is actually ringing.
   */
  alarms: string[];
  factions: Faction[];
  /** Unnamed people living in each region. They eat and can be levied, but have no biography. */
  folk: Record<string, number>;
  /** Named people who gave up their place in the cast of fifty. */
  kin: Kin[];
  orders: Order[];
  realms: Realm[];
  history: StatPoint[];
  nextId: number;
  /** Rolling counters the year summary reads and resets. */
  yearTally: { births: number; deaths: number; departures: number; arrivals: number };
};
