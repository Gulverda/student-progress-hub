import pandas as pd
import numpy as np


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    # 1. ჩაბარების პროცენტი
    df["submission_rate"] = (
        df["submitted_count"] / df["total_homeworks"].replace(0, 1)
    ).clip(0, 1)

    # 2. გაგების ტრენდი (–1, 0, +1)
    df["understanding_trend"] = np.select(
        [
            df["last_understanding"] > df["first_understanding"],
            df["last_understanding"] < df["first_understanding"],
        ],
        [1, -1],
        default=0,
    )

    # 3. კრიტიკული კვირა
    df["is_critical_week"] = df["current_week"].isin([7, 15]).astype(int)

    # 4. milestone სიახლოვე 0..1 (რაც ახლოს, მით მაღალი)
    df["days_to_milestone"] = df["current_week"].apply(
        lambda w: min(abs(w - 8), abs(w - 16))
    )
    df["milestone_proximity"] = (1 - df["days_to_milestone"] / 8).clip(0, 1)

    # 5. engagement — submission × understanding კომბო
    df["engagement_score"] = (
        df["submission_rate"] * df["avg_understanding"].clip(1, 5) / 5
    ).clip(0, 1)

    # 6. missed_rate normalized
    df["missed_rate"] = (
        df["missed_homeworks"] / df["total_homeworks"].replace(0, 1)
    ).clip(0, 1)

    # 7. რისკის სქორი 0–100
    df["risk_score"] = (
        (1 - df["avg_hw_score"] / 100) * 60        # ← მთავარი სიგნალი (50%)
        + (1 - df["submission_rate"]) * 10          # დავალებების გამოტოვება
        + (5 - df["avg_understanding"].clip(1, 5)) / 4 * 20  # გაგების დონე
        + df["missed_rate"] * 5                     # გაცდენილი / სულ
        + (df["understanding_trend"] == -1).astype(int) * 5  # კლებადი ტრენდი
    ).clip(0, 100)

    # 8. difficulty_label — avg_hw_score-ზე დაფუძნებული
    #    80–100 → easy(0), 65–79 → medium(1), 50–64 → hard(2), 0–49 → complex(3)
    df["difficulty_label"] = pd.cut(
        df["avg_hw_score"],
        bins=[-1, 49, 64, 79, 101],
        labels=[0, 1, 2, 3],  # 0–49 = easy(0), 80–100 = complex(3)
    ).astype(float).fillna(1)

    return df


def get_feature_columns() -> list:
    return [
        "submission_rate",      # დავალებების ჩაბარების პროცენტი
        "avg_understanding",    # გაგების საშუალო დონე (1–5)
        "understanding_trend",  # ტრენდი: –1, 0, +1
        "is_critical_week",     # კვირა 7 ან 15
        "milestone_proximity",  # milestone-სთან სიახლოვე 0..1
        "eval_count",           # შეფასებების რაოდენობა
        "missed_homeworks",     # გაცდენილი დავალებები (absolute)
        "missed_rate",          # გაცდენილი / სულ (normalized)
        "engagement_score",     # submission × understanding კომბო
    ]