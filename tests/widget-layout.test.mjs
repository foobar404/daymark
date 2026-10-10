import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_SETTINGS, DEFAULT_WIDGET_ORDER, readSettings } from '../src/storage.js';
import {
  createDefaultWidgetPlacements,
  normalizeWidgetPlacements,
  reflowWidgetPlacements,
  resizeWidgetPlacement,
  WIDGET_DEFAULT_SIZES,
} from '../src/widget-layout.js';

function assertNoOverlaps(placements) {
  const entries = Object.entries(placements);
  for (let firstIndex = 0; firstIndex < entries.length; firstIndex += 1) {
    const [, first] = entries[firstIndex];
    for (let secondIndex = firstIndex + 1; secondIndex < entries.length; secondIndex += 1) {
      const [, second] = entries[secondIndex];
      const overlaps = first.column < second.column + second.width
        && second.column < first.column + first.width
        && first.row < second.row + second.height
        && second.row < first.row + first.height;
      assert.equal(overlaps, false);
    }
  }
}

test('default placements use unit dimensions without overlaps', () => {
  const order = Object.keys(WIDGET_DEFAULT_SIZES);
  const placements = createDefaultWidgetPlacements(order);

  assert.deepEqual(Object.keys(placements), order);
  order.forEach((id) => {
    assert.deepEqual(
      { width: placements[id].width, height: placements[id].height },
      WIDGET_DEFAULT_SIZES[id],
    );
  });
  assertNoOverlaps(placements);
});

test('legacy position-only layouts gain sizes and reflow collisions', () => {
  const order = ['search', 'news', 'clock'];
  const placements = normalizeWidgetPlacements({
    search: { column: 1, row: 1 },
    news: { column: 1, row: 1 },
    clock: { column: 1, row: 1 },
    launchpad: { column: 1, row: 1 },
  }, order);

  assert.equal(placements.search.width, WIDGET_DEFAULT_SIZES.search.width);
  assert.equal(placements.news.height, WIDGET_DEFAULT_SIZES.news.height);
  assert.equal(Object.hasOwn(placements, 'launchpad'), false);
  assertNoOverlaps(placements);
});

test('saved settings migrate from global density to collision-free unit layouts', () => {
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const savedSettings = structuredClone(DEFAULT_SETTINGS);
  savedSettings.widgetSize = 'tiny';
  savedSettings.launchpad = [{ title: 'Old shortcut', url: 'https://example.com/' }];
  savedSettings.screens[0].placements = Object.fromEntries(
    DEFAULT_WIDGET_ORDER.map((id) => [id, { column: 1, row: 1 }]),
  );
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: () => JSON.stringify(savedSettings) },
  });

  try {
    const migrated = readSettings();
    assert.equal(Object.hasOwn(migrated, 'widgetSize'), false);
    assert.equal(Object.hasOwn(migrated, 'launchpad'), false);
    assertNoOverlaps(migrated.screens[0].placements);
  } finally {
    if (previousStorage) {
      Object.defineProperty(globalThis, 'localStorage', previousStorage);
    } else {
      delete globalThis.localStorage;
    }
  }
});

test('dragging pins the active widget and pushes intersecting widgets aside', () => {
  const order = ['search', 'news', 'clock'];
  const placements = {
    search: { column: 1, row: 1, width: 4, height: 2 },
    news: { column: 5, row: 1, width: 4, height: 2 },
    clock: { column: 9, row: 1, width: 4, height: 2 },
  };
  const requested = {
    ...placements,
    search: { ...placements.search, column: 3 },
  };
  const reflowed = reflowWidgetPlacements(requested, order, 'search');

  assert.deepEqual(reflowed.search, requested.search);
  assert.notDeepEqual(reflowed.news, placements.news);
  assertNoOverlaps(reflowed);
});

test('resizing a pinned widget reflows its neighbors in unit dimensions', () => {
  const order = ['search', 'news', 'clock'];
  const placements = {
    search: { column: 1, row: 1, width: 4, height: 2 },
    news: { column: 5, row: 1, width: 4, height: 2 },
    clock: { column: 9, row: 1, width: 4, height: 2 },
  };
  const requested = {
    ...placements,
    search: { ...placements.search, width: 8, height: 3 },
  };
  const reflowed = reflowWidgetPlacements(requested, order, 'search');

  assert.deepEqual(reflowed.search, requested.search);
  assert.notDeepEqual(reflowed.news, placements.news);
  assertNoOverlaps(reflowed);
});

test('resizing from each corner keeps the opposite corner anchored', () => {
  const placement = { column: 4, row: 5, width: 4, height: 3 };
  const expected = {
    'top-left': { column: 3, row: 4, width: 5, height: 4 },
    'top-right': { column: 4, row: 4, width: 5, height: 4 },
    'bottom-left': { column: 3, row: 5, width: 5, height: 4 },
    'bottom-right': { column: 4, row: 5, width: 5, height: 4 },
  };

  Object.entries(expected).forEach(([corner, resized]) => {
    assert.deepEqual(resizeWidgetPlacement(placement, 'news', 1, 1, corner), resized);
  });
});

test('corner resizing respects minimum sizes and grid boundaries', () => {
  assert.deepEqual(
    resizeWidgetPlacement(
      { column: 4, row: 5, width: 4, height: 3 },
      'news',
      -20,
      -20,
      'top-left',
    ),
    { column: 4, row: 6, width: 4, height: 2 },
  );
  assert.deepEqual(
    resizeWidgetPlacement(
      { column: 8, row: 3, width: 5, height: 4 },
      'weather',
      20,
      20,
      'top-left',
    ),
    { column: 1, row: 1, width: 12, height: 6 },
  );
});
