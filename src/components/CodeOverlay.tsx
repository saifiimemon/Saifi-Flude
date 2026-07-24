import React, { useState } from 'react';
import { X, Minimize2, Code, Copy, Check } from 'lucide-react';

interface CodeOverlayProps {
  onClose: () => void;
}

export const CodeOverlay: React.FC<CodeOverlayProps> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);

  const codeString = `function initBloomFramebuffers() {
  const res = getResolution(config.BLOOM_RESOLUTION);
  const texType = ext.halfFloatTexType;
  const rgba = ext.formatRGBA;

  bloom = createFBO(
    res.width,
    res.height,
    rgba.internalFormat,
    rgba.format,
    texType,
  );

  for (let i = 0; i < config.BLOOM_ITERATIONS; i++) {
    const width = res.width >> (i + 1);
    const height = res.height >> (i + 1);
    if (width < 2 || height < 2) {
      break;
    }
  }
}`;

  const copyCode = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 md:left-6 md:translate-x-0 z-30 w-[92%] max-w-lg bg-[#14151e]/95 border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-950/50 backdrop-blur-xl overflow-hidden font-mono text-xs text-neutral-200 transition-all duration-300">
      {/* MacOS Window Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#1a1c28] border-b border-purple-900/40">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80 cursor-pointer hover:bg-red-500" onClick={onClose} />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="ml-2 text-neutral-400 text-[11px] font-sans flex items-center gap-1.5 bg-neutral-900/80 px-2 py-0.5 rounded border border-neutral-800">
            <Code className="w-3 h-3 text-cyan-400" />
            <span>the_coding_wizard.js</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyCode}
            className="p-1 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title="Copy Code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-white transition-colors cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Code Body */}
      <div className="p-4 relative bg-[#0f1017]">
        <pre className="text-[11px] leading-relaxed overflow-x-auto text-neutral-300 custom-scrollbar font-mono">
          <code>
            <span className="text-purple-400 font-bold">function</span>{' '}
            <span className="text-blue-400 font-semibold">initBloomFramebuffers</span>() {'{\n'}
            {'  '}<span className="text-purple-400">const</span> res = <span className="text-yellow-300">getResolution</span>(config.BLOOM_RESOLUTION);{'\n'}
            {'  '}<span className="text-purple-400">const</span> texType = ext.halfFloatTexType;{'\n'}
            {'  '}<span className="text-purple-400">const</span> rgba = ext.formatRGBA;{'\n\n'}
            {'  '}bloom = <span className="text-blue-400">createFBO</span>({'{\n'}
            {'    '}res.width,{'\n'}
            {'    '}res.height,{'\n'}
            {'    '}rgba.internalFormat,{'\n'}
            {'    '}rgba.format,{'\n'}
            {'    '}texType,{'\n'}
            {'  '}&#125;);{'\n\n'}
            {'  '}<span className="text-purple-400">for</span> (<span className="text-purple-400">let</span> i = <span className="text-orange-400">0</span>; i &lt; config.BLOOM_ITERATIONS; i++) {'{\n'}
            {'    '}<span className="text-purple-400">const</span> width = res.width &gt;&gt; (i + <span className="text-orange-400">1</span>);{'\n'}
            {'    '}<span className="text-purple-400">const</span> height = res.height &gt;&gt; (i + <span className="text-orange-400">1</span>);{'\n'}
            {'    '}<span className="text-purple-400">if</span> (width &lt; <span className="text-orange-400">2</span> || height &lt; <span className="text-orange-400">2</span>) {'{\n'}
            {'      '}<span className="text-purple-400">break</span>;{'\n'}
            {'    '}&#125;{'\n'}
            {'  '}&#125;{'\n'}
            &#125;
          </code>
        </pre>

        {/* Like & Follow Overlay Badge matching image */}
        <div className="absolute top-1/2 right-4 -translate-y-1/2 bg-black/80 border border-pink-500/40 rounded-xl px-3 py-1.5 shadow-xl backdrop-blur-md flex items-center gap-1.5 text-xs font-semibold text-white pointer-events-none">
          <span>Like & Follow For More</span>
          <span className="text-pink-400">📌</span>
        </div>
      </div>
    </div>
  );
};
