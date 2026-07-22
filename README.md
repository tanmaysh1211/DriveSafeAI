# 🚗 DriveSafe AI


>AI-Powered Driving Safety & Insurance Platform

[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2.5-brightgreen)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18-blue)](https://react.dev)
[![Python](https://img.shields.io/badge/Python-3.11-yellow)](https://python.org)
[![LightGBM](https://img.shields.io/badge/ML-LightGBM-orange)](https://lightgbm.readthedocs.io)
[![OpenAI](https://img.shields.io/badge/AI-GPT--4o--mini-purple)](https://platform.openai.com)
 
---

 
## 📌 What is DriveSafe AI?
 
DriveSafe AI is an end-to-end intelligent driving safety platform that bridges the gap between **driver behaviour** and **insurance pricing**. It processes real OBD-II telemetry data, scores each trip using a machine learning model, and provides personalised safety recommendations — making roads safer and insurance fairer.
 
### B2C — Driver Facing
- Upload OBD-II CSV data → get an AI-powered **DriveScore** (0–100)
- View colour-coded **Folium route maps** and **risk heatmaps**
- Receive **GPT-4o-mini safety recommendations** after every trip
- Earn **reward points** redeemable for Swiggy, Amazon, Netflix, and more
### B2B — Insurer Facing
- **DRISC Score** (Driving Risk Intelligence Score for Customers) — a recency-weighted average across N trips
- Dynamic **premium discounts** tied directly to driving behaviour
- Transparent link between driver risk profile and insurance pricing
---
 
## 🏗️ Architecture
 
```
┌─────────────────┐     REST / JWT      ┌──────────────────────────┐
│  React + Vite   │ ◄─────────────────► │   Spring Boot  :8080     │
│  :5173          │                     │   Auth · Trips · DRISC   │
└─────────────────┘                     │   Insurance · Rewards    │
                                        └────────────┬─────────────┘
                                                     │ HTTP
                                        ┌────────────▼─────────────┐
                                        │   Flask ML Service :5000  │
                                        │   LightGBM DriveScore     │
                                        │   Folium Maps + Heatmaps  │
                                        │   OpenAI Recommendations  │
                                        └────────────┬─────────────┘
                                                     │
                                        ┌────────────▼─────────────┐
                                        │   PostgreSQL  :5432       │
                                        └──────────────────────────┘
 
   OBD Simulator (Python) ──► generates DF2.csv ──► uploaded via UI
```
 
**Key rule:** React never calls Flask directly. All requests flow React → Spring Boot → Flask.
 
---
 
## ✨ Key Features
 
| Feature | Description |
|---|---|
| 🎯 DriveScore | LightGBM model scoring each trip 0–100 (higher = riskier) |
| 📊 DRISC Score | Recency-weighted average over N trips for insurance pricing |
| 🗺️ Route Maps | Folium maps colour-coded green/orange/red by risk per segment |
| 🔥 Risk Heatmap | Heat concentration map showing dangerous driving zones |
| 🤖 AI Recommendations | GPT-4o-mini generates 3 personalised safety tips per trip |
| 🌤️ Weather Context | OpenWeatherMap integrates real conditions into risk scoring |
| 🛡️ Insurance Integration | Premium auto-calculated from DRISC score (up to 15% discount) |
| 🎁 Rewards Store | Points redeemable for Burger King, Indian Oil, Netflix, Amazon, Spotify, Zomato, Swiggy |
| 🔔 Notifications | Real-time bell alerts for trip scores, risk alerts, points earned |
| 🔒 JWT Auth | Stateless authentication with BCrypt password hashing |
 
---
 
## 🧠 DRISC Score Formula
 
```
weight(i) = (N - i) / sum(1..N)   where i=0 is most recent trip
 
DRISC = Σ weight(i) × DriveScore(i)
```
 
Most recent trip has the highest weight — incentivises continuous improvement.
 
### Premium Discount Table
 
| DRISC Score | Risk Level | Discount |
|---|---|---|
| 0–30 | Excellent | 15% |
| 31–50 | Good | 10% |
| 51–65 | Moderate | 5% |
| 66–80 | High | 2% |
| 81–100 | Very High | 0% |
 
---
 
## 🛠️ Tech Stack
 
| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Axios, React Router v6 |
| Maps | Leaflet.js + OpenStreetMap (free), Folium (Python) |
| Backend | Spring Boot 3.2, Java 17, Spring Security, JWT (jjwt 0.12) |
| Database | PostgreSQL 15, Spring Data JPA, Hibernate (auto-DDL) |
| ML Model | LightGBM, scikit-learn, pandas, numpy |
| AI | OpenAI GPT-4o-mini |
| Weather | OpenWeatherMap API (free tier) |
| OBD Simulator | Python — safe / average / aggressive driver profiles |
| Build | Maven (backend), npm/Vite (frontend) |
 
---
 
## 📁 Project Structure
 
```
DriveSafeAI/
├── backend/                    # Spring Boot (Java 17)
│   ├── src/main/java/com/drivesafe/
│   │   ├── config/             # AppConfig, SecurityConfig
│   │   ├── controller/         # Auth, Trip, Dashboard, Insurance, Rewards, Notification
│   │   ├── service/            # TripService, DriscScoringService, AIRecommendationService...
│   │   ├── model/              # User, Trip, DriscScore, Insurance, Reward, UserPoints...
│   │   ├── repository/         # Spring Data JPA interfaces
│   │   ├── dto/                # Request/Response DTOs
│   │   └── security/           # JwtUtil, JwtFilter
│   └── src/main/resources/
│       └── application.properties.example
│
├── ml-service/                 # Python Flask
│   ├── app.py                  # Entry point
│   ├── routes/
│   │   ├── scoring.py          # POST /predict — LightGBM DriveScore
│   │   ├── maps.py             # POST /generate-map, /generate-heatmap
│   │   └── recommendations.py  # POST /recommend — OpenAI wrapper
│   ├── training/
│   │   ├── train_model.py      # Full LightGBM training pipeline
│   │   └── feature_engineering.py
│   └── requirements.txt
│
├── obd-simulator/              # Python OBD data generator
│   ├── simulate_trip.py        # Generate CSV with 3 driver profiles
│   ├── gps_route.py            # 5 Indian city GPS routes
│   └── obd_reader.py           # Real ELM327 device reader
│
└── frontend/                   # React + Vite
    ├── src/
    │   ├── pages/              # Home, Login, Register, Dashboard, TripHistory, TripMap, Insurance, Rewards
    │   ├── components/         # Navbar, TripCard, RiskBadge, ScoreGauge, ProtectedRoute
    │   ├── services/           # api.js, authService.js, tripService.js
    │   └── context/            # AuthContext.jsx
    ├── package.json
    └── vite.config.js
```
 
---
 
## 🚀 Getting Started
 
### Prerequisites
 
| Tool | Version |
|---|---|
| Java JDK | 17+ |
| Node.js | 18+ |
| Python | 3.11+ |
| PostgreSQL | 15+ |
| IntelliJ IDEA | Any |
 
### 1. Database Setup
 
```sql
-- In psql or pgAdmin:
CREATE DATABASE drivesafedb;
```
 
### 2. Backend (Spring Boot)
 
```bash
# Copy and fill in your credentials
cp backend/src/main/resources/application.properties.example \
   backend/src/main/resources/application.properties
 
# Open backend/ in IntelliJ → Maven auto-imports
# Run DriveSafeAiApplication.java
# Spring Boot starts on :8080
```
 
**Required values in `application.properties`:**
```properties
spring.datasource.username=YOUR_POSTGRES_USERNAME
spring.datasource.password=YOUR_POSTGRES_PASSWORD
jwt.secret=YOUR_BASE64_SECRET          # openssl rand -base64 32
openai.api.key=sk-...                  # platform.openai.com/api-keys
openweathermap.api.key=...             # openweathermap.org (free)
```
 
### 3. ML Service (Flask)
 
```bash
cd ml-service
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
 
pip install flask flask-cors lightgbm scikit-learn \
            pandas numpy folium openai requests
 
# Train the model
python training/train_model.py --synthetic
 
# Start Flask
python app.py                   # Runs on :5000
```
 
### 4. Frontend (React)
 
```bash
cd frontend
cp .env.example .env            # VITE_API_BASE_URL=http://localhost:8080/api
npm install
npm run dev                     # Opens http://localhost:5173
```
 
### 5. Generate & Upload a Test Trip
 
```bash
cd obd-simulator
pip install requests numpy pandas
 
# Generate aggressive driver trip
python simulate_trip.py --profile aggressive --route bangalore_electronic_city
 
# Upload DF2.csv via Trip History page in the browser
```
 
### Seed Reward Items (run once in pgAdmin)
 
```sql
INSERT INTO rewards (name, description, category, points_cost, value, emoji, active) VALUES
('Burger King',  'Whopper Burger Combo',       'food',          50,   50.0,  '🍔', true),
('Indian Oil',   'Fuel Voucher',               'fuel',          2000, 100.0, '⛽', true),
('Swiggy',       'Food Delivery Discount',     'food',          1500, 75.0,  '🍽️', true),
('Amazon',       'Shopping Voucher',           'shopping',      2500, 125.0, '📦', true),
('Netflix',      '1 Month Subscription',       'entertainment', 3000, 150.0, '🎬', true),
('Spotify',      'Premium Music Access',       'entertainment', 1800, 90.0,  '🎵', true),
('Zomato',       'Food Order Discount',        'food',          1200, 60.0,  '🍕', true);
```
 
---
 
## 🖥️ Running All Services
 
Open **4 terminals simultaneously:**
 
| Terminal | Command | Port |
|---|---|---|
| Spring Boot | IntelliJ ▶ on `DriveSafeAiApplication` | :8080 |
| Flask ML | `cd ml-service && python app.py` | :5000 |
| React | `cd frontend && npm run dev` | :5173 |
| OBD Simulator | `python simulate_trip.py --profile aggressive` | — |
 

---

