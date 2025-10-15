import re
from typing import Dict, List
from datetime import datetime, timedelta
import calendar

class RiskDetector:
    """Detects risks, urgency, and important flags in meeting transcripts"""
    
    def __init__(self):
        self.deadline_patterns = [
            r'\b(?:by|before|until|deadline|due)\s+(?:this\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b',
            r'\b(?:by|before|until|deadline|due)\s+(?:the\s+)?(?:end\s+of\s+)?(?:this\s+|next\s+)?(?:week|month|quarter|year)\b',
            r'\b(?:by|before|until|deadline|due)\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\b',
            r'\b(?:by|before|until|deadline|due)\s+\d{1,2}(?:st|nd|rd|th)?\b',
            r'\basap\b|\burgent\b|\bimmediate\b|\bpriority\b|\bcritical\b',
            r'\btoday\b|\btomorrow\b|\bthis\s+week\b|\bnext\s+week\b',
            r'\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b\d{1,2}-\d{1,2}-\d{2,4}\b'
        ]
        
        self.budget_risk_patterns = [
            r'\bover\s+budget\b|\bbudget\s+exceeded\b|\bcost\s+overrun\b',
            r'\bextra\s+cost\b|\badditional\s+expense\b|\bunexpected\s+cost\b',
            r'\bprice\s+increase\b|\bcost\s+increase\b|\bmore\s+expensive\b',
            r'\bbudget\s+cut\b|\breduced\s+budget\b|\bless\s+funding\b',
            r'\bfinancial\s+risk\b|\bmoney\s+problem\b|\bcash\s+flow\b',
            r'\b(?:can\'t|cannot)\s+afford\b|\btoo\s+expensive\b|\bcost\s+concern\b'
        ]
        
        self.legal_concern_patterns = [
            r'\bcontract\b|\bagreement\b|\blegal\b|\bcompliance\b',
            r'\bregulation\b|\bpolicy\b|\brequirement\b|\bmandatory\b',
            r'\blawsuit\b|\blegal\s+action\b|\blegal\s+issue\b',
            r'\bviolation\b|\bbreach\b|\bnon-compliant\b',
            r'\bauditor?\b|\baudit\b|\breview\b|\binspection\b',
            r'\bterms\s+and\s+conditions\b|\bterms\s+of\s+service\b'
        ]
        
        self.customer_issue_patterns = [
            r'\bcustomer\s+complaint\b|\bclient\s+complaint\b|\bcomplaint\b',
            r'\bcustomer\s+unhappy\b|\bclient\s+unhappy\b|\bunsatisfied\b',
            r'\bcustomer\s+angry\b|\bclient\s+angry\b|\bupset\s+customer\b',
            r'\bescalation\b|\bescalated\b|\bescalate\b',
            r'\brefund\b|\bchargeback\b|\bcancel(?:ation)?\b',
            r'\bbad\s+review\b|\bnegative\s+feedback\b|\bpoor\s+rating\b',
            r'\bcustomer\s+service\s+issue\b|\bsupport\s+ticket\b'
        ]
        
        self.urgency_keywords = [
            'urgent', 'critical', 'emergency', 'asap', 'immediately', 
            'priority', 'rush', 'deadline', 'overdue', 'late'
        ]
    
    def analyze_transcript(self, transcript: str) -> Dict[str, List[str]]:
        """Analyze transcript for various risk factors"""
        
        # Convert to lowercase for pattern matching
        text_lower = transcript.lower()
        
        # Find all risk items
        deadlines = self._find_patterns(transcript, text_lower, self.deadline_patterns)
        budget_risks = self._find_patterns(transcript, text_lower, self.budget_risk_patterns)
        legal_concerns = self._find_patterns(transcript, text_lower, self.legal_concern_patterns)
        customer_issues = self._find_patterns(transcript, text_lower, self.customer_issue_patterns)
        
        # Calculate urgency score
        urgency_score = self._calculate_urgency_score(text_lower)
        
        return {
            'deadlines': deadlines,
            'budget_risks': budget_risks,
            'legal_concerns': legal_concerns,
            'customer_issues': customer_issues,
            'urgency_score': urgency_score,
            'total_risks': len(deadlines) + len(budget_risks) + len(legal_concerns) + len(customer_issues)
        }
    
    def _find_patterns(self, original_text: str, text_lower: str, patterns: List[str]) -> List[str]:
        """Find sentences containing risk patterns"""
        
        risk_items = []
        sentences = re.split(r'[.!?]+', original_text)
        
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
                
            sentence_lower = sentence.lower()
            
            for pattern in patterns:
                if re.search(pattern, sentence_lower):
                    # Clean and add the sentence
                    cleaned_sentence = self._clean_sentence(sentence)
                    if cleaned_sentence and cleaned_sentence not in risk_items:
                        risk_items.append(cleaned_sentence)
                    break  # Only add once per sentence
        
        return risk_items[:10]  # Limit to top 10 items per category
    
    def _clean_sentence(self, sentence: str) -> str:
        """Clean and format risk sentence"""
        
        sentence = sentence.strip()
        
        # Remove speaker labels
        sentence = re.sub(r'^(?:Speaker \d+|Person \d+|[A-Z][a-z]+):\s*', '', sentence)
        
        # Capitalize first letter
        if sentence:
            sentence = sentence[0].upper() + sentence[1:]
        
        # Ensure it ends with punctuation
        if sentence and sentence[-1] not in '.!?':
            sentence += '.'
        
        return sentence
    
    def _calculate_urgency_score(self, text_lower: str) -> int:
        """Calculate overall urgency score (0-100)"""
        
        urgency_score = 0
        total_words = len(text_lower.split())
        
        if total_words == 0:
            return 0
        
        # Count urgency keywords
        for keyword in self.urgency_keywords:
            count = len(re.findall(r'\b' + keyword + r'\b', text_lower))
            urgency_score += count * 10
        
        # Add points for deadline mentions
        deadline_matches = sum(1 for pattern in self.deadline_patterns 
                             if re.search(pattern, text_lower))
        urgency_score += deadline_matches * 15
        
        # Normalize by text length
        urgency_score = min(100, int((urgency_score / total_words) * 1000))
        
        return urgency_score
    
    def get_risk_priority(self, risk_analysis: Dict) -> str:
        """Determine overall risk priority level"""
        
        total_risks = risk_analysis.get('total_risks', 0)
        urgency_score = risk_analysis.get('urgency_score', 0)
        
        # High priority conditions
        if (risk_analysis.get('deadlines') and len(risk_analysis['deadlines']) >= 2 or
            risk_analysis.get('customer_issues') and len(risk_analysis['customer_issues']) >= 2 or
            urgency_score >= 50):
            return "HIGH"
        
        # Medium priority conditions
        elif (total_risks >= 3 or
              urgency_score >= 25 or
              risk_analysis.get('budget_risks')):
            return "MEDIUM"
        
        # Low priority conditions
        elif total_risks >= 1 or urgency_score >= 10:
            return "LOW"
        
        else:
            return "MINIMAL"
    
    def generate_risk_summary(self, risk_analysis: Dict) -> str:
        """Generate a human-readable risk summary"""
        
        priority = self.get_risk_priority(risk_analysis)
        total_risks = risk_analysis.get('total_risks', 0)
        
        summary = f"**Risk Assessment: {priority} PRIORITY**\n\n"
        
        if total_risks == 0:
            summary += "✅ No significant risks detected in this meeting."
            return summary
        
        summary += f"📊 **Total Risk Items:** {total_risks}\n"
        summary += f"🚨 **Urgency Score:** {risk_analysis.get('urgency_score', 0)}/100\n\n"
        
        # Add specific risk counts
        if risk_analysis.get('deadlines'):
            summary += f"⏰ **Deadlines:** {len(risk_analysis['deadlines'])} mentioned\n"
        
        if risk_analysis.get('budget_risks'):
            summary += f"💰 **Budget Risks:** {len(risk_analysis['budget_risks'])} identified\n"
        
        if risk_analysis.get('legal_concerns'):
            summary += f"⚖️ **Legal Concerns:** {len(risk_analysis['legal_concerns'])} noted\n"
        
        if risk_analysis.get('customer_issues'):
            summary += f"😠 **Customer Issues:** {len(risk_analysis['customer_issues'])} reported\n"
        
        # Add recommendations based on priority
        summary += "\n**Recommended Actions:**\n"
        
        if priority == "HIGH":
            summary += "🚨 **Immediate attention required** - Schedule follow-up within 24 hours\n"
            summary += "📞 Contact relevant stakeholders immediately\n"
            summary += "📋 Create action plan with specific deadlines\n"
        
        elif priority == "MEDIUM":
            summary += "⚠️ **Schedule follow-up within 3-5 days**\n"
            summary += "📝 Document all concerns and assign owners\n"
            summary += "📅 Set calendar reminders for key dates\n"
        
        elif priority == "LOW":
            summary += "📌 **Monitor situation** - Review at next regular meeting\n"
            summary += "📄 Document for future reference\n"
        
        return summary