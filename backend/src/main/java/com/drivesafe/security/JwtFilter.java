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

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final JwtUserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest  request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        final String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        final String jwt = authHeader.substring(7);

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
        if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            UserDetails userDetails;
            try {
                userDetails = userDetailsService.loadUserByUsername(email);
            } catch (Exception e) {
                log.error("Could not load user '{}' from DB: {}", email, e.getMessage());
                writeUnauthorized(response, "User not found.");
                return;
            }
            if (jwtUtil.isTokenValid(jwt, userDetails.getUsername())) {
                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken( userDetails, null, userDetails.getAuthorities() );
                authToken.setDetails( new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
                log.debug("Authenticated user '{}' for {} {}", email, request.getMethod(), request.getRequestURI());
            } else {
                log.warn("Token validation failed for user '{}' on {}", email, request.getRequestURI());
                writeUnauthorized(response, "Token is invalid or has expired.");
                return;
            }
        }
        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return path.equals("/api/auth/login") || path.equals("/api/auth/register") || path.startsWith("/actuator/");
    }

    private void writeUnauthorized(HttpServletResponse response, String message)
            throws IOException {

        SecurityContextHolder.clearContext();

        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");

        String body = String.format("{\"status\": 401, \"message\": \"%s\"}", message.replace("\"", "\\\"") // escape any quotes in message );
        response.getWriter().write(body);
        response.getWriter().flush();
    }
}
