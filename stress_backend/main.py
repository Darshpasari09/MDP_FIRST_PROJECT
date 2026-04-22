from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine
from models import Base
from routes import readings, questions, auth, progress

app = FastAPI()

# Create database tables
Base.metadata.create_all(bind=engine)

# ---- CORS FIX ----
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*", "null"],  # "null" allows requests from file:// pages
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(readings.router)
app.include_router(questions.router)
app.include_router(auth.router)
app.include_router(progress.router)


@app.get("/")
def home():
    return {"message": "Backend running"}
