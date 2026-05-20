"""
Gemini and Groq LLM client with automatic failover fallback.

Every method:
  1. Builds a prompt via prompts/prompts.py
  2. Calls either Gemini or Groq (OpenAI-compatible chat completion via urllib)
  3. Automatically switches if rate limits/quotas are hit.
  4. Parses the JSON and returns a typed dict.
"""
import json
import os
import time
import logging
import urllib.request
import urllib.error
from typing import Any

import google.generativeai as genai
from dotenv import load_dotenv

from prompts.prompts import (
    eda_prompt,
    explanation_prompt,
    cluster_persona_prompt,
    next_steps_prompt,
    code_commentary_prompt,
    suggestions_prompt,
    attribute_explanation_prompt,
    final_conclusion_prompt,
)

load_dotenv()
logger = logging.getLogger(__name__)


class GeminiClient:
    def __init__(self):
        # Configure Gemini
        gemini_key = os.getenv("GEMINI_API_KEY")
        if gemini_key:
            genai.configure(api_key=gemini_key)
            self.model = genai.GenerativeModel(
                model_name="gemini-2.5-flash",
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    temperature=0.3,
                ),
            )
        else:
            logger.warning("GEMINI_API_KEY not found in environment")
            self.model = None

        # Tracking rate-limit/exhaustion state
        self.gemini_exhausted_until = 0.0
        self.groq_exhausted_until = 0.0

    def _call_gemini(self, prompt: str) -> dict[str, Any]:
        """Direct call to Gemini API."""
        if not self.model:
            raise ValueError("Gemini Model not configured (missing API key)")
        
        response = self.model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text)

    def _call_groq(self, prompt: str) -> dict[str, Any]:
        """Direct call to Groq API using urllib (zero dependencies)."""
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY not set in environment")
        
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        }
        
        # Using Llama 3.3 70B as primary fallback for high quality structured output
        data = {
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.3
        }
        
        req = urllib.request.Request(
            url, 
            data=json.dumps(data).encode("utf-8"), 
            headers=headers,
            method="POST"
        )
        
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                res_body = response.read().decode("utf-8")
                res_json = json.loads(res_body)
                text = res_json["choices"][0]["message"]["content"].strip()
                if text.startswith("```"):
                    text = text.split("```")[1]
                    if text.startswith("json"):
                        text = text[4:]
                return json.loads(text)
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8") if e.fp else ""
            logger.error("Groq HTTP Error %d: %s", e.code, err_body)
            raise ValueError(f"Groq API HTTP Error {e.code}: {err_body}") from e
        except Exception as e:
            logger.error("Groq API connection error: %s", str(e))
            raise

    def _call(self, prompt: str) -> dict[str, Any]:
        """Send a prompt with automatic failover between Gemini and Groq."""
        now = time.time()
        errors = []

        # Case A: Gemini is currently cooling down
        if now < self.gemini_exhausted_until:
            logger.info("Gemini cooldown active. Routing primarily to Groq...")
            try:
                return self._call_groq(prompt)
            except Exception as groq_err:
                logger.warning("Groq failed during Gemini cooldown: %s. Re-trying Gemini...", str(groq_err))
                errors.append(f"Groq error: {groq_err}")
                try:
                    res = self._call_gemini(prompt)
                    self.gemini_exhausted_until = 0.0 # reset cooldown since it succeeded
                    return res
                except Exception as gemini_err:
                    errors.append(f"Backup Gemini error: {gemini_err}")
            raise RuntimeError("Both LLM APIs failed:\n" + "\n".join(errors))

        # Case B: Groq is currently cooling down
        if now < self.groq_exhausted_until:
            logger.info("Groq cooldown active. Routing primarily to Gemini...")
            try:
                return self._call_gemini(prompt)
            except Exception as gemini_err:
                logger.warning("Gemini failed during Groq cooldown: %s. Re-trying Groq...", str(gemini_err))
                errors.append(f"Gemini error: {gemini_err}")
                try:
                    res = self._call_groq(prompt)
                    self.groq_exhausted_until = 0.0 # reset cooldown
                    return res
                except Exception as groq_err:
                    errors.append(f"Backup Groq error: {groq_err}")
            raise RuntimeError("Both LLM APIs failed:\n" + "\n".join(errors))

        # Case C: Both are active. Attempt Gemini first.
        try:
            logger.info("Routing call to Gemini API...")
            return self._call_gemini(prompt)
        except Exception as gemini_err:
            logger.warning("Gemini API call failed: %s. Triggering Groq fallback...", str(gemini_err))
            self.gemini_exhausted_until = now + 90.0  # Cool down Gemini for 90 seconds
            errors.append(f"Gemini error: {gemini_err}")
            
            try:
                logger.info("Routing fallback call to Groq API...")
                return self._call_groq(prompt)
            except Exception as groq_err:
                logger.error("Groq API fallback also failed: %s", str(groq_err))
                self.groq_exhausted_until = now + 90.0  # Cool down Groq for 90 seconds
                errors.append(f"Groq error: {groq_err}")
                
        raise RuntimeError("Both LLM APIs failed:\n" + "\n".join(errors))

    # ------------------------------------------------------------------
    # Public methods
    # ------------------------------------------------------------------

    def detect_problem(self, profile: dict, domain: str | None = None) -> dict:
        """
        EDA & problem type detection.
        """
        prompt = eda_prompt(profile, domain)
        return self._call(prompt)

    def explain(self, results: dict, expertise_level: str, domain: str | None = None) -> dict:
        """
        Natural language explanation of model results.
        """
        prompt = explanation_prompt(results, expertise_level, domain)
        return self._call(prompt)

    def cluster_personas(self, centroids: dict, domain: str | None = None) -> dict:
        """
        Name and describe each cluster as a persona.
        """
        prompt = cluster_persona_prompt(centroids, domain)
        return self._call(prompt)

    def next_steps(self, full_results: dict) -> dict:
        """
        Generate Prioritized next-step recommendations.
        """
        prompt = next_steps_prompt(full_results)
        return self._call(prompt)

    def code_commentary(self, pipeline_steps: list[str], domain: str | None = None) -> dict:
        """
        Generate markdown code comments.
        """
        prompt = code_commentary_prompt(pipeline_steps, domain)
        return self._call(prompt)

    def get_suggestions(self, profile: dict, domain: str | None = None) -> dict:
        """Get suggestions for problem definition."""
        prompt = suggestions_prompt(profile, domain)
        return self._call(prompt)

    def explain_attributes(self, columns_info: list[dict], domain: str | None = None) -> dict:
        """Generate plain English variable explanations."""
        prompt = attribute_explanation_prompt(columns_info, domain)
        return self._call(prompt)

    def generate_conclusion(self, full_results: dict, domain: str | None = None) -> dict:
        """Generate final conclusion report."""
        prompt = final_conclusion_prompt(full_results, domain)
        return self._call(prompt)


# Singleton instance
gemini = GeminiClient()
