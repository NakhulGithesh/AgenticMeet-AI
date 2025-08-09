import re

def clean_transcript(text):
    """
    Clean transcript by removing filler words, repetitions, and formatting issues
    """
    
    # Common filler words and sounds to remove
    filler_words = [
        r'\buh+\b', r'\bum+\b', r'\buhs?\b', r'\bums?\b',
        r'\bugh+\b', r'\berr+\b', r'\bahh+\b', r'\bohh+\b',
        r'\bmm+\b', r'\bhmm+\b', r'\buhuh\b', r'\bmhm\b',
        r'\byeah yeah\b', r'\bokay okay\b', r'\blike like\b',
        r'\bso so\b', r'\band and\b', r'\bthe the\b',
        r'\bi i\b', r'\bwe we\b', r'\byou you\b',
        r'\bis is\b', r'\bwas was\b', r'\bwill will\b',
        r'\byou know\b', r'\bi mean\b', r'\bkind of\b',
        r'\bsort of\b', r'\bbasically\b', r'\bactually\b',
        r'\bobviously\b', r'\bfrankly\b', r'\bhonestly\b',
        r'\banyway\b', r'\banyhow\b', r'\bwhatever\b',
        r'\bwhatsoever\b', r'\bwell well\b', r'\bok ok\b',
        r'\balright alright\b', r'\bright right\b'
    ]
    
    # Convert to lowercase for processing
    cleaned_text = text.lower()
    
    # Remove excessive repetitions of words (more than 2 consecutive)
    cleaned_text = re.sub(r'\b(\w+)(\s+\1){2,}\b', r'\1 \1', cleaned_text)
    
    # Remove filler words and sounds
    for filler in filler_words:
        cleaned_text = re.sub(filler, '', cleaned_text, flags=re.IGNORECASE)
    
    # Remove excessive punctuation and symbols
    cleaned_text = re.sub(r'[.]{3,}', '...', cleaned_text)  # Multiple dots to ellipsis
    cleaned_text = re.sub(r'[-]{2,}', '--', cleaned_text)   # Multiple dashes
    cleaned_text = re.sub(r'[?]{2,}', '?', cleaned_text)    # Multiple question marks
    cleaned_text = re.sub(r'[!]{2,}', '!', cleaned_text)    # Multiple exclamation marks
    
    # Remove sounds in brackets or parentheses
    cleaned_text = re.sub(r'\[.*?\]', '', cleaned_text)
    cleaned_text = re.sub(r'\(.*?\)', '', cleaned_text)
    
    # Remove incomplete words (words ending with -)
    cleaned_text = re.sub(r'\b\w*-\s', '', cleaned_text)
    
    # Clean up whitespace
    cleaned_text = re.sub(r'\s+', ' ', cleaned_text)  # Multiple spaces to single space
    cleaned_text = cleaned_text.strip()
    
    # Capitalize first letter of sentences
    sentences = re.split(r'([.!?]\s*)', cleaned_text)
    capitalized_sentences = []
    
    for sentence in sentences:
        if sentence.strip() and not re.match(r'[.!?]\s*', sentence):
            sentence = sentence.strip()
            if sentence:
                sentence = sentence[0].upper() + sentence[1:]
        capitalized_sentences.append(sentence)
    
    cleaned_text = ''.join(capitalized_sentences)
    
    # Remove empty lines and excessive spacing
    lines = cleaned_text.split('\n')
    cleaned_lines = []
    for line in lines:
        line = line.strip()
        if line and len(line) > 2:  # Keep lines with more than 2 characters
            cleaned_lines.append(line)
    
    return '\n'.join(cleaned_lines) if cleaned_lines else cleaned_text