import axios from "axios";

const ML_URL = process.env.ML_SERVICE_URL ?? "http://localhost:8000";

export interface StudentPrediction {
  student_id: number;
  course_id: number;
  student_name: string;
  course_title: string;
  recommended_difficulty: "easy" | "medium" | "hard" | "complex";
  predicted_score: number;
  risk_level: "low" | "medium" | "high";
  risk_score: number;
  profile: {
    avg_hw_score: number;
    submission_rate: number;
    avg_understanding: number;
    understanding_trend: number;
    missed_homeworks: number;
    eval_count: number;
    current_week: number;
  };
  milestone: {
    name: string;
    week: number;
    weeks_left: number;
  };
}

// სტუდენტის პრედიქცია
export const predictStudent = async (
  courseId: number,
  studentId: number,
): Promise<StudentPrediction> => {
  const res = await axios.get(`${ML_URL}/predict/${courseId}/${studentId}`);
  return res.data;
};

// კურსის ყველა სტუდენტი
export const getCourseStudentPredictions = async (
  courseId: number,
): Promise<StudentPrediction[]> => {
  const res = await axios.get(`${ML_URL}/course/${courseId}/students`);
  return res.data;
};

// მოდელის ხელახლა დატრენინგება
export const retrainModel = async (): Promise<void> => {
  await axios.post(`${ML_URL}/retrain`);
};
