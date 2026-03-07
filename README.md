# Reddit-Pi

Reddit-Pi is an intelligent recommendation engine and automated interaction tool for Reddit, optimized for Raspberry Pi.

## Overview

This module fetches content from Reddit, scores it based on user preferences (affinities), and provides a web interface for manual interactions. It also automates "sync" actions like upvoting or hiding posts based on background processing.

## Key Features

- **Intelligent Scoring**: Ranks posts using custom logic, novelty penalties, and LLM summaries.
- **Automated Pipeline**: Periodically fetches and processes subreddits to find high-value content.
- **Web Interface**: A modern React-based UI for managing feeds, history, and preferences.
- **Reddit API Sync**: Handles background synchronization of likes and dislikes.

## Getting Started

1. Install dependencies: `npm install`
2. **Onboarding**: Run `npm run onboard` for an interactive setup of your `.env` and `config.json` files.
3. Build and Start: `npm start`
