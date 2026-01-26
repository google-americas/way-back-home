#!/bin/bash

# --- Function for error handling ---
handle_error() {
  echo -e "\n\n*******************************************************"
  echo "Error: $1"
  echo "*******************************************************"
  exit 1
}

# Define the file to store the Project ID
PROJECT_FILE="$HOME/project_id.txt"

# 1. Get the current project from gcloud config
# We suppress stderr to keep the output clean
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)

# Handle the case where gcloud returns "(unset)" explicitly
if [ "$CURRENT_PROJECT" == "(unset)" ]; then
    CURRENT_PROJECT=""
fi

echo "-------------------------------------------------------"
if [ -n "$CURRENT_PROJECT" ]; then
    echo "Current gcloud configuration detected: $CURRENT_PROJECT"
else
    echo "No active gcloud project configuration detected."
fi

# 2. Ask user to confirm or edit
# If CURRENT_PROJECT is set, show it as default.
read -p "Enter the Google Cloud Project ID to use [Press Enter for '$CURRENT_PROJECT']: " INPUT_PROJECT_ID

# 3. Determine the final Project ID
# If the user typed something, use it. If not, use the default.
PROJECT_ID=${INPUT_PROJECT_ID:-$CURRENT_PROJECT}

# 4. Check if we actually have a Project ID
if [ -z "$PROJECT_ID" ]; then
    echo -e "\n\n*******************************************************"
    echo "WARNING: No Project ID provided!"
    echo "*******************************************************"
    echo "You have not selected a project."
    echo "Please ensure you have either:"
    echo "  1. Completed the Level 0 workshop to create a project."
    echo "  2. Or selected the learning path that does not require Level 0."
    
    # Depending on your workflow, you might want to exit here or 
    # allow the script to continue (though gcloud commands will likely fail).
    handle_error "Cannot proceed without a valid Project ID."
fi

# 5. Export and Save
export PROJECT_ID
echo "$PROJECT_ID" > "$PROJECT_FILE"

echo "-------------------------------------------------------"
echo "Project ID '$PROJECT_ID' has been set."
echo "Saved to: $PROJECT_FILE"
echo "-------------------------------------------------------"