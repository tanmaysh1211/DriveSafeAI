package com.drivesafe.security;

import com.drivesafe.service.JwtUserDetailsService;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

// ─────────────────────────────────────────────────────────────────────────────
// JwtFilter — intercepts every HTTP request ONCE before it reaches controllers
//
// Execution order in Spring Security filter chain:
//   Request → JwtFilter → UsernamePasswordAuthenticationFilter → Controller
//
// What this filter does on each request:
//   1. Reads the "Authorization" header
//   2. Extracts the Bearer token
//   3. Validates signature + expiry via JwtUtil
//   4. Loads the UserDetails from DB (email lookup)
//   5. Sets the Authentication in SecurityContextHolder
//   6. Passes the request down the chain
//
// If any step fails, the filter writes a JSON 401 response directly —
// no exception propagation needed.
//
// Public endpoints (/api/auth/**) are whitelisted in SecurityConfig
// and will never enter the validation logic here.
// ─────────────────────────────────────────────────────────────────────────────
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final JwtUserDetailsService userDetailsService;

    // ── Filter core ───────────────────────────────────────────────────
    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest  request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain         filterChain)
            throws ServletException, IOException {

        // 1. Extract raw header
        final String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);

        // 2. Skip filter if no Bearer token present
        //    (public endpoints, OPTIONS pre-flight, or malformed header)
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        // 3. Strip "Bearer " prefix — token starts at index 7
        final String jwt = authHeader.substring(7);

        // 4. Extract email from token (subject claim)
        String email;
        try {
            email = jwtUtil.extractEmail(jwt);
        } catch (ExpiredJwtException e) {
            log.warn("JWT expired for request to {}: {}", request.getRequestURI(), e.getMessage());
            writeUnauthorized(response, "Token has expired. Please log in again.");
            return;
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("Invalid JWT for request to {}: {}", request.getRequestURI(), e.getMessage());
            writeUnauthorized(response, "Invalid token.");
            return;
        }

        // 5. Only proceed if we got an email AND no auth is set yet
        //    (avoid re-processing on the same request)
        if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {

            // 6. Load full UserDetails from DB — needed for granted authorities
            UserDetails userDetails;
            try {
                userDetails = userDetailsService.loadUserByUsername(email);
            } catch (Exception e) {
                log.error("Could not load user '{}' from DB: {}", email, e.getMessage());
                writeUnauthorized(response, "User not found.");
                return;
            }

            // 7. Validate token against the loaded user
            if (jwtUtil.isTokenValid(jwt, userDetails.getUsername())) {

                // 8. Build authentication token and attach request details
                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(
                                userDetails,
                                null,                          // credentials — null post-auth
                                userDetails.getAuthorities()   // ROLE_USER etc.
                        );

                authToken.setDetails(
                        new WebAuthenticationDetailsSource().buildDetails(request));

                // 9. Register authentication in SecurityContext for this request
                SecurityContextHolder.getContext().setAuthentication(authToken);

                log.debug("Authenticated user '{}' for {} {}",
                        email,
                        request.getMethod(),
                        request.getRequestURI());

            } else {
                // Token structure is valid but fails isTokenValid() check
                // (expired OR email mismatch)
                log.warn("Token validation failed for user '{}' on {}",
                        email, request.getRequestURI());
                writeUnauthorized(response, "Token is invalid or has expired.");
                return;
            }
        }

        // 10. Pass request to the next filter / controller
        filterChain.doFilter(request, response);
    }

    // ── Skip logic ────────────────────────────────────────────────────

    /**
     * Do NOT run this filter for public endpoints.
     * Spring Security's permitAll() in SecurityConfig is the authoritative
     * gate — this is an optimisation to skip unnecessary DB lookups.
     *
     * Endpoints skipped:
     *   /api/auth/login
     *   /api/auth/register
     *   /actuator/**        (health checks)
     */
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();

        return path.equals("/api/auth/login")
                || path.equals("/api/auth/register")
                || path.startsWith("/actuator/");
    }

    // ── Error response ────────────────────────────────────────────────

    /**
     * Write a JSON 401 response directly to the HTTP response.
     * This short-circuits the filter chain so the request never
     * reaches the DispatcherServlet or any controller.
     *
     * Response body:
     * { "status": 401, "message": "<reason>" }
     */
    private void writeUnauthorized(HttpServletResponse response, String message)
            throws IOException {

        // Clear any partial context that may have been set
        SecurityContextHolder.clearContext();

        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");

        String body = String.format(
                "{\"status\": 401, \"message\": \"%s\"}",
                message.replace("\"", "\\\"") // escape any quotes in message
        );
        response.getWriter().write(body);
        response.getWriter().flush();
    }
}