export const zhCNApp = {
  locale: 'zh-CN',
  app: {
    brandEyebrow: 'Heaven Burns Red 作战辅助',
    runtimeFallbackEyebrow: '运行时回退',
    runtimeFallbackTitle: '应用界面渲染失败',
    runtimeFallbackPrefix: '当前异常：',
    surfaceSessionLabel: '窗口会话',
    closeTabLabelPrefix: '关闭标签：',
  },
  surfaces: {
    launcher: '应用库与更新',
    challengeAdvisor: '挑战场景作战板',
    llmChat: 'LLM Chat',
    settings: '应用设置',
    viewShotLab: 'View Shot 实验台',
    windowCaptureLab: 'Window Capture 实验台',
  },
  bundleLauncher: {
    frame: {
      eyebrow: '应用库',
      title: '应用库与更新',
      description:
        '把可打开的应用、已安装版本和可用更新放到同一页里，优先解决“打开、安装、更新”这三件事。',
    },
    sections: {
      libraryTitle: '应用列表',
      libraryDescription:
        '按可更新、已安装、可安装和本机保留分组。每个条目都只保留用户关心的状态、版本和主操作。',
      detailTitle: '应用详情',
      detailDescription:
        '右侧会显示当前选中应用的版本状态、主要操作，以及默认启动和高级信息。',
    },
    actions: {
      check: '检查更新',
      checking: '正在检查更新...',
      open: '打开',
      opening: '正在打开...',
      update: '更新',
      updating: '正在更新...',
      install: '安装',
      installing: '正在安装...',
      setDefault: '设为默认启动',
      savingDefault: '正在保存默认启动...',
    },
    feedback: {
      checked: '应用状态已刷新。',
      checkFailed: '检查更新失败，请稍后重试。',
      opened: '已打开所选应用。',
      openFailed: '打开失败，请确认当前设备已经具备这个应用的本机资源。',
      updated: '更新已完成。',
      installed: '安装已完成。',
      updateFailed: '更新失败，请稍后重试。',
      saved: '默认启动已保存。',
      saveFailed: '保存默认启动失败，请稍后重试。',
    },
    groups: {
      updates: '可更新',
      installed: '已安装',
      available: '可安装',
      local: '本机保留',
    },
    library: {
      states: {
        updateFailed: '更新失败',
        updateAvailable: '可更新',
        installed: '已安装',
        installAvailable: '可安装',
        localOnly: '本机保留',
        remoteUnavailable: '未连接更新服务',
        rolloutPending: '暂未向此设备开放',
      },
      defaultStartup: '默认启动',
      readOnlyHint: '当前只读',
      versionSummary: {
        current: (version: string) => `当前 ${version}`,
        latest: (version: string) => `可用 ${version}`,
        installedAndLatest: (currentVersion: string, latestVersion: string) =>
          `已装 ${currentVersion} · 可用 ${latestVersion}`,
        unknown: '版本信息暂缺',
      },
      notes: {
        updateFailed: '最近一次更新没有完成，请先处理失败原因后再重试。',
        localOnly: '这个版本仍保留在本机，但更新服务已不再提供它。',
        remoteUnavailable:
          '当前宿主还没有连接更新服务，所以这里只能展示本机已有内容。',
        rolloutPending: '这个版本已经存在，但当前设备暂时还不在本轮灰度范围内。',
      },
    },
    service: {
      label: '更新服务',
      status: {
        loading: '读取中',
        checking: '检查中',
        ready: '已连接',
        unavailable: '未连接',
        error: '连接失败',
      },
      unavailableDescription: '当前宿主没有配置更新服务地址。',
      loadingDescription: '正在读取更新服务信息...',
      errorFallback: '读取更新服务失败，请稍后重试。',
    },
    details: {
      installedVersion: '已安装版本',
      availableVersion: '可用版本',
      selectedEntry: '启动入口',
      startupPreferencesTitle: '启动偏好',
      startupPreferencesDescription:
        '这里决定把这个应用设为默认启动时，下一次优先进入哪个入口。',
      advancedTitle: '高级详情',
      advancedDescription:
        '只在这里保留技术字段，方便排查版本、频道和本机落地来源。',
      bundleId: 'Bundle ID',
      channel: '频道',
      rollout: '灰度',
      localSource: '本机来源',
      lastOta: '最近 OTA',
      stagedAt: '落地时间',
      provenance: '落地判定',
      channels: '频道映射',
      currentWindow: '当前窗口',
      actions: {
        expand: '展开',
        collapse: '收起',
      },
      values: {
        none: '无',
        notInstalled: '未安装',
        notAvailable: '未声明',
        fullRollout: '全量',
        localBuild: '本地构建',
        hostStaged: '宿主已落地',
        nativeOtaApplied: '原生 OTA 已落地',
        hostStagedOnly: '仅本机保留',
        updated: '本轮已更新',
        upToDate: '本轮已最新',
        failed: '本轮失败',
      },
    },
    empty: {
      title: '当前没有可展示的应用',
      description: '连接更新服务后，这里会显示已安装应用和可安装扩展。',
    },
    targets: {
      mainLauncher:
        '先回到应用库首页，方便继续切换设置页、实验页或其它应用。',
      llmChat: '直接进入独立的 OpenAI-compatible LLM Chat 应用。',
      settings: '直接进入设置页，方便先调整宿主和窗口偏好。',
      viewShotLab: '直接进入 View Shot 验证页。',
      windowCaptureLab: '直接进入 Window Capture 验证页。',
      discoveredBundle:
        '这是从远端应用清单里发现的入口；当本机已经具备这个应用时，可以把它设为默认启动。',
    },
  },
  common: {
    unknown: '未知',
    readiness: {
      Ready: '可出击',
      Tight: '可压线',
      Fragile: '需补强',
    },
    settingsPresentation: {
      'current-window': '当前窗口',
      'new-window': '独立窗口',
    },
    windowTarget: {
      main: '主作战窗口',
      settings: '独立设置窗口',
      tool: '工具窗口',
      current: '当前窗口',
    },
    lane: {
      front: '前排',
      back: '后排',
    },
    battleLabel: 'BATTLE',
    weakPointPrefix: '弱点',
    tacticalPrefix: '战术',
    vacantSlot: '待补位',
    noCoverage: '未成队',
    choiceStatus: {
      current: '当前',
      switchTo: '切换',
      selected: '已选中',
      available: '可选择',
      owned: '已持有',
      missing: '未持有',
    },
  },
  challengeAdvisor: {
    openSource: {
      eyebrow: '能力边界',
      title: '挑战场景作战板未随开源仓库发布',
      description:
        '公开仓当前只保留 companion/runtime/host 的 Bundle 契约与验证基建，真实作战板实现应放在 .private-* 边界内单独接入。',
      publicShellTitle: '公开侧仍保留的内容',
      publicShellDescription:
        '主 Bundle 启动、startup target、跨 Bundle 切换和 Windows smoke 仍可继续验证，不依赖私有业务页面本体。',
      privateBundleTitle: '接入私有实现',
      privateBundleDescription:
        '如需启用私有挑战作战板，请在 companion app 的 .private-* 目录提供对应 child bundle 入口与页面实现。',
    },
    actions: {
      settingsOpening: '打开设置中...',
      settingsOpenLabel: {
        'current-window': '在当前窗口打开设置',
        'new-window': '在独立窗口打开设置',
      },
      settingsWindowFocus: '聚焦设置窗口',
      settingsWindowFocusBusy: '正在聚焦设置窗口...',
      settingsWindowClose: '关闭设置窗口',
      settingsWindowCloseBusy: '正在关闭设置窗口...',
      viewBattleRoster: '查看盒子',
      viewUnassignedRoster: '补位候选',
    },
    frame: {
      title: '挑战场景作战板',
      description:
        '支持异时层 EX、打分挑战、恒星战三类场景。先按章节、奖励战术型态、Battle 1 / Battle 2 的双编成与合计通关回合去排，再逐步补齐可追溯数据。',
    },
    badges: {
      requiresSquadsPrefix: '需要',
      requiresSquadsSuffix: '支部队出击',
      totalTurnTargetPrefix: '合计通关回合目标',
      totalTurnTargetUnknown: '合计通关回合目标待补证',
      currentEstimatePrefix: '当前预估',
      turnsSuffix: '回合',
      withinTarget: '已压进目标',
      targetStatusPendingEvidence: '目标待补证',
      overTargetPrefix: '超出',
      overTargetSuffix: '回合',
      encounterCurrent: '本期',
      encounterSwitch: '切换',
      styleOwned: '持有',
      styleMissing: '缺失',
    },
    metrics: {
      totalTurns: '合计回合',
      totalTurnsUnknownGoal: '待补证',
      requiredSquads: '需要部队',
      tacticalModes: '战术型态',
    },
    sections: {
      tacticalModesTitle: '奖励战术型态',
      tacticalModesDescription:
        '先确认当前场景的奖励战术型态。满足多个条件时只套最高值，所以要先决定哪一队吃这个红利。',
      rosterTitle: '持有角色与双队盒子',
      rosterDescription:
        '这里先按你目前实际能上场的角色盒切。当前先按角色近似建模，后面再细化到具体 Style。Battle 1 和 Battle 2 会各自从这个盒子抓一套独立队伍。',
      encounterTrackTitle: '挑战场景',
      encounterTrackById: {
        'divergence-ex': '异时层 EX',
        'score-challenge': '打分挑战',
        'stellar-wars': '恒星战',
      },
      rosterFilterTitle: '按部队查看',
      rosterFilterRecommendedLabel: '推荐部队',
      rosterFilterAllLabel: '全部',
      rosterStatusFilterTitle: '按纳入状态查看',
      rosterAssignmentFilterTitle: '按双队位置查看',
      rosterEmptyTitle: '当前筛选没有可显示的角色',
      rosterEmptyDescription:
        '试试切回“全部”或其他部队筛选，再继续整理当前盒子。',
      rosterFocusCandidatesTitleSuffix: ' · 补位候选',
      rosterFocusAssignedTitleSuffix: ' · 当前编组',
      rosterFocusCandidatesDescription:
        '当前只显示已纳入但尚未排入双队的角色，并按这战的职责、属性与武器适配排序。',
      rosterFocusAssignedDescription:
        '当前聚焦这战已排入的角色，方便你核对编位、职责与练度。',
      rosterFocusNeedPrefix: '优先补：',
      rosterFocusElementPrefix: '属性偏好：',
      rosterFocusWeaponPrefix: '武器偏好：',
      rosterFilterStateTitle: '当前筛选',
      rosterFocusCandidatesHeading: '优先补位候选',
      rosterAssignmentOverviewTitle: '当前双队分布',
      battleGuidanceTitle: '当前缺口与补位',
      battleTuneTitle: '这战的换人与压回合',
      battleGuidanceCandidatesHeading: '未排入里最适合补上的角色',
      battleRiskTitle: '这战当前的风险',
      battleSquadLabel: '主队位',
      battleLineupSectionLabel: '编组与站位',
      battleAxisSectionLabel: '回合轴建议',
      chapterTitle: '合计通关回合与章节风险',
      chapterDescription:
        '这块只看整章，不再看单战。真正卡人的通常是 Battle 2 没有独立成队。',
      chapterScheduleWarningTitle: '开放节奏提醒',
      chapterScheduleWarningDescription:
        '这两条会直接影响“今天能不能打”和“当前推荐是否还有效”，开打前先核对当周排期。',
      chapterAvailabilityWeekendMostly:
        '异时层 EX 当前多数在周末开放，非开放窗口可能无法直接挑战。',
      chapterAvailabilityScheduledWindow:
        '打分挑战通常按期开放，当前推荐绑定该期窗口；超出开放时间后请先确认是否已切换赛季。',
      chapterTacticalWeeklyRotation:
        '奖励战术型态属性按周轮换，当前推荐只对已核对周有效，开打前请先复核当周元素。',
      chapterEvidenceTitle: '来源详情',
      chapterEvidenceSummaryPrefix: '当前来源覆盖：',
      chapterEvidenceCheckedOnPrefix: '最近核对：',
      chapterEvidenceCheckedOnLabel: '核对日期：',
      chapterEvidenceRefLabel: '链接/引用：',
      chapterEvidenceNoteLabel: '备注：',
      chapterEvidenceEmpty:
        '当前没有可展示的来源条目，请先补证据后再固化章节结论。',
      chapterEvidenceRiskTitle: '来源风险',
      chapterEvidenceRiskByCode: {
        'verification-partially-verified':
          '当前 encounter 仅部分验证，机制结论需继续补证后再固化。',
        'verification-unverified':
          '当前 encounter 未验证，机制结论仅可用于占位和流程演示。',
        'only-user-notes': '当前证据仅用户口述，建议补实机截图后再固化结论。',
        'only-unsourced-sample':
          '当前证据仍是无来源 sample，占位机制只可用于演示流程。',
        'conflict-missing-evidence-items':
          '来源记录缺少 evidenceItems（legacy evidenceRef 也为空），请先补证据条目。',
        'conflict-unsourced-sample-verified':
          '来源标记冲突：无来源 sample 不能标为已验证，当前已按未验证处理。',
        'conflict-empty-evidence-ref':
          '来源条目存在空 evidenceRef，来源不可追溯，当前已按未验证处理。',
      },
      chapterSlateEyebrow: '章节判断',
      chapterGapPrefix: '目前还高于目标 ',
      chapterGapSuffix: ' 回合，优先看第二战与增伤覆盖。',
      chapterOnTarget: '目前这套双编成已经压进你设定的章节目标。',
      chapterTargetPendingEvidence:
        '当前章节目标回合仍待补证，先按来源风险与双队稳定性推进。',
      sharedGapTitle: '双战共同缺口',
      buildTitle: '培养与替补',
      buildDescription:
        '先补会同时影响 Battle 1 / Battle 2 的位置，再看替补角色值不值得投。',
      flexHeading: '替补候选',
      evidenceSourceKind: {
        'manual-screenshot': '实机截图',
        'user-notes': '用户原文',
        'unsourced-sample': '无来源 sample',
      },
    },
    filters: {
      rosterStatus: {
        ALL: '全部角色',
        OWNED: '仅持有',
        MISSING: '仅缺失',
        ASSIGNED: '仅已上阵',
      },
      rosterAssignment: {
        ALL: '全部位置',
        BATTLE1: '第一队位',
        BATTLE2: '第二队位',
        UNASSIGNED: '未排入',
      },
    },
    summaries: {
      selectedStylesSuffix: ' 名角色已纳入',
      coveragePrefix: '目前双战总覆盖 ',
      elementCoveragePrefix: '，属性面是 ',
      rosterIncludedSuffix: ' 已纳入',
      rosterAssignedPrefix: '当前排入',
      rosterAssignedNone: '当前未排入双队',
      rosterNotOwned: '尚未纳入当前盒子',
      rosterAssignedCountSuffix: ' 人已上阵',
      rosterFilteredPrefix: '筛选后 ',
      rosterPeopleSuffix: ' 人',
      rosterOwnedCountPrefix: '已纳入 ',
      rosterAssignedCountPrefix: '已上阵 ',
      rosterCandidatePrefix: '候选：',
      rosterFilterVisiblePrefix: '共 ',
      rosterFilterOwnedPrefix: '持有 ',
      rosterFilterMissingPrefix: '缺失 ',
      rosterFilterAssignedShortPrefix: '已上阵 ',
      rosterBattleOnePrefix: '第一队：',
      rosterBattleTwoPrefix: '第二队：',
      rosterUnassignedOwnedPrefix: '未排入：',
      rosterSquadFallback: '暂无部队',
      projectedTurnsPrefix: '预估 ',
      projectedTurnsSuffix: ' 回合通关',
      battleVacancyPrefix: '当前还空 ',
      battleVacancySuffix: ' 个位置',
      battleGuidanceReady:
        '当前 6 人骨架已经成队，接下来优先把更贴合奖励、弱点和武器轴的未排入角色换上。',
      battleCoverageRolesPrefix: '已成型职责：',
      battleCoverageElementsPrefix: '当前属性面：',
      battleCoverageWeaponsPrefix: '当前武器面：',
      battleCandidateEmpty:
        '当前没有未排入的已纳入角色可补；要么先补盒子，要么重新拆两队。',
      trainingOverviewEmpty: '当前筛选里还没有纳入角色',
      slotTrainingPrefix: '当前练度：',
      slotTrainingVacant: '当前练度：待补位',
      slotVacantNote:
        '当前这个位置还没有可上场角色，先补位后再细调排轴与分工。',
      slotVacantMetaPrefix: '建议补 ',
      slotVacantMetaSuffix: ' 位，先凑齐独立 6 人编组',
      battleKickerTurnsInfix: ' · 预计 ',
      battleKickerTurnsSuffix: ' 回合',
      encounterTargetPendingEvidence: '目标回合待补证',
    },
  },
  llmChat: {
    eyebrow: '原生流式 SSE',
    title: 'LLM Chat',
    description:
      '直接连接兼容 OpenAI 的 `/v1/chat/completions`，按 SSE 增量渲染 assistant 回复，先交付最小可用的多轮对话体验。',
    errorTitle: '当前请求失败',
    emptyAssistantMessage: '等待模型继续返回内容...',
    roles: {
      user: '用户',
      assistant: '助手',
    },
    status: {
      idle: '待配置',
      ready: '可以发送',
      streaming: '生成中',
    },
    config: {
      title: '连接配置',
      description:
        '只持久化 Base URL、Model 和 System Prompt。Token 只保存在当前会话内，不会写入磁盘。',
      baseUrl: 'Base URL',
      model: 'Model',
      token: 'Token',
      tokenHint: 'Token 仅保留在当前会话内，关闭应用后不会保存。',
      systemPrompt: 'System Prompt',
      systemPromptPlaceholder: '可选。用来约束助手风格、边界或输出格式。',
    },
    transcript: {
      title: '对话流',
      description:
        'assistant 内容会随着 SSE 数据块逐步追加。当前版本保留纯文本换行，不做 Markdown 渲染。',
    },
    empty: {
      title: '还没有对话内容',
      description: '先填好连接信息，然后输入一条消息开始流式对话。',
    },
    composer: {
      title: '发送消息',
      description: '支持多轮上下文、手动停止和清空当前会话。',
      placeholder: '输入你想发送给模型的内容...',
    },
    actions: {
      send: '发送',
      sending: '发送中...',
      stop: '停止',
      clear: '清空会话',
    },
  },
  settings: {
    densityModes: {
      standard: {
        label: '标准',
        detail: '默认间距，适合一般浏览。',
      },
      compact: {
        label: '紧凑',
        detail: '缩减留白，同屏显示更多内容。',
      },
    },
    windowModes: {
      balanced: {
        label: '均衡',
        detail: '保持默认扫描宽度与信息节奏。',
      },
      compact: {
        label: '紧凑',
        detail: '更适合并排查看或较小显示器。',
      },
      wide: {
        label: '宽屏',
        detail: '更适合高密度仪表板与审阅流程。',
      },
    },
    presentationOptions: {
      'current-window': {
        label: '复用当前窗口',
        detail: '更适合把设置当作当前会话内的页面或标签。',
      },
      'new-window': {
        label: '打开独立窗口',
        detail: '更适合把设置固定在主规划窗口旁边。',
      },
    },
    frame: {
      eyebrow: '应用设置',
      title: '窗口行为与宿主偏好',
      description:
        '这里先集中管理窗口尺寸、设置页打开方式和宿主层行为。默认语言先固定为简体中文，后面再扩展多语言。',
    },
    sections: {
      displayDensityTitle: '显示密度',
      displayDensityDescription:
        '影响所有界面的间距和留白。切换后立即生效，不需要重启。',
      windowSizingTitle: '默认窗口尺寸',
      windowSizingDescription:
        '这些偏好属于宿主级默认值。新窗口与下次启动都应该稳定使用它们。',
      mainWindow: '主作战窗口',
      detachedSettingsWindow: '独立设置窗口',
      settingsPresentationTitle: '默认设置打开方式',
      settingsPresentationDescription:
        '当入口没有显式强制开新窗口时，这里决定设置页默认怎样承载。',
      applyPreviewTitle: '保存与预览',
      applyPreviewDescription:
        '底部操作栏会固定在窗口底部，方便你在查看宿主状态时随时保存。',
      windowActionsTitle: '窗口操作',
      windowActionsDescription:
        '这些动作现在都来自宿主桥接，而不是只靠导航含义。',
      footerEyebrow: '设置草稿',
    },
    actions: {
      returnInline: '在当前窗口返回主页面',
      returnInlineBusy: '正在返回主页面...',
      openMainTab: '以标签形式打开主页面',
      openMainTabBusy: '正在打开主页面标签...',
      openDetachedSettings: '打开独立设置窗口',
      openDetachedSettingsBusy: '正在打开独立设置窗口...',
      focusMainWindow: '聚焦主窗口',
      focusMainWindowBusy: '正在聚焦主窗口...',
      closeCurrentWindow: '关闭当前窗口',
      closeCurrentWindowBusy: '正在关闭当前窗口...',
      resetDraft: '重置草稿',
      saveWindowPreferences: '保存窗口偏好',
      saveWindowPreferencesBusy: '正在保存窗口偏好...',
      saveWindowPreferencesDone: '窗口偏好已保存',
    },
    status: {
      currentSavedDefaultPrefix: '当前保存的默认值：',
      loadingPreferences: '正在读取当前宿主偏好...',
      loadingFooter: '正在读取当前偏好...',
      footerSignalLoading: '读取中',
      footerSignalDirty: '待保存',
      footerSignalClean: '已同步',
      footerSignalSaved: '已保存',
      unsavedChanges: '有未保存改动，保存后会立刻作用到命中的当前窗口。',
      noUnsavedChanges: '当前没有未保存改动。',
      savedToPolicy: '偏好已保存到当前宿主策略。',
      currentWindowIdPrefix: '当前窗口 ID：',
      mainWindowId: '主窗口 ID：window.main',
      currentHostWindowPrefix: '当前宿主窗口：',
      mainWindowModePrefix: '主窗口模式：',
      settingsWindowModePrefix: '独立设置窗口模式：',
      settingsOpenPrefix: '设置默认打开方式：',
    },
    feedback: {
      immediateApply: {
        settings:
          '你当前正在独立设置窗口里编辑。保存后会立即作用到这个设置窗口；主作战窗口会在下次打开时使用新默认值。',
        main: '你当前正在主作战窗口里编辑。保存后会立即作用到这个主窗口；独立设置窗口会在下次打开时使用新默认值。',
        generic:
          '保存后会立即更新命中的当前宿主窗口；其他窗口类型会在下次打开时使用新的默认值。',
      },
      saveNotice: {
        settingsPrefix: '已保存。当前独立设置窗口已切到',
        settingsSuffix: '；主作战窗口会在下次打开时应用新值。',
        mainPrefix: '已保存。当前主作战窗口已切到',
        mainSuffix: '；独立设置窗口会在下次打开时应用新值。',
        genericPrefix: '已保存。',
        genericSuffix: '的默认值已更新。',
      },
    },
  },
  viewShotLab: {
    frame: {
      eyebrow: '宿主实验台',
      title: 'View Shot 验证页',
      description:
        '这里专门验证 Windows 宿主里的 captureRef、ViewShot.capture、captureScreen 与临时文件释放。目标卡片会持续变化，方便你确认截图拿到的是当前窗口里的最新内容。',
    },
    sections: {
      entryTitle: '打开实验台',
      entryDescription:
        '专门给宿主截图桥留一个独立验证页，方便你确认 captureRef、ViewShot.capture、captureScreen 与 tmpfile 清理都在当前宿主里工作。',
      targetTitle: '目标卡片',
      targetDescription:
        '这块故意放了明显的色块、标签和样本序号，便于确认 captureRef / ViewShot.capture 抓到的是当前这次渲染，而不是旧缓存。',
      actionTitle: '验证动作',
      actionDescription:
        '三个截图按钮分别覆盖区域截图、组件 capture 和整窗截图；保留一个删除按钮专门验证宿主对 tmpfile 的清理能力。',
      resultTitle: '最近一次结果',
      resultDescription:
        '这里会显示最近一次截图的输出类型、预览与原始返回值。若输出是 tmpfile，还会保留当前托管文件路径。',
      notesTitle: '当前实现边界',
    },
    actions: {
      bumpSample: '推进样本序号',
      captureRefTmpfile: 'captureRef -> tmpfile',
      captureComponentDataUri: 'ViewShot.capture -> data-uri',
      captureScreenTmpfile: 'captureScreen -> tmpfile',
      releaseTmpfile: '删除上次 tmpfile',
      releaseTmpfileBusy: '正在删除上次 tmpfile...',
      returnMain: '在当前窗口返回主页面',
      returnMainBusy: '正在返回主页面...',
      openDetachedLab: '在工具窗口打开实验台',
      openDetachedLabBusy: '正在打开工具窗口实验台...',
      openCurrentLab: '在当前窗口打开实验台',
    },
    status: {
      hostReady: 'Windows host 已就绪',
      hostUnavailable: '当前宿主未加载 view-shot',
      idle: '尚未触发截图',
      capturing: '截图中',
      tmpfileReady: '可释放 tmpfile',
      noTmpfile: '暂无 tmpfile',
      released: '上次 tmpfile 已删除',
      releaseSkipped: '当前没有可删除的 tmpfile',
      previewEmpty: '还没有可预览的截图。先触发 data-uri 或 tmpfile 输出。',
      latestResultLabel: '最近一次原始结果',
      managedTmpfileLabel: '当前托管 tmpfile',
      sampleSeed: '样本序号',
      captureCount: '本页触发',
      windowId: '当前窗口',
      windowPolicy: '当前承载',
      latestAction: '最近动作',
      latestResultKind: '输出类型',
      latestUpdatedAt: '最近更新',
    },
    sampleCard: {
      eyebrow: 'View Shot Target',
      title: '宿主截图样本卡片',
      stripeCaptureRef: 'captureRef',
      stripeComponentCapture: 'ViewShot.capture',
      stripeScreenCapture: 'captureScreen',
      hostBridgeReady: 'Host bridge ready',
      hostBridgeMissing: 'Host bridge missing',
      renderTimePrefix: '当前渲染时间',
      renderSeedHint: '样本序号每推进一次，目标内容都会变化。',
    },
    resultKinds: {
      tmpfile: 'tmpfile',
      'data-uri': 'data-uri',
      base64: 'base64',
    },
    messages: {
      detachedOpened: '已在工具窗口打开一份新的实验台副本。',
    },
    notes: {
      visiblePixels:
        'Windows 当前实现抓的是桌面上可见的窗口像素，不是离屏 React 视图导出。',
      focusedWindow: 'captureScreen 会抓当前聚焦的 OPApp 窗口 client area。',
      measuredRegion:
        'captureRef / ViewShot.capture 依赖 measureInWindow 量到的目标区域，再由宿主换算 DPI 后截取。',
    },
    feedback: {
      settingsEntryHint:
        '入口会直接打开一个专门验证 captureRef、ViewShot.capture、captureScreen 和 releaseCapture 的页面。',
      hostUnavailableBody:
        '当前 surface 已加载，但宿主没有把 OpappViewShot 模块注入进来，所以按钮会保持禁用。',
      captureFailedTitle: 'View Shot 调用失败',
      hostStatusTitle: '宿主状态',
    },
  },
  windowCaptureLab: {
    frame: {
      eyebrow: '宿主实验台',
      title: 'Window Capture 验证页',
      description:
        '这里直接验证 Windows 宿主里的 OpappWindowCapture bridge。列表与截图都走 native module，不再依赖外部脚本进程。',
    },
    sections: {
      entryTitle: '打开 Window Capture 实验台',
      entryDescription:
        '专门给宿主窗口捕获桥留一个独立验证页，方便你确认 listVisibleWindows / captureWindow 已经真正进宿主并可被前端消费。',
      selectorTitle: 'Selector 编辑器',
      selectorDescription:
        '默认命中当前前台窗口，也可以叠加句柄、进程名、标题或类名条件，把实验台升级成更实用的宿主调试工具。',
      targetTitle: '命中窗口',
      targetDescription:
        '刷新会按当前 selector 重新查询可见顶级窗口。点击候选卡片会把它的 handle pin 回 selector，避免多命中时只能吃第一项。',
      actionTitle: '截图动作',
      actionDescription:
        '两个按钮都用 backend=auto 调宿主。当前实现里 region=window 与 region=client 都应优先走 WGC。',
      resultTitle: '最近一次结果',
      resultDescription:
        '这里会显示宿主返回的 backend、region、cropBounds、输出路径与文件预览，方便核对 bridge 返回模型没有漂移。',
      notesTitle: '当前实现边界',
    },
    actions: {
      refreshForeground: '刷新命中窗口',
      captureWindow: '截取窗口内容',
      captureClient: '截取客户区',
      useForegroundDefaults: '恢复前台默认',
      clearManualFilters: '清空手动条件',
      clearPinnedHandle: '取消句柄 pin',
      returnMain: '在当前窗口返回主页面',
      returnMainBusy: '正在返回主页面...',
      openDetachedLab: '在工具窗口打开实验台',
      openDetachedLabBusy: '正在打开工具窗口实验台...',
      openCurrentLab: '在当前窗口打开实验台',
    },
    status: {
      hostReady: 'Windows host 已就绪',
      hostUnavailable: '当前宿主未加载 window-capture',
      idle: '尚未触发截图',
      capturing: '截图中',
      selectorSummary: '当前 selector',
      foregroundMatches: '命中窗口',
      selectedWindow: '命中标题',
      selectedHandle: '句柄',
      selectedProcess: '进程',
      pinnedHandle: '当前 pin',
      pinnedHandleEmpty: '未 pin，capture 会吃当前候选第一项',
      selectedBackend: '最近 backend',
      latestRegion: '最近区域',
      latestCaptureSize: '最近尺寸',
      latestUpdatedAt: '最近更新',
      candidateHint: '点击任一候选卡片，会把它的 handle 回填到 selector。',
      candidateEmpty:
        '当前 selector 还没有命中窗口。先刷新，或放宽条件后再试。',
      candidatePinned: '已 pin',
      candidateDefault: '默认首项',
      candidateCaptured: '最近截图',
      candidateForeground: '前台',
      candidateMinimized: '最小化',
      previewEmpty: '还没有可预览的截图。先触发窗口内容或客户区截图。',
    },
    selectorModes: {
      foreground: {
        label: '前台优先',
        detail: '默认只命中当前前台窗口，也可以和手动字段叠加缩小范围。',
      },
      manual: {
        label: '仅手动条件',
        detail:
          '关闭 foreground，让句柄、进程名、标题或类名去匹配其它可见窗口。',
      },
    },
    fields: {
      handle: {
        label: '句柄',
        placeholder: '例如 0x1234AB 或 4660',
      },
      processName: {
        label: '进程名',
        placeholder: '例如 HeavenBurnsRed',
      },
      titleContains: {
        label: '标题包含',
        placeholder: '例如 OPApp',
      },
      titleExact: {
        label: '标题精确',
        placeholder: '完整窗口标题',
      },
      className: {
        label: '类名',
        placeholder: '例如 WinUIDesktopWin32WindowClass',
      },
    },
    messages: {
      detachedOpened: '已在工具窗口打开一份新的 Window Capture 实验台副本。',
      refreshed: '已按当前 selector 刷新命中窗口。',
      pinnedWindow: '已把候选窗口 pin 回 selector 句柄。',
      clearedPinnedHandle: '已清除当前句柄 pin。',
      capturedWindow: '窗口内容截图完成。',
      capturedClient: '客户区截图完成。',
    },
    notes: {
      foregroundOnly:
        '当前页面默认以 foreground=true 起步；如果只是想快速确认 bridge 正常，直接保留这个默认 selector 就够了。',
      selectorCombinator:
        'foreground 与手动字段会按交集匹配；如果要抓后台或非前台窗口，先切到“仅手动条件”。',
      backendAuto:
        'region=window / client 默认都会优先走 WGC；只有 monitor 语义才会退回 copy-screen。',
      cropSemantics:
        'client 语义来自整窗内容捕获后的客户区裁剪，所以宿主会额外返回 sourceItemSize 与 cropBounds。',
      outputLocation:
        '默认输出会写到系统临时目录下的 OPApp/window-capture，便于 smoke 和人工检查后统一清理。',
    },
    feedback: {
      settingsEntryHint:
        '入口会直接打开一个专门验证 listVisibleWindows / captureWindow 的页面。',
      hostUnavailableBody:
        '当前 surface 已加载，但宿主没有把 OpappWindowCapture 模块注入进来，所以按钮会保持禁用。',
      captureFailedTitle: 'Window Capture 调用失败',
      hostStatusTitle: '宿主状态',
    },
    errors: {
      selectorRequired:
        '至少保留一个 selector 条件。可以恢复前台默认，或填写句柄/进程名/标题/类名。',
    },
  },
} as const;
