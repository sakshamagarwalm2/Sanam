import { RefreshCcw } from 'lucide-react';
import React, { useState, useEffect } from 'react';

interface ModelConfig {
  provider: "ollama" | "gemini";
  model: string;
  isOllama: boolean;
}

interface ModelSelectorProps {
  onModelChange?: (provider: "ollama" | "gemini", model: string) => void;
  onChatOpen?: () => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ onModelChange, onChatOpen }) => {
  const [currentConfig, setCurrentConfig] = useState<ModelConfig | null>(null);
  const [availableOllamaModels, setAvailableOllamaModels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<"ollama" | "gemini">("gemini");
  const [selectedOllamaModel, setSelectedOllamaModel] = useState<string>("");
  const [ollamaUrl, setOllamaUrl] = useState<string>("http://localhost:11434");

  useEffect(() => {
    loadCurrentConfig();
  }, []);

  const loadCurrentConfig = async () => {
    try {
      setIsLoading(true);
      const config = await window.electronAPI.getCurrentLlmConfig();
      setCurrentConfig(config);
      setSelectedProvider(config.provider);
      
      if (config.isOllama) {
        setSelectedOllamaModel(config.model);
        await loadOllamaModels();
      }
    } catch (error) {
      console.error('Error loading current config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadOllamaModels = async () => {
    try {
      const models = await window.electronAPI.getAvailableOllamaModels();
      setAvailableOllamaModels(models);
      
      // Auto-select first model if none selected
      if (models.length > 0 && !selectedOllamaModel) {
        setSelectedOllamaModel(models[0]);
      }
    } catch (error) {
      console.error('Error loading Ollama models:', error);
      setAvailableOllamaModels([]);
    }
  };

  const testConnection = async () => {
    try {
      setConnectionStatus('testing');
      const result = await window.electronAPI.testLlmConnection();
      setConnectionStatus(result.success ? 'success' : 'error');
      if (!result.success) {
        setErrorMessage(result.error || 'Unknown error');
      }
    } catch (error) {
      setConnectionStatus('error');
      setErrorMessage(String(error));
    }
  };

  const handleProviderSwitch = async () => {
    try {
      setConnectionStatus('testing');
      let result;
      
      if (selectedProvider === 'ollama') {
        result = await window.electronAPI.switchToOllama(selectedOllamaModel, ollamaUrl);
      } else {
        result = await window.electronAPI.switchToGemini(geminiApiKey || undefined);
      }

      if (result.success) {
        await loadCurrentConfig();
        setConnectionStatus('success');
        onModelChange?.(selectedProvider, selectedProvider === 'ollama' ? selectedOllamaModel : 'gemini-2.0-flash');
        // Auto-open chat window after successful model change
        setTimeout(() => {
          onChatOpen?.();
        }, 500);
      } else {
        setConnectionStatus('error');
        setErrorMessage(result.error || 'Switch failed');
      }
    } catch (error) {
      setConnectionStatus('error');
      setErrorMessage(String(error));
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'testing': return 'text-yellow-600';
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'testing': return 'Testing connection...';
      case 'success': return 'Connected successfully';
      case 'error': return `Error: ${errorMessage}`;
      default: return 'Ready';
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 bg-black/90 backdrop-blur-md rounded-lg border border-white/30">
        <div className="animate-pulse text-sm text-white">Loading model configuration...</div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-black/90 backdrop-blur-md rounded-lg border border-white/30 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">AI Model Selection</h3>
        <div className={`text-xs text-purple-300 ${getStatusColor()}`}>
          {getStatusText()}
        </div>
      </div>

      {/* Current Status */}
      {currentConfig && (
        <div className="text-xs text-emerald-500 bg-black/50 p-2 rounded">
          Current: {currentConfig.provider === 'ollama' ? 'Ollama:' : 'AI:'} {currentConfig.model}
        </div>
      )}

      {/* Provider Selection */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-white">Provider</label>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedProvider('gemini')}
            className={`flex-1 px-3 py-2 rounded text-xs transition-all ${
              selectedProvider === 'gemini'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'bg-white/80 text-gray-900 hover:bg-white/90'
            }`}
          >
             Gemini (Cloud)
          </button>
          <button
            onClick={() => setSelectedProvider('ollama')}
            className={`flex-1 px-3 py-2 rounded text-xs transition-all ${
              selectedProvider === 'ollama'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'bg-white/80 text-gray-900 hover:bg-white/90'
            }`}
          >
            Ollama (Local)
          </button>
        </div>
      </div>

      {/* Provider-specific settings */}
      {selectedProvider === 'gemini' ? (
        <div className="space-y-2">
          <label className="text-xs font-medium text-white">Gemini API Key (optional if already set)</label>
          <input
            type="password"
            placeholder="Enter API key to update..."
            value={geminiApiKey}
            onChange={(e) => setGeminiApiKey(e.target.value)}
            className="w-full px-3 py-2 text-xs text-white bg-black/80 border border-white/60 rounded focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <div>
            <label className="text-xs font-medium text-white">Ollama URL</label>
            <input
              type="url"
              value={ollamaUrl}
              onChange={(e) => setOllamaUrl(e.target.value)}
              className="w-full px-3 py-2 text-xs text-white bg-black/80 border border-white/60 rounded focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
            />
          </div>
          
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-xs font-medium text-white">Model</label>
              <button
                onClick={loadOllamaModels}
                className="px-2 text-xs bg-white/60 hover:bg-white/80 rounded transition-all"
                title="Refresh models"
              >
                <RefreshCcw className='w-3'/>
              </button>
            </div>
            
            {availableOllamaModels.length > 0 ? (
              <select
                value={selectedOllamaModel}
                onChange={(e) => setSelectedOllamaModel(e.target.value)}
                className="w-full px-3 py-2 text-xs text-white bg-black/80 border border-white/60 rounded focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                {availableOllamaModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-xs text-black bg-yellow-200 p-2 rounded">
                No Ollama models found. Make sure Ollama is running and models are installed.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleProviderSwitch}
          disabled={connectionStatus === 'testing'}
          className="flex-1 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-400 text-white text-xs rounded transition-all shadow-md"
        >
          {connectionStatus === 'testing' ? 'Switching...' : 'Apply Changes'}
        </button>
        
        <button
          onClick={testConnection}
          disabled={connectionStatus === 'testing'}
          className="px-3 py-2 bg-white/70 hover:bg-white/80 disabled:bg-white/50 text-black text-xs rounded transition-all shadow-md"
        >
          Test
        </button>
      </div>

      {/* Help text */}
      <div className="text-xs text-white space-y-1">
        <div>💡 <strong>Gemini:</strong> Fast, cloud-based, requires API key</div>
        <div>💡 <strong>Ollama:</strong> Private, local, requires Ollama installation</div>
      </div>
    </div>
  );
};

export default ModelSelector;