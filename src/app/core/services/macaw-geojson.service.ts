import { Injectable } from '@angular/core';

export interface MacawProperties {
  id: string;
  timestamp: string;
  yolo_model: string;
  yolo_confidence_avg: string;
  qtd_individuos: string;
  urlimg: string;
  year: number;
  species: string;
}

export type MacawFeature = GeoJSON.Feature<GeoJSON.Point, MacawProperties>;
export type MacawFeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Point, MacawProperties>;

interface MacawResponse {
  data: MacawFeatureCollection;
}

@Injectable({ providedIn: 'root' })
export class MacawGeoJsonService {
  async getMacaws(): Promise<MacawFeatureCollection> {
    const response = await fetch('/dashboard/map/macaw');
    if (!response.ok) throw new Error(`Could not load macaw map data (${response.status})`);
    return (await response.json() as MacawResponse).data;
  }
}
