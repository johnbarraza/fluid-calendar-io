import { logger } from "@/lib/logger";

const LOG_SOURCE = "FitbitClient";

const FITBIT_API_BASE = "https://api.fitbit.com/1";

export interface FitbitActivityData {
  activities: Array<{
    activityId: number;
    name: string;
    description: string;
    calories: number;
    duration: number;
    distance?: number;
  }>;
  summary: {
    steps: number;
    distance: number;
    calories: number;
    activeScore: number;
    floors?: number;
    elevation?: number;
  };
}

export interface FitbitSleepData {
  sleep: Array<{
    dateOfSleep: string;
    startTime: string;
    endTime: string;
    duration: number;
    efficiency: number;
    minutesAsleep: number;
    minutesAwake: number;
    timeInBed: number;
    levels?: {
      summary?: {
        deep?: { minutes: number };
        light?: { minutes: number };
        rem?: { minutes: number };
        wake?: { minutes: number };
      };
    };
  }>;
}

export interface FitbitHeartRateData {
  "activities-heart": Array<{
    dateTime: string;
    value: {
      customHeartRateZones?: Array<unknown>;
      heartRateZones?: Array<{
        name: string;
        min: number;
        max: number;
        minutes: number;
      }>;
      restingHeartRate?: number;
    };
  }>;
  "activities-heart-intraday"?: {
    dataset: Array<{
      time: string;
      value: number;
    }>;
  };
}

export interface FitbitHRVData {
  hrv: Array<{
    dateTime: string;
    value: {
      dailyRmssd: number;
      deepRmssd: number;
    };
  }>;
}

/**
 * Fitbit API Client
 */
export class FitbitClient {
  constructor(private accessToken: string) { }

  /**
   * Make authenticated request to Fitbit API
   */
  private async request<T>(endpoint: string): Promise<T> {
    const url = `${FITBIT_API_BASE}${endpoint}`;

    logger.info("Making Fitbit API request", { endpoint }, LOG_SOURCE);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Accept-Language": "es_ES",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error(
        "Fitbit API request failed",
        { endpoint, status: response.status, error },
        LOG_SOURCE
      );

      // Check if token expired
      if (response.status === 401) {
        throw new Error("FITBIT_TOKEN_EXPIRED");
      }

      throw new Error(`Fitbit API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data as T;
  }

  /**
   * Get daily activity summary
   * https://dev.fitbit.com/build/reference/web-api/activity/get-daily-activity-summary/
   */
  async getDailyActivity(date: string): Promise<FitbitActivityData> {
    return this.request<FitbitActivityData>(
      `/user/-/activities/date/${date}.json`
    );
  }

  /**
   * Get sleep data for a single date
   * https://dev.fitbit.com/build/reference/web-api/sleep/get-sleep-log-by-date/
   */
  async getSleep(date: string): Promise<FitbitSleepData> {
    return this.request<FitbitSleepData>(`/1.2/user/-/sleep/date/${date}.json`);
  }

  /**
   * Get sleep data for a date range (more efficient for bulk sync)
   * https://dev.fitbit.com/build/reference/web-api/sleep/get-sleep-log-by-date-range/
   * Max range: 100 days
   */
  async getSleepRange(startDate: string, endDate: string): Promise<FitbitSleepData> {
    return this.request<FitbitSleepData>(
      `/1.2/user/-/sleep/date/${startDate}/${endDate}.json`
    );
  }

  /**
   * Get heart rate data
   * https://dev.fitbit.com/build/reference/web-api/heart-rate-timeseries/get-heart-rate-timeseries-by-date/
   */
  async getHeartRate(date: string): Promise<FitbitHeartRateData> {
    return this.request<FitbitHeartRateData>(
      `/user/-/activities/heart/date/${date}/1d.json`
    );
  }

  /**
   * Get Heart Rate Variability (HRV) data for a single date
   * https://dev.fitbit.com/build/reference/web-api/heart-rate-variability/
   */
  async getHRV(date: string): Promise<FitbitHRVData> {
    return this.request<FitbitHRVData>(`/user/-/hrv/date/${date}.json`);
  }

  /**
   * Get Heart Rate Variability (HRV) data for a date range
   */
  async getHRVRange(startDate: string, endDate: string): Promise<FitbitHRVData> {
    return this.request<FitbitHRVData>(
      `/user/-/hrv/date/${startDate}/${endDate}.json`
    );
  }

  /**
   * Get user profile
   * https://dev.fitbit.com/build/reference/web-api/user/get-profile/
   */
  async getProfile() {
    return this.request(`/user/-/profile.json`);
  }

  /**
   * Get activity time series (steps, distance, calories, etc.)
   * https://dev.fitbit.com/build/reference/web-api/activity-timeseries/get-activity-timeseries-by-date/
   */
  async getActivityTimeSeries(
    resource: "steps" | "distance" | "calories" | "floors",
    startDate: string,
    endDate: string
  ) {
    return this.request(
      `/user/-/activities/${resource}/date/${startDate}/${endDate}.json`
    );
  }
}
