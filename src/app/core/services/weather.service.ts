import { Injectable } from '@angular/core';

export interface WeatherPoint {
  location: {
    name: string;
    lat: number;
    lon: number;
  };
  current: {
    temp_c: number;
    chance_of_rain: number;
    condition: {
      text: string;
      icon: string;
    };
  };
}

export interface WeatherForecastPoint extends WeatherPoint {
  forecast: {
    forecastday: Array<{
      date: string;
      day: {
        avgtemp_c: number;
        maxwind_kph: number;
        daily_chance_of_rain: number;
        condition: {
          text: string;
          icon: string;
        };
      };
    }>;
  };
}

interface WeatherResponse {
  data: Record<string, WeatherPoint>;
}

@Injectable({ providedIn: 'root' })
export class WeatherService {
  async getCurrentWeather(coordinates: ReadonlyArray<readonly [number, number]>): Promise<WeatherPoint[]> {
    const params = new URLSearchParams();
    coordinates.forEach(([latitude, longitude]) => params.append('coordinates', `${latitude},${longitude}`));

    const response = await fetch(`/dashboard/weather/current?${params}`);
    if (!response.ok) throw new Error(`Could not load weather (${response.status})`);
    return Object.values((await response.json() as WeatherResponse).data);
  }

  async getForecast(coordinates: readonly [number, number], days = 3): Promise<WeatherForecastPoint | null> {
    const params = new URLSearchParams({ coordinates: `${coordinates[0]},${coordinates[1]}`, days: String(days) });
    const response = await fetch(`/dashboard/weather/current?${params}`);
    if (!response.ok) throw new Error(`Could not load forecast (${response.status})`);
    return Object.values((await response.json() as { data: Record<string, WeatherForecastPoint> }).data)[0] ?? null;
  }
}
