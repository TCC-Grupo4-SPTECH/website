import { Injectable } from '@angular/core';

export interface MonthlySightings {
  month: number;
  currentYear: number;
  previousYear: number;
  historicalAverage: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardHistoryService {
  async getGeneralHistory(): Promise<MonthlySightings[]> {
    const response = await fetch('/dashboard/general/history');
    if (!response.ok) throw new Error(`Could not load dashboard history (${response.status})`);
    const payload = await response.json();
    if (!Array.isArray(payload.data) || !payload.data.length || !payload.data.every(
      (entry: MonthlySightings) => entry && Number.isInteger(entry.month) && entry.month >= 1 && entry.month <= 12
        && [entry.currentYear, entry.previousYear, entry.historicalAverage].every(value => Number.isFinite(value) && value >= 0),
    )) throw new Error('Invalid dashboard history');
    return payload.data;
  }
}
