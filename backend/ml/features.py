import pandas as pd
import numpy as np


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    # 1. ჩაბარების პროცენტი
    df["submission_rate"] = (
        df["submitted_count"] / df["total_homeworks"].replace(0, 1)
    ).clip(0, 1)

    # 2. გაგების ტრენდი
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

    # 4. შუალედურის სიახლოვე
    df["days_to_milestone"] = df["current_week"].apply(
        lambda w: min(abs(w - 8), abs(w - 16))
    )

    # 5. რისკის სქორი (predict-ში risk_level-ისთვის გამოიყენება)
    df["risk_score"] = (
        (1 - df["submission_rate"]) * 40
        + (5 - df["avg_understanding"]) * 10
        + (df["missed_homeworks"] * 3).clip(0, 30)
    ).clip(0, 100)

    # 6. difficulty_label — რეალური hw ქულებით, არა risk_score-ით
    # avg_hw_score: 0–49 → complex(3), 50–64 → hard(2), 65–79 → medium(1), 80–100 → easy(0)
   # ნაცვლად avg_hw_score-ზე დაფუძნებული bins-ისა:
    df["difficulty_label"] = pd.cut(
        df["risk_score"],           # ← risk_score იყენებს submission + understanding + missed
        bins=[-1, 25, 50, 75, 101],
        labels=[0, 1, 2, 3],       # easy=0, medium=1, hard=2, complex=3
    ).astype(float).fillna(1)

    return df


def get_feature_columns() -> list:
    """ML-ში გამოსაყენებელი feature სვეტები"""
    return [
        "submission_rate",
        "avg_understanding",
        "understanding_trend",
        "is_critical_week",
        "days_to_milestone",
        "eval_count",
        "missed_homeworks",
    ]