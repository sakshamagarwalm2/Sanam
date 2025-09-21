// preload.ts
// This file runs in the Electron preload process.
// Its job: safely expose selected backend (Electron) APIs to the frontend (React app)
// through `window.electronAPI`. This prevents exposing Node.js internals directly in the renderer.

// Import required Electron modules
import { contextBridge, ipcRenderer } from "electron"

// ------------------------------
// Type definitions for ElectronAPI
// ------------------------------
interface ElectronAPI {
  // Window dimension updates
  updateContentDimensions: (dimensions: { width: number; height: number }) => Promise<void>

  // Screenshot management
  getScreenshots: () => Promise<Array<{ path: string; preview: string }>>
  deleteScreenshot: (path: string) => Promise<{ success: boolean; error?: string }>
  takeScreenshot: () => Promise<void>

  // Screenshot-related events
  onScreenshotTaken: (callback: (data: { path: string; preview: string }) => void) => () => void

  // Solution generation events
  onSolutionsReady: (callback: (solutions: string) => void) => () => void
  onResetView: (callback: () => void) => () => void
  onSolutionStart: (callback: () => void) => () => void
  onSolutionError: (callback: (error: string) => void) => () => void
  onSolutionSuccess: (callback: (data: any) => void) => () => void
  onProblemExtracted: (callback: (data: any) => void) => () => void

  // Debugging events
  onDebugStart: (callback: () => void) => () => void
  onDebugSuccess: (callback: (data: any) => void) => () => void
  onDebugError: (callback: (error: string) => void) => () => void

  // Processing states
  onProcessingNoScreenshots: (callback: () => void) => () => void
  onUnauthorized: (callback: () => void) => () => void

  // Window controls
  moveWindowLeft: () => Promise<void>
  moveWindowRight: () => Promise<void>
  moveWindowUp: () => Promise<void>
  moveWindowDown: () => Promise<void>

  // AI analysis
  analyzeAudioFromBase64: (data: string, mimeType: string) => Promise<{ text: string; timestamp: number }>
  analyzeAudioFile: (path: string) => Promise<{ text: string; timestamp: number }>
  analyzeImageFile: (path: string) => Promise<void>

  // App management
  quitApp: () => Promise<void>

  // LLM (AI model) management
  getCurrentLlmConfig: () => Promise<{ provider: "ollama" | "gemini"; model: string; isOllama: boolean }>
  getAvailableOllamaModels: () => Promise<string[]>
  switchToOllama: (model?: string, url?: string) => Promise<{ success: boolean; error?: string }>
  switchToGemini: (apiKey?: string) => Promise<{ success: boolean; error?: string }>
  testLlmConnection: () => Promise<{ success: boolean; error?: string }>

  // Generic IPC invoke
  invoke: (channel: string, ...args: any[]) => Promise<any>
}

// ------------------------------
// Processing Event Constants
// ------------------------------
export const PROCESSING_EVENTS = {
  // Global states
  UNAUTHORIZED: "procesing-unauthorized",
  NO_SCREENSHOTS: "processing-no-screenshots",

  // Initial solution states
  INITIAL_START: "initial-start",
  PROBLEM_EXTRACTED: "problem-extracted",
  SOLUTION_SUCCESS: "solution-success",
  INITIAL_SOLUTION_ERROR: "solution-error",

  // Debugging states
  DEBUG_START: "debug-start",
  DEBUG_SUCCESS: "debug-success",
  DEBUG_ERROR: "debug-error"
} as const

// ------------------------------
// Exposing Electron API
// ------------------------------
contextBridge.exposeInMainWorld("electronAPI", {
  /**
   * -------- Window Dimension Controls --------
   */
  updateContentDimensions: (dimensions: { width: number; height: number }) =>
    ipcRenderer.invoke("update-content-dimensions", dimensions),

  /**
   * -------- Screenshot Management --------
   */
  takeScreenshot: () => ipcRenderer.invoke("take-screenshot"),
  getScreenshots: () => ipcRenderer.invoke("get-screenshots"),
  deleteScreenshot: (path: string) => ipcRenderer.invoke("delete-screenshot", path),

  /**
   * -------- Screenshot & Solution Events --------
   */
  // Fired when a new screenshot has been taken
  onScreenshotTaken: (callback: (data: { path: string; preview: string }) => void) => {
    const subscription = (_: any, data: { path: string; preview: string }) => callback(data)
    ipcRenderer.on("screenshot-taken", subscription)
    return () => ipcRenderer.removeListener("screenshot-taken", subscription)
  },

  // Fired when AI-generated solutions are ready
  onSolutionsReady: (callback: (solutions: string) => void) => {
    const subscription = (_: any, solutions: string) => callback(solutions)
    ipcRenderer.on("solutions-ready", subscription)
    return () => ipcRenderer.removeListener("solutions-ready", subscription)
  },

  // Resets the UI (e.g., after clearing queues)
  onResetView: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on("reset-view", subscription)
    return () => ipcRenderer.removeListener("reset-view", subscription)
  },

  // Initial solution processing started
  onSolutionStart: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on(PROCESSING_EVENTS.INITIAL_START, subscription)
    return () => ipcRenderer.removeListener(PROCESSING_EVENTS.INITIAL_START, subscription)
  },

  // Debugging started
  onDebugStart: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on(PROCESSING_EVENTS.DEBUG_START, subscription)
    return () => ipcRenderer.removeListener(PROCESSING_EVENTS.DEBUG_START, subscription)
  },

  // Debugging finished successfully
  onDebugSuccess: (callback: (data: any) => void) => {
    ipcRenderer.on("debug-success", (_event, data) => callback(data))
    return () => ipcRenderer.removeListener("debug-success", (_event, data) => callback(data))
  },

  // Debugging failed
  onDebugError: (callback: (error: string) => void) => {
    const subscription = (_: any, error: string) => callback(error)
    ipcRenderer.on(PROCESSING_EVENTS.DEBUG_ERROR, subscription)
    return () => ipcRenderer.removeListener(PROCESSING_EVENTS.DEBUG_ERROR, subscription)
  },

  // Initial solution failed
  onSolutionError: (callback: (error: string) => void) => {
    const subscription = (_: any, error: string) => callback(error)
    ipcRenderer.on(PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR, subscription)
    return () => ipcRenderer.removeListener(PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR, subscription)
  },

  // Triggered when no screenshots exist to process
  onProcessingNoScreenshots: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on(PROCESSING_EVENTS.NO_SCREENSHOTS, subscription)
    return () => ipcRenderer.removeListener(PROCESSING_EVENTS.NO_SCREENSHOTS, subscription)
  },

  // Problem extracted from screenshots/images
  onProblemExtracted: (callback: (data: any) => void) => {
    const subscription = (_: any, data: any) => callback(data)
    ipcRenderer.on(PROCESSING_EVENTS.PROBLEM_EXTRACTED, subscription)
    return () => ipcRenderer.removeListener(PROCESSING_EVENTS.PROBLEM_EXTRACTED, subscription)
  },

  // Solution generated successfully
  onSolutionSuccess: (callback: (data: any) => void) => {
    const subscription = (_: any, data: any) => callback(data)
    ipcRenderer.on(PROCESSING_EVENTS.SOLUTION_SUCCESS, subscription)
    return () => ipcRenderer.removeListener(PROCESSING_EVENTS.SOLUTION_SUCCESS, subscription)
  },

  // Unauthorized access (e.g., missing API key)
  onUnauthorized: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on(PROCESSING_EVENTS.UNAUTHORIZED, subscription)
    return () => ipcRenderer.removeListener(PROCESSING_EVENTS.UNAUTHORIZED, subscription)
  },

  /**
   * -------- Window Movement --------
   */
  moveWindowLeft: () => ipcRenderer.invoke("move-window-left"),
  moveWindowRight: () => ipcRenderer.invoke("move-window-right"),
  moveWindowUp: () => ipcRenderer.invoke("move-window-up"),
  moveWindowDown: () => ipcRenderer.invoke("move-window-down"),

  /**
   * -------- AI Analysis (Audio & Images) --------
   */
  analyzeAudioFromBase64: (data: string, mimeType: string) =>
    ipcRenderer.invoke("analyze-audio-base64", data, mimeType),
  analyzeAudioFile: (path: string) => ipcRenderer.invoke("analyze-audio-file", path),
  analyzeImageFile: (path: string) => ipcRenderer.invoke("analyze-image-file", path),

  /**
   * -------- App Control --------
   */
  quitApp: () => ipcRenderer.invoke("quit-app"),

  /**
   * -------- LLM Model Management --------
   */
  getCurrentLlmConfig: () => ipcRenderer.invoke("get-current-llm-config"),
  getAvailableOllamaModels: () => ipcRenderer.invoke("get-available-ollama-models"),
  switchToOllama: (model?: string, url?: string) => ipcRenderer.invoke("switch-to-ollama", model, url),
  switchToGemini: (apiKey?: string) => ipcRenderer.invoke("switch-to-gemini", apiKey),
  testLlmConnection: () => ipcRenderer.invoke("test-llm-connection"),

  /**
   * -------- Generic IPC --------
   */
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args)
} as ElectronAPI)
