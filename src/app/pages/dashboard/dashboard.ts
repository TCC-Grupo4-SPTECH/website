import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, computed, inject, signal } from '@angular/core';
import * as L from 'leaflet';
import { Chart, LineController, LineElement, PointElement, CategoryScale, LinearScale, Legend, Tooltip, Plugin } from 'chart.js';
import { DashboardHistoryService } from '../../core/services/dashboard-history.service';
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

Chart.register(LineController, LineElement, PointElement, CategoryScale, LinearScale, Legend, Tooltip);

const breedingSeasonPlugin: Plugin<'line'> = {
  id: 'breedingSeason',
  afterDraw(chart) {
    const x = chart.scales['x'];
    if (!x) return;
    const start = x.getPixelForValue(6);
    const end = x.getPixelForValue(11);
    const y = x.bottom + 8;
    const ctx = chart.ctx;
    ctx.save();
    ctx.strokeStyle = '#d89d28';
    ctx.fillStyle = '#d9c891';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(start, y - 6);
    ctx.lineTo(start, y);
    ctx.lineTo(end, y);
    ctx.lineTo(end, y - 6);
    ctx.stroke();
    ctx.font = '11px Georgia';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Época de acasalamento', (start + end) / 2, y + 5);
    ctx.restore();
  },
};

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements AfterViewInit, OnDestroy {
  @ViewChild('mapElement') private readonly mapElement?: ElementRef<HTMLDivElement>;
  @ViewChild('chartCanvas') private readonly chartCanvas?: ElementRef<HTMLCanvasElement>;
  protected readonly isLoadingHistory = signal(true);
  protected readonly historyLoadFailed = signal(false);
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
  protected readonly environmentalKpis = computed(() => ({
    deforestationGrowth: this.dashboardKpis()?.deforestationGrowth ?? { percentage: 12.4, mocked: true },
    fireTrend: this.dashboardKpis()?.fireTrend ?? { trend: 'increase', mocked: true },
  }));
  private readonly macawGeoJsonService = inject(MacawGeoJsonService);
  private readonly sightingGeoJsonService = inject(SightingGeoJsonService);
  private readonly dashboardKpiService = inject(DashboardKpiService);
  private readonly weatherService = inject(WeatherService);
  private readonly dashboardHistoryService = inject(DashboardHistoryService);
  private historyChart?: Chart<'line', (number | null)[], string>;

  private map?: L.Map;
  private macawLayer?: L.GeoJSON;
  private sightingLayer?: L.GeoJSON;
  private sightingRenderer?: L.Renderer;
  private weatherLayer?: L.LayerGroup;
  private destroyed = false;

  ngAfterViewInit(): void {
    this.createMap();
    this.createHistoryChart();
    void this.loadHistory();
    void this.loadDashboardKpis();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.map?.remove();
    this.historyChart?.destroy();
  }

  protected async loadHistory(): Promise<void> {
    this.isLoadingHistory.set(true);
    this.historyLoadFailed.set(false);
    try {
      const history = await this.dashboardHistoryService.getGeneralHistory();
      if (this.destroyed || !this.historyChart) return;
      const byMonth = new Map(history.map(entry => [entry.month, entry]));
      const series = ['currentYear', 'previousYear', 'historicalAverage'] as const;
      series.forEach((key, index) => {
        this.historyChart!.data.datasets[index].data = Array.from({ length: 12 }, (_, month) => byMonth.get(month + 1)?.[key] ?? null);
      });
      this.historyChart.update();
    } catch {
      if (!this.destroyed) this.historyLoadFailed.set(true);
    } finally {
      if (!this.destroyed) this.isLoadingHistory.set(false);
    }
  }

  private createHistoryChart(): void {
    const canvas = this.chartCanvas?.nativeElement;
    if (!canvas) return;
    this.historyChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
        datasets: [
          { label: 'Ano atual', data: Array(12).fill(null), borderColor: '#d89d28', backgroundColor: '#d89d28', borderWidth: 3, pointRadius: 3, tension: .32 },
          { label: 'Ano passado', data: Array(12).fill(null), borderColor: '#78a7a0', backgroundColor: '#78a7a0', borderWidth: 2, pointRadius: 3, tension: .32 },
          { label: 'Média histórica', data: Array(12).fill(null), borderColor: '#a6ad96', backgroundColor: '#a6ad96', borderWidth: 2, pointRadius: 0, tension: .32 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { bottom: 35 } },
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { labels: { color: '#c8cdbd', boxWidth: 14, boxHeight: 3, padding: 16 } } },
        scales: {
          x: { ticks: { color: '#a6ad96', autoSkip: false, maxRotation: 0 }, grid: { color: '#203228' } },
          y: { beginAtZero: true, title: { display: true, text: 'Avistamentos', color: '#a6ad96' }, ticks: { color: '#a6ad96', precision: 0 }, grid: { color: '#2e3d31' } },
        },
      },
      plugins: [breedingSeasonPlugin],
    });
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
