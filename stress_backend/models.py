from sqlalchemy import Column, Integer, Float, String, ForeignKey
from database import Base


class Reading(Base):
    __tablename__ = "readings"

    id = Column(Integer, primary_key=True, index=True)
    bpm = Column(Float)
    temperature = Column(Float)
    stress = Column(String)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    token = Column(String, unique=True, nullable=True)


class Progress(Base):
    __tablename__ = "progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    questions_solved = Column(Integer, default=0)
    correct_answers = Column(Integer, default=0)
