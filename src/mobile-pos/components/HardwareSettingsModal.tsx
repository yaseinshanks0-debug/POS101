import React, { useState } from 'react';
import { 
  Printer, 
  Settings, 
  Volume2, 
  Smartphone, 
  CheckCircle, 
  X, 
  RefreshCw, 
  Zap,
  Sliders,
  DollarSign
} from 'lucide-react';
import { HardwareSimulator } from '../hardware/HardwareSimulator';

interface HardwareSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isArabic: boolean;
}

export const HardwareSettingsModal: React.FC<HardwareSettingsModalProps> = ({
  isOpen,
  onClose,
  isArabic,
}) => {
  const [selectedPrinter, setSelectedPrinter] = useState('Sunmi V2 Pro Built-in (58mm ESC/POS)');
  const [pairedPrinters] = useState([
    'Sunmi V2 Pro Built-in (58mm ESC/POS)',
    'Epson TM-T88VI (80mm Bluetooth/LAN)',
    'Star Micronics TSP143III (80mm BT)',
    'Bixolon SPP-R200III (58mm Mobile BT)',
  ]);
  const [isTestingPrinter, setIsTestingPrinter] = useState(false);
  const [isTestingDrawer, setIsTestingDrawer] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTestPrint = () => {
    setIsTestingPrinter(true);
    HardwareSimulator.playThermalPrintSound();
    setTimeout(() => {
      setIsTestingPrinter(false);
      setTestResult('ESC/POS Test Print executed successfully!');
      setTimeout(() => setTestResult(null), 3000);
    }, 800);
  };

  const handleTestDrawer = () => {
    setIsTestingDrawer(true);
    HardwareSimulator.playCashDrawerKick();
    setTimeout(() => {
      setIsTestingDrawer(false);
      setTestResult('Cash Drawer Solenoid (Pin 2 RJ12) triggered!');
      setTimeout(() => setTestResult(null), 3000);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col text-slate-100">
        {/* Header */}
        <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                {isArabic ? 'إعدادات العتاد والأجهزة الطرفية' : 'Hardware & Peripherals Setup'}
              </h3>
              <p className="text-xs text-slate-400">
                {isArabic ? 'الطابعة الحرارية، درج النقود، وماسح الباركود' : 'Thermal printers, cash drawer RJ12 kick, and optical scanner.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 text-xs">
          {/* Printer Configuration */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between font-semibold text-slate-200">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Thermal Receipt Printer:</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono">PAIRED</span>
            </div>

            <select
              value={selectedPrinter}
              onChange={(e) => setSelectedPrinter(e.target.value)}
              className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-xs"
            >
              {pairedPrinters.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            <button
              onClick={handleTestPrint}
              disabled={isTestingPrinter}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition border border-slate-700"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isTestingPrinter ? 'Sending ESC/POS bytes...' : 'Test Print 58mm/80mm Feed'}</span>
            </button>
          </div>

          {/* Cash Drawer Solenoid */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between font-semibold text-slate-200">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-400" />
                <span>Cash Drawer Solenoid (RJ12 24V):</span>
              </div>
              <span className="text-[10px] text-amber-400 font-mono">READY</span>
            </div>

            <p className="text-[11px] text-slate-400">
              Sends ESC/POS pulse command `0x1B, 0x70, 0x00, 0x19, 0xFA` to kick the drawer open automatically upon completing cash sales.
            </p>

            <button
              onClick={handleTestDrawer}
              disabled={isTestingDrawer}
              className="w-full py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isTestingDrawer ? 'Firing Solenoid...' : 'Kick Cash Drawer Open'}</span>
            </button>
          </div>

          {/* Feedback */}
          {testResult && (
            <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-center font-medium animate-fade-in flex items-center justify-center gap-1.5">
              <CheckCircle className="w-4 h-4" />
              <span>{testResult}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-800 border-t border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition"
          >
            Save & Done
          </button>
        </div>
      </div>
    </div>
  );
};
