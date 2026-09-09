import re

def clean_transcript(text: str) -> str:
    """
    Clean transcript by removing speech disfluencies, repetitions, and formatting artifacts
    while strictly preserving proper casing, capitalization, names, and technical terms.
    """
    if not text:
        return ""

    cleaned = text

    # Remove excessive repeated phrases / stutter (e.g. "yeah, yeah", "the the", "I I")
    repetition_patterns = [
        (r'(?i)\b(yeah)(\s*,\s*|\s+)\1\b', r'\1'),
        (r'(?i)\b(okay)(\s*,\s*|\s+)\1\b', r'\1'),
        (r'(?i)\b(yes)(\s*,\s*|\s+)\1\b', r'\1'),
        (r'(?i)\b(right)(\s*,\s*|\s+)\1\b', r'\1'),
        (r'(?i)\b(the)\s+\1\b', r'\1'),
        (r'(?i)\b(and)\s+\1\b', r'\1'),
        (r'(?i)\b(i)\s+\1\b', r'\1'),
        (r'(?i)\b(we)\s+\1\b', r'\1'),
        (r'(?i)\b(you)\s+\1\b', r'\1'),
        (r'(?i)\b(that)\s+\1\b', r'\1'),
        (r'(?i)\b(is)\s+\1\b', r'\1'),
    ]
    for pat, rep in repetition_patterns:
        cleaned = re.sub(pat, rep, cleaned)

    # Remove filler vocalizations (uh, um, er, hmm, etc.)
    filler_patterns = [
        r'(?i)\buh+m*\b',
        r'(?i)\bum+\b',
        r'(?i)\berr*\b',
        r'(?i)\bahh*\b',
        r'(?i)\bhmm+\b',
        r'(?i)\bmhm\b',
        r'(?i)\buhuh\b',
    ]
    for filler in filler_patterns:
        cleaned = re.sub(filler, '', cleaned)

    # Normalize excessive punctuation (multiple dots, dashes, question marks)
    cleaned = re.sub(r'\.{3,}', '...', cleaned)
    cleaned = re.sub(r'-{2,}', '—', cleaned)
    cleaned = re.sub(r'\?{2,}', '?', cleaned)
    cleaned = re.sub(r'!{2,}', '!', cleaned)

    # Clean sounds in brackets or parens (e.g. [laughter], (cough))
    cleaned = re.sub(r'\[.*?\]', '', cleaned)
    cleaned = re.sub(r'\(.*?\)', '', cleaned)

    # Clean multiple spaces and fix space before punctuation
    cleaned = re.sub(r'[ \t]+', ' ', cleaned)
    cleaned = re.sub(r'\s+([,.:;!?])', r'\1', cleaned)

    # Capitalize the first letter after sentence-ending punctuation if uncapitalized
    def _capitalize_match(m):
        prefix = m.group(1)
        char = m.group(2)
        return prefix + char.upper()

    cleaned = re.sub(r'(^|[.!?]\s+)([a-z])', _capitalize_match, cleaned.strip())

    # Format into clean paragraphs if multi-line
    lines = [line.strip() for line in cleaned.split('\n') if line.strip()]
    return '\n\n'.join(lines) if lines else cleaned