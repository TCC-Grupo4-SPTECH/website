import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import * as L from 'leaflet';
import { DashboardKpis, DashboardKpiService } from '../../core/services/dashboard-kpi.service';
import { MacawFeature, MacawFeatureCollection, MacawGeoJsonService } from '../../core/services/macaw-geojson.service';
import { SightingFeature, SightingFeatureCollection, SightingGeoJsonService } from '../../core/services/sighting-geojson.service';
import { WeatherForecastPoint, WeatherPoint, WeatherService } from '../../core/services/weather.service';

interface DailyWeather {
  day: string;
  date: string;
  temperature: number;
  windSpeed: number;
  precipitation: number;
  condition: string;
  conditionIcon: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements AfterViewInit, OnDestroy {
  @ViewChild('mapElement') private readonly mapElement?: ElementRef<HTMLDivElement>;
  protected readonly loadedSightings = signal(0);
  protected readonly loadedDeforestationAreas = signal(0);
  protected readonly weatherForecast = signal<DailyWeather[]>([]);
  protected readonly weatherLocationName = signal('Pantanal');
  protected readonly isLoadingWeatherForecast = signal(true);
  protected readonly isLoadingSightings = signal(true);
  protected readonly isLoadingDeforestation = signal(true);
  protected readonly deforestationLoadFailed = signal(false);
  protected readonly kpiLoadFailed = signal(false);
  protected readonly dashboardKpis = signal<DashboardKpis | null>(null);
  private readonly macawGeoJsonService = inject(MacawGeoJsonService);
  private readonly sightingGeoJsonService = inject(SightingGeoJsonService);
  private readonly dashboardKpiService = inject(DashboardKpiService);
  private readonly weatherService = inject(WeatherService);

  private map?: L.Map;
  private macawLayer?: L.GeoJSON;
  private sightingLayer?: L.GeoJSON;
  private sightingRenderer?: L.Renderer;
  private weatherLayer?: L.LayerGroup;
  private destroyed = false;

  ngAfterViewInit(): void {
    this.createMap();
    void this.loadDashboardKpis();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.map?.remove();
  }

  protected retryDeforestation(): void {
    if (this.isLoadingDeforestation()) return;
    this.sightingLayer?.clearLayers();
    void this.loadOriginalMapLayer();
  }

  protected formatNumber(value: number): string {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value);
  }

  protected formatPercentage(value: number | null, showPositiveSign = false): string {
    if (value === null) return '—';
    return `${showPositiveSign && value > 0 ? '+' : ''}${this.formatNumber(value)}%`;
  }

  protected formatDifference(value: number): string {
    return `${value > 0 ? '+' : ''}${this.formatNumber(value)}`;
  }

  private createMap(): void {
    const container = this.mapElement?.nativeElement;
    if (!container) return;
    this.map = L.map(container, { zoomControl: false, attributionControl: true }).setView([-14.2, -52.9], 4);
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 18,
        attribution: 'Tiles &copy; Esri',
      },
    ).addTo(this.map);
    this.addStateBoundaries();
    this.sightingRenderer = L.canvas({ padding: 0.2 });
    this.sightingLayer = L.geoJSON(undefined, {
      style: (feature) => this.getSightingStyle(feature as SightingFeature),
    }).addTo(this.map);
    this.macawLayer = L.geoJSON(undefined, {
      pointToLayer: (feature, latlng) => this.createMacawMarker(feature as MacawFeature, latlng),
    }).addTo(this.map);
    void this.loadOriginalMapLayer();
    void this.loadMacaws();
    void this.loadWeatherMarkers();
    void this.loadWeatherForecast([-18.999, -57.641], 'Corumbá');
  }

  private async loadDashboardKpis(): Promise<void> {
    try {
      const kpis = await this.dashboardKpiService.getGeneralKpis();
      if (!this.destroyed) this.dashboardKpis.set(kpis);
    } catch {
      if (!this.destroyed) this.kpiLoadFailed.set(true);
    }
  }

  private async loadWeatherMarkers(): Promise<void> {
    const pantanalCoordinates = [
      [-18.999, -57.641],
      [-19.6, -56.95],
      [-20.3, -56.7],
      [-18.4, -56.1],
    ] as const;

    try {
      const weatherPoints = await this.weatherService.getCurrentWeather(pantanalCoordinates);
      if (this.destroyed || !this.map) return;

      this.weatherLayer = L.layerGroup(weatherPoints.map((weather) => this.createWeatherMarker(weather))).addTo(this.map);
    } catch {
      // Weather indicators are supplemental; leave the map usable if the service is unavailable.
    }
  }

  private async loadWeatherForecast(coordinates: readonly [number, number], locationName: string): Promise<void> {
    this.isLoadingWeatherForecast.set(true);
    try {
      const forecast = await this.weatherService.getForecast(coordinates);
      if (this.destroyed || !forecast) return;
      this.weatherLocationName.set(forecast.location.name || locationName);
      this.weatherForecast.set(this.toDailyForecast(forecast));
    } catch {
      this.weatherForecast.set([]);
    } finally {
      if (!this.destroyed) this.isLoadingWeatherForecast.set(false);
    }
  }

  private toDailyForecast(weather: WeatherForecastPoint): DailyWeather[] {
    return weather.forecast.forecastday.map((forecastDay, index) => {
      const date = new Date(`${forecastDay.date}T12:00:00`);
      return {
        day: index === 0 ? 'Hoje' : new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', ''),
        date: new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(date),
        temperature: Math.round(forecastDay.day.avgtemp_c),
        windSpeed: Math.round(forecastDay.day.maxwind_kph),
        precipitation: Math.round(forecastDay.day.daily_chance_of_rain),
        condition: forecastDay.day.condition.text,
        conditionIcon: this.normalizeWeatherIcon(forecastDay.day.condition.icon),
      };
    });
  }

  private normalizeWeatherIcon(icon: string): string {
    return icon.startsWith('//') ? `https:${icon}` : icon;
  }

  private createWeatherMarker(weather: WeatherPoint): L.Marker {
    const temperature = Math.round(weather.current.temp_c);
    const rainChance = Math.round(weather.current.chance_of_rain);
    const conditionIcon = this.normalizeWeatherIcon(weather.current.condition.icon);
    const icon = L.divIcon({
      className: 'weather-marker',
      html: `<span class="weather-marker__badge"><b>${temperature}°</b><small><img src="${conditionIcon}" alt="">${rainChance}%</small></span>`,
      iconAnchor: [43, 17],
    });

    return L.marker([weather.location.lat, weather.location.lon], { icon, keyboard: false })
      .bindTooltip(`${weather.location.name}: ${weather.current.condition.text}`, { direction: 'top', offset: [0, -18] })
      .on('click', () => void this.loadWeatherForecast([weather.location.lat, weather.location.lon], weather.location.name));
  }

  private addStateBoundaries(): void {
    fetch('brazil-states.geojson')
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((boundaries: GeoJSON.GeoJsonObject) => {
        if (!this.map) return;
        L.geoJSON(boundaries, {
          interactive: false,
          style: { color: '#fff4cb', weight: 1.5, opacity: 0.95, fill: false },
        }).addTo(this.map);
      })
      .catch(() => undefined);
  }

  private async loadMacaws(): Promise<void> {
    try {
      const collection = await this.macawGeoJsonService.getMacaws();
      if (this.destroyed || !this.macawLayer) return;
      this.macawLayer.addData(collection);
      this.loadedSightings.set(collection.features.length);
      const bounds = this.macawLayer.getBounds();
      if (bounds.isValid()) this.map?.fitBounds(bounds, { padding: [18, 18], maxZoom: 7 });
    } catch {
      // Keep the base map available if macaw data cannot be loaded.
    } finally {
      if (!this.destroyed) this.isLoadingSightings.set(false);
    }
  }

  private async loadOriginalMapLayer(): Promise<void> {
    this.isLoadingDeforestation.set(true);
    this.deforestationLoadFailed.set(false);
    this.loadedDeforestationAreas.set(0);

    try {
      const collection = await this.sightingGeoJsonService.getSightingsGeoJson();
      if (this.destroyed || !this.sightingLayer) return;
      await this.addOriginalFeaturesInBatches(collection);
      if (!this.destroyed) this.loadedDeforestationAreas.set(collection.features.length);
    } catch {
      if (!this.destroyed) this.deforestationLoadFailed.set(true);
      // The live macaw markers remain available if the deforestation layer cannot be read.
    } finally {
      if (!this.destroyed) this.isLoadingDeforestation.set(false);
    }
  }

  private addOriginalFeaturesInBatches(collection: SightingFeatureCollection): Promise<void> {
    const batchSize = 40;
    let index = 0;
    return new Promise((resolve) => {
      const addNextBatch = (): void => {
        if (this.destroyed || !this.sightingLayer) {
          resolve();
          return;
        }

      const batch = collection.features.slice(index, index + batchSize);
      this.sightingLayer.addData({ type: 'FeatureCollection', features: batch } as SightingFeatureCollection);
      index += batch.length;
        if (index < collection.features.length) {
          requestAnimationFrame(addNextBatch);
          return;
        }

        resolve();
      };
      requestAnimationFrame(addNextBatch);
    });
  }

  private getSightingStyle(feature: SightingFeature): L.PathOptions {
    const intensity = feature.properties.num_areas ?? 1;
    return {
      color: '#e78965',
      fillColor: '#cf6043',
      fillOpacity: Math.min(0.75, 0.28 + intensity * 0.04),
      weight: 1,
      renderer: this.sightingRenderer,
    };
  }

  private createMacawMarker(feature: MacawFeature, latlng: L.LatLng): L.CircleMarker {
    const { properties } = feature;
    const confidence = `${Math.round(Number(properties.yolo_confidence_avg) * 100)}%`;
    const detectedAt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(properties.timestamp));
    const popup = `<article class="macaw-popup"><img src="${this.escapeHtml(properties.urlimg)}" alt="Registro de arara-azul"><div><strong>Arara-azul</strong><span>${this.escapeHtml(properties.qtd_individuos)} indivíduos</span><span>Confiança: ${confidence}</span><span>${detectedAt}</span></div></article>`;

    const marker = L.circleMarker(latlng, { radius: 5, color: '#c8ebff', weight: 2, fillColor: '#1976d2', fillOpacity: 0.95 })
      .bindPopup(popup, { closeButton: false, offset: [0, -4], className: 'macaw-popup-container' });
    marker.on('mouseover', () => marker.openPopup());
    marker.on('mouseout', () => marker.closePopup());
    return marker;
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character);
  }

}
