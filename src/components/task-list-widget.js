import { readSettings, writeSettings } from '../storage.js';
import { WidgetElement } from './widget-element.js';

class TaskListWidget extends WidgetElement {
  widgetTitle = 'To-do list';

  render(content) {
    content.innerHTML = `
      <form class="task-list-widget__form">
        <label class="visually-hidden" for="new-task">New task</label>
        <input id="new-task" name="task" maxlength="160" placeholder="Add a task..." autocomplete="off" required>
        <button class="button button--accent" type="submit" aria-label="Add task">+</button>
      </form>
      <ul class="task-list-widget__items"></ul>
      <button class="text-button task-list-widget__clear" type="button" hidden>Clear completed</button>`;

    const form = content.querySelector('form');
    const list = content.querySelector('ul');
    const clearButton = content.querySelector('.task-list-widget__clear');

    const drawTasks = () => {
      const { tasks } = readSettings();
      list.replaceChildren();
      tasks.forEach((task) => {
        const item = document.createElement('li');
        item.className = task.done ? 'task-list-widget__item is-done' : 'task-list-widget__item';
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = task.done;
        checkbox.addEventListener('change', () => {
          const settings = readSettings();
          const savedTask = settings.tasks.find((entry) => entry.id === task.id);
          if (savedTask) savedTask.done = checkbox.checked;
          writeSettings(settings);
          drawTasks();
        });
        const text = document.createElement('span');
        text.textContent = task.text;
        label.append(checkbox, text);

        const remove = document.createElement('button');
        remove.className = 'task-list-widget__remove';
        remove.type = 'button';
        remove.textContent = '×';
        remove.setAttribute('aria-label', `Remove ${task.text}`);
        remove.addEventListener('click', () => {
          const settings = readSettings();
          settings.tasks = settings.tasks.filter((entry) => entry.id !== task.id);
          writeSettings(settings);
          drawTasks();
        });
        item.append(label, remove);
        list.append(item);
      });
      list.classList.toggle('task-list-widget__items--empty', tasks.length === 0);
      clearButton.hidden = !tasks.some((task) => task.done);
    };

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const text = new FormData(form).get('task').toString().trim();
      if (!text) return;
      const settings = readSettings();
      settings.tasks.push({ id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`, text, done: false });
      writeSettings(settings);
      form.reset();
      form.elements.task.focus();
      drawTasks();
    });
    clearButton.addEventListener('click', () => {
      const settings = readSettings();
      settings.tasks = settings.tasks.filter((task) => !task.done);
      writeSettings(settings);
      drawTasks();
    });

    drawTasks();
  }
}

customElements.define('task-list-widget', TaskListWidget);