import { WidgetElement } from './widget-element.js';
import { readSettings, writeSettings } from '../storage.js';
import { getSearchUrl, SEARCH_ENGINES } from '../search-engines.js';

class SearchWidget extends WidgetElement {
  widgetTitle = 'Search';

  render(content) {
    content.innerHTML = `
      <form class="search-widget__form">
        <label class="visually-hidden" for="search-query">Search the web</label>
        <input id="search-query" name="q" type="search" placeholder="What are you thinking about?" autocomplete="off" required>
        <label class="visually-hidden" for="search-engine">Search engine</label>
        <select class="search-widget__engine" id="search-engine" aria-label="Search engine">
          ${SEARCH_ENGINES.map(({ id, name }) => `<option value="${id}">${name}</option>`).join('')}
        </select>
        <button class="button button--accent" type="submit">Search <span aria-hidden="true">↗</span></button>
      </form>`;

    const form = content.querySelector('form');
    const engineSelect = form.elements.namedItem('search-engine') ?? content.querySelector('#search-engine');
    engineSelect.value = readSettings().searchEngine;
    engineSelect.addEventListener('change', () => {
      const settings = readSettings();
      settings.searchEngine = engineSelect.value;
      writeSettings(settings);
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const query = new FormData(event.currentTarget).get('q')?.toString().trim();
      if (!query) return;
      window.open(getSearchUrl(engineSelect.value, query), '_blank', 'noopener,noreferrer');
    });
  }
}

customElements.define('search-widget', SearchWidget);