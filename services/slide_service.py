import json
from services.ai_service import _call_claude, _parse_json_response

# Fixed About Synapze slides — always appended at the end
ABOUT_SYNAPZE_SLIDES = [
    {
        "type": "about",
        "title": "About Synapze",
        "layout": "two_column",
        "left_heading": "Who We Are",
        "left_body": "Synapze is a full-service event management and strategic communications agency based in Kuala Lumpur, Malaysia. We specialise in designing and executing high-impact conferences, exhibitions, and brand activations across Southeast Asia.",
        "right_heading": "What We Do",
        "right_points": [
            "End-to-end event management & logistics",
            "Strategic proposal development",
            "Sponsorship sales & stakeholder engagement",
            "Digital infrastructure & content production",
            "Brand experience & activation design",
        ],
    },
    {
        "type": "contact",
        "title": "Let's Build Something Together",
        "layout": "contact",
        "address": "GM-8-37 & GM-8-38, GMBB, No.2 Jalan Robertson, Bukit Bintang, 50150, Kuala Lumpur.",
        "website": "www.synapzemy.com",
        "tagline": "Strategy · Execution · Impact",
    },
]

DISCLAIMER_TEXT = (
    "This proposal is intended solely for the recipient to whom it is addressed. "
    "All information contained herein is confidential and proprietary to Synapze. "
    "Unauthorized sharing, distribution, or duplication of this document is strictly "
    "prohibited. All rights are reserved by Synapze."
)


def generate_slide_content(wizard_answers: dict, pdf_text: str = '') -> dict:
    """
    Send wizard answers to Claude and receive a structured slide deck JSON.
    Returns a dict with a 'slides' list ready for pptx_builder.
    """
    system = """You are a senior strategic proposal writer at Synapze, a Malaysian event management agency.
Your task is to generate a complete event proposal slide deck structure based on the information provided.

Return ONLY valid JSON with the following structure:
{
  "deck_title": "short deck title",
  "slides": [
    {
      "type": "section_divider",
      "title": "Part 1: The Opportunity",
      "subtitle": "optional subtitle"
    },
    {
      "type": "title_body",
      "title": "Slide Title",
      "body": "Main content paragraph. Be specific and compelling.",
      "key_points": ["bullet 1", "bullet 2", "bullet 3"]
    },
    {
      "type": "three_column",
      "title": "Slide Title",
      "columns": [
        {"heading": "Column 1 Heading", "body": "Column 1 body text"},
        {"heading": "Column 2 Heading", "body": "Column 2 body text"},
        {"heading": "Column 3 Heading", "body": "Column 3 body text"}
      ]
    },
    {
      "type": "two_column",
      "title": "Slide Title",
      "left_heading": "Left Heading",
      "left_body": "Left column content",
      "right_heading": "Right Heading",
      "right_body": "Right column content"
    },
    {
      "type": "stat_highlight",
      "title": "Slide Title",
      "stats": [
        {"value": "1,000+", "label": "Expected Attendees"},
        {"value": "RM 2M", "label": "Projected Revenue"},
        {"value": "3", "label": "Strategic Partners"}
      ],
      "supporting_text": "Optional supporting paragraph"
    },
    {
      "type": "agenda",
      "title": "Event Agenda",
      "days": [
        {
          "label": "Day 1 — Date",
          "items": [
            {"time": "09:00 AM", "activity": "Opening Ceremony"},
            {"time": "10:00 AM", "activity": "Keynote Address"}
          ]
        }
      ]
    },
    {
      "type": "pillars",
      "title": "Slide Title",
      "intro": "One sentence framing the pillars",
      "pillars": [
        {"number": "01", "heading": "Pillar Name", "body": "Short description"}
      ]
    },
    {
      "type": "title_body",
      "title": "KPI & Success Metrics",
      "body": "...",
      "key_points": ["KPI 1", "KPI 2"]
    }
  ]
}

Slide type guidance:
- Use "section_divider" to separate major parts of the deck (Part 1, Part 2, etc.)
- Use "stat_highlight" when presenting numbers, market size, audience size, or key figures
- Use "pillars" for thematic content pillars, marketing pillars, or strategic pillars
- Use "three_column" for partnerships, comparisons, or three-way frameworks
- Use "agenda" only for the event timeline/schedule
- Use "two_column" for before/after, problem/solution, or two-party comparisons
- Use "title_body" as the default slide type

Narrative flow to follow — always generate slides in this order:
1. Section: The Opportunity / Background
2. The Problem or Market Gap (why this event must happen)
3. The Opportunity (market size, trends, data)
4. The Strategic Vision / Objective
5. Section: Partnership & Stakeholders
6. Partnership Structure (who is involved, their roles)
7. Section: Event Design
8. Event Fundamentals (name, date, venue, format, target attendance)
9. Target Audience Profile
10. Thematic Pillars / Content Architecture
11. Event Agenda / Timeline
12. Launch Gimmick / Signature Experience
13. Key Visuals Concept
14. Section: Marketing Strategy
15. Marketing Approach (channels, tactics)
16. Marketing Timeline (pre/during/post)
17. Section: Financial & KPIs
18. Sponsorship / Revenue Structure (if applicable)
19. KPI & Success Metrics
20. Why Synapze (brief closing argument)

Write all content to be specific and compelling, not generic. Use data and specifics from the input.
Do NOT include the cover slide or About Synapze slides — those are handled separately.
Generate 18-24 content slides total."""

    pdf_section = f"""
CLIENT BRIEF (uploaded PDF — use this as the primary source if provided):
{pdf_text[:6000]}
""" if pdf_text.strip() else ""

    user_msg = f"""Generate a full event proposal slide deck for the following event:
{pdf_section}
EVENT BASICS:
- Event Name: {wizard_answers.get('event_name', 'Untitled Event')}
- Client / Prepared For: {wizard_answers.get('client_name', 'TBC')}
- Event Date: {wizard_answers.get('event_date', 'TBC')}
- Location / Venue: {wizard_answers.get('location', 'TBC')}
- Event Format: {wizard_answers.get('event_format', 'Conference')}
- Expected Attendance: {wizard_answers.get('attendance', 'TBC')}

CONCEPT & STRATEGY:
- Why We Are Doing This (background/rationale): {wizard_answers.get('rationale', '')}
- Strategic Objectives / Goals: {wizard_answers.get('objectives', '')}
- Synapze's Role: {wizard_answers.get('synapze_role', 'End-to-end event management and strategic curation')}

NOTE: You must infer and generate the following from the context above — do not leave these out:
- Target audience profile (who will attend and why)
- Event tagline / theme
- Recommended marketing strategy and channels
- Partnership structure (who else should be involved and in what role)
- Suggested thematic content pillars

FINISHING DETAILS:
- Key Visuals Concept: {wizard_answers.get('key_visuals', '')}
- Client Budget: {wizard_answers.get('client_budget', 'Not specified')}
- Special Gimmicks & Interactions: {wizard_answers.get('special_gimmicks', '')}"""

    raw = _call_claude(system, user_msg)
    parsed = _parse_json_response(raw, fallback={"slides": []})

    # Attach fixed About Synapze slides
    parsed['slides'] = parsed.get('slides', []) + ABOUT_SYNAPZE_SLIDES
    parsed['wizard_answers'] = wizard_answers
    parsed['disclaimer'] = DISCLAIMER_TEXT
    return parsed
