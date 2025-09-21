import { BrowserWindow, screen } from "electron"
import { AppState } from "main"
import path from "node:path"

// Check if we’re in development mode
const isDev = process.env.NODE_ENV === "development"

// Load either dev server or built index.html
const startUrl = isDev
  ? "http://localhost:5180"
  : `file://${path.join(__dirname, "../dist/index.html")}`

export class WindowHelper {
  private mainWindow: BrowserWindow | null = null
  private isWindowVisible: boolean = false
  private windowPosition: { x: number; y: number } | null = null
  private windowSize: { width: number; height: number } | null = null
  private appState: AppState

  // Screen info and movement tracking
  private screenWidth: number = 0
  private screenHeight: number = 0
  private step: number = 50 // 👈 step size for window movement (pixels per shortcut press)
  private currentX: number = 0
  private currentY: number = 0

  constructor(appState: AppState) {
    this.appState = appState
  }

  /**
   * Dynamically resize the window based on content dimensions.
   * Called when frontend updates content size.
   */
  public setWindowDimensions(width: number, height: number): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return

    // Current position
    const [currentX, currentY] = this.mainWindow.getPosition()

    // Get usable screen area
    const primaryDisplay = screen.getPrimaryDisplay()
    const workArea = primaryDisplay.workAreaSize

    // Allow bigger width if debugging happened (75%), otherwise 50%
    const maxAllowedWidth = Math.floor(
      workArea.width * (this.appState.getHasDebugged() ? 0.75 : 0.5)
    )

    // Adjust width/height safely
    const newWidth = Math.min(width + 32, maxAllowedWidth)
    const newHeight = Math.ceil(height)

    // Prevent window from going off screen horizontally
    const maxX = workArea.width - newWidth
    const newX = Math.min(Math.max(currentX, 0), maxX)

    // Apply new bounds
    this.mainWindow.setBounds({
      x: newX,
      y: currentY,
      width: newWidth,
      height: newHeight
    })

    // Save new position
    this.windowPosition = { x: newX, y: currentY }
    this.windowSize = { width: newWidth, height: newHeight }
    this.currentX = newX
  }

  /**
   * Create the main floating window.
   */
  public createWindow(): void {
    if (this.mainWindow !== null) return // already created

    // Screen size
    const primaryDisplay = screen.getPrimaryDisplay()
    const workArea = primaryDisplay.workAreaSize
    this.screenWidth = workArea.width
    this.screenHeight = workArea.height

    // Window configuration
    const windowSettings: Electron.BrowserWindowConstructorOptions = {
      width: 400,
      height: 600,
      minWidth: 300,
      minHeight: 200,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: true,
        preload: path.join(__dirname, "preload.js") // preload for secure API
      },
      show: false, // don’t show until ready
      alwaysOnTop: true,
      frame: false, // frameless
      transparent: true,
      fullscreenable: false,
      hasShadow: false,
      backgroundColor: "#00000000", // transparent bg
      focusable: true,
      resizable: true,
      movable: true,
      x: 100, // initial position
      y: 100
    }

    this.mainWindow = new BrowserWindow(windowSettings)
    this.mainWindow.setContentProtection(true) // block screenshots of the window itself

    // macOS tweaks
    if (process.platform === "darwin") {
      this.mainWindow.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true
      })
      this.mainWindow.setHiddenInMissionControl(true)
      this.mainWindow.setAlwaysOnTop(true, "floating")
    }

    // Linux tweaks
    if (process.platform === "linux") {
      if (this.mainWindow.setHasShadow) {
        this.mainWindow.setHasShadow(false)
      }
      this.mainWindow.setFocusable(true)
    }

    this.mainWindow.setSkipTaskbar(true) // hide from dock/taskbar
    this.mainWindow.setAlwaysOnTop(true)

    // Load UI (dev server or built app)
    this.mainWindow.loadURL(startUrl).catch((err) => {
      console.error("Failed to load URL:", err)
    })

    // Show once ready and center
    this.mainWindow.once("ready-to-show", () => {
      if (this.mainWindow) {
        this.centerWindow()
        this.mainWindow.show()
        this.mainWindow.focus()
        this.mainWindow.setAlwaysOnTop(true)
        console.log("Window is now visible and centered")
      }
    })

    // Track initial bounds
    const bounds = this.mainWindow.getBounds()
    this.windowPosition = { x: bounds.x, y: bounds.y }
    this.windowSize = { width: bounds.width, height: bounds.height }
    this.currentX = bounds.x
    this.currentY = bounds.y

    // Setup listeners
    this.setupWindowListeners()
    this.isWindowVisible = true
  }

  /**
   * Add listeners for move/resize/close.
   */
  private setupWindowListeners(): void {
    if (!this.mainWindow) return

    this.mainWindow.on("move", () => {
      if (this.mainWindow) {
        const bounds = this.mainWindow.getBounds()
        this.windowPosition = { x: bounds.x, y: bounds.y }
        this.currentX = bounds.x
        this.currentY = bounds.y
      }
    })

    this.mainWindow.on("resize", () => {
      if (this.mainWindow) {
        const bounds = this.mainWindow.getBounds()
        this.windowSize = { width: bounds.width, height: bounds.height }
      }
    })

    this.mainWindow.on("closed", () => {
      this.mainWindow = null
      this.isWindowVisible = false
      this.windowPosition = null
      this.windowSize = null
    })
  }

  /** Get current main window instance */
  public getMainWindow(): BrowserWindow | null {
    return this.mainWindow
  }

  /** Is window visible? */
  public isVisible(): boolean {
    return this.isWindowVisible
  }

  /** Hide and store last position/size */
  public hideMainWindow(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      console.warn("Main window does not exist or is destroyed.")
      return
    }

    const bounds = this.mainWindow.getBounds()
    this.windowPosition = { x: bounds.x, y: bounds.y }
    this.windowSize = { width: bounds.width, height: bounds.height }
    this.mainWindow.hide()
    this.isWindowVisible = false
  }

  /** Show at last position/size */
  public showMainWindow(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      console.warn("Main window does not exist or is destroyed.")
      return
    }

    if (this.windowPosition && this.windowSize) {
      this.mainWindow.setBounds({
        x: this.windowPosition.x,
        y: this.windowPosition.y,
        width: this.windowSize.width,
        height: this.windowSize.height
      })
    }

    this.mainWindow.showInactive()
    this.isWindowVisible = true
  }

  /** Toggle window visibility */
  public toggleMainWindow(): void {
    if (this.isWindowVisible) {
      this.hideMainWindow()
    } else {
      this.showMainWindow()
    }
  }

  /** Center window on primary display */
  private centerWindow(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return

    const primaryDisplay = screen.getPrimaryDisplay()
    const workArea = primaryDisplay.workAreaSize

    const windowBounds = this.mainWindow.getBounds()
    const windowWidth = windowBounds.width || 400
    const windowHeight = windowBounds.height || 600

    const centerX = Math.floor((workArea.width - windowWidth) / 2)
    const centerY = Math.floor((workArea.height - windowHeight) / 2)

    this.mainWindow.setBounds({
      x: centerX,
      y: centerY,
      width: windowWidth,
      height: windowHeight
    })

    this.windowPosition = { x: centerX, y: centerY }
    this.windowSize = { width: windowWidth, height: windowHeight }
    this.currentX = centerX
    this.currentY = centerY
  }

  /** Center and show the window */
  public centerAndShowWindow(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      console.warn("Main window does not exist or is destroyed.")
      return
    }

    this.centerWindow()
    this.mainWindow.show()
    this.mainWindow.focus()
    this.mainWindow.setAlwaysOnTop(true)
    this.isWindowVisible = true

    console.log(`Window centered and shown`)
  }

  // --- Window Movement Methods (triggered by keyboard shortcuts) ---

  public moveWindowRight(): void {
    if (!this.mainWindow) return

    const windowWidth = this.windowSize?.width || 0
    const halfWidth = windowWidth / 2

    this.currentX = Number(this.currentX) || 0
    this.currentY = Number(this.currentY) || 0

    this.currentX = Math.min(this.screenWidth - halfWidth, this.currentX + this.step)
    this.mainWindow.setPosition(Math.round(this.currentX), Math.round(this.currentY))
  }

  public moveWindowLeft(): void {
    if (!this.mainWindow) return

    const windowWidth = this.windowSize?.width || 0
    const halfWidth = windowWidth / 2

    this.currentX = Number(this.currentX) || 0
    this.currentY = Number(this.currentY) || 0

    this.currentX = Math.max(-halfWidth, this.currentX - this.step)
    this.mainWindow.setPosition(Math.round(this.currentX), Math.round(this.currentY))
  }

  public moveWindowDown(): void {
    if (!this.mainWindow) return

    const windowHeight = this.windowSize?.height || 0
    const halfHeight = windowHeight / 2

    this.currentX = Number(this.currentX) || 0
    this.currentY = Number(this.currentY) || 0

    this.currentY = Math.min(this.screenHeight - halfHeight, this.currentY + this.step)
    this.mainWindow.setPosition(Math.round(this.currentX), Math.round(this.currentY))
  }

  public moveWindowUp(): void {
    if (!this.mainWindow) return

    const windowHeight = this.windowSize?.height || 0
    const halfHeight = windowHeight / 2

    this.currentX = Number(this.currentX) || 0
    this.currentY = Number(this.currentY) || 0

    this.currentY = Math.max(-halfHeight, this.currentY - this.step)
    this.mainWindow.setPosition(Math.round(this.currentX), Math.round(this.currentY))
  }
}
