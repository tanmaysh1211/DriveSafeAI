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

@Component
@Slf4j
public class JwtUtil {

    @Value("${jwt.secret}")
    private String jwtSecret;
    @Value("${jwt.expiration.ms:86400000}")
    private long jwtExpirationMs;

    public String generateToken(String email, Long userId) {
        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put("uid", userId);
        return buildToken(extraClaims, email);
    }

    public String generateToken(Map<String, Object> extraClaims, String email, Long userId) {
        extraClaims.put("uid", userId);
        return buildToken(extraClaims, email);
    }

    public boolean isTokenValid(String token, String email) {
        try {
            final String subject = extractEmail(token);
            return subject.equals(email) && !isTokenExpired(token);
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("JWT validation failed: {}", e.getMessage());
            return false;
        }
    }

    public boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }
    
    public String extractEmail(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public Long extractUserId(String token) {
        Object uid = extractAllClaims(token).get("uid");
        if (uid == null) return null;
        if (uid instanceof Integer) return ((Integer) uid).longValue();
        if (uid instanceof Long)    return (Long) uid;
        return Long.parseLong(uid.toString());
    }

    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    public Date extractIssuedAt(String token) {
        return extractClaim(token, Claims::getIssuedAt);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private String buildToken(Map<String, Object> extraClaims, String subject) {
        return Jwts.builder()
                .claims(extraClaims)            
                .subject(subject)                
                .issuedAt(new Date())            
                .expiration(new Date(           
                        System.currentTimeMillis() + jwtExpirationMs))
                .signWith(getSigningKey())        
                .compact();
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(jwtSecret);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
