import re
import warnings
warnings.filterwarnings("ignore")

# Try to import transformers pipeline with error handling
summarizer = None
try:
    from transformers import pipeline
    print("Loading summarization model...")
    summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
    print("✅ Summarization model loaded successfully!")
except ImportError as e:
    print(f"❌ Transformers not available: {e}")
    print("📝 Will use rule-based summarization instead")
    summarizer = None
except Exception as e:
    print(f"❌ Error loading summarization model: {e}")
    print("📝 Will use rule-based summarization instead")
    summarizer = None

def summarize_text(text, max_chunk_len=1000):
    """
    Generate comprehensive summary with action items and key decisions
    Uses AI model if available, otherwise falls back to rule-based approach
    """
    
    # Extract action items and key decisions (always works)
    action_items = extract_action_items(text)
    key_decisions = extract_key_decisions(text)
    
    # Generate summary
    if summarizer is not None:
        try:
            summary = generate_ai_summary(text, max_chunk_len)
        except Exception as e:
            print(f"AI summarization failed: {e}")
            summary = generate_rule_based_summary(text)
    else:
        summary = generate_rule_based_summary(text)
    
    return {
        'summary': summary.strip(),
        'action_items': action_items,
        'key_decisions': key_decisions
    }

def generate_ai_summary(text, max_chunk_len=1000):
    """Generate summary using AI model"""
    chunks = [text[i:i+max_chunk_len] for i in range(0, len(text), max_chunk_len)]
    
    summary = ""
    for chunk in chunks:
        try:
            res = summarizer(chunk, max_length=130, min_length=30, do_sample=False)
            summary += res[0]['summary_text'] + " "
        except Exception as e:
            print(f"Error summarizing chunk: {e}")
            # Fallback to first few sentences of chunk
            sentences = chunk.split('.')[:3]
            summary += '. '.join(sentences) + ". "
    
    return summary

def generate_rule_based_summary(text):
    """Generate summary using rule-based approach (fallback)"""
    
    sentences = text.split('.')
    sentences = [s.strip() for s in sentences if len(s.strip()) > 10]
    
    if len(sentences) <= 3:
        return text[:500] + "..." if len(text) > 500 else text
    
    # Extract key sentences based on keywords
    important_keywords = [
        'decided', 'agreed', 'concluded', 'important', 'key', 'main', 
        'significant', 'critical', 'priority', 'action', 'next steps',
        'deadline', 'budget', 'revenue', 'customer', 'issue', 'problem'
    ]
    
    scored_sentences = []
    for sentence in sentences:
        score = 0
        sentence_lower = sentence.lower()
        
        # Score based on keyword presence
        for keyword in important_keywords:
            if keyword in sentence_lower:
                score += 1
        
        # Prefer sentences from beginning and end
        position_index = sentences.index(sentence)
        if position_index < len(sentences) * 0.2:  # First 20%
            score += 2
        elif position_index > len(sentences) * 0.8:  # Last 20%
            score += 1
        
        # Prefer longer sentences (more information)
        if len(sentence.split()) > 10:
            score += 1
        
        scored_sentences.append((sentence, score))
    
    # Sort by score and take top sentences
    scored_sentences.sort(key=lambda x: x[1], reverse=True)
    top_sentences = [s[0] for s in scored_sentences[:5]]
    
    # Arrange in original order
    summary_sentences = []
    for sentence in sentences:
        if sentence in top_sentences:
            summary_sentences.append(sentence)
    
    summary = '. '.join(summary_sentences[:3])
    return summary + "." if summary else "Meeting discussion covered various topics and decisions."

def extract_action_items(text):
    """Extract action items from the text"""
    
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
                if len(sentence) > 10 and len(action_items) < 5:
                    action_items.append(sentence)
    
    return action_items[:5]  # Limit to 5 most relevant action items

def extract_key_decisions(text):
    """Extract key decisions from the text"""
    
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

# Test function to verify everything works
def test_summarization():
    """Test the summarization functionality"""
    test_text = """
    In today's meeting, we discussed the quarterly budget review. We decided to increase marketing spend by 20% 
    for the next quarter. John will handle the budget reallocation by next Friday. We also agreed to hire 
    two new developers to support the upcoming product launch. Sarah will coordinate the hiring process. 
    The team concluded that we need better project management tools.
    """
    
    try:
        result = summarize_text(test_text)
        print("✅ Summarization test passed!")
        print(f"Summary: {result['summary']}")
        print(f"Action Items: {result['action_items']}")
        print(f"Key Decisions: {result['key_decisions']}")
        return True
    except Exception as e:
        print(f"❌ Summarization test failed: {e}")
        return False

if __name__ == "__main__":
    test_summarization()