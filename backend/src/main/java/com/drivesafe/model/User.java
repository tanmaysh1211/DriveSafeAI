package com.drivesafe.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "users",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = "email", name = "uk_users_email")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"trips"}) // avoid infinite loop in logs
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ── Identity ──────────────────────────────────────────────────────
    @NotBlank(message = "Name is required")
    @Size(min = 2, max = 100)
    @Column(nullable = false, length = 100)
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    @Column(nullable = false, unique = true, length = 150)
    private String email;

    // Stored as bcrypt hash — never store plain text
    @NotBlank(message = "Password is required")
    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    // ── Vehicle ───────────────────────────────────────────────────────
    // Indian vehicle registration format e.g. KA01AB1234
    @Column(name = "vehicle_number", length = 20)
    private String vehicleNumber;

    // ── Gamification ──────────────────────────────────────────────────
    // Denormalised points total — also stored in UserPoints table for history
    @Column(name = "total_points", nullable = false)
    @Builder.Default
    private int totalPoints = 0;

    // ── Role ──────────────────────────────────────────────────────────
    // ROLE_USER or ROLE_ADMIN — used by Spring Security
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String role = "ROLE_USER";

    // ── Timestamps ────────────────────────────────────────────────────
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ── Relationships ─────────────────────────────────────────────────
    // One user → many trips (lazy loaded — don't fetch unless needed)
    @OneToMany(
            mappedBy = "user",
            cascade = CascadeType.ALL,
            fetch = FetchType.LAZY,
            orphanRemoval = true
    )
    @Builder.Default
    private List<Trip> trips = new ArrayList<>();

    // One user → one insurance policy
    @OneToOne(
            mappedBy = "user",
            cascade = CascadeType.ALL,
            fetch = FetchType.LAZY
    )
    private Insurance insurance;

    // ── Lifecycle hooks ───────────────────────────────────────────────
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // ── Convenience helpers ───────────────────────────────────────────
    public void addTrip(Trip trip) {
        trips.add(trip);
        trip.setUser(this);
    }

    public void removeTrip(Trip trip) {
        trips.remove(trip);
        trip.setUser(null);
    }
}