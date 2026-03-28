import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

export function run() {
  const repoRoot = path.resolve(process.cwd());
  const codexDir = path.join(repoRoot, '.codex');
  const thirdPartyNoticesPath = path.join(repoRoot, 'THIRD_PARTY_NOTICES.md');
  const githubSkillsShimPath = path.join(repoRoot, '.github', 'skills');
  const gitignoreSource = fs.readFileSync(path.join(repoRoot, '.gitignore'), 'utf8');
  const readmeSource = fs.readFileSync(path.join(repoRoot, 'README.md'), 'utf8');

  assert.equal(
    fs.existsSync(codexDir),
    false,
    'public repo must not keep a tracked .codex design-skill snapshot.',
  );
  assert.equal(
    fs.existsSync(thirdPartyNoticesPath),
    false,
    'public repo must not keep a third-party notice file that only existed for the removed design-skill snapshot.',
  );
  assert.equal(
    fs.existsSync(githubSkillsShimPath),
    false,
    'public repo must not keep a tracked .github/skills shim that points back to local design-skill assets.',
  );
  assert.equal(
    gitignoreSource.includes('.codex/'),
    true,
    '.gitignore must ignore .codex so local design-helper snapshots stay out of the public repo.',
  );
  assert.equal(
    gitignoreSource.includes('.github/skills'),
    true,
    '.gitignore must ignore .github/skills so local skill shims stay out of the public repo.',
  );
  for (const marker of ['./.codex/README.md', './THIRD_PARTY_NOTICES.md', 'AI design skill snapshot']) {
    assert.equal(
      readmeSource.includes(marker),
      false,
      `README.md must not keep legacy local-design-helper reference ${marker}.`,
    );
  }
}
