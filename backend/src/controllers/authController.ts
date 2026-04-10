import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../config/db";

export const registerUser = async (req: Request, res: Response) => {
  const { full_name, email, password, role, current_course } = req.body;

  try {
    // დებაგისთვის - ტერმინალში ნახავ რა მოდის რეალურად
    console.log("FRONTEND-DAN MOVIDA:", { role, current_course });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // გადაზღვევა: თუ როლი სტუდენტია, მაინც ჩავწეროთ 1, თუ საერთოდ არაფერი მოვიდა
    let targetCourse = null;
    if (role === "student") {
      targetCourse = current_course ? Number(current_course) : 1;
    }

    const result = await query(
      "INSERT INTO users (full_name, email, password_hash, role, current_course) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [full_name, email, hashedPassword, role, targetCourse],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("❌ SQL ERROR:", error);
    res.status(500).json({ message: "ბაზაში ჩაწერის შეცდომა" });
  }
};

// შესვლის (Login) ლოგიკა - აქაც ვაბრუნებთ კურსს, რომ ფრონტზე ვიცოდეთ
export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const result = await query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(400).json({ message: "მონაცემები არასწორია" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: "24h" },
    );

    res.json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        role: user.role,
        current_course: user.current_course, // 👈 დაემატა აქაც
      },
    });
  } catch (error) {
    console.error("🔥 LOGIN ERROR:", error);
    res.status(500).json({ message: "სერვერის შეცდომა შესვლისას" });
  }
};

// ყველა მომხმარებლის წამოღება (Pure SQL)
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const result = await query(
      "SELECT id, full_name, email, role, current_course, created_at FROM users ORDER BY created_at DESC",
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "მონაცემების წამოღება ვერ მოხერხდა" });
  }
};

// ... deleteUser და getTeachers უცვლელია, რადგან იქ კურსი ნაკლებად მნიშვნელოვანია
export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await query("DELETE FROM users WHERE id = $1", [id]);
    res.json({ message: "მომხმარებელი წარმატებით წაიშალა" });
  } catch (error) {
    res.status(500).json({ message: "წაშლისას მოხდა შეცდომა" });
  }
};

export const getTeachers = async (req: Request, res: Response) => {
  try {
    const result = await query(
      "SELECT id, full_name, email FROM users WHERE role = 'teacher' ORDER BY full_name ASC",
    );
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: "მასწავლებლების წამოღება ვერ მოხერხდა" });
  }
};
