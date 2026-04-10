import { Response } from "express";
import { query } from "../config/db";
import { AuthenticatedRequest } from "../types/express";

// ── DB migration (პირველ გაშვებაზე ავტომატურად შეიქმნება) ──
export const ensureSettingsTable = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS settings (
      key   VARCHAR(100) PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // default-ები თუ არ არსებობს
  await query(`
    INSERT INTO settings (key, value)
    VALUES ('semester_start_date', '2025-02-10')
    ON CONFLICT (key) DO NOTHING
  `);

  await query(
    `
    INSERT INTO settings (key, value)
    VALUES ('week_max_scores', $1)
    ON CONFLICT (key) DO NOTHING
  `,
    [
      JSON.stringify({
        1: 2,
        2: 2,
        3: 2,
        4: 10,
        5: 2,
        6: 2,
        7: 10,
        8: 20,
        9: 2,
        10: 2,
        11: 2,
        12: 10,
        13: 2,
        14: 2,
        15: 2,
        16: 40,
      }),
    ],
  );
};

// GET /api/settings/semester-start
export const getSemesterStart = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    await ensureSettingsTable();
    const result = await query(
      "SELECT value FROM settings WHERE key = 'semester_start_date'",
    );
    res.json({ date: result.rows[0]?.value ?? null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "სერვერის შეცდომა" });
  }
};

// POST /api/settings/semester-start  { date: "2025-02-10" }
export const setSemesterStart = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { date } = req.body;
  if (!date) return res.status(400).json({ message: "date აუცილებელია" });
  try {
    await query(
      `
      INSERT INTO settings (key, value) VALUES ('semester_start_date', $1)
      ON CONFLICT (key) DO UPDATE SET value = $1
    `,
      [date],
    );
    res.json({ date });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "სერვერის შეცდომა" });
  }
};

// GET /api/settings/week-scores
export const getWeekMaxScores = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    await ensureSettingsTable();
    const result = await query(
      "SELECT value FROM settings WHERE key = 'week_max_scores'",
    );
    res.json({ scores: JSON.parse(result.rows[0]?.value ?? "{}") });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "სერვერის შეცდომა" });
  }
};

// POST /api/settings/week-scores  { scores: { "1": 2, "4": 10, ... } }
export const setWeekMaxScores = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { scores } = req.body;
  if (!scores) return res.status(400).json({ message: "scores აუცილებელია" });
  try {
    await query(
      `
      INSERT INTO settings (key, value) VALUES ('week_max_scores', $1)
      ON CONFLICT (key) DO UPDATE SET value = $1
    `,
      [JSON.stringify(scores)],
    );
    res.json({ scores });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "სერვერის შეცდომა" });
  }
};
