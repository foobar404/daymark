export const WIDGET_ICONS = {
  search: '⌕',
  news: '▤',
  clock: '◷',
  weather: '☼',
  links: '↗',
  notes: '✎',
  tasks: '✓',
  calculator: '±',
  calendar: '▦',
  launchpad: '⊞',
};

export class WidgetElement extends HTMLElement {
  connectedCallback() {
    if (this.dataset.initialized) return;
    this.dataset.initialized = 'true';

    const heading = document.createElement('header');
    heading.className = 'widget__header';
    heading.innerHTML = `
      <h2 class="widget__title"><span class="widget__icon" aria-hidden="true"></span><span class="visually-hidden"></span></h2>
      <div class="widget__tools" aria-label="Widget controls">
        <button class="widget__drag" type="button" data-drag-handle aria-label="Drag to reorder widget" title="Drag to reorder">⠿</button>
      </div>`;
    heading.querySelector('[data-drag-handle]').draggable = true;
    const icon = heading.querySelector('.widget__icon');
    icon.textContent = WIDGET_ICONS[this.id] ?? '◈';
    icon.title = this.widgetTitle;
    heading.querySelector('.visually-hidden').textContent = this.widgetTitle;

    const panel = document.createElement('section');
    panel.className = 'widget__panel';
    panel.append(heading);

    const content = document.createElement('div');
    content.className = 'widget__content';
    panel.append(content);

    this.replaceChildren(panel);
    this.render(content);
  }

  render() {
    throw new Error('WidgetElement subclasses must implement render().');
  }
}