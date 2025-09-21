import { globalShortcut, app } from "electron"
import { AppState } from "./main" // Adjust the import path if necessary

// 🔑 Shortcut Key Constants (easy to update here in future)
const SHORTCUT_SHOW_CENTER = "CommandOrControl+Shift+Space"
const SHORTCUT_SCREENSHOT = "CommandOrControl+H"
const SHORTCUT_PROCESS = "CommandOrControl+Enter"
const SHORTCUT_RESET = "CommandOrControl+R"
const SHORTCUT_MOVE_LEFT = "CommandOrControl+Left"
const SHORTCUT_MOVE_RIGHT = "CommandOrControl+Right"
const SHORTCUT_MOVE_UP = "CommandOrControl+Up"
const SHORTCUT_MOVE_DOWN = "CommandOrControl+Down"
const SHORTCUT_TOGGLE_WINDOW = "CommandOrControl+B"

export class ShortcutsHelper {
  private appState: AppState

  constructor(appState: AppState) {
    this.appState = appState
  }

  /**
   * Register all global shortcuts for the app.
   * These shortcuts work system-wide, not just inside the app window.
   */
  public registerGlobalShortcuts(): void {
    // --- Show/Center the app window ---
    globalShortcut.register(SHORTCUT_SHOW_CENTER, () => {
      console.log("Show/Center window shortcut pressed...")
      this.appState.centerAndShowWindow()
    })

    // --- Take a screenshot and send preview to renderer ---
    globalShortcut.register(SHORTCUT_SCREENSHOT, async () => {
      const mainWindow = this.appState.getMainWindow()
      if (mainWindow) {
        console.log("Taking screenshot...")
        try {
          const screenshotPath = await this.appState.takeScreenshot()
          const preview = await this.appState.getImagePreview(screenshotPath)

          // Notify renderer (UI) that a screenshot was taken
          mainWindow.webContents.send("screenshot-taken", {
            path: screenshotPath,
            preview
          })
        } catch (error) {
          console.error("Error capturing screenshot:", error)
        }
      }
    })

    // --- Process screenshots/audio (send to AI) ---
    globalShortcut.register(SHORTCUT_PROCESS, async () => {
      console.log("Processing screenshots/audio...")
      await this.appState.processingHelper.processScreenshots()
    })

    // --- Reset queues and cancel processing ---
    globalShortcut.register(SHORTCUT_RESET, () => {
      console.log("Reset shortcut pressed. Canceling requests and resetting queues...")

      // Cancel ongoing AI requests
      this.appState.processingHelper.cancelOngoingRequests()

      // Clear all screenshot/audio queues
      this.appState.clearQueues()
      console.log("Cleared queues.")

      // Switch UI back to 'queue' view
      this.appState.setView("queue")

      // Notify renderer to reset view
      const mainWindow = this.appState.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("reset-view")
      }
    })

    // --- Window movement controls ---
    globalShortcut.register(SHORTCUT_MOVE_LEFT, () => {
      console.log("Move window left")
      this.appState.moveWindowLeft()
    })

    globalShortcut.register(SHORTCUT_MOVE_RIGHT, () => {
      console.log("Move window right")
      this.appState.moveWindowRight()
    })

    globalShortcut.register(SHORTCUT_MOVE_DOWN, () => {
      console.log("Move window down")
      this.appState.moveWindowDown()
    })

    globalShortcut.register(SHORTCUT_MOVE_UP, () => {
      console.log("Move window up")
      this.appState.moveWindowUp()
    })

    // --- Toggle window visibility (show/hide app) ---
    globalShortcut.register(SHORTCUT_TOGGLE_WINDOW, () => {
      this.appState.toggleMainWindow()

      // If showing on macOS, bring to front
      const mainWindow = this.appState.getMainWindow()
      if (mainWindow && !this.appState.isVisible()) {
        if (process.platform === "darwin") {
          mainWindow.setAlwaysOnTop(true, "normal")
          // Reset alwaysOnTop after a short delay
          setTimeout(() => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.setAlwaysOnTop(true, "floating")
            }
          }, 100)
        }
      }
    })

    // --- Cleanup all shortcuts when app quits ---
    app.on("will-quit", () => {
      globalShortcut.unregisterAll()
    })
  }
}
