// ProcessingHelper.ts
// This helper handles all "processing" tasks:
// - Screenshots (image → AI analysis)
// - Audio (file or base64 → transcription/understanding)
// - Debugging solutions with extra screenshots
// It works as a middle layer between AppState and the LLMHelper.

import { AppState } from "./main"
import { LLMHelper } from "./LLMHelper"
import dotenv from "dotenv"

dotenv.config()


export class ProcessingHelper {
  private appState: AppState
  private llmHelper: LLMHelper

  // Controllers allow cancelling ongoing AI requests (important if user cancels)
  private currentProcessingAbortController: AbortController | null = null
  private currentExtraProcessingAbortController: AbortController | null = null

  constructor(appState: AppState) {
    this.appState = appState
    
    /**
     * -------- Initialize AI Provider (LLM) --------
     * You can run either:
     *  - Ollama (local model, via USE_OLLAMA=true)
     *  - Gemini (cloud API, requires GEMINI_API_KEY)
     */
    const useOllama = process.env.USE_OLLAMA === "true"
    const ollamaModel = process.env.OLLAMA_MODEL // auto-detected if not provided
    const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434"
    
    if (useOllama) {
      console.log("[ProcessingHelper] Initializing with Ollama")
      this.llmHelper = new LLMHelper(undefined, true, ollamaModel, ollamaUrl)
    } else {
      const apiKey = process.env.GEMINI_API_KEY
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY not found. Either set GEMINI_API_KEY or enable Ollama with USE_OLLAMA=true")
      }
      console.log("[ProcessingHelper] Initializing with Gemini")
      this.llmHelper = new LLMHelper(apiKey, false)
    }
  }

  /**
   * -------- Process Screenshots & Audio --------
   * This is the main entry point for handling user-provided media.
   */
  public async processScreenshots(): Promise<void> {
    const mainWindow = this.appState.getMainWindow()
    if (!mainWindow) return

    const view = this.appState.getView()

    // ------------------------
    // 1. Normal "queue" mode
    // ------------------------
    if (view === "queue") {
      const screenshotQueue = this.appState.getScreenshotHelper().getScreenshotQueue()

      // If no screenshots → notify frontend
      if (screenshotQueue.length === 0) {
        mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.NO_SCREENSHOTS)
        return
      }

      // Get the last uploaded file (screenshot or audio)
      const allPaths = this.appState.getScreenshotHelper().getScreenshotQueue()
      const lastPath = allPaths[allPaths.length - 1]

      /**
       * ---- Case A: Audio file (.mp3/.wav) ----
       * Transcribe/understand audio using LLMHelper
       */
      if (lastPath.endsWith('.mp3') || lastPath.endsWith('.wav')) {
        mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.INITIAL_START)
        this.appState.setView('solutions')
        try {
          const audioResult = await this.llmHelper.analyzeAudioFile(lastPath)
          // Send transcription/understanding back to renderer
          mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.PROBLEM_EXTRACTED, audioResult)

          // Save into app state as "problem info"
          this.appState.setProblemInfo({
            problem_statement: audioResult.text,
            input_format: {},
            output_format: {},
            constraints: [],
            test_cases: []
          })
          return
        } catch (err: any) {
          console.error('Audio processing error:', err)
          mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR, err.message)
          return
        }
      }

      /**
       * ---- Case B: Screenshot/Image ----
       * Use vision model to extract text/problem from screenshot
       */
      mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.INITIAL_START)
      this.appState.setView("solutions")
      this.currentProcessingAbortController = new AbortController()

      try {
        const imageResult = await this.llmHelper.analyzeImageFile(lastPath)

        // Wrap result into "problemInfo" structure
        const problemInfo = {
          problem_statement: imageResult.text,
          input_format: { description: "Generated from screenshot", parameters: [] as any[] },
          output_format: { description: "Generated from screenshot", type: "string", subtype: "text" },
          complexity: { time: "N/A", space: "N/A" },
          test_cases: [] as any[],
          validation_type: "manual",
          difficulty: "custom"
        }

        // Send extracted problem back to renderer
        mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.PROBLEM_EXTRACTED, problemInfo)
        this.appState.setProblemInfo(problemInfo)
      } catch (error: any) {
        console.error("Image processing error:", error)
        mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR, error.message)
      } finally {
        this.currentProcessingAbortController = null
      }

      return
    }

    // ------------------------
    // 2. Debug Mode
    // ------------------------
    else {
      const extraScreenshotQueue = this.appState.getScreenshotHelper().getExtraScreenshotQueue()

      if (extraScreenshotQueue.length === 0) {
        console.log("No extra screenshots to process")
        mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.NO_SCREENSHOTS)
        return
      }

      // Start debugging workflow
      mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.DEBUG_START)
      this.currentExtraProcessingAbortController = new AbortController()

      try {
        // Retrieve stored problem info
        const problemInfo = this.appState.getProblemInfo()
        if (!problemInfo) throw new Error("No problem info available")

        // Generate solution for problem
        const currentSolution = await this.llmHelper.generateSolution(problemInfo)
        const currentCode = currentSolution.solution.code

        // Debug solution using extra screenshots
        const debugResult = await this.llmHelper.debugSolutionWithImages(
          problemInfo,
          currentCode,
          extraScreenshotQueue
        )

        this.appState.setHasDebugged(true)

        // Send result back to renderer
        mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.DEBUG_SUCCESS, debugResult)
      } catch (error: any) {
        console.error("Debug processing error:", error)
        mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.DEBUG_ERROR, error.message)
      } finally {
        this.currentExtraProcessingAbortController = null
      }
    }
  }

  /**
   * Cancel any ongoing AI requests
   */
  public cancelOngoingRequests(): void {
    if (this.currentProcessingAbortController) {
      this.currentProcessingAbortController.abort()
      this.currentProcessingAbortController = null
    }

    if (this.currentExtraProcessingAbortController) {
      this.currentExtraProcessingAbortController.abort()
      this.currentExtraProcessingAbortController = null
    }

    this.appState.setHasDebugged(false)
  }

  /**
   * Analyze audio directly from base64 string (e.g., microphone stream)
   */
  public async processAudioBase64(data: string, mimeType: string) {
    return this.llmHelper.analyzeAudioFromBase64(data, mimeType)
  }

  /**
   * Analyze audio directly from file path
   */
  public async processAudioFile(filePath: string) {
    return this.llmHelper.analyzeAudioFile(filePath)
  }

  /**
   * Expose LLM helper for direct usage elsewhere
   */
  public getLLMHelper() {
    return this.llmHelper
  }
}
