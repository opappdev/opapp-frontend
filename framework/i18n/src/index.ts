import {zhCNApp} from './app';
import {zhCNBattleTerms} from './battle';

export const zhCN = {
  ...zhCNApp,
  battle: zhCNBattleTerms,
} as const;

export type AppI18n = typeof zhCN;
export const appI18n = zhCN;
export const battleTerms = zhCN.battle;

export * from './app';
export * from './battle';
