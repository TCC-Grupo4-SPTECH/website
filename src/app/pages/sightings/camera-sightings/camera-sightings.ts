import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CameraSightingsByDate, SightingService } from '../../../core/services/sighting.service';

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
  protected readonly selectedSightings = signal<string[]>([]);
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
    this.selectedSightings.set([]);

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

  protected isSelected(date: string, sightingId: string): boolean {
    return this.selectedSightings().includes(this.getSelectionKey(date, sightingId));
  }

  protected toggleSighting(date: string, sightingId: string, event: Event): void {
    const key = this.getSelectionKey(date, sightingId);
    const isChecked = (event.target as HTMLInputElement).checked;

    this.selectedSightings.update((selected) =>
      isChecked ? [...selected, key] : selected.filter((item) => item !== key),
    );
  }

  private getSelectionKey(date: string, sightingId: string): string {
    return `${date}:${sightingId}`;
  }
}
