import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../config/db";

// რეგისტრაციის ლოგიკა
export const registerUser = async (req: Request, res: Response) => {
  const { full_name, email, password, role } = req.body;

  try {
    // ვამოწმებთ, უკვე არის თუ არა ასეთი მეილით რეგისტრირებული
    const userExists = await query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (userExists.rows.length > 0) {
      return res
        .status(400)
        .json({ message: "მომხმარებელი ამ მეილით უკვე არსებობს" });
    }

    // პაროლის დაჰეშირება
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // ბაზაში შენახვა
    const result = await query(
      "INSERT INTO users (full_name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, full_name, email, role",
      [full_name, email, hashedPassword, role],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "სერვერის შეცდომა რეგისტრაციისას" });
  }
};

// შესვლის (Login) ლოგიკა
export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const result = await query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ message: "მონაცემები არასწორია" });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: "მონაცემები არასწორია" });
    }

    // ტოკენის შექმნა
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: "24h" },
    );

    res.json({
      token,
      user: { id: user.id, full_name: user.full_name, role: user.role },
    });
  } catch (error) {
    console.error("🔥 LOGIN DETAILED ERROR:", error); // 👈 დაამატე ეს ხაზი!
    res.status(500).json({ message: "სერვერის შეცდომა შესვლისას" });
  }
};

// ✨ ყველა მომხმარებლის წამოღება (Pure SQL)
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const result = await query(
      "SELECT id, full_name, email, role, created_at FROM users ORDER BY created_at DESC",
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "მონაცემების წამოღება ვერ მოხერხდა" });
  }
};

// 🗑️ მომხმარებლის წაშლა (Pure SQL)
export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await query("DELETE FROM users WHERE id = $1", [id]);
    res.json({ message: "მომხმარებელი წარმატებით წაიშალა" });
  } catch (error) {
    res.status(500).json({ message: "წაშლისას მოხდა შეცდომა" });
  }
};

// 👨‍🏫 მხოლოდ მასწავლებლების წამოღება (ადმინ პანელისთვის)
export const getTeachers = async (req: Request, res: Response) => {
  try {
    const result = await query(
      "SELECT id, full_name, email FROM users WHERE role = 'teacher' ORDER BY full_name ASC",
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching teachers:", error);
    res.status(500).json({ message: "მასწავლებლების წამოღება ვერ მოხერხდა" });
  }
};
