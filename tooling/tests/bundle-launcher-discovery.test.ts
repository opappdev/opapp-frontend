import assert from 'node:assert/strict';
import {
  buildBundleLauncherDiscoveryEntries,
  parseRemoteBundleCatalogIndex,
  resolveRemoteBundleLocalState,
} from '../../apps/companion-app/src/bundle-launcher-discovery';
import {companionBundleIds} from '../../apps/companion-app/src/companion-runtime';

export function run() {
  const entries = parseRemoteBundleCatalogIndex({
    bundles: {
      'opapp.companion.main': {
        latestVersion: '0.1.2',
        versions: ['0.1.0', '0.1.2'],
        channels: {
          stable: '0.1.2',
          nightly: '0.1.3',
        },
        rolloutPercent: 100,
      },
      'opapp.hbr.workspace': {
        versions: ['0.1.1', '0.1.2'],
        channels: {
          nightly: '0.1.2',
          broken: 42,
        },
        rolloutPercent: 25,
      },
      '': {
        latestVersion: '0.0.1',
      },
      invalid: 'nope',
    },
  });

  assert.deepEqual(entries, [
    {
      bundleId: 'invalid',
      latestVersion: null,
      versions: [],
      rolloutPercent: null,
      channels: null,
    },
    {
      bundleId: 'opapp.companion.main',
      latestVersion: '0.1.2',
      versions: ['0.1.0', '0.1.2'],
      rolloutPercent: null,
      channels: {
        stable: '0.1.2',
      },
    },
    {
      bundleId: 'opapp.hbr.workspace',
      latestVersion: '0.1.2',
      versions: ['0.1.1', '0.1.2'],
      rolloutPercent: 25,
      channels: {
        nightly: '0.1.2',
      },
    },
  ]);

  assert.equal(
    resolveRemoteBundleLocalState(companionBundleIds.main, false),
    'bundled',
  );
  assert.equal(
    resolveRemoteBundleLocalState('opapp.hbr.workspace', true),
    'staged',
  );
  assert.equal(
    resolveRemoteBundleLocalState('opapp.hbr.workspace', false),
    'remote-only',
  );

  assert.deepEqual(
    buildBundleLauncherDiscoveryEntries({
      remoteEntries: entries,
      stagedBundles: [
        {
          bundleId: 'opapp.hbr.workspace',
          version: '0.1.1',
          sourceKind: 'sibling-staging',
        },
        {
          bundleId: 'opapp.private.shadow',
          version: null,
          sourceKind: 'local-build',
        },
        {
          bundleId: '',
          version: '0.0.1',
          sourceKind: 'ignored',
        },
      ],
    }),
    [
      {
        bundleId: 'invalid',
        latestVersion: null,
        versions: [],
        rolloutPercent: null,
        channels: null,
        localVersion: null,
        localSourceKind: null,
        localState: 'remote-only',
        discoverySource: 'remote-catalog',
      },
      {
        bundleId: 'opapp.companion.main',
        latestVersion: '0.1.2',
        versions: ['0.1.0', '0.1.2'],
        rolloutPercent: null,
        channels: {
          stable: '0.1.2',
        },
        localVersion: null,
        localSourceKind: null,
        localState: 'bundled',
        discoverySource: 'remote-catalog',
      },
      {
        bundleId: 'opapp.hbr.workspace',
        latestVersion: '0.1.2',
        versions: ['0.1.1', '0.1.2'],
        rolloutPercent: 25,
        channels: {
          nightly: '0.1.2',
        },
        localVersion: '0.1.1',
        localSourceKind: 'sibling-staging',
        localState: 'staged',
        discoverySource: 'remote-catalog',
      },
      {
        bundleId: 'opapp.private.shadow',
        latestVersion: null,
        versions: [],
        rolloutPercent: null,
        channels: null,
        localVersion: null,
        localSourceKind: 'local-build',
        localState: 'staged',
        discoverySource: 'local-only',
      },
    ],
  );
}
