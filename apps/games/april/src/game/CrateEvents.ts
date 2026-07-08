/**
 * 木箱随机事件 — buff / debuff / 稀有种子 / NPC 剧情
 */

import { rollCardOptions } from '../config';
import type { BuffId, CardOption, CropType, DebuffId, GameNotice, RunState } from '../types';

export type CrateOutcome =
  | { type: 'card_picker'; options: CardOption[] }
  | { type: 'notice_only'; notice: GameNotice; apply?: () => void };

const DEBUFFS: { id: DebuffId; name: string; desc: string }[] = [
  { id: 'sluggish', name: '懒惰诅咒', desc: '移动速度 -15%，今天不宜赶路…' },
  { id: 'weak_hands', name: '手软', desc: '拾取范围 -30%，箱里的蜘蛛吓了你一跳' },
  { id: 'blight', name: '薄霜侵袭', desc: '作物生长 +25% 时间，夜里降了层薄霜' },
];

/** 剧情木箱专用 NPC / 遭遇（每关必出其一） */
const STORY_EVENTS: {
  name: string;
  title: string;
  body: string;
  buff?: BuffId;
  debuff?: DebuffId;
  unlockCrop?: CropType;
  scoreBonus?: number;
}[] = [
  {
    name: '土地公',
    title: '土地公显灵',
    body: '「年轻人，这地有灵。老朽送你一粒仙种，四月里种下，自有收成。」',
    buff: 'lucky_weed',
    unlockCrop: 'sunflower',
  },
  {
    name: '野狗',
    title: '野狗闯入',
    body: '「汪！汪！」野狗从箱里窜出，叼走了你兜里的种子，又把磁铁留在了箱底…',
    debuff: 'sluggish',
    buff: 'pickup_magnet',
  },
  {
    name: '乞丐',
    title: '路过的乞丐',
    body: '「行行好…这箱是我昨儿藏吃的。分你一把种，帮我把这亩荒田种活吧。」',
    buff: 'growth_speed',
    scoreBonus: 15,
  },
  {
    name: '神秘路人',
    title: '神秘路人',
    body: '「这农场我幼时来过。箱底有张字条：慢工出细活。」说完便消失在田埂尽头。',
    buff: 'lucky_weed',
  },
  {
    name: '卖种老妪',
    title: '卖种老妪',
    body: '「四月物语？呵呵，我年轻时也在这儿种过向日葵。送你几粒，别种丢了。」',
    unlockCrop: 'sunflower',
    scoreBonus: 10,
  },
  {
    name: '顽童',
    title: '村童探头',
    body: '「我发现宝藏啦！…咦是空的。那我把番茄种子还你，别告诉娘亲我偷跑出来的。」',
    scoreBonus: 20,
  },
  {
    name: '夜行猫',
    title: '夜行猫',
    body: '「喵~」黑猫端坐在箱盖上，用尾巴扫开落叶，露出下面闪闪发光的稀有种子。',
    unlockCrop: 'sunflower',
    buff: 'pickup_magnet',
  },
  {
    name: '背篓樵夫',
    title: '背篓樵夫',
    body: '「前面林子里砍柴，听见箱响过来瞧瞧。小兄弟，荒年能活靠勤恳，我帮你一把。」',
    buff: 'growth_speed',
    scoreBonus: 12,
  },
];

const JUNK_MESSAGES = [
  { title: '空箱子', body: '只有几把干草，什么都没有。' },
  { title: '破旧日记', body: '「四月了，希望今年能把农场撑起来。」' },
  { title: '生锈铁钉', body: '扎了手，今天运气一般。' },
];

function buildStoryOutcome(run: RunState, event: (typeof STORY_EVENTS)[0]): CrateOutcome {
  return {
    type: 'notice_only',
    notice: {
      title: event.title,
      body: `${event.name}：${event.body}`,
      kind: 'npc',
      timer: 7,
    },
    apply: () => {
      if (event.buff) run.activeBuffs.add(event.buff);
      if (event.debuff) run.activeDebuffs.add(event.debuff);
      if (event.unlockCrop) run.unlockedCrops.add(event.unlockCrop);
      if (event.scoreBonus) run.harvestScore += event.scoreBonus;
    },
  };
}

/** 剧情木箱 — 每关必触发一次 */
export function rollStoryCrateOutcome(run: RunState, levelIndex: number): CrateOutcome {
  const idx = (levelIndex + Math.floor(Math.random() * STORY_EVENTS.length)) % STORY_EVENTS.length;
  return buildStoryOutcome(run, STORY_EVENTS[idx]!);
}

/** 普通木箱随机结果 */
export function rollCrateOutcome(run: RunState): CrateOutcome {
  const roll = Math.random();

  if (roll < 0.38) {
    return {
      type: 'card_picker',
      options: rollCardOptions(run.unlockedCrops.has('sunflower')),
    };
  }

  if (roll < 0.55) {
    const d = DEBUFFS[Math.floor(Math.random() * DEBUFFS.length)]!;
    return {
      type: 'notice_only',
      notice: { title: `⚠ ${d.name}`, body: d.desc, kind: 'debuff', timer: 5 },
      apply: () => run.activeDebuffs.add(d.id),
    };
  }

  if (roll < 0.72) {
    return {
      type: 'notice_only',
      notice: {
        title: '✦ 超级稀有种子',
        body: '箱底闪着金光的向日葵种子！传说只在四月夜出现。',
        kind: 'rare',
        timer: 5,
      },
      apply: () => run.unlockedCrops.add('sunflower'),
    };
  }

  if (roll < 0.88) {
    const npc = STORY_EVENTS[Math.floor(Math.random() * STORY_EVENTS.length)]!;
    return buildStoryOutcome(run, npc);
  }

  const junk = JUNK_MESSAGES[Math.floor(Math.random() * JUNK_MESSAGES.length)]!;
  return {
    type: 'notice_only',
    notice: { title: junk.title, body: junk.body, kind: 'junk', timer: 3.5 },
  };
}

export function applyCardChoice(run: RunState, opt: CardOption): GameNotice {
  if (opt.kind === 'buff') {
    run.activeBuffs.add(opt.id);
    return { title: `↑ ${opt.name}`, body: opt.desc, kind: 'buff', timer: 4 };
  }
  run.unlockedCrops.add(opt.crop);
  const label = opt.crop === 'sunflower' ? '向日葵' : opt.name;
  return {
    title: `✦ 解锁 ${label}`,
    body: opt.desc,
    kind: 'rare',
    timer: 4,
  };
}
