import React, {useEffect, useRef, useState} from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  View,
} from 'react-native';
import {logException, logInteraction} from '@opapp/framework-diagnostics';
import {
  usePersistentJSON,
  writeUserFile,
} from '@opapp/framework-filesystem';
import {appI18n} from '@opapp/framework-i18n';
import {
  ActionButton,
  EmptyState,
  InfoPanel,
  ProgressBar,
  SectionCard,
  SignalPill,
  StatusBadge,
  useTheme,
} from '@opapp/ui-native-primitives';
import {
  createDefaultLlmChatConfig,
  parsePersistedLlmChatConfig,
  validateLlmChatConfig,
  type LlmChatMessage,
  type PersistedLlmChatConfig,
} from './model';
import {streamOpenAiCompatibleChat} from './stream';

const persistedConfigPath = 'llm-chat/config.v1.json';
const nativeSseDevSmokeScenario = 'llm-chat-native-sse';
const nativeSseServerErrorDevSmokeScenario = 'llm-chat-native-sse-server-error';
const nativeSseMalformedChunkDevSmokeScenario =
  'llm-chat-native-sse-malformed-chunk';
const nativeSseDevSmokeToken = 'fixture-token';
const nativeSseDevSmokeModel = 'fixture-model';
const llmChatDevSmokeRequestPrompt =
  'Reply with exactly CHAT_TEST_OK and nothing else.';
const llmChatMalformedChunkErrorText =
  '服务端返回了无法解析的流式 JSON 数据。';
const llmChatDevSmokeUiStatePath = 'llm-chat/dev-smoke-ui-state.json';
const llmChatDevSmokeScenarios = {
  [nativeSseDevSmokeScenario]: {
    expectedAssistantText: 'CHAT_TEST_OK',
    expectedErrorText: undefined,
    prompt: llmChatDevSmokeRequestPrompt,
  },
  [nativeSseServerErrorDevSmokeScenario]: {
    expectedAssistantText: undefined,
    expectedErrorText: 'EventSource requires HTTP 200, received 500.',
    prompt: llmChatDevSmokeRequestPrompt,
  },
  [nativeSseMalformedChunkDevSmokeScenario]: {
    expectedAssistantText: undefined,
    expectedErrorText: llmChatMalformedChunkErrorText,
    prompt: llmChatDevSmokeRequestPrompt,
  },
} as const;

function normalizeDevSmokeLogValue(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function resolveLlmChatDevSmokeConfig(devSmokeScenario?: string) {
  if (
    !devSmokeScenario ||
    !Object.prototype.hasOwnProperty.call(llmChatDevSmokeScenarios, devSmokeScenario)
  ) {
    return null;
  }

  return llmChatDevSmokeScenarios[
    devSmokeScenario as keyof typeof llmChatDevSmokeScenarios
  ];
}

function logDevSmokeFailure({
  error,
  scenario,
  stage,
}: {
  error: Error;
  scenario: string;
  stage: string;
}) {
  console.log(
    `[frontend-llm-chat] dev-smoke-failed stage=${stage} message=${normalizeDevSmokeLogValue(
      error.message,
    )}`,
  );
  logException('llm-chat.dev-smoke.failed', error, {
    scenario,
    stage,
  });
}

async function persistLlmChatDevSmokeErrorUiState({
  errorMessage,
  scenario,
}: {
  errorMessage: string;
  scenario: string;
}) {
  const persisted = await writeUserFile(
    llmChatDevSmokeUiStatePath,
    JSON.stringify({
      errorMessage,
      renderedAt: new Date().toISOString(),
      scenario,
      state: 'error',
    }),
  );

  if (!persisted) {
    throw new Error(
      `Dev smoke could not persist error UI state to ${llmChatDevSmokeUiStatePath}.`,
    );
  }
}

function createMessageId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function ConfigField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  secureTextEntry = false,
  caption,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  secureTextEntry?: boolean;
  caption?: string;
}) {
  const {palette, spacing} = useTheme();

  return (
    <View style={{gap: spacing.xs}}>
      <Text style={[styles.fieldLabel, {color: palette.inkSoft}]}>{label}</Text>
      <View
        style={[
          styles.fieldShell,
          {
            backgroundColor: palette.panel,
            borderColor: palette.border,
            minHeight: multiline ? 96 : 48,
          },
        ]}>
        <RNTextInput
          multiline={multiline}
          secureTextEntry={secureTextEntry}
          placeholder={placeholder}
          placeholderTextColor={palette.inkSoft}
          value={value}
          onChangeText={onChangeText}
          textAlignVertical={multiline ? 'top' : 'center'}
          style={[
            styles.fieldInput,
            {
              color: palette.ink,
              minHeight: multiline ? 96 : 48,
            },
          ]}
        />
      </View>
      {caption ? (
        <Text style={[styles.fieldCaption, {color: palette.inkMuted}]}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

function MessageBubble({
  role,
  content,
}: {
  role: LlmChatMessage['role'];
  content: string;
}) {
  const {palette, spacing} = useTheme();
  const isUser = role === 'user';

  return (
    <View
      style={[
        styles.messageBubble,
        {
          alignSelf: isUser ? 'flex-end' : 'stretch',
          backgroundColor: isUser ? palette.accentSoft : palette.panel,
          borderColor: isUser ? palette.accent : palette.border,
          marginLeft: isUser ? spacing.xl * 2 : 0,
          marginRight: isUser ? 0 : spacing.xl,
        },
      ]}>
      <View style={styles.messageHeader}>
        <StatusBadge
          label={
            isUser ? appI18n.llmChat.roles.user : appI18n.llmChat.roles.assistant
          }
          tone={isUser ? 'accent' : 'support'}
          emphasis='soft'
          size='sm'
        />
      </View>
      <Text
        style={[
          styles.messageBody,
          {
            color: palette.ink,
          },
        ]}>
        {content || appI18n.llmChat.emptyAssistantMessage}
      </Text>
    </View>
  );
}

type LlmChatScreenProps = {
  devSmokeBaseUrl?: string;
  devSmokeScenario?: string;
};

export function LlmChatScreen({
  devSmokeBaseUrl,
  devSmokeScenario,
}: LlmChatScreenProps = {}) {
  const {palette, spacing} = useTheme();
  const persistedConfig = usePersistentJSON<PersistedLlmChatConfig>({
    filePath: persistedConfigPath,
    parse: parsePersistedLlmChatConfig,
  });
  const scrollRef = useRef<ScrollView | null>(null);
  const activeStreamRef = useRef<ReturnType<typeof streamOpenAiCompatibleChat> | null>(
    null,
  );
  const devSmokeRanRef = useRef(false);
  const [config, setConfig] = useState(createDefaultLlmChatConfig());
  const [configLoaded, setConfigLoaded] = useState(false);
  const [token, setToken] = useState('');
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<LlmChatMessage[]>([]);
  const [status, setStatus] = useState<
    'idle' | 'connecting' | 'streaming' | 'done'
  >('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!persistedConfig.loaded) {
      return;
    }

    if (!configLoaded) {
      if (persistedConfig.data) {
        setConfig(persistedConfig.data);
      }
      setConfigLoaded(true);
    }
  }, [configLoaded, persistedConfig.data, persistedConfig.loaded]);

  useEffect(() => {
    if (!configLoaded) {
      return;
    }

    persistedConfig.persist(config);
  }, [config, configLoaded, persistedConfig]);

  useEffect(() => {
    return () => {
      activeStreamRef.current?.close();
      activeStreamRef.current = null;
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({animated: true});
  }, [messages]);

  function stopStreaming() {
    activeStreamRef.current?.close();
    activeStreamRef.current = null;
    setStatus(currentStatus =>
      currentStatus === 'idle' ? currentStatus : 'done',
    );
  }

  function clearConversation() {
    stopStreaming();
    setMessages([]);
    setErrorMessage(null);
  }

  function appendAssistantDelta(messageId: string, text: string) {
    setMessages(currentMessages =>
      currentMessages.map(message =>
        message.id === messageId
          ? {
              ...message,
              content: `${message.content}${text}`,
            }
          : message,
      ),
    );
  }

  function startChatRequest({
    requestConfig,
    requestToken,
    requestPrompt,
    devSmokeScenario,
    expectedAssistantText,
    expectedErrorText,
  }: {
    requestConfig: PersistedLlmChatConfig;
    requestToken: string;
    requestPrompt: string;
    devSmokeScenario?: string;
    expectedAssistantText?: string;
    expectedErrorText?: string;
  }) {
    const normalizedPrompt = requestPrompt.trim();
    const validationError = validateLlmChatConfig(
      requestConfig,
      requestToken,
      normalizedPrompt,
    );
    if (validationError) {
      setErrorMessage(validationError);
      if (devSmokeScenario) {
        logDevSmokeFailure({
          error: new Error(validationError),
          scenario: devSmokeScenario,
          stage: 'validation',
        });
      }
      return;
    }

    const nextUserMessage: LlmChatMessage = {
      id: createMessageId('user'),
      role: 'user',
      content: normalizedPrompt,
    };
    const nextAssistantMessage: LlmChatMessage = {
      id: createMessageId('assistant'),
      role: 'assistant',
      content: '',
    };
    const requestMessages = [...messages, nextUserMessage];
    let assistantText = '';

    setPrompt(currentPrompt =>
      currentPrompt === requestPrompt ? '' : currentPrompt,
    );
    setErrorMessage(null);
    setStatus('connecting');
    setMessages(currentMessages => [
      ...currentMessages,
      nextUserMessage,
      nextAssistantMessage,
    ]);

    activeStreamRef.current?.close();
    activeStreamRef.current = streamOpenAiCompatibleChat({
      config: requestConfig,
      token: requestToken,
      messages: requestMessages,
      onOpen() {
        setStatus('streaming');
        if (devSmokeScenario) {
          console.log('[frontend-llm-chat] dev-smoke-open');
          logInteraction('llm-chat.dev-smoke.open', {
            scenario: devSmokeScenario,
          });
        }
      },
      onDelta(text) {
        setStatus('streaming');
        assistantText += text;
        appendAssistantDelta(nextAssistantMessage.id, text);
      },
      onDone() {
        activeStreamRef.current = null;
        setStatus('done');
        if (devSmokeScenario) {
          if (expectedErrorText) {
            const unexpectedSuccessError = new Error(
              `Dev smoke expected stream error: ${expectedErrorText}`,
            );
            setErrorMessage(unexpectedSuccessError.message);
            logDevSmokeFailure({
              error: unexpectedSuccessError,
              scenario: devSmokeScenario,
              stage: 'assert-error',
            });
            return;
          }

          const normalizedAssistantText = assistantText.replace(/\r/g, '');
          if (!normalizedAssistantText.includes(expectedAssistantText ?? '')) {
            const mismatchError = new Error(
              `Dev smoke assistant text mismatch. Received: ${normalizedAssistantText}`,
            );
            setErrorMessage(mismatchError.message);
            logDevSmokeFailure({
              error: mismatchError,
              scenario: devSmokeScenario,
              stage: 'assert-assistant-text',
            });
            return;
          }

          const normalizedExpectedAssistantText = normalizeDevSmokeLogValue(
            expectedAssistantText ?? '',
          );
          console.log(
            `[frontend-llm-chat] dev-smoke-assistant-text text=${normalizedExpectedAssistantText}`,
          );
          console.log('[frontend-llm-chat] dev-smoke-complete');
          logInteraction('llm-chat.dev-smoke.complete', {
            scenario: devSmokeScenario,
            assistantText: normalizedExpectedAssistantText,
            outcome: 'success',
          });
        }
      },
      onError(error) {
        activeStreamRef.current = null;
        setStatus('done');
        setErrorMessage(error.message);
        if (devSmokeScenario) {
          const normalizedErrorMessage = error.message.replace(/\r/g, '');
          if (
            expectedErrorText &&
            normalizedErrorMessage.includes(expectedErrorText)
          ) {
            const normalizedExpectedErrorText = normalizeDevSmokeLogValue(
              expectedErrorText,
            );
            console.log(
              `[frontend-llm-chat] dev-smoke-error message=${normalizedExpectedErrorText}`,
            );
            console.log('[frontend-llm-chat] dev-smoke-complete');
            logInteraction('llm-chat.dev-smoke.complete', {
              scenario: devSmokeScenario,
              errorMessage: normalizedExpectedErrorText,
              outcome: 'error',
            });
            return;
          }

          logDevSmokeFailure({
            error,
            scenario: devSmokeScenario,
            stage: 'stream',
          });
        }
      },
    });
  }

  function sendPrompt() {
    startChatRequest({
      requestConfig: config,
      requestToken: token,
      requestPrompt: prompt,
    });
  }

  useEffect(() => {
    if (!devSmokeScenario) {
      return;
    }
    if (!errorMessage) {
      return;
    }

    const normalizedErrorMessage = errorMessage.replace(/\r/g, '');
    let cancelled = false;

    void (async () => {
      try {
        await persistLlmChatDevSmokeErrorUiState({
          errorMessage: normalizedErrorMessage,
          scenario: devSmokeScenario,
        });
        if (cancelled) {
          return;
        }

        const normalizedLoggedErrorMessage = normalizeDevSmokeLogValue(
          normalizedErrorMessage,
        );
        console.log(
          `[frontend-llm-chat] dev-smoke-error-ui path=${llmChatDevSmokeUiStatePath} message=${normalizedLoggedErrorMessage}`,
        );
        logInteraction('llm-chat.dev-smoke.error-ui', {
          errorMessage: normalizedLoggedErrorMessage,
          path: llmChatDevSmokeUiStatePath,
          scenario: devSmokeScenario,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        logDevSmokeFailure({
          error:
            error instanceof Error
              ? error
              : new Error('Dev smoke failed to persist the error UI state.'),
          scenario: devSmokeScenario,
          stage: 'persist-error-ui',
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [devSmokeScenario, errorMessage]);

  useEffect(() => {
    const devSmokeConfig = resolveLlmChatDevSmokeConfig(devSmokeScenario);
    if (
      devSmokeRanRef.current ||
      !configLoaded ||
      persistedConfig.loaded === false
    ) {
      return;
    }

    if (
      !devSmokeConfig ||
      typeof devSmokeBaseUrl !== 'string' ||
      devSmokeBaseUrl.trim().length === 0
    ) {
      return;
    }

    devSmokeRanRef.current = true;
    console.log('[frontend-llm-chat] dev-smoke-start');
    logInteraction('llm-chat.dev-smoke.start', {
      scenario: devSmokeScenario,
      baseUrl: devSmokeBaseUrl.trim(),
    });
    startChatRequest({
      requestConfig: {
        baseUrl: devSmokeBaseUrl.trim(),
        model: nativeSseDevSmokeModel,
        systemPrompt: '',
      },
      requestToken: nativeSseDevSmokeToken,
      requestPrompt: devSmokeConfig.prompt,
      devSmokeScenario,
      expectedAssistantText: devSmokeConfig.expectedAssistantText,
      expectedErrorText: devSmokeConfig.expectedErrorText,
    });
  }, [configLoaded, devSmokeBaseUrl, devSmokeScenario, persistedConfig.loaded]);

  const isStreaming = status === 'connecting' || status === 'streaming';
  const serviceReady = Boolean(
    config.baseUrl.trim() && config.model.trim() && token.trim(),
  );

  return (
    <View
      style={[
        styles.screen,
        {backgroundColor: palette.canvas, padding: spacing.lg, gap: spacing.lg},
      ]}>
      <View
        style={[
          styles.hero,
          {
            backgroundColor: palette.panel,
            borderColor: palette.border,
            padding: spacing.lg,
            gap: spacing.md,
          },
        ]}>
        <View style={[styles.heroTopline, {gap: spacing.sm}]}>
          <SignalPill
            label={appI18n.llmChat.eyebrow}
            tone='accent'
            emphasis='soft'
            size='sm'
          />
          <StatusBadge
            label={
              isStreaming
                ? appI18n.llmChat.status.streaming
                : serviceReady
                  ? appI18n.llmChat.status.ready
                  : appI18n.llmChat.status.idle
            }
            tone={isStreaming ? 'warning' : serviceReady ? 'support' : 'neutral'}
            emphasis='soft'
            size='sm'
          />
        </View>
        <Text style={[styles.heroTitle, {color: palette.ink}]}>
          {appI18n.llmChat.title}
        </Text>
        <Text style={[styles.heroDescription, {color: palette.inkMuted}]}>
          {appI18n.llmChat.description}
        </Text>
        <ProgressBar
          value={isStreaming ? 35 : serviceReady ? 100 : 0}
          max={100}
          indeterminate={isStreaming}
          tone={isStreaming ? 'warning' : serviceReady ? 'support' : 'neutral'}
        />
      </View>

      {errorMessage ? (
        <InfoPanel title={appI18n.llmChat.errorTitle} tone='danger'>
          <Text style={[styles.panelText, {color: palette.ink}]}>
            {errorMessage}
          </Text>
        </InfoPanel>
      ) : null}

      <View style={[styles.contentRow, {gap: spacing.lg}]}>
        <View style={[styles.sidebar, {gap: spacing.lg}]}>
          <SectionCard
            title={appI18n.llmChat.config.title}
            description={appI18n.llmChat.config.description}>
            <ConfigField
              label={appI18n.llmChat.config.baseUrl}
              value={config.baseUrl}
              onChangeText={baseUrl =>
                setConfig(currentConfig => ({...currentConfig, baseUrl}))
              }
              placeholder='https://api.example.com'
            />
            <ConfigField
              label={appI18n.llmChat.config.model}
              value={config.model}
              onChangeText={model =>
                setConfig(currentConfig => ({...currentConfig, model}))
              }
              placeholder='gpt-4.1-mini'
            />
            <ConfigField
              label={appI18n.llmChat.config.token}
              value={token}
              onChangeText={setToken}
              placeholder='sk-...'
              secureTextEntry
              caption={appI18n.llmChat.config.tokenHint}
            />
            <ConfigField
              label={appI18n.llmChat.config.systemPrompt}
              value={config.systemPrompt}
              onChangeText={systemPrompt =>
                setConfig(currentConfig => ({...currentConfig, systemPrompt}))
              }
              placeholder={appI18n.llmChat.config.systemPromptPlaceholder}
              multiline
            />
          </SectionCard>
        </View>

        <View style={[styles.mainColumn, {gap: spacing.lg}]}>
          <SectionCard
            title={appI18n.llmChat.transcript.title}
            description={appI18n.llmChat.transcript.description}>
            <ScrollView
              ref={scrollRef}
              style={styles.transcriptScroll}
              contentContainerStyle={[
                styles.transcriptContent,
                {gap: spacing.md},
              ]}>
              {messages.length === 0 ? (
                <EmptyState
                  title={appI18n.llmChat.empty.title}
                  description={appI18n.llmChat.empty.description}
                />
              ) : (
                messages.map(message => (
                  <MessageBubble
                    key={message.id}
                    role={message.role}
                    content={message.content}
                  />
                ))
              )}
            </ScrollView>
          </SectionCard>

          <SectionCard
            title={appI18n.llmChat.composer.title}
            description={appI18n.llmChat.composer.description}>
            <View
              style={[
                styles.composerShell,
                {
                  backgroundColor: palette.panel,
                  borderColor: palette.border,
                },
              ]}>
              <RNTextInput
                multiline
                value={prompt}
                onChangeText={setPrompt}
                placeholder={appI18n.llmChat.composer.placeholder}
                placeholderTextColor={palette.inkSoft}
                textAlignVertical='top'
                style={[
                  styles.composerInput,
                  {
                    color: palette.ink,
                  },
                ]}
              />
            </View>
            <View style={[styles.actionsRow, {gap: spacing.sm}]}>
              <ActionButton
                label={
                  isStreaming
                    ? appI18n.llmChat.actions.sending
                    : appI18n.llmChat.actions.send
                }
                onPress={sendPrompt}
                disabled={isStreaming}
              />
              <ActionButton
                label={appI18n.llmChat.actions.stop}
                onPress={stopStreaming}
                disabled={!isStreaming}
                tone='ghost'
              />
              <ActionButton
                label={appI18n.llmChat.actions.clear}
                onPress={clearConversation}
                disabled={messages.length === 0 && !isStreaming}
                tone='ghost'
              />
            </View>
          </SectionCard>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  hero: {
    borderWidth: 1,
    borderRadius: 24,
  },
  heroTopline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  heroDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  contentRow: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 360,
    maxWidth: '38%',
  },
  mainColumn: {
    flex: 1,
    minWidth: 0,
  },
  panelText: {
    fontSize: 14,
    lineHeight: 20,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  fieldShell: {
    borderWidth: 1,
    borderRadius: 16,
  },
  fieldInput: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 22,
  },
  fieldCaption: {
    fontSize: 12,
    lineHeight: 18,
  },
  transcriptScroll: {
    minHeight: 280,
    maxHeight: 520,
  },
  transcriptContent: {
    paddingBottom: 4,
  },
  messageBubble: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  messageBody: {
    fontSize: 15,
    lineHeight: 22,
  },
  composerShell: {
    borderWidth: 1,
    borderRadius: 20,
    minHeight: 132,
  },
  composerInput: {
    minHeight: 132,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    lineHeight: 22,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
