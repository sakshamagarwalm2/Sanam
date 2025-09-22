# Tinkle - AI Desktop Assistant

**The invisible desktop assistant that provides real-time insights, answers, and support during meetings, interviews, presentations, and professional conversations.**


## Overview

Tinkle is an open-source, privacy-focused AI assistant that runs as a transparent overlay on your desktop. It can analyze screenshots, process audio, and provide intelligent responses using either local AI models (Ollama) or cloud-based AI (Google Gemini).

### Key Features

- **🔍 Smart Screenshot Analysis** - Capture and analyze any content on your screen
- **🎤 Audio Intelligence** - Process audio recordings for transcription and insights
- **💬 Contextual Chat** - Interactive AI conversations with full context awareness
- **🔒 Privacy-First** - Option to run completely locally with Ollama
- **👻 Invisible Mode** - Transparent overlay that stays out of your way
- **⌨️ Global Shortcuts** - Control everything with keyboard shortcuts
- **🌐 Cross-Platform** - Windows, macOS, and Linux support

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 16+** installed on your system
- **Git** for cloning the repository
- **AI Provider** (choose one):
  - **Gemini API key** from [Google AI Studio](https://makersuite.google.com/app/apikey) (cloud-based)
  - **Ollama** installed locally from [ollama.ai](https://ollama.ai) (privacy-focused)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/sakshamagarwalm2/Tinkle
   cd Tinkle
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file in the project root:

   **For Gemini (Cloud AI):**
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

   **For Ollama (Local AI - Recommended for privacy):**
   ```env
   USE_OLLAMA=true
   OLLAMA_MODEL=llama3.2
   OLLAMA_URL=http://localhost:11434
   ```

4. **Start the application**
   ```bash
   npm start
   ```

---

## ⌨️ Keyboard Shortcuts

### Global Shortcuts (work system-wide)

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Cmd/Ctrl + Shift + Space` | Show/Center Window | Centers and shows the main window |
| `Cmd/Ctrl + B` | Toggle Window | Show or hide the window |
| `Cmd/Ctrl + H` | Take Screenshot | Captures screenshot and analyzes it |
| `Cmd/Ctrl + Enter` | Process/Solve | Generates AI solution from screenshots |
| `Cmd/Ctrl + R` | Reset/Start Over | Clears all data and starts fresh |

### Window Movement

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + ←` | Move window left |
| `Cmd/Ctrl + →` | Move window right |
| `Cmd/Ctrl + ↑` | Move window up |
| `Cmd/Ctrl + ↓` | Move window down |

### Application Control

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + Q` | Quit application |

---

## 📸 Screenshot Functionality

### How It Works

1. **Capture**: Press `Cmd/Ctrl + H` to take a screenshot
2. **Analysis**: AI automatically analyzes the content
3. **Storage**: Up to 5 recent screenshots are kept in local storage
4. **Processing**: Screenshots are processed for problem extraction and solution generation

### Screenshot Features

- **Automatic window hiding** during capture for clean screenshots
- **Instant preview** with base64-encoded thumbnails
- **Queue management** with automatic cleanup of old screenshots
- **Cross-platform compatibility** using the `screenshot-desktop` library

### Usage Examples

- Capture coding problems during interviews
- Screenshot presentation slides for later reference
- Grab error messages for debugging assistance
- Document meeting notes or whiteboard content

---

## 🎤 Audio Processing

### Supported Audio Features

- **Real-time recording** from system microphone
- **File processing** for uploaded audio files (.mp3, .wav)
- **Base64 audio analysis** for direct audio data processing
- **Automatic transcription** and intelligent analysis

### How to Use Audio

1. **Voice Recording**:
   - Click the "Listen" button in the interface
   - Speak your question or problem
   - Click "Stop Recording" when finished
   - AI will transcribe and provide analysis

2. **Audio File Upload**:
   - The system can process audio files in the screenshot queue
   - Supported formats: MP3, WAV
   - Files are automatically detected and processed

### Audio Processing Pipeline

```
Audio Input → Base64 Encoding → AI Analysis → Text Response
```

---

## 🤖 AI Model Configuration

### Gemini (Cloud-based)

**Pros:**
- Latest AI technology (Gemini 2.0 Flash)
- Fastest response times
- Superior accuracy for complex tasks
- Advanced vision capabilities

**Cons:**
- Requires internet connection
- Data sent to Google servers
- Usage costs apply
- API key required

**Setup:**
1. Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add to `.env`: `GEMINI_API_KEY=your_key_here`
3. Restart application

### Ollama (Local/Private)

**Pros:**
- 100% private - data never leaves your computer
- No API costs or usage limits
- Works offline
- Multiple model options

**Cons:**
- Requires local installation
- Slower processing on lower-end hardware
- Limited to locally available models

**Setup:**
1. Install Ollama from [ollama.ai](https://ollama.ai)
2. Pull a model: `ollama pull llama3.2`
3. Configure `.env`:
   ```env
   USE_OLLAMA=true
   OLLAMA_MODEL=llama3.2
   OLLAMA_URL=http://localhost:11434
   ```
4. Restart application

### Supported Ollama Models

- **llama3.2** - General purpose, good balance
- **codellama** - Specialized for coding tasks
- **mistral** - Lightweight and fast
- **gemma** - Google's open model
- **Custom models** - Any Ollama-compatible model

### Switching Between Providers

1. Click the "CPU" button in the interface
2. Select your preferred provider (Gemini/Ollama)
3. Configure settings (API key for Gemini, model for Ollama)
4. Click "Apply Changes"
5. Test the connection

---

## 🖥️ User Interface Guide

### Main Interface Elements

1. **Command Bar** - Transparent bar with logo and shortcuts
2. **Chat Interface** - Expandable chat window for AI conversations
3. **Solution Panel** - Displays AI-generated solutions and analysis

### Interface States

- **Queue Mode**: Initial state for taking screenshots and asking questions
- **Solutions Mode**: Shows AI analysis and solutions
- **Debug Mode**: Advanced debugging with code comparison

### Visual Design

- **Liquid Glass Effect**: Semi-transparent background with blur
- **Always-on-top**: Stays visible above other applications
- **Minimal UI**: Clean, distraction-free interface
- **Dark Theme**: Easy on the eyes during extended use

---

## 🔧 Advanced Usage

### Development Mode

```bash
npm run dev          # Start Vite dev server
npm run electron:dev # Start Electron in development
npm run app:dev      # Start both (recommended)
```

### Production Build

```bash
npm run build        # Build for production
npm run dist         # Create distributable packages
```

### Build Outputs

- **Windows**: `.exe` installer and portable version
- **macOS**: `.dmg` disk image
- **Linux**: AppImage and `.deb` package

### Environment Variables Reference

```env
# Gemini Configuration
GEMINI_API_KEY=your_gemini_api_key

# Ollama Configuration  
USE_OLLAMA=true
OLLAMA_MODEL=llama3.2
OLLAMA_URL=http://localhost:11434

# Development
NODE_ENV=development
```

---

#### Application Issues

**Window won't show:**
- Press `Cmd/Ctrl + Shift + Space` to center and show
- Check if window is off-screen, use arrow key shortcuts to move
- Try quitting and restarting: `Cmd/Ctrl + Q`

**Screenshots not working:**
- Ensure screen capture permissions are granted (macOS/Linux)
- Check if antivirus is blocking screenshot functionality
- Try taking screenshot manually with `Cmd/Ctrl + H`

**AI not responding:**
- **Gemini**: Check API key validity and internet connection
- **Ollama**: Ensure Ollama service is running (`ollama serve`)
- Test connection using the "Test" button in settings

#### Platform-Specific Issues

**Windows:**
- Run as administrator if screenshot capture fails
- Check Windows Defender exclusions
- Ensure Node.js is in system PATH

**macOS:**
- Grant screen recording permissions in System Preferences
- Allow accessibility access for global shortcuts
- Check Gatekeeper settings for unsigned app

**Linux:**
- Install required dependencies: `sudo apt install libxtst6 libxrandr2 libasound2-dev`
- Check X11/Wayland compatibility
- Ensure user has access to audio/video devices

---

## 🔒 Privacy & Security

### Data Handling

- **Screenshots**: Stored locally in `userData/screenshots`, auto-deleted after processing
- **Audio**: Temporarily stored in memory, not saved to disk
- **Chat History**: Kept in memory only during session
- **API Keys**: Stored in environment variables, never transmitted

### Privacy Options

1. **Full Local Mode**: Use Ollama for 100% local processing
2. **Hybrid Mode**: Local screenshots with cloud AI processing
3. **Cloud Mode**: Full Gemini integration with Google's privacy policy

### Security Features

- No telemetry or usage tracking
- No automatic updates without consent
- Open source for full transparency
- Encrypted communication with AI providers

---

## 🏗️ Architecture

### Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Electron, Node.js
- **AI Integration**: Google Generative AI, Ollama API
- **Build Tools**: Vite, Electron Builder
- **Screenshot**: screenshot-desktop library
- **Audio**: Web Audio API, MediaRecorder

### Project Structure

```
Tinkle/
├── electron/           # Electron main process
│   ├── main.ts        # Application entry point
│   ├── ipcHandlers.ts # IPC communication handlers
│   ├── LLMHelper.ts   # AI model integration
│   └── shortcuts.ts   # Global keyboard shortcuts
├── src/               # React frontend
│   ├── _pages/        # Main application pages
│   ├── components/    # Reusable UI components
│   └── types/         # TypeScript definitions
└── assets/           # Icons and resources
```

### Key Components

1. **AppState**: Central state management
2. **WindowHelper**: Window positioning and visibility
3. **ScreenshotHelper**: Screenshot capture and management
4. **ProcessingHelper**: AI processing coordination
5. **LLMHelper**: AI model abstraction layer

---

## 🤝 Contributing

### How to Contribute

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** changes: `git commit -m 'Add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Development Setup

```bash
git clone https://github.com/sakshamagarwalm2/Tinkle
cd Tinkle
npm install
npm run app:dev
```

### Code Style

- **TypeScript** for type safety
- **ESLint** for code quality
- **Prettier** for formatting
- **Conventional Commits** for commit messages

### Areas for Contribution

- 🐛 **Bug fixes** and stability improvements
- ✨ **New features** and AI model integrations
- 📚 **Documentation** and tutorials
- 🌍 **Translations** and internationalization
- 🎨 **UI/UX** enhancements
- 🔧 **Platform support** improvements

---

## 📄 License

**ISC License** - Free for personal and commercial use.

```
Copyright (c) 2024 Tinkle Contributors

```

---

## 🙏 Acknowledgments

- **Ollama** team for local AI infrastructure
- **Google** for Gemini AI capabilities
- **Electron** community for desktop app framework


---

**⭐ Star this repo if Tinkle helps you succeed in meetings, interviews, or presentations!**
