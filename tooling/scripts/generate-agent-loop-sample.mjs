import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), '..', '..');
const workspaceRoot = path.resolve(repoRoot, '..');

const defaultEnvFile = path.join(workspaceRoot, '.env.openrouter.local');
const defaultOutputPath = path.join(
  repoRoot,
  'tooling',
  'tests',
  'fixtures',
  'agent-loop-openrouter-sample.json',
);
const defaultBenchmarkCatalogPath = path.join(
  repoRoot,
  'tooling',
  'benchmarks',
  'agent-loop-benchmark-cases.v1.json',
);
const defaultBaseUrl = 'https://openrouter.ai/api';
const defaultModel = 'stepfun/step-3.5-flash:free';
const defaultMaxTokens = 512;

function printUsage() {
  console.log(`Usage: node ./tooling/scripts/generate-agent-loop-sample.mjs [options]

Options:
  --env-file <path>     Path to the local OpenRouter token file.
  --model <slug>        OpenRouter model slug. Default: ${defaultModel}
  --case <id>           Benchmark case id. Defaults to catalog default.
  --catalog <path>      Benchmark case catalog path.
  --output <path>       Output replay fixture path.
  --list-cases          Print the benchmark starter pack and exit.
  --help                Show this message.

This is a dev-only utility. It records one OpenRouter request/response pair for
local replay experiments. Smoke tests stay offline and keyless.`);
}

function parseArgs(argv) {
  const options = {
    envFile: defaultEnvFile,
    model: defaultModel,
    caseId: null,
    benchmarkCatalogPath: defaultBenchmarkCatalogPath,
    outputPath: defaultOutputPath,
    listCases: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--help' || token === '-h') {
      printUsage();
      process.exit(0);
    }

    if (token === '--list-cases') {
      options.listCases = true;
      continue;
    }

    if (
      token === '--env-file' ||
      token === '--model' ||
      token === '--case' ||
      token === '--catalog' ||
      token === '--output'
    ) {
      const nextValue = argv[index + 1];
      if (!nextValue) {
        throw new Error(`Missing value for ${token}.`);
      }

      if (token === '--env-file') {
        options.envFile = resolvePathFromRepo(nextValue);
      } else if (token === '--model') {
        options.model = nextValue.trim() || defaultModel;
      } else if (token === '--case') {
        options.caseId = nextValue.trim() || null;
      } else if (token === '--catalog') {
        options.benchmarkCatalogPath = resolvePathFromRepo(nextValue);
      } else {
        options.outputPath = resolvePathFromRepo(nextValue);
      }
      index += 1;
      continue;
    }

    if (token.startsWith('--env-file=')) {
      options.envFile = resolvePathFromRepo(token.slice('--env-file='.length));
      continue;
    }

    if (token.startsWith('--model=')) {
      options.model = token.slice('--model='.length).trim() || defaultModel;
      continue;
    }

    if (token.startsWith('--case=')) {
      options.caseId = token.slice('--case='.length).trim() || null;
      continue;
    }

    if (token.startsWith('--catalog=')) {
      options.benchmarkCatalogPath = resolvePathFromRepo(
        token.slice('--catalog='.length),
      );
      continue;
    }

    if (token.startsWith('--output=')) {
      options.outputPath = resolvePathFromRepo(token.slice('--output='.length));
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  return options;
}

function resolvePathFromRepo(value) {
  if (!value || !value.trim()) {
    throw new Error('Expected a non-empty path.');
  }

  return path.isAbsolute(value)
    ? path.normalize(value)
    : path.resolve(repoRoot, value);
}

function toPosixRelative(fromPath, toPath) {
  return path.relative(fromPath, toPath).replace(/\\/g, '/');
}

async function loadOpenRouterKey(envFilePath) {
  const raw = await fs.readFile(envFilePath, 'utf8');
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error(`OpenRouter key file is empty: ${envFilePath}`);
  }

  if (trimmed.startsWith('sk-or-')) {
    return trimmed;
  }

  const records = trimmed
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));

  for (const keyName of [
    'OPENROUTER_API_KEY',
    'OPENROUTER_KEY',
    'OPENROUTER_TOKEN',
  ]) {
    const record = records.find(line => line.startsWith(`${keyName}=`));
    if (!record) {
      continue;
    }

    const value = record
      .slice(record.indexOf('=') + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');
    if (value) {
      return value;
    }
  }

  throw new Error(
    `Could not find a raw token or OPENROUTER_API_KEY-style entry in ${envFilePath}.`,
  );
}

async function loadBenchmarkCatalog(catalogPath) {
  const raw = await fs.readFile(catalogPath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed?.cases) || parsed.cases.length === 0) {
    throw new Error(`Benchmark catalog has no cases: ${catalogPath}`);
  }

  return parsed;
}

function pickBenchmarkCase(catalog, explicitCaseId) {
  const caseId = explicitCaseId || catalog.defaultReplayCaseId;
  if (!caseId) {
    throw new Error('Benchmark catalog is missing defaultReplayCaseId.');
  }

  const selectedCase = catalog.cases.find(entry => entry.id === caseId);
  if (!selectedCase) {
    throw new Error(`Unknown benchmark case: ${caseId}`);
  }

  const selectedSuite =
    catalog.suites?.find(entry => entry.id === selectedCase.suiteId) ?? null;

  return {
    selectedCase,
    selectedSuite,
  };
}

function listBenchmarkCases(catalog) {
  const lines = [];
  lines.push(
    `Default case: ${catalog.defaultReplayCaseId ?? '<none>'}`,
  );
  lines.push('Starter pack:');
  for (const entry of catalog.cases) {
    lines.push(
      `- ${entry.id} [${entry.priority}] ${entry.taskSummary}`,
    );
  }
  return lines.join('\n');
}

function buildReplayMessages({selectedCase, selectedSuite}) {
  const suiteLabel = selectedSuite?.name ?? selectedCase.suiteId;
  const datasetLabel = selectedSuite?.dataset ?? 'unknown';
  return [
    {
      role: 'system',
      content:
        '你是本地 coding agent 的模型层。请只输出收到任务后的首轮 assistant 回复，不要使用 markdown，不要编造已经执行过的命令或修改。',
    },
    {
      role: 'user',
      content: [
        '场景：OPApp 本地开发环境正在刷新一份 Agent Loop 回放样例。',
        `基准来源：${suiteLabel} / ${datasetLabel} / ${selectedCase.taskId}`,
        `任务摘要：${selectedCase.promptSeed}`,
        '要求：',
        '1. 用简体中文。',
        '2. 输出 2 到 4 句，像 agent 刚收到任务时的首轮回复。',
        '3. 先确认你理解的问题，再说明你会先检查什么。',
        '4. 不要直接给最终答案，也不要声称已经完成任何操作。',
        '5. 控制在 120 字以内。',
      ].join('\n'),
    },
  ];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function requestReplayPayload({apiKey, model, benchmarkCase}) {
  const requestBody = {
    model,
    temperature: 0,
    max_tokens: defaultMaxTokens,
    messages: buildReplayMessages(benchmarkCase),
  };

  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await fetch(`${defaultBaseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
        'x-title': 'OPApp Replay Fixture Generator',
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(30_000),
    });

    const payload = await response.json().catch(async () => ({
      error: {
        message: await response.text(),
      },
    }));

    if (response.ok) {
      return {
        requestBody,
        responsePayload: payload,
      };
    }

    const rawMessage =
      payload?.error?.metadata?.raw ||
      payload?.error?.message ||
      `OpenRouter request failed with status ${response.status}.`;
    const retryable = response.status === 429 && attempt < maxAttempts;
    if (!retryable) {
      throw new Error(rawMessage);
    }

    await sleep(attempt * 2_000);
  }

  throw new Error('OpenRouter request failed after retries.');
}

function readTrimmedString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function buildReplayFixture({
  benchmarkCase,
  envFilePath,
  requestBody,
  responsePayload,
}) {
  const firstChoice = Array.isArray(responsePayload?.choices)
    ? responsePayload.choices[0]
    : null;
  const message = firstChoice?.message ?? null;
  const assistantText = readTrimmedString(message?.content);
  const reasoning = readTrimmedString(message?.reasoning);

  return {
    schemaVersion: 1,
    purpose: 'agent-loop-model-replay',
    generatedAt: new Date().toISOString(),
    notes: [
      'Dev-only replay sample. Smoke stays offline and keyless.',
      'This file intentionally stores a lightweight provider request/response package.',
      'Replay payload shape is still provisional and may change after contract discussion.',
      'Prompt seed comes from a checked-in benchmark starter pack instead of an ad-hoc toy task.',
    ],
    benchmark: {
      caseId: benchmarkCase.selectedCase.id,
      suiteId: benchmarkCase.selectedCase.suiteId,
      suiteName: benchmarkCase.selectedSuite?.name ?? benchmarkCase.selectedCase.suiteId,
      dataset: benchmarkCase.selectedSuite?.dataset ?? null,
      priority: benchmarkCase.selectedCase.priority,
      taskId: benchmarkCase.selectedCase.taskId,
      difficulty: benchmarkCase.selectedCase.difficulty,
      category: benchmarkCase.selectedCase.category,
      sourceUrl: benchmarkCase.selectedCase.sourceUrl,
      sourceVerifiedOn: benchmarkCase.selectedCase.sourceVerifiedOn,
      taskSummary: benchmarkCase.selectedCase.taskSummary,
      promptSeed: benchmarkCase.selectedCase.promptSeed,
      selectionRationale: benchmarkCase.selectedCase.selectionRationale,
      expectedSignals: benchmarkCase.selectedCase.expectedSignals,
    },
    source: {
      provider: 'OpenRouter',
      baseUrl: defaultBaseUrl,
      envFile: toPosixRelative(repoRoot, envFilePath),
      requestedModel: requestBody.model,
      resolvedModel:
        readTrimmedString(responsePayload?.model) ?? requestBody.model,
      upstreamProvider: readTrimmedString(responsePayload?.provider),
    },
    request: requestBody,
    response: responsePayload,
    extracted: {
      finishReason: readTrimmedString(firstChoice?.finish_reason),
      assistantText,
      reasoning,
    },
  };
}

async function writeFixtureFile(filePath, contents) {
  await fs.mkdir(path.dirname(filePath), {recursive: true});
  await fs.writeFile(filePath, contents, 'utf8');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const benchmarkCatalog = await loadBenchmarkCatalog(
    options.benchmarkCatalogPath,
  );
  if (options.listCases) {
    console.log(listBenchmarkCases(benchmarkCatalog));
    return;
  }

  const benchmarkCase = pickBenchmarkCase(benchmarkCatalog, options.caseId);
  const apiKey = await loadOpenRouterKey(options.envFile);
  const {requestBody, responsePayload} = await requestReplayPayload({
    apiKey,
    model: options.model,
    benchmarkCase,
  });
  const fixture = buildReplayFixture({
    benchmarkCase,
    envFilePath: options.envFile,
    requestBody,
    responsePayload,
  });

  await writeFixtureFile(
    options.outputPath,
    `${JSON.stringify(fixture, null, 2)}\n`,
  );

  console.log(
    `Generated replay fixture with ${fixture.source.resolvedModel}.`,
  );
  console.log(`CASE: ${fixture.benchmark.caseId}`);
  console.log(`JSON: ${toPosixRelative(repoRoot, options.outputPath)}`);
  if (fixture.extracted.assistantText) {
    console.log(`ASSISTANT: ${fixture.extracted.assistantText}`);
  } else {
    console.log('ASSISTANT: <empty>');
  }
}

main().catch(error => {
  console.error(
    `[agent-loop-sample] ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
