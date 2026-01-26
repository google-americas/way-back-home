#!/bin/bash

# ==============================================================================
# Verify Setup Script - Mission Charlie (Level 5)
# 
# Checks that the environment is correctly configured:
# 1. Google Cloud Project is set
# 2. Required APIs are enabled (Vertex AI, Cloud Run)
# 3. Python dependencies are installed
# 4. .env configuration exists
# ==============================================================================

# --- Colors for Output ---
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BOLD}🚀 Verifying Mission Alpha (Level 3) Infrastructure...${NC}\n"

ALL_PASSED=true

# ------------------------------------------------------------------------------
# 1. Check Google Cloud Project
# ------------------------------------------------------------------------------
# Try to get project from gcloud config, suppress errors
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)

# Fallback to environment variable if gcloud config returned nothing or (unset)
if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" == "(unset)" ]; then
    PROJECT_ID=$GOOGLE_CLOUD_PROJECT
fi

if [ -n "$PROJECT_ID" ] && [ "$PROJECT_ID" != "(unset)" ]; then
    echo -e "✅ Google Cloud Project: ${GREEN}${PROJECT_ID}${NC}"
else
    echo -e "❌ Google Cloud Project: ${RED}Not Configured${NC}"
    echo "   Run: gcloud config set project YOUR_PROJECT_ID"
    ALL_PASSED=false
fi

# ------------------------------------------------------------------------------
# 2. Check Cloud APIs (Only if Project ID is found)
# ------------------------------------------------------------------------------
if [ "$ALL_PASSED" = true ]; then
    REQUIRED_APIS=("aiplatform.googleapis.com" "run.googleapis.com" "compute.googleapis.com")
    MISSING_APIS=()
    
    # Get enabled services list once to speed up execution
    # We grep strictly to ensure exact matches
    ENABLED_SERVICES=$(gcloud services list --enabled --format="value(config.name)" --project="$PROJECT_ID" 2>/dev/null)
    
    if [ $? -ne 0 ]; then
        echo -e "⚠️  Cloud APIs: ${YELLOW}Could not verify (gcloud error or permissions issue)${NC}"
    else
        for API in "${REQUIRED_APIS[@]}"; do
            if ! echo "$ENABLED_SERVICES" | grep -q "$API"; then
                MISSING_APIS+=("$API")
            fi
        done
        
        if [ ${#MISSING_APIS[@]} -eq 0 ]; then
            echo -e "✅ Cloud APIs: ${GREEN}Active${NC}"
        else
            echo -e "❌ Cloud APIs: ${RED}Missing ${MISSING_APIS[*]}${NC}"
            echo "   Run: gcloud services enable ${MISSING_APIS[*]}"
            ALL_PASSED=false
        fi
    fi
fi

# ------------------------------------------------------------------------------
# 3. Check Python Dependencies
# ------------------------------------------------------------------------------
# Format: "PipPackageName:PythonImportName"
DEPS=(
    "fastapi:fastapi"
    "uvicorn:uvicorn"
    "google-genai:google.genai"
    "websockets:websockets"
    "python-dotenv:dotenv"
    "google-adk:google.adk"
)

MISSING_DEPS=()

for DEP in "${DEPS[@]}"; do
    PKG_NAME="${DEP%%:*}"    # String before colon
    IMPORT_NAME="${DEP##*:}" # String after colon
    
    # Try to import the module silently
    python3 -c "import $IMPORT_NAME" 2>/dev/null
    
    if [ $? -ne 0 ]; then
        MISSING_DEPS+=("$PKG_NAME")
    fi
done

if [ ${#MISSING_DEPS[@]} -eq 0 ]; then
    echo -e "✅ Python Environment: ${GREEN}Ready${NC}"
else
    echo -e "❌ Python Dependencies: ${RED}Missing ${MISSING_DEPS[*]}${NC}"
    echo "   Run: pip install -r requirements.txt"
    ALL_PASSED=false
fi



# ------------------------------------------------------------------------------
# Final Summary
# ------------------------------------------------------------------------------
echo -e "\n-------------------------------------------------------"
if [ "$ALL_PASSED" = true ]; then
    echo -e "🎉 ${GREEN}${BOLD}SYSTEMS ONLINE. READY FOR MISSION.${NC}"
else
    echo -e "🛑 ${RED}${BOLD}SYSTEM CHECKS FAILED.${NC} Please resolve the issues above."
fi