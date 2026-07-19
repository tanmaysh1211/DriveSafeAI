package com.drivesafe.config;

import com.drivesafe.security.JwtFilter;
import com.drivesafe.service.JwtUserDetailsService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

// ─────────────────────────────────────────────────────────────────────────────
// SecurityConfig — the single source of truth for Spring Security in DriveSafe
//
// Key decisions:
//   - STATELESS sessions  : no server-side session; JWT carries all auth state
//   - CSRF disabled       : safe for stateless REST APIs (no browser form posts)
//   - CORS configured     : allows React dev server (localhost:5173) and prod URL
//   - Public routes       : /api/auth/** open to all; everything else needs JWT
//   - BCrypt strength 12  : secure but fast enough — ~250ms per hash on a laptop
// ─────────────────────────────────────────────────────────────────────────────
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtFilter jwtFilter;
    private final JwtUserDetailsService userDetailsService;

    // React frontend origin — injected from application.properties
    // Defaults to Vite dev server; override in prod with actual domain
    @Value("${cors.allowed.origin:http://localhost:5173}")
    private String allowedOrigin;

    // ── Security filter chain ─────────────────────────────────────────
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        http
                // ── CSRF ─────────────────────────────────────────────────
                // Disabled: safe for stateless JWT REST APIs.
                // CSRF protects against browser form-based attacks;
                // JWTs in Authorization headers are immune by design.
                .csrf(AbstractHttpConfigurer::disable)

                // ── CORS ──────────────────────────────────────────────────
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // ── Session ───────────────────────────────────────────────
                // STATELESS: Spring never creates an HttpSession.
                // Every request must carry its own JWT — no cookies needed.
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // ── Route authorisation ───────────────────────────────────
                .authorizeHttpRequests(auth -> auth

                        // Public — no token required
                        .requestMatchers(
                                "/",
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/v3/api-docs/**",
                                "/api/auth/login",
                                "/api/auth/register",
                                "/actuator/**",
                                "/v3/api-docs/**",
                                "/view-map/**",
                                "/view-heatmap/**"
                        ).permitAll()

                        // CORS pre-flight OPTIONS requests must always pass
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // Actuator health endpoint (for Docker/k8s health checks)
                        .requestMatchers("/actuator/health").permitAll()

                        // Flask map viewer — served by Flask, referenced via iframe
                        // No auth needed since map HTML is not sensitive
                        .requestMatchers("/view-map/**", "/view-heatmap/**").permitAll()

                        // Everything else — must carry a valid JWT
                        .anyRequest().authenticated()
                )

                // ── Authentication provider ───────────────────────────────
                .authenticationProvider(authenticationProvider())

                // ── JWT filter ────────────────────────────────────────────
                // Insert BEFORE Spring's UsernamePasswordAuthenticationFilter
                // so JWT auth runs first on every request
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    // ── CORS configuration ────────────────────────────────────────────

    /**
     * CORS policy for the React frontend.
     *
     * Allowed origins:
     *   - http://localhost:5173   : Vite dev server
     *   - Value from cors.allowed.origin in application.properties
     *
     * Allowed methods: GET, POST, PUT, DELETE, OPTIONS
     * Allowed headers: All (including Authorization for JWT)
     * Allow credentials: true (needed for cookies if you ever add them)
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        config.setAllowedOrigins(List.of(
                "http://localhost:5173",   // Vite dev server
                "http://localhost:3000",   // create-react-app fallback
                allowedOrigin             // production URL from properties
        ));

        config.setAllowedMethods(List.of(
                "GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"
        ));

        // Allow all headers including Authorization: Bearer <token>
        config.setAllowedHeaders(List.of("*"));

        // Expose Authorization header so React can read it
        config.setExposedHeaders(List.of("Authorization"));

        config.setAllowCredentials(true);

        // Cache pre-flight response for 1 hour
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    // ── Authentication provider ───────────────────────────────────────

    /**
     * DaoAuthenticationProvider wires together:
     *   - Our UserDetailsService (loads user from DB by email)
     *   - BCryptPasswordEncoder (verifies hashed password)
     *
     * Used by AuthenticationManager during POST /api/auth/login.
     */
    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    /**
     * AuthenticationManager — exposed as a bean so AuthController
     * can inject and call it directly during login.
     */
    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    // ── Password encoding ─────────────────────────────────────────────

    /**
     * BCrypt with strength 12.
     *
     * Strength guide:
     *   10 → ~100ms  (Spring default — fast but weaker)
     *   12 → ~250ms  (recommended for 2024+ hardware)
     *   14 → ~1s     (use for high-security applications)
     *
     * Used by:
     *   - AuthController.register()      : hash new password
     *   - DaoAuthenticationProvider      : verify password at login
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
}
