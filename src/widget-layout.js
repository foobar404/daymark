// Placement coordinates and dimensions are counts of responsive square grid units.
export const WIDGET_GRID_COLUMNS = 12;
export const MAX_WIDGET_ROW = 10000;
export const MAX_WIDGET_HEIGHT = 24;

export const WIDGET_DEFAULT_SIZES = {
  search: { width: 12, height: 2 },
  news: { width: 7, height: 4 },
  clock: { width: 6, height: 4 },
  weather: { width: 5, height: 4 },
  links: { width: 6, height: 3 },
  notes: { width: 7, height: 4 },
  tasks: { width: 7, height: 3 },
  calculator: { width: 5, height: 5 },
  calendar: { width: 7, height: 5 },
};

export const WIDGET_MIN_SIZES = {
  search: { width: 5, height: 2 },
  news: { width: 4, height: 2 },
  clock: { width: 4, height: 2 },
  weather: { width: 4, height: 2 },
  links: { width: 3, height: 2 },
  notes: { width: 3, height: 2 },
  tasks: { width: 3, height: 2 },
  calculator: { width: 4, height: 2 },
  calendar: { width: 4, height: 2 },
};

const widgetResizeCorners = new Set(['top-left', 'top-right', 'bottom-left', 'bottom-right']);

export function resizeWidgetPlacement(placement, widgetId, widthChange, heightChange, corner) {
  const minimum = WIDGET_MIN_SIZES[widgetId];
  if (!minimum) throw new RangeError(`Unknown widget "${widgetId}".`);
  if (!widgetResizeCorners.has(corner)) throw new RangeError(`Unknown widget resize corner "${corner}".`);

  const growsFromLeft = corner.endsWith('left');
  const growsFromTop = corner.startsWith('top');
  const maxWidth = growsFromLeft
    ? placement.column + placement.width - 1
    : WIDGET_GRID_COLUMNS - placement.column + 1;
  const maxHeight = growsFromTop
    ? Math.min(MAX_WIDGET_HEIGHT, placement.row + placement.height - 1)
    : MAX_WIDGET_HEIGHT;
  const width = Math.min(maxWidth, Math.max(minimum.width, placement.width + widthChange));
  const height = Math.min(maxHeight, Math.max(minimum.height, placement.height + heightChange));

  return {
    ...placement,
    column: growsFromLeft ? placement.column + placement.width - width : placement.column,
    row: growsFromTop ? placement.row + placement.height - height : placement.row,
    width,
    height,
  };
}

function clampInteger(value, fallback, minimum, maximum) {
  return Number.isInteger(value)
    ? Math.min(Math.max(value, minimum), maximum)
    : fallback;
}

function rectanglesOverlap(first, second) {
  return first.column < second.column + second.width
    && second.column < first.column + first.width
    && first.row < second.row + second.height
    && second.row < first.row + first.height;
}

function isPositionAvailable(candidate, placements) {
  return Object.values(placements).every((placement) => !rectanglesOverlap(candidate, placement));
}

function findNearestAvailablePosition(size, desired, placements) {
  const maxColumn = WIDGET_GRID_COLUMNS - size.width + 1;

  for (let distance = 0; distance <= MAX_WIDGET_ROW; distance += 1) {
    for (let columnOffset = -(maxColumn - 1); columnOffset <= maxColumn - 1; columnOffset += 1) {
      const rowDistance = distance - Math.abs(columnOffset);
      if (rowDistance < 0) continue;

      const rowOffsets = rowDistance === 0 ? [0] : [-rowDistance, rowDistance];
      for (const rowOffset of rowOffsets) {
        const candidate = {
          ...size,
          column: desired.column + columnOffset,
          row: desired.row + rowOffset,
        };
        if (
          candidate.column >= 1
          && candidate.column <= maxColumn
          && candidate.row >= 1
          && candidate.row <= MAX_WIDGET_ROW
          && isPositionAvailable(candidate, placements)
        ) {
          return { column: candidate.column, row: candidate.row };
        }
      }
    }
  }

  return null;
}

function findFirstAvailablePosition(size, placements) {
  const maxColumn = WIDGET_GRID_COLUMNS - size.width + 1;
  for (let row = 1; row <= MAX_WIDGET_ROW; row += 1) {
    for (let column = 1; column <= maxColumn; column += 1) {
      const candidate = { column, row, ...size };
      if (isPositionAvailable(candidate, placements)) return { column, row };
    }
  }
  return null;
}

export function createDefaultWidgetPlacements(order) {
  const placements = {};
  order.forEach((id) => {
    const size = WIDGET_DEFAULT_SIZES[id];
    if (!size) return;
    const position = findFirstAvailablePosition(size, placements);
    if (!position) throw new RangeError(`No available grid position for widget "${id}".`);
    placements[id] = { ...position, ...size };
  });
  return placements;
}

export function reflowWidgetPlacements(placements, order, pinnedWidgetId = null) {
  const widgetIds = order.filter((id) => placements[id] && WIDGET_DEFAULT_SIZES[id]);
  const orderIndex = new Map(widgetIds.map((id, index) => [id, index]));
  const placementOrder = [...widgetIds].sort((first, second) => (
    placements[first].row - placements[second].row
      || placements[first].column - placements[second].column
      || orderIndex.get(first) - orderIndex.get(second)
  ));
  const arranged = {};

  if (pinnedWidgetId && widgetIds.includes(pinnedWidgetId)) {
    arranged[pinnedWidgetId] = { ...placements[pinnedWidgetId] };
  }

  placementOrder.forEach((id) => {
    if (id === pinnedWidgetId) return;
    const placement = placements[id];
    const position = findNearestAvailablePosition(placement, placement, arranged);
    if (!position) throw new RangeError(`No available grid position for widget "${id}".`);
    arranged[id] = { ...placement, ...position };
  });

  return arranged;
}

export function normalizeWidgetPlacements(value, order) {
  const defaults = createDefaultWidgetPlacements(order);
  const placements = {};
  order.forEach((id) => {
    const size = WIDGET_DEFAULT_SIZES[id];
    const minimum = WIDGET_MIN_SIZES[id];
    if (!size || !minimum) return;
    const saved = value?.[id];
    const width = clampInteger(saved?.width, size.width, minimum.width, WIDGET_GRID_COLUMNS);
    const height = clampInteger(saved?.height, size.height, minimum.height, MAX_WIDGET_HEIGHT);
    const maxColumn = WIDGET_GRID_COLUMNS - width + 1;
    const column = clampInteger(saved?.column, Math.min(defaults[id].column, maxColumn), 1, maxColumn);
    const row = clampInteger(saved?.row, defaults[id].row, 1, MAX_WIDGET_ROW);
    placements[id] = { column, row, width, height };
  });

  return reflowWidgetPlacements(placements, order);
}
