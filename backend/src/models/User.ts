export interface IUser {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  role: "admin" | "teacher" | "student";
  current_course: number | null;
  created_at?: Date;
}

import bcrypt from "bcryptjs";

export const comparePassword = async (
  enteredPassword: string,
  dbPasswordHash: string,
): Promise<boolean> => {
  return await bcrypt.compare(enteredPassword, dbPasswordHash);
};
