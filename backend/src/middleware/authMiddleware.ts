import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const protect = (req: any, res: Response, next: NextFunction) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);

      req.user = decoded;
      return next(); // 👈 აუცილებელია return, რომ ქვემოთ არ ჩავიდეს
    } catch (error) {
      return res
        .status(401)
        .json({ message: "ავტორიზაცია ვერ მოხერხდა, ტოკენი არასწორია" });
    }
  }

  // თუ აქამდე მოვიდა, ე.ი. ტოკენი საერთოდ არ ყოფილა
  if (!token) {
    return res
      .status(401)
      .json({ message: "წვდომა უარყოფილია, ტოკენი არ არსებობს" });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: any, res: Response, next: NextFunction) => {
    // დარწმუნდი, რომ req.user საერთოდ არსებობს
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "ამ მოქმედების უფლება არ გაქვთ" });
    }
    next();
  };
};
