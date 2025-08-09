# AgenticMeet-AI
AgenticMeet AI is an advanced AI-powered meeting assistant that transforms your meeting recordings into actionable insights with intelligent transcription, summarization, and analysis.

# 🤖 AgenticMeet AI

[![Python](https://img.shields.io/badge/Python-3.8%2B-blue)](https://www.python.org/)
[![Streamlit](https://img.shields.io/badge/Streamlit-1.20%2B-FF4B4B)](https://streamlit.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![OpenAI Whisper](https://img.shields.io/badge/Powered%20By-Whisper-000000.svg)](https://openai.com/research/whisper)

🚀 **AgenticMeet AI** is a next-generation AI meeting intelligence platform that transcribes, summarizes, analyzes speakers, detects risks, and translates meeting recordings — all in one beautiful Streamlit app.

## ✨ Features

- 🎤 **Accurate Transcription** — Whisper-powered speech-to-text.
- 👥 **Speaker Diarization** — Detect and track multiple speakers.
- 📝 **Smart Summarization** — Extract decisions & action items.
- 🚨 **Urgency & Risk Detection** — Flag deadlines, budget, legal, or customer risks.
- 🌍 **Multi-Language Auto-Translation** — Translate into Spanish, Hindi, French, and German.
- 📊 **Analytics Dashboard** — Visualize participation & word usage.
- 🎯 **Topic Segmentation** — Break conversations into logical sections.
- 📅 **Next Agenda Suggestions** — Auto-generate agenda items for the next meeting.
- 📤 **Export Reports** — PDF summary with transcript & insights.

## 🛠 Installation

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/NakhulGithesh/AgenticMeet-AI.git
cd AgenticMeet-AI
````

### 2️⃣ Install Dependencies (with uv for speed)

```bash
uv pip install -r requirements.txt
```

### 3️⃣ Download NLTK Data

```bash
python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords')"
```


## ▶️ Usage

**Run the App**

```bash
streamlit run app.py
```

**Upload a file** (`.mp3`, `.wav`, `.mp4`, `.m4a`) and explore:

* Speaker analysis & custom naming
* Multi-language translation
* Highlighted risk items
* Topic-based segmentation
* Summaries & next meeting agenda
* Export to PDF

---

## 💻 System Requirements

| Requirement    | Details                         |
| -------------- | ------------------------------- |
| Python Version | 3.8+                            |
| RAM            | 4GB+ (8GB recommended)          |
| Disk Space     | \~2GB for models & dependencies |
| External Tools | [FFmpeg](https://ffmpeg.org/)   |

---

## ⚙️ Configuration

Adjust model in **`transcribe.py`**:

```python
model = whisper.load_model("base")  # Options: tiny, small, medium, large
```

---

## 🆘 Troubleshooting

* **FFmpeg not found** → Install & add to system PATH.
* **Slow processing** → Use a smaller Whisper model.
* **GPU errors** → Switch to CPU mode in Whisper load settings.
* **Translation issues** → Check internet connection.

---

## 📜 License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for details.

---

## 🌟 Roadmap Ideas

* Live transcription during meetings.
* Speaker emotion & sentiment analysis.
* Slack / Teams integration.
* Keyword-triggered alerts.
