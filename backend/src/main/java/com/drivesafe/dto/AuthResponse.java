package com.drivesafe.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

// ─────────────────────────────────────────────────────────────────────────────
// AuthResponse — returned by POST /api/auth/login and /register
//
// JSON shape stored by React AuthContext.jsx in localStorage:
// {
//   "token":         "eyJhbGciOiJIUzI1NiJ9...",
//   "userId":        5,
//   "name":          "Nishant",
//   "email":         "nishant12@example.com",
//   "vehicleNumber": "KA01AB12345",
//   "message":       "Login successful"
// }
//
// @JsonInclude(NON_NULL) ensures null fields (e.g. message on /me)
// are omitted from the JSON rather than serialised as null.
// ─────────────────────────────────────────────────────────────────────────────
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AuthResponse {

    // JWT — stored in React localStorage, sent as "Authorization: Bearer <token>"
    private String token;

    private Long   userId;
    private String name;
    private String email;
    private String vehicleNumber;

    // Human-readable status message — present on login/register, absent on /me
    private String message;
}