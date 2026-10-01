import { readSettings, writeSettings } from '../storage.js';
import { WidgetElement } from './widget-element.js';

function titleFromHostname(hostname) {
  const labels = hostname.replace(/^www\./i, '').split('.');
  let domain = labels.length > 1 ? labels.at(-2) : labels[0];
  if (labels.length > 2 && labels.at(-1).length === 2 && ['co', 'com', 'net', 'org', 'gov', 'ac'].includes(labels.at(-2))) {
    domain = labels.at(-3);
  }
  return domain.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function domainColor(hostname) {
  const colors = ['#dceee1', '#e9e2f6', '#f5e6c9', '#dce8f5', '#f4dfdc', '#e4e9d3', '#e7e1ef', '#d8eae8'];
  const hash = [...hostname].reduce((total, character) => (total * 31 + character.charCodeAt(0)) >>> 0, 0);
  return colors[hash % colors.length];
}

function colorFromFavicon(image) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0, 16, 16);
    const pixels = context.getImageData(0, 0, 16, 16).data;
    let red = 0;
    let green = 0;
    let blue = 0;
    let count = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index + 3] < 160) continue;
      red += pixels[index];
      green += pixels[index + 1];
      blue += pixels[index + 2];
      count += 1;
    }
    if (!count) return null;
    const blend = (channel) => Math.round(channel / count * 0.28 + 255 * 0.72).toString(16).padStart(2, '0');
    return `#${blend(red)}${blend(green)}${blend(blue)}`;
  } catch {
    return null;
  }
}

class LinksWidget extends WidgetElement {
  widgetTitle = 'Shortcuts';

  render(content) {
    content.innerHTML = `
      <form class="links-widget__quick-add" aria-label="Add a shortcut">
        <label class="visually-hidden" for="shortcut-url">Website URL</label>
        <input id="shortcut-url" name="url" type="text" placeholder="Paste a website URL" autocomplete="url" inputmode="url" required>
        <button class="button button--accent" type="submit">Add</button>
      </form>
      <div class="links-widget__view-modes" role="group" aria-label="Shortcut display style">
        <button type="button" data-style="grid" aria-pressed="true">Cards</button>
        <button type="button" data-style="list" aria-pressed="false">List</button>
        <button type="button" data-style="icons" aria-pressed="false">Icons</button>
      </div>
      <ul class="links-widget__list"></ul>
      `;

    const list = content.querySelector('.links-widget__list');
    const form = content.querySelector('.links-widget__quick-add');
    const urlInput = form.elements.url;
    const viewButtons = [...content.querySelectorAll('.links-widget__view-modes button')];

    const drawLinks = () => {
      const settings = readSettings();
      const { links } = settings;
      list.dataset.style = settings.linksDisplayStyle;
      viewButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.style === settings.linksDisplayStyle)));
      list.replaceChildren();
      links.forEach((link, index) => {
        const item = document.createElement('li');
        const anchor = document.createElement('a');
        anchor.href = link.url;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.title = link.title;
        anchor.setAttribute('aria-label', link.title);
        anchor.style.setProperty('--shortcut-color', link.color);

        const icon = document.createElement('span');
        icon.className = 'links-widget__icon';
        icon.setAttribute('aria-hidden', 'true');
        const fallback = document.createElement('span');
        fallback.textContent = link.title.charAt(0).toUpperCase();
        const favicon = document.createElement('img');
        favicon.alt = '';
        favicon.loading = 'lazy';
        favicon.referrerPolicy = 'no-referrer';
        const siteUrl = new URL(link.url);
        icon.style.setProperty('--shortcut-color', link.color || domainColor(siteUrl.hostname));
        const googleFavicon = new URL('https://www.google.com/s2/favicons');
        googleFavicon.searchParams.set('domain_url', siteUrl.origin);
        googleFavicon.searchParams.set('sz', '64');
        const faviconSources = [new URL('/favicon.ico', siteUrl).href, googleFavicon.href];
        favicon.addEventListener('load', () => {
          const applySampledColor = (image) => {
            const sampledColor = colorFromFavicon(image);
            if (sampledColor) icon.style.setProperty('--shortcut-color', sampledColor);
            return Boolean(sampledColor);
          };
          if (applySampledColor(favicon)) return;
          const colorProbe = new Image();
          colorProbe.crossOrigin = 'anonymous';
          colorProbe.addEventListener('load', () => applySampledColor(colorProbe), { once: true });
          colorProbe.src = googleFavicon.href;
        });
        let faviconSource = 0;
        favicon.src = faviconSources[faviconSource];
        favicon.addEventListener('error', () => {
          faviconSource += 1;
          if (faviconSource < faviconSources.length) favicon.src = faviconSources[faviconSource];
          else favicon.remove();
        });
        icon.append(fallback, favicon);

        const name = document.createElement('span');
        name.className = 'links-widget__name';
        name.textContent = link.title;
        anchor.append(icon, name);

        const remove = document.createElement('button');
        remove.className = 'links-widget__remove';
        remove.type = 'button';
        remove.setAttribute('aria-label', `Remove ${link.title}`);
        remove.textContent = '×';
        remove.addEventListener('click', () => {
          const settings = readSettings();
          settings.links.splice(index, 1);
          writeSettings(settings);
          drawLinks();
        });

        item.append(anchor, remove);
        list.append(item);
      });
      list.classList.toggle('links-widget__list--empty', links.length === 0);
    };

    viewButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const settings = readSettings();
        settings.linksDisplayStyle = button.dataset.style;
        writeSettings(settings);
        list.dataset.style = button.dataset.style;
        viewButtons.forEach((viewButton) => viewButton.setAttribute('aria-pressed', String(viewButton === button)));
      });
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const rawUrl = urlInput.value.trim();
      try {
        const parsed = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`);
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Unsupported URL');
        parsed.hash = '';
        const settings = readSettings();
        if (settings.links.some((link) => link.url === parsed.href)) {
          urlInput.setCustomValidity('That shortcut is already saved.');
          form.reportValidity();
          return;
        }
        settings.links.push({ title: titleFromHostname(parsed.hostname), url: parsed.href, color: domainColor(parsed.hostname) });
        writeSettings(settings);
        form.reset();
        drawLinks();
      } catch {
        urlInput.setCustomValidity('Enter a valid web address.');
        form.reportValidity();
      }
    });
    urlInput.addEventListener('input', () => urlInput.setCustomValidity(''));

    drawLinks();
  }
}

customElements.define('links-widget', LinksWidget);