from fastapi import FastAPI
from app.gemini import analyze_loan

app = FastAPI()

@app.get("/health")
def health():
    return {"status": "alive"}


@app.post("/api/analyze-loan")
def analyze(request: str):
    result = analyze_loan(request)
    return {"result": result}