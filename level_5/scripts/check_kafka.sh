#!/bin/bash
# This script is designed to NEVER close the terminal window automatically.
# It will check for and start the 'mission-kafka' container,
# then wait indefinitely until you manually close the window.

# --- Main Logic Function ---
# We put the core logic in a function to control execution flow.
start_kafka_if_needed() {
    # --- Configuration ---
    local CONTAINER_NAME="mission-kafka"
    local IMAGE_NAME="apache/kafka:4.2.0-rc1"

    # 1. First, check if Docker is running at all.
    echo "--- [CHECK 1/5] Verifying Docker is running..."
    if ! docker info > /dev/null 2>&1; then
        echo "❌ ERROR: Docker daemon is not running or you don't have permission to access it."
        echo "Please start Docker and try again. The window will remain open."
        return 1 # Stop the function here
    fi
    echo "✅ Docker is running."

    # 2. Check if the container is already running.
    echo "--- [CHECK 2/5] Checking if '${CONTAINER_NAME}' is already running..."
    if [ "$(docker ps -q -f "name=^${CONTAINER_NAME}$")" ]; then
        echo "✅ Kafka is already running. No action needed."
        return 0 # Exit the function successfully
    fi
    echo "   -> Kafka is not currently running."

    # 3. Clean up any old, stopped container with the same name.
    echo "--- [STEP 3/5] Cleaning up old, stopped containers..."
    if [ "$(docker ps -a -q -f "name=^${CONTAINER_NAME}$")" ]; then
        echo "   -> Found and removed old '${CONTAINER_NAME}' container."
        docker rm "${CONTAINER_NAME}"
    else
        echo "   -> No old container to clean up."
    fi

    # 4. Generate a Cluster ID and launch the container.
    echo "--- [STEP 4/5] Starting new Kafka container..."
    local CLUSTER_ID
    CLUSTER_ID=$(docker run --rm "${IMAGE_NAME}" /opt/kafka/bin/kafka-storage.sh random-uuid)
    echo "   -> Generated Cluster ID: ${CLUSTER_ID}"
    
    docker run -d \
      --name "${CONTAINER_NAME}" \
      -p 9092:9092 \
      -e CLUSTER_ID="${CLUSTER_ID}" \
      -e KAFKA_PROCESS_ROLES='broker,controller' \
      -e KAFKA_NODE_ID=1 \
      -e KAFKA_CONTROLLER_LISTENER_NAMES=CONTROLLER \
      -e KAFKA_LISTENERS=PLAINTEXT://:9092,CONTROLLER://:9093 \
      -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://127.0.0.1:9092 \
      -e KAFKA_CONTROLLER_QUORUM_VOTERS=1@127.0.0.1:9093 \
      -e KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1 \
      "${IMAGE_NAME}"
    echo "   -> Launch command sent."

    # 5. Verify that the container started successfully.
    echo "--- [STEP 5/5] Verifying startup (waiting 5 seconds)..."
    sleep 5
    if [ "$(docker ps -q -f "name=^${CONTAINER_NAME}$")" ]; then
        echo "🎉 Kafka container '${CONTAINER_NAME}' was successfully started."
    else
        echo "❌ ERROR: Kafka container failed to start."
        echo "   Run 'docker logs ${CONTAINER_NAME}' in a new terminal to see the reason."
    fi
}


# --- Main Execution Block ---
# This part of the script is what runs first.

# Call the function to do all the work.
start_kafka_if_needed

# This final block will ALWAYS run, regardless of what happens in the function.
echo ""
echo "-------------------------------------------------------"


