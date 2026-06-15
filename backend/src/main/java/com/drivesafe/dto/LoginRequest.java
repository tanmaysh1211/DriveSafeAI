package com.drivesafe.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

// ─────────────────────────────────────────────────────────────────────────────
// LoginRequest — body of POST /api/auth/login
//
// JSON shape the React Login.jsx sends:
// {
//   "email":    "nishant12@example.com",
//   "password": "mypassword"
// }
//
// Validated by @Valid in AuthController before Spring even calls the method.
// ─────────────────────────────────────────────────────────────────────────────
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoginRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Must be a valid email address")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;
}