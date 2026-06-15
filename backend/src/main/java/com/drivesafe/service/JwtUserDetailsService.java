package com.drivesafe.service;

import com.drivesafe.model.User;
import com.drivesafe.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

import java.util.List;

// ─────────────────────────────────────────────────────────────────────────────
// JwtUserDetailsService — Spring Security bridge between your User entity
// and Spring's UserDetails interface.
//
// Called by:
//   - JwtFilter.doFilterInternal()      : on every authenticated request
//   - SecurityConfig AuthenticationManager: during login authentication
//
// Spring Security needs UserDetails (not your User entity) to:
//   1. Verify the password during login (AuthenticationManager)
//   2. Build the Authentication token (JwtFilter)
//   3. Check granted authorities (SecurityConfig access rules)
//
// This service loads your User from the DB and wraps it in a standard
// Spring Security User object.
// ─────────────────────────────────────────────────────────────────────────────
@Service
@RequiredArgsConstructor
@Slf4j
public class JwtUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    /**
     * Load a user by email (our "username") from the DB.
     *
     * Called on every authenticated request by JwtFilter — result is
     * NOT cached here (Spring Security has its own caching layer if needed).
     *
     * @param email the JWT subject (user's email)
     * @return Spring Security UserDetails wrapping your User entity
     * @throws UsernameNotFoundException if no user exists with this email
     */
    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.warn("User not found with email: {}", email);
                    return new UsernameNotFoundException(
                            "No user found with email: " + email);
                });

        // Build Spring Security UserDetails from your User entity.
        //
        // Spring's built-in User(username, password, authorities) constructor:
        //   username    → email  (matches JWT subject)
        //   password    → bcrypt hash (used during login auth only)
        //   authorities → ROLE_USER or ROLE_ADMIN (from user.getRole())
        //
        // accountNonExpired, credentialsNonExpired, accountNonLocked
        // are all true — add logic here if you need account suspension.
        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPasswordHash(),
                true,  // accountNonExpired
                true,  // credentialsNonExpired
                true,  // accountNonLocked
                true,  // enabled
                List.of(new SimpleGrantedAuthority(user.getRole()))
        );
    }
}