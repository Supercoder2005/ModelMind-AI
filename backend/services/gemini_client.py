"""
Gemini API client.

Wraps all calls to google-generativeai. Every method:
  1. Builds a prompt via prompts/prompts.py
  2. Calls Gemini with response_mime_type="application/json"
  3. Parses the JSON and returns a typed dict
"""
import json
import os
import logging
from typing import Any

import google.generativeai as genai
from dotenv import load_dotenv

from prompts.prompts import (
    eda_prompt,
    explanation_prompt,
    cluster_persona_prompt,
    next_steps_prompt,
    code_commentary_prompt,
)

load_dotenv()
logger = logging.getLogger(__name__)


class GeminiClient:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not set in environment")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(
            model_name="gemini-3-flash-preview",
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.3,
            ),
        )

    def _call(self, prompt: str) -> dict[str, Any]:
        """Send a prompt and return parsed JSON dict."""
        try:
            response = self.model.generate_content(prompt)
            text = response.text.strip()
            # Strip accidental markdown fences just in case
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            return json.loads(text)
        except json.JSONDecodeError as e:
            logger.error("Gemini returned non-JSON: %s", response.text[:500])
            raise ValueError(f"Gemini response was not valid JSON: {e}") from e
        except Exception as e:
            logger.error("Gemini API error: %s", str(e))
            raise

    # ------------------------------------------------------------------
    # Public methods
    # ------------------------------------------------------------------

    def detect_problem(self, profile: dict, domain: str | None = None) -> dict:
        """
        EDA & problem type detection.
        Returns: {problem_type, target_col, domain_guess, confidence, observations, narrative}
        """
        prompt = eda_prompt(profile, domain)
        return self._call(prompt)

    def explain(self, results: dict, expertise_level: str, domain: str | None = None) -> dict:
        """
        Natural language explanation of model results, adapted to expertise level.
        Returns: {summary, why_winner, tradeoffs, feature_insights, domain_interpretation, actions}
        """
        prompt = explanation_prompt(results, expertise_level, domain)
        return self._call(prompt)

    def cluster_personas(self, centroids: dict, domain: str | None = None) -> dict:
        """
        Name and describe each cluster as a business persona.
        Returns: {clusters: [{id, name, tagline, characteristics, action, color}]}
        """
        prompt = cluster_persona_prompt(centroids, domain)
        return self._call(prompt)

    def next_steps(self, full_results: dict) -> dict:
        """
        Generate 4-5 prioritized next-step recommendations.
        Returns: {steps: [{title, detail, priority}]}
        """
        prompt = next_steps_prompt(full_results)
        return self._call(prompt)

    def code_commentary(self, pipeline_steps: list[str], domain: str | None = None) -> dict:
        """
        Generate educational markdown comments for each notebook cell.
        Returns: {cells: [{step_index, markdown_comment}]}
        """
        prompt = code_commentary_prompt(pipeline_steps, domain)
        return self._call(prompt)


# Singleton instance — import this in routers
gemini = GeminiClient()
