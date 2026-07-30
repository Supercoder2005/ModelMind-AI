"""
All Gemini prompt templates — single source of truth.

Every function returns a string ready to be sent to the Gemini API.
All prompts instruct Gemini to return ONLY valid JSON (no markdown fences, no prose).
"""

# ---------------------------------------------------------------------------
# 1. EDA / Problem Detection
# ---------------------------------------------------------------------------

def eda_prompt(profile: dict, domain: str | None = None) -> str:
    domain_hint = f'The user suspects the domain is: "{domain}".' if domain else "The domain is unknown — infer it."
    stripped_profile = {k: v for k, v in profile.items() if k != "sample_rows"}
    return f"""
You are an expert data scientist. Analyze the following dataset profile and respond with a JSON object.

{domain_hint}

Dataset Profile:
{stripped_profile}

Respond ONLY with a valid JSON object (no markdown, no extra text) with EXACTLY these keys:

{{
  "problem_type": "<one of: classification, regression, clustering, timeseries>",
  "target_col": "<most likely target column name, or null if clustering/timeseries>",
  "domain_guess": "<inferred domain, e.g. Healthcare, Finance, Retail, HR, Marketing, Real Estate, Other>",
  "confidence": "<low | medium | high>",
  "observations": [
    "<interesting observation 1>",
    "<interesting observation 2>",
    "<interesting observation 3>"
  ],
  "narrative": "<2-3 sentence friendly description of what this dataset is about and what we can learn from it>"
}}
""".strip()


# ---------------------------------------------------------------------------
# 2. Model Explanation (adapts to expertise level)
# ---------------------------------------------------------------------------

EXPERTISE_INSTRUCTIONS = {
    "beginner": (
        "Explain everything without jargon. Use simple analogies and everyday language. "
        "Express accuracy as 'X out of 100 times'. Avoid all technical terms."
    ),
    "learner": (
        "Introduce technical terms but always define them in parentheses. "
        "For example: 'accuracy (how often the model is correct)'. Keep sentences short."
    ),
    "practitioner": (
        "Use standard ML vocabulary freely: F1-score, precision, recall, AUC-ROC, RMSE, etc. "
        "The reader is a working data scientist."
    ),
    "expert": (
        "Provide dense technical output. Discuss hyperparameter sensitivity, bias-variance tradeoff, "
        "statistical significance, confidence intervals, potential data leakage risks, and production considerations."
    ),
}


def explanation_prompt(results: dict, expertise_level: str, domain: str | None = None) -> str:
    expertise_instruction = EXPERTISE_INSTRUCTIONS.get(expertise_level, EXPERTISE_INSTRUCTIONS["practitioner"])
    domain_ctx = f'Domain context: {domain}.' if domain else ""
    return f"""
You are an expert ML educator. {domain_ctx}

Expertise level instruction: {expertise_instruction}

Model training results:
{results}

Respond ONLY with a valid JSON object (no markdown, no extra text) with EXACTLY these keys:

{{
  "summary": "<2-3 sentence plain-language summary of what was done and what the model achieved>",
  "why_winner": "<explain why the winning model outperformed the others>",
  "tradeoffs": "<when would you prefer the runner-up model instead?>",
  "feature_insights": [
    {{"feature": "<name>", "insight": "<what this feature means for predictions>"}},
    ...
  ],
  "domain_interpretation": "<what do these results mean specifically in the {domain or 'given'} domain?>",
  "actions": [
    "<actionable recommendation 1>",
    "<actionable recommendation 2>",
    "<actionable recommendation 3>"
  ]
}}
""".strip()


# ---------------------------------------------------------------------------
# 3. Cluster Persona Naming
# ---------------------------------------------------------------------------

def cluster_persona_prompt(centroids: dict, domain: str | None = None) -> str:
    domain_ctx = f'This is a {domain} dataset.' if domain else ""
    return f"""
You are a business analyst specializing in customer segmentation. {domain_ctx}

Here are the cluster centroids (mean feature values per cluster):
{centroids}

Give each cluster a memorable business name, a catchy tagline, key characteristics, and a recommended action.

Respond ONLY with a valid JSON object (no markdown, no extra text):

{{
  "clusters": [
    {{
      "id": 0,
      "name": "<memorable 2-4 word name>",
      "tagline": "<one catchy sentence>",
      "characteristics": ["<trait 1>", "<trait 2>", "<trait 3>"],
      "action": "<one recommended business action>",
      "color": "<a hex color code to visually identify this cluster>"
    }},
    ...
  ]
}}
""".strip()


# ---------------------------------------------------------------------------
# 4. Next Steps / Recommendations
# ---------------------------------------------------------------------------

def next_steps_prompt(full_results: dict) -> str:
    return f"""
You are a senior ML consultant reviewing the results of an automated analysis.

Full analysis results:
{full_results}

Provide 4-5 concrete, actionable next steps for improving the analysis or deploying the model.

Respond ONLY with a valid JSON object (no markdown, no extra text):

{{
  "steps": [
    {{
      "title": "<short action title>",
      "detail": "<1-2 sentence explanation>",
      "priority": "<high | medium | low>"
    }},
    ...
  ]
}}
""".strip()


# ---------------------------------------------------------------------------
# 5. Notebook Code Commentary
# ---------------------------------------------------------------------------

def code_commentary_prompt(pipeline_steps: list[str], domain: str | None = None) -> str:
    domain_ctx = f'This analysis was performed on a {domain} dataset.' if domain else ""
    steps_text = "\n".join(f"{i+1}. {s}" for i, s in enumerate(pipeline_steps))
    return f"""
You are Python educator writing comments for a Jupyter notebook. {domain_ctx}
 
The following analysis pipeline steps were performed:
{steps_text}
 
For each step, write a clear, educational Markdown cell that explains WHY this step was done,
not just what it does.
 
Respond ONLY with a valid JSON object (no markdown, no extra text):
 
{{
  "cells": [
    {{
      "step_index": 0,
      "markdown_comment": "<educational markdown comment for this step>"
    }},
    ...
  ]
}}
""".strip()


# ---------------------------------------------------------------------------
# 6. Define Suggestions
# ---------------------------------------------------------------------------

def suggestions_prompt(profile: dict, domain: str | None = None) -> str:
    domain_hint = f'The domain is: "{domain}".' if domain else "The domain is unknown."
    stripped_profile = {k: v for k, v in profile.items() if k != "sample_rows"}
    return f"""
You are an expert data science advisor. Analyze this dataset profile:
{stripped_profile}

{domain_hint}

Suggest:
1. 2-3 alternative target columns (if any) and why they would be interesting.
2. Recommended business goals for this dataset.
3. Recommended metrics for evaluation.

Respond ONLY with a valid JSON object (no markdown, no extra text) with EXACTLY these keys:
{{
  "suggested_targets": [
    {{"column": "<col_name>", "reason": "<why we should predict this column>"}}
  ],
  "business_goals": [
    "<goal 1>", "<goal 2>"
  ],
  "metrics": [
    {{"metric": "<metric_name>", "reason": "<why we should use this metric>"}}
  ]
}}
""".strip()


# ---------------------------------------------------------------------------
# 7. Attribute Explanations
# ---------------------------------------------------------------------------

def attribute_explanation_prompt(columns_info: list[dict], domain: str | None = None) -> str:
    domain_hint = f'The domain is: "{domain}".' if domain else ""
    return f"""
You are an expert data cataloger. {domain_hint}
Given the list of columns, their data types, and sample values:
{columns_info}

Explain each column in exactly 2-3 lines of friendly, easy-to-understand English.

Respond ONLY with a valid JSON object (no markdown, no extra text) in this format:
{{
  "explanations": {{
    "<column_name_1>": "<explanation>",
    "<column_name_2>": "<explanation>",
    ...
  }}
}}
""".strip()


# ---------------------------------------------------------------------------
# 8. Final Conclusion
# ---------------------------------------------------------------------------

def final_conclusion_prompt(full_results: dict, domain: str | None = None) -> str:
    domain_hint = f'Domain: {domain}.' if domain else ""
    return f"""
You are a principal machine learning scientist writing the final report. {domain_hint}
Here are the complete details of the ML pipeline execution:
{full_results}

Write a comprehensive, publication-ready final conclusion summarizing:
1. Executive Summary: The business problem, problem type, and dataset size.
2. Preprocessing & Feature Engineering: What was done and how it cleaned/improved features.
3. Model Competition & Training: K-fold cross-validation results and how the winning model outperformed the others.
4. Deployment & Business Impact: How this winning model can be used by business owners.

Respond ONLY with a valid JSON object (no markdown, no extra text) with EXACTLY these keys:
{{
  "executive_summary": "<summary>",
  "preprocessing_summary": "<summary>",
  "model_performance_summary": "<summary>",
  "business_impact": "<impact>",
  "overall_conclusion": "<comprehensive conclusion paragraph>"
}}
""".strip()
