import { SEASON_LABEL } from "@/lib/sim/calendar";
import type { EventType, InterventionKind, SimEvent } from "@/lib/sim/events";
import type { DeathCause, OrderKind, Weather } from "@/lib/sim/types";

import { cnAmount, cnNumber, cnPeople, joinNames } from "./numbers";

export const WEATHER_LABEL: Record<Weather, string> = {
  clear: "晴",
  overcast: "阴",
  rain: "雨",
  storm: "暴风雨",
  drought: "旱",
  coldSnap: "寒潮",
};

const DEATH_PHRASE: Record<DeathCause, readonly string[]> = {
  starvation: ["饿死在自己的屋里", "没等到下一顿饭", "在粮仓空了的第几天倒下"],
  thirst: ["渴死了", "倒在取水的路上", "嘴唇干裂着停了呼吸"],
  cold: ["冻死在夜里", "没能熬过那场寒", "第二天早上没有起来"],
  plague: ["病死了", "在热病里烧了几天后走了", "咳着咳着就没了声音"],
  beast: ["死于山里的野兽", "被林子里的东西带走了", "没能从那趟猎里回来"],
  age: ["寿终", "睡着了，就没再醒", "活到了该走的时候"],
  frailty: ["身子垮了", "撑不住了", "一点力气也剩不下"],
  battle: ["死在阵上", "没能从那一仗里回来", "倒在兵戈里"],
};

const RESOURCE_LABEL = {
  water: "水",
  game: "猎物",
  wood: "木材",
  fertility: "地力",
  food: "存粮",
} as const;

const ORDER_LABEL: Record<OrderKind, string> = {
  clan: "氏族",
  craft: "匠坊",
  hunt: "猎团",
  shrine: "祠堂",
};

const MIGRATION_REASON = {
  hunger: ["为了找一口饭", "因为粮仓见了底", "带着饿意", "为了不再数米下锅"],
  thirst: ["为了找水", "因为井口干了", "渴得待不下去", "跟着水的方向"],
  crowding: ["因为村里太挤", "嫌屋檐下挤不开", "想有自己的一块地", "为了给孩子腾个地方"],
  schism: ["跟人闹翻之后", "带着心里的那口气", "话说尽了以后", "不愿再抬头见人"],
  curiosity: ["只是想看看别处", "顺着好奇心", "没什么缘由", "说是那边的土更肯长东西"],
} as const;

export const INTERVENTION_PHRASE: Record<InterventionKind, readonly string[]> = {
  rain: ["天阴了三日，雨落下来。", "云从上游压过来，落了三天雨。"],
  drought: ["云散尽了，一连数日不见一滴雨。", "天硬了起来，八日无雨。"],
  coldSnap: ["寒气自北面压下。", "一股冷下来，霜结在门槛上。"],
  warmSpell: ["日头忽然厚了几分。", "接连几日暖得反常。"],
  releaseDeer: ["一群鹿不知从哪里进了{region}。", "{region}的林子里多了走兽的踪迹。"],
  seedForest: ["{region}的坡上冒出成片的新苗。", "有什么把树种撒进了{region}。"],
  digCanal: ["{regions}之间挖通了一条渠。", "水顺着新渠在{regions}之间来回。"],
  openRoad: ["{regions}之间踏出了一条路。", "从{regions}走过去，不必再绕远。"],
  manna: ["{region}的粮仓里凭空多出一批口粮。", "{region}的人推开仓门，愣住了。"],
  stranger: ["一个外乡人顺着路找了过来。", "门口站着个没人见过的人。"],
  plague: ["{region}起了恶疾。", "一股病气落在{region}。"],
  revelation: ["有人说看见了神迹，全村信了。", "夜里的天光让所有人都跪下了。"],
};

export type Pick = <T>(options: readonly T[]) => T;

type Renderer<K extends EventType> = (
  event: Extract<SimEvent, { type: K }>,
  pick: Pick,
) => string;

type RendererMap = { [K in EventType]: Renderer<K> };

/**
 * One renderer per event type. These read the event only - they never touch
 * world state - so the chronicle can be regenerated from a saved event log.
 */
export const RENDERERS: RendererMap = {
  founding: (e, pick) =>
    pick([
      `${cnPeople(e.names.length)}在${e.region}停下脚步，决定不再往前走了。他们是${joinNames(e.names, 6)}。`,
      `${joinNames(e.names, 6)}一共${cnPeople(e.names.length)}，在${e.region}扎下了第一根桩。`,
    ]),

  season: (e, pick) =>
    pick([
      `${SEASON_LABEL[e.season]}来了。`,
      `节气转到了${SEASON_LABEL[e.season]}。`,
      `第 ${e.year} 年的${SEASON_LABEL[e.season]}开始了。`,
    ]),

  weather: (e, pick) => {
    const phrases: Record<Weather, readonly string[]> = {
      clear: ["天放晴了。"],
      overcast: ["云压得很低。"],
      rain: ["下起了雨。"],
      storm: ["风雨大作，屋顶被掀开了几处。", "一夜暴风雨，草棚塌了半边。"],
      drought: ["雨停了太久，河床开始露出来。", "旱起来了，水一天比一天浅。"],
      coldSnap: ["寒潮到了，呼气都成了白雾。", "一夜之间冷透了，水缸结了冰。"],
    };
    return pick(phrases[e.weather]);
  },

  harvest: (e, pick) =>
    pick([
      `${e.region}收进${cnAmount(e.amount)}，${joinNames(e.names)}在地里忙了一整天。`,
      `${joinNames(e.names)}从${e.region}的地里带回${cnAmount(e.amount)}。`,
      `${e.region}这一天进了${cnAmount(e.amount)}。`,
      `${joinNames(e.names)}把${e.region}的地翻了个遍，得${cnAmount(e.amount)}。`,
      `${e.region}的仓里添了${cnAmount(e.amount)}，是${joinNames(e.names)}挣来的。`,
    ]),

  hunt: (e, pick) =>
    pick([
      `${e.name}在${e.region}猎到了东西，带回${cnAmount(e.amount)}。`,
      `${e.name}从${e.region}的林子里拖回${cnAmount(e.amount)}。`,
      `${e.name}在${e.region}的坡上放倒一头，${cnAmount(e.amount)}进了仓。`,
      `${e.name}那一箭没落空，${cnAmount(e.amount)}扛回${e.region}。`,
    ]),

  huntFail: (e, pick) =>
    pick([
      `${e.name}在${e.region}守了一天，空手而归。`,
      `${e.name}跟丢了猎物。`,
      `${e.name}在林子里转到天黑，什么也没遇上。`,
      `${e.region}的林子今天什么也不肯给${e.name}。`,
    ]),

  // Injuries are among the most frequent things worth recording, so this list is
  // deliberately the longest: two variants read as a stuck record by year ten.
  injury: (e, pick) =>
    pick([
      `${e.name}在${e.region}被野兽伤了，血流了一路。`,
      `${e.name}从林子里爬回来，腿上开了一道口子。`,
      `${e.name}在${e.region}撞上了不该撞上的东西，肩上少了一块肉。`,
      `${e.name}被什么东西扑了一下，回来时半边衣裳都是血。`,
      `${e.name}空手回到${e.region}，手臂上多了几道爪痕。`,
      `${e.name}那一趟走得不顺，肋下裹了三天布。`,
      `${e.region}的${e.name}伤着回来了，一路上没说一句话。`,
    ]),

  starving: (e, pick) =>
    pick([
      `${e.region}的${joinNames(e.names)}开始饿了。`,
      `${e.region}没饭了，${joinNames(e.names)}勒紧了腰带。`,
      `饥饿找上了${e.region}的${joinNames(e.names)}。`,
    ]),

  thirsting: (e, pick) =>
    pick([
      `${e.region}的${joinNames(e.names)}找不到水喝。`,
      `${e.region}水尽了，${joinNames(e.names)}舔着干裂的嘴唇。`,
    ]),

  death: (e, pick) =>
    `${e.name}${pick(DEATH_PHRASE[e.cause])}，年 ${e.age}。`,

  comingOfAge: (e, pick) =>
    pick([
      `${e.name}满了十六岁，从此在${e.region}算一个大人。`,
      `${e.name}在${e.region}行了成年礼，可以下地了。`,
    ]),

  mastery: (e, pick) =>
    pick([
      `${e.name}的手艺到了份上，${e.region}认${e.name}作${e.title}。`,
      `${e.region}的人提起${e.name}，都说是个好${e.title}。`,
    ]),

  birth: (e, pick) =>
    pick([
      `${e.motherName}在${e.region}生下一个孩子，取名${e.name}。`,
      `${e.region}添了一口人：${e.name}，${e.motherName}的孩子。`,
      `${e.name}在${e.region}出生了。`,
    ]),

  pairing: (e, pick) =>
    pick([
      `${e.a}和${e.b}成了一家。`,
      `${e.a}与${e.b}在${e.region}结了亲。`,
      `${e.region}的人给${e.a}和${e.b}道了喜。`,
    ]),

  departure: (e, pick) =>
    pick([
      `${e.name}收拾了东西，离开${e.region}，没说去哪。`,
      `${e.name}走了。有人说看见他往山那边去了。`,
      `${e.name}受不住了，离开了聚落。`,
    ]),

  arrival: (e, pick) =>
    pick([
      `${e.name}在${e.region}落了脚，说是从远处来的。`,
      `${e.region}收下了${e.name}这个外乡人。`,
    ]),

  migration: (e, pick) => {
    const reason = pick(MIGRATION_REASON[e.reason]);
    return pick([
      `${joinNames(e.names)}${reason}，从${e.from}迁到了${e.to}。`,
      `${joinNames(e.names)}离开${e.from}，去了${e.to}，${reason}。`,
    ]);
  },

  build: (e, pick) =>
    pick([
      `${joinNames(e.names)}在${e.region}修屋子，遮风的地方多了些。`,
      `${e.region}的棚子又加固了一层。`,
    ]),

  bond: (e, pick) =>
    pick([
      `${e.a}和${e.b}成了要好的人。`,
      `${e.a}与${e.b}之间有了别人插不进去的默契。`,
    ]),

  feud: (e, pick) =>
    pick([
      `${e.a}和${e.b}彻底翻了脸。`,
      `${e.a}与${e.b}再不同桌吃饭。`,
      `${e.region}的人都看出${e.a}和${e.b}结下了怨。`,
    ]),

  faction: (e, pick) =>
    pick([
      `${e.region}分出了一伙人，${cnPeople(e.size)}，跟着${e.leaderName}。`,
      `${e.leaderName}身边聚起${cnPeople(e.size)}，和村里其余人说不上话了。`,
    ]),

  schism: (e, pick) =>
    pick([
      `${joinNames(e.names)}带着各自的东西离开${e.from}，去${e.to}另过。`,
      `${e.from}裂成了两半，${joinNames(e.names)}搬去了${e.to}。`,
    ]),

  recede: (e, pick) =>
    pick([
      `名录只留得下五十人。${e.name}退进${e.region}的部众，把名字留给了${e.childName}。`,
      `${e.name}不再单独被记下，${e.childName}顶了这个位子。`,
    ]),

  order: (e, pick) =>
    pick([
      `${e.leaderName}在${e.region}聚起${ORDER_LABEL[e.kind]}，称${e.name}。`,
      `${e.region}的人开始跟着${e.leaderName}，组织叫做${e.name}。`,
    ]),

  realm: (e, pick) =>
    pick([
      `${e.rulerName}在${e.region}立${e.name}，年号${e.era}。`,
      `${e.region}不再只是一处村子。${e.rulerName}称${e.name}，年号${e.era}。`,
    ]),

  secession: (e, pick) =>
    pick([
      `${e.rulerName}不服${e.from}，带着${joinNames(e.names)}到${e.region}另立${e.name}。`,
      `${e.from}裂出一朝。${e.rulerName}在${e.region}打起${e.name}的旗。`,
    ]),

  succession: (e, pick) =>
    pick([
      `${e.predecessor}不在了，${e.successor}继了${e.realm}。`,
      `${e.realm}换了主人，${e.successor}坐上${e.predecessor}的位子。`,
    ]),

  arms: (e, pick) =>
    pick([
      `${e.realm}的匠人打出了成捆的兵器。`,
      `${e.region}的炉火连着夜，${e.realm}开始有了兵刃。`,
    ]),

  battle: (e, pick) => {
    const dead = e.fallen.length > 0 ? `${joinNames(e.fallen)}死在阵上。` : "部众折了不少，有名有姓的人还在。";
    return pick([
      `${e.attacker}与${e.defender}在${e.region}交兵，${e.winner}占了上风。${dead}`,
      `${e.region}打了一仗。${e.winner}压过对面。${dead}`,
    ]);
  },

  attrition: (e, pick) =>
    pick([
      `${e.region}的部众挨了饿，少了一批没留下名字的人。`,
      `粮不够分到每一个人，${e.region}的部众薄了些。`,
    ]),

  realmEnd: (e, pick) =>
    pick([
      `${e.name}没了能撑场面的人，旗子倒在${e.region}。`,
      `${e.region}不再奉${e.name}。这一朝到此为止。`,
    ]),

  prayer: (e, pick) =>
    pick([
      `${joinNames(e.names)}在${e.region}祷告。`,
      `${e.region}有人跪了一会儿。`,
    ]),

  depleted: (e, pick) =>
    e.resource === "food"
      ? pick([
          `${e.region}的粮仓空了。`,
          `${e.region}再也刮不出一粒粮。`,
        ])
      : pick([
          `${e.region}的${RESOURCE_LABEL[e.resource]}快没了。`,
          `${e.region}的${RESOURCE_LABEL[e.resource]}见了底。`,
        ]),

  recovered: (e, pick) =>
    pick([
      `${e.region}的${RESOURCE_LABEL[e.resource]}又缓过来了。`,
      `${e.region}的${RESOURCE_LABEL[e.resource]}重新有了。`,
    ]),

  intervention: (e, pick) => {
    const phrase = pick(INTERVENTION_PHRASE[e.kind]);
    return phrase
      .replace("{region}", e.regions[0] ?? "那里")
      .replace("{regions}", e.regions.join("与") || "两地");
  },

  plague: (e, pick) =>
    pick([
      `${e.region}病倒了一片，${joinNames(e.names)}都躺下了。`,
      `热病在${e.region}传开。`,
    ]),

  yearSummary: (e) => {
    const parts: string[] = [`第 ${e.year} 年终。在册 ${e.population} 人`];
    if (e.births > 0) parts.push(`生${cnNumber(e.births)}`);
    if (e.deaths > 0) parts.push(`死${cnNumber(e.deaths)}`);
    if (e.departures > 0) parts.push(`走${cnNumber(e.departures)}`);
    if (e.arrivals > 0) parts.push(`来${cnNumber(e.arrivals)}`);
    parts.push(`存粮 ${e.food}`);
    return `${parts.join("，")}。`;
  },

  collapse: (e, pick) =>
    pick([
      `${e.region}再没有活人了。风穿过空屋子。`,
      `聚落断了。${e.region}只剩下几处坟。`,
    ]),
};
