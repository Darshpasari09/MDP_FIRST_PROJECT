from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import SessionLocal
import models, schemas
from stress_logic import calculate_stress

router = APIRouter(prefix="/api/v1/readings")

# Database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# -----------------------------
# Save reading from ESP32
# -----------------------------
@router.post("")
def create_reading(
    reading: schemas.ReadingCreate,
    db: Session = Depends(get_db)
):

    # Calculate stress level
    stress_level = calculate_stress(
        reading.bpm,
        reading.temperature
    )

    # Save to database
    db_reading = models.Reading(
        bpm=reading.bpm,
        temperature=reading.temperature,
        stress=stress_level
    )

    db.add(db_reading)
    db.commit()
    db.refresh(db_reading)

    return {
        "message": "Reading saved",
        "stress": stress_level
    }


# -----------------------------
# Get latest reading
# -----------------------------
@router.get("/latest")
def get_latest_reading(db: Session = Depends(get_db)):

    latest = db.query(models.Reading)\
        .order_by(models.Reading.id.desc())\
        .first()

    # If no data yet
    if not latest:
        return {
            "bpm": 0,
            "temperature": 0,
            "stress": "moderate"
        }

    return {
        "bpm": latest.bpm,
        "temperature": latest.temperature,
        "stress": latest.stress
    }