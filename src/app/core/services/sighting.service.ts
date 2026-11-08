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

interface CameraDatesResponse {
  datas: CameraSightingsByDate[];
}

export interface CameraSightingsByDate {
  data: string;
  avistamentos: string[];
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

function isCameraDatesResponse(payload: unknown): payload is CameraDatesResponse {
  return (
    typeof payload === 'object'
    && payload !== null
    && 'datas' in payload
    && Array.isArray(payload.datas)
    && payload.datas.every(
      (entry: unknown) =>
        typeof entry === 'object'
        && entry !== null
        && 'data' in entry
        && typeof entry.data === 'string'
        && entry.data.trim().length > 0
        && 'avistamentos' in entry
        && Array.isArray(entry.avistamentos)
        && entry.avistamentos.every(
          (sightingId: unknown) => typeof sightingId === 'string' && sightingId.trim().length > 0,
        ),
    )
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

  async getCameraDates(cameraId: string): Promise<CameraSightingsByDate[]> {
    const response = await fetch(`/listagem-datas/${encodeURIComponent(cameraId)}`);
    if (!response.ok) {
      throw new Error(`Could not load dates for camera "${cameraId}" (${response.status})`);
    }

    const payload: unknown = await response.json();
    if (!isCameraDatesResponse(payload)) {
      throw new Error('Invalid camera dates response');
    }

    return payload.datas.map((entry) => ({
      data: entry.data.trim(),
      avistamentos: entry.avistamentos.map((sightingId) => sightingId.trim()),
    }));
  }

  /** Mock stand-in for the real "save sighting" API. */
  submit(_submission: SightingSubmission): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 800));
  }
}