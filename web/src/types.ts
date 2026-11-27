export type Scenario = "slow" | "fast";

export interface FireDetection {
  id: number;
  detected_at: string;
  lat: number;
  lng: number;
  confidence: string | null;
  frp: number | null;
  satellite: string | null;
}

export interface Village {
  id: number;
  name: string | null;
  lat: number;
  lng: number;
  osm_id?: number | null;
}

export interface WindHour {
  ts: string;
  speed_ms: number;
  direction_deg: number;
}

export interface ReserveBoundary {
  id: number;
  name: string;
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: unknown;
  };
}

export interface ForecastEllipse {
  hours_since_detection: number;
  scenario: Scenario;
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
}

export interface VillageAlert {
  village_id: number;
  window_min_h: number;
  window_max_h: number;
  message: string;
}

export interface FireEventDetail {
  id: number;
  name: string;
  started_at: string;
  reserve: ReserveBoundary | null;
}