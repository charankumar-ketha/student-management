import time
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError
from pydantic import BaseModel
from typing import List
from app.database import engine, Base, get_db
from app import models

# Retry database connection until Postgres is ready
for attempt in range(15):
    try:
        Base.metadata.create_all(bind=engine)
        print("Database connected and tables initialized.")
        break
    except OperationalError:
        print(f"PostgreSQL not ready yet, retrying... ({attempt + 1}/15)")
        time.sleep(2)

app = FastAPI(title="Student Management API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class StudentSchema(BaseModel):
    name: str
    email: str
    course: str

    class Config:
        from_attributes = True

class StudentResponse(StudentSchema):
    id: int

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.get("/api/students", response_model=List[StudentResponse])
def get_students(db: Session = Depends(get_db)):
    return db.query(models.Student).all()

@app.post("/api/students", response_model=StudentResponse)
def create_student(student: StudentSchema, db: Session = Depends(get_db)):
    db_student = models.Student(**student.model_dump())
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student
