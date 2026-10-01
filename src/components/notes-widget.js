import { readSettings, writeSettings } from '../storage.js';
import { WidgetElement } from './widget-element.js';

class NotesWidget extends WidgetElement {
  widgetTitle = 'Quick note';

  render(content) {
    content.innerHTML = `
      <label class="visually-hidden" for="quick-note">Your note</label>
      <textarea class="notes-widget__input" id="quick-note" maxlength="5000" placeholder="Leave yourself a note..."></textarea>
      <p class="notes-widget__status" aria-live="polite"></p>`;
    const input = content.querySelector('textarea');
    const status = content.querySelector('.notes-widget__status');
    input.value = readSettings().notes;

    input.addEventListener('input', () => {
      const settings = readSettings();
      settings.notes = input.value;
      status.textContent = writeSettings(settings) ? 'Saved on this device' : 'Could not save in this browser';
    });
  }
}

customElements.define('notes-widget', NotesWidget);