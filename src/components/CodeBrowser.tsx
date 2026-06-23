import React, { useState } from 'react';
import { cppCoreFiles } from '../data';
import { Folder, File, Code, Clipboard, CheckCircle, FileCode, Check } from 'lucide-react';

export const CodeBrowser: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState(cppCoreFiles[0]);
  const [copied, setCopied] = useState(false);

  // Group files by directory for visual structures
  const folders: Record<string, typeof cppCoreFiles> = {
    'root': cppCoreFiles.filter(f => !f.path.includes('/')),
    'common': cppCoreFiles.filter(f => f.path.startsWith('common/')),
    'ranking': cppCoreFiles.filter(f => f.path.startsWith('ranking/')),
    'networking': cppCoreFiles.filter(f => f.path.startsWith('networking/')),
    'coordinator': cppCoreFiles.filter(f => f.path.startsWith('coordinator/'))
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(selectedFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6" id="code-browser-component">
      {/* Overview section */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-slate-200 text-sm font-semibold font-mono flex items-center gap-2">
            <Code className="w-4 h-4 text-sky-400" /> C++20 PRODUCTIVE CODE REPOSITORY BROWSER
          </h3>
          <p className="text-slate-400 text-xs mt-0.5">
            Feel free to inspect the pristine, complete C++ implementations written in our `/novasearch` workspace directory.
          </p>
        </div>
        
        {/* Copy trigger actions */}
        <button 
          onClick={handleCopyCode}
          className="bg-sky-500 hover:bg-sky-450 text-slate-950 px-4 py-2 text-xs font-mono font-bold rounded flex items-center gap-1.5 transition select-none"
          id="repo-copy-btn"
        >
          {copied ? <Check className="w-4 h-4" /> : <Clipboard className="w-4 h-4" />}
          {copied ? 'COPIED TO CLIPBOARD' : 'COPY ACTIVE FILE'}
        </button>
      </div>

      {/* Repository Main grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[550px]" id="repo-browser-grid">
        
        {/* Left Side: Directory Tree browser (4/12) */}
        <div className="md:col-span-3 bg-slate-900 border border-slate-800 p-4 rounded-lg flex flex-col h-full" id="repo-sidebar">
          <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-3 select-none">Project Files Tree</span>
          
          <div className="flex-1 overflow-y-auto space-y-3 font-mono text-xs pr-1">
            {/* Common block */}
            <div id="folder-common">
              <div className="flex items-center gap-1.5 text-slate-400 font-bold mb-1.5 select-none">
                <Folder className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                <span>common/</span>
              </div>
              <div className="pl-4 space-y-1">
                {folders['common'].map((file, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setSelectedFile(file); setCopied(false); }}
                    className={`w-full text-left flex items-center gap-1.5 py-1 px-1.5 rounded transition ${
                      selectedFile.name === file.name ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-slate-300'
                    }`}
                    id={`file-common-${idx}`}
                  >
                    <FileCode className="w-3.5 h-3.5 text-slate-500" />
                    <span>{file.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Ranking block */}
            <div id="folder-ranking">
              <div className="flex items-center gap-1.5 text-slate-400 font-bold mb-1.5 select-none">
                <Folder className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                <span>ranking/</span>
              </div>
              <div className="pl-4 space-y-1">
                {folders['ranking'].map((file, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setSelectedFile(file); setCopied(false); }}
                    className={`w-full text-left flex items-center gap-1.5 py-1 px-1.5 rounded transition ${
                      selectedFile.name === file.name ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-slate-300'
                    }`}
                    id={`file-ranking-${idx}`}
                  >
                    <FileCode className="w-3.5 h-3.5 text-slate-500" />
                    <span>{file.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Networking block */}
            <div id="folder-networking">
              <div className="flex items-center gap-1.5 text-slate-400 font-bold mb-1.5 select-none">
                <Folder className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                <span>networking/</span>
              </div>
              <div className="pl-4 space-y-1">
                {folders['networking'].map((file, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setSelectedFile(file); setCopied(false); }}
                    className={`w-full text-left flex items-center gap-1.5 py-1 px-1.5 rounded transition ${
                      selectedFile.name === file.name ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-slate-300'
                    }`}
                    id={`file-networking-${idx}`}
                  >
                    <FileCode className="w-3.5 h-3.5 text-slate-500" />
                    <span>{file.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Coordinator block */}
            <div id="folder-coordinator">
              <div className="flex items-center gap-1.5 text-slate-400 font-bold mb-1.5 select-none">
                <Folder className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                <span>coordinator/</span>
              </div>
              <div className="pl-4 space-y-1">
                {folders['coordinator'].map((file, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setSelectedFile(file); setCopied(false); }}
                    className={`w-full text-left flex items-center gap-1.5 py-1 px-1.5 rounded transition ${
                      selectedFile.name === file.name ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-slate-300'
                    }`}
                    id={`file-coordinator-${idx}`}
                  >
                    <FileCode className="w-3.5 h-3.5 text-slate-500" />
                    <span>{file.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Root build level */}
            <div id="folder-root">
              <span className="text-[10px] text-slate-500 font-bold tracking-wider mb-1 mt-3 block uppercase select-none">Root Build Files</span>
              <div className="space-y-1">
                {folders['root'].map((file, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setSelectedFile(file); setCopied(false); }}
                    className={`w-full text-left flex items-center gap-1.5 py-1 px-1.5 rounded transition ${
                      selectedFile.name === file.name ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-slate-300'
                    }`}
                    id={`file-root-${idx}`}
                  >
                    <FileCode className="w-3.5 h-3.5 text-slate-400" />
                    <span>{file.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Code File Text block Viewer (9/12) */}
        <div className="md:col-span-9 bg-slate-900 border border-slate-800 p-5 rounded-lg flex flex-col h-full" id="repo-content-viewer">
          {/* Header */}
          <div className="flex justify-between items-center pb-2 border-b border-slate-800 mb-3 select-none">
            <span className="text-[10px] font-mono font-bold text-sky-400 flex items-center gap-1">
              <File className="w-3.5 h-3.5 text-sky-400" />
              PATH: /novasearch/{selectedFile.path}
            </span>
            <span className="text-[9px] text-slate-600 font-mono">Modern C++ Source Payload</span>
          </div>

          {/* Code Viewer Panel */}
          <div className="flex-1 bg-slate-950 border border-slate-950 rounded p-4 overflow-auto font-mono text-[11px] text-slate-300 h-[430px] shadow-inner" id="code-panel">
            <pre className="whitespace-pre overflow-x-auto select-text leading-relaxed">{selectedFile.code}</pre>
          </div>
        </div>

      </div>
    </div>
  );
};
