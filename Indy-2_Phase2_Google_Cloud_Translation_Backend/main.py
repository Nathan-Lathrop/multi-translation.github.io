import os

from fastapi import FastAPI, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from similarity import score_translation_steps
from translation import (
    TranslationError,
    get_supported_languages,
    translate_chain,
)

app = FastAPI(
    title="Indy-2 Translation API",
    version="0.5.0",
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
        "similarity_model": "cross-encoder/stsb-roberta-base",
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
            detail=(
                "Unable to retrieve supported languages from "
                "Google Cloud Translation."
            ),
        ) from exc


@app.post("/translate")
async def translate(request: TranslationRequest):
    try:
        result = await run_in_threadpool(
            translate_chain,
            text=request.text,
            languages=request.languages,
        )

        result = await run_in_threadpool(
            score_translation_steps,
            result,
        )

        return result

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    except TranslationError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    except Exception as exc:
        # Log the full exception in Cloud Run logs, without exposing
        # implementation details to the website visitor.
        import logging
        logging.exception("Translation or similarity scoring failed")

        raise HTTPException(
            status_code=502,
            detail=(
                "Translation or AI similarity scoring failed. "
                "Check the Cloud Run logs for details."
            ),
        ) from exc