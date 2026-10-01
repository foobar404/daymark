import { readSettings, writeSettings } from '../storage.js';
import { BACKGROUND_IMAGES } from '../background-images.js';
import { WidgetElement } from './widget-element.js';

class NewsFeedWidget extends WidgetElement {
  widgetTitle = 'Top stories';

  render(content) {
    content.innerHTML = `
      <p class="news-feed-widget__status" role="status" aria-live="polite">Loading headlines...</p>
      <ol class="news-feed-widget__list"></ol>
      <div class="news-feed-widget__actions">
        <button class="text-button" type="button" data-refresh>Refresh</button>
        <button class="text-button" type="button" data-source>Feed source</button>
      </div>
      <form class="news-feed-widget__form" hidden>
        <label for="news-feed-url">RSS or Atom feed URL</label>
        <input id="news-feed-url" name="url" type="url" placeholder="https://example.com/news.rss" required>
        <p class="news-feed-widget__note">RSS2JSON fetches the feed because browsers block many direct RSS requests. The feed URL is sent to that service.</p>
        <div class="news-feed-widget__actions">
          <button class="button button--accent" type="submit">Save feed</button>
          <button class="text-button" type="button" data-cancel>Cancel</button>
        </div>
      </form>`;

    this.status = content.querySelector('.news-feed-widget__status');
    this.list = content.querySelector('.news-feed-widget__list');
    const form = content.querySelector('form');
    const input = form.elements.url;
    const refresh = content.querySelector('[data-refresh]');

    refresh.addEventListener('click', () => this.loadFeed());
    content.querySelector('[data-source]').addEventListener('click', () => {
      input.value = readSettings().newsFeedUrl;
      form.hidden = false;
      input.focus();
    });
    content.querySelector('[data-cancel]').addEventListener('click', () => {
      form.hidden = true;
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      try {
        const url = new URL(input.value.trim());
        if (url.protocol !== 'https:') throw new Error('Use a secure HTTPS feed URL.');
        const settings = readSettings();
        settings.newsFeedUrl = url.href;
        writeSettings(settings);
        form.hidden = true;
        this.loadFeed();
      } catch {
        input.setCustomValidity('Enter a valid HTTPS RSS or Atom feed URL.');
        form.reportValidity();
        input.addEventListener('input', () => input.setCustomValidity(''), { once: true });
      }
    });

    this.loadFeed();
  }

  async loadFeed() {
    const refresh = this.querySelector('[data-refresh]');
    refresh.disabled = true;
    this.status.textContent = 'Loading headlines...';
    this.list.replaceChildren();

    try {
      const feedUrl = readSettings().newsFeedUrl;
      const apiUrl = new URL('https://api.rss2json.com/v1/api.json');
      apiUrl.searchParams.set('rss_url', feedUrl);
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error('The feed service is unavailable.');
      const data = await response.json();
      if (data.status !== 'ok') throw new Error(data.message || 'The feed could not be read.');

      const items = data.items.slice(0, 8);
      if (!items.length) throw new Error('No stories were found in this feed.');
      items.forEach((item) => this.addStory(item));
      this.status.textContent = data.feed.title || 'Latest headlines';
    } catch (error) {
      this.status.textContent = error.message || 'Could not load this feed.';
    } finally {
      refresh.disabled = false;
    }
  }

  addStory(item) {
    const title = item.title?.trim();
    const href = item.link;
    if (!title || !href) return;

    try {
      const url = new URL(href);
      if (!['https:', 'http:'].includes(url.protocol)) return;
      const entry = document.createElement('li');
      const imageSources = [...new Set([
        this.findImage(item),
        this.fallbackImage(title),
        new URL('../../public/logo.png', import.meta.url).href,
      ].filter(Boolean))];
      const text = document.createElement('div');
      text.className = 'news-feed-widget__text';
      const link = document.createElement('a');
      link.href = url.href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = title;
      text.append(link);

      const dateText = item.pubDate;
      if (dateText) {
        const date = new Date(dateText);
        if (!Number.isNaN(date.valueOf())) {
          const time = document.createElement('time');
          time.dateTime = date.toISOString();
          time.textContent = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
          text.append(time);
        }
      }

      const image = document.createElement('img');
      image.className = 'news-feed-widget__image';
      image.alt = '';
      image.loading = 'lazy';
      image.decoding = 'async';
      image.referrerPolicy = 'no-referrer';
      let imageSource = 0;
      image.addEventListener('error', () => {
        imageSource += 1;
        if (imageSource < imageSources.length) image.src = imageSources[imageSource];
      });
      image.src = imageSources[imageSource];
      entry.append(image);
      entry.append(text);
      this.list.append(entry);
    } catch {
      return;
    }
  }

  findImage(item) {
    const descriptionImage = item.description
      ? new DOMParser().parseFromString(item.description, 'text/html').querySelector('img[src]')?.getAttribute('src')
      : null;
    const candidates = [item.thumbnail, item.enclosure?.link, descriptionImage];
    for (const candidate of candidates) {
      if (!candidate) continue;
      try {
        const url = new URL(candidate);
        if (['https:', 'http:'].includes(url.protocol)) return url.href;
      } catch {
        continue;
      }
    }
    return null;
  }

  fallbackImage(title) {
    const hash = [...title].reduce((total, character) => (total * 31 + character.charCodeAt(0)) >>> 0, 0);
    return BACKGROUND_IMAGES[hash % BACKGROUND_IMAGES.length]?.thumbnail;
  }
}

customElements.define('news-feed-widget', NewsFeedWidget);