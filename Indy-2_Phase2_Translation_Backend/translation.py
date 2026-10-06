"""
Indy-2 Phase 2 Translation Engine

Uses googletrans 4.0.2.

The current googletrans release uses an asynchronous API, so this module
uses async/await throughout.  This is also a natural fit for FastAPI.

Workflow:
    English input
        -> Language 1
        -> English back-translation
        -> Language 2
        -> English back-translation
        -> ...
        -> Language N
        -> English back-translation
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Dict, List, Optional

from googletrans import Translator


SUPPORTED_LANGUAGES: Dict[str, str] = {
    "af": "Afrikaans",
    "ar": "Arabic",
    "bn": "Bengali",
    "bg": "Bulgarian",
    "ca": "Catalan",
    "cs": "Czech",
    "da": "Danish",
    "de": "German",
    "el": "Greek",
    "en": "English",
    "es": "Spanish",
    "et": "Estonian",
    "fa": "Persian",
    "fi": "Finnish",
    "fr": "French",
    "gu": "Gujarati",
    "he": "Hebrew",
    "hi": "Hindi",
    "hr": "Croatian",
    "hu": "Hungarian",
    "id": "Indonesian",
    "it": "Italian",
    "ja": "Japanese",
    "kn": "Kannada",
    "ko": "Korean",
    "lt": "Lithuanian",
    "lv": "Latvian",
    "ml": "Malayalam",
    "mr": "Marathi",
    "ne": "Nepali",
    "nl": "Dutch",
    "no": "Norwegian",
    "pa": "Punjabi",
    "pl": "Polish",
    "pt": "Portuguese",
    "ro": "Romanian",
    "ru": "Russian",
    "sk": "Slovak",
    "sl": "Slovenian",
    "sr": "Serbian",
    "sv": "Swedish",
    "sw": "Swahili",
    "ta": "Tamil",
    "te": "Telugu",
    "th": "Thai",
    "tr": "Turkish",
    "uk": "Ukrainian",
    "ur": "Urdu",
    "vi": "Vietnamese",
    "zh-CN": "Chinese (Simplified)",
    "zh-TW": "Chinese (Traditional)",
}

MAX_TRANSLATION_STEPS = 50


class TranslationError(RuntimeError):
    """Raised when a translation operation cannot be completed."""


@dataclass
class TranslationStep:
    step: int
    source_language: str
    source_language_name: str
    target_language: str
    target_language_name: str
    input_text: str
    translated_text: str
    back_translation: str


def _language_name(code: str) -> str:
    return SUPPORTED_LANGUAGES.get(code, code)


def validate_language_path(languages: List[str]) -> List[str]:
    if not isinstance(languages, list):
        raise ValueError("languages must be a list of language codes.")

    if not languages:
        raise ValueError("At least one translation language is required.")

    if len(languages) > MAX_TRANSLATION_STEPS:
        raise ValueError(
            f"A maximum of {MAX_TRANSLATION_STEPS} translation steps is allowed."
        )

    normalized = []
    for language in languages:
        if not isinstance(language, str):
            raise ValueError("Each language code must be a string.")

        code = language.strip()
        if code not in SUPPORTED_LANGUAGES:
            raise ValueError(
                f"Unsupported language code '{code}'. "
                "Use one of the supported codes returned by "
                "get_supported_languages()."
            )

        normalized.append(code)

    return normalized


def get_supported_languages() -> List[dict]:
    return [
        {"code": code, "name": name}
        for code, name in SUPPORTED_LANGUAGES.items()
    ]


async def _translate(
    translator: Translator,
    text: str,
    source: str,
    destination: str,
) -> str:
    """Perform one asynchronous translation."""
    if not text:
        raise TranslationError("Cannot translate an empty string.")

    try:
        result = await translator.translate(
            text,
            src=source,
            dest=destination,
        )
    except Exception as exc:
        raise TranslationError(
            f"Translation failed: {source} -> {destination}: {exc}"
        ) from exc

    if result is None or not getattr(result, "text", None):
        raise TranslationError(
            f"Translation returned no text: {source} -> {destination}."
        )

    return result.text


async def translate_chain(
    text: str,
    languages: List[str],
    translator: Optional[Translator] = None,
) -> dict:
    """
    Translate an English message through the selected language chain.

    For each selected language:
      1. Translate current text into that language.
      2. Back-translate that result into English.
      3. Store both results.

    A Translator supplied by the caller is reused.  If none is supplied,
    this function creates and closes its own Translator.
    """
    if not isinstance(text, str):
        raise ValueError("text must be a string.")

    text = text.strip()
    if not text:
        raise ValueError("text cannot be empty.")

    languages = validate_language_path(languages)

    own_translator = translator is None
    if own_translator:
        translator = Translator()

    current_text = text
    current_language = "en"
    steps: List[TranslationStep] = []

    try:
        for index, target_language in enumerate(languages, start=1):
            translated_text = await _translate(
                translator=translator,
                text=current_text,
                source=current_language,
                destination=target_language,
            )

            back_translation = await _translate(
                translator=translator,
                text=translated_text,
                source=target_language,
                destination="en",
            )

            steps.append(
                TranslationStep(
                    step=index,
                    source_language=current_language,
                    source_language_name=_language_name(current_language),
                    target_language=target_language,
                    target_language_name=_language_name(target_language),
                    input_text=current_text,
                    translated_text=translated_text,
                    back_translation=back_translation,
                )
            )

            current_text = translated_text
            current_language = target_language

        return {
            "original_text": text,
            "initial_language": "en",
            "initial_language_name": "English",
            "language_path": languages,
            "language_path_display": [
                _language_name("en")
            ] + [_language_name(code) for code in languages],
            "final_translation": current_text,
            "final_language": current_language,
            "steps": [asdict(step) for step in steps],
        }
    finally:
        if own_translator:
            await translator.__aexit__(None, None, None)


async def demo():
    """Small command-line demonstration."""
    example_text = "The quick brown fox jumps over the lazy dog."
    example_languages = ["zh-CN", "es", "ar"]

    async with Translator() as translator:
        result = await translate_chain(
            example_text,
            example_languages,
            translator=translator,
        )

    print("Original:", result["original_text"])
    print("Path:", " -> ".join(result["language_path_display"]))

    for step in result["steps"]:
        print(f"\nStep {step['step']}:")
        print(
            f"{step['source_language_name']} -> "
            f"{step['target_language_name']}"
        )
        print("Translation:", step["translated_text"])
        print("English back-translation:", step["back_translation"])


if __name__ == "__main__":
    import asyncio
    asyncio.run(demo())
