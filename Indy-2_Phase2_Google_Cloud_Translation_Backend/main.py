import os

from fastapi import FastAPI, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from translation import (
    TranslationError,
    get_supported_languages,
    translate_chain,
)

app = FastAPI(
    title="Indy-2 Translation API",
    version="0.4.0",
)

frontend_origin = os.environ.get(
    "FRONTEND_ORIGIN",
    "https://nathan-lathrop.github.io",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        frontend_origin,
        "http://localhost:5500",
        "http://127.0.0.1:5500",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


class TranslationRequest(BaseModel):
    text: str = Field(..., min_length=1)
    languages: list[str] = Field(..., min_length=1, max_length=10)


@app.get("/")
async def root():
    return {
        "application": "Indy-2 Translation API",
        "status": "online",
        "translation_provider": "Google Cloud Translation Advanced",
        "endpoint": "/translate",
        "max_translation_steps": 10,
    }


@app.get("/languages")
async def languages():
    try:
        supported = await run_in_threadpool(get_supported_languages)
        return {"languages": supported}
    except TranslationError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="Unable to retrieve supported languages from Google Cloud Translation.",
        ) from exc


@app.post("/translate")
async def translate(request: TranslationRequest):
    try:
        return await run_in_threadpool(
            translate_chain,
            text=request.text,
            languages=request.languages,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except TranslationError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc