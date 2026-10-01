import { readSettings, writeSettings } from '../storage.js';
import { WidgetElement } from './widget-element.js';

const ALLOWED_PROTOCOLS = ['http:', 'https:', 'file:', 'vscode:', 'spotify:', 'steam:', 'obsidian:'];

class LaunchpadWidget extends WidgetElement {
  widgetTitle = 'Local launchpad';

  render(content) {
    content.innerHTML = `
      <ul class="launchpad-widget__list"></ul>
      <p class="launchpad-widget__hint">Web links, file:/// paths, or supported app URLs like vscode://</p>
      <button class="text-button launchpad-widget__add" type="button">+ Add shortcut</button>
      <form class="launchpad-widget__form" hidden>
        <label>Name<input name="title" maxlength="32" required autocomplete="off"></label>
        <label>URL<input name="url" type="text" placeholder="file:///C:/... or vscode://..." required autocomplete="off"></label>
        <label class="launchpad-widget__color-label">Tile color<input name="color" type="color" value="#dceee1"></label>
        <div class="launchpad-widget__actions">
          <button class="button button--accent" type="submit">Save shortcut</button>
          <button class="text-button" type="button" data-cancel>Cancel</button>
        </div>
      </form>`;

    const list = content.querySelector('ul');
    const addButton = content.querySelector('.launchpad-widget__add');
    const form = content.querySelector('form');

    const drawItems = () => {
      list.replaceChildren();
      readSettings().launchpad.forEach((shortcut, index) => {
        const item = document.createElement('li');
        const link = document.createElement('a');
        link.href = shortcut.url;
        link.style.setProperty('--shortcut-color', shortcut.color);
        link.title = shortcut.url;
        const icon = document.createElement('span');
        icon.className = 'launchpad-widget__icon';
        icon.textContent = shortcut.title.charAt(0).toUpperCase();
        const title = document.createElement('span');
        title.className = 'launchpad-widget__title';
        title.textContent = shortcut.title;
        link.append(icon, title);

        const remove = document.createElement('button');
        remove.className = 'launchpad-widget__remove';
        remove.type = 'button';
        remove.textContent = '×';
        remove.setAttribute('aria-label', `Remove ${shortcut.title}`);
        remove.addEventListener('click', () => {
          const settings = readSettings();
          settings.launchpad.splice(index, 1);
          writeSettings(settings);
          drawItems();
        });
        item.append(link, remove);
        list.append(item);
      });
      list.classList.toggle('launchpad-widget__list--empty', list.children.length === 0);
    };

    addButton.addEventListener('click', () => {
      form.hidden = false;
      addButton.hidden = true;
      form.elements.title.focus();
    });
    content.querySelector('[data-cancel]').addEventListener('click', () => {
      form.reset();
      form.hidden = true;
      addButton.hidden = false;
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const title = form.elements.title.value.trim();
      const rawUrl = form.elements.url.value.trim();
      try {
        const url = new URL(rawUrl);
        if (!title || !ALLOWED_PROTOCOLS.includes(url.protocol)) throw new Error('Unsupported URL');
        const settings = readSettings();
        settings.launchpad.push({ title, url: url.href, color: form.elements.color.value });
        writeSettings(settings);
        form.reset();
        form.hidden = true;
        addButton.hidden = false;
        drawItems();
      } catch {
        form.elements.url.setCustomValidity('Use a web URL, file:/// path, or supported app URL.');
        form.reportValidity();
        form.elements.url.addEventListener('input', () => form.elements.url.setCustomValidity(''), { once: true });
      }
    });

    drawItems();
  }
}

customElements.define('launchpad-widget', LaunchpadWidget);