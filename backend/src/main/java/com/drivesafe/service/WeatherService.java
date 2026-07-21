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

    private static final String OWM_URL = "https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={key}&units=metric";

    public WeatherService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public WeatherInfo getWeatherAtLocation(double lat, double lng) {
        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(OWM_URL, Map.class, lat, lng, owmApiKey);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return parseWeatherResponse(response.getBody());
            }
        } catch (Exception e) {
            log.warn("OpenWeatherMap call failed for ({}, {}): {}", lat, lng, e.getMessage());
        }
        return new WeatherInfo("Clear", isCurrentlyDaytime());
    }

    @SuppressWarnings("unchecked")
    private WeatherInfo parseWeatherResponse(Map<String, Object> body) {
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

    private String normaliseCondition(String owmMain) {
        return switch (owmMain.toLowerCase()) {
            case "clear" -> "Clear Weather";
            case "clouds" -> "Cloudy";
            case "rain",
                 "drizzle" -> "Rainy";
            case "thunderstorm" -> "Thunderstorm";
            case "snow" -> "Snowy";
            case "mist",
                 "fog",
                 "haze" -> "Foggy";
            default -> owmMain;
        };
    }

    private boolean isCurrentlyDaytime() {
        LocalTime now = LocalTime.now();
        return now.isAfter(LocalTime.of(6, 0)) && now.isBefore(LocalTime.of(20, 0));
    }

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
