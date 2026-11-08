import { Component, OnInit, inject, signal } from '@angular/core';
import { CameraCard } from '../camera-card/camera-card';
import { SightingService } from '../../../core/services/sighting.service';

@Component({
  selector: 'app-camera-list',
  imports: [CameraCard],
  templateUrl: './camera-list.html',
  styleUrl: './camera-list.scss',
})
export class CameraList implements OnInit {
  private readonly sightingService = inject(SightingService);
  protected readonly cameras = signal<string[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly loadFailed = signal(false);

  ngOnInit(): void {
    void this.loadCameras();
  }

  protected async loadCameras(): Promise<void> {
    this.isLoading.set(true);
    this.loadFailed.set(false);

    try {
      this.cameras.set(await this.sightingService.getCameras());
    } catch (error) {
      console.error('Could not load available cameras.', error);
      this.loadFailed.set(true);
    } finally {
      this.isLoading.set(false);
    }
  }
}
