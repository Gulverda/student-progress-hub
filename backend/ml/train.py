import os
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.tree import DecisionTreeClassifier
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, mean_absolute_error

from db import load_student_data
from features import build_features, get_feature_columns

MODELS_DIR = Path(__file__).parent / "models"
MODELS_DIR.mkdir(exist_ok=True)


def train():
    print("📦 მონაცემების წამოღება...")
    df_raw = load_student_data()

    if df_raw.empty:
        print("❌ მონაცემები ვერ მოიძებნა. ჯერ შეავსე DB.")
        return

    print(f"✅ სტუდენტები: {len(df_raw)}")

    df = build_features(df_raw)
    features = get_feature_columns()

    # ── debug: კლასების განაწილება ──
    print("\n🔍 difficulty_label განაწილება:")
    label_map = {0: "easy", 1: "medium", 2: "hard", 3: "complex"}
    counts = df["difficulty_label"].value_counts().sort_index()
    for k, v in counts.items():
        print(f"   {label_map.get(int(k), k):>8}: {v} სტუდენტი")

    X = df[features].fillna(0)

    # ── Decision Tree (სირთულის კლასიფიკაცია) ────────────
    print("\n🌳 Decision Tree...")
    y_class = df["difficulty_label"].fillna(1)

    if len(X) >= 4:
        X_tr, X_te, y_tr, y_te = train_test_split(
            X, y_class, test_size=0.2, random_state=42
            # stratify ამოღებულია — მცირე კლასები (1 მაგ.) ვერ იყოფა
        )
        dt = DecisionTreeClassifier(
            max_depth=4,
            min_samples_split=10,
            min_samples_leaf=5,
            class_weight="balanced",
            random_state=42,
        )
        dt.fit(X_tr, y_tr)
        acc = accuracy_score(y_te, dt.predict(X_te))
        print(f"   Accuracy: {acc:.0%}")
    else:
        dt = DecisionTreeClassifier(max_depth=3, random_state=42)
        dt.fit(X, y_class)
        print("   (მცირე dataset — train/test split გამოტოვდა)")

    joblib.dump(dt, MODELS_DIR / "difficulty_tree.pkl")
    print("   ✅ შენახულია: models/difficulty_tree.pkl")

    # ── Linear Regression (ქულის პროგნოზი) ───────────────
    print("\n📈 Linear Regression...")
    y_reg = df["avg_hw_score"].fillna(50)

    if len(X) >= 4:
        X_tr, X_te, y_tr, y_te = train_test_split(
            X, y_reg, test_size=0.2, random_state=42
        )
        lr = LinearRegression()
        lr.fit(X_tr, y_tr)
        mae = mean_absolute_error(y_te, lr.predict(X_te))
        print(f"   MAE: {mae:.1f} ქულა")
    else:
        lr = LinearRegression()
        lr.fit(X, y_reg)
        print("   (მცირე dataset — train/test split გამოტოვდა)")

    joblib.dump(lr, MODELS_DIR / "score_regression.pkl")
    print("   ✅ შენახულია: models/score_regression.pkl")

    # ── Feature Importance ────────────────────────────────
    print("\n📊 Feature Importance (Decision Tree):")
    for feat, imp in sorted(
        zip(features, dt.feature_importances_),
        key=lambda x: x[1], reverse=True
    ):
        bar = "█" * int(imp * 30)
        print(f"   {feat:<25} {bar} {imp:.3f}")

    print("\n✅ დატრენინგება დასრულდა!")


if __name__ == "__main__":
    train()