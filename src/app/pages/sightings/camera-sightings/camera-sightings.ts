import { NgOptimizedImage } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CAMERAS, formatSightingDate, SIGHTINGS_BY_CAMERA } from '../sightings.mock';

@Component({
  selector: 'app-camera-sightings',
  imports: [NgOptimizedImage, RouterLink],
  templateUrl: './camera-sightings.html',
  styleUrl: './camera-sightings.scss',
})
export class CameraSightings {
  private readonly route = inject(ActivatedRoute);
  private readonly cameraId = this.route.snapshot.paramMap.get('cameraId');
  protected readonly camera = signal(
    this.cameraId
      ? CAMERAS.find((item) => item.id === this.cameraId)
        ?? { id: this.cameraId, name: this.cameraId, location: this.cameraId, region: '', sightingCount: 0, latestSighting: '' }
      : null,
  );
  protected readonly dateGroups = computed(() => {
    const camera = this.camera();
    return camera
      ? (SIGHTINGS_BY_CAMERA[camera.id] ?? []).map((group) => ({
          ...group,
          label: formatSightingDate(group.date),
        }))
      : [];
  });
  protected readonly totalSightings = computed(() =>
    this.dateGroups().reduce((total, group) => total + group.sightings.length, 0),
  );
}
