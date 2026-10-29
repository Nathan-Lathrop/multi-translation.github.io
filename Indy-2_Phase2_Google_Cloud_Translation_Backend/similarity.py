from functools import lru_cache
from sentence_transformers import CrossEncoder

MODEL_NAME = "cross-encoder/stsb-roberta-base"


@lru_cache(maxsize=1)
def get_similarity_model() -> CrossEncoder:
    return CrossEncoder(MODEL_NAME)


def compare_texts(previous_text: str, current_text: str) -> dict:
    previous_text = previous_text.strip()
    current_text = current_text.strip()

    if not previous_text or not current_text:
        raise ValueError("Both texts are required for similarity comparison.")

    model = get_similarity_model()
    raw_score = float(model.predict([(previous_text, current_text)])[0])

    # Convert the model's 0–1 score to a 0–100 percentage scale.
    similarity_score = max(0.0, min(100.0, raw_score * 100.0))
    meaning_loss = 100.0 - similarity_score

    return {
        "raw_similarity_score": round(raw_score, 4),
        "similarity_score": round(similarity_score, 2),
        "estimated_meaning_loss": round(meaning_loss, 2),
        "comparison_method": MODEL_NAME,
    }


def score_translation_steps(result: dict) -> dict:
    steps = result.get("steps", [])
    original_text = (result.get("original_text") or "").strip()

    # Tracks the previous step's English back-translation.
    # The original message is used as the comparison text for Step 1.
    previous_back_translation = original_text

    # Tracks similarity to the original for calculating loss increases.
    previous_original_similarity = None

    greatest_cumulative_loss = -1.0
    greatest_cumulative_loss_step = None

    greatest_step_drop = 0.0
    greatest_step_drop_step = None

    for index, step in enumerate(steps):
        current_text = (step.get("back_translation") or "").strip()
        step_number = step.get("step", index + 1)

        # All main scores compare against the original English message.
        step["comparison_text"] = original_text

        if not original_text or not current_text:
            step["raw_similarity_score"] = None
            step["similarity_score"] = None
            step["estimated_meaning_loss"] = None
            step["previous_step_similarity_score"] = None
            step["similarity_drop_since_previous_step"] = None
            step["comparison_method"] = MODEL_NAME

            # Reset the comparison history so a missing step is not skipped.
            previous_back_translation = current_text
            previous_original_similarity = None
            continue

        # Output 1 and Output 2:
        # Compare the current back-translation with the original message.
        original_scores = compare_texts(original_text, current_text)
        step.update(original_scores)

        current_similarity = original_scores["similarity_score"]
        current_loss = original_scores["estimated_meaning_loss"]

        # Output 4: similarity to the immediately preceding step.
        # For Step 1, previous_back_translation is the original message.
        # For later steps, it is the preceding English back-translation.
        if index == 0:
            # Step 1 has no preceding translation, so use its
            # similarity to the original message.
            step["previous_step_similarity_score"] = current_similarity

        elif previous_back_translation:
            # Compare the immediately preceding English back-translation
            # with the current English back-translation.
            previous_step_scores = compare_texts(
                previous_back_translation,
                current_text
            )

            step["previous_step_similarity_score"] = (
                previous_step_scores["similarity_score"]
            )

        else:
            # The immediately preceding step had no usable back-translation.
            step["previous_step_similarity_score"] = None

        # Output 3: change in similarity to the original compared with
        # the preceding step's similarity to the original.
        # Positive = similarity decreased.
        # Negative = similarity improved.
        if previous_original_similarity is None:
            step["similarity_drop_since_previous_step"] = None
        else:
            step_drop = round(
                previous_original_similarity - current_similarity,
                2
            )

            step["similarity_drop_since_previous_step"] = step_drop

            if step_drop > greatest_step_drop:
                greatest_step_drop = step_drop
                greatest_step_drop_step = step_number

        # Track the greatest cumulative loss relative to the original.
        if current_loss > greatest_cumulative_loss:
            greatest_cumulative_loss = current_loss
            greatest_cumulative_loss_step = step_number

        # Save the current step for the next iteration.
        previous_back_translation = current_text
        previous_original_similarity = current_similarity

    result["similarity_model"] = MODEL_NAME

    # Largest cumulative loss compared with the original.
    if greatest_cumulative_loss_step is not None:
        result["greatest_cumulative_loss_step"] = (
            greatest_cumulative_loss_step
        )
        result["greatest_cumulative_meaning_loss"] = round(
            greatest_cumulative_loss, 2
        )
    else:
        result["greatest_cumulative_loss_step"] = None
        result["greatest_cumulative_meaning_loss"] = None

    # Largest decrease in similarity to the original between consecutive steps.
    if greatest_step_drop_step is not None:
        result["greatest_loss_increase_step"] = greatest_step_drop_step
        result["greatest_loss_increase"] = round(greatest_step_drop, 2)
    else:
        result["greatest_loss_increase_step"] = None
        result["greatest_loss_increase"] = None

    return result