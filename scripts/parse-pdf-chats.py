#!/usr/bin/env python3
"""Parse Zoho SalesIQ PDF export → JSON for replay script."""
import json
import re
import sys
from pathlib import Path

TICKET_HEAD = re.compile(r"#(\d{5,6})\s+(.+?)(?:\n|☎)")
INLINE_TIME = re.compile(r"\d{1,2}:\d{2}:\d{2}\s*(?:AM|PM)", re.I)
SKIP_IN_MSG = re.compile(
    r"Mandir Puja Support|LifeGuru Mandir Puja|Welcome to LifeGuru|Select a Language|"
    r"forwarded the chat|being transferred|Is there something else|Thank you for contacting|"
    r"Explore Live Aartis|Have a good day|has reopened this chat|Chat Duration|Visitor Details",
    re.I,
)


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").replace("\t", " ")).strip()


def split_chats(text: str):
    text = text.replace("\t", " ")
    starts = [m.start() for m in re.finditer(r"#(\d{5,6})\s", text)]
    chunks = []
    for i, start in enumerate(starts):
        end = starts[i + 1] if i + 1 < len(starts) else len(text)
        chunks.append(text[start:end])
    return chunks


def clean_user_fragment(raw: str, visitor_name: str) -> str:
    msg = norm(raw)
    if not msg or len(msg) < 2:
        return ""
    if SKIP_IN_MSG.search(msg):
        return ""
    if visitor_name and visitor_name in msg:
        msg = msg.split(visitor_name)[-1].strip()
    msg = INLINE_TIME.sub(" ", msg)
    msg = norm(msg)
    if len(msg) > 280:
        return ""
    if len(msg) < 2:
        return ""
    low = msg.lower()
    if low in ("hindi", "english", "puja schedule", "prasad related", "video", "prasad", "no", "yes", "hi", "hello"):
        return ""
    return msg


def extract_user_messages(body: str, visitor_name: str):
    found = []
    if visitor_name:
        pat = re.compile(
            rf"{re.escape(visitor_name)}\s+(.{{2,260}}?)\s+\d{{1,2}}:\d{{2}}:\d{{2}}\s*(?:AM|PM)",
            re.I | re.S,
        )
        for m in pat.finditer(body):
            cleaned = clean_user_fragment(m.group(1), visitor_name)
            if cleaned:
                found.append(cleaned)

    # title line before ticket (e.g. "Do havan for me")
    title_m = re.search(r"Chat Transcript\s+(.{3,80}?)\s+Visitor Details", body, re.I | re.S)
    if title_m:
        t = clean_user_fragment(title_m.group(1), visitor_name)
        if t and t not in found:
            found.insert(0, t)

    deduped = []
    seen = set()
    for m in found:
        key = m.lower()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(m)
    return deduped


def parse_one_chat(chunk: str):
    m_head = TICKET_HEAD.search(chunk.replace("\t", " "))
    if not m_head:
        return None
    ticket, visitor_name = m_head.group(1), norm(m_head.group(2))
    m_phone = re.search(r"☎\s*(\+?\d{10,15})", chunk)
    phone = None
    if m_phone:
        phone = re.sub(r"\D", "", m_phone.group(1))
        if len(phone) > 10 and phone.startswith("91"):
            phone = phone[-10:]

    idx = chunk.find("Chat Duration")
    body = chunk[idx:] if idx >= 0 else chunk
    user_msgs = extract_user_messages(body, visitor_name)
    if not user_msgs:
        return None
    return {"ticket": ticket, "visitor": visitor_name, "phone": phone, "userMessages": user_msgs}


def parse_chats(text: str):
    out = []
    for chunk in split_chats(text):
        row = parse_one_chat(chunk)
        if row:
            out.append(row)
    return out


def main():
    pdf = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("logs/pdf-50-chats-parsed.json")

    if not pdf or not pdf.exists():
        print("Usage: python3 scripts/parse-pdf-chats.py <export.pdf> [out.json]")
        sys.exit(1)

    from pypdf import PdfReader

    text = "\n".join((p.extract_text() or "") for p in PdfReader(str(pdf)).pages)
    chats = parse_chats(text)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({"count": len(chats), "chats": chats}, ensure_ascii=False, indent=2), encoding="utf-8")
    total = sum(len(c["userMessages"]) for c in chats)
    print(f"Wrote {len(chats)} chats, {total} user messages → {out}")


if __name__ == "__main__":
    main()
