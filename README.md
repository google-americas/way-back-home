# 🚀 Way Back Home

![Way Back Home](dashboard/frontend/public/prelude.png)

**An immersive AI workshop platform where participants learn to build intelligent agents while rescuing a stranded space explorer.**

Way Back Home is a hands-on workshop experience that teaches Google Cloud AI technologies through an engaging narrative. Participants crash-land on an alien planet and must use AI to identify themselves, analyze their surroundings, and coordinate rescue efforts.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-waybackhome.dev-blue?style=for-the-badge)](https://waybackhome.dev)
[![Codelab](https://img.shields.io/badge/Codelab-Level%200-green?style=for-the-badge)](https://codelabs.developers.google.com/way-back-home-level-0/instructions)
[![Codelab](https://img.shields.io/badge/Codelab-Level%31-orange?style=for-the-badge)](https://codelabs.developers.google.com/way-back-home-level-1/instructions)

## 🎮 The Experience

You're a space explorer whose ship has crashed on an uncharted planet. Your rescue beacon is offline, and you're scattered across the surface with other survivors. To get home, you must:

| Level | Mission | AI Skills Learned |
|-------|---------|-------------------|
| **Level 0** | Generate your explorer identity | Multi-turn image generation, Gemini (Nano Banana) |
| **Level 1** | Pinpoint your crash location | Multi-agent systems, MCP servers, ADK, parallel processing |
| **Level 2** | Process incoming SOS signals | Event-driven agents, A2A communication *(coming soon)* |
| **Level 3** | Coordinate group rescue | Agent orchestration, consensus protocols *(coming soon)* |

## 🛠️ Technology Stack

| Component | Technologies |
|-----------|-------------|
| **Frontend** | Next.js 14, Three.js, React Three Fiber, Tailwind CSS |
| **Backend** | FastAPI, Firestore, Firebase Storage, Cloud Run |
| **AI/ML** | Vertex AI, Gemini 2.5 Flash, Veo 3.1 |
| **Agents** | Google ADK, MCP (Model Context Protocol), OneMCP BigQuery |
| **Infrastructure** | Google Cloud Run, Cloud Build, Artifact Registry |

## 🚀 Quick Start

### For Workshop Participants

1. **Access Cloud Shell** at [console.cloud.google.com](https://console.cloud.google.com)

2. **Clone and setup:**
   ```bash
   git clone https://github.com/google-americas/way-back-home.git
   cd way-back-home
   ```

3. **Start with Level 0:**
   ```bash
   ./scripts/setup.sh
   cd level_0
   ```

4. **Follow the codelab:** [Level 0 Instructions](https://codelabs.developers.google.com/way-back-home-level-0/instructions)

### For Workshop Hosts

See [Deployment Guide](#-deployment) below for running your own instance.

## 📚 Documentation

| Component | Description |
|-----------|-------------|
| [Level 0 README](level_0/README.md) | Avatar generation with multi-turn image AI |
| [Level 1 README](level_1/README.md) | Multi-agent crash site analysis |
| [Backend README](dashboard/backend/README.md) | Mission Control API documentation |
| [Frontend README](dashboard/frontend/README.md) | 3D map visualization |

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Way Back Home                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Participant Journey                                                    │
│   ───────────────────                                                    │
│                                                                          │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐         │
│   │ Level 0  │───▶│ Level 1  │───▶│ Level 2  │───▶│ Level 3  │         │
│   │ Identity │    │ Location │    │   SOS    │    │  Rescue  │         │
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘         │
│        │               │                                                 │
│        ▼               ▼                                                 │
│   ┌─────────────────────────────────────────────────────────────┐       │
│   │                    Backend API (Cloud Run)                   │       │
│   │  • Participant registration    • Evidence storage            │       │
│   │  • Location confirmation       • Event management            │       │
│   └─────────────────────────────────────────────────────────────┘       │
│        │               │                                                 │
│        ▼               ▼                                                 │
│   ┌──────────┐    ┌──────────┐    ┌──────────────────────────┐         │
│   │Firestore │    │ Firebase │    │      Frontend (Next.js)   │         │
│   │          │    │ Storage  │    │  • 3D planet visualization │         │
│   │• events  │    │• avatars │    │  • Real-time participant   │         │
│   │• users   │    │• evidence│    │    tracking                │         │
│   └──────────┘    └──────────┘    └──────────────────────────┘         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## 🌐 Deployment

### Deploy Your Own Instance

1. **Prerequisites:**
   - Google Cloud project with billing enabled
   - Firebase project (Firestore + Storage + Auth)
   - Domain names (optional, for custom URLs)

2. **Clone and configure:**
   ```bash
   git clone https://github.com/google-americas/way-back-home.git
   cd way-back-home
   
   # Configure your project
   gcloud config set project YOUR_PROJECT_ID
   ```

3. **Run infrastructure setup:**
   ```bash
   ./scripts/setup-infrastructure.sh
   ```

4. **Deploy all services:**
   ```bash
   gcloud builds submit --config cloudbuild.yaml \
     --substitutions=_API_BASE_URL=https://api.yourdomain.dev,_MAP_BASE_URL=https://yourdomain.dev
   ```

### Environment Configuration

Create a `set_env.sh` in project root (generated by setup scripts):

```bash
export GOOGLE_CLOUD_PROJECT="your-project-id"
export REGION="us-central1"
export API_BASE_URL="https://api.yourdomain.dev"
export MAP_BASE_URL="https://yourdomain.dev"
```

## 🎓 Workshop Hosting Guide

### Before the Workshop

1. Deploy backend and frontend to your GCP project
2. Create an event in the admin panel or via API:
   ```bash
   curl -X POST https://api.yourdomain.dev/admin/events \
     -H "Authorization: Bearer $FIREBASE_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"code": "your-event-code", "name": "Your Workshop Name"}'
   ```
3. Generate QR codes pointing to your event URL
4. Test the full flow with a sample participant

### During the Workshop

1. Share the event code with participants
2. Direct them to the [Level 0 Codelab](https://codelabs.developers.google.com/way-back-home-level-0/instructions)
3. Monitor the live map at `https://yourdomain.dev/e/your-event-code`
4. Celebrate as beacons light up across the planet!

### Cost Estimates

| Component | Approximate Cost |
|-----------|-----------------|
| Level 0 (per participant) | ~$0.08 (2 images) |
| Level 1 (per participant) | ~$0.15 (images + video + agent calls) |
| Cloud Run (idle) | ~$0/month (scales to zero) |
| Firestore (500 participants) | < $1/month |

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

### Development Setup

```bash
# Backend
cd dashboard/backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8080

# Frontend
cd dashboard/frontend
npm install
npm run dev
```

## 📄 License

Apache 2.0 - See [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Built with [Google ADK](https://github.com/google/adk-python) (Agent Development Kit)
- Powered by [Vertex AI](https://cloud.google.com/vertex-ai) and [Gemini](https://deepmind.google/technologies/gemini/)
- 3D visualization with [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)

---

**Ready to find your way back home?** Start with [Level 0](level_0/README.md) 🚀
