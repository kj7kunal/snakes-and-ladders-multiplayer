# 🐍🪜 Snakes & Ladders - Online Multiplayer

A modern, real-time multiplayer implementation of the classic Snakes & Ladders game built with vanilla JavaScript and Firebase.

## 🎮 Features

- **Multiplayer Support**: Up to 6 players in real-time
- **Custom Board Setup**: Each player places their own snakes, ladders, and mystery boxes
- **Mystery Box Powers**: 5 unique power-ups (BOOST, REROLL, SHIELD, SWAP_LEADER, MINI_LEAP)
- **Real-time Reactions**: Emoji reactions visible to all players
- **Mobile Responsive**: Optimized for both desktop and mobile devices
- **Exact 100 Rule**: Must land exactly on 100 to win

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd Snakes_and_ladders
```

### 2. Firebase Setup
1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Firestore Database and Authentication (Anonymous)
3. Get your Firebase configuration from Project Settings
4. Copy the example config file and update with your Firebase project values:
   ```bash
   cp src/modules/firebase-config.example.js src/modules/firebase-config.js
   ```
   Then edit `src/modules/firebase-config.js` with your actual Firebase configuration.

### 3. Configuration
The Firebase configuration is handled through `src/modules/firebase-config.js` which you create from the example file. This file is git-ignored to prevent accidentally committing API keys to version control.

> **Note**: While Firebase client config values are generally safe to expose publicly (security is handled by Firestore rules), it's still a best practice to keep them out of version control.

### 4. Deploy
```bash
firebase deploy
```

## 🎯 How to Play

1. **Create/Join Room**: Enter a 6-character room code
2. **Placement Phase**: Each player places 2 ladders, 2 snakes, and 1 mystery box
3. **Game Phase**: Take turns rolling dice and moving around the board
4. **Win Condition**: First player to land exactly on square 100 wins!

## 🛠️ Technology Stack

- **Frontend**: Vanilla JavaScript (ES6 modules)
- **Backend**: Firebase (Firestore + Authentication)
- **Hosting**: Firebase Hosting
- **Styling**: Modern CSS with dark theme

## 🔒 Security

- Firebase API keys are stored in environment variables
- Anonymous authentication for multiplayer sessions
- Client-side validation with server-side transaction safety

## 📱 Game Phases

1. **Lobby**: Players join and wait for game start
2. **Placement**: Interactive board setup phase
3. **Playing**: Turn-based dice rolling and movement
4. **Finished**: Winner celebration and game reset option

## 🎨 Features Detail

- **Floating Comments**: Real-time feedback for all actions
- **Power System**: Strategic mystery box abilities
- **Responsive Design**: Works on all screen sizes
- **Real-time Sync**: All players see the same game state
- **Emoji Reactions**: Quick communication between players

## Development

### Quick Start
```bash
# Serve locally
python -m http.server 8000
# Open http://localhost:8000
```

### Architecture
The game uses a modular ES6 structure:
- `src/main.js` - Entry point
- `src/modules/` - Game logic modules
- Firebase for real-time multiplayer

### File Structure
```
/
├── index.html          # Main game file
├── src/
│   ├── main.js        # App initialization
│   └── modules/       # Game modules
│       ├── firebase.js
│       ├── ui.js
│       ├── state.js
│       └── ...
```

## Deployment

Works on any static hosting:
- GitHub Pages
- Netlify  
- Firebase Hosting
- Local HTTP server
