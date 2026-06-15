package com.drivesafe.config;

import org.modelmapper.ModelMapper;
import org.modelmapper.convention.MatchingStrategies;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartResolver;
import org.springframework.web.multipart.support.StandardServletMultipartResolver;

import java.time.Duration;

// ─────────────────────────────────────────────────────────────────────────────
// AppConfig — general-purpose Spring beans not related to security
//
// Beans defined here:
//   1. RestTemplate       — used by TripService, AIRecommendationService,
//                           WeatherService to call Flask ML + OpenAI + OWM
//   2. ModelMapper        — entity ↔ DTO mapping (optional but saves boilerplate)
//   3. MultipartResolver  — enables CSV file uploads in TripController
// ─────────────────────────────────────────────────────────────────────────────
@Configuration
public class AppConfig {

    // ── Timeouts ──────────────────────────────────────────────────────
    // Flask ML scoring should respond in < 5s on a dev machine
    // OpenAI can take up to 15s for complex prompts — set generously
    @Value("${http.connect.timeout.ms:5000}")
    private int connectTimeoutMs;

    @Value("${http.read.timeout.ms:20000}")
    private int readTimeoutMs;

    // ── RestTemplate ──────────────────────────────────────────────────

    /**
     * Shared HTTP client used by all services that make outbound calls:
     *
     *   TripService              → POST http://localhost:5000/predict
     *                              POST http://localhost:5000/generate-map
     *   AIRecommendationService  → POST https://api.openai.com/v1/chat/completions
     *   WeatherService           → GET  https://api.openweathermap.org/data/2.5/weather
     *
     * Timeouts explained:
     *   connectTimeout  — max time to establish TCP connection (fail fast on unreachable host)
     *   readTimeout     — max time to wait for the response body (covers model inference time)
     *
     * For production, swap SimpleClientHttpRequestFactory with
     * Apache HttpComponents or OkHttp for connection pooling and retry logic.
     */
    @Bean
    public RestTemplate restTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(connectTimeoutMs);
        factory.setReadTimeout(readTimeoutMs);
        return new RestTemplate(factory);
    }

    // ── ModelMapper ───────────────────────────────────────────────────

    /**
     * ModelMapper — automatic entity-to-DTO field mapping.
     *
     * STRICT matching strategy is recommended:
     *   - Only maps fields whose names match exactly
     *   - Prevents accidental mapping of similarly-named but unrelated fields
     *   - Easier to debug than STANDARD or LOOSE strategies
     *
     * Usage in a service:
     *   TripSummaryResponse dto = modelMapper.map(trip, TripSummaryResponse.class);
     *
     * For fields that don't auto-map (e.g. riskLevel derived from driveScore),
     * use builder() or set them manually after modelMapper.map().
     */
    @Bean
    public ModelMapper modelMapper() {
        ModelMapper mapper = new ModelMapper();
        mapper.getConfiguration()
                .setMatchingStrategy(MatchingStrategies.STRICT)
                .setSkipNullEnabled(true);    // don't overwrite non-null target fields with null
        return mapper;
    }

    // ── Multipart resolver ────────────────────────────────────────────

    /**
     * Enables multipart/form-data file uploads.
     * Required for POST /api/trips/upload which receives a CSV file.
     *
     * File size limits are configured in application.properties:
     *   spring.servlet.multipart.max-file-size=10MB
     *   spring.servlet.multipart.max-request-size=10MB
     *
     * StandardServletMultipartResolver uses the Servlet 3.0 Part API
     * and works with Spring Boot's embedded Tomcat out of the box.
     */
    @Bean
    public MultipartResolver multipartResolver() {
        return new StandardServletMultipartResolver();
    }
}