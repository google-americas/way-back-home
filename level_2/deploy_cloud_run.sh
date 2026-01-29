#!/bin/bash

# Script to deploy the Survivor Network using Google Cloud Build
# Usage: ./deploy_cloud_run.sh

# Exit immediately if a command exits with a non-zero status
set -e

# Navigate to the script's directory (root)
cd "$(dirname "$0")"

# Load environment variables
ENV_FILE=".env"

if [ ! -f "$ENV_FILE" ]; then
    echo "Error: .env file not found at $ENV_FILE"
    echo "Please create a .env file with PROJECT_ID and other required variables first."
    exit 1
fi

set -a
source "$ENV_FILE"
set +a

if [ -z "$PROJECT_ID" ]; then
    echo "Error: PROJECT_ID is not set in .env"
    exit 1
fi

REGION=${REGION:-us-central1}

echo "------------------------------------------------"
echo "Starting Cloud Build Deployment"
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "------------------------------------------------"

# Run Cloud Build
# We pass sensitive variables as substitutions
gcloud builds submit --config cloudbuild.yaml \
    --project "$PROJECT_ID" \
    --substitutions _REGION="$REGION",_GOOGLE_API_KEY="$GOOGLE_API_KEY",_AGENT_ENGINE_ID="$AGENT_ENGINE_ID",_USE_MEMORY_BANK="$USE_MEMORY_BANK",_GCS_BUCKET_NAME="$GCS_BUCKET_NAME",_INSTANCE_ID="$INSTANCE_ID",_DATABASE_ID="$DATABASE_ID",_GRAPH_NAME="$GRAPH_NAME",_GOOGLE_GENAI_USE_VERTEXAI="$GOOGLE_GENAI_USE_VERTEXAI"

echo "------------------------------------------------"
echo "Cloud Build Submitted Successfully!"
echo "Cloud Build Submitted Successfully!"
echo "Retrieving Frontend URL..."

FRONTEND_URL=$(gcloud run services describe survivor-frontend --region "$REGION" --format 'value(status.url)' 2>/dev/null || echo "URL not found")

echo "------------------------------------------------"
echo "Deployment Complete!"
echo "Frontend URL: $FRONTEND_URL"
echo "------------------------------------------------"
