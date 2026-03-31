import json
import anthropic
import config

def _get_client_with_key(api_key=None):
    key = api_key or config.ANTHROPIC_API_KEY
    return anthropic.Anthropic(api_key=key)

def _call_claude(system_prompt, user_message):
    if not config.ANTHROPIC_API_KEY:
        raise ValueError(
            "ANTHROPIC_API_KEY is not set. "
            "Set it as an environment variable or add it to a local .env file (see .env.example)."
        )
    client = _get_client_with_key()
    response = client.messages.create(
        model=config.ANTHROPIC_MODEL,
        max_tokens=4096,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}]
    )
    return response.content[0].text


def _parse_json_response(text, fallback=None):
    """Strip markdown code fences from a Claude response and parse JSON."""
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3]
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        return fallback

def extract_brief(raw_text):
    system = """You are a marketing analyst. Extract structured event marketing information from the provided document text.
Return ONLY valid JSON with these fields:
{
  "name": "event name",
  "description": "brief event description",
  "target_audience": "who the event is for",
  "theme": "event theme or central topic",
  "goals": ["goal1", "goal2"],
  "dates": {"start": "YYYY-MM-DD or description", "end": "YYYY-MM-DD or description"},
  "location": "venue/location info",
  "additional_info": {"key_speakers": [], "sponsors": [], "budget_notes": "", "special_requirements": ""}
}
Fill in what you can extract. Use null for fields you cannot determine."""

    result = _call_claude(system, f"Extract marketing brief from this document:\n\n{raw_text[:8000]}")
    return _parse_json_response(result, fallback={"name": "Untitled Event", "description": result[:500]})

def suggest_platforms(event_data):
    system = """You are a digital marketing strategist. Based on the event details, suggest the most effective marketing platforms.
Return ONLY valid JSON array:
[{"platform": "platform_name", "reasoning": "why this platform"}]

Available platforms: instagram, linkedin, twitter_x, facebook, tiktok, youtube, google_ads, meta_ads, linkedin_ads, tiktok_ads
Include both organic and paid platforms. Suggest 4-8 platforms."""

    event_summary = f"""Event: {event_data.get('name')}
Description: {event_data.get('description')}
Target Audience: {event_data.get('target_audience')}
Theme: {event_data.get('theme')}
Goals: {event_data.get('goals')}
Location: {event_data.get('location')}"""

    result = _call_claude(system, event_summary)
    return _parse_json_response(result, fallback=[])

def generate_ideas(event_data, brand_voice, platforms):
    system = f"""You are a creative content strategist. Generate content ideas for event marketing.
Brand Voice: {brand_voice.get('name', 'Professional')} - {brand_voice.get('tone', '')}
Voice Guidelines: {brand_voice.get('description', '')}

Return ONLY valid JSON array of 6-10 content ideas:
[{{
  "title": "content title",
  "format": "video|poster|carousel|story|reel",
  "platform": "target platform",
  "timing": "when to publish (e.g. 2 weeks before event)",
  "angle": "creative angle or hook",
  "brief_description": "1-2 sentence description of the content"
}}]"""

    platform_list = ", ".join(p.get('platform', p) if isinstance(p, dict) else p for p in platforms)
    user_msg = f"""Event: {event_data.get('name')}
Description: {event_data.get('description')}
Target Audience: {event_data.get('target_audience')}
Theme: {event_data.get('theme')}
Goals: {json.dumps(event_data.get('goals', []))}
Platforms: {platform_list}

Generate creative, timely content ideas that align with the brand voice and target audience."""

    result = _call_claude(system, user_msg)
    return _parse_json_response(result, fallback=[])

def write_content(content_piece, event_data, brand_voice):
    system = f"""You are a marketing copywriter. Write content for the given content piece.
Brand Voice: {brand_voice.get('name', 'Professional')} - {brand_voice.get('tone', '')}
Do's: {brand_voice.get('dos', '[]')}
Don'ts: {brand_voice.get('donts', '[]')}

Return ONLY valid JSON:
{{
  "copywriting": "main content copy (2-4 paragraphs for posts, shorter for ads)",
  "video_script": "video script if format is video (include scenes/shots), null otherwise",
  "caption": "social media caption with relevant hashtags"
}}"""

    user_msg = f"""Content: {content_piece.get('title')}
Format: {content_piece.get('format')}
Platform: {content_piece.get('platform')}
Angle: {content_piece.get('angle')}
Event: {event_data.get('name')} - {event_data.get('description')}
Audience: {event_data.get('target_audience')}"""

    result = _call_claude(system, user_msg)
    return _parse_json_response(
        result,
        fallback={"copywriting": result[:1000], "video_script": None, "caption": ""}
    )

def recommend_ads(content_pieces, event_data):
    system = """You are a paid media strategist. Analyze the content pieces and recommend which should be promoted as paid ads.
Consider: content type, audience reach potential, conversion potential, and platform strengths.

Return ONLY valid JSON array:
[{
  "content_id": <id>,
  "should_promote": true/false,
  "ad_platform": "google_ads|social_media_ads",
  "reasoning": "why this should/shouldn't be promoted",
  "suggested_budget": <number in USD>,
  "suggested_duration_days": <number>
}]"""

    pieces_summary = json.dumps([{
        "id": p.get("id"), "title": p.get("title"), "format": p.get("format"),
        "platform": p.get("platform"), "angle": p.get("angle")
    } for p in content_pieces], indent=2)

    user_msg = f"""Event: {event_data.get('name')}
Target Audience: {event_data.get('target_audience')}
Goals: {json.dumps(event_data.get('goals', []))}

Content pieces to analyze:
{pieces_summary}"""

    result = _call_claude(system, user_msg)
    return _parse_json_response(result, fallback=[])
