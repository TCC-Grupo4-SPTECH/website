import { Injectable } from '@angular/core';

export interface DeforestationProperties {
  num_areas?: number;
  ano_inicial?: number;
  ano_final?: number;
}

export type SightingFeature = GeoJSON.Feature<GeoJSON.Geometry, DeforestationProperties>;
export type SightingFeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Geometry, DeforestationProperties>;

/** Contract for the GeoJSON endpoint used by the map. */
@Injectable({ providedIn: 'root' })
export class SightingGeoJsonService {
  private readonly geoJsonUrl = '/dashboard/map?layer=deforestation';

  getSightingsGeoJson(): Promise<SightingFeatureCollection> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL('./sighting-geojson.worker', import.meta.url), { type: 'module' });
      worker.onmessage = ({ data }: MessageEvent<{ collection?: SightingFeatureCollection; error?: string }>) => {
        worker.terminate();
        if (data.error || !data.collection) {
          reject(new Error(data.error ?? 'Invalid GeoJSON response'));
          return;
        }
        resolve(data.collection);
      };
      worker.onerror = () => {
        worker.terminate();
        reject(new Error('Could not load deforestation data'));
      };
      // Workers resolve relative URLs from their own bundle, so send an absolute API URL.
      worker.postMessage(new URL(this.geoJsonUrl, document.baseURI).href);
    });
  }
}
