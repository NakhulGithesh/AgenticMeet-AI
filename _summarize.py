from transformers import pipeline

summarizer = pipeline("summarization", model="facebook/bart-large-cnn")

def summarize_text(text, max_chunk_len=1000):
    """
    Generate comprehensive summary with action items and key decisions
    """
    chunks = [text[i:i+max_chunk_len] for i in range(0, len(text), max_chunk_len)]
    
    # Generate main summary
    summary = ""
    for chunk in chunks:
        res = summarizer(chunk, max_length=130, min_length=30, do_sample=False)
        summary += res[0]['summary_text'] + " "
    
    # Extract action items and key decisions using keyword-based approach
    action_items = extract_action_items(text)
    key_decisions = extract_key_decisions(text)
    
    return {
        'summary': summary.strip(),
        'action_items': action_items,
        'key_decisions': key_decisions
    }

def extract_action_items(text):
    """Extract action items from the text"""
    import re
    
    action_patterns = [
        r'(?:will|should|need to|must|have to|going to)\s+([^.!?]*?)(?:[.!?]|$)',
        r'(?:action item|task|todo|follow up):\s*([^.!?]*?)(?:[.!?]|$)',
        r'(?:next steps?|follow up):\s*([^.!?]*?)(?:[.!?]|$)',
        r'(?:assign|responsible for|will handle)\s+([^.!?]*?)(?:[.!?]|$)',
        r'(?:deadline|due date|by)\s+([^.!?]*?)(?:[.!?]|$)'
    ]
    
    action_items = []
    text_lower = text.lower()
    
    for pattern in action_patterns:
        matches = re.findall(pattern, text_lower, re.IGNORECASE)
        for match in matches:
            cleaned_match = match.strip()
            if len(cleaned_match) > 10 and cleaned_match not in action_items:
                action_items.append(cleaned_match.capitalize())
    
    # If no specific action items found, look for imperative sentences
    if not action_items:
        sentences = text.split('.')
        for sentence in sentences:
            sentence = sentence.strip()
            if any(word in sentence.lower() for word in ['will', 'should', 'need', 'must', 'plan']):
                if len(sentence) > 10:
                    action_items.append(sentence)
    
    return action_items[:5]  # Limit to 5 most relevant action items

def extract_key_decisions(text):
    """Extract key decisions from the text"""
    import re
    
    decision_patterns = [
        r'(?:decided|agreed|concluded|determined)\s+([^.!?]*?)(?:[.!?]|$)',
        r'(?:decision|resolution|outcome):\s*([^.!?]*?)(?:[.!?]|$)',
        r'(?:we will|it was decided|final decision)\s+([^.!?]*?)(?:[.!?]|$)',
        r'(?:approved|rejected|selected|chosen)\s+([^.!?]*?)(?:[.!?]|$)'
    ]
    
    decisions = []
    text_lower = text.lower()
    
    for pattern in decision_patterns:
        matches = re.findall(pattern, text_lower, re.IGNORECASE)
        for match in matches:
            cleaned_match = match.strip()
            if len(cleaned_match) > 10 and cleaned_match not in decisions:
                decisions.append(cleaned_match.capitalize())
    
    return decisions[:5]  # Limit to 5 most relevant decisions