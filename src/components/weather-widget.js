import { WidgetElement } from './widget-element.js';
import { readSettings, writeSettings } from '../storage.js';

const CONDITIONS = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Icy fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
  56: 'Freezing drizzle', 57: 'Freezing drizzle', 61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
  66: 'Freezing rain', 67: 'Freezing rain', 71: 'Light snow', 73: 'Snow', 75: 'Heavy snow',
  77: 'Snow grains', 80: 'Rain showers', 81: 'Rain showers', 82: 'Heavy showers',
  85: 'Snow showers', 86: 'Heavy snow showers', 95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Thunderstorm',
};

class WeatherWidget extends WidgetElement {
  widgetTitle = 'Weather nearby';

  render(content) {
    content.innerHTML = `
      <div class="weather-widget__body" aria-live="polite">
        <p class="weather-widget__message">Local weather is ready when you are.</p>
      </div>
      <button class="text-button weather-widget__retry" type="button">Get local weather</button>`;
    this.body = content.querySelector('.weather-widget__body');
    this.retry = content.querySelector('.weather-widget__retry');
    this.retry.addEventListener('click', () => this.loadWeather());
    const { weatherLocation } = readSettings();
    if (weatherLocation) this.loadWeather(weatherLocation);
  }

  async loadWeather(location = readSettings().weatherLocation) {
    this.retry.hidden = true;
    this.body.innerHTML = '<p class="weather-widget__message">Finding your local forecast...</p>';

    try {
      if (!location) {
        if (!navigator.geolocation) throw new Error('Location is not available in this browser.');
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, maximumAge: 600000 });
        });
        location = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        const settings = readSettings();
        settings.weatherLocation = location;
        writeSettings(settings);
      }
      const { latitude, longitude } = location;
      const url = new URL('https://api.open-meteo.com/v1/forecast');
      url.search = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m',
        temperature_unit: 'fahrenheit',
        wind_speed_unit: 'mph',
        timezone: 'auto',
      });
      const response = await fetch(url);
      if (!response.ok) throw new Error('Weather request failed');
      const data = await response.json();
      this.showWeather(data.current);
    } catch (error) {
      const message = error.message === 'Location is not available in this browser.'
        ? error.message
        : error.code === 1
        ? 'Location permission was declined.'
        : error.code === 3
          ? 'Location took too long to respond.'
          : 'The forecast could not be loaded.';
      this.showError(message);
    }
  }

  showWeather(current) {
    if (!current || typeof current.temperature_2m !== 'number') {
      this.showError('The forecast is unavailable right now.');
      return;
    }
    const description = CONDITIONS[current.weather_code] ?? 'Current conditions';
    this.body.innerHTML = `
      <div class="weather-widget__reading">
        <span class="weather-widget__temperature">${Math.round(current.temperature_2m)}<span>°F</span></span>
        <div><p class="weather-widget__condition">${description}</p><p class="weather-widget__location">Your location</p></div>
      </div>
      <dl class="weather-widget__details">
        <div><dt>Feels like</dt><dd>${Math.round(current.apparent_temperature)}°F</dd></div>
        <div><dt>Humidity</dt><dd>${Math.round(current.relative_humidity_2m)}%</dd></div>
        <div><dt>Wind</dt><dd>${Math.round(current.wind_speed_10m)} mph</dd></div>
      </dl>`;
    this.retry.hidden = false;
    this.retry.textContent = 'Refresh weather';
  }

  showError(message) {
    this.body.innerHTML = `<p class="weather-widget__message">${message}</p>`;
    this.retry.hidden = false;
    this.retry.textContent = 'Try again';
  }
}

customElements.define('weather-widget', WeatherWidget);