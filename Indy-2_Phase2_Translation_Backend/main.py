"""
Indy-2 Phase 2 Translation API.

Run locally with:

    python -m uvicorn main:app --reload

Swagger/OpenAPI documentation:

    http://127.0.0.1:8000/docs
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from translation import (
    TranslationError,
    get_supported_languages,
    translate_chain,
)


app = FastAPI(
    title="Indy-2 Translation API",
    description="Phase 2 backend for the Indy-2 multi-translation project.",
    version="0.2.0",
)

# For local development and the first GitHub Pages prototype.
# Once the GitHub Pages domain is known, this can be restricted to that
# exact origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


class TranslationRequest(BaseModel):
    text: str = Field(
        ...,
        min_length=1,
        description="Original English message.",
    )
    languages: list[str] = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Ordered Google Translate language codes.",
    )


@app.get("/")
async def root():
    return {
        "application": "Indy-2 Translation API",
        "status": "online",
        "phase": "Phase 2",
        "endpoint": "/translate",
    }


@app.get("/languages")
async def languages():
    return {"languages": get_supported_languages()}


@app.post("/translate")
async def translate(request: TranslationRequest):
    try:
        return await translate_chain(
            text=request.text,
            languages=request.languages,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except TranslationError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected translation error: {exc}",
        ) from exc
