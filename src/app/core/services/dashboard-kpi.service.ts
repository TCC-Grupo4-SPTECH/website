import { Injectable } from '@angular/core';

export interface DashboardKpis {
  year: number;
  sightingsComparedToPreviousYear: {
    current: number;
    previous: number;
    difference: number;
    percentage: number | null;
  };
  sightingsOutsideHabitat: {
    count: number;
    percentage: number;
  };
  sightingsInAffectedAreas: {
    count: number;
    percentage: number;
  };
  totalAnnualSightings: number;
}

interface DashboardKpiResponse {
  data: DashboardKpis;
}

@Injectable({ providedIn: 'root' })
export class DashboardKpiService {
  async getGeneralKpis(): Promise<DashboardKpis> {
    const response = await fetch('/dashboard/general/kpi');
    if (!response.ok) throw new Error(`Could not load dashboard KPIs (${response.status})`);
    return (await response.json() as DashboardKpiResponse).data;
  }
}
