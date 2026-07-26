import { Injectable } from '@angular/core';

export interface SightingSubmission {
  file: File;
  latitude: number;
  longitude: number;
  date: Date;
}

/**
 * Mock stand-in for the real "save sighting" API.
 * Replace `submit` with an HTTP call once the backend endpoint exists.
 */
@Injectable({ providedIn: 'root' })
export class SightingService {
  submit(_submission: SightingSubmission): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 800));
  }
}
