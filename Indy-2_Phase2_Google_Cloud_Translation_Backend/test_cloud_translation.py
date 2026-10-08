import os
from google.cloud import translate_v3

project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
if not project_id:
    raise RuntimeError('Set GOOGLE_CLOUD_PROJECT first, e.g. $env:GOOGLE_CLOUD_PROJECT="YOUR_PROJECT_ID"')

client = translate_v3.TranslationServiceClient()
response = client.translate_text(request=translate_v3.TranslateTextRequest(
    parent=f"projects/{project_id}/locations/global",
    source_language_code="en",
    target_language_code="es",
    mime_type="text/plain",
    contents=["The quick brown fox jumps over the lazy dog."],
))
print(response.translations[0].translated_text)
