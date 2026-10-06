# Indy-2 Phase 2 Translation Backend — googletrans 4.0.2

This version updates the original Phase 2 backend to use the current
`googletrans` 4.0.2 asynchronous API.

The old `googletrans==4.0.0-rc1` dependency should no longer be used.

## Requirements

Python 3.8 or newer is required by the current googletrans package metadata.
The current package is `googletrans 4.0.2`.

## Installation

Open PowerShell in this folder:

```powershell
python -m pip uninstall googletrans -y
python -m pip install -r requirements.txt
```

Verify:

```powershell
python -m pip show googletrans
```

You should see:

```text
Version: 4.0.2
```

## Start the API

Use this form rather than relying on the `uvicorn` executable being on PATH:

```powershell
python -m uvicorn main:app --reload
```

Then open:

```text
http://127.0.0.1:8000/docs
```

## Test

Use `POST /translate` with:

```json
{
  "text": "The quick brown fox jumps over the lazy dog.",
  "languages": [
    "zh-CN",
    "es",
    "ar"
  ]
}
```

The response includes each forward translation and its English
back-translation.

## Important

`googletrans` is an unofficial client that accesses Google Translate's
service. It is being used for the current prototype as requested. It can
therefore be less stable than Google's official Cloud Translation API.

The translation implementation is isolated in `translation.py`, so the
backend can later be changed to the official Google Cloud client without
changing the frontend request format.

## Next Phase

The intended next component is `similarity.py`, which will receive the
original English text and each English back-translation and calculate:

```text
similarity score
loss = 1 - similarity
```

using the selected cross-encoder.
