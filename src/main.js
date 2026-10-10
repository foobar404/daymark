import './components/clock-widget.js';
import './components/search-widget.js';
import './components/news-feed-widget.js';
import './components/links-widget.js';
import './components/notes-widget.js';
import './components/weather-widget.js';
import './components/task-list-widget.js';
import './components/calculator-widget.js';
import './components/calendar-widget.js';
import { WIDGET_ICONS } from './components/widget-element.js';
import {
  createDefaultWidgetPlacements,
  DEFAULT_WIDGET_ORDER,
  readSettings,
  writeSettings,
} from './storage.js';
import {
  MAX_WIDGET_HEIGHT,
  MAX_WIDGET_ROW,
  reflowWidgetPlacements,
  resizeWidgetPlacement,
  WIDGET_GRID_COLUMNS,
} from './widget-layout.js';
import { THEMES } from './themes.js';
import { BACKGROUND_IMAGES, isCommonsBackgroundUrl } from './background-images.js';

const grid = document.querySelector('.widget-grid');
const widgetNav = document.querySelector('#widget-nav');
const screenNav = document.querySelector('#screen-nav');
const screenNavStatus = document.querySelector('#screen-nav-status');
const settingsDialog = document.querySelector('#settings-dialog');
const themeColorMeta = document.querySelector('meta[name="theme-color"]');
const widgetSelector = 'clock-widget, search-widget, news-feed-widget, weather-widget, links-widget, notes-widget, task-list-widget, calculator-widget, calendar-widget';
const widgetInteractiveSelector = 'a, button, input, select, textarea, label, summary, iframe, audio, video, [contenteditable]:not([contenteditable="false"]), [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="switch"], [role="slider"], [tabindex]:not([tabindex="-1"]):not([data-drag-keyboard])';
const settings = readSettings();
let widgetInteraction = null;
let widgetGridCellSize = 24;
let gridLayoutRefreshScheduled = false;
const reflowAnimations = new WeakMap();
const widgetOptions = [
  { id: 'search', title: 'Search' },
  { id: 'news', title: 'News' },
  { id: 'clock', title: 'Clock' },
  { id: 'weather', title: 'Weather' },
  { id: 'links', title: 'Shortcuts' },
  { id: 'notes', title: 'Notes' },
  { id: 'tasks', title: 'To-do list' },
  { id: 'calculator', title: 'Calculator' },
  { id: 'calendar', title: 'Calendar' },
];

const themeOptions = document.querySelector('.theme-options');
const photoOptions = document.querySelector('.photo-options');
const dailyPhotoSettings = document.querySelector('.daily-photo-settings');
const photoSearchForm = document.querySelector('.photo-search');
const photoSearchInput = document.querySelector('#photo-search-query');
const photoGalleryStatus = document.querySelector('.photo-gallery__status');
const photoGalleryResults = document.querySelector('.photo-gallery__results');
const photoGalleryMore = document.querySelector('.photo-gallery__more');
const dailyPhotoEnabled = document.querySelector('#daily-photo-enabled');
const dailyPhotoForm = document.querySelector('.daily-photo-search');
const dailyPhotoQuery = document.querySelector('#daily-photo-query');
const dailyPhotoStatus = document.querySelector('.daily-photo-status');
const themeColors = new Map();
let photoGalleryOffset = 0;
let photoGalleryTerm = '';
let dailyPhotoRequestId = 0;

THEMES.forEach((theme) => {
  const label = document.createElement('label');
  label.className = 'theme-option';
  const input = document.createElement('input');
  input.type = 'radio';
  input.name = 'theme';
  input.value = theme.id;
  const swatch = document.createElement('span');
  swatch.className = 'theme-option__swatch';
  swatch.setAttribute('aria-hidden', 'true');
  swatch.style.background = `linear-gradient(135deg, ${theme.paper} 50%, ${theme.accent} 50%)`;
  const name = document.createElement('span');
  name.textContent = theme.name;
  label.append(input, swatch, name);
  themeOptions.append(label);
  themeColors.set(theme.id, theme.paper);
});

function selectBackgroundImage(image) {
  const current = readSettings();
  current.backgroundMode = 'photo';
  current.backgroundImage = image.id ?? image.url;
  current.backgroundImageTitle = image.name;
  current.backgroundImageCredit = image.creditUrl ?? '';
  current.dailyBackgroundEnabled = false;
  dailyPhotoRequestId += 1;
  writeSettings(current);
  applyBackground(current);
  syncBackgroundOptions(current);
  syncDailyPhotoOptions(current);
  dailyPhotoStatus.textContent = 'Daily photo changes are off.';
}

function createPhotoOption(container, image) {
  const button = document.createElement('button');
  button.className = 'photo-option';
  button.type = 'button';
  button.dataset.backgroundImage = image.id ?? image.url;
  button.setAttribute('aria-label', image.name);
  button.title = image.name;
  const preview = document.createElement('img');
  preview.src = image.thumbnail;
  preview.alt = '';
  preview.loading = 'lazy';
  const name = document.createElement('span');
  name.textContent = image.name;
  button.append(preview, name);
  button.addEventListener('click', () => selectBackgroundImage(image));
  container.append(button);
}

async function searchCommonsPhotos(append = false) {
  const term = append ? photoGalleryTerm : photoSearchInput.value.trim();
  if (!term) {
    photoGalleryStatus.textContent = 'Enter a subject to search.';
    return;
  }
  if (!append) {
    photoGalleryTerm = term;
    photoGalleryOffset = 0;
    photoGalleryResults.replaceChildren();
  }

  const searchButton = photoSearchForm.querySelector('button[type="submit"]');
  searchButton.disabled = true;
  if (append) photoGalleryMore.disabled = true;
  else photoGalleryMore.hidden = true;
  photoGalleryStatus.textContent = 'Searching Wikimedia Commons...';

  try {
    const { images, nextOffset } = await queryCommonsPhotos(term, {
      limit: 18,
      offset: append ? photoGalleryOffset : undefined,
    });
    images.forEach((image) => {
      const result = document.createElement('div');
      result.className = 'photo-gallery__result';
      createPhotoOption(result, image);
      const credit = document.createElement('a');
      credit.className = 'photo-gallery__source';
      credit.href = image.creditUrl;
      credit.target = '_blank';
      credit.rel = 'noopener noreferrer';
      credit.textContent = 'Source and license';
      result.append(credit);
      photoGalleryResults.append(result);
    });
    photoGalleryOffset = nextOffset;
    photoGalleryMore.hidden = !photoGalleryOffset;
    photoGalleryStatus.textContent = images.length
      ? `${photoGalleryResults.children.length} photos found for “${photoGalleryTerm}”.`
      : append ? 'No more photos found.' : 'No photos found. Try another search.';
    syncBackgroundOptions(readSettings());
    if (append) photoOptions.scrollTop = photoOptions.scrollHeight;
  } catch (error) {
    photoGalleryStatus.textContent = error.message || 'Could not search Wikimedia Commons.';
  } finally {
    searchButton.disabled = false;
    photoGalleryMore.disabled = false;
  }
}

async function queryCommonsPhotos(term, { limit = 18, offset } = {}) {
  const apiUrl = new URL('https://commons.wikimedia.org/w/api.php');
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: `${term} filetype:bitmap`,
    gsrnamespace: '6',
    gsrlimit: String(limit),
    ...(offset === undefined ? {} : { gsroffset: String(offset) }),
    prop: 'imageinfo',
    iiprop: 'url|mime',
    iiurlwidth: '960',
    format: 'json',
    origin: '*',
  });
  apiUrl.search = params;
  const response = await fetch(apiUrl);
  if (!response.ok) throw new Error('Wikimedia Commons is unavailable right now.');
  const data = await response.json();
  const pages = Object.values(data.query?.pages ?? {}).sort((first, second) => first.index - second.index);
  const images = pages.flatMap((page) => {
    const info = page.imageinfo?.[0];
    if (!info?.url || !info.thumburl || !['image/jpeg', 'image/png', 'image/webp'].includes(info.mime)) return [];
    return [{
      name: page.title.replace(/^File:/, '').replaceAll('_', ' '),
      url: info.url,
      thumbnail: info.thumburl,
      creditUrl: info.descriptionurl,
    }];
  });
  return { images, nextOffset: data.continue?.gsroffset ?? 0 };
}

function syncDailyPhotoOptions(current) {
  dailyPhotoEnabled.checked = current.dailyBackgroundEnabled;
  dailyPhotoQuery.value = current.dailyBackgroundSearchTerm;
  dailyPhotoForm.hidden = !current.dailyBackgroundEnabled;
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dailyPhotoIndex(term, date, imageCount) {
  const [year, month, day] = date.split('-').map(Number);
  const dayNumber = Math.floor(Date.UTC(year, month - 1, day) / 86400000);
  let termHash = 0;
  for (const character of term) termHash = (termHash * 31 + character.charCodeAt(0)) >>> 0;
  return (dayNumber + termHash) % imageCount;
}

async function updateDailyBackgroundPhoto(force = false) {
  const current = readSettings();
  const today = localDateKey();
  if (!current.dailyBackgroundEnabled || current.backgroundMode !== 'photo'
    || (!force && current.dailyBackgroundDate === today)) return;

  const requestId = ++dailyPhotoRequestId;
  dailyPhotoStatus.textContent = `Finding today's photo for “${current.dailyBackgroundSearchTerm}”…`;
  try {
    const { images } = await queryCommonsPhotos(current.dailyBackgroundSearchTerm, { limit: 50 });
    const latest = readSettings();
    if (requestId !== dailyPhotoRequestId || !latest.dailyBackgroundEnabled
      || latest.backgroundMode !== 'photo'
      || latest.dailyBackgroundSearchTerm !== current.dailyBackgroundSearchTerm) return;
    if (!images.length) throw new Error(`No photos found for “${current.dailyBackgroundSearchTerm}”.`);

    const image = images[dailyPhotoIndex(current.dailyBackgroundSearchTerm, today, images.length)];
    latest.backgroundImage = image.url;
    latest.backgroundImageTitle = image.name;
    latest.backgroundImageCredit = image.creditUrl ?? '';
    latest.dailyBackgroundDate = today;
    if (!writeSettings(latest)) throw new Error('Could not save today’s photo.');
    applyBackground(latest);
    syncBackgroundOptions(latest);
    dailyPhotoStatus.textContent = `Today's photo: ${image.name}.`;
  } catch (error) {
    if (requestId === dailyPhotoRequestId) {
      dailyPhotoStatus.textContent = `${error.message || 'Could not update the daily photo.'} The current background was kept.`;
    }
  }
}

photoSearchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  searchCommonsPhotos();
});
photoGalleryMore.addEventListener('click', () => searchCommonsPhotos(true));
dailyPhotoEnabled.addEventListener('change', () => {
  const current = readSettings();
  if (dailyPhotoEnabled.checked && !current.dailyBackgroundSearchTerm) {
    dailyPhotoStatus.textContent = 'Enter a search term before turning on daily photos.';
    syncDailyPhotoOptions(current);
    return;
  }
  current.dailyBackgroundEnabled = dailyPhotoEnabled.checked;
  if (current.dailyBackgroundEnabled) current.backgroundMode = 'photo';
  if (!writeSettings(current)) {
    dailyPhotoStatus.textContent = 'Could not save the daily photo setting.';
    syncDailyPhotoOptions(readSettings());
    return;
  }
  applyBackground(current);
  syncBackgroundOptions(current);
  syncDailyPhotoOptions(current);
  if (current.dailyBackgroundEnabled) {
    updateDailyBackgroundPhoto(true);
  } else {
    dailyPhotoRequestId += 1;
    dailyPhotoStatus.textContent = 'Daily photo changes are off.';
  }
});
dailyPhotoForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const term = dailyPhotoQuery.value.trim().slice(0, 100);
  if (!term) {
    dailyPhotoStatus.textContent = 'Enter a search term for the daily photo.';
    return;
  }
  const current = readSettings();
  current.dailyBackgroundEnabled = true;
  current.dailyBackgroundSearchTerm = term;
  current.backgroundMode = 'photo';
  if (!writeSettings(current)) {
    dailyPhotoStatus.textContent = 'Could not save the daily photo search term.';
    return;
  }
  applyBackground(current);
  syncBackgroundOptions(current);
  syncDailyPhotoOptions(current);
  updateDailyBackgroundPhoto(true);
});

function applyTheme(theme) {
  const palette = THEMES.find((item) => item.id === theme);
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.themeMode = palette.mode;
  document.documentElement.style.setProperty('--paper', palette.paper);
  document.documentElement.style.setProperty('--accent', palette.accent);
  document.documentElement.style.setProperty('--accent-ink', palette.accentInk);
  document.documentElement.style.setProperty('--green', palette.green);
  document.documentElement.style.setProperty('--yellow', palette.yellow);
  themeColorMeta.content = themeColors.get(theme);
}

function applyBackground(current) {
  document.body.dataset.backgroundMode = current.backgroundMode;
  const image = BACKGROUND_IMAGES.find(({ id }) => id === current.backgroundImage);
  const imageUrl = image?.url ?? (isCommonsBackgroundUrl(current.backgroundImage) ? current.backgroundImage : null);
  if (current.backgroundMode === 'photo' && imageUrl) {
    document.body.style.setProperty('--selected-background-image', `url("${imageUrl}")`);
  } else {
    document.body.style.removeProperty('--selected-background-image');
  }
}

function applyContainerBackground(style) {
  document.documentElement.dataset.containerBackground = style;
}

function syncBackgroundOptions(current) {
  document.querySelector(`input[name="background-mode"][value="${current.backgroundMode}"]`).checked = true;
  dailyPhotoSettings.hidden = current.backgroundMode !== 'photo';
  photoOptions.hidden = current.backgroundMode !== 'photo';
  photoOptions.querySelectorAll('.photo-option').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.backgroundImage === current.backgroundImage));
  });
}

applyTheme(settings.theme);
applyBackground(settings);
applyContainerBackground(settings.containerBackground);
syncBackgroundOptions(settings);
syncDailyPhotoOptions(settings);
document.querySelector(`input[name="theme"][value="${settings.theme}"]`).checked = true;
document.querySelector(`input[name="container-background"][value="${settings.containerBackground}"]`).checked = true;
document.querySelector('#settings-open').addEventListener('click', () => settingsDialog.showModal());
document.querySelector('#settings-close').addEventListener('click', () => settingsDialog.close());
settingsDialog.addEventListener('click', (event) => {
  if (event.target !== settingsDialog) return;
  const bounds = settingsDialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
    settingsDialog.close();
  }
});
settingsDialog.addEventListener('change', (event) => {
  if (!['theme', 'background-mode', 'container-background'].includes(event.target.name)) return;
  const current = readSettings();
  if (event.target.name === 'theme') current.theme = event.target.value;
  if (event.target.name === 'background-mode') current.backgroundMode = event.target.value;
  if (event.target.name === 'container-background') current.containerBackground = event.target.value;
  writeSettings(current);
  if (event.target.name === 'theme') applyTheme(current.theme);
  if (event.target.name === 'container-background') applyContainerBackground(current.containerBackground);
  if (event.target.name === 'background-mode') {
    applyBackground(current);
    syncBackgroundOptions(current);
    if (current.backgroundMode === 'photo' && current.dailyBackgroundEnabled) updateDailyBackgroundPhoto();
    if (current.backgroundMode === 'photo' && !photoGalleryResults.childElementCount) searchCommonsPhotos();
  }
});

if (settings.backgroundMode === 'photo') searchCommonsPhotos();
if (settings.dailyBackgroundEnabled) {
  if (settings.backgroundMode === 'photo') {
    if (settings.dailyBackgroundDate === localDateKey()) {
      dailyPhotoStatus.textContent = `Today's photo: ${settings.backgroundImageTitle || 'Daily photo'}.`;
    } else {
      updateDailyBackgroundPhoto();
    }
  } else {
    dailyPhotoStatus.textContent = 'Daily photo is enabled, but background photos are off.';
  }
}

function applyOrder(order) {
  const widgets = new Map([...grid.children].map((widget) => [widget.id, widget]));
  order.forEach((id, index) => {
    const widget = widgets.get(id);
    if (widget && grid.children[index] !== widget) {
      grid.insertBefore(widget, grid.children[index] ?? null);
    }
  });
}

function getPlacementOrder(placements) {
  return [...grid.children]
    .map((widget) => widget.id)
    .sort((first, second) => {
      const firstPosition = placements[first] ?? { row: 1, column: 1 };
      const secondPosition = placements[second] ?? { row: 1, column: 1 };
      return firstPosition.row - secondPosition.row
        || firstPosition.column - secondPosition.column
        || first.localeCompare(second);
    });
}

function applyWidgetLayout(screen) {
  cancelReflowAnimations();
  syncGridCellSize();
  screen.order = getPlacementOrder(screen.placements);
  applyOrder(screen.order);
  applyWidgetGridPositions(screen.placements);
}

function applyWidgetGridPositions(placements) {
  [...grid.children].forEach((widget) => {
    const position = placements[widget.id];
    if (!position) return;
    widget.style.gridColumn = `${position.column} / span ${position.width}`;
    widget.style.gridRow = `${position.row} / span ${position.height}`;
  });
}

function cancelReflowAnimations() {
  [...grid.children].forEach((widget) => {
    const animation = reflowAnimations.get(widget);
    if (!animation) return;
    animation.cancel();
    reflowAnimations.delete(widget);
  });
}

function applyWidgetLayoutPreview(placements, activeWidget) {
  const widgets = [...grid.children];
  const previousBounds = new Map(widgets.map((widget) => [widget, widget.getBoundingClientRect()]));
  cancelReflowAnimations();
  applyOrder(getPlacementOrder(placements));
  applyWidgetGridPositions(placements);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  widgets.forEach((widget) => {
    if (widget === activeWidget || widget.hidden || typeof widget.animate !== 'function') return;
    const previous = previousBounds.get(widget);
    const next = widget.getBoundingClientRect();
    const deltaX = previous.left - next.left;
    const deltaY = previous.top - next.top;
    if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return;
    const animation = widget.animate([
      { transform: `translate(${deltaX}px, ${deltaY}px)` },
      { transform: 'translate(0, 0)' },
    ], { duration: 140, easing: 'ease-out' });
    reflowAnimations.set(widget, animation);
    animation.onfinish = () => {
      if (reflowAnimations.get(widget) === animation) reflowAnimations.delete(widget);
    };
  });
}

function persistWidgetPlacements(placements) {
  const current = readSettings();
  const screen = current.screens.find(({ id }) => id === current.activeScreenId);
  if (!screen) return false;
  screen.placements = placements;
  applyWidgetLayout(screen);
  current.order = screen.order;
  if (!writeSettings(current)) {
    showScreenStatus('Could not save this screen’s widget layout.');
    const saved = readSettings().screens.find(({ id }) => id === current.activeScreenId);
    if (saved) applyWidgetLayout(saved);
    return false;
  }
  showScreenStatus('');
  return true;
}

function refreshActiveWidgetLayout() {
  const current = readSettings();
  const screen = current.screens.find(({ id }) => id === current.activeScreenId);
  if (!screen) return;
  applyWidgetLayout(screen);
}

function scheduleWidgetLayoutRefresh() {
  if (gridLayoutRefreshScheduled) return;
  gridLayoutRefreshScheduled = true;
  window.requestAnimationFrame(() => {
    gridLayoutRefreshScheduled = false;
      if (!widgetInteraction) refreshActiveWidgetLayout();
  });
}

function applyVisibility(hiddenWidgets) {
  [...grid.children].forEach((widget) => {
    widget.hidden = hiddenWidgets.includes(widget.id);
  });
  widgetNav.querySelectorAll('[data-widget-toggle]').forEach((button) => {
    const visible = !hiddenWidgets.includes(button.dataset.widgetToggle);
    button.setAttribute('aria-pressed', String(visible));
    button.setAttribute('aria-label', `${visible ? 'Hide' : 'Show'} ${button.dataset.title} widget`);
    button.title = `${visible ? 'Hide' : 'Show'} ${button.dataset.title}`;
  });
}

function showScreenStatus(message) {
  screenNavStatus.textContent = message;
}

function applyScreen(current, screen) {
  const previousScreenId = current.activeScreenId;
  current.activeScreenId = screen.id;
  current.hiddenWidgets = [...screen.hiddenWidgets];
  applyVisibility(screen.hiddenWidgets);
  applyWidgetLayout(screen);
  current.order = [...screen.order];
  if (!writeSettings(current)) {
    showScreenStatus('Could not save the screen configuration.');
    const saved = readSettings();
    applyVisibility(saved.hiddenWidgets);
    const previousScreen = saved.screens.find(({ id }) => id === previousScreenId);
    if (previousScreen) applyWidgetLayout(previousScreen);
    return false;
  }
  showScreenStatus('');
  renderScreenNav();
  renderWidgetNav();
  applyVisibility(screen.hiddenWidgets);
  return true;
}

function renderScreenNav() {
  const current = readSettings();
  screenNav.replaceChildren();
  current.screens.forEach((screen, index) => {
    const screenNumber = index + 1;
    const screenLabel = `Page ${screenNumber}`;
    const tab = document.createElement('div');
    tab.className = 'screen-nav__tab';
    const select = document.createElement('button');
    select.className = 'screen-nav__button';
    select.type = 'button';
    select.textContent = screenLabel;
    select.title = screenLabel;
    select.setAttribute('aria-label', screenLabel);
    select.dataset.screenId = screen.id;
    if (screen.id === current.activeScreenId) select.setAttribute('aria-current', 'page');
    select.addEventListener('click', () => {
      const latest = readSettings();
      const selectedScreen = latest.screens.find(({ id }) => id === screen.id);
      if (selectedScreen) applyScreen(latest, selectedScreen);
    });
    tab.append(select);

    if (current.screens.length > 1) {
      const remove = document.createElement('button');
      remove.className = 'screen-nav__remove';
      remove.type = 'button';
      remove.textContent = '×';
      remove.title = `Remove ${screenLabel}`;
      remove.setAttribute('aria-label', `Remove ${screenLabel}`);
      remove.addEventListener('click', () => {
        const latest = readSettings();
        const removedIndex = latest.screens.findIndex(({ id }) => id === screen.id);
        if (removedIndex < 0 || latest.screens.length < 2) return;
        const removedLabel = `Page ${removedIndex + 1}`;
        if (!window.confirm(`Remove ${removedLabel}? Its widget layout will be deleted, but shared widget data will remain.`)) return;
        latest.screens.splice(removedIndex, 1);
        if (latest.activeScreenId === screen.id) {
          const replacement = latest.screens[Math.min(removedIndex, latest.screens.length - 1)];
          applyScreen(latest, replacement);
        } else {
          if (!writeSettings(latest)) {
            showScreenStatus('Could not remove the screen.');
            return;
          }
          renderScreenNav();
          showScreenStatus('');
        }
      });
      tab.append(remove);
    }
    screenNav.append(tab);
  });

  const add = document.createElement('button');
  add.className = 'screen-nav__add';
  add.type = 'button';
  add.textContent = '+';
  add.title = 'Add screen';
  add.setAttribute('aria-label', 'Add screen');
  add.addEventListener('click', () => {
    const latest = readSettings();
    const currentScreen = latest.screens.find(({ id }) => id === latest.activeScreenId) ?? latest.screens[0];
    const number = latest.screens.length + 1;
    const newScreen = {
      id: `screen-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
      name: `Screen ${number}`,
      order: [...DEFAULT_WIDGET_ORDER],
      hiddenWidgets: [...currentScreen.hiddenWidgets],
      placements: createDefaultWidgetPlacements(),
    };
    latest.screens.push(newScreen);
    if (applyScreen(latest, newScreen)) showScreenStatus(`Page ${number} added.`);
  });
  screenNav.append(add);
}

function renderWidgetNav() {
  const hiddenWidgets = readSettings().hiddenWidgets;
  widgetNav.replaceChildren();
  widgetOptions.forEach(({ id, title }) => {
    const button = document.createElement('button');
    button.className = 'widget-nav__button';
    button.type = 'button';
    button.dataset.widgetToggle = id;
    button.dataset.title = title;
    button.setAttribute('aria-pressed', String(!hiddenWidgets.includes(id)));
    button.setAttribute('aria-label', `${hiddenWidgets.includes(id) ? 'Show' : 'Hide'} ${title} widget`);
    button.title = `${hiddenWidgets.includes(id) ? 'Show' : 'Hide'} ${title}`;
    const symbol = document.createElement('span');
    symbol.className = 'widget-nav__icon';
    symbol.setAttribute('aria-hidden', 'true');
    symbol.textContent = WIDGET_ICONS[id];
    button.append(symbol);
    button.addEventListener('click', () => {
      const current = readSettings();
      const screen = current.screens.find(({ id: screenId }) => screenId === current.activeScreenId);
      if (!screen) return;
      const isHidden = screen.hiddenWidgets.includes(id);
      screen.hiddenWidgets = isHidden
        ? screen.hiddenWidgets.filter((widgetId) => widgetId !== id)
        : [...screen.hiddenWidgets, id];
      current.hiddenWidgets = screen.hiddenWidgets;
      if (!writeSettings(current)) {
        showScreenStatus('Could not save this screen’s widget visibility.');
        return;
      }
      showScreenStatus('');
      applyVisibility(current.hiddenWidgets);
      scheduleWidgetLayoutRefresh();
    });
    widgetNav.append(button);
  });
}

function parseTrackSizes(value) {
  return value.match(/[\d.]+px/g)?.map((size) => Number.parseFloat(size)) ?? [];
}

function syncGridCellSize() {
  const columnSizes = parseTrackSizes(window.getComputedStyle(grid).gridTemplateColumns);
  const nextSize = columnSizes[0];
  if (!Number.isFinite(nextSize) || nextSize <= 0) return false;
  const changed = Math.abs(nextSize - widgetGridCellSize) >= 0.5;
  widgetGridCellSize = nextSize;
  grid.style.setProperty('--widget-grid-cell-size', `${nextSize}px`);
  return changed;
}

function getGridMetrics() {
  const style = window.getComputedStyle(grid);
  const columnSizes = parseTrackSizes(style.gridTemplateColumns);
  const rowSizes = parseTrackSizes(style.gridTemplateRows);
  const columnGap = Number.parseFloat(style.columnGap) || 0;
  const rowGap = Number.parseFloat(style.rowGap) || 0;
  const columnStarts = [];
  const rowStarts = [];
  let offset = 0;
  columnSizes.forEach((size) => {
    columnStarts.push(offset);
    offset += size + columnGap;
  });
  offset = 0;
  rowSizes.forEach((size) => {
    rowStarts.push(offset);
    offset += size + rowGap;
  });
  return {
    columnStarts,
    rowStarts,
    rowSizes,
    columnGap,
    rowGap,
    minRowSize: widgetGridCellSize,
    paddingLeft: Number.parseFloat(style.paddingLeft) || 0,
    paddingTop: Number.parseFloat(style.paddingTop) || 0,
    borderLeft: Number.parseFloat(style.borderLeftWidth) || 0,
    borderTop: Number.parseFloat(style.borderTopWidth) || 0,
  };
}

function nearestIndex(values, target) {
  let nearest = 0;
  values.forEach((value, index) => {
    if (Math.abs(value - target) < Math.abs(values[nearest] - target)) nearest = index;
  });
  return nearest;
}

function getSnappedPlacement(event, interaction) {
  const bounds = grid.getBoundingClientRect();
  const desiredColumn = event.clientX - interaction.grabOffsetX - bounds.left - interaction.metrics.borderLeft - interaction.metrics.paddingLeft;
  const desiredRow = event.clientY - interaction.grabOffsetY - bounds.top - interaction.metrics.borderTop - interaction.metrics.paddingTop;
  const maxColumn = WIDGET_GRID_COLUMNS - interaction.originalPlacement.width + 1;
  const columnStarts = interaction.metrics.columnStarts.length > 1
    ? interaction.metrics.columnStarts.slice(0, maxColumn)
    : [0];
  const column = interaction.metrics.columnStarts.length > 1
    ? nearestIndex(columnStarts, desiredColumn) + 1
    : interaction.originalPlacement.column;
  const rowStarts = [...interaction.metrics.rowStarts];
  const rowSizes = [...interaction.metrics.rowSizes];
  if (!rowStarts.length) {
    rowStarts.push(0);
    rowSizes.push(interaction.metrics.minRowSize);
  }
  while (
    desiredRow > rowStarts[rowStarts.length - 1] + rowSizes[rowSizes.length - 1] / 2
    && rowStarts.length < MAX_WIDGET_ROW
  ) {
    const nextStart = rowStarts[rowStarts.length - 1] + rowSizes[rowSizes.length - 1] + interaction.metrics.rowGap;
    rowStarts.push(nextStart);
    rowSizes.push(interaction.metrics.minRowSize);
  }
  return {
    ...interaction.originalPlacement,
    column: Math.min(Math.max(column, 1), maxColumn),
    row: Math.min(nearestIndex(rowStarts, desiredRow) + 1, MAX_WIDGET_ROW),
  };
}

function getResizedPlacement(event, interaction) {
  const { metrics, originalPlacement, widget, resizeCorner } = interaction;
  const columnPitch = metrics.columnStarts.length > 1
    ? metrics.columnStarts[1] - metrics.columnStarts[0]
    : metrics.minRowSize + metrics.columnGap;
  const rowPitch = metrics.rowStarts.length > 1
    ? metrics.rowStarts[1] - metrics.rowStarts[0]
    : metrics.minRowSize + metrics.rowGap;
  const pointerWidthChange = Math.round((event.clientX - interaction.startX) / Math.max(columnPitch, 1));
  const pointerHeightChange = Math.round((event.clientY - interaction.startY) / Math.max(rowPitch, 1));
  const widthChange = pointerWidthChange * (resizeCorner.endsWith('left') ? -1 : 1);
  const heightChange = pointerHeightChange * (resizeCorner.startsWith('top') ? -1 : 1);
  return resizeWidgetPlacement(originalPlacement, widget.id, widthChange, heightChange, resizeCorner);
}

function samePlacements(first, second, order) {
  return order.every((id) => {
    const firstPosition = first[id];
    const secondPosition = second[id];
    return firstPosition.column === secondPosition.column
      && firstPosition.row === secondPosition.row
      && firstPosition.width === secondPosition.width
      && firstPosition.height === secondPosition.height;
  });
}

function beginWidgetInteraction(event) {
  if (widgetInteraction || event.button !== 0 || !event.isPrimary) return;
  if (!(event.target instanceof Element)) return;
  const widget = event.target.closest(widgetSelector);
  if (!widget || widget.hidden || !grid.contains(widget)) return;
  const resizeHandle = event.target.closest('[data-resize-handle]');
  const resizeCorner = resizeHandle?.dataset.resizeHandle;
  const type = resizeHandle
    ? 'resize'
    : event.target.closest(widgetInteractiveSelector)
      ? null
      : 'drag';
  if (!type) return;
  if (type === 'resize' && !resizeCorner) throw new Error('Resize handles must identify a widget corner.');
  if (type === 'resize' && window.matchMedia('(max-width: 680px)').matches) return;
  if (type === 'drag') event.preventDefault();

  const current = readSettings();
  const screen = current.screens.find(({ id }) => id === current.activeScreenId);
  const originalPlacement = screen?.placements[widget.id];
  if (!originalPlacement) return;
  const widgetBounds = widget.getBoundingClientRect();
  const placements = structuredClone(screen.placements);
  const order = getPlacementOrder(placements);
  widgetInteraction = {
    type,
    widget,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    grabOffsetX: event.clientX - widgetBounds.left,
    grabOffsetY: event.clientY - widgetBounds.top,
    resizeCorner,
    metrics: getGridMetrics(),
    originalPlacement: { ...originalPlacement },
    originalPlacements: placements,
    previewPlacements: placements,
    order,
    active: false,
  };
}

function moveWidgetInteraction(event) {
  if (!widgetInteraction || event.pointerId !== widgetInteraction.pointerId) return;
  if (
    !widgetInteraction.active
    && Math.hypot(event.clientX - widgetInteraction.startX, event.clientY - widgetInteraction.startY) < 4
  ) return;
  if (!widgetInteraction.active) {
    widgetInteraction.active = true;
    widgetInteraction.widget.classList.add(widgetInteraction.type === 'resize' ? 'is-resizing' : 'is-dragging');
    grid.classList.add('is-grid-interacting');
    grid.setPointerCapture(event.pointerId);
  }
  event.preventDefault();
  const targetPlacement = widgetInteraction.type === 'resize'
    ? getResizedPlacement(event, widgetInteraction)
    : getSnappedPlacement(event, widgetInteraction);
  const requestedPlacements = structuredClone(widgetInteraction.originalPlacements);
  requestedPlacements[widgetInteraction.widget.id] = targetPlacement;
  const previewPlacements = reflowWidgetPlacements(
    requestedPlacements,
    widgetInteraction.order,
    widgetInteraction.widget.id,
  );
  if (samePlacements(widgetInteraction.previewPlacements, previewPlacements, widgetInteraction.order)) return;
  widgetInteraction.previewPlacements = previewPlacements;
  applyWidgetLayoutPreview(previewPlacements, widgetInteraction.widget);
}

function finishWidgetInteraction(event, cancelled = false) {
  if (!widgetInteraction || event.pointerId !== widgetInteraction.pointerId) return;
  const interaction = widgetInteraction;
  widgetInteraction = null;
  interaction.widget.classList.remove(interaction.type === 'resize' ? 'is-resizing' : 'is-dragging');
  grid.classList.remove('is-grid-interacting');

  if (interaction.active && !cancelled) {
    const current = readSettings();
    const screen = current.screens.find(({ id }) => id === current.activeScreenId);
    if (screen) persistWidgetPlacements(interaction.previewPlacements);
  } else {
    const current = readSettings();
    const screen = current.screens.find(({ id }) => id === current.activeScreenId);
    if (screen) applyWidgetLayout(screen);
  }
}

function moveWidgetByUnit(widget, columnChange, rowChange) {
  const current = readSettings();
  const screen = current.screens.find(({ id }) => id === current.activeScreenId);
  const placement = screen?.placements[widget.id];
  if (!screen || !placement) return;
  const placements = structuredClone(screen.placements);
  placements[widget.id] = {
    ...placement,
    column: Math.min(Math.max(placement.column + columnChange, 1), WIDGET_GRID_COLUMNS - placement.width + 1),
    row: Math.min(Math.max(placement.row + rowChange, 1), MAX_WIDGET_ROW),
  };
  const reflowed = reflowWidgetPlacements(placements, getPlacementOrder(placements), widget.id);
  if (!persistWidgetPlacements(reflowed)) return;
  const next = reflowed[widget.id];
  const title = widgetOptions.find(({ id }) => id === widget.id)?.title ?? 'Widget';
  showScreenStatus(`${title} moved to column ${next.column}, row ${next.row}.`);
}

function resizeWidgetByUnit(widget, widthChange, heightChange, corner) {
  const current = readSettings();
  const screen = current.screens.find(({ id }) => id === current.activeScreenId);
  const placement = screen?.placements[widget.id];
  if (!screen || !placement) return;
  const placements = structuredClone(screen.placements);
  placements[widget.id] = resizeWidgetPlacement(placement, widget.id, widthChange, heightChange, corner);
  if (placements[widget.id].width === placement.width && placements[widget.id].height === placement.height) return;
  const reflowed = reflowWidgetPlacements(placements, getPlacementOrder(placements), widget.id);
  if (!persistWidgetPlacements(reflowed)) return;
  const next = reflowed[widget.id];
  const title = widgetOptions.find(({ id }) => id === widget.id)?.title ?? 'Widget';
  showScreenStatus(`${title} resized to ${next.width} by ${next.height} units.`);
}

const gridMoveKeys = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

grid.addEventListener('pointerdown', beginWidgetInteraction);
document.addEventListener('pointermove', moveWidgetInteraction);
document.addEventListener('pointerup', finishWidgetInteraction);
document.addEventListener('pointercancel', (event) => finishWidgetInteraction(event, true));
grid.addEventListener('keydown', (event) => {
  if (!(event.target instanceof Element)) return;
  const resizeHandle = event.target.closest('[data-resize-handle]');
  const widget = event.target.closest(widgetSelector);
  if (!widget) return;
  if (resizeHandle) {
    const corner = resizeHandle.dataset.resizeHandle;
    const growsFromLeft = corner.endsWith('left');
    const growsFromTop = corner.startsWith('top');
    const resizeMovement = {
      ArrowLeft: [growsFromLeft ? 1 : -1, 0],
      ArrowRight: [growsFromLeft ? -1 : 1, 0],
      ArrowUp: [0, growsFromTop ? 1 : -1],
      ArrowDown: [0, growsFromTop ? -1 : 1],
    }[event.key];
    if (!resizeMovement) return;
    event.preventDefault();
    resizeWidgetByUnit(widget, ...resizeMovement, corner);
    return;
  }
  if (!event.target.closest('[data-drag-keyboard]')) return;
  const movement = gridMoveKeys[event.key];
  if (!movement) return;
  event.preventDefault();
  moveWidgetByUnit(widget, ...movement);
});

applyVisibility(settings.hiddenWidgets);
syncGridCellSize();
const initialScreen = settings.screens.find(({ id }) => id === settings.activeScreenId);
if (initialScreen) {
  const previousOrder = JSON.stringify(initialScreen.order);
  applyWidgetLayout(initialScreen);
  settings.order = [...initialScreen.order];
  if (previousOrder !== JSON.stringify(initialScreen.order) && !writeSettings(settings)) {
    showScreenStatus('Could not save widget order.');
  }
}
renderScreenNav();
renderWidgetNav();
applyVisibility(settings.hiddenWidgets);

let observedGridWidth = grid.getBoundingClientRect().width;
const gridResizeObserver = new ResizeObserver(() => {
  const nextWidth = grid.getBoundingClientRect().width;
  if (Math.abs(nextWidth - observedGridWidth) < 0.5) return;
  observedGridWidth = nextWidth;
  if (syncGridCellSize()) scheduleWidgetLayoutRefresh();
});
gridResizeObserver.observe(grid);
window.addEventListener('resize', () => {
  if (syncGridCellSize()) scheduleWidgetLayoutRefresh();
});
