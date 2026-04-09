import assert from 'node:assert/strict';
import type {AgentApprovalTimelineEntry} from '../../framework/agent-runtime/src/model';
import {
  approvalMentionsDiffPreview,
  buildApprovalSummaryItems,
  resolveApprovalCommandPreview,
  resolveApprovalRequestedCwd,
  resolveApprovalTargetDescription,
} from '../../apps/companion-app/src/agent-workbench-approval-summary';

function createApproval(
  overrides: Partial<AgentApprovalTimelineEntry>,
): AgentApprovalTimelineEntry {
  return {
    kind: 'approval',
    entryId: 'timeline-entry-1',
    runId: 'run-1',
    seq: 1,
    createdAt: '2026-04-09T02:00:00.000Z',
    approvalId: 'approval-1',
    status: 'pending',
    title: '允许执行诊断写入预设',
    details:
      '批准后会在 opapp-frontend 下更新诊断预设文件 tooling/tests/fixtures/agent-workbench-approval-smoke.txt，并输出可复现的 diff 预览，用于验证写入审批链路。',
    permissionMode: 'workspace-write',
    requestReason: '允许执行诊断写入预设',
    commandText: null,
    requestedCwd: null,
    decisionMode: null,
    decisionNote: null,
    matchedRuleId: null,
    ...overrides,
  };
}

export function run() {
  const pendingWriteApproval = createApproval({});
  const pendingSummary = buildApprovalSummaryItems(pendingWriteApproval);

  assert.deepEqual(
    pendingSummary.map(item => item.label),
    ['要批准什么', '影响什么', '会产出什么'],
  );
  assert.equal(pendingSummary[0]?.value, '允许执行诊断写入预设');
  assert.match(
    pendingSummary[1]?.value ?? '',
    /opapp-frontend 下更新 tooling\/tests\/fixtures\/agent-workbench-approval-smoke\.txt/,
  );
  assert.match(pendingSummary[2]?.value ?? '', /diff 预览/);
  assert.equal(
    resolveApprovalTargetDescription(pendingWriteApproval),
    '工作区可写 · tooling/tests/fixtures/agent-workbench-approval-smoke.txt',
  );
  assert.equal(resolveApprovalRequestedCwd(pendingWriteApproval), 'opapp-frontend');
  assert.equal(resolveApprovalCommandPreview(pendingWriteApproval), null);
  assert.equal(approvalMentionsDiffPreview(pendingWriteApproval), true);

  const rejectedCommandApproval = createApproval({
    status: 'rejected',
    title: '允许执行任务：清理临时文件',
    requestReason: '允许执行任务：清理临时文件',
    commandText: 'Remove-Item .tmp/demo.txt',
    requestedCwd: 'opapp-frontend',
    decisionMode: 'reject',
    decisionNote: '不要删除这个文件',
    details: '批准后会在 opapp-frontend 下执行以下命令：Remove-Item .tmp/demo.txt',
    permissionMode: 'danger-full-access',
  });
  const rejectedSummary = buildApprovalSummaryItems(rejectedCommandApproval);

  assert.equal(rejectedSummary[0]?.value, '允许执行任务：清理临时文件');
  assert.match(
    rejectedSummary[1]?.value ?? '',
    /opapp-frontend 下继续执行一条待审批命令/,
  );
  assert.match(rejectedSummary[2]?.value ?? '', /没有继续执行/);
  assert.equal(
    resolveApprovalRequestedCwd(rejectedCommandApproval),
    'opapp-frontend',
  );
  assert.equal(
    resolveApprovalCommandPreview(rejectedCommandApproval),
    'Remove-Item .tmp/demo.txt',
  );
  assert.equal(approvalMentionsDiffPreview(rejectedCommandApproval), false);
}
