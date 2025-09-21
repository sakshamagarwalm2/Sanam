// LLMHelper.ts
// This class is the "brain" of Tinkle. It connects to either:
//   - Google Gemini API (cloud, requires API key)
//   - Ollama API (local, self-hosted models like LLaMA, Mistral, Gemma)
// It handles generating solutions, analyzing screenshots, audio, images, and general chat.

// Imports
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai"
import fs from "fs"

// Ollama API response structure
interface OllamaResponse {
  response: string
  done: boolean
}

export class LLMHelper {
  private model: GenerativeModel | null = null // Gemini model instance (if using Gemini)
  
  // System-level prompt given to all models.
  // It ensures the assistant behaves as "Tinkle AI" — proactive, clear, gives reasoning, and multiple options.
  // Updated to emphasize providing proper, well-structured answers; prioritize code solutions for problem-solving (default to Python for coding tasks);
  // ensure code is complete, fully functional, and well-formatted; if responses or code are incomplete or poorly structured, refine them for clarity and completeness.
  private readonly systemPrompt = `You are Tinkle AI, a helpful, proactive assistant for any kind of problem or situation (not just coding). For any user input, analyze the situation thoroughly, provide a clear problem statement, relevant context, and suggest several possible responses or actions the user could take next. Always explain your reasoning step-by-step. Present your suggestions as a numbered list of options or next steps for clarity. 

When the query involves problem-solving, especially coding or technical issues, prioritize finding and providing code-based solutions. By default, use Python for any coding tasks unless specified otherwise. Ensure all code provided is complete, fully functional, well-commented, properly indented, and tested for correctness in your reasoning. If a response or code snippet appears incomplete, poorly formatted, or unclear, refine it to make it professional, readable, and comprehensive—include full imports, functions, and explanations. Always output code in a well-structured format, such as within markdown code blocks if appropriate, and verify it addresses the problem accurately. For non-coding queries, ensure responses are concise, actionable, and properly formatted.`

  private useOllama: boolean = false     // Tracks whether we're using Ollama or Gemini
  private ollamaModel: string = "llama3.2" // Default Ollama model
  private ollamaUrl: string = "http://localhost:11434" // Default Ollama server URL

  constructor(apiKey?: string, useOllama: boolean = false, ollamaModel?: string, ollamaUrl?: string) {
    this.useOllama = useOllama
    
    if (useOllama) {
      // If Ollama mode enabled
      this.ollamaUrl = ollamaUrl || "http://localhost:11434"
      this.ollamaModel = ollamaModel || "gemma:latest" // Default fallback
      console.log(`[LLMHelper] Using Ollama with model: ${this.ollamaModel}`)
      
      // Check and initialize Ollama model
      this.initializeOllamaModel()
    } else if (apiKey) {
      // If Gemini mode enabled
      const genAI = new GoogleGenerativeAI(apiKey)
      this.model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
      console.log("[LLMHelper] Using Google Gemini")
    } else {
      // If neither configured
      throw new Error("Either provide Gemini API key or enable Ollama mode")
    }
  }

  /**
   * ----------------------------
   * Utility Helpers
   * ----------------------------
   */

  // Converts an image file into a generative part (base64 + mimeType) for LLM input
  private async fileToGenerativePart(imagePath: string) {
    const imageData = await fs.promises.readFile(imagePath)
    return {
      inlineData: {
        data: imageData.toString("base64"),
        mimeType: "image/png"
      }
    }
  }

  // Cleans up Gemini’s JSON responses (removes markdown formatting if present)
  private cleanJsonResponse(text: string): string {
    text = text.replace(/^```(?:json)?\n/, '').replace(/\n```$/, '')
    return text.trim()
  }

  /**
   * ----------------------------
   * Ollama API Helpers
   * ----------------------------
   */

  // Calls the Ollama API with a text prompt
  private async callOllama(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.ollamaModel,
          prompt,
          stream: false,
          options: { temperature: 0.7, top_p: 0.9 }
        }),
      })

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
      }

      const data: OllamaResponse = await response.json()
      return data.response
    } catch (error) {
      console.error("[LLMHelper] Error calling Ollama:", error)
      throw new Error(`Failed to connect to Ollama: ${error.message}. Make sure Ollama is running on ${this.ollamaUrl}`)
    }
  }

  // Checks if Ollama server is running and available
  private async checkOllamaAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/tags`)
      return response.ok
    } catch {
      return false
    }
  }

  // Initializes Ollama by checking models and setting a working one
  private async initializeOllamaModel(): Promise<void> {
    try {
      const availableModels = await this.getOllamaModels()
      if (availableModels.length === 0) {
        console.warn("[LLMHelper] No Ollama models found")
        return
      }

      // If selected model not available → auto-switch to first available
      if (!availableModels.includes(this.ollamaModel)) {
        this.ollamaModel = availableModels[0]
        console.log(`[LLMHelper] Auto-selected first available model: ${this.ollamaModel}`)
      }

      // Test by sending a simple "Hello"
      const testResult = await this.callOllama("Hello")
      console.log(`[LLMHelper] Successfully initialized with model: ${this.ollamaModel}`)
    } catch (error) {
      console.error(`[LLMHelper] Failed to initialize Ollama model: ${error.message}`)
      // Fallback attempt: use first model available
      try {
        const models = await this.getOllamaModels()
        if (models.length > 0) {
          this.ollamaModel = models[0]
          console.log(`[LLMHelper] Fallback to: ${this.ollamaModel}`)
        }
      } catch (fallbackError) {
        console.error(`[LLMHelper] Fallback also failed: ${fallbackError.message}`)
      }
    }
  }

  /**
   * ----------------------------
   * Problem & Solution Extraction
   * ----------------------------
   */

  // Extracts a problem statement from one or more screenshots/images
  public async extractProblemFromImages(imagePaths: string[]) {
    try {
      const imageParts = await Promise.all(imagePaths.map(path => this.fileToGenerativePart(path)))
      
      const prompt = `${this.systemPrompt}\n\nYou are a Tinkle ai. Please analyze these images and extract the following information in JSON format:\n{
  "problem_statement": "...",
  "context": "...",
  "suggested_responses": ["..."],
  "reasoning": "..."
}\nReturn ONLY the JSON object.`

      const result = await this.model.generateContent([prompt, ...imageParts])
      const response = await result.response
      const text = this.cleanJsonResponse(response.text())
      return JSON.parse(text)
    } catch (error) {
      console.error("Error extracting problem from images:", error)
      throw error
    }
  }

  // Generates a structured solution given a problem description
  public async generateSolution(problemInfo: any) {
    const prompt = `${this.systemPrompt}\n\nGiven this problem:\n${JSON.stringify(problemInfo, null, 2)}\n\nProvide response in JSON:\n{
  "solution": {
    "code": "...",
    "problem_statement": "...",
    "context": "...",
    "suggested_responses": ["..."],
    "reasoning": "..."
  }
}`

    console.log("[LLMHelper] Calling Gemini LLM for solution...")
    try {
      const result = await this.model.generateContent(prompt)
      const response = await result.response
      const text = this.cleanJsonResponse(response.text())
      const parsed = JSON.parse(text)
      console.log("[LLMHelper] Parsed LLM response:", parsed)
      return parsed
    } catch (error) {
      console.error("[LLMHelper] Error in generateSolution:", error)
      throw error
    }
  }

  // Debugging workflow: analyze additional debug screenshots + current code
  public async debugSolutionWithImages(problemInfo: any, currentCode: string, debugImagePaths: string[]) {
    try {
      const imageParts = await Promise.all(debugImagePaths.map(path => this.fileToGenerativePart(path)))
      
      const prompt = `${this.systemPrompt}\n\nYou are a Tinkle. Given:\n1. Problem: ${JSON.stringify(problemInfo, null, 2)}\n2. Current Code: ${currentCode}\n3. Debug images provided\n\nProvide feedback in JSON format.`

      const result = await this.model.generateContent([prompt, ...imageParts])
      const response = await result.response
      const text = this.cleanJsonResponse(response.text())
      const parsed = JSON.parse(text)
      console.log("[LLMHelper] Parsed debug LLM response:", parsed)
      return parsed
    } catch (error) {
      console.error("Error debugging solution with images:", error)
      throw error
    }
  }

  /**
   * ----------------------------
   * Audio & Image Analysis
   * ----------------------------
   */

  // Analyze audio file from disk (mp3)
  public async analyzeAudioFile(audioPath: string) {
    try {
      const audioData = await fs.promises.readFile(audioPath)
      const audioPart = {
        inlineData: {
          data: audioData.toString("base64"),
          mimeType: "audio/mp3"
        }
      }
      const prompt = `${this.systemPrompt}\n\nDescribe this audio clip concisely and suggest possible actions.`

      const result = await this.model.generateContent([prompt, audioPart])
      const response = await result.response
      return { text: response.text(), timestamp: Date.now() }
    } catch (error) {
      console.error("Error analyzing audio file:", error)
      throw error
    }
  }

  // Analyze audio given directly as base64 string
  public async analyzeAudioFromBase64(data: string, mimeType: string) {
    try {
      const audioPart = { inlineData: { data, mimeType } }
      const prompt = `${this.systemPrompt}\n\nDescribe this audio clip concisely and suggest possible actions.`

      const result = await this.model.generateContent([prompt, audioPart])
      const response = await result.response
      return { text: response.text(), timestamp: Date.now() }
    } catch (error) {
      console.error("Error analyzing audio from base64:", error)
      throw error
    }
  }

  // Analyze image file from disk
  public async analyzeImageFile(imagePath: string) {
    try {
      const imageData = await fs.promises.readFile(imagePath)
      const imagePart = {
        inlineData: {
          data: imageData.toString("base64"),
          mimeType: "image/png"
        }
      }
      const prompt = `${this.systemPrompt}\n\nDescribe this image concisely and suggest possible actions.`

      const result = await this.model.generateContent([prompt, imagePart])
      const response = await result.response
      return { text: response.text(), timestamp: Date.now() }
    } catch (error) {
      console.error("Error analyzing image file:", error)
      throw error
    }
  }

  /**
   * ----------------------------
   * Chat (General Q&A)
   * ----------------------------
   */

  // General chat with Gemini or Ollama
  public async chatWithGemini(message: string): Promise<string> {
    try {
      if (this.useOllama) {
        return this.callOllama(message)
      } else if (this.model) {
        const result = await this.model.generateContent(message)
        const response = await result.response
        return response.text()
      } else {
        throw new Error("No LLM provider configured")
      }
    } catch (error) {
      console.error("[LLMHelper] Error in chatWithGemini:", error)
      throw error
    }
  }

  public async chat(message: string): Promise<string> {
    return this.chatWithGemini(message)
  }

  /**
   * ----------------------------
   * Model Management
   * ----------------------------
   */

  // Returns whether Ollama is in use
  public isUsingOllama(): boolean { return this.useOllama }

  // Fetch available Ollama models from server
  public async getOllamaModels(): Promise<string[]> {
    if (!this.useOllama) return []
    try {
      const response = await fetch(`${this.ollamaUrl}/api/tags`)
      if (!response.ok) throw new Error('Failed to fetch models')
      const data = await response.json()
      return data.models?.map((model: any) => model.name) || []
    } catch (error) {
      console.error("[LLMHelper] Error fetching Ollama models:", error)
      return []
    }
  }

  // Get provider type ("ollama" or "gemini")
  public getCurrentProvider(): "ollama" | "gemini" {
    return this.useOllama ? "ollama" : "gemini"
  }

  // Get current active model name
  public getCurrentModel(): string {
    return this.useOllama ? this.ollamaModel : "gemini-2.0-flash"
  }

  // Switch to Ollama
  public async switchToOllama(model?: string, url?: string): Promise<void> {
    this.useOllama = true
    if (url) this.ollamaUrl = url
    if (model) {
      this.ollamaModel = model
    } else {
      await this.initializeOllamaModel()
    }
    console.log(`[LLMHelper] Switched to Ollama: ${this.ollamaModel} at ${this.ollamaUrl}`)
  }

  // Switch to Gemini
  public async switchToGemini(apiKey?: string): Promise<void> {
    if (apiKey) {
      const genAI = new GoogleGenerativeAI(apiKey)
      this.model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
    }
    if (!this.model && !apiKey) {
      throw new Error("No Gemini API key provided and no existing model instance")
    }
    this.useOllama = false
    console.log("[LLMHelper] Switched to Gemini")
  }

  // Test connection to the current LLM provider
  public async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.useOllama) {
        const available = await this.checkOllamaAvailable()
        if (!available) {
          return { success: false, error: `Ollama not available at ${this.ollamaUrl}` }
        }
        await this.callOllama("Hello")
        return { success: true }
      } else {
        if (!this.model) {
          return { success: false, error: "No Gemini model configured" }
        }
        const result = await this.model.generateContent("Hello")
        const response = await result.response
        const text = response.text()
        return text ? { success: true } : { success: false, error: "Empty response from Gemini" }
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}