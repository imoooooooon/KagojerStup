import React, { useState } from 'react';
import { 
  Database, 
  Bot, 
  Users, 
  Settings, 
  LayoutDashboard, 
  Activity,
  Zap,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function AdminDashboard() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState(""); // 'success' or 'error'

  const handleProcessNews = async () => {
    setIsProcessing(true);
    setStatusMessage("Gemini is reading and summarizing the news... Please wait.");
    setStatusType("loading");

    try {
      // Calling your new dedicated backend route
      const response = await fetch('http://localhost:5000/api/trigger-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setStatusMessage(`✨ Success: ${data.message}`);
        setStatusType("success");
      } else {
        throw new Error(data.error || "Failed to connect");
      }
    } catch (error) {
      console.error("Error triggering AI:", error);
      setStatusMessage("❌ Error: Failed to connect to backend or Gemini API.");
      setStatusType("error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <Database className="w-6 h-6 text-indigo-500 mr-3" />
          <span className="text-white font-bold text-lg tracking-wide">Kagojer Admin</span>
        </div>
        <nav className="flex-1 py-6 px-4 space-y-2">
          <a href="#" className="flex items-center px-4 py-3 bg-indigo-600 text-white rounded-lg">
            <LayoutDashboard className="w-5 h-5 mr-3" />
            Dashboard
          </a>
          <a href="#" className="flex items-center px-4 py-3 hover:bg-slate-800 rounded-lg transition-colors">
            <Bot className="w-5 h-5 mr-3" />
            AI Pipeline
          </a>
          <a href="#" className="flex items-center px-4 py-3 hover:bg-slate-800 rounded-lg transition-colors">
            <Users className="w-5 h-5 mr-3" />
            User Management
          </a>
          <a href="#" className="flex items-center px-4 py-3 hover:bg-slate-800 rounded-lg transition-colors">
            <Settings className="w-5 h-5 mr-3" />
            Settings
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Control Center</h1>
            <p className="text-slate-500 mt-1">Manage database ingestion and system settings.</p>
          </header>

          {/* Top Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center">
              <div className="p-4 bg-indigo-50 rounded-lg mr-4">
                <Database className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Database Status</p>
                <p className="text-xl font-bold text-slate-900">Connected</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center">
              <div className="p-4 bg-green-50 rounded-lg mr-4">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">System Health</p>
                <p className="text-xl font-bold text-slate-900">99.9% Uptime</p>
              </div>
            </div>
          </div>

          {/* AI Control Panel */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Bot className="w-5 h-5 text-indigo-600" />
                  Intelligent Ingestion Pipeline
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Manually trigger the Gemini API to format and categorize pending RSS articles.
                </p>
              </div>
              <Zap className="w-6 h-6 text-yellow-400" />
            </div>
            
            <div className="p-6 bg-slate-50/50">
              <button
                onClick={handleProcessNews}
                disabled={isProcessing}
                className={`px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 flex items-center gap-3
                  ${isProcessing 
                    ? 'bg-indigo-400 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-md hover:shadow-lg'
                  }`}
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing Batch...
                  </>
                ) : (
                  <>
                    <span>✨</span> Format Pending Articles
                  </>
                )}
              </button>

              {/* Status Message Alert */}
              {statusMessage && (
                <div className={`mt-6 p-4 rounded-lg flex items-start gap-3 border ${
                  statusType === 'loading' ? 'bg-blue-50 border-blue-200 text-blue-800' :
                  statusType === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                  'bg-red-50 border-red-200 text-red-800'
                }`}>
                  {statusType === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : 
                   statusType === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : 
                   <div className="w-5 h-5 shrink-0 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />}
                  <span className="text-sm font-medium leading-relaxed">{statusMessage}</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}