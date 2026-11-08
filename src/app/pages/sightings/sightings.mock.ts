export interface CameraSummary {
  id: string;
  name: string;
  location: string;
  region: string;
  sightingCount: number;
  latestSighting: string;
}

export interface SightingRecord {
  id: string;
  time: string;
  images: number[];
}

export interface SightingDateGroup {
  date: string;
  sightings: SightingRecord[];
}

export const CAMERAS: CameraSummary[] = [
  {
    id: 'cam-01',
    name: 'Câmera 01',
    location: 'Ninho do Ipê',
    region: 'Pantanal · Mato Grosso do Sul',
    sightingCount: 128,
    latestSighting: '2026-11-08T07:42:00',
  },
  {
    id: 'cam-02',
    name: 'Câmera 02',
    location: 'Baía das Araras',
    region: 'Pantanal · Mato Grosso do Sul',
    sightingCount: 96,
    latestSighting: '2026-11-07T16:18:00',
  },
  {
    id: 'cam-03',
    name: 'Câmera 03',
    location: 'Mata Ciliar',
    region: 'Pantanal · Mato Grosso',
    sightingCount: 74,
    latestSighting: '2026-11-06T09:05:00',
  },
  {
    id: 'cam-04',
    name: 'Câmera 04',
    location: 'Refúgio do Buriti',
    region: 'Pantanal · Mato Grosso do Sul',
    sightingCount: 53,
    latestSighting: '2026-11-05T14:31:00',
  },
];

export const SIGHTINGS_BY_CAMERA: Record<string, SightingDateGroup[]> = {
  'cam-01': [
    {
      date: '2026-11-08',
      sightings: [
        { id: 'AV-2026-1108-001', time: '07:42', images: [1, 2, 3] },
        { id: 'AV-2026-1108-002', time: '06:18', images: [1, 2] },
      ],
    },
    {
      date: '2026-11-07',
      sightings: [
        { id: 'AV-2026-1107-014', time: '16:05', images: [1, 2, 3, 4] },
        { id: 'AV-2026-1107-009', time: '11:32', images: [1, 2] },
      ],
    },
    {
      date: '2026-11-06',
      sightings: [{ id: 'AV-2026-1106-006', time: '08:14', images: [1, 2, 3] }],
    },
  ],
  'cam-02': [
    {
      date: '2026-11-07',
      sightings: [
        { id: 'AV-2026-1107-021', time: '16:18', images: [1, 2, 3] },
        { id: 'AV-2026-1107-017', time: '14:52', images: [1, 2] },
      ],
    },
    {
      date: '2026-11-05',
      sightings: [{ id: 'AV-2026-1105-008', time: '09:26', images: [1, 2, 3, 4] }],
    },
  ],
  'cam-03': [
    {
      date: '2026-11-06',
      sightings: [{ id: 'AV-2026-1106-031', time: '09:05', images: [1, 2, 3] }],
    },
    {
      date: '2026-11-04',
      sightings: [
        { id: 'AV-2026-1104-012', time: '15:40', images: [1, 2] },
        { id: 'AV-2026-1104-004', time: '07:11', images: [1, 2, 3] },
      ],
    },
  ],
  'cam-04': [
    {
      date: '2026-11-05',
      sightings: [{ id: 'AV-2026-1105-026', time: '14:31', images: [1, 2] }],
    },
    {
      date: '2026-11-02',
      sightings: [{ id: 'AV-2026-1102-018', time: '10:03', images: [1, 2, 3] }],
    },
  ],
};

export function formatSightingDate(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`));
}
