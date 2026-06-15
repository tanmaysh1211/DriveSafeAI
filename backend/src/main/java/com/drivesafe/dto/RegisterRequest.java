package com.drivesafe.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;

// ─────────────────────────────────────────────────────────────────────────────
// RegisterRequest — body of POST /api/auth/register
//
// JSON shape:
// {
//   "name":          "Nishant",
//   "email":         "nishant12@example.com",
//   "password":      "mypassword",
//   "vehicleNumber": "KA01AB12345"
// }
// ─────────────────────────────────────────────────────────────────────────────
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegisterRequest {

    @NotBlank(message = "Name is required")
    @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Must be a valid email address")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 6, max = 100, message = "Password must be at least 6 characters")
    private String password;

    // Indian vehicle registration e.g. KA01AB1234 — optional at registration
    // Regex: 2-letter state code + 2-digit RTO + 2-letter series + 4-digit number
    @Pattern(
            regexp = "^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$",
            message = "Invalid vehicle number format (e.g. KA01AB1234)"
    )
    private String vehicleNumber;
}