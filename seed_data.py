import json
from database import get_db

PREDEFINED_VOICES = [
    {
        "name": "Professional",
        "tone": "Polished, authoritative, and trustworthy",
        "description": "A refined and corporate tone suited for B2B events, conferences, and industry summits. Emphasizes credibility and expertise.",
        "sample_phrases": ["Elevate your expertise", "Join industry leaders", "Unlock transformative insights"],
        "dos": ["Use data and statistics", "Maintain formal language", "Highlight credentials and authority"],
        "donts": ["Use slang or colloquialisms", "Be overly casual", "Use excessive exclamation marks"]
    },
    {
        "name": "Playful",
        "tone": "Fun, energetic, and lighthearted",
        "description": "A vibrant and casual tone ideal for festivals, community events, and entertainment. Uses humor and excitement to engage.",
        "sample_phrases": ["Don't miss the fun!", "Get ready for something epic", "Your new favorite event awaits"],
        "dos": ["Use emojis sparingly", "Keep it upbeat", "Use conversational language"],
        "donts": ["Be too formal", "Use jargon", "Sound corporate"]
    },
    {
        "name": "Bold",
        "tone": "Confident, provocative, and action-oriented",
        "description": "A strong and daring tone for product launches, hackathons, and competitive events. Drives urgency and excitement.",
        "sample_phrases": ["Be the first", "Challenge the status quo", "This changes everything"],
        "dos": ["Use strong action verbs", "Create urgency", "Be direct and concise"],
        "donts": ["Be wishy-washy", "Overcomplicate the message", "Use passive voice"]
    },
    {
        "name": "Inspirational",
        "tone": "Uplifting, motivational, and visionary",
        "description": "A warm and aspirational tone for charity galas, wellness retreats, and purpose-driven events. Focuses on impact and transformation.",
        "sample_phrases": ["Together, we can", "Imagine the possibilities", "Your journey starts here"],
        "dos": ["Tell stories", "Appeal to emotions", "Focus on impact and change"],
        "donts": ["Be preachy", "Make empty promises", "Use fear-based messaging"]
    },
    {
        "name": "Community-driven",
        "tone": "Inclusive, warm, and collaborative",
        "description": "A welcoming and grassroots tone for meetups, workshops, and local events. Emphasizes belonging and shared experience.",
        "sample_phrases": ["Built by us, for us", "Come as you are", "Let's grow together"],
        "dos": ["Use 'we' and 'us'", "Highlight community stories", "Be approachable"],
        "donts": ["Be exclusionary", "Sound elitist", "Ignore diverse perspectives"]
    }
]

def seed_brand_voices():
    db = get_db()
    existing = db.execute("SELECT COUNT(*) FROM brand_voices WHERE is_predefined = 1").fetchone()[0]
    if existing > 0:
        db.close()
        return
    for voice in PREDEFINED_VOICES:
        db.execute(
            """INSERT INTO brand_voices (name, tone, description, sample_phrases, dos, donts, is_predefined)
               VALUES (?, ?, ?, ?, ?, ?, 1)""",
            (voice["name"], voice["tone"], voice["description"],
             json.dumps(voice["sample_phrases"]), json.dumps(voice["dos"]), json.dumps(voice["donts"]))
        )
    db.commit()
    db.close()

if __name__ == "__main__":
    seed_brand_voices()
    print("Seeded predefined brand voices.")
