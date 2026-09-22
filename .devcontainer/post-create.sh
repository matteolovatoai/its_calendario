#!/usr/bin/env bash
set -e

echo "🚀 Inizializzazione ambiente Dev Container..."

# Configurazione ambiente Python (in /home/vscode/venv per isolare dalle cartelle montate)
echo "📦 Installazione dipendenze Backend (Python)..."
python3 -m venv /home/vscode/venv
/home/vscode/venv/bin/pip install --upgrade pip
/home/vscode/venv/bin/pip install -r backend/requirements.txt

# Configurazione Frontend
echo "📦 Installazione dipendenze Frontend (Node.js)..."
cd frontend && npm install
cd ..

# Installazione Antigravity CLI (agy) nativo per Linux dentro il container
echo "🤖 Installazione Antigravity CLI (agy)..."
curl -fsSL https://antigravity.google/cli/install.sh | bash

# Esporta i PATH per il virtualenv e per la CLI di Antigravity
for rc in /home/vscode/.bashrc /home/vscode/.zshrc; do
  if [ -f "$rc" ]; then
    echo 'export PATH="$HOME/.local/bin:/home/vscode/venv/bin:$PATH"' >> "$rc"
  fi
done

echo "✅ Dev container pronto per lo sviluppo con agy CLI!"
