import { readSettings, writeSettings } from '../storage.js';
import { WidgetElement } from './widget-element.js';

function makeEmbedUrl(input) {
  const source = input.match(/src\s*=\s*["']([^"']+)["']/i)?.[1] ?? input;
  const value = source.trim().replaceAll('&amp;', '&');
  if (!value || /\s/.test(value)) throw new Error('Enter a Calendar ID or Google Calendar embed URL.');

  if (/^https?:\/\//i.test(value)) {
    const url = new URL(value);
    if (url.origin !== 'https://calendar.google.com' || url.pathname !== '/calendar/embed' || !url.searchParams.has('src')) {
      throw new Error('Use a Google Calendar embed URL.');
    }
    return url.href;
  }

  const url = new URL('https://calendar.google.com/calendar/embed');
  url.searchParams.set('src', value);
  url.searchParams.set('ctz', Intl.DateTimeFormat().resolvedOptions().timeZone);
  return url.href;
}

class CalendarWidget extends WidgetElement {
  widgetTitle = 'Google Calendar';

  render(content) {
    content.innerHTML = `
      <div class="calendar-widget__view"></div>
      <form class="calendar-widget__form" hidden>
        <label for="calendar-embed-url">Calendar ID, embed URL, or iframe code</label>
        <input id="calendar-embed-url" name="url" type="text" placeholder="your-calendar@gmail.com" autocomplete="off" required>
        <ol class="calendar-widget__steps">
          <li>Open <a href="https://calendar.google.com/calendar/u/0/r/settings" target="_blank" rel="noopener noreferrer">Google Calendar settings</a>.</li>
          <li>Under <strong>Settings for my calendars</strong>, choose your calendar and open <strong>Integrate calendar</strong>.</li>
          <li>Copy its <strong>Calendar ID</strong> and paste it above. You do not need to find an embed URL.</li>
        </ol>
        <p class="calendar-widget__hint">Private calendars may require the viewer to be signed in. Only make a calendar public if its events are safe for anyone to see.</p>
        <div class="calendar-widget__actions">
          <button class="button button--accent" type="submit">Save calendar</button>
          <button class="text-button" type="button" data-cancel>Cancel</button>
        </div>
      </form>
      <button class="text-button calendar-widget__configure" type="button"></button>`;

    const view = content.querySelector('.calendar-widget__view');
    const form = content.querySelector('form');
    const configure = content.querySelector('.calendar-widget__configure');
    const input = form.elements.url;

    const drawCalendar = () => {
      const embed = readSettings().calendarEmbed;
      view.replaceChildren();
      if (!embed) {
        const message = document.createElement('p');
        message.className = 'calendar-widget__empty';
        message.textContent = 'Add a Google Calendar embed URL to show your schedule here.';
        view.append(message);
        configure.textContent = 'Set up calendar';
        return;
      }
      const frame = document.createElement('iframe');
      frame.src = embed;
      frame.title = 'Google Calendar';
      frame.loading = 'lazy';
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      view.append(frame);
      configure.textContent = 'Change calendar';
    };

    configure.addEventListener('click', () => {
      form.hidden = false;
      configure.hidden = true;
      input.value = readSettings().calendarEmbed;
      input.focus();
    });
    content.querySelector('[data-cancel]').addEventListener('click', () => {
      form.hidden = true;
      configure.hidden = false;
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      try {
        const embedUrl = makeEmbedUrl(input.value);
        const settings = readSettings();
        settings.calendarEmbed = embedUrl;
        writeSettings(settings);
        form.hidden = true;
        configure.hidden = false;
        drawCalendar();
      } catch {
        input.setCustomValidity('Enter a valid Calendar ID or Google Calendar embed URL.');
        form.reportValidity();
        input.addEventListener('input', () => input.setCustomValidity(''), { once: true });
      }
    });

    drawCalendar();
  }
}

customElements.define('calendar-widget', CalendarWidget);