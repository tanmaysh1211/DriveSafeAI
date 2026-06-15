package com.drivesafe.service;

import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalTime;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class WeatherService {

    private final RestTemplate restTemplate;

    @Value("${openweathermap.api.key}")
    private String owmApiKey;

    // Free current weather endpoint — no card needed, 1M calls/month
    private static final String OWM_URL =
            "https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={key}&units=metric";

    public WeatherService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    // ─────────────────────────────────────────────────────────────────
    // MAIN — fetch weather at trip start lat/lng
    // Returns WeatherInfo: condition string + isDaytime boolean
    // Called by TripService before persisting the trip
    // ─────────────────────────────────────────────────────────────────
    public WeatherInfo getWeatherAtLocation(double lat, double lng) {
        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(
                    OWM_URL, Map.class, lat, lng, owmApiKey);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return parseWeatherResponse(response.getBody());
            }

        } catch (Exception e) {
            log.warn("OpenWeatherMap call failed for ({}, {}): {}", lat, lng, e.getMessage());
        }

        // Fallback: assume clear daytime if API is unreachable
        return new WeatherInfo("Clear", isCurrentlyDaytime());
    }

    // ─────────────────────────────────────────────────────────────────
    // PARSE OWM response into clean WeatherInfo object
    // OWM response structure:
    //   weather[0].main  → "Rain", "Clear", "Clouds", "Snow", "Fog" etc.
    //   sys.sunrise      → Unix timestamp
    //   sys.sunset       → Unix timestamp
    //   dt               → current Unix timestamp
    // ─────────────────────────────────────────────────────────────────
    @SuppressWarnings("unchecked")
    private WeatherInfo parseWeatherResponse(Map<String, Object> body) {

        // Extract main weather condition
        String condition = "Clear";
        try {
            List<Map<String, Object>> weatherList =
                    (List<Map<String, Object>>) body.get("weather");
            if (weatherList != null && !weatherList.isEmpty()) {
                Object main = weatherList.get(0).get("main");
                if (main != null) condition = main.toString();
            }
        } catch (Exception e) {
            log.debug("Could not parse weather condition: {}", e.getMessage());
        }

        // Determine daytime using sunrise/sunset Unix timestamps
        boolean isDaytime = true;
        try {
            Map<String, Object> sys = (Map<String, Object>) body.get("sys");
            Object dtObj      = body.get("dt");
            Object sunriseObj = sys != null ? sys.get("sunrise") : null;
            Object sunsetObj  = sys != null ? sys.get("sunset")  : null;

            if (dtObj != null && sunriseObj != null && sunsetObj != null) {
                long dt      = Long.parseLong(dtObj.toString());
                long sunrise = Long.parseLong(sunriseObj.toString());
                long sunset  = Long.parseLong(sunsetObj.toString());
                isDaytime = dt >= sunrise && dt <= sunset;
            }
        } catch (Exception e) {
            log.debug("Could not determine daytime: {}", e.getMessage());
            isDaytime = isCurrentlyDaytime();
        }

        return new WeatherInfo(normaliseCondition(condition), isDaytime);
    }

    // ─────────────────────────────────────────────────────────────────
    // NORMALISE OWM weather codes to readable strings
    // Used in DRISC scoring and AI prompt building
    // ─────────────────────────────────────────────────────────────────
    private String normaliseCondition(String owmMain) {
        return switch (owmMain.toLowerCase()) {
            case "clear"        -> "Clear Weather";
            case "clouds"       -> "Cloudy";
            case "rain",
                 "drizzle"      -> "Rainy";
            case "thunderstorm" -> "Thunderstorm";
            case "snow"         -> "Snowy";
            case "mist",
                 "fog",
                 "haze"         -> "Foggy";
            default             -> owmMain;
        };
    }

    // Local-time daytime proxy (6 AM – 8 PM) used when OWM is unavailable
    private boolean isCurrentlyDaytime() {
        LocalTime now = LocalTime.now();
        return now.isAfter(LocalTime.of(6, 0)) && now.isBefore(LocalTime.of(20, 0));
    }

    // ─────────────────────────────────────────────────────────────────
    // INNER DTO — weather result returned to TripService
    // ─────────────────────────────────────────────────────────────────
    @Getter
    public static class WeatherInfo {
        private final String condition;
        private final boolean daytime;

        public WeatherInfo(String condition, boolean daytime) {
            this.condition = condition;
            this.daytime = daytime;
        }

        public boolean isDaytime() {
            return daytime;
        }
    }
}