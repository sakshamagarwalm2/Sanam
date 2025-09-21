import React, { useState, useEffect, useRef } from "react";
import { IoLogOutOutline } from "react-icons/io5";
import Logo from "../../public/TinkleLogo.png";
import { AudioWaveform, Cpu, MessageCircleDashed, Play } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";

interface QueueCommandsProps {
  onTooltipVisibilityChange: (visible: boolean, height: number) => void;
  screenshots: Array<{ path: string; preview: string }>;
  onChatToggle: () => void;
  onSettingsToggle: () => void;
}

const QueueCommands: React.FC<QueueCommandsProps> = ({
  onTooltipVisibilityChange,
  screenshots,
  onChatToggle,
  onSettingsToggle,
}) => {
  const [isHelpVisible, setIsHelpVisible] = useState(false);
  const helpRef = useRef<HTMLDivElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [audioResult, setAudioResult] = useState<string | null>(null);
  const chunks = useRef<Blob[]>([]);

  useEffect(() => {
    let helpHeight = 0;
    if (helpRef.current && isHelpVisible) {
      helpHeight = helpRef.current.offsetHeight + 10;
    }
    onTooltipVisibilityChange(isHelpVisible, helpHeight);
  }, [isHelpVisible]);

  const handleHelpClick = () => {
    setIsHelpVisible(!isHelpVisible);
  };

  const handleRecordClick = async () => {
    if (!isRecording) {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (e) => chunks.current.push(e.data);
        recorder.onstop = async () => {
          const blob = new Blob(chunks.current, {
            type: chunks.current[0]?.type || "audio/webm",
          });
          chunks.current = [];
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Data = (reader.result as string).split(",")[1];
            try {
              const result = await window.electronAPI.analyzeAudioFromBase64(
                base64Data,
                blob.type
              );
              setAudioResult(result.text);
            } catch (err) {
              setAudioResult("Audio analysis failed.");
            }
          };
          reader.readAsDataURL(blob);
        };
        setMediaRecorder(recorder);
        recorder.start();
        setIsRecording(true);
      } catch (err) {
        setAudioResult("Could not start recording.");
      }
    } else {
      // Stop recording
      mediaRecorder?.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const clearAudioResult = () => {
    setAudioResult(null);
  };

  return (
    <div className="w-fit relative">
      <div className="text-xs text-white/90 liquid-glass-bar py-1 px-1 flex items-center justify-center gap-3 draggable-area">
        <div className="flex items-center">
          {/* Logo */}
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

        {/* Solve Command */}
        {screenshots.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] leading-none">Solve</span>
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

        {/* Voice Recording Button */}
        <div className="flex items-center gap-2">
          <button
            className={`bg-white/10 hover:bg-white/20 transition-colors rounded-md px-2 text-[11px] leading-none text-white/70 flex items-center gap-1 no-drag ${
              isRecording ? "bg-red-500/70 hover:bg-red-500/90" : ""
            }`}
            onClick={handleRecordClick}
            type="button"
          >
            {isRecording ? (
              <span className="animate-pulse text-emerald-400 flex justify-center items-center gap-1">
                <AudioWaveform className="w-3" />
                Stop Recording
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1">
                <Play className="w-3" />
                Listen
              </span>
            )}
          </button>
        </div>

        {/* Chat Button */}
        <div className="flex items-center justify-center gap-2">
          <button
            className="bg-white/10 hover:bg-white/20 transition-colors rounded-md px-2 text-[11px] leading-none text-white/70 flex items-center gap-1 no-drag"
            onClick={onChatToggle}
            type="button"
          >
            <MessageCircleDashed className="w-3" />
            Ask
          </button>
        </div>

        {/* Settings Button */}
        <div className="flex items-center gap-2">
          <button
            className="bg-white/10 hover:bg-white/20 transition-colors rounded-md px-2 text-[11px] leading-none text-white/70 flex items-center gap-1 no-drag"
            onClick={onSettingsToggle}
            type="button"
          >
            <Cpu className="w-3" />
            CPU
          </button>
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
                    Take a screenshot of the problem description. The tool will
                    extract and analyze the problem. The 5 latest screenshots
                    are saved.
                  </p>
                </div>

                {/* Solve Command */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Solve Problem</span>
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
                    Generate a solution based on the current problem.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audio Result Display - Fixed positioning */}
      {audioResult && (
        <div className="absolute top-full left-0 mt-2 w-96 h-96 z-40">
          <div className="p-3 text-xs bg-black/90 backdrop-blur-md rounded-lg border border-white/10 text-white/90 shadow-2xl">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <span className="font-semibold text-emerald-400">
                  Audio Result:
                </span>
                <div className="mt-1 text-white/80 leading-relaxed">
                  <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                    {audioResult}
                  </ReactMarkdown>
                </div>
              </div>
              <button
                onClick={clearAudioResult}
                className="text-white/50 hover:text-white/80 transition-colors text-lg leading-none flex-shrink-0"
                title="Clear audio result"
                type="button"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QueueCommands;
