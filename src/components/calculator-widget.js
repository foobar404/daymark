import { WidgetElement } from './widget-element.js';

function calculate(source) {
  const tokens = [];
  let position = 0;
  while (position < source.length) {
    if (/\s/.test(source[position])) {
      position += 1;
      continue;
    }
    const number = source.slice(position).match(/^(?:\d+\.?\d*|\.\d+)/);
    if (number) {
      tokens.push(Number(number[0]));
      position += number[0].length;
      continue;
    }
    const operator = source[position];
    if ('()+-*/'.includes(operator)) {
      tokens.push(operator);
      position += 1;
      continue;
    }
    throw new Error('Invalid input');
  }

  let cursor = 0;
  const parsePrimary = () => {
    const token = tokens[cursor++];
    if (token === '(') {
      const value = parseSum();
      if (tokens[cursor++] !== ')') throw new Error('Missing closing parenthesis');
      return value;
    }
    if (typeof token !== 'number') throw new Error('Expected a number');
    return token;
  };
  const parseUnary = () => {
    if (tokens[cursor] === '+') {
      cursor += 1;
      return parseUnary();
    }
    if (tokens[cursor] === '-') {
      cursor += 1;
      return -parseUnary();
    }
    return parsePrimary();
  };
  const parseProduct = () => {
    let value = parseUnary();
    while (tokens[cursor] === '*' || tokens[cursor] === '/') {
      const operator = tokens[cursor++];
      const right = parseUnary();
      if (operator === '/' && right === 0) throw new Error('Cannot divide by zero');
      value = operator === '*' ? value * right : value / right;
    }
    return value;
  };
  const parseSum = () => {
    let value = parseProduct();
    while (tokens[cursor] === '+' || tokens[cursor] === '-') {
      const operator = tokens[cursor++];
      const right = parseProduct();
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  };

  const result = parseSum();
  if (cursor !== tokens.length || !Number.isFinite(result)) throw new Error('Invalid expression');
  return Number.parseFloat(result.toPrecision(12)).toString();
}

class CalculatorWidget extends WidgetElement {
  widgetTitle = 'Calculator';

  render(content) {
    content.innerHTML = `
      <form class="calculator-widget__form">
        <label class="visually-hidden" for="calculator-display">Calculation</label>
        <input id="calculator-display" class="calculator-widget__display" type="text" inputmode="decimal" autocomplete="off" placeholder="0" aria-live="polite">
        <p class="calculator-widget__error" aria-live="polite"></p>
        <div class="calculator-widget__keys">
          <button type="button" data-value="(" aria-label="Open parenthesis">(</button>
          <button type="button" data-value=")" aria-label="Close parenthesis">)</button>
          <button type="button" data-action="backspace" aria-label="Delete last character">⌫</button>
          <button type="button" data-action="clear">AC</button>
          <button type="button" data-value="7">7</button>
          <button type="button" data-value="8">8</button>
          <button type="button" data-value="9">9</button>
          <button type="button" data-value="/">÷</button>
          <button type="button" data-value="4">4</button>
          <button type="button" data-value="5">5</button>
          <button type="button" data-value="6">6</button>
          <button type="button" data-value="*">×</button>
          <button type="button" data-value="1">1</button>
          <button type="button" data-value="2">2</button>
          <button type="button" data-value="3">3</button>
          <button type="button" data-value="-">−</button>
          <button type="button" data-value="0">0</button>
          <button type="button" data-value=".">.</button>
          <button class="calculator-widget__equals" type="submit">=</button>
          <button type="button" data-value="+">+</button>
        </div>
      </form>`;

    const form = content.querySelector('form');
    const display = content.querySelector('input');
    const error = content.querySelector('.calculator-widget__error');
    const run = () => {
      try {
        display.value = calculate(display.value);
        error.textContent = '';
      } catch (issue) {
        error.textContent = issue.message;
      }
    };
    content.querySelector('.calculator-widget__keys').addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;
      if (button.dataset.action === 'clear') {
        display.value = '';
        error.textContent = '';
      } else if (button.dataset.action === 'backspace') {
        display.value = display.value.slice(0, -1);
      } else if (button.dataset.value) {
        display.value += button.dataset.value;
        error.textContent = '';
      }
      display.focus();
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      run();
    });
    display.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        display.value = '';
        error.textContent = '';
      }
    });
  }
}

customElements.define('calculator-widget', CalculatorWidget);