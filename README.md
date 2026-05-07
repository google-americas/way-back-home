# 🚀 Way Back Home

![Way Back Home](dashboard/frontend/public/prelude.png)

**An immersive AI workshop platform where participants learn to build intelligent agents while rescuing a stranded space explorer.**

Way Back Home is a hands-on workshop experience that teaches Google Cloud AI technologies through an engaging narrative. Participants crash-land on an alien planet and must use AI to identify themselves, analyze their surroundings, and coordinate rescue efforts.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-waybackhome.dev-blue?style=for-the-badge)](https://waybackhome.dev)
[![Codelab](https://img.shields.io/badge/Codelab-Level%200-green?style=for-the-badge)](https://codelabs.developers.google.com/way-back-home-level-0/instructions)
[![Codelab](https://img.shields.io/badge/Codelab-Level%31-orange?style=for-the-badge)](https://codelabs.developers.google.com/way-back-home-level-1/instructions)
[![Codelab](https://img.shields.io/badge/Codelab-Level%202-green?style=for-the-badge)](x)
[![Codelab](https://img.shields.io/badge/Codelab-Level%203-orange?style=for-the-badge)](https://codelabs.developers.google.com/way-back-home-level-3/instructions)
[![Codelab](https://img.shields.io/badge/Codelab-Level%204-green?style=for-the-badge)](https://codelabs.developers.google.com/way-back-home-level-4/instructions)
[![Codelab](https://img.shields.io/badge/Codelab-Level%205-orange?style=for-the-badge)](https://codelabs.developers.google.com/way-back-home-level-5/instructions)
## 🎮 The Experience

You're a space explorer whose ship has crashed on an uncharted planet. Your rescue beacon is offline, and you're scattered across the surface with other survivors. To get home, you must:

| Level | Mission | AI Skills Learned |
|-------|---------|-------------------|
| **Level 0** | [Generate your identity](level_0/) | Multi-turn image generation, Gemini (Nano Banana) |
| **Level 1** | [Pinpoint your crash location](level_1/) | Multi-agent systems, MCP servers, ADK, parallel processing |
| **Level 2** | [Process SOS signals](level_2/) | Event-driven agents, A2A communication |
| **Level 3** | Coordinate rescue (Alpha) | Agent orchestration, consensus protocols |
| **Level 4** | Coordinate rescue (Beta) | Agent orchestration, consensus protocols |
| **Level 5** | Coordinate rescue (Final) | Agent orchestration, consensus protocols |

## 🛠️ Technology Stack

| Component | Technologies |
|-----------|-------------|
| **Frontend** | Next.js 14, Three.js, React Three Fiber, Tailwind CSS |
| **Backend** | FastAPI, Firestore, Firebase Storage, Cloud Run |
| **AI/ML** | Vertex AI, Gemini 2.5 Flash, Veo 3.1 |
| **Agents** | Google ADK, MCP (Model Context Protocol), Google Cloud MCP servers |
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
   
   > **Note:** On your first deployment, Cloud Run will generate unique URLs for your services. After the build finishes, you **must** redeploy the frontend once more using these specific URLs to ensure the 3D map can communicate with the API.

   ```bash
   # First deployment (to generate URLs)
   gcloud builds submit --config cloudbuild.yaml

   # Get and save your URLs
   export API_BASE_URL=$(gcloud run services describe way-back-home-api --format='value(status.url)')
   export MAP_BASE_URL=$(gcloud run services describe way-back-home-frontend --format='value(status.url)')

   # Redeploy frontend with the actual URLs
   gcloud builds submit --config cloudbuild.yaml \
     --substitutions=_API_BASE_URL=$API_BASE_URL,_MAP_BASE_URL=$MAP_BASE_URL,_DEPLOY_BACKEND=false
   ```

5. **Update Workshop Configuration:**
   After deployment, you **must** update `workshop.config.json` with your actual URLs. This file is used by the `scripts/setup.sh` script that participants run.
   
   ```json
   {
       "api_base_url": "https://your-api-url-here",
       "map_base_url": "https://your-frontend-url-here"
   }
   ```

### Environment Configuration

Create a `set_env.sh` in project root:

```bash
export GOOGLE_CLOUD_PROJECT=$(gcloud config get-value project)
export REGION="us-central1"
export API_BASE_URL=$(gcloud run services describe way-back-home-api --format='value(status.url)')
export MAP_BASE_URL=$(gcloud run services describe way-back-home-frontend --format='value(status.url)')
```

## 🎓 Workshop Hosting Guide

### Before the Workshop

1. Deploy backend and frontend to your GCP project. Ensure you pass your Cloud Run service URLs to the `substitutions` flag in `gcloud builds submit`.

2. **Configure Admin Access:**
   The API requires callers of admin endpoints to be registered in the `admins` Firestore collection.
   - Go to **Firebase Console** > **Firestore**.
   - Create a collection named `admins`.
   - Create a document where the **Document ID** is your email (e.g., `your-name@google.com`).
   - Add a field `active: true` (boolean).

3. **Create an event using one of the following methods:**

#### Method A: Firestore (Manual - Recommended for quick start)
Create a document in the `events` collection with the following structure:
- **Collection:** `events`
- **Document ID:** `bwai-mycity` (or your chosen event code)
- **Fields:**
  - `active`: `true` (boolean)
  - `code`: `"bwai-mycity"` (string)
  - `created_at`: `[Current Timestamp]` (timestamp)
  - `created_by`: `"admin"` (string)
  - `description`: `""` (string)
  - `max_participants`: `500` (number)
  - `name`: `"Build With IA - GDG SJC"` (string)
  - `participant_count`: `0` (number)

#### Method B: CLI (Recommended for automated setup)
Use the provided Python script to create an event directly in Firestore using your authenticated `gcloud` credentials:
```bash
python3 scripts/create_event.py your-event-code "Your Workshop Name" --project $(gcloud config get-value project)
```

#### Method C: Helper Tool (Easiest for Hosts)
The repository includes a simple HTML tool to help you get a Firebase ID Token without using the command line:
1. Open `dashboard/helper/get_firebase_token.html` in your browser.
2. Ensure you've replaced the `firebaseConfig` in the file with your actual project config.
3. Click "Sign in with Google".
4. Copy the generated ID Token.

#### Method D: API (Advanced)
1. **Retrieve a Firebase ID Token from the terminal:**
   ```bash
   # 1. Get your Google Identity Token
   ID_TOKEN=$(gcloud auth print-identity-token)
   
   # 2. Exchange it for a Firebase ID Token
   # Requires your Firebase Web API Key (Firebase Console > Project Settings)
   API_KEY="YOUR_FIREBASE_WEB_API_KEY"
   
   FIREBASE_TOKEN=$(curl -s -X POST "https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${API_KEY}" \
     -H "Content-Type: application/json" \
     -d "{\"postBody\": \"id_token=${ID_TOKEN}&providerId=google.com\", \"requestUri\": \"http://localhost\", \"returnIdpCredential\": true, \"returnSecureToken\": true}" | jq -r .idToken)
   ```

2. **Call the Admin API:**
   ```bash
   curl -X POST $API_BASE_URL/admin/events \
     -H "Authorization: Bearer $FIREBASE_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"code": "your-event-code", "name": "Your Workshop Name"}'
   ```

3. Generate QR codes pointing to your event URL (e.g., `$MAP_BASE_URL/e/your-event-code`).
4. Test the full flow with a sample participant.

### During the Workshop

1. Share the event code with participants
2. Direct them to the [Level 0 Codelab](https://codelabs.developers.google.com/way-back-home-level-0/instructions)
3. Monitor the live map at `$MAP_BASE_URL/e/your-event-code`
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
