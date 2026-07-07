#!/bin/bash
# scripts/setup_vm.sh
# Run this directly on your GCP e2-micro VM to install Docker, 
# clone the repo, and start the backend.

set -e

echo "🚀 Updating system and installing dependencies..."
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg git software-properties-common

echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null
then
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Add current user to docker group
    sudo usermod -aG docker $USER
    echo "✅ Docker installed. (Note: You may need to log out and back in to use 'docker' without sudo)"
else
    echo "✅ Docker already installed."
fi

# Determine repo directory
APP_DIR="$HOME/nigeria-legal-mvp"

if [ ! -d "$APP_DIR" ]; then
    echo "📦 Creating app directory at $APP_DIR..."
    # If the user hasn't cloned the code, they can clone it here
    # Example: git clone https://github.com/your-username/nigeria-legal-mvp.git $APP_DIR
    echo "⚠️ Please upload or git clone your codebase to $APP_DIR before running the backend."
    mkdir -p $APP_DIR
fi

echo "✅ VM Setup Complete!"
echo ""
echo "Next Steps:"
echo "1. Ensure your codebase is in $APP_DIR"
echo "2. Create a .env file inside $APP_DIR with your DATABASE_URL (Supabase), etc."
echo "3. Run the following command inside $APP_DIR to start the backend:"
echo "   sudo docker compose -f docker-compose.prod.yml up -d --build"
