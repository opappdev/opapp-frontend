import {normalizeAgentStorageId} from './model';

export const agentRuntimeStorageRoot = 'agent-runtime';
export const agentThreadDocumentsDir = `${agentRuntimeStorageRoot}/threads`;
export const agentRunDocumentsDir = `${agentRuntimeStorageRoot}/runs`;
export const agentThreadIndexPath = `${agentRuntimeStorageRoot}/thread-index.json`;

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
