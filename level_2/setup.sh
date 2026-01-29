# --- Configuration ---
PROJECT_FILE="~/project_id.txt"
export REPO_NAME="christmas_agent"
# ---------------------

# --- Spanner Database Configuration ---
INSTANCE_ID="survivor-network"
DATABASE_ID="graph-db"
GRAPH_NAME="SurvivorGraph"
# ---------------------

echo "--- Setting Google Cloud Environment Variables ---"

# --- Authentication Check ---
echo "Checking gcloud authentication status..."

if gcloud auth print-access-token > /dev/null 2>&1; then
    echo "gcloud is authenticated."
else
    echo "Error: gcloud is not authenticated."
    echo "Please log in by running: gcloud auth login"
    return 1
fi

# 1. Check if project file exists
PROJECT_FILE_PATH=$(eval echo $PROJECT_FILE)
if [ ! -f "$PROJECT_FILE_PATH" ]; then
    echo "Error: Project file not found at $PROJECT_FILE_PATH"
    echo "Please create $PROJECT_FILE_PATH containing your Google Cloud project ID."
    return 1
fi

# 2. Set the default gcloud project configuration
PROJECT_ID_FROM_FILE=$(cat "$PROJECT_FILE_PATH")
echo "Setting gcloud config project to: $PROJECT_ID_FROM_FILE"
gcloud config set project "$PROJECT_ID_FROM_FILE" --quiet

# 3. Export PROJECT_ID
export PROJECT_ID=$(gcloud config get project)
echo "Exported PROJECT_ID=$PROJECT_ID"

# 4. Export PROJECT_NUMBER
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
echo "Exported PROJECT_NUMBER=$PROJECT_NUMBER"

# 5. Export SERVICE_ACCOUNT_NAME
export SERVICE_ACCOUNT_NAME=$(gcloud compute project-info describe --format="value(defaultServiceAccount)")
echo "Exported SERVICE_ACCOUNT_NAME=$SERVICE_ACCOUNT_NAME"

# 6. Export GOOGLE_CLOUD_PROJECT
export GOOGLE_CLOUD_PROJECT="$PROJECT_ID"
echo "Exported GOOGLE_CLOUD_PROJECT=$GOOGLE_CLOUD_PROJECT"

# 7. Export GOOGLE_GENAI_USE_VERTEXAI
export GOOGLE_GENAI_USE_VERTEXAI="TRUE"
echo "Exported GOOGLE_GENAI_USE_VERTEXAI=$GOOGLE_GENAI_USE_VERTEXAI"

# 8. Export REGION and GOOGLE_CLOUD_LOCATION
export REGION="us-central1"
export GOOGLE_CLOUD_LOCATION="$REGION"
echo "Exported REGION=$REGION"
echo "Exported GOOGLE_CLOUD_LOCATION=$GOOGLE_CLOUD_LOCATION"

# --- Google Cloud Storage Bucket Configuration ---
echo "--- Configuring Google Cloud Storage Bucket ---"

export BUCKET_NAME="$PROJECT_ID-bucket"
echo "Bucket name: $BUCKET_NAME"

if gsutil ls -b "gs://$BUCKET_NAME" > /dev/null 2>&1; then
    echo "Bucket gs://$BUCKET_NAME already exists."
else
    echo "Creating bucket gs://$BUCKET_NAME..."
    
    if gcloud storage buckets create "gs://$BUCKET_NAME" \
        --project="$PROJECT_ID" \
        --location="$REGION" \
        --uniform-bucket-level-access \
        --quiet; then
        echo "Bucket gs://$BUCKET_NAME created successfully."
    else
        echo "Error: Failed to create bucket gs://$BUCKET_NAME"
        return 1
    fi
fi

export GOOGLE_CLOUD_BUCKET="gs://$BUCKET_NAME"
export GCS_BUCKET_NAME="$BUCKET_NAME"
echo "Exported GOOGLE_CLOUD_BUCKET=$GOOGLE_CLOUD_BUCKET"
echo "Exported GCS_BUCKET_NAME=$GCS_BUCKET_NAME"

# --- Spanner Database Configuration ---
echo "--- Configuring Spanner Database Variables ---"

export INSTANCE_ID="$INSTANCE_ID"
export DATABASE_ID="$DATABASE_ID"
export GRAPH_NAME="$GRAPH_NAME"
echo "Exported INSTANCE_ID=$INSTANCE_ID"
echo "Exported DATABASE_ID=$DATABASE_ID"
echo "Exported GRAPH_NAME=$GRAPH_NAME"

# --- Write to .env file ---
echo "--- Writing to .env file ---"
cat <<EOF > .env
PROJECT_ID=$PROJECT_ID
PROJECT_NUMBER=$PROJECT_NUMBER
SERVICE_ACCOUNT_NAME=$SERVICE_ACCOUNT_NAME
GOOGLE_CLOUD_PROJECT=$GOOGLE_CLOUD_PROJECT
GOOGLE_GENAI_USE_VERTEXAI=$GOOGLE_GENAI_USE_VERTEXAI
REGION=$REGION
GOOGLE_CLOUD_LOCATION=$GOOGLE_CLOUD_LOCATION
BUCKET_NAME=$BUCKET_NAME
GOOGLE_CLOUD_BUCKET=$GOOGLE_CLOUD_BUCKET
GCS_BUCKET_NAME=$GCS_BUCKET_NAME
INSTANCE_ID=$INSTANCE_ID
DATABASE_ID=$DATABASE_ID
GRAPH_NAME=$GRAPH_NAME
USE_MEMORY_BANK=false
EOF
echo ".env file updated."

echo "--- Setup Complete ---"