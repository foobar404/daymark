const STORAGE_KEY = 'daymark-home:v1';
import { THEME_IDS } from './themes.js';
import { SEARCH_ENGINES } from './search-engines.js';
import { BACKGROUND_IMAGE_IDS, isCommonsBackgroundUrl } from './background-images.js';

const DEFAULT_WIDGET_ORDER = ['search', 'news', 'clock', 'weather', 'links', 'notes', 'tasks', 'calculator', 'calendar', 'launchpad'];

export const DEFAULT_SETTINGS = {
  order: [...DEFAULT_WIDGET_ORDER],
  screens: [{ id: 'screen-1', name: 'Screen 1', order: [...DEFAULT_WIDGET_ORDER], hiddenWidgets: [] }],
  activeScreenId: 'screen-1',
  links: [
    { title: 'MDN', url: 'https://developer.mozilla.org/', color: '#dceee1' },
    { title: 'GitHub', url: 'https://github.com/', color: '#e9e2f6' },
    { title: 'Wikipedia', url: 'https://wikipedia.org/', color: '#f5e6c9' },
  ],
  linksDisplayStyle: 'grid',
  notes: '',
  tasks: [],
  calendarEmbed: '',
  weatherLocation: null,
  newsFeedUrl: 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en',
  launchpad: [],
  clockSeconds: false,
  clockCities: [],
  hiddenWidgets: [],
  theme: 'sage',
  backgroundMode: 'color',
  containerBackground: 'solid',
  backgroundImage: 'morning-light',
  backgroundImageTitle: '',
  backgroundImageCredit: '',
  dailyBackgroundEnabled: false,
  dailyBackgroundSearchTerm: 'landscape',
  dailyBackgroundDate: '',
  widgetSize: 'standard',
  searchEngine: 'chatgpt',
};

function normalizeSettings(value) {
  if (!value || typeof value !== 'object') return structuredClone(DEFAULT_SETTINGS);

  const widgetIds = DEFAULT_WIDGET_ORDER;
  const normalizeOrder = (savedOrder) => {
    const validOrder = Array.isArray(savedOrder)
      ? [...new Set(savedOrder.filter((id) => widgetIds.includes(id)))]
      : [];
    return [...validOrder, ...widgetIds.filter((id) => !validOrder.includes(id))];
  };
  const normalizeHiddenWidgets = (savedHiddenWidgets) => Array.isArray(savedHiddenWidgets)
    ? [...new Set(savedHiddenWidgets.filter((id) => widgetIds.includes(id)))]
    : [];
  const screenIds = new Set();
  let screens = Array.isArray(value.screens)
    ? value.screens.flatMap((screen, index) => {
      if (!screen || typeof screen !== 'object') return [];
      const id = typeof screen.id === 'string' && screen.id.trim() ? screen.id.trim().slice(0, 100) : `screen-${index + 1}`;
      if (screenIds.has(id)) return [];
      screenIds.add(id);
      return [{
        id,
        name: typeof screen.name === 'string' && screen.name.trim() ? screen.name.trim().slice(0, 40) : `Screen ${index + 1}`,
        order: normalizeOrder(screen.order),
        hiddenWidgets: normalizeHiddenWidgets(screen.hiddenWidgets),
      }];
    })
    : [];
  if (!screens.length) {
    screens = [{
      id: 'screen-1',
      name: 'Screen 1',
      order: normalizeOrder(value.order),
      hiddenWidgets: normalizeHiddenWidgets(value.hiddenWidgets),
    }];
  }
  const activeScreen = screens.find((screen) => screen.id === value.activeScreenId) ?? screens[0];
  const order = activeScreen.order;
  const hiddenWidgets = activeScreen.hiddenWidgets;
  const widgetSizes = ['tiny', 'compact', 'standard', 'dense', 'ultra-dense'];
  const legacyWidgetSizes = new Map([['spacious', 'dense'], ['large', 'ultra-dense']]);
  const savedWidgetSize = legacyWidgetSizes.get(value.widgetSize) ?? value.widgetSize;
  const links = Array.isArray(value.links)
    ? value.links.flatMap((link) => {
      if (!link || typeof link.title !== 'string' || typeof link.url !== 'string') return [];
      try {
        const url = new URL(link.url);
        if (!['http:', 'https:'].includes(url.protocol)) return [];
        return [{
          title: link.title.trim().slice(0, 32) || url.hostname,
          url: url.href,
          color: typeof link.color === 'string' && /^#[\da-f]{6}$/i.test(link.color) ? link.color : '#dceee1',
        }];
      } catch {
        return [];
      }
    })
    : structuredClone(DEFAULT_SETTINGS.links);
  const tasks = Array.isArray(value.tasks)
    ? value.tasks.flatMap((task) => task && typeof task.id === 'string' && typeof task.text === 'string'
      ? [{ id: task.id, text: task.text.slice(0, 160), done: Boolean(task.done) }]
      : [])
    : [];
  const clockCities = Array.isArray(value.clockCities)
    ? value.clockCities.flatMap((city) => {
      if (!city || typeof city.name !== 'string' || typeof city.timeZone !== 'string') return [];
      try {
        new Intl.DateTimeFormat(undefined, { timeZone: city.timeZone });
        return [{ name: city.name.trim().slice(0, 32) || city.timeZone, timeZone: city.timeZone }];
      } catch {
        return [];
      }
    }).slice(0, 8)
    : [];
  const launchpad = Array.isArray(value.launchpad)
    ? value.launchpad.flatMap((item) => {
      if (!item || typeof item.title !== 'string' || typeof item.url !== 'string') return [];
      try {
        const url = new URL(item.url);
        const allowed = ['http:', 'https:', 'file:', 'vscode:', 'spotify:', 'steam:', 'obsidian:'];
        if (!allowed.includes(url.protocol)) return [];
        return [{
          title: item.title.trim().slice(0, 32) || url.hostname || url.protocol.slice(0, -1),
          url: url.href,
          color: typeof item.color === 'string' && /^#[\da-f]{6}$/i.test(item.color) ? item.color : '#dceee1',
        }];
      } catch {
        return [];
      }
    })
    : [];
  let calendarEmbed = '';
  if (typeof value.calendarEmbed === 'string' && value.calendarEmbed) {
    try {
      const embedUrl = new URL(value.calendarEmbed);
      if (embedUrl.origin === 'https://calendar.google.com' && embedUrl.pathname === '/calendar/embed') {
        calendarEmbed = embedUrl.href;
      }
    } catch {
      calendarEmbed = '';
    }
  }
  const weatherLocation = value.weatherLocation
    && typeof value.weatherLocation.latitude === 'number'
    && value.weatherLocation.latitude >= -90
    && value.weatherLocation.latitude <= 90
    && typeof value.weatherLocation.longitude === 'number'
    && value.weatherLocation.longitude >= -180
    && value.weatherLocation.longitude <= 180
    ? { latitude: value.weatherLocation.latitude, longitude: value.weatherLocation.longitude }
    : null;
  const backgroundImage = BACKGROUND_IMAGE_IDS.includes(value.backgroundImage) || isCommonsBackgroundUrl(value.backgroundImage)
    ? value.backgroundImage
    : DEFAULT_SETTINGS.backgroundImage;
  const dailyBackgroundSearchTerm = typeof value.dailyBackgroundSearchTerm === 'string'
    ? value.dailyBackgroundSearchTerm.trim().slice(0, 100)
    : DEFAULT_SETTINGS.dailyBackgroundSearchTerm;
  const dailyBackgroundDate = typeof value.dailyBackgroundDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.dailyBackgroundDate)
    ? value.dailyBackgroundDate
    : '';
  let backgroundImageCredit = '';
  if (typeof value.backgroundImageCredit === 'string') {
    try {
      const creditUrl = new URL(value.backgroundImageCredit);
      if (creditUrl.protocol === 'https:' && creditUrl.hostname === 'commons.wikimedia.org' && creditUrl.pathname.startsWith('/wiki/File:')) {
        backgroundImageCredit = creditUrl.href;
      }
    } catch {
      backgroundImageCredit = '';
    }
  }
  let newsFeedUrl = DEFAULT_SETTINGS.newsFeedUrl;
  if (typeof value.newsFeedUrl === 'string') {
    try {
      const feedUrl = new URL(value.newsFeedUrl);
      if (feedUrl.protocol === 'https:') newsFeedUrl = feedUrl.href;
    } catch {
      newsFeedUrl = DEFAULT_SETTINGS.newsFeedUrl;
    }
  }

  return {
    order,
    screens,
    activeScreenId: activeScreen.id,
    links,
    linksDisplayStyle: ['grid', 'list', 'icons'].includes(value.linksDisplayStyle) ? value.linksDisplayStyle : DEFAULT_SETTINGS.linksDisplayStyle,
    notes: typeof value.notes === 'string' ? value.notes : '',
    tasks,
    calendarEmbed,
    weatherLocation,
    newsFeedUrl,
    launchpad,
    clockSeconds: Boolean(value.clockSeconds),
    clockCities,
    hiddenWidgets,
    theme: THEME_IDS.includes(value.theme) ? value.theme : DEFAULT_SETTINGS.theme,
    backgroundMode: ['color', 'photo'].includes(value.backgroundMode) ? value.backgroundMode : DEFAULT_SETTINGS.backgroundMode,
    containerBackground: ['solid', 'transparent', 'glass'].includes(value.containerBackground) ? value.containerBackground : DEFAULT_SETTINGS.containerBackground,
    backgroundImage,
    backgroundImageTitle: typeof value.backgroundImageTitle === 'string' ? value.backgroundImageTitle.slice(0, 180) : '',
    backgroundImageCredit,
    dailyBackgroundEnabled: Boolean(value.dailyBackgroundEnabled),
    dailyBackgroundSearchTerm: dailyBackgroundSearchTerm || DEFAULT_SETTINGS.dailyBackgroundSearchTerm,
    dailyBackgroundDate,
    widgetSize: widgetSizes.includes(savedWidgetSize) ? savedWidgetSize : DEFAULT_SETTINGS.widgetSize,
    searchEngine: SEARCH_ENGINES.some(({ id }) => id === value.searchEngine) ? value.searchEngine : DEFAULT_SETTINGS.searchEngine,
  };
}

export function readSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? normalizeSettings(JSON.parse(saved)) : structuredClone(DEFAULT_SETTINGS);
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
}

export function writeSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeSettings(settings)));
    return true;
  } catch {
    return false;
  }
}