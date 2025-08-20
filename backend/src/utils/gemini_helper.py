import os
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

try:
    import google.generativeai as genai
except Exception as e:
    genai = None
    logger.warning("google-generativeai not available: %s", e)

# Use flash model for higher quota limits
GEMINI_MODEL_NAME = os.environ.get("GEMINI_MODEL_NAME", "gemini-1.5-flash")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

PROMPT = """You are an expert email security analyst. Analyze the following email text and classify it as either "phishing" (malicious/suspicious) or "safe" (legitimate).

Pay special attention to:
- Personal messages, greetings, and casual communications are typically SAFE
- Urgent requests for credentials, payments, or account verification are often PHISHING
- Suspicious links, unusual domains, or pressure tactics indicate PHISHING
- Short, personal messages like "hi", "hello", "how are you" are almost always SAFE
- Business communications without suspicious elements are typically SAFE

Respond with ONLY valid JSON in this exact format:
{
  "verdict": "safe|phishing", 
  "confidence": 0.9,
  "reasons": ["reason1", "reason2"],
  "indicators": [{"type": "content", "value": "specific_text"}],
  "recommendation": "brief action recommendation"
}

Be especially careful not to flag normal human communications as phishing."""

def _configure_client():
    if genai is None:
        return False
    api_key = GEMINI_API_KEY or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        logger.info("No GEMINI_API_KEY/GOOGLE_API_KEY set; skipping LLM assist.")
        return False
    try:
        genai.configure(api_key=api_key)
        return True
    except Exception as e:
        logger.error("Failed to configure Gemini client: %s", e)
        return False


def analyze_email_with_gemini(email_text: str) -> Dict[str, Any]:
    """Call Gemini to analyze email. Returns dict with fallback if unavailable."""
    if not _configure_client():
        return {"enabled": False}
    try:
        model = genai.GenerativeModel(GEMINI_MODEL_NAME)
        prompt = f"{PROMPT}\n\nEMAIL TEXT TO ANALYZE:\n{email_text}"
        
        # Configure generation parameters for more consistent JSON output
        generation_config = {
            "temperature": 0.1,  # Low temperature for consistency
            "top_p": 0.8,
            "top_k": 40,
            "max_output_tokens": 1000,
        }
        
        resp = model.generate_content(prompt, generation_config=generation_config)
        text = resp.text or "{}"
        
        # Clean up the response text (remove markdown if present)
        if text.startswith("```json"):
            text = text.replace("```json", "").replace("```", "").strip()
        elif text.startswith("```"):
            text = text.replace("```", "").strip()
            
        import json
        data = json.loads(text)
        
        # Normalize expected fields
        verdict = str(data.get("verdict", "safe")).lower()
        if verdict not in ("phishing", "safe"):
            verdict = "safe"
        confidence = float(data.get("confidence", 0.5))
        confidence = max(0.0, min(1.0, confidence))
        
        logger.info(f"Gemini analysis complete: {verdict} ({confidence:.2f})")
        
        return {
            "enabled": True,
            "verdict": verdict,
            "confidence": confidence,
            "reasons": data.get("reasons", []),
            "indicators": data.get("indicators", []),
            "recommendation": data.get("recommendation") or ("Avoid links and attachments" if verdict=="phishing" else "No action needed"),
            "raw": data,
        }
    except Exception as e:
        error_str = str(e)
        if "429" in error_str or "quota" in error_str.lower():
            logger.warning("Gemini API quota exceeded - continuing without LLM assist")
        else:
            logger.error("Gemini analysis failed: %s", e)
        return {"enabled": False, "error": str(e)} 