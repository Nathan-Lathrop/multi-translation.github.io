from fastapi import FastAPI, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from translation import TranslationError, get_supported_languages, translate_chain

app = FastAPI(title="Indy-2 Translation API", version="0.3.0")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"], allow_headers=["*"]
)

class TranslationRequest(BaseModel):
    text: str = Field(..., min_length=1)
    languages: list[str] = Field(..., min_length=1, max_length=50)

@app.get("/")
async def root():
    return {"application":"Indy-2 Translation API","status":"online",
            "translation_provider":"Google Cloud Translation Advanced","endpoint":"/translate"}

@app.get("/languages")
async def languages():
    return {"languages": get_supported_languages()}

@app.post("/translate")
async def translate(request: TranslationRequest):
    try:
        return await run_in_threadpool(
            translate_chain, text=request.text, languages=request.languages
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except TranslationError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
