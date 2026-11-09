import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CameraSightingsByDate, SightingService } from '../../../core/services/sighting.service';

interface SightingImagesState {
  expanded: boolean;
  status: 'loading' | 'loaded' | 'error';
  urls: string[];
}

@Component({
  selector: 'app-camera-sightings',
  imports: [RouterLink],
  templateUrl: './camera-sightings.html',
  styleUrl: './camera-sightings.scss',
})
export class CameraSightings implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly sightingService = inject(SightingService);
  protected readonly cameraId = this.route.snapshot.paramMap.get('cameraId');
  protected readonly dates = signal<CameraSightingsByDate[]>([]);
  protected readonly sightingImages = signal<Record<string, SightingImagesState>>({});
  protected readonly isLoading = signal(true);
  protected readonly loadFailed = signal(false);

  ngOnInit(): void {
    void this.loadDates();
  }

  protected async loadDates(): Promise<void> {
    if (!this.cameraId) {
      this.isLoading.set(false);
      this.loadFailed.set(true);
      return;
    }

    this.isLoading.set(true);
    this.loadFailed.set(false);
    this.sightingImages.set({});

    try {
      this.dates.set(await this.sightingService.getCameraDates(this.cameraId));
    } catch (error) {
      console.error(`Could not load sighting dates for camera "${this.cameraId}".`, error);
      this.loadFailed.set(true);
    } finally {
      this.isLoading.set(false);
    }
  }

  protected formatDate(date: string): string {
    const dateToFormat = /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T12:00:00Z` : date;
    const parsedDate = new Date(dateToFormat);
    if (Number.isNaN(parsedDate.getTime())) return date;

    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(parsedDate);
  }

  protected getImagesState(date: string, sightingId: string): SightingImagesState | undefined {
    return this.sightingImages()[this.getSelectionKey(date, sightingId)];
  }

  protected toggleSighting(date: string, sightingId: string): void {
    const key = this.getSelectionKey(date, sightingId);
    const current = this.sightingImages()[key];

    if (current?.expanded) {
      this.updateImagesState(key, { ...current, expanded: false });
      return;
    }

    if (current?.status === 'loaded' || current?.status === 'loading') {
      this.updateImagesState(key, { ...current, expanded: true });
      return;
    }

    void this.loadSightingImages(date, sightingId);
  }

  protected async loadSightingImages(date: string, sightingId: string): Promise<void> {
    if (!this.cameraId) return;

    const key = this.getSelectionKey(date, sightingId);
    this.updateImagesState(key, { expanded: true, status: 'loading', urls: [] });

    try {
      const urls = await this.sightingService.getSightingImages(this.cameraId, date, sightingId);
      const expanded = this.sightingImages()[key]?.expanded ?? true;
      this.updateImagesState(key, { expanded, status: 'loaded', urls });
    } catch (error) {
      console.error(`Could not load images for sighting "${sightingId}".`, error);
      const expanded = this.sightingImages()[key]?.expanded ?? true;
      this.updateImagesState(key, { expanded, status: 'error', urls: [] });
    }
  }

  private updateImagesState(key: string, state: SightingImagesState): void {
    this.sightingImages.update((current) => ({ ...current, [key]: state }));
  }

  private getSelectionKey(date: string, sightingId: string): string {
    return `${date}:${sightingId}`;
  }
}
