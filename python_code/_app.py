import streamlit as st
import os
import tempfile
import json
from datetime import datetime
import plotly.express as px
import plotly.graph_objects as go
from wordcloud import WordCloud
import pandas as pd
from collections import Counter
import re

from _transcribe import transcribe_audio_with_diarization
from _summarize import summarize_text
from _text_cleaner import clean_transcript
from _analytics import MeetingAnalyzer
from _topic_segmentation import TopicSegmenter
from _export_manager import ExportManager
from _speaker_manager import SpeakerManager
from _translator import MultiLanguageTranslator
from _flagging import RiskDetector
from _next_meet import AgendaGenerator

# Helper functions (moved outside the main execution block)
def highlight_risks_with_speakers(text, risk_data):
    """Highlight risk items in transcript with speaker context"""
    highlighted = text
    
    # Split into lines to preserve speaker structure
    lines = text.split('\n')
    highlighted_lines = []
    
    for line in lines:
        highlighted_line = line
        
        # Check if this line contains any risk items
        line_lower = line.lower()
        
        # Highlight different types of risks with colors
        for deadline in risk_data.get('deadlines', []):
            if deadline.lower() in line_lower:
                highlighted_line = highlighted_line.replace(deadline, f'<span style="background-color: #8B0000; color: #ffffff; padding: 4px 8px; border-radius: 4px; font-weight: bold;">⏰ {deadline}</span>')

        for risk in risk_data.get('budget_risks', []):
            if risk.lower() in line_lower:
                highlighted_line = highlighted_line.replace(risk, f'<span style="background-color: #CC5500; color: #ffffff; padding: 4px 8px; border-radius: 4px; font-weight: bold;">💰 {risk}</span>')

        for concern in risk_data.get('legal_concerns', []):
            if concern.lower() in line_lower:
                highlighted_line = highlighted_line.replace(concern, f'<span style="background-color: #1E5A8E; color: #ffffff; padding: 4px 8px; border-radius: 4px; font-weight: bold;">⚖️ {concern}</span>')

        for issue in risk_data.get('customer_issues', []):
            if issue.lower() in line_lower:
                highlighted_line = highlighted_line.replace(issue, f'<span style="background-color: #8B0000; color: #ffffff; padding: 4px 8px; border-radius: 4px; font-weight: bold;">😠 {issue}</span>')
        
        highlighted_lines.append(highlighted_line)
    
    return '\n'.join(highlighted_lines)

def update_transcript_with_speaker_names(transcript, speaker_mappings):
    """Update transcript with new speaker names while preserving format"""
    updated_transcript = transcript
    
    # Update each speaker mapping
    for old_name, new_name in speaker_mappings.items():
        if old_name != new_name and new_name.strip():
            # Replace speaker labels (handle various formats)
            patterns = [
                f"{old_name}:",
                f"{old_name} :",
                f"{old_name.lower()}:",
                f"{old_name.lower()} :"
            ]
            
            for pattern in patterns:
                updated_transcript = updated_transcript.replace(pattern, f"{new_name}:")
    
    return updated_transcript

def get_speakers_for_timeframe(topic, speaker_segments):
    """Get speakers active during a specific timeframe"""
    # This would need topic timestamp information to work properly
    # For now, return all speakers
    return list(set([seg['speaker'] for seg in speaker_segments]))

# Page config
st.set_page_config(
    page_title="AI Meeting Summarizer Pro Max",
    page_icon="🎤",
    layout="wide"
)

st.title("🎤 AgenticMeet AI")

# Initialize session state
session_vars = [
    'transcript_data', 'cleaned_transcript', 'summary', 'analytics', 
    'topics', 'speaker_segments', 'speaker_names', 'translated_transcripts',
    'risk_flags', 'next_agenda', 'selected_language', 'formatted_transcript'
]

for var in session_vars:
    if var not in st.session_state:
        st.session_state[var] = None

if 'selected_language' not in st.session_state:
    st.session_state.selected_language = 'English'

# File upload
uploaded_file = st.file_uploader(
    "Upload your meeting audio/video (.mp3, .wav, .mp4, .m4a)", 
    type=["mp3", "wav", "mp4", "m4a"]
)

if uploaded_file is not None:
    # Create a temporary file with the proper extension
    file_extension = uploaded_file.name.split('.')[-1]
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_extension}") as temp_file:
        temp_file.write(uploaded_file.getbuffer())
        temp_file_path = temp_file.name

    try:
        if st.session_state.transcript_data is None:
            with st.spinner("🔍 Transcribing audio with speaker detection..."):
                transcript_data = transcribe_audio_with_diarization(temp_file_path)

            # Check for transcription errors
            if transcript_data['text'].startswith("Error:"):
                st.error(f"❌ {transcript_data['text']}")
                st.info("📖 **See the troubleshooting guide below to fix this issue.**")
                with st.expander("🔧 Troubleshooting Guide - Click to Expand"):
                    st.markdown("""
                    ### Most Likely Issue: FFmpeg Not Installed

                    The error above means FFmpeg is not installed or not in your system PATH.

                    **Quick Fix for Windows:**
                    1. Open **PowerShell as Administrator**
                    2. Install FFmpeg via Chocolatey:
                       ```powershell
                       choco install ffmpeg
                       ```
                    3. **RESTART** your terminal and Streamlit app
                    4. Try uploading the file again

                    **Detailed Installation Guide:** See [FFMPEG_INSTALLATION.md](https://github.com/NakhulGithesh/AgenticMeet-AI/blob/main/FFMPEG_INSTALLATION.md)
                    """)
                # Stop processing here - don't continue
                st.stop()

            with st.spinner("👥 Analyzing speakers..."):
                speaker_manager = SpeakerManager()
                speaker_segments = speaker_manager.process_speakers(transcript_data)

            with st.spinner("🧹 Cleaning transcript..."):
                cleaned_transcript = clean_transcript(transcript_data['text'])

            # Format transcript with speaker labels
            formatted_transcript = speaker_manager.format_transcript_with_speakers(
                cleaned_transcript, speaker_segments
            )

            st.session_state.transcript_data = transcript_data
            st.session_state.speaker_segments = speaker_segments
            st.session_state.cleaned_transcript = cleaned_transcript
            st.session_state.formatted_transcript = formatted_transcript

            st.success("✅ Processing complete!")

        # Create tabs for different features (only if we have valid data)
        if st.session_state.transcript_data is not None:
            tab1, tab2, tab3, tab4, tab5, tab6, tab7, tab8 = st.tabs([
                "👥 Speakers", "🌍 Translation", "📝 Transcript", "🚨 Risk Analysis",
                "📊 Analytics", "🎯 Topics", "📄 Summary", "📤 Export"
            ])

            with tab1:
                st.subheader("👥 Speaker Management")
            
                if st.session_state.speaker_segments:
                    # Get unique speakers detected
                    unique_speakers = list(set([seg['speaker'] for seg in st.session_state.speaker_segments]))
                
                    st.info(f"🎯 Detected {len(unique_speakers)} speaker(s) in your meeting")
                
                    # Editable speaker names
                    st.subheader("✏️ Assign Names to Speakers")
                    st.write("Enter the actual names for each detected speaker:")
                
                    speaker_names = {}
                
                    # Create input fields for each detected speaker
                    cols = st.columns(min(3, len(unique_speakers)))
                    for i, speaker in enumerate(unique_speakers):
                        with cols[i % 3]:
                            current_name = st.session_state.speaker_names.get(speaker, "") if st.session_state.speaker_names else ""
                            new_name = st.text_input(
                                f"Name for {speaker}:", 
                                value=current_name, 
                                key=f"speaker_input_{speaker}",
                                placeholder=f"Enter name for {speaker}"
                            )
                            speaker_names[speaker] = new_name if new_name.strip() else speaker
                
                    if st.button("🔄 Update Speaker Names in Transcript", type="primary"):
                        st.session_state.speaker_names = speaker_names
                    
                        # Update the formatted transcript with new names
                        st.session_state.formatted_transcript = update_transcript_with_speaker_names(
                            st.session_state.formatted_transcript, 
                            speaker_names
                        )
                    
                        st.success("✅ Speaker names updated in transcript!")
                        st.rerun()
                
                    # Display current speaker assignments
                    st.subheader("📋 Current Speaker Assignments")
                    for speaker in unique_speakers:
                        display_name = st.session_state.speaker_names.get(speaker, speaker) if st.session_state.speaker_names else speaker
                        if display_name != speaker:
                            st.write(f"• {speaker} → **{display_name}**")
                        else:
                            st.write(f"• {speaker} (no custom name)")

        with tab2:
                st.subheader("🌍 Multi-Language Translation")
            
                # Language selection
                col1, col2 = st.columns(2)
                with col1:
                    target_language = st.selectbox(
                        "Select translation language:",
                        ["English", "Spanish", "Hindi", "French", "German"],
                        index=0
                    )
            
                with col2:
                    if st.button("🔄 Translate", type="primary"):
                        if target_language != "English":
                            with st.spinner(f"Translating to {target_language}..."):
                                try:
                                    translator = MultiLanguageTranslator()
                                
                                    # Use the formatted transcript with speaker names
                                    transcript_to_translate = st.session_state.formatted_transcript or st.session_state.cleaned_transcript
                                
                                    # Translate while preserving speaker labels
                                    translated = translator.translate_with_speaker_preservation(
                                        transcript_to_translate, 
                                        target_language
                                    )
                                
                                    if st.session_state.translated_transcripts is None:
                                        st.session_state.translated_transcripts = {}
                                    st.session_state.translated_transcripts[target_language] = translated
                                    st.session_state.selected_language = target_language
                                
                                    st.success(f"✅ Translated to {target_language}")
                                
                                except Exception as e:
                                    st.error(f"Translation failed: {str(e)}")
                                    st.info("💡 Make sure you have internet connection for translation service.")
            
                # Display original and translated side by side
                if st.session_state.translated_transcripts and target_language in st.session_state.translated_transcripts:
                    col1, col2 = st.columns(2)
                
                    with col1:
                        st.subheader("🔤 Original")
                        original_transcript = st.session_state.formatted_transcript or st.session_state.cleaned_transcript
                        st.text_area("Original", original_transcript, height=400, key="orig_trans")
                
                    with col2:
                        st.subheader(f"🔤 {target_language} Translation")
                        st.text_area("Translated", st.session_state.translated_transcripts[target_language], height=400, key="trans_trans")
                else:
                    st.subheader("📝 Meeting Transcript")
                    current_transcript = st.session_state.formatted_transcript or st.session_state.cleaned_transcript
                    st.text_area("Transcript", current_transcript, height=400, key="single_trans")
                
        with tab3:
                st.subheader("📝 Meeting Transcript with Risk Highlights")
            
                # Generate risk analysis if not done
                if st.session_state.risk_flags is None:
                    with st.spinner("🔍 Analyzing risks and urgency..."):
                        risk_detector = RiskDetector()
                        st.session_state.risk_flags = risk_detector.analyze_transcript(
                            st.session_state.formatted_transcript or st.session_state.cleaned_transcript
                        )
            
                # Display transcript with highlighting
                if st.session_state.risk_flags:
                    st.subheader("🚨 Risk & Urgency Highlights")
                
                    # Show risk summary
                    risk_summary = st.session_state.risk_flags
                    col1, col2, col3, col4 = st.columns(4)
                
                    with col1:
                        st.metric("⏰ Deadlines", len(risk_summary.get('deadlines', [])))
                    with col2:
                        st.metric("💰 Budget Risks", len(risk_summary.get('budget_risks', [])))
                    with col3:
                        st.metric("⚖️ Legal Concerns", len(risk_summary.get('legal_concerns', [])))
                    with col4:
                        st.metric("😠 Customer Issues", len(risk_summary.get('customer_issues', [])))
            
                # Search in transcript - MOVED HERE (between risk highlights and transcript)
                st.subheader("🔍 Search in Transcript")
                search_term = st.text_input("Search for specific words or phrases:", key="main_search", placeholder="Enter search term...")
            
                # Display transcript with speaker names and risk highlighting
                st.subheader("📄 Meeting Transcript")
            
                current_transcript = st.session_state.formatted_transcript or st.session_state.cleaned_transcript
            
                # Apply risk highlighting if available
                if st.session_state.risk_flags:
                    current_transcript = highlight_risks_with_speakers(current_transcript, st.session_state.risk_flags)
            
                # Apply search highlighting if search term provided
                if search_term and search_term.strip():
                    # Highlight search terms (case insensitive)
                    search_pattern = re.escape(search_term.strip())
                    current_transcript = re.sub(
                        f'({search_pattern})', 
                        r'<mark style="background-color: #90EE90; padding: 1px 3px; border-radius: 2px;">\1</mark>', 
                        current_transcript, 
                        flags=re.IGNORECASE
                    )
            
                # Display the transcript in a scrollable container
                st.markdown(
                    f'<div style="height: 500px; overflow-y: auto; border: 2px solid #4a4a4a; padding: 20px; border-radius: 8px; background-color: #1e1e1e; color: #e0e0e0; font-family: monospace; line-height: 1.6;">{current_transcript}</div>',
                    unsafe_allow_html=True
                )
            
                # Risk details in expandable section
                if st.session_state.risk_flags:
                    with st.expander("🔍 Detailed Risk Analysis"):
                        risk_summary = st.session_state.risk_flags
                    
                        if risk_summary.get('deadlines'):
                            st.subheader("⏰ Deadlines Mentioned")
                            for deadline in risk_summary['deadlines']:
                                st.write(f"🔴 {deadline}")
                    
                        if risk_summary.get('budget_risks'):
                            st.subheader("💰 Budget Risks")
                            for risk in risk_summary['budget_risks']:
                                st.write(f"🟠 {risk}")
                    
                        if risk_summary.get('legal_concerns'):
                            st.subheader("⚖️ Legal Concerns")
                            for concern in risk_summary['legal_concerns']:
                                st.write(f"🟡 {concern}")
                    
                        if risk_summary.get('customer_issues'):
                            st.subheader("😠 Customer Issues")
                            for issue in risk_summary['customer_issues']:
                                st.write(f"🔴 {issue}")

        with tab4:
                st.subheader("🚨 Advanced Risk Analysis")
            
                if st.session_state.risk_flags:
                    risk_data = st.session_state.risk_flags
                
                    # Risk priority matrix
                    st.subheader("📊 Risk Priority Dashboard")
                
                    # Create risk level data
                    risk_levels = {
                        'High Priority': len(risk_data.get('deadlines', [])) + len(risk_data.get('customer_issues', [])),
                        'Medium Priority': len(risk_data.get('budget_risks', [])),
                        'Low Priority': len(risk_data.get('legal_concerns', []))
                    }
                
                    if sum(risk_levels.values()) > 0:
                        fig = px.pie(values=list(risk_levels.values()), names=list(risk_levels.keys()),
                                   title="Risk Distribution", color_discrete_sequence=['red', 'orange', 'yellow'])
                        st.plotly_chart(fig, use_container_width=True)
                
                    # Action recommendations
                    st.subheader("💡 Recommended Actions")
                    if risk_data.get('deadlines'):
                        st.error("🚨 **URGENT**: Deadlines mentioned - immediate action required")
                    if risk_data.get('customer_issues'):
                        st.error("😠 **HIGH**: Customer issues detected - follow up needed")
                    if risk_data.get('budget_risks'):
                        st.warning("💰 **MEDIUM**: Budget concerns - review financials")
                    if risk_data.get('legal_concerns'):
                        st.info("⚖️ **LOW**: Legal items mentioned - document for review")

        with tab5:
                st.subheader("📊 Meeting Analytics Dashboard")
            
                if st.session_state.analytics is None:
                    with st.spinner("Analyzing meeting data..."):
                        analyzer = MeetingAnalyzer(st.session_state.transcript_data, st.session_state.cleaned_transcript)
                        st.session_state.analytics = analyzer.get_analytics()
            
                analytics = st.session_state.analytics
            
                # Enhanced metrics with speaker data
                col1, col2, col3, col4 = st.columns(4)
                with col1:
                    st.metric("Total Speakers", len(st.session_state.speaker_segments) if st.session_state.speaker_segments else 1)
                with col2:
                    st.metric("Total Words", analytics['total_words'])
                with col3:
                    st.metric("Meeting Duration", f"{analytics['duration']:.1f} min")
                with col4:
                    st.metric("Avg Words/Min", f"{analytics['words_per_minute']:.1f}")

                # Speaker analysis charts
                if analytics.get('speaker_stats'):
                    col1, col2 = st.columns(2)
                
                    with col1:
                        # Speaker contribution pie chart
                        speakers = [s['speaker'] for s in analytics['speaker_stats']]
                        percentages = [s['speaking_time'] for s in analytics['speaker_stats']]
                    
                        fig = px.pie(values=percentages, names=speakers, title="Speaker Contribution")
                        st.plotly_chart(fig, use_container_width=True)
                
                    with col2:
                        # Word count bar chart
                        word_counts = [s['word_count'] for s in analytics['speaker_stats']]
                    
                        fig = px.bar(x=speakers, y=word_counts, title="Words Spoken by Speaker")
                        st.plotly_chart(fig, use_container_width=True)
            
                # Keywords word cloud
                if analytics.get('keywords'):
                    st.subheader("☁️ Key Topics Word Cloud")
                
                    try:
                        words_dict = dict(analytics['keywords'])
                        if words_dict:
                            wordcloud = WordCloud(width=800, height=400, background_color='white').generate_from_frequencies(words_dict)
                        
                            import matplotlib.pyplot as plt
                            fig, ax = plt.subplots(figsize=(10, 5))
                            ax.imshow(wordcloud, interpolation='bilinear')
                            ax.axis('off')
                            st.pyplot(fig)
                    except Exception as e:
                        st.write("📝 Top Keywords:")
                        keyword_text = ", ".join([f"{word} ({count})" for word, count in analytics['keywords'][:20]])
                        st.write(keyword_text)

        with tab6:
                st.subheader("🎯 Topic Segmentation")
            
                if st.session_state.topics is None:
                    with st.spinner("Analyzing topics and creating chapters..."):
                        segmenter = TopicSegmenter()
                        st.session_state.topics = segmenter.segment_topics(
                            st.session_state.transcript_data, 
                            st.session_state.formatted_transcript or st.session_state.cleaned_transcript
                        )
            
                # Display topics with speaker information
                for i, topic in enumerate(st.session_state.topics):
                    with st.expander(f"📍 {topic['timestamp']} - {topic['title']}", expanded=(i == 0)):
                        col1, col2 = st.columns(2)
                        with col1:
                            st.write(f"**Duration:** {topic['duration']}")
                            st.write(f"**Summary:** {topic['summary']}")
                        with col2:
                            if st.session_state.speaker_segments:
                                # Show which speakers were active during this topic
                                active_speakers = get_speakers_for_timeframe(topic, st.session_state.speaker_segments)
                                if active_speakers:
                                    st.write("**Active Speakers:**")
                                    for speaker in active_speakers:
                                        display_name = st.session_state.speaker_names.get(speaker, speaker) if st.session_state.speaker_names else speaker
                                        st.write(f"• {display_name}")
                    
                        st.text_area("Content", topic['content'], height=100, key=f"topic_content_{i}")

        with tab7:
                st.subheader("📄 Comprehensive Meeting Summary")
            
                # Generate next meeting agenda
                if st.session_state.next_agenda is None:
                    with st.spinner("🤖 Generating next meeting agenda..."):
                        agenda_gen = AgendaGenerator()
                        st.session_state.next_agenda = agenda_gen.generate_agenda(
                            st.session_state.formatted_transcript or st.session_state.cleaned_transcript,
                            st.session_state.summary,
                            st.session_state.risk_flags
                        )
            
                if st.button("✏️ Generate Comprehensive Summary"):
                    with st.spinner("Generating summary and action items..."):
                        st.session_state.summary = summarize_text(
                            st.session_state.formatted_transcript or st.session_state.cleaned_transcript
                        )
            
                if st.session_state.summary:
                    col1, col2 = st.columns(2)
                
                    with col1:
                        st.subheader("📋 Executive Summary")
                        st.write(st.session_state.summary['summary'])
                    
                        st.subheader("✅ Action Items")
                        for i, item in enumerate(st.session_state.summary['action_items'], 1):
                            st.write(f"{i}. {item}")
                
                    with col2:
                        st.subheader("🔑 Key Decisions")
                        for i, decision in enumerate(st.session_state.summary['key_decisions'], 1):
                            st.write(f"{i}. {decision}")
                    
                        # Display next meeting agenda
                        if st.session_state.next_agenda:
                            st.subheader("📅 Suggested Next Meeting Agenda")
                            for item in st.session_state.next_agenda:
                                st.write(f"• {item}")

        with tab8:
                st.subheader("📤 Enhanced Export Options")
            
                if st.session_state.cleaned_transcript:
                    export_manager = ExportManager()
                
                    # Export with all new features
                    export_data = {
                        'transcript': st.session_state.formatted_transcript or st.session_state.cleaned_transcript,
                        'summary': st.session_state.summary,
                        'topics': st.session_state.topics,
                        'speakers': st.session_state.speaker_names,
                        'translations': st.session_state.translated_transcripts,
                        'risks': st.session_state.risk_flags,
                        'next_agenda': st.session_state.next_agenda
                    }
                
                    col1, col2, col3 = st.columns(3)
                
                    with col1:
                        st.subheader("📄 Document Exports")
                    
                    if st.button("📄 Export Complete Report (PDF)"):
                        pdf_data = export_manager.export_comprehensive_pdf(export_data)
                        st.download_button(
                            "💾 Download Complete PDF",
                            pdf_data,
                            f"meeting_complete_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf",
                            "application/pdf"
                        )
                
                with col2:
                    st.subheader("🌍 Multi-language Exports")
                    st.info("Multi-language exports will be available once translation issues are resolved.")
                
                with col3:
                    st.subheader("🚨 Risk Report")
                    
                    if st.button("🚨 Export Risk Analysis"):
                        risk_report = export_manager.export_risk_report(export_data)
                        st.download_button(
                            "💾 Download Risk Report",
                            risk_report,
                            f"meeting_risk_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf",
                            "application/pdf"
                        )
    
    finally:
        # Clean up the temporary file
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)

else:
    st.info("👆 Please upload an audio or video file to get started!")
    
    # Enhanced feature overview
    with st.expander("✨ Enhanced Features Overview"):
        st.markdown("""
        ### 🚀 "AgenticMeet AI"
":
        
        **👥 Advanced Speaker Management**
        - AI-powered speaker diarization
        - Custom speaker name assignment
        - Speaker timeline visualization
        - Transcript formatted with speaker names
        
        **🌍 Multi-Language Support**  
        - Auto language detection
        - Translation to 5+ languages (coming soon)
        - Side-by-side original/translated view
        
        **🚨 Risk & Urgency Detection**
        - Deadline identification with speaker context
        - Budget risk flagging
        - Legal concern detection
        - Customer issue alerts
        
        **🤖 Intelligent Agenda Generation**
        - Auto-suggest next meeting topics
        - Based on unresolved items
        - Smart priority ordering
        
        **📊 Enhanced Analytics**
        - Speaker contribution analysis
        - Risk priority dashboard
        - Interactive visualizations
        
        **📤 Comprehensive Export Options**
        - Multi-language PDF reports
        - Risk-specific summaries
        - Complete meeting packages
        """)