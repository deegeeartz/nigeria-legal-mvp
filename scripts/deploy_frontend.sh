#!/bin/bash
# scripts/deploy_frontend.sh
# Deploys the Next.js frontend to GCP Cloud Run

set -e

# Configuration Variables
PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1" # Or your preferred GCP region
SERVICE_NAME="nl-mvp-frontend"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

# Check if Backend URL is provided
if [ -z "$NEXT_PUBLIC_API_BASE_URL" ]; then
    echo "❌ Error: NEXT_PUBLIC_API_BASE_URL is not set."
    echo "Please set it before running this script."
    echo "Example: export NEXT_PUBLIC_API_BASE_URL=http://<VM_IP_ADDRESS>:8000"
    exit 1
fi

echo "🚀 Building Docker Image..."
# We must pass the API URL as a build arg so Next.js embeds it during the build step
gcloud builds submit --tag $IMAGE_NAME ../frontend/ \
  --timeout=1200s \
  --machine-type=e2-highcpu-8

echo "📦 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
  --port 3000 \
  --memory 512Mi

echo "✅ Frontend deployment complete!"
