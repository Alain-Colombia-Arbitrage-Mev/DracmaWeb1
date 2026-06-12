import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

const uiFiles = [
  'src/components/astro/Ecosystem.astro',
  'src/components/astro/Crowdfunding.astro',
  'src/components/astro/Roadmap.astro',
  'src/components/react/Presale.tsx',
  'src/styles/global.css',
];

const forbiddenPatterns = [
  /<AiButton\b/,
  /btn-ai-feature/,
  /btnAnalyzeInvestment/,
  /btnExplainCrowdfundingAI/,
  /btnRoadmapOutlook/,
  /handleAnalyzeInvestment/,
];

test('public UI does not render AI explain or investment analysis CTAs', () => {
  assert.equal(
    existsSync(resolve(root, 'src/components/react/AiButton.tsx')),
    false,
    'generic AI button component should not exist',
  );

  for (const file of uiFiles) {
    const source = readFileSync(resolve(root, file), 'utf8');
    for (const pattern of forbiddenPatterns) {
      assert.doesNotMatch(source, pattern, `${file} still contains ${pattern}`);
    }
  }
});
