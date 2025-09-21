// ipcHandlers.ts
// This file defines all the IPC (Inter-Process Communication) handlers
// between the Electron main process and the renderer process (frontend).
// The handlers let the React frontend request actions (screenshots, AI analysis, window controls, etc.)
// and return results back from the main process (Electron backend).

import { ipcMain, app } from "electron"
import { AppState } from "./main"

// Initialize IPC Handlers (called from main.ts)
export function initializeIpcHandlers(appState: AppState): void {
  /**
   * ----------------------------
   * Window and UI Management
   * ----------------------------
   */

  // Update the overlay window dimensions dynamically
  ipcMain.handle("update-content-dimensions", async (event, { width, height }: { width: number; height: number }) => {
    if (width && height) {
      appState.setWindowDimensions(width, height)
    }
  })

  // Toggle visibility of the main overlay window
  ipcMain.handle("toggle-window", async () => {
    appState.toggleMainWindow()
  })

  // Move window in four directions
  ipcMain.handle("move-window-left", async () => appState.moveWindowLeft())
  ipcMain.handle("move-window-right", async () => appState.moveWindowRight())
  ipcMain.handle("move-window-up", async () => appState.moveWindowUp())
  ipcMain.handle("move-window-down", async () => appState.moveWindowDown())

  // Center and show window on screen
  ipcMain.handle("center-and-show-window", async () => {
    appState.centerAndShowWindow()
  })

  // Quit the entire application
  ipcMain.handle("quit-app", () => {
    app.quit()
  })

  /**
   * ----------------------------
   * Screenshot Management
   * ----------------------------
   */

  // Delete a screenshot by path
  ipcMain.handle("delete-screenshot", async (event, path: string) => {
    return appState.deleteScreenshot(path)
  })

  // Capture a new screenshot
  ipcMain.handle("take-screenshot", async () => {
    try {
      const screenshotPath = await appState.takeScreenshot()
      const preview = await appState.getImagePreview(screenshotPath)
      return { path: screenshotPath, preview }
    } catch (error) {
      console.error("Error taking screenshot:", error)
      throw error
    }
  })

  // Get a list of all stored screenshots (with previews)
  ipcMain.handle("get-screenshots", async () => {
    console.log({ view: appState.getView() })
    try {
      let previews = []
      if (appState.getView() === "queue") {
        // Normal screenshot queue
        previews = await Promise.all(
          appState.getScreenshotQueue().map(async (path) => ({
            path,
            preview: await appState.getImagePreview(path)
          }))
        )
      } else {
        // Extra screenshots (debugging context)
        previews = await Promise.all(
          appState.getExtraScreenshotQueue().map(async (path) => ({
            path,
            preview: await appState.getImagePreview(path)
          }))
        )
      }
      previews.forEach((preview: any) => console.log(preview.path))
      return previews
    } catch (error) {
      console.error("Error getting screenshots:", error)
      throw error
    }
  })

  // Reset screenshot queues and problem info
  ipcMain.handle("reset-queues", async () => {
    try {
      appState.clearQueues()
      console.log("Screenshot queues have been cleared.")
      return { success: true }
    } catch (error: any) {
      console.error("Error resetting queues:", error)
      return { success: false, error: error.message }
    }
  })

  /**
   * ----------------------------
   * Audio & Image Analysis
   * ----------------------------
   */

  // Analyze audio given as Base64 string
  ipcMain.handle("analyze-audio-base64", async (event, data: string, mimeType: string) => {
    try {
      if (!appState.processingHelper.isLLMHelperReady()) {
        throw new Error("LLM Helper not configured. Please set up your AI model first.")
      }
      const result = await appState.processingHelper.processAudioBase64(data, mimeType)
      return result
    } catch (error: any) {
      console.error("Error in analyze-audio-base64 handler:", error)
      throw error
    }
  })

  // Analyze audio given as a file path
  ipcMain.handle("analyze-audio-file", async (event, path: string) => {
    try {
      if (!appState.processingHelper.isLLMHelperReady()) {
        throw new Error("LLM Helper not configured. Please set up your AI model first.")
      }
      const result = await appState.processingHelper.processAudioFile(path)
      return result
    } catch (error: any) {
      console.error("Error in analyze-audio-file handler:", error)
      throw error
    }
  })

  // Analyze image given as a file path
  ipcMain.handle("analyze-image-file", async (event, path: string) => {
    try {
      if (!appState.processingHelper.isLLMHelperReady()) {
        throw new Error("LLM Helper not configured. Please set up your AI model first.")
      }
      const llmHelper = appState.processingHelper.getLLMHelper()
      const result = await llmHelper!.analyzeImageFile(path)
      return result
    } catch (error: any) {
      console.error("Error in analyze-image-file handler:", error)
      throw error
    }
  })

  /**
   * ----------------------------
   * Chat / AI Model Interaction
   * ----------------------------
   */

  // Send a chat message to Gemini (or Ollama if selected)
  ipcMain.handle("gemini-chat", async (event, message: string) => {
    try {
      if (!appState.processingHelper.isLLMHelperReady()) {
        throw new Error("LLM Helper not configured. Please set up your AI model first.")
      }
      const llmHelper = appState.processingHelper.getLLMHelper()
      const result = await llmHelper!.chatWithGemini(message)
      return result
    } catch (error: any) {
      console.error("Error in gemini-chat handler:", error)
      throw error
    }
  })

  /**
   * ----------------------------
   * LLM Model Management
   * ----------------------------
   */

  // Get current LLM provider (Gemini or Ollama) and model details
  ipcMain.handle("get-current-llm-config", async () => {
    try {
      if (!appState.processingHelper.isLLMHelperReady()) {
        // Return default config if not initialized
        return {
          provider: "gemini",
          model: "Not configured",
          isOllama: false
        }
      }
      
      const llmHelper = appState.processingHelper.getLLMHelper()
      return {
        provider: llmHelper!.getCurrentProvider(),
        model: llmHelper!.getCurrentModel(),
        isOllama: llmHelper!.isUsingOllama()
      }
    } catch (error: any) {
      console.error("Error getting current LLM config:", error)
      // Return safe default instead of throwing
      return {
        provider: "gemini",
        model: "Error getting config",
        isOllama: false
      }
    }
  })

  // Get list of available Ollama models installed locally
  ipcMain.handle("get-available-ollama-models", async () => {
    try {
      // For Ollama models, we can try to get them even if LLM helper isn't fully configured
      // This allows users to see available models before switching
      if (!appState.processingHelper.isLLMHelperReady()) {
        // Try to create a temporary Ollama connection to get models
        const { LLMHelper } = await import("./LLMHelper")
        const tempHelper = new LLMHelper(undefined, true, undefined, process.env.OLLAMA_URL || "http://localhost:11434")
        const models = await tempHelper.getOllamaModels()
        return models
      }
      
      const llmHelper = appState.processingHelper.getLLMHelper()
      const models = await llmHelper!.getOllamaModels()
      return models
    } catch (error: any) {
      console.error("Error getting Ollama models:", error)
      throw error
    }
  })

  // Switch LLM provider to Ollama with optional model and URL
  ipcMain.handle("switch-to-ollama", async (_, model?: string, url?: string) => {
    try {
      // Use the ProcessingHelper's reinitialize method
      appState.processingHelper.reinitializeLLMHelper(
        true, // useOllama = true
        undefined, // apiKey not needed for Ollama
        model,
        url
      )
      return { success: true }
    } catch (error: any) {
      console.error("Error switching to Ollama:", error)
      return { success: false, error: error.message }
    }
  })

  // Switch LLM provider to Google Gemini
  ipcMain.handle("switch-to-gemini", async (_, apiKey?: string) => {
    try {
      // Use the ProcessingHelper's reinitialize method
      appState.processingHelper.reinitializeLLMHelper(
        false, // useOllama = false
        apiKey
      )
      return { success: true }
    } catch (error: any) {
      console.error("Error switching to Gemini:", error)
      return { success: false, error: error.message }
    }
  })

  // Test current LLM connection (Ollama or Gemini)
  ipcMain.handle("test-llm-connection", async () => {
    try {
      if (!appState.processingHelper.isLLMHelperReady()) {
        return { success: false, error: "LLM Helper not configured. Please set up your AI model first." }
      }
      
      const llmHelper = appState.processingHelper.getLLMHelper()
      const result = await llmHelper!.testConnection()
      return result
    } catch (error: any) {
      console.error("Error testing LLM connection:", error)
      return { success: false, error: error.message }
    }
  })
}