import { WidgetElement } from './widget-element.js';
import { readSettings, writeSettings } from '../storage.js';

class ClockWidget extends WidgetElement {
  widgetTitle = 'Local time';

  render(content) {
    content.innerHTML = `
      <div class="clock-widget__extras">
        <div class="clock-widget__tabs" role="tablist" aria-label="Clock tools">
          <button class="clock-widget__tab" id="clock-time-tab" type="button" role="tab" aria-selected="true" aria-controls="clock-time-panel">Time</button>
          <button class="clock-widget__tab" id="clock-stopwatch-tab" type="button" role="tab" aria-selected="false" aria-controls="clock-stopwatch-panel" tabindex="-1">Stopwatch</button>
        </div>
        <section class="clock-widget__tab-panel" id="clock-time-panel" role="tabpanel" aria-labelledby="clock-time-tab">
          <div class="clock-widget__face">
            <time class="clock-widget__time" aria-label="Current local time"></time>
            <p class="clock-widget__date"></p>
          </div>
          <label class="clock-widget__seconds-toggle"><input type="checkbox"> Show seconds</label>
        </section>
        <section class="clock-widget__tab-panel" id="clock-stopwatch-panel" role="tabpanel" aria-labelledby="clock-stopwatch-tab" hidden>
          <div class="clock-widget__stopwatch-controls">
            <output class="clock-widget__stopwatch-time">00:00.0</output>
            <div>
              <button class="button button--accent" type="button" data-stopwatch-start>Start</button>
              <button class="text-button" type="button" data-stopwatch-reset>Reset</button>
            </div>
          </div>
        </section>
      </div>`;
    const time = content.querySelector('time');
    const date = content.querySelector('.clock-widget__date');
    const secondsToggle = content.querySelector('.clock-widget__seconds-toggle input');
    const tabs = [...content.querySelectorAll('[role="tab"]')];
    const dateFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const stopwatchOutput = content.querySelector('.clock-widget__stopwatch-time');
    const stopwatchStart = content.querySelector('[data-stopwatch-start]');
    let elapsed = 0;
    let startedAt = 0;
    let stopwatchInterval = null;

    secondsToggle.checked = readSettings().clockSeconds;

    const activateTab = (tab, focus = false) => {
      tabs.forEach((item) => {
        const selected = item === tab;
        item.setAttribute('aria-selected', String(selected));
        item.tabIndex = selected ? 0 : -1;
        content.querySelector(`#${item.getAttribute('aria-controls')}`).hidden = !selected;
      });
      if (focus) tab.focus();
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => activateTab(tab));
      tab.addEventListener('keydown', (event) => {
        let nextIndex;
        if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
        if (event.key === 'ArrowLeft') nextIndex = (index + tabs.length - 1) % tabs.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = tabs.length - 1;
        if (nextIndex === undefined) return;
        event.preventDefault();
        activateTab(tabs[nextIndex], true);
      });
    });

    const update = () => {
      const now = new Date();
      const timeFormatter = new Intl.DateTimeFormat(undefined, {
        hour: 'numeric', minute: '2-digit', second: secondsToggle.checked ? '2-digit' : undefined,
      });
      time.dateTime = now.toISOString();
      time.textContent = timeFormatter.format(now);
      date.textContent = dateFormatter.format(now);
    };

    secondsToggle.addEventListener('change', () => {
      const settings = readSettings();
      settings.clockSeconds = secondsToggle.checked;
      writeSettings(settings);
      update();
    });

    const formatStopwatch = () => {
      const currentElapsed = elapsed + (stopwatchInterval ? performance.now() - startedAt : 0);
      const totalTenths = Math.floor(currentElapsed / 100);
      const tenths = totalTenths % 10;
      const totalSeconds = Math.floor(totalTenths / 10);
      const seconds = totalSeconds % 60;
      const minutes = Math.floor(totalSeconds / 60) % 60;
      const hours = Math.floor(totalSeconds / 3600);
      stopwatchOutput.textContent = hours
        ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`
        : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
    };
    stopwatchStart.addEventListener('click', () => {
      if (stopwatchInterval) {
        elapsed += performance.now() - startedAt;
        clearInterval(stopwatchInterval);
        stopwatchInterval = null;
        stopwatchStart.textContent = 'Resume';
      } else {
        startedAt = performance.now();
        stopwatchInterval = window.setInterval(() => {
          formatStopwatch();
        }, 50);
        stopwatchStart.textContent = 'Pause';
      }
    });
    content.querySelector('[data-stopwatch-reset]').addEventListener('click', () => {
      if (stopwatchInterval) clearInterval(stopwatchInterval);
      stopwatchInterval = null;
      elapsed = 0;
      stopwatchStart.textContent = 'Start';
      formatStopwatch();
    });

    update();
    window.setInterval(update, 1000);
  }
}

customElements.define('clock-widget', ClockWidget);