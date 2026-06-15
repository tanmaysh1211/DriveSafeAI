"""
train_model.py — DriveSafe AI LightGBM model training pipeline

Trains a LightGBM regressor to predict DriveScore (0–100) from trip telemetry.
Saves model.pkl and scaler.pkl to ml-service/models/ for use by scoring.py.

Usage:
    cd ml-service
    source venv/bin/activate
    python training/train_model.py

    # With a specific CSV:
    python training/train_model.py --csv data/DF2.csv

    # With more trees for better accuracy:
    python training/train_model.py --n-estimators 500

Output:
    models/model.pkl    — trained LightGBM model
    models/scaler.pkl   — fitted StandardScaler
    training/plots/     — feature importance + predicted vs actual charts
"""

import os
import sys
import argparse
import pickle
import warnings
import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")

# ── Path setup ────────────────────────────────────────────────────────────────
# Add ml-service/ to sys.path so we can import feature_engineering.py
_ML_SERVICE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, _ML_SERVICE_DIR)

from training.feature_engineering import (
    build_training_dataset,
    FEATURE_COLUMNS,
    LABEL_COLUMN,
)

# ── Output paths ──────────────────────────────────────────────────────────────
MODELS_DIR = os.path.join(_ML_SERVICE_DIR, "models")
PLOTS_DIR  = os.path.join(os.path.dirname(__file__), "plots")
os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(PLOTS_DIR,  exist_ok=True)

MODEL_PATH  = os.path.join(MODELS_DIR, "model.pkl")
SCALER_PATH = os.path.join(MODELS_DIR, "scaler.pkl")


# ═════════════════════════════════════════════════════════════════════════════
# ARGUMENT PARSING
# ═════════════════════════════════════════════════════════════════════════════

def parse_args():
    p = argparse.ArgumentParser(description="Train DriveSafe AI LightGBM model")
    p.add_argument(
        "--csv",
        default=os.path.join(_ML_SERVICE_DIR, "data", "DF2.csv"),
        help="Path to raw OBD CSV file (default: data/DF2.csv)"
    )
    p.add_argument("--n-estimators",  type=int,   default=300,
                   help="Number of LightGBM trees (default: 300)")
    p.add_argument("--max-depth",     type=int,   default=6,
                   help="Max tree depth (default: 6)")
    p.add_argument("--learning-rate", type=float, default=0.05,
                   help="Learning rate (default: 0.05)")
    p.add_argument("--test-size",     type=float, default=0.2,
                   help="Test split fraction (default: 0.2)")
    p.add_argument("--no-plots",      action="store_true",
                   help="Skip generating evaluation plots")
    p.add_argument("--synthetic",     action="store_true",
                   help="Use synthetic data instead of a real CSV")
    return p.parse_args()


# ═════════════════════════════════════════════════════════════════════════════
# DATA LOADING
# ═════════════════════════════════════════════════════════════════════════════

def load_data(csv_path: str, use_synthetic: bool) -> pd.DataFrame:
    """
    Load and validate the raw OBD CSV.
    Falls back to synthetic data if --synthetic flag or CSV not found.
    """
    if use_synthetic or not os.path.exists(csv_path):
        if not use_synthetic:
            print(f"[data] CSV not found at: {csv_path}")
        print("[data] Generating synthetic training data (1500 trips × ~200 rows each)")
        return _generate_synthetic_csv()

    print(f"[data] Loading CSV: {csv_path}")
    df = pd.read_csv(csv_path, low_memory=False)
    print(f"[data] Raw shape: {df.shape} — columns: {list(df.columns)}")
    return df


def _generate_synthetic_csv() -> pd.DataFrame:
    """
    Generate a realistic multi-trip synthetic CSV.

    Simulates 3 driver profiles:
        - Safe driver    (30% of trips): smooth, moderate speed
        - Average driver (50% of trips): occasional hard braking
        - Aggressive     (20% of trips): high speed, frequent braking
    """
    np.random.seed(42)
    rows = []
    trip_id = 1

    n_trips = {"safe": 450, "average": 750, "aggressive": 300}

    for profile, count in n_trips.items():
        for _ in range(count):
            n_rows = np.random.randint(80, 300)  # rows per trip

            if profile == "safe":
                speed_mean, speed_std     = 55,  15
                accel_std                 = 0.8
                rpm_mean                  = 2000
                is_daytime                = 1 if np.random.random() > 0.15 else 0
            elif profile == "average":
                speed_mean, speed_std     = 70,  25
                accel_std                 = 1.5
                rpm_mean                  = 2500
                is_daytime                = 1 if np.random.random() > 0.25 else 0
            else:  # aggressive
                speed_mean, speed_std     = 100, 35
                accel_std                 = 3.0
                rpm_mean                  = 3500
                is_daytime                = 1 if np.random.random() > 0.35 else 0

            # GPS: random start near Bangalore
            start_lat = np.random.uniform(12.85, 13.10)
            start_lng = np.random.uniform(77.50, 77.75)

            lats  = np.cumsum(np.random.normal(0, 0.0008, n_rows)) + start_lat
            lngs  = np.cumsum(np.random.normal(0, 0.0008, n_rows)) + start_lng
            spd   = np.clip(np.random.normal(speed_mean, speed_std, n_rows), 0, 200)
            accel = np.random.normal(0, accel_std, n_rows)
            rpm   = np.clip(np.random.normal(rpm_mean, 500, n_rows), 600, 6000)
            eng_t = np.random.uniform(85, 100, n_rows)

            # Inject occasional hard braking events for aggressive driver
            if profile == "aggressive":
                brake_idx = np.random.choice(n_rows, size=max(1, n_rows//20), replace=False)
                accel[brake_idx] = np.random.uniform(-5, -3, len(brake_idx))

            # Determine weather randomly
            weather_choices = ["clear weather", "clear weather", "clear weather",
                               "cloudy", "rainy", "foggy"]
            weather = np.random.choice(weather_choices)

            for j in range(n_rows):
                rows.append({
                    "trip_id":            trip_id,
                    "timestamp":          f"2024-01-01 {np.random.randint(6,22):02d}:{j%60:02d}:00",
                    "latitude":           round(lats[j], 6),
                    "longitude":          round(lngs[j], 6),
                    "speed":              round(spd[j],  2),
                    "acceleration":       round(accel[j], 3),
                    "rpm":                round(rpm[j],  0),
                    "engine_temperature": round(eng_t[j], 1),
                    "is_daytime":         is_daytime,
                    "weather_condition":  weather,
                })

            trip_id += 1

    df = pd.DataFrame(rows)
    print(f"[data] Synthetic: {len(df)} rows across {trip_id-1} trips")

    # Optionally save for inspection
    out_path = os.path.join(_ML_SERVICE_DIR, "data", "synthetic_DF2.csv")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    df.to_csv(out_path, index=False)
    print(f"[data] Saved synthetic CSV → {out_path}")
    return df


# ═════════════════════════════════════════════════════════════════════════════
# PREPROCESSING
# ═════════════════════════════════════════════════════════════════════════════

def preprocess(dataset: pd.DataFrame, test_size: float):
    """
    Split into train/test and apply StandardScaler.

    Returns
    -------
    X_train, X_test, y_train, y_test : numpy arrays
    scaler                            : fitted StandardScaler
    """
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing   import StandardScaler

    X = dataset[FEATURE_COLUMNS].values
    y = dataset[LABEL_COLUMN].values

    print(f"\n[preprocess] Dataset: {X.shape[0]} trips, {X.shape[1]} features")
    print(f"[preprocess] Label stats  — min:{y.min():.1f}  "
          f"max:{y.max():.1f}  mean:{y.mean():.1f}  std:{y.std():.1f}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=test_size,
        random_state=42,
        shuffle=True,
    )

    # Fit scaler on training data only — never fit on test data
    scaler  = StandardScaler()
    X_train = scaler.fit_transform(X_train)
    X_test  = scaler.transform(X_test)

    print(f"[preprocess] Train: {X_train.shape[0]} rows  |  "
          f"Test: {X_test.shape[0]} rows")

    return X_train, X_test, y_train, y_test, scaler


# ═════════════════════════════════════════════════════════════════════════════
# MODEL TRAINING
# ═════════════════════════════════════════════════════════════════════════════

def train(X_train, y_train,
          n_estimators:  int   = 300,
          max_depth:     int   = 6,
          learning_rate: float = 0.05):
    """
    Train a LightGBM regressor.

    Hyperparameters tuned for DriveScore regression:
        num_leaves     : controls model complexity (lower = less overfit)
        min_child_samples: prevents overfitting on small trips
        subsample      : row sampling for robustness
        colsample_bytree: feature sampling per tree
        reg_alpha/lambda: L1/L2 regularisation
    """
    try:
        import lightgbm as lgb
    except ImportError:
        print("[train] lightgbm not installed. Run: pip install lightgbm")
        sys.exit(1)

    print(f"\n[train] Training LightGBM — "
          f"n_estimators={n_estimators}, "
          f"max_depth={max_depth}, "
          f"learning_rate={learning_rate}")

    model = lgb.LGBMRegressor(
        n_estimators      = n_estimators,
        max_depth         = max_depth,
        learning_rate     = learning_rate,
        num_leaves        = 31,
        min_child_samples = 10,
        subsample         = 0.8,
        subsample_freq    = 1,
        colsample_bytree  = 0.8,
        reg_alpha         = 0.1,    # L1
        reg_lambda        = 0.1,    # L2
        n_jobs            = -1,
        random_state      = 42,
        verbose           = -1,
    )

    model.fit(
        X_train, y_train,
        # eval_set and callbacks removed for simplicity —
        # add early_stopping(50) here if you have a val set
    )

    print("[train] Training complete")
    return model


# ═════════════════════════════════════════════════════════════════════════════
# EVALUATION
# ═════════════════════════════════════════════════════════════════════════════

def evaluate(model, scaler, X_test, y_test, X_train, y_train):
    """
    Print regression metrics and run 5-fold cross-validation.
    """
    from sklearn.metrics import (
        mean_absolute_error,
        mean_squared_error,
        r2_score,
    )
    from sklearn.model_selection import cross_val_score

    # Test set metrics
    y_pred = model.predict(X_test)
    y_pred = np.clip(y_pred, 0, 100)

    mae  = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2   = r2_score(y_test, y_pred)

    print(f"\n{'─'*50}")
    print(f"  TEST SET METRICS")
    print(f"{'─'*50}")
    print(f"  MAE  (mean absolute error)   : {mae:.2f} pts")
    print(f"  RMSE (root mean sq error)    : {rmse:.2f} pts")
    print(f"  R²   (variance explained)    : {r2:.4f}")
    print(f"{'─'*50}")

    # Accuracy within ±5 points
    within_5  = np.mean(np.abs(y_test - y_pred) <= 5)  * 100
    within_10 = np.mean(np.abs(y_test - y_pred) <= 10) * 100
    print(f"  Within ±5  pts               : {within_5:.1f}%")
    print(f"  Within ±10 pts               : {within_10:.1f}%")
    print(f"{'─'*50}")

    # Risk label accuracy (Safe/Moderate/High)
    def label(s): return "Safe" if s<=40 else "Moderate" if s<=65 else "High"
    true_labels = [label(s) for s in y_test]
    pred_labels = [label(s) for s in y_pred]
    label_acc = np.mean([t == p for t, p in zip(true_labels, pred_labels)]) * 100
    print(f"  Risk label accuracy          : {label_acc:.1f}%")
    print(f"{'─'*50}\n")

    # 5-fold CV on training data
    print("[eval] Running 5-fold cross-validation on training data...")
    cv_scores = cross_val_score(
        model, X_train, y_train,
        cv=5, scoring="r2", n_jobs=-1
    )
    print(f"  CV R² scores : {[round(s, 3) for s in cv_scores]}")
    print(f"  CV R² mean   : {cv_scores.mean():.4f} (±{cv_scores.std():.4f})\n")

    return y_pred


# ═════════════════════════════════════════════════════════════════════════════
# FEATURE IMPORTANCE ANALYSIS
# ═════════════════════════════════════════════════════════════════════════════

def print_feature_importance(model):
    """Print feature importances sorted by gain."""
    importances = model.feature_importances_
    pairs = sorted(
        zip(FEATURE_COLUMNS, importances),
        key=lambda x: x[1],
        reverse=True
    )
    print("Feature importances (by gain):")
    for name, imp in pairs:
        bar = "█" * int(imp / max(importances) * 30)
        print(f"  {name:<22} {imp:6.0f}  {bar}")
    print()


# ═════════════════════════════════════════════════════════════════════════════
# EVALUATION PLOTS (optional — skipped if matplotlib not installed)
# ═════════════════════════════════════════════════════════════════════════════

def save_plots(model, y_test, y_pred, no_plots: bool):
    if no_plots:
        return

    try:
        import matplotlib
        matplotlib.use("Agg")   # non-interactive backend — safe in headless envs
        import matplotlib.pyplot as plt

        # ── Feature importance bar chart ─────────────────────────────
        fig, ax = plt.subplots(figsize=(10, 6))
        importances = model.feature_importances_
        idx = np.argsort(importances)[::-1]
        ax.barh([FEATURE_COLUMNS[i] for i in idx[::-1]],
                [importances[i] for i in idx[::-1]],
                color="#6c63ff")
        ax.set_xlabel("Feature Importance (gain)")
        ax.set_title("DriveSafe AI — LightGBM Feature Importance")
        ax.invert_yaxis()
        plt.tight_layout()
        path = os.path.join(PLOTS_DIR, "feature_importance.png")
        plt.savefig(path, dpi=120)
        plt.close()
        print(f"[plots] Feature importance chart → {path}")

        # ── Predicted vs Actual scatter ──────────────────────────────
        fig, ax = plt.subplots(figsize=(8, 8))
        ax.scatter(y_test, y_pred, alpha=0.4, c="#6c63ff", edgecolors="none", s=20)
        ax.plot([0, 100], [0, 100], "r--", linewidth=1.5, label="Perfect prediction")
        ax.set_xlabel("Actual DriveScore")
        ax.set_ylabel("Predicted DriveScore")
        ax.set_title("Predicted vs Actual DriveScore")
        ax.legend()
        ax.set_xlim(0, 100)
        ax.set_ylim(0, 100)
        plt.tight_layout()
        path = os.path.join(PLOTS_DIR, "predicted_vs_actual.png")
        plt.savefig(path, dpi=120)
        plt.close()
        print(f"[plots] Predicted vs actual chart → {path}")

    except ImportError:
        print("[plots] matplotlib not installed — skipping charts. "
              "Run: pip install matplotlib")


# ═════════════════════════════════════════════════════════════════════════════
# SAVE MODEL AND SCALER
# ═════════════════════════════════════════════════════════════════════════════

def save_artifacts(model, scaler):
    """Serialize model and scaler to disk with pickle."""
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(model, f)
    print(f"[save] model.pkl  → {MODEL_PATH}")

    with open(SCALER_PATH, "wb") as f:
        pickle.dump(scaler, f)
    print(f"[save] scaler.pkl → {SCALER_PATH}")


# ═════════════════════════════════════════════════════════════════════════════
# MAIN
# ═════════════════════════════════════════════════════════════════════════════

def main():
    args = parse_args()

    print("\n" + "═" * 60)
    print("  DriveSafe AI — LightGBM Training Pipeline")
    print("═" * 60)

    # 1. Load raw OBD data
    raw_df = load_data(args.csv, args.synthetic)

    # 2. Feature engineering — one row per trip
    print("\n[feature_engineering] Building trip-level feature dataset...")
    dataset = build_training_dataset(raw_df)
    print(f"[feature_engineering] Final dataset: {dataset.shape}")

    if len(dataset) < 10:
        print("[ERROR] Not enough trips to train. "
              "Use --synthetic to generate training data.")
        sys.exit(1)

    # 3. Train/test split + scaling
    X_train, X_test, y_train, y_test, scaler = preprocess(
        dataset, args.test_size
    )

    # 4. Train LightGBM
    model = train(
        X_train, y_train,
        n_estimators  = args.n_estimators,
        max_depth     = args.max_depth,
        learning_rate = args.learning_rate,
    )

    # 5. Evaluate
    y_pred = evaluate(model, scaler, X_test, y_test, X_train, y_train)

    # 6. Feature importance
    print_feature_importance(model)

    # 7. Save plots
    save_plots(model, y_test, y_pred, args.no_plots)

    # 8. Save artifacts — model.pkl and scaler.pkl
    save_artifacts(model, scaler)

    print("\n" + "═" * 60)
    print("  Training complete!")
    print(f"  Start Flask: python app.py")
    print(f"  Model path : {MODEL_PATH}")
    print("═" * 60 + "\n")


if __name__ == "__main__":
    main()