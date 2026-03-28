export const zhCNBattleTerms = {
  roles: {
    damage: '输出',
    breaker: '破盾',
    support: '支援',
    healer: '治疗',
    debuffer: '易伤',
    utility: '功能',
  },
  elements: {
    fire: '火',
    ice: '冰',
    thunder: '雷',
    light: '光',
    dark: '暗',
  },
  weapons: {
    slash: '斩',
    pierce: '突',
    blunt: '打',
  },
  squads: {
    first: '第一队',
    second: '第二队',
  },
} as const;

export type BattleTerms = typeof zhCNBattleTerms;
