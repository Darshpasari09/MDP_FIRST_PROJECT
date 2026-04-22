from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal
import models
import schemas
import uuid
import hashlib
import secrets

router = APIRouter(prefix="/api/v1/auth")


def hash_password(password: str) -> str:
    """PBKDF2-HMAC-SHA256 with random salt. stdlib only."""
    salt = secrets.token_hex(16)
    key  = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 260000)
    return f"{salt}${key.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, key_hex = stored.split("$", 1)
        key = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 260000)
        return secrets.compare_digest(key.hex(), key_hex)
    except Exception:
        return False


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/register")
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):

    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    if db.query(models.User).filter(models.User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    token = str(uuid.uuid4())
    db_user = models.User(
        username=user.username,
        email=user.email,
        password_hash=hash_password(user.password),
        token=token
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Create blank progress entry
    progress = models.Progress(user_id=db_user.id, questions_solved=0, correct_answers=0)
    db.add(progress)
    db.commit()

    return {
        "id": db_user.id,
        "username": db_user.username,
        "email": db_user.email,
        "token": token
    }


@router.post("/login")
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):

    db_user = db.query(models.User).filter(models.User.email == user.email).first()

    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Refresh token on every login
    new_token = str(uuid.uuid4())
    db_user.token = new_token
    db.commit()

    return {
        "id": db_user.id,
        "username": db_user.username,
        "email": db_user.email,
        "token": new_token
    }
