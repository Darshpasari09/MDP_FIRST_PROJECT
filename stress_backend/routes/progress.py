from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal
import models
import schemas

router = APIRouter(prefix="/api/v1/progress")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def verify_token(user_id: int, token: str, db: Session) -> models.User:
    user = db.query(models.User).filter(
        models.User.id == user_id,
        models.User.token == token
    ).first()
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return user


@router.get("/{user_id}")
def get_progress(user_id: int, token: str, db: Session = Depends(get_db)):
    verify_token(user_id, token, db)
    progress = db.query(models.Progress).filter(models.Progress.user_id == user_id).first()
    if not progress:
        return {"questions_solved": 0, "correct_answers": 0}
    return {
        "questions_solved": progress.questions_solved,
        "correct_answers": progress.correct_answers
    }


@router.post("/update")
def update_progress(update: schemas.ProgressUpdate, db: Session = Depends(get_db)):
    verify_token(update.user_id, update.token, db)
    progress = db.query(models.Progress).filter(models.Progress.user_id == update.user_id).first()
    if not progress:
        raise HTTPException(status_code=404, detail="Progress record not found")
    progress.questions_solved += 1
    if update.correct:
        progress.correct_answers += 1
    db.commit()
    return {
        "questions_solved": progress.questions_solved,
        "correct_answers": progress.correct_answers
    }
