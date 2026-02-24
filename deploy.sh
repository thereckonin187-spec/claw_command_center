#!/bin/bash
# ═══════════════════════════════════════════════════════════
# CLAW COMMAND CENTER — DEPLOYMENT SCRIPT
# ═══════════════════════════════════════════════════════════

set -e

echo "══════════════════════════════════════════════════"
echo "  CLAW COMMAND CENTER — DEPLOYMENT"
echo "══════════════════════════════════════════════════"
echo ""

# Step 1: Build
echo "> Building production bundle..."
npm run build

echo ""
echo "> Build complete."
echo ""

# Step 2: Deploy instructions
echo "══════════════════════════════════════════════════"
echo "  DEPLOY TO VERCEL"
echo "══════════════════════════════════════════════════"
echo ""
echo "First-time setup:"
echo "  1. npm i -g vercel"
echo "  2. vercel login"
echo "  3. vercel (follow prompts, set output dir to 'build')"
echo ""
echo "To deploy now, run:"
echo "  npx vercel --prod"
echo ""
echo "NOTES:"
echo "  - Voice server (local Piper TTS) will NOT work when deployed."
echo "    The app falls back to browser SpeechSynthesis automatically."
echo "  - Oura proxy requires the local proxy server running."
echo "    Oura data won't sync when deployed remotely."
echo "  - News API (newsapi.org) free tier blocks browser requests"
echo "    from non-localhost. Consider upgrading or using a proxy."
echo ""
echo "══════════════════════════════════════════════════"
