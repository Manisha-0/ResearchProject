"""
Simulated callers for the evaluation.

RuleCaller works out which question it was asked from key
words in the caller line and answers from the scenario's
facts, in one of three speaking styles. It is deterministic,
so results can be repeated exactly, and it needs no API.

LlmCaller asks Gemini to play the patient from the same
facts. Answers are more natural and less predictable; use it
as a second, harder test.
"""

from __future__ import annotations

import re

TOPIC_PATTERNS = [
    # order matters: earlier topics win
    ("identity", ["speaking with", "am i speaking", "is this", "who helps", "helping", "who am i"]),
    ("notes", ["anything else", "else the care team", "else we should", "else you would like"]),
    ("callback", ["call back", "call you back", "call her back", "call him back", "navigator from"]),
    ("cost", ["cost", "insurance", "money", "bill", "afford", "pay for"]),
    ("symptoms", ["zero to ten", "0 to 10", "feeling", "feel today", "scale", "how is", "how are"]),
    ("medication", ["medicine", "medication", "pharmacy", "prescription", "pills"]),
    ("transportation", ["ride", "transport", "get there", "drive", "getting to", "get to the"]),
    ("attendance", ["make it", "able to come", "be able to", "attend", "come to", "be there", "can you come"]),
]

NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"]


def detect_topic(line: str) -> str | None:
    text = re.sub(r"\s+", " ", line.lower())
    # Look at the last question in the line, not earlier small talk.
    questions = [q for q in re.split(r"(?<=[?.!])\s", text) if q.strip()]
    candidates = [q for q in questions if "?" in q] or questions[-1:]
    for sentence in reversed(candidates):
        for topic, words in TOPIC_PATTERNS:
            if any(w in sentence for w in words):
                return topic
    return None


ANSWERS = {
    "plain": {
        "attendance": {"yes": "yes", "no": "no", "unsure": "I'm not sure"},
        "transportation": {"yes": "yes", "no": "no", "unsure": "I'm not sure"},
        "medication": {"yes": "yes", "no": "no"},
        "cost": {"yes": "yes", "no": "no"},
        "callback": {"yes": "yes", "no": "no"},
        "notes_none": "no",
    },
    "wordy": {
        "attendance": {
            "yes": "Oh yes, we will be there, I wrote it on the calendar.",
            "no": "No, I don't think I can make it this time.",
            "unsure": "Well, I'm really not sure, it depends how things go.",
        },
        "transportation": {
            "yes": "My son is going to drive me, he already took the day off.",
            "no": "No, nobody can take me that day, that's the trouble.",
            "unsure": "I'm not sure yet, maybe the neighbor, I have to ask.",
        },
        "medication": {
            "yes": "Yes, the pharmacy said it is on back order again.",
            "no": "No, I've got all my pills, thank you.",
        },
        "cost": {
            "yes": "Yes, the bills have really been piling up lately.",
            "no": "No, the insurance is taking care of it.",
        },
        "callback": {"yes": "Yes please, that would help a lot.", "no": "No, we're fine, thank you."},
        "notes_none": "No, that's everything, thank you.",
    },
    "vague": {
        "attendance": {
            "yes": "I think we can probably do that.",
            "no": "That's going to be hard for us.",
            "unsure": "Hmm, we'll see.",
        },
        "transportation": {
            "yes": "My grandson usually handles that.",
            "no": "That's the problem, the car broke down.",
            "unsure": "Depends who's around that day.",
        },
        "medication": {"yes": "The pharmacy keeps giving me trouble.", "no": "That's all sorted."},
        "cost": {"yes": "Money's tight, honestly.", "no": "We're managing alright."},
        "callback": {"yes": "That would be nice.", "no": "We're alright."},
        "notes_none": "Not really.",
    },
}

IDENTITY = {
    "patient": {"plain": "yes", "wordy": "Yes, this is {name} speaking.", "vague": "Mm-hmm, that's me."},
    "caregiver": {
        "plain": "I'm her daughter",
        "wordy": "This is her daughter, I help her with all her appointments.",
        "vague": "I'm family, I look after her.",
    },
    "wrong_person": {
        "plain": "You have the wrong number.",
        "wordy": "Sorry, I don't know anyone by that name, you must have the wrong number.",
        "vague": "Who? No.",
    },
}


class RuleCaller:
    def __init__(self, scenario: dict, patient_first_name: str):
        self.s = scenario
        self.name = patient_first_name
        self.style = scenario.get("style", "plain")
        self.facts = scenario.get("facts", {})
        self.asked_for_human = False

    def reply(self, agent_line: str) -> str:
        who = self.s["answered_by"]
        if who == "silent":
            return ""

        topic = detect_topic(agent_line)

        if topic == "identity":
            if "helping" in agent_line.lower() and who == "caregiver":
                return "yes"
            if "helping" in agent_line.lower() and who == "wrong_person":
                return "no"
            return IDENTITY[who][self.style].format(name=self.name)

        if who == "wrong_person":
            return "I told you, wrong number."

        emergency_at = self.s.get("emergency_at")
        if emergency_at and topic == emergency_at:
            return self.s.get("emergency_says", "I have chest pain")

        human = self.s.get("asks_for_human")
        if human and not self.asked_for_human and topic == human["at"]:
            self.asked_for_human = True
            return human["says"]

        if topic is None:
            # Small talk such as "Can I ask a few more questions?"
            return {"plain": "okay", "wordy": "Sure, go ahead.", "vague": "I guess so."}[self.style]

        return self.answer(topic)

    def answer(self, topic: str) -> str:
        table = ANSWERS[self.style]
        value = self.facts.get(topic if topic != "symptoms" else "symptom_severity")

        if topic == "symptoms":
            n = int(value)
            word = NUMBER_WORDS[n]
            return {
                "plain": word,
                "wordy": f"I'd say about a {n}, it has been a long week.",
                "vague": f"Maybe a {word}, could be worse.",
            }[self.style]

        if topic == "notes":
            return value if value else table["notes_none"]

        return table[topic][value]


class LlmCaller:
    """Gemini plays the caller. Needs GEMINI_API_KEY."""

    def __init__(self, scenario: dict, patient_first_name: str, *, api_key: str, model: str):
        from google import genai

        self.client = genai.Client(api_key=api_key)
        self.model = model
        self.history: list[str] = []
        who = scenario["answered_by"]
        persona = {
            "patient": f"You are {patient_first_name}, an older cancer patient in rural Louisiana.",
            "caregiver": f"You are the adult daughter of {patient_first_name}, a cancer patient. You help with her care.",
            "wrong_person": f"You are a stranger. Nobody named {patient_first_name} lives here.",
            "silent": "Say nothing.",
        }[who]
        extra = ""
        if scenario.get("asks_for_human"):
            extra += f"\nAt some point when asked about {scenario['asks_for_human']['at']}, ask to talk to a real person."
        if scenario.get("emergency_at"):
            extra += f"\nWhen asked how you feel, say: {scenario.get('emergency_says')}"
        self.system = (
            f"{persona}\nYou answered a phone call. Facts to answer from (do not volunteer them all at once): "
            f"{scenario.get('facts')}.\nSpeak like a real person on the phone, short replies, "
            f"style: {scenario.get('style', 'plain')}.{extra}\nReply with only what you say."
        )
        self.silent = who == "silent"

    def reply(self, agent_line: str) -> str:
        if self.silent:
            return ""
        from google.genai import types

        self.history.append(f"Caller: {agent_line}")
        response = self.client.models.generate_content(
            model=self.model,
            contents="\n".join(self.history) + "\nYou:",
            config=types.GenerateContentConfig(system_instruction=self.system, temperature=0.7),
        )
        said = (response.text or "").strip()
        self.history.append(f"You: {said}")
        return said
