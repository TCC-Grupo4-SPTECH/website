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

interface SightingImagesResponse {
  urls: string[];
}

const MAX_CACHED_SIGHTINGS = 100;

export interface CameraSightingsByDate {
  data: string;
  avistamentos: string[];
}

function isSightingImagesResponse(payload: unknown): payload is SightingImagesResponse {
  return (
    typeof payload === 'object'
    && payload !== null
    && 'urls' in payload
    && Array.isArray(payload.urls)
    && payload.urls.every((url: unknown) => typeof url === 'string' && url.trim().length > 0)
  );
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
  private readonly sightingImagesCache = new Map<string, string[]>();
  private readonly sightingImagesRequests = new Map<string, Promise<string[]>>();

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

  async getSightingImages(cameraId: string, date: string, sightingId: string): Promise<string[]> {
    const cacheKey = JSON.stringify([cameraId, date, sightingId]);
    const cachedUrls = this.sightingImagesCache.get(cacheKey);
    if (cachedUrls) {
      this.sightingImagesCache.delete(cacheKey);
      this.sightingImagesCache.set(cacheKey, cachedUrls);
      return [...cachedUrls];
    }

    const pendingRequest = this.sightingImagesRequests.get(cacheKey);
    if (pendingRequest) return [...(await pendingRequest)];

    const request = this.fetchSightingImages(cameraId, date, sightingId);
    this.sightingImagesRequests.set(cacheKey, request);

    try {
      const urls = await request;
      if (this.sightingImagesCache.size >= MAX_CACHED_SIGHTINGS) {
        const oldestEntry = this.sightingImagesCache.keys().next();
        if (!oldestEntry.done) this.sightingImagesCache.delete(oldestEntry.value);
      }
      this.sightingImagesCache.set(cacheKey, urls);
      return [...urls];
    } finally {
      this.sightingImagesRequests.delete(cacheKey);
    }
  }

  private async fetchSightingImages(cameraId: string, date: string, sightingId: string): Promise<string[]> {
    const path = [cameraId, date, sightingId].map((segment) => encodeURIComponent(segment)).join('/');
    const response = await fetch(`/listagem-imagens/${path}`);
    if (!response.ok) {
      throw new Error(`Could not load images for sighting "${sightingId}" (${response.status})`);
    }

    const payload: unknown = await response.json();
    if (!isSightingImagesResponse(payload)) {
      throw new Error('Invalid sighting images response');
    }

    return payload.urls.map((url) => url.trim());
  }

  /** Mock stand-in for the real "save sighting" API. */
  submit(_submission: SightingSubmission): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 800));
  }
}