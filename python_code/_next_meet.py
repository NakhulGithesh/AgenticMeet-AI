import re
from typing import List, Dict, Any
from collections import Counter

class AgendaGenerator:
    """Generates intelligent next meeting agendas based on current meeting content"""
    
    def __init__(self):
        self.action_keywords = [
            'follow up', 'next steps', 'action item', 'todo', 'task',
            'will do', 'need to', 'should', 'must', 'have to',
            'assign', 'responsible', 'owner', 'deadline', 'due'
        ]
        
        self.unresolved_keywords = [
            'pending', 'unresolved', 'open', 'outstanding', 'unclear',
            'question', 'concern', 'issue', 'problem', 'discuss further',
            'table', 'defer', 'postpone', 'later', 'next time'
        ]
        
        self.topic_categories = {
            'budget': ['budget', 'cost', 'financial', 'money', 'expense', 'revenue'],
            'technical': ['technical', 'development', 'system', 'software', 'code'],
            'marketing': ['marketing', 'campaign', 'promotion', 'brand', 'customer'],
            'sales': ['sales', 'target', 'goal', 'performance', 'revenue'],
            'hr': ['hiring', 'staff', 'employee', 'team', 'recruitment'],
            'strategy': ['strategy', 'plan', 'vision', 'direction', 'future'],
            'operations': ['operations', 'process', 'workflow', 'procedure'],
            'legal': ['legal', 'contract', 'compliance', 'regulation', 'policy']
        }
    
    def generate_agenda(self, transcript: str, summary: Dict = None, risk_analysis: Dict = None) -> List[str]:
        """Generate next meeting agenda based on current meeting analysis"""
        
        agenda_items = []
        
        # 1. High priority items from risk analysis
        if risk_analysis:
            high_priority_items = self._extract_high_priority_items(risk_analysis)
            agenda_items.extend(high_priority_items)
        
        # 2. Action items follow-up
        action_followups = self._extract_action_followups(transcript, summary)
        agenda_items.extend(action_followups)
        
        # 3. Unresolved discussions
        unresolved_items = self._extract_unresolved_items(transcript)
        agenda_items.extend(unresolved_items)
        
        # 4. Topic-based continuations
        topic_items = self._extract_topic_continuations(transcript)
        agenda_items.extend(topic_items)
        
        # 5. Standard meeting items
        standard_items = self._add_standard_items(transcript)
        agenda_items.extend(standard_items)
        
        # Remove duplicates and prioritize
        unique_items = self._deduplicate_and_prioritize(agenda_items)
        
        return unique_items[:8]  # Limit to 8 agenda items for practical meetings
    
    def _extract_high_priority_items(self, risk_analysis: Dict) -> List[str]:
        """Extract high priority items from risk analysis"""
        
        priority_items = []
        
        # Deadlines need immediate attention
        if risk_analysis.get('deadlines'):
            priority_items.append("📅 Review upcoming deadlines and action plans")
        
        # Customer issues are high priority
        if risk_analysis.get('customer_issues') and len(risk_analysis['customer_issues']) > 0:
            priority_items.append("🚨 Address customer concerns and escalations")
        
        # Budget risks need discussion
        if risk_analysis.get('budget_risks') and len(risk_analysis['budget_risks']) > 0:
            priority_items.append("💰 Budget review and risk mitigation")
        
        # Legal concerns need attention
        if risk_analysis.get('legal_concerns') and len(risk_analysis['legal_concerns']) > 0:
            priority_items.append("⚖️ Legal and compliance review")
        
        return priority_items
    
    def _extract_action_followups(self, transcript: str, summary: Dict = None) -> List[str]:
        """Extract action items that need follow-up"""
        
        followup_items = []
        
        # From summary action items
        if summary and summary.get('action_items'):
            if len(summary['action_items']) > 0:
                followup_items.append("✅ Review action item progress and updates")
        
        # From transcript analysis
        sentences = re.split(r'[.!?]+', transcript.lower())
        action_sentences = []
        
        for sentence in sentences:
            for keyword in self.action_keywords:
                if keyword in sentence and len(sentence.split()) > 5:
                    action_sentences.append(sentence.strip())
                    break
        
        if action_sentences:
            followup_items.append("📋 Follow up on assigned tasks and responsibilities")
        
        return followup_items
    
    def _extract_unresolved_items(self, transcript: str) -> List[str]:
        """Extract items that were left unresolved"""
        
        unresolved_items = []
        sentences = re.split(r'[.!?]+', transcript.lower())
        
        unresolved_mentions = 0
        question_mentions = 0
        
        for sentence in sentences:
            # Check for unresolved keywords
            for keyword in self.unresolved_keywords:
                if keyword in sentence:
                    unresolved_mentions += 1
                    break
            
            # Check for questions that might need follow-up
            if '?' in sentence or 'question' in sentence or 'how' in sentence or 'what' in sentence:
                question_mentions += 1
        
        if unresolved_mentions > 2:
            unresolved_items.append("🤔 Continue discussion on unresolved topics")
        
        if question_mentions > 3:
            unresolved_items.append("❓ Address outstanding questions and concerns")
        
        return unresolved_items
    
    def _extract_topic_continuations(self, transcript: str) -> List[str]:
        """Extract topics that might need continued discussion"""
        
        topic_items = []
        transcript_lower = transcript.lower()
        
        # Count mentions of different topic categories
        topic_scores = {}
        for category, keywords in self.topic_categories.items():
            score = 0
            for keyword in keywords:
                score += len(re.findall(r'\b' + keyword + r'\b', transcript_lower))
            topic_scores[category] = score
        
        # Find top discussed topics
        top_topics = sorted(topic_scores.items(), key=lambda x: x[1], reverse=True)
        
        # Generate agenda items for frequently mentioned topics
        for topic, score in top_topics[:3]:  # Top 3 topics
            if score >= 3:  # Mentioned at least 3 times
                topic_name = topic.capitalize()
                topic_items.append(f"📊 {topic_name} planning and strategy review")
        
        return topic_items
    
    def _add_standard_items(self, transcript: str) -> List[str]:
        """Add standard meeting items based on meeting context"""
        
        standard_items = []
        transcript_lower = transcript.lower()
        
        # Project status if project mentioned
        if any(word in transcript_lower for word in ['project', 'milestone', 'deliverable']):
            standard_items.append("📈 Project status and milestone updates")
        
        # Team updates if team discussed
        if any(word in transcript_lower for word in ['team', 'staff', 'member', 'hire']):
            standard_items.append("👥 Team updates and announcements")
        
        # Performance review if metrics mentioned
        if any(word in transcript_lower for word in ['performance', 'metric', 'goal', 'target', 'kpi']):
            standard_items.append("📊 Performance metrics review")
        
        # Always include planning for next steps
        standard_items.append("🎯 Planning for upcoming priorities")
        
        return standard_items
    
    def _deduplicate_and_prioritize(self, agenda_items: List[str]) -> List[str]:
        """Remove duplicates and prioritize agenda items"""
        
        # Remove exact duplicates
        unique_items = list(dict.fromkeys(agenda_items))
        
        # Priority order based on emoji/keywords
        priority_order = {
            '🚨': 1,  # High urgency
            '📅': 2,  # Deadlines
            '💰': 3,  # Budget
            '⚖️': 4,  # Legal
            '✅': 5,  # Action items
            '📋': 6,  # Follow-ups
            '🤔': 7,  # Unresolved
            '❓': 8,  # Questions
            '📊': 9,  # Reviews
            '👥': 10, # Team
            '📈': 11, # Projects
            '🎯': 12  # Planning
        }
        
        # Sort by priority
        def get_priority(item):
            for emoji, priority in priority_order.items():
                if item.startswith(emoji):
                    return priority
            return 99  # Default for items without priority emoji
        
        sorted_items = sorted(unique_items, key=get_priority)
        
        return sorted_items
    
    def format_agenda_for_export(self, agenda_items: List[str], meeting_date: str = None) -> str:
        """Format agenda for export/email"""
        
        if not meeting_date:
            from datetime import datetime, timedelta
            next_week = datetime.now() + timedelta(days=7)
            meeting_date = next_week.strftime("%B %d, %Y")
        
        formatted_agenda = f"""
📅 **NEXT MEETING AGENDA**
**Date:** {meeting_date}

**Meeting Objectives:**
Based on our previous discussion, we need to address the following priority items:

**AGENDA ITEMS:**

"""
        
        for i, item in enumerate(agenda_items, 1):
            formatted_agenda += f"{i}. {item}\n"
        
        formatted_agenda += f"""

**Preparation Required:**
- Review action items from previous meeting
- Prepare updates on assigned tasks
- Gather relevant documents and data

**Meeting Duration:** Estimated 60 minutes

---
*This agenda was automatically generated based on our previous meeting discussion.*
"""
        
        return formatted_agenda