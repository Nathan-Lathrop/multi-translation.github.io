from __future__ import annotations

from dataclasses import asdict, dataclass
import os
from typing import Dict, List, Optional

from google.api_core import exceptions as google_exceptions
from google.cloud import translate_v3

SUPPORTED_LANGUAGES: Dict[str, str] = {
    "af":"Afrikaans","ar":"Arabic","bn":"Bengali","bg":"Bulgarian",
    "ca":"Catalan","cs":"Czech","da":"Danish","de":"German","el":"Greek",
    "es":"Spanish","et":"Estonian","fa":"Persian","fi":"Finnish",
    "fr":"French","gu":"Gujarati","he":"Hebrew","hi":"Hindi","hr":"Croatian",
    "hu":"Hungarian","id":"Indonesian","it":"Italian","ja":"Japanese",
    "kn":"Kannada","ko":"Korean","lt":"Lithuanian","lv":"Latvian",
    "ml":"Malayalam","mr":"Marathi","ne":"Nepali","nl":"Dutch","no":"Norwegian",
    "pa":"Punjabi","pl":"Polish","pt":"Portuguese","ro":"Romanian",
    "ru":"Russian","sk":"Slovak","sl":"Slovenian","sr":"Serbian",
    "sv":"Swedish","sw":"Swahili","ta":"Tamil","te":"Telugu","th":"Thai",
    "tr":"Turkish","uk":"Ukrainian","ur":"Urdu","vi":"Vietnamese",
    "zh-CN":"Chinese (Simplified)","zh-TW":"Chinese (Traditional)"
}
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

def _language_name(code: str) -> str:
    return SUPPORTED_LANGUAGES.get(code, code)

def validate_language_path(languages: List[str]) -> List[str]:
    if not isinstance(languages, list) or not languages:
        raise ValueError("At least one translation language is required.")
    if len(languages) > MAX_TRANSLATION_STEPS:
        raise ValueError(f"A maximum of {MAX_TRANSLATION_STEPS} translation steps is allowed.")
    result = []
    for code in languages:
        if not isinstance(code, str) or code.strip() not in SUPPORTED_LANGUAGES:
            raise ValueError(f"Unsupported language code '{code}'.")
        code = code.strip()
        if code == "en":
            raise ValueError("English is reserved for the original and back-translation stages.")
        result.append(code)
    return result

def get_supported_languages() -> List[dict]:
    return [{"code": c, "name": n} for c, n in SUPPORTED_LANGUAGES.items()]

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
    if not isinstance(text, str) or not text.strip():
        raise ValueError("text cannot be empty.")
    languages = validate_language_path(languages)
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
            "language_path_display": ["English"] + [_language_name(c) for c in languages],
            "final_translation": current_text,
            "final_language": current_language,
            "steps": [asdict(s) for s in steps],
        }
    finally:
        if own_client:
            client.close()
