# Indy-2 Phase 2 — Google Cloud Translation Backend

This version uses the official Google Cloud Translation Advanced (v3) Python client instead of `googletrans`.

## Google Cloud setup

1. Create/select a Google Cloud project.
2. Enable billing.
3. Enable the Cloud Translation API.
4. Make sure your Google account has permission to use Cloud Translation.

Google recommends Application Default Credentials (ADC) with client libraries.

## Local authentication

Install the Google Cloud CLI, then:

```powershell
gcloud init
gcloud auth application-default login
$env:GOOGLE_CLOUD_PROJECT="YOUR_PROJECT_ID"
```

Do not commit credentials, tokens, or service-account JSON files to GitHub.

## Install

```powershell
python -m pip install -r requirements.txt
```

## Test Cloud Translation directly

```powershell
python test_cloud_translation.py
```

It should print a Spanish translation.

## Start the API

```powershell
python -m uvicorn main:app --reload
```

Open:

```text
http://127.0.0.1:8000/docs
```

POST `/translate` accepts:

```json
{
  "text": "The quick brown fox jumps over the lazy dog.",
  "languages": ["zh-CN", "es", "ar"]
}
```

The website request/response structure remains the same as the previous version.

## GitHub Pages

GitHub Pages hosts the frontend, not the Python FastAPI server. Production should be:

GitHub Pages -> hosted FastAPI backend -> Google Cloud Translation.

Keep Google credentials on the backend, never in browser JavaScript.

## Future similarity model

A future `similarity.py` can compare the original English input against each English back-translation using the selected cross-encoder.
