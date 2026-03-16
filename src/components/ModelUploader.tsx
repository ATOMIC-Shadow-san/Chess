import React, { useState } from 'react';
import { XiangqiRL } from '../game/rl';

interface Props {
  label: string;
  onModelLoaded: (model: XiangqiRL) => void;
}

export default function ModelUploader({ label, onModelLoaded }: Props) {
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [binFile, setBinFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>('');

  const handleLoad = async () => {
    if (!jsonFile || !binFile) {
      setStatus('請同時上傳 .json 與 .bin 檔案');
      return;
    }
    try {
      setStatus('載入中...');
      const rl = new XiangqiRL();
      await rl.loadModel(jsonFile, binFile);
      onModelLoaded(rl);
      setStatus('載入成功！');
    } catch (e) {
      console.error(e);
      setStatus('載入失敗，請確認檔案格式');
    }
  };

  return (
    <div className="border p-3 rounded bg-white shadow-sm flex flex-col gap-2">
      <div className="font-bold text-stone-700 text-sm">{label}</div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500">1. model.json</label>
        <input type="file" accept=".json" onChange={e => setJsonFile(e.target.files?.[0] || null)} className="text-xs w-full" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-500">2. model.weights.bin</label>
        <input type="file" accept=".bin" onChange={e => setBinFile(e.target.files?.[0] || null)} className="text-xs w-full" />
      </div>
      <button 
        onClick={handleLoad} 
        disabled={!jsonFile || !binFile} 
        className="mt-1 bg-stone-800 hover:bg-stone-900 text-white px-3 py-1.5 rounded text-xs font-bold disabled:opacity-50 transition-colors"
      >
        載入模型
      </button>
      {status && <div className="text-xs font-bold text-blue-600">{status}</div>}
    </div>
  );
}
