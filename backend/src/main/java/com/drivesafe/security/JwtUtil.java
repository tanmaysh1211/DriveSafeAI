package com.drivesafe.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

// ─────────────────────────────────────────────────────────────────────────────
// JwtUtil — all JWT operations in one place
//
// Uses the jjwt library (io.jsonwebtoken).
// Add to pom.xml:
//
//   <dependency>
//     <groupId>io.jsonwebtoken</groupId>
//     <artifactId>jjwt-api</artifactId>
//     <version>0.12.3</version>
//   </dependency>
//   <dependency>
//     <groupId>io.jsonwebtoken</groupId>
//     <artifactId>jjwt-impl</artifactId>
//     <version>0.12.3</version>
//     <scope>runtime</scope>
//   </dependency>
//   <dependency>
//     <groupId>io.jsonwebtoken</groupId>
//     <artifactId>jjwt-jackson</artifactId>
//     <version>0.12.3</version>
//     <scope>runtime</scope>
//   </dependency>
//
// application.properties keys required:
//   jwt.secret          — Base64-encoded 256-bit key (min 32 chars)
//   jwt.expiration.ms   — Token lifetime in ms, e.g. 86400000 (24h)
// ─────────────────────────────────────────────────────────────────────────────
@Component
@Slf4j
public class JwtUtil {

    // Injected from application.properties
    // Generate a strong secret: openssl rand -base64 32
    @Value("${jwt.secret}")
    private String jwtSecret;

    // Default 24 hours — configurable per environment
    @Value("${jwt.expiration.ms:86400000}")
    private long jwtExpirationMs;

    // ── Token generation ──────────────────────────────────────────────

    /**
     * Generate a signed JWT for a user.
     *
     * Claims embedded in the token:
     *   sub  (subject)  → user's email  — used as Spring Security principal
     *   uid             → user's DB id  — avoids a DB lookup in every request
     *   iat             → issued-at timestamp
     *   exp             → expiry timestamp
     *
     * The token is signed with HMAC-SHA256 using the secret key.
     * It is NOT encrypted — do not store sensitive data in claims.
     *
     * @param email  the user's email (becomes the JWT subject)
     * @param userId the user's DB primary key (stored as custom claim "uid")
     * @return signed JWT string
     */
    public String generateToken(String email, Long userId) {
        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put("uid", userId);
        return buildToken(extraClaims, email);
    }

    /**
     * Overload — generate token with additional custom claims.
     * Use this if you need to embed role or other metadata.
     *
     * @param extraClaims additional claims to embed (e.g. {"role": "ROLE_USER"})
     * @param email       becomes the JWT subject
     * @param userId      embedded as "uid" claim
     */
    public String generateToken(Map<String, Object> extraClaims, String email, Long userId) {
        extraClaims.put("uid", userId);
        return buildToken(extraClaims, email);
    }

    // ── Token validation ──────────────────────────────────────────────

    /**
     * Full token validation:
     *   1. Signature is intact (HMAC-SHA256 with our secret)
     *   2. Token has not expired
     *   3. Subject (email) matches the provided username
     *
     * Called by JwtFilter on every authenticated request.
     *
     * @param token    the raw JWT string from the Authorization header
     * @param email    the email extracted from the same token
     * @return true if valid and not expired, false otherwise
     */
    public boolean isTokenValid(String token, String email) {
        try {
            final String subject = extractEmail(token);
            return subject.equals(email) && !isTokenExpired(token);
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("JWT validation failed: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Quick expiry check without full validation.
     * Useful for refresh token logic if you add it later.
     */
    public boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    // ── Claim extraction ──────────────────────────────────────────────

    /**
     * Extract email (JWT subject) from token.
     * Used by JwtFilter to identify the user making the request.
     */
    public String extractEmail(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    /**
     * Extract user DB ID from the "uid" custom claim.
     * Services can call this instead of doing a DB lookup by email
     * when they only need the userId.
     */
    public Long extractUserId(String token) {
        Object uid = extractAllClaims(token).get("uid");
        if (uid == null) return null;
        // jjwt deserialises numbers as Integer if they fit — cast safely
        if (uid instanceof Integer) return ((Integer) uid).longValue();
        if (uid instanceof Long)    return (Long) uid;
        return Long.parseLong(uid.toString());
    }

    /**
     * Extract token expiry date.
     */
    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    /**
     * Extract the issued-at date.
     */
    public Date extractIssuedAt(String token) {
        return extractClaim(token, Claims::getIssuedAt);
    }

    /**
     * Generic claim extractor — pass any Claims getter as a function.
     *
     * Example:
     *   String subject = extractClaim(token, Claims::getSubject);
     *   Date   expiry  = extractClaim(token, Claims::getExpiration);
     */
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    // ── Internal helpers ──────────────────────────────────────────────

    /**
     * Build and sign a JWT with the provided claims and subject.
     *
     * Uses HS256 (HMAC-SHA256) — strong enough for this use case.
     * For extra security, rotate jwt.secret periodically in production.
     */
    private String buildToken(Map<String, Object> extraClaims, String subject) {
        return Jwts.builder()
                .claims(extraClaims)             // custom claims (uid, role, etc.)
                .subject(subject)                // email
                .issuedAt(new Date())            // iat
                .expiration(new Date(           // exp
                        System.currentTimeMillis() + jwtExpirationMs))
                .signWith(getSigningKey())        // HS256
                .compact();
    }

    /**
     * Parse and verify the JWT, returning all embedded claims.
     * Throws JwtException subtypes on any problem:
     *   - ExpiredJwtException    : token past its exp
     *   - MalformedJwtException  : not a valid JWT structure
     *   - SignatureException     : signature doesn't match our secret
     *   - UnsupportedJwtException: algorithm not supported
     *
     * These exceptions are caught in JwtFilter and result in 401.
     */
    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * Decode the Base64 secret and build the HMAC-SHA key.
     * Called on every token parse — result could be cached but
     * the cost is negligible and caching complicates secret rotation.
     *
     * jwt.secret in application.properties must be Base64-encoded:
     *   Generate with: openssl rand -base64 32
     *   Example value: dGhpcyBpcyBhIHNlY3JldCBrZXkgZm9yIGRyaXZlc2FmZQ==
     */
    private SecretKey getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(jwtSecret);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}