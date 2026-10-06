"""
Basic structural test.

This test performs a real translation request, so it requires internet
access and googletrans to be installed.
"""

import asyncio

from translation import translate_chain


async def main():
    result = await translate_chain(
        "Hello world",
        ["es"],
    )

    assert result["original_text"] == "Hello world"
    assert result["language_path"] == ["es"]
    assert len(result["steps"]) == 1

    step = result["steps"][0]
    assert step["source_language"] == "en"
    assert step["target_language"] == "es"
    assert step["translated_text"]
    assert step["back_translation"]

    print("Translation test passed.")


if __name__ == "__main__":
    asyncio.run(main())
