import {normalizeAgentStorageId} from './model';

export const agentRuntimeStorageRoot = 'agent-runtime';
export const agentWorkspaceTargetPath =
  `${agentRuntimeStorageRoot}/workspace-target.json`;
export const agentThreadDocumentsDir = `${agentRuntimeStorageRoot}/threads`;
export const agentRunDocumentsDir = `${agentRuntimeStorageRoot}/runs`;
export const agentThreadIndexPath = `${agentRuntimeStorageRoot}/thread-index.json`;
export const agentApprovalRulesPath =
  `${agentRuntimeStorageRoot}/approval-rules.json`;
export const agentLlmProviderConfigPath =
  `${agentRuntimeStorageRoot}/llm-provider-config.json`;

export function buildAgentThreadDocumentPath(threadId: string) {
  return `${agentThreadDocumentsDir}/${normalizeAgentStorageId(
    threadId,
    'thread id',
  )}.json`;
}

export function buildAgentRunDocumentPath(runId: string) {
  return `${agentRunDocumentsDir}/${normalizeAgentStorageId(
    runId,
    'run id',
  )}.json`;
}
