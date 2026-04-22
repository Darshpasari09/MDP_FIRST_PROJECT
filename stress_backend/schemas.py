from pydantic import BaseModel


class ReadingCreate(BaseModel):
    bpm: float
    temperature: float


class UserCreate(BaseModel):
    username: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class ProgressUpdate(BaseModel):
    user_id: int
    token: str
    correct: bool
