from __future__ import annotations

from dataclasses import asdict, dataclass
import os
from typing import Dict, List, Optional

from google.api_core import exceptions as google_exceptions
from google.cloud import translate_v3
import random
from functools import lru_cache

@lru_cache(maxsize=1)
def _get_supported_language_map():
    """
    Retrieve and cache all languages supported as translation targets
    by Google Cloud Translation's general model.
    """
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")

    if not project_id:
        raise TranslationError(
            "GOOGLE_CLOUD_PROJECT is not configured."
        )

    client = translate_v3.TranslationServiceClient()

    try:
        response = client.get_supported_languages(
            parent=f"projects/{project_id}/locations/global",
            display_language_code="en",
        )

        return {
            language.language_code: language.display_name
            for language in response.languages
            if language.support_target
        }
    finally:
        client.transport.close()


def get_supported_languages():
    """
    Return supported target languages in the format expected by app.js.
    """
    language_map = _get_supported_language_map()

    return [
        {"code": code, "name": name}
        for code, name in sorted(
            language_map.items(),
            key=lambda item: item[1].casefold()
        )
    ]


def _language_name(code):
    """
    Return the English display name for a language code.
    """
    return _get_supported_language_map().get(code, code)
MAX_TRANSLATION_STEPS = 50

class TranslationError(RuntimeError):
    pass

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

def validate_language_path(languages: List[str]) -> List[str]:
    if not isinstance(languages, list) or not languages:
        raise ValueError("At least one translation language is required.")
    if len(languages) > MAX_TRANSLATION_STEPS:
        raise ValueError(f"A maximum of {MAX_TRANSLATION_STEPS} translation steps is allowed.")
    result = []
    for code in languages:
        if not isinstance(code, str) or code.strip() not in _get_supported_language_map():
            raise ValueError(f"Unsupported language code '{code}'.")
        code = code.strip()
        if code == "en":
            raise ValueError("English is reserved for the original and back-translation stages.")
        result.append(code)
    return result

def _project_id() -> str:
    value = os.getenv("GOOGLE_CLOUD_PROJECT")
    if not value:
        raise TranslationError(
            "GOOGLE_CLOUD_PROJECT is not set. Set it to your Google Cloud project ID."
        )
    return value

def _translate(client, project_id: str, text: str, source: str, destination: str) -> str:
    request = translate_v3.TranslateTextRequest(
        parent=f"projects/{project_id}/locations/global",
        source_language_code=source,
        target_language_code=destination,
        mime_type="text/plain",
        contents=[text],
    )
    try:
        response = client.translate_text(request=request)
    except google_exceptions.Unauthenticated as exc:
        raise TranslationError(
            "Google Cloud authentication failed. Run 'gcloud auth application-default login'."
        ) from exc
    except google_exceptions.PermissionDenied as exc:
        raise TranslationError(
            "Google Cloud denied the request. Check that Cloud Translation API is enabled "
            "and the account has permission to use it."
        ) from exc
    except google_exceptions.ResourceExhausted as exc:
        raise TranslationError("Google Cloud Translation quota was exhausted or rate limited.") from exc
    except Exception as exc:
        raise TranslationError(f"Google Cloud Translation failed: {exc}") from exc

    if not response.translations or not response.translations[0].translated_text:
        raise TranslationError(f"No translation returned for {source} -> {destination}.")
    return response.translations[0].translated_text

def translate_chain(text: str, languages: List[str],
                    client: Optional[translate_v3.TranslationServiceClient] = None) -> dict:
        if not languages:
            raise ValueError("Select at least one translation step.")

        if len(languages) > 10:
            raise ValueError("A translation path cannot exceed 10 steps.")

        supported_languages = _get_supported_language_map()

        # Resolve Random selections before running the translation loop.
        resolved_languages = []
        current_language = "en"

        for requested_language in languages:
            if requested_language == "__random__":
                candidates = [
                    code
                    for code in supported_languages
                    if code != current_language and code != "en"
                ]

                if not candidates:
                    raise ValueError(
                        "No eligible languages are available for random selection."
                    )

                target_language = random.choice(candidates)

            else:
                target_language = requested_language

                if target_language not in supported_languages:
                    raise ValueError(
                        f"Unsupported target language: {target_language}"
                    )

            resolved_languages.append(target_language)
            current_language = target_language

        # The existing translation loop should use these resolved codes.
        languages = resolved_languages
        project_id = _project_id()
        own_client = client is None
        client = client or translate_v3.TranslationServiceClient()

        current_text, current_language = text.strip(), "en"
        steps = []
        try:
            for i, target in enumerate(languages, 1):
                translated = _translate(client, project_id, current_text, current_language, target)
                back = _translate(client, project_id, translated, target, "en")
                steps.append(TranslationStep(
                    i, current_language, _language_name(current_language),
                    target, _language_name(target), current_text, translated, back
                ))
                current_text, current_language = translated, target
            return {
                "original_text": text.strip(),
                "initial_language": "en",
                "initial_language_name": "English",
                "language_path": languages,
                "language_path_display": (
                    ["English"] + [_language_name(c) for c in languages]
                ),
                "final_translation": steps[-1]["back_translation"]
                    if isinstance(steps[-1], dict)
                    else steps[-1].back_translation,
                "final_language": "en",
                "final_language_name": "English",
                "steps": [asdict(s) for s in steps],
            }
        finally:
            if own_client:
                client.transport.close()
