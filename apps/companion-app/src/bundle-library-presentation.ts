import {companionBundleIds} from './companion-runtime';

export type BundleLibraryPresentation = {
  bundleId: string;
  displayName: string;
  subtitle: string;
  iconKey?: string;
  iconTone?: 'accent' | 'support' | 'warning' | 'neutral' | 'danger';
  defaultOpenTargetId?: string;
};

const knownBundlePresentations = new Map<string, BundleLibraryPresentation>([
  [
    companionBundleIds.main,
    {
      bundleId: companionBundleIds.main,
      displayName: 'OPApp 主页',
      subtitle: '设置、实验页和其它应用入口都从这里开始。',
      iconKey: 'opapp-home',
      iconTone: 'support' as const,
      defaultOpenTargetId: 'main-launcher',
    },
  ],
  [
    companionBundleIds.chat,
    {
      bundleId: companionBundleIds.chat,
      displayName: 'LLM Chat',
      subtitle: '独立的 OpenAI-compatible 流式聊天应用。',
      iconKey: 'llm-chat',
      iconTone: 'accent' as const,
      defaultOpenTargetId: 'llm-chat',
    },
  ],
  [
    'opapp.hbr.workspace',
    {
      bundleId: 'opapp.hbr.workspace',
      displayName: 'HBR 作战空间',
      subtitle: '面向 Heaven Burns Red 的作战分析与扩展入口。',
      iconKey: 'hbr-workspace',
      iconTone: 'accent' as const,
    },
  ],
]);

function titleCaseToken(token: string) {
  const trimmed = token.trim();
  if (!trimmed) {
    return '';
  }

  const lower = trimmed.toLowerCase();
  if (lower === 'hbr') {
    return 'HBR';
  }

  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function normalizeFallbackName(bundleId: string) {
  return bundleId
    .replace(/^opapp[.-]/i, '')
    .split(/[._-]+/)
    .map(titleCaseToken)
    .filter(Boolean)
    .join(' ');
}

export function humanizeSurfaceId(surfaceId: string) {
  const normalized = surfaceId.trim();
  if (!normalized) {
    return '默认入口';
  }

  return normalized
    .split(/[._-]+/)
    .map(titleCaseToken)
    .filter(Boolean)
    .join(' ');
}

export function resolveBundleLibraryPresentation({
  bundleId,
  firstLaunchTargetTitle,
}: {
  bundleId: string;
  firstLaunchTargetTitle?: string | null;
}): BundleLibraryPresentation {
  const known = knownBundlePresentations.get(bundleId);
  if (known) {
    return known;
  }

  const fallbackName = normalizeFallbackName(bundleId) || bundleId;
  const fallbackSubtitle =
    firstLaunchTargetTitle?.trim() || '来自更新服务的可选应用。';

  return {
    bundleId,
    displayName: fallbackName,
    subtitle: fallbackSubtitle,
  };
}

export function buildBundleLibraryMonogram(
  displayName: string,
  bundleId: string,
) {
  const rawLetters = displayName
    .replace(/[^0-9A-Za-z\u4e00-\u9fff]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (rawLetters.length >= 2) {
    return (rawLetters[0][0] + rawLetters[1][0]).toUpperCase();
  }

  if (rawLetters.length === 1 && rawLetters[0].length >= 2) {
    return rawLetters[0].slice(0, 2).toUpperCase();
  }

  const bundleLetters = bundleId
    .replace(/[^0-9A-Za-z]+/g, '')
    .slice(0, 2)
    .toUpperCase();

  return bundleLetters || 'AP';
}
