import React, { useState, useEffect, useRef } from "react"
import { IoLogOutOutline } from "react-icons/io5"
import Logo from "../../public/TinkleLogo.png"

interface SolutionCommandsProps {
  extraScreenshots: any[]
  onTooltipVisibilityChange?: (visible: boolean, height: number) => void
}

const SolutionCommands: React.FC<SolutionCommandsProps> = ({
  extraScreenshots,
  onTooltipVisibilityChange
}) => {
  const [isHelpVisible, setIsHelpVisible] = useState(false)
  const helpRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (onTooltipVisibilityChange) {
      let helpHeight = 0
      if (helpRef.current && isHelpVisible) {
        helpHeight = helpRef.current.offsetHeight + 10
      }
      onTooltipVisibilityChange(isHelpVisible, helpHeight)
    }
  }, [isHelpVisible, onTooltipVisibilityChange])

  const handleHelpClick = () => {
    setIsHelpVisible(!isHelpVisible)
  }

  return (
    <div className="w-fit relative">
      <div className="text-xs text-white/90 liquid-glass-bar py-1 px-1 flex items-center justify-center gap-3 draggable-area">
          {/* Logo */}
          <div className="flex items-center">
            <button 
              className="py-1 no-drag"
              onClick={handleHelpClick}
              type="button"
            >
              <img 
                src={Logo} 
                alt="Tinkle Logo" 
                className="w-10 h-10" 
                draggable={false}
              />
            </button>
          </div>

          {/* Screenshot */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] leading-none">
              {extraScreenshots.length === 0
                ? "Screenshot your code"
                : "Screenshot"}
            </span>
            <div className="flex gap-1">
              <button className="bg-white/10 hover:bg-white/20 transition-colors rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70 no-drag">
                ⌘
              </button>
              <button className="bg-white/10 hover:bg-white/20 transition-colors rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70 no-drag">
                H
              </button>
            </div>
          </div>
          {extraScreenshots.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] leading-none">Debug</span>
              <div className="flex gap-1">
                <button className="bg-white/10 hover:bg-white/20 transition-colors rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70 no-drag">
                  ⌘
                </button>
                <button className="bg-white/10 hover:bg-white/20 transition-colors rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70 no-drag">
                  ↵
                </button>
              </div>
            </div>
          )}

          {/* Start Over */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] leading-none">Start over</span>
            <div className="flex gap-1">
              <button className="bg-white/10 hover:bg-white/20 transition-colors rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70 no-drag">
                ⌘
              </button>
              <button className="bg-white/10 hover:bg-white/20 transition-colors rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70 no-drag">
                R
              </button>
            </div>
          </div>


          {/* Separator */}
          <div className="mx-1 h-4 w-px bg-white/20 no-drag" />

          {/* Sign Out Button */}
          <button
            className="text-red-500/70 hover:text-red-500/90 transition-colors hover:cursor-pointer mr-3 no-drag"
            title="Sign Out"
            onClick={() => window.electronAPI.quitApp()}
            type="button"
          >
            <IoLogOutOutline className="w-4 h-4" />
          </button>
        </div>

      {/* Help Content Panel */}
      {isHelpVisible && (
        <div
          ref={helpRef}
          className="absolute top-full right-0 mt-2 w-auto z-50"
        >
          <div className="p-3 text-xs bg-black/90 backdrop-blur-md rounded-lg border border-white/10 text-white/90 shadow-2xl">
            <div className="space-y-4">
              <h3 className="font-medium">Keyboard Shortcuts</h3>
              <div className="space-y-3">
                {/* Toggle Command */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Toggle Window</span>
                    <div className="flex gap-1 flex-shrink-0">
                      <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                        ⌘
                      </span>
                      <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                        B
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] leading-relaxed text-white/70">
                    Show or hide this window.
                  </p>
                </div>
                {/* Screenshot Command */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Take Screenshot</span>
                    <div className="flex gap-1 flex-shrink-0">
                      <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                        ⌘
                      </span>
                      <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                        H
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] leading-relaxed text-white/70">
                    Capture additional parts of the question or your solution for debugging help. Up to 5 extra screenshots are saved.
                  </p>
                </div>
                {/* Debug Command */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Debug</span>
                    <div className="flex gap-1 flex-shrink-0">
                      <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                        ⌘
                      </span>
                      <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                        ↵
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] leading-relaxed text-white/70">
                    Generate new solutions based on all previous and newly added screenshots.
                  </p>
                </div>
                {/* Start Over Command */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Start Over</span>
                    <div className="flex gap-1 flex-shrink-0">
                      <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                        ⌘
                      </span>
                      <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] leading-none">
                        R
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] leading-relaxed text-white/70">
                    Start fresh with a new question.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SolutionCommands