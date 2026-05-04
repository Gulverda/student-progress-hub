import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from predict import predict_student, get_course_students

load_dotenv()

app = FastAPI(
    title="Utopia ML API",
    description="Adaptive Catch-up System — ML სერვისი",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "ok", "service": "Utopia ML API"}


@app.get("/predict/{course_id}/{student_id}")
def predict(course_id: int, student_id: int):
    """
    სტუდენტის ML პრედიქცია:
    - recommended_difficulty
    - predicted_score
    - risk_level
    - profile
    - milestone
    """
    result = predict_student(student_id, course_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@app.get("/course/{course_id}/students")
def course_students(course_id: int):
    """
    კურსის ყველა სტუდენტი რისკის მიხედვით დალაგებული
    """
    results = get_course_students(course_id)
    if not results:
        raise HTTPException(status_code=404, detail="სტუდენტები ვერ მოიძებნა")
    return results


@app.post("/retrain")
def retrain():
    """
    მოდელის ხელახლა დატრენინგება (ახალი მონაცემებით)
    """
    try:
        import train
        train.train()
        
        # მოდელების reload
        import predict
        import importlib
        importlib.reload(predict)
        
        return {"status": "ok", "message": "მოდელი განახლდა"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))