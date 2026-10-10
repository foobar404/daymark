export const WIDGET_ICONS = {
  search: '🔎',
  news: '📰',
  clock: '🕒',
  weather: '🌤️',
  links: '🔗',
  notes: '📝',
  tasks: '✅',
  calculator: '🧮',
  calendar: '📅',
};

export class WidgetElement extends HTMLElement {
  connectedCallback() {
    if (this.dataset.initialized) return;
    this.dataset.initialized = 'true';

    const heading = document.createElement('header');
    heading.className = 'widget__header';
    heading.innerHTML = `
      <h2 class="widget__title"><span class="widget__icon" aria-hidden="true"></span><span class="widget__title-text"></span></h2>`;
    const icon = heading.querySelector('.widget__icon');
    icon.textContent = WIDGET_ICONS[this.id] ?? '🧩';
    heading.querySelector('.widget__title-text').textContent = this.widgetTitle;
    const dragIndicator = document.createElement('span');
    dragIndicator.className = 'widget__drag-indicator';
    dragIndicator.setAttribute('aria-hidden', 'true');
    heading.append(dragIndicator);
    heading.dataset.dragKeyboard = '';
    heading.tabIndex = 0;
    heading.setAttribute('role', 'group');
    heading.setAttribute('aria-label', `Move ${this.widgetTitle} widget with arrow keys or by dragging`);

    const panel = document.createElement('section');
    panel.className = 'widget__panel';
    panel.append(heading);

    const content = document.createElement('div');
    content.className = 'widget__content';
    const resizeHandles = ['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => {
      const resizeHandle = document.createElement('button');
      resizeHandle.className = `widget__resize-handle widget__resize-handle--${corner}`;
      resizeHandle.type = 'button';
      resizeHandle.dataset.resizeHandle = corner;
      resizeHandle.setAttribute('aria-label', `Resize ${this.widgetTitle} widget from its ${corner.replace('-', ' ')} corner with arrow keys or by dragging`);
      resizeHandle.setAttribute('aria-keyshortcuts', 'ArrowUp ArrowDown ArrowLeft ArrowRight');
      resizeHandle.innerHTML = '<span class="widget__resize-grip" aria-hidden="true"></span>';
      return resizeHandle;
    });
    panel.append(content, ...resizeHandles);

    this.replaceChildren(panel);
    this.render(content);
  }

  render() {
    throw new Error('WidgetElement subclasses must implement render().');
  }
}