package com.drivesafe.service;

import com.drivesafe.model.Trip;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.*;

@Service
@Slf4j
public class AIRecommendationService {

    private final RestTemplate restTemplate;

    @Value("${openai.api.key}")
    private String openAiApiKey;
    private static final String MODEL = "gpt-4o-mini";
    private static final String OPENAI_URL = "https://api.openai.com/v1/chat/completions";

    public AIRecommendationService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public String generateRecommendation(Trip trip) {
        String prompt = buildPrompt(trip);
        return callOpenAI(prompt);
    }

    private String buildPrompt(Trip trip) {
        String riskLevel = getRiskLabel(trip.getDriveScore());
        String timeContext = trip.isDaytime() ? "daytime" : "nighttime";
        String weatherContext = trip.getWeatherCondition() != null ? trip.getWeatherCondition() : "clear weather";

        StringBuilder sb = new StringBuilder();
        sb.append("You are a professional driving coach and road safety expert.\n\n");
        sb.append("A driver just completed a trip. Analyze the data and give ");
        sb.append("3 specific, actionable safety recommendations.\n\n");
        sb.append("TRIP DATA:\n");
        sb.append(String.format("- Drive Score: %.1f / 100 (higher = riskier)\n", trip.getDriveScore()));
        sb.append(String.format("- Risk Level: %s\n", riskLevel));
        sb.append(String.format("- Max Speed: %.1f km/h\n", trip.getMaxSpeed()));
        sb.append(String.format("- Average Speed: %.1f km/h\n", trip.getAvgSpeed()));
        sb.append(String.format("- Distance: %.2f km\n", trip.getDistance()));
        sb.append(String.format("- Hard Braking Events: %d\n", trip.getHardBrakingCount()));
        sb.append(String.format("- Sharp Turn Events: %d\n", trip.getSharpTurnCount()));
        sb.append(String.format("- Max Acceleration: %.2f m/s²\n", trip.getMaxAcceleration()));
        sb.append(String.format("- Conditions: %s, %s\n\n", timeContext, weatherContext));
        sb.append("INSTRUCTIONS:\n");
        sb.append("- Give exactly 3 recommendations, each 1–2 sentences\n");
        sb.append("- Be specific to the data above — mention actual numbers where helpful\n");
        sb.append("- Focus on the worst factors first\n");
        sb.append("- Use a supportive, coaching tone — not alarming\n");
        sb.append("- Do NOT use markdown, bullet symbols, or headers — plain text only\n");
        sb.append("- Separate each recommendation with a newline\n");

        return sb.toString();
    }
    
    private String callOpenAI(String userPrompt) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(openAiApiKey);

            Map<String, String> systemMsg = new HashMap<>();
            systemMsg.put("role", "system");
            systemMsg.put("content",
                    "You are a concise, expert driving safety coach. "
                            + "You give practical, data-driven feedback. "
                            + "Never use bullet points or markdown formatting.");

            Map<String, String> userMsg = new HashMap<>();
            userMsg.put("role", "user");
            userMsg.put("content", userPrompt);
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", MODEL);
            requestBody.put("messages", List.of(systemMsg, userMsg));
            requestBody.put("max_tokens", 300);
            requestBody.put("temperature", 0.7); // slight creativity for varied wording

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(OPENAI_URL, request, Map.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                return extractContent(response.getBody());
            }
        } catch (Exception e) {
            log.error("OpenAI API call failed: {}", e.getMessage());
        }
        return buildFallbackRecommendation();
    }

    @SuppressWarnings("unchecked")
    private String extractContent(Map<String, Object> body) {
        try {
            List<Map<String, Object>> choices =
                    (List<Map<String, Object>>) body.get("choices");
            if (choices != null && !choices.isEmpty()) {
                Map<String, Object> message =
                        (Map<String, Object>) choices.get(0).get("message");
                if (message != null) {
                    Object content = message.get("content");
                    return content != null ? content.toString().trim() : buildFallbackRecommendation();
                }
            }
        } catch (Exception e) {
            log.error("Failed to parse OpenAI response: {}", e.getMessage());
        }
        return buildFallbackRecommendation();
    }

    private String buildFallbackRecommendation() {
        return "Try to maintain a steady speed and avoid sudden acceleration or braking.\n" + "Keep a safe following distance so you have time to brake gradually.\n"
                + "Stay aware of road conditions and reduce speed in poor weather or at night.";
    }

    private String getRiskLabel(double score) {
        if (score <= 40) return "Safe";
        if (score <= 65) return "Moderate";
        return "High Risk";
    }
}
