import { Injectable } from '@angular/core';

export interface SightingSubmission {
  file: File;
  latitude: number;
  longitude: number;
  date: Date;
}

interface CameraListResponse {
  cameras: string[];
}

function isCameraListResponse(payload: unknown): payload is CameraListResponse {
  return (
    typeof payload === 'object'
    && payload !== null
    && 'cameras' in payload
    && Array.isArray(payload.cameras)
    && payload.cameras.every((camera: unknown) => typeof camera === 'string' && camera.trim().length > 0)
  );
}

@Injectable({ providedIn: 'root' })
export class SightingService {
  async getCameras(): Promise<string[]> {
    const response = await fetch('/listagem-cameras');
    if (!response.ok) {
      throw new Error(`Could not load cameras (${response.status})`);
    }

    const payload: unknown = await response.json();
    if (!isCameraListResponse(payload)) {
      throw new Error('Invalid camera list response');
    }

    return payload.cameras.map((camera) => camera.trim());
  }

  /** Mock stand-in for the real "save sighting" API. */
  submit(_submission: SightingSubmission): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 800));
  }
}