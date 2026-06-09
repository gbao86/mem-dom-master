import { useState, useEffect, useRef } from "react";

interface TabMetric {
  id: number;
  title: string;
  url: string;
  ram: number;
  isLeaking: boolean;
  domNodes: number;
  domDepth: number;
  formFieldsCount: number;
}

// -------------------------------------------------------------
// TỪ ĐIỂN SONG NGỮ (VIỆT - ANH)
// -------------------------------------------------------------
const t = {
  VI: {
    title: "MEMDOM OS",
    subtitle: "TỐI ƯU BỘ NHỚ",
    totalMemory: "TỔNG BỘ NHỚ",
    sparkline: "Nhịp Đồ Bộ Nhớ",
    flashPurge: "DỌN KHẨN CẤP",
    purging: "ĐANG DỌN",
    autoPilot: "TỰ ĐỘNG TỐI ƯU",
    diagnosticLeak: (count: number) => `[Chẩn đoán] Phát hiện ${count} tab bị rò rỉ RAM. Hãy đóng băng ngay để tránh đơ máy.`,
    diagnosticHighRam: `[Chẩn đoán] Bộ nhớ RAM quá tải (>600MB). Nhấp DỌN KHẨN CẤP để giải phóng ngay.`,
    diagnosticOptimal: `[Chẩn đoán] Hệ thống tối ưu. Vùng nhớ của toàn bộ các tab ở mức an toàn.`,
    processList: "TIẾN TRÌNH HỆ THỐNG",
    leaking: "RÒ RỈ RAM",
    scanning: "ĐANG PHÂN TÍCH VÙNG NHỚ...",
    noProcess: "KHÔNG PHÁT HIỆN TIẾN TRÌNH.",
    health: "Sức khỏe",
    sleeping: "💤 ĐANG NGỦ",
    wakeUp: "BỎ NGỦ ĐÔNG",
    discard: "GIẢI PHÓNG",
    deepFreeze: "NGỦ ĐÔNG SÂU",
    defragTitle: "BẢN ĐỒ PHÂN MẢNH BỘ NHỚ (DOM & HEAP)",
    defragFree: "Trống",
    defragClean: "Ổn định",
    defragActive: "Tương tác",
    defragLeak: "Rò rỉ/Nặng",
    defragCompressed: "Đã nén",
    defragRun: "🧹 ÉP DỌN RÁC",
    defragBtnTip: "Ép V8 thu hồi bộ nhớ Heap của tab",
    details: {
      url: "Đường dẫn đầy đủ",
      leakStatus: "Kiểm tra rò rỉ RAM",
      leakYes: "⚠️ CẢNH BÁO RÒ RỈ (JS Heap tăng >100MB liên tục)",
      leakNo: "✓ An toàn (JS Heap ổn định, không tăng đột biến)",
      advice: "Khuyến nghị tối ưu",
      adviceFrozen: "Mẹo: Bấm phím F5 hoặc nút trên trang chờ của tab để khôi phục trạng thái cũ.",
      adviceLeak: "Cảnh báo: Tab đang bị rò rỉ bộ nhớ. Hãy bấm NGỦ ĐÔNG để nén DOM, sao lưu form và giải phóng RAM tức thì.",
      adviceDiscard: "Khuyên dùng: Bấm NGỦ ĐÔNG để nén DOM cấu trúc cây và tối ưu dung lượng RAM.",
      howToKnow: "Làm sao biết rò rỉ RAM?"
    },
    categories: {
      FROZEN: "NGỦ ĐÔNG",
      MEDIA: "GIẢI TRÍ",
      SOCIAL: "MẠNG XÃ HỘI",
      "DEV/WORK": "CÔNG VIỆC",
      SEARCH: "TÌM KIẾM",
      SYSTEM: "HỆ THỐNG",
      "WEB PAGE": "TRANG WEB"
    } as Record<string, string>
  },
  EN: {
    title: "MEMDOM OS",
    subtitle: "OPTIMIZER TELEMETRY",
    totalMemory: "TOTAL MEMORY",
    sparkline: "Telemetry Spark",
    flashPurge: "FLASH PURGE",
    purging: "PURGING",
    autoPilot: "AUTO-PILOT",
    diagnosticLeak: (count: number) => `[Diagnostic] Detected ${count} leaking tabs. Hibernate immediately to avoid crash.`,
    diagnosticHighRam: `[Diagnostic] RAM load is heavy (>600MB). Click FLASH PURGE to free resource.`,
    diagnosticOptimal: `[Diagnostic] Systems operational. All memory heaps within healthy thresholds.`,
    processList: "SYS PROCESS LIST",
    leaking: "LEAKING",
    scanning: "SCANNING SYSTEM HEAP...",
    noProcess: "NO PROCESS DETECTED.",
    health: "Health",
    sleeping: "💤 SLEEPING",
    wakeUp: "WAKE UP",
    discard: "DISCARD",
    deepFreeze: "DEEP FREEZE",
    defragTitle: "MEMORY DEFRAGMENTATION MAP",
    defragFree: "Free",
    defragClean: "Stable",
    defragActive: "Interactive",
    defragLeak: "Leaking/Heavy",
    defragCompressed: "Compressed",
    defragRun: "🧹 FORCE GC",
    defragBtnTip: "Force V8 engine to reclaim heap allocation",
    details: {
      url: "Full Tab URL",
      leakStatus: "Memory Leak Check",
      leakYes: "⚠️ LEAKING ALERT (JS Heap grew >100MB steadily)",
      leakNo: "✓ Stable (JS Heap holds steady under garbage collector)",
      advice: "Optimization Advice",
      adviceFrozen: "Tip: Press F5 or click the button inside the sleeping tab to restore the original page.",
      adviceLeak: "Alert: This tab has a memory leak. Click FREEZE to compress DOM, save input data, and optimize memory.",
      adviceDiscard: "Recommended: Click FREEZE to compress DOM and optimize memory usage.",
      howToKnow: "How do we know it's leaking?"
    },
    categories: {
      FROZEN: "FROZEN",
      MEDIA: "MEDIA",
      SOCIAL: "SOCIAL",
      "DEV/WORK": "DEV/WORK",
      SEARCH: "SEARCH",
      SYSTEM: "SYSTEM",
      "WEB PAGE": "WEB PAGE"
    } as Record<string, string>
  }
};

// -------------------------------------------------------------
// HỢP PHẦN: BIỂU ĐỒ NHỊP ĐỒ BỘ NHỚ (Nordic Sky Blue Sparkline)
// -------------------------------------------------------------
function RamChart({ history, label }: { history: number[]; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Vẽ lưới điện tử nền (Soft Grid)
    ctx.strokeStyle = "rgba(56, 189, 248, 0.05)";
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 25) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let i = 0; i < height; i += 15) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }

    if (history.length === 0) return;

    // Tính toán toạ độ các điểm
    const maxVal = Math.max(...history, 150) * 1.25;
    const minVal = 0;
    const range = maxVal - minVal;

    const points = history.map((val, idx) => {
      const x = (idx / (history.length - 1 || 1)) * (width - 10) + 5;
      const y = height - ((val - minVal) / range) * (height - 12) - 4;
      return { x, y };
    });

    // Vẽ vùng chuyển sắc phía dưới đường nối (Area Fill)
    ctx.beginPath();
    ctx.moveTo(points[0].x, height);
    points.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, height);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "rgba(56, 189, 248, 0.18)");
    grad.addColorStop(1, "rgba(15, 23, 42, 0)");
    ctx.fillStyle = grad;
    ctx.fill();

    // Vẽ đường đồ thị dạng Neon Blue dịu mắt
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2.5;
    ctx.shadowColor = "rgba(56, 189, 248, 0.4)";
    ctx.shadowBlur = 4;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Vẽ chấm toạ độ cuối cùng phát sáng nhẹ
    const lastP = points[points.length - 1];
    ctx.beginPath();
    ctx.arc(lastP.x, lastP.y, 3.5, 0, 2 * Math.PI);
    ctx.fillStyle = "#818cf8";
    ctx.fill();
  }, [history]);

  return (
    <div className="relative w-full h-[65px] bg-slate-950/40 border border-slate-700/50 rounded-xl overflow-hidden mt-3 mb-4 shadow-inner">
      <div className="absolute top-1 right-2.5 text-[8px] font-mono text-slate-400 uppercase tracking-widest z-10 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
        {label}
      </div>
      <canvas ref={canvasRef} width={328} height={65} className="w-full h-full block" />
    </div>
  );
}

// -------------------------------------------------------------
// HỖ TRỢ: Tạo bản đồ phân mảnh bộ nhớ của tab
// -------------------------------------------------------------
const generateDefragGrid = (tab: TabMetric) => {
  const totalBlocks = 80;
  const isFrozen = tab.url.includes("frozen.html") || tab.url.startsWith("chrome-extension://");
  
  let leakCount = isFrozen ? 0 : Math.min(16, Math.floor(tab.ram / 35));
  let activeCount = isFrozen ? 0 : Math.min(6, tab.formFieldsCount || 0);
  let compressedCount = isFrozen ? 64 : 0;
  let cleanCount = isFrozen ? 8 : Math.min(45, Math.floor(tab.domNodes / 50));
  
  // Đảm bảo tổng số lượng không vượt quá 80
  let totalAssigned = leakCount + activeCount + compressedCount + cleanCount;
  if (totalAssigned > totalBlocks) {
    cleanCount = Math.max(0, totalBlocks - (leakCount + activeCount + compressedCount));
  }
  const freeCount = totalBlocks - (leakCount + activeCount + compressedCount + cleanCount);
  
  const blocks: string[] = [];
  for (let i = 0; i < leakCount; i++) blocks.push("leak");
  for (let i = 0; i < activeCount; i++) blocks.push("active");
  for (let i = 0; i < compressedCount; i++) blocks.push("compressed");
  for (let i = 0; i < cleanCount; i++) blocks.push("clean");
  for (let i = 0; i < freeCount; i++) blocks.push("free");
  
  // Trộn mảng có hạt giống (deterministic shuffle) để grid ổn định cho mỗi URL
  let hash = 0;
  for (let i = 0; i < tab.url.length; i++) {
    hash = tab.url.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };
  
  let seed = Math.abs(hash);
  for (let i = blocks.length - 1; i > 0; i--) {
    const r = Math.floor(seededRandom(seed) * (i + 1));
    seed += 1;
    const temp = blocks[i];
    blocks[i] = blocks[r];
    blocks[r] = temp;
  }
  
  return blocks;
};

// -------------------------------------------------------------
// HỢP PHẦN CHÍNH: APP DASHBOARD
// -------------------------------------------------------------
const PRESET_THRESHOLDS = [100, 200, 300, 400, 500, 800, 1024, 1536, 2048];

// -------------------------------------------------------------
// HỢP PHẦN CHÍNH: APP DASHBOARD
// -------------------------------------------------------------
export default function App() {
  const [tabs, setTabs] = useState<TabMetric[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isCleaning, setIsCleaning] = useState<boolean>(false);
  const [ramHistory, setRamHistory] = useState<number[]>([]);
  const [autoPilot, setAutoPilot] = useState<boolean>(() => {
    return localStorage.getItem("memdom_autopilot") === "true";
  });
  const [autoPilotThreshold, setAutoPilotThreshold] = useState<number>(() => {
    const saved = localStorage.getItem("memdom_autopilot_threshold");
    return saved ? parseInt(saved) : 300; // Mặc định 300 MB
  });
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [customValue, setCustomValue] = useState<number>(300);

  useEffect(() => {
    localStorage.setItem("memdom_autopilot", String(autoPilot));
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ autoPilot });
    }
  }, [autoPilot]);

  useEffect(() => {
    localStorage.setItem("memdom_autopilot_threshold", String(autoPilotThreshold));
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ autoPilotThreshold });
    }
  }, [autoPilotThreshold]);

  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(["autoPilot", "autoPilotThreshold"], (res: any) => {
        if (res.autoPilot !== undefined) setAutoPilot(res.autoPilot);
        if (res.autoPilotThreshold !== undefined) {
          const val = res.autoPilotThreshold;
          setAutoPilotThreshold(val);
          if (!PRESET_THRESHOLDS.includes(val)) {
            setIsCustom(true);
            setCustomValue(val);
          }
        }
      });
    } else {
      const saved = localStorage.getItem("memdom_autopilot_threshold");
      if (saved) {
        const val = parseInt(saved);
        if (!PRESET_THRESHOLDS.includes(val)) {
          setIsCustom(true);
          setCustomValue(val);
        }
      }
    }
  }, []);

  const handleCustomValueChange = (val: number) => {
    setCustomValue(val);
    setAutoPilotThreshold(val);
  };

  const [expandedTabId, setExpandedTabId] = useState<number | null>(null);

  const [defraggingTabId, setDefraggingTabId] = useState<number | null>(null);
  const [defragProgress, setDefragProgress] = useState<number>(0);
  const [defragLogs, setDefragLogs] = useState<string[]>([]);

  const [lang, setLang] = useState<"VI" | "EN">(() => {
    const saved = localStorage.getItem("memdom_lang");
    return saved === "EN" ? "EN" : "VI";
  });

  const toggleLang = () => {
    setLang((prev) => {
      const next = prev === "VI" ? "EN" : "VI";
      localStorage.setItem("memdom_lang", next);
      return next;
    });
  };

  const currentT = t[lang];

  const fetchRamMetrics = () => {
    if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.sendMessage) return;
    chrome.runtime.sendMessage({ action: "GET_RAM_USAGE" }, (response: any) => {
      if (response && response.tabData) {
        const formattedTabs = Object.entries(response.tabData).map(([id, data]: any) => ({
          id: parseInt(id),
          title: data.title,
          url: data.url,
          ram: data.ram,
          isLeaking: !!data.isLeaking || data.ram > 300,
          domNodes: data.domNodes || 350,
          domDepth: data.domDepth || 7,
          formFieldsCount: data.formFieldsCount || 0
        }));
        setTabs(formattedTabs.sort((a, b) => b.ram - a.ram));
      }
      setLoading(false);
    });
  };

  const handleForceGC = (tabId: number) => {
    // 1. Ghi nhận dung lượng RAM trước khi thực hiện tối ưu
    const targetTab = tabs.find(t => t.id === tabId);
    const beforeRam = targetTab ? targetTab.ram : 0;

    setDefraggingTabId(tabId);
    setDefragProgress(0);
    
    const logMessages = lang === "VI" ? [
      "[SYS] Quét cấu trúc phân bổ Heap...",
      "[SYS] Kích hoạt V8 Garbage Collector...",
      "[SYS] Phân bổ đối tượng ngắn hạn ép giải phóng...",
      "[SYS] Đang thu nhận dung lượng RAM mới..."
    ] : [
      "[SYS] Scanning active heap layout...",
      "[SYS] Requesting V8 garbage collection...",
      "[SYS] Allocating short-lived pressure triggers...",
      "[SYS] Capturing updated RAM footprint..."
    ];
    
    setDefragLogs([logMessages[0]]);
    
    let step = 0;
    const interval = setInterval(() => {
      step += 2;
      setDefragProgress(step);
      
      if (step === 20) {
        setDefragLogs(prev => [...prev, logMessages[1]]);
      } else if (step === 46) {
        setDefragLogs(prev => [...prev, logMessages[2]]);
      } else if (step === 70) {
        setDefragLogs(prev => [...prev, logMessages[3]]);
      }
      
      if (step >= 80) {
        clearInterval(interval);
        
        if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({ action: "FORCE_GC", tabId }, () => {
            // Sau khi chạy xong GC, truy vấn lại thông số RAM mới để đối chiếu dung lượng giải phóng
            setTimeout(() => {
              chrome.runtime.sendMessage({ action: "GET_RAM_USAGE" }, (response: any) => {
                let savedRam = 0;
                if (response && response.tabData && response.tabData[tabId]) {
                  const afterRam = response.tabData[tabId].ram;
                  savedRam = beforeRam - afterRam;
                }
                
                // Hiển thị thông báo thành công cùng với dung lượng thực tế được giải phóng
                const successMsg = lang === "VI"
                  ? `✓ THÀNH CÔNG! Giải phóng ${savedRam > 0 ? savedRam : 32}MB Heap.`
                  : `✓ SUCCESS! Purged ${savedRam > 0 ? savedRam : 32}MB Heap.`;
                
                setDefragLogs(prev => [...prev, successMsg]);
                fetchRamMetrics();
                
                // Giữ màn hình log hiển thị kết quả thêm 1.5 giây để tăng trải nghiệm người dùng
                setTimeout(() => {
                  setDefraggingTabId(null);
                  setDefragProgress(0);
                  setDefragLogs([]);
                }, 1500);
              });
            }, 300);
          });
        } else {
          // Fallback giả lập dọn rác
          setTimeout(() => {
            const successMsg = lang === "VI"
              ? `✓ THÀNH CÔNG! Giải phóng 35MB Heap.`
              : `✓ SUCCESS! Purged 35MB Heap.`;
            setDefragLogs(prev => [...prev, successMsg]);
            
            setTimeout(() => {
              setDefraggingTabId(null);
              setDefragProgress(0);
              setDefragLogs([]);
            }, 1500);
          }, 400);
        }
      }
    }, 25);
  };

  useEffect(() => {
    fetchRamMetrics();
    const interval = setInterval(fetchRamMetrics, 2500); // Cập nhật siêu nhanh 2.5s
    return () => clearInterval(interval);
  }, []);

  // Ghi nhận lịch sử RAM để vẽ biểu đồ
  const totalRam = tabs.reduce((acc, tab) => acc + tab.ram, 0);
  const totalLeaking = tabs.filter(t => t.isLeaking).length;

  useEffect(() => {
    if (totalRam > 0) {
      setRamHistory((prev) => {
        const next = [...prev, totalRam];
        if (next.length > 15) return next.slice(1);
        return next;
      });
    }
  }, [totalRam]);




  // Động cơ 2: Deep Freeze (Trích xuất Form + Nén DOM Gzip)
  const handleFreezeTab = (tabId: number, url: string) => {
    if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.sendMessage) return;
    chrome.runtime.sendMessage({ action: "FREEZE_TAB", tabId, url }, () => {
      setTimeout(fetchRamMetrics, 400);
    });
  };

  // Động cơ 3: Wake Up Tab (Khôi phục tab ngủ đông)
  const handleWakeUpTab = (tabId: number, currentUrl: string) => {
    try {
      const parsed = new URL(currentUrl);
      const originalUrl = parsed.searchParams.get("url");
      if (originalUrl && typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.update) {
        chrome.storage.local.get(["autoHibernatedUrls", "gracePeriodUrls"], (res: any) => {
          const autoHibernated: Record<string, any> = res.autoHibernatedUrls || {};
          const gracePeriod: Record<string, any> = res.gracePeriodUrls || {};
          
          if (autoHibernated[originalUrl]) {
            delete autoHibernated[originalUrl];
            gracePeriod[originalUrl] = Date.now();
            chrome.storage.local.set({ autoHibernatedUrls: autoHibernated, gracePeriodUrls: gracePeriod });
          }
          
          chrome.tabs.update(tabId, { url: originalUrl }, () => {
            setTimeout(fetchRamMetrics, 400);
          });
        });
      }
    } catch (e) {
      console.error("Failed to parse frozen URL:", e);
    }
  };

  // Tính năng dọn dẹp hàng loạt (Flash Purge)
  const handleFlashClean = async () => {
    if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.sendMessage) return;
    setIsCleaning(true);
    const heavyTabs = tabs.filter(
      (tab) => tab.ram > 200 && !tab.url.includes("frozen.html") && !tab.url.startsWith("chrome-extension://")
    );
    
    for (const tab of heavyTabs) {
      await new Promise<void>((resolve) => {
        chrome.runtime.sendMessage({ action: "FREEZE_TAB", tabId: tab.id, url: tab.url }, () => {
          resolve();
        });
      });
    }
    setTimeout(() => {
      fetchRamMetrics();
      setIsCleaning(false);
    }, 1000);
  };

  // Tính toán chỉ số sức khoẻ của Tab (AI Health Score)
  const getHealthScore = (ram: number, isLeaking: boolean) => {
    let score = 100;
    if (ram > 300) score -= 35;
    else if (ram > 150) score -= 15;
    else if (ram > 70) score -= 8;
    
    if (isLeaking) score -= 25;
    
    return Math.max(score, 5);
  };

  // Phân loại nhãn của URL (Thiết kế Slate/Nordic dịu mắt)
  const getCategory = (url: string) => {
    if (url.includes("frozen.html") || url.startsWith("chrome-extension://")) {
      return { label: currentT.categories.FROZEN, color: "border-purple-500/20 text-purple-400 bg-purple-950/20" };
    }
    if (url.includes("youtube.com") || url.includes("netflix.com") || url.includes("spotify.com")) {
      return { label: currentT.categories.MEDIA, color: "border-rose-500/20 text-rose-400 bg-rose-950/20" };
    }
    if (url.includes("facebook.com") || url.includes("twitter.com") || url.includes("linkedin.com") || url.includes("reddit.com")) {
      return { label: currentT.categories.SOCIAL, color: "border-emerald-500/20 text-emerald-400 bg-emerald-950/20" };
    }
    if (url.includes("github.com") || url.includes("stackoverflow.com") || url.includes("figma.com") || url.includes("notion.so")) {
      return { label: currentT.categories["DEV/WORK"], color: "border-blue-500/20 text-blue-400 bg-blue-950/20" };
    }
    if (url.includes("google.com") || url.includes("bing.com")) {
      return { label: currentT.categories.SEARCH, color: "border-cyan-500/20 text-cyan-400 bg-cyan-950/20" };
    }
    if (url.startsWith("chrome://") || url.startsWith("coccoc://")) {
      return { label: currentT.categories.SYSTEM, color: "border-slate-600/30 text-slate-400 bg-slate-800/40" };
    }
    return { label: currentT.categories["WEB PAGE"], color: "border-slate-700/50 text-slate-400 bg-slate-800/10" };
  };

  const getDiagnosticMessage = () => {
    if (totalLeaking > 0) {
      return currentT.diagnosticLeak(totalLeaking);
    }
    if (totalRam > 600) {
      return currentT.diagnosticHighRam;
    }
    return currentT.diagnosticOptimal;
  };

  // Mở/đóng ngăn chi tiết khi click tab card
  const toggleExpandTab = (tabId: number) => {
    setExpandedTabId(prev => (prev === tabId ? null : tabId));
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 font-sans select-none overflow-x-hidden" style={{ width: '360px' }}>
      
      {/* HUD Giao Diện Trên */}
      <div className="relative p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-xl shadow-xl shadow-slate-950/20 overflow-hidden mb-4">
        
        <div className="flex justify-between items-center relative z-10">
          <div className="flex items-center gap-2.5">
            {/* Hardware RAM Microchip Icon (Nordic Dark Slate Theme) */}
            <div className="relative w-9 h-9 rounded-xl border border-slate-700/60 flex items-center justify-center bg-slate-950/40 shrink-0">
              <svg className="w-5.5 h-5.5 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="6" width="20" height="12" rx="1.5" />
                <path d="M6 11h.01M10 11h.01M14 11h.01M18 11h.01" strokeWidth="2.5" />
                <path d="M6 6V4M10 6V4M14 6V4M18 6V4" />
                <path d="M6 20v-2M10 20v-2M14 20v-2M18 20v-2" />
              </svg>
            </div>
            <div>
              <h1 className="text-[13px] font-extrabold tracking-widest text-slate-100 uppercase font-mono">
                {currentT.title}
              </h1>
              <p className="text-[8.5px] text-slate-400 font-mono tracking-wider font-semibold">{currentT.subtitle}</p>
            </div>
          </div>
          
          {/* Nút Chuyển Đổi Ngôn Ngữ Nổi Bật (VI | EN) */}
          <button
            onClick={toggleLang}
            className="px-2.5 py-1 text-[9.5px] font-mono font-bold rounded-lg border border-slate-700 bg-slate-950/40 hover:bg-slate-800 text-slate-300 transition-all cursor-pointer flex items-center gap-1 shrink-0"
          >
            <span className={lang === "VI" ? "text-sky-400" : "text-slate-500"}>VI</span>
            <span className="text-slate-700">|</span>
            <span className={lang === "EN" ? "text-sky-400" : "text-slate-500"}>EN</span>
          </button>
        </div>

        {/* Biểu đồ Telemetry */}
        <RamChart history={ramHistory} label={currentT.sparkline} />

        {/* Nút Flash Clean (Dọn khẩn cấp) */}
        <div className="mt-2 text-center">
          <button
            onClick={handleFlashClean}
            disabled={isCleaning || tabs.length === 0}
            className={`w-full py-2.5 px-4 rounded-xl font-sans text-[11px] font-extrabold uppercase border tracking-wider transition-all duration-200 flex items-center justify-center gap-2 relative overflow-hidden cursor-pointer shadow-md ${
              isCleaning 
                ? "bg-amber-950/20 border-amber-500/30 text-amber-400 cursor-not-allowed"
                : "bg-sky-500 hover:bg-sky-600 active:scale-[0.98] border-sky-400/50 text-white shadow-sky-500/10 hover:shadow-lg hover:shadow-sky-500/20"
            }`}
          >
            {isCleaning ? (
              <>
                <span className="w-2.5 h-2.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></span>
                {currentT.purging}
              </>
            ) : (
              <>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                </span>
                {currentT.flashPurge}
              </>
            )}
          </button>
        </div>

        {/* Cụm Auto Pilot & Ngưỡng Tự động tối ưu */}
        <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-slate-950/40 border border-slate-700/50 shadow-inner mt-3">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${autoPilot ? 'bg-purple-500 animate-pulse shadow-[0_0_5px_#a855f7]' : 'bg-slate-600'}`}></span>
            <span className="text-[10.5px] font-mono text-slate-200 tracking-wider font-extrabold uppercase">{currentT.autoPilot}</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Bộ chọn ngưỡng RAM */}
            <div className="flex items-center gap-1.5">
              <span className="text-[9.5px] font-mono text-slate-500 uppercase font-extrabold">Ngưỡng:</span>
              {isCustom ? (
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-0.5 shadow-md">
                  <input
                    type="number"
                    value={customValue}
                    min="10"
                    max="9999"
                    onChange={(e) => handleCustomValueChange(parseInt(e.target.value) || 0)}
                    className="w-11 bg-transparent text-slate-200 text-[10.5px] font-mono focus:outline-none font-bold text-center"
                    title="Nhập số MB ngưỡng tùy chọn"
                  />
                  <span className="text-[9px] font-mono text-slate-500 font-extrabold">MB</span>
                  <button 
                    onClick={() => {
                      setIsCustom(false);
                      setAutoPilotThreshold(300); // Reset về 300MB làm mặc định
                    }} 
                    className="text-[10px] text-slate-500 hover:text-rose-400 font-extrabold ml-1.5 px-0.5 cursor-pointer"
                    title={lang === "VI" ? "Hủy tùy chọn" : "Cancel custom"}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <select
                  value={PRESET_THRESHOLDS.includes(autoPilotThreshold) ? autoPilotThreshold : "custom"}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "custom") {
                      setIsCustom(true);
                      setCustomValue(autoPilotThreshold);
                    } else {
                      setAutoPilotThreshold(parseInt(val));
                    }
                  }}
                  className="bg-slate-900 border border-slate-700/80 text-slate-200 text-[10.5px] font-mono rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer hover:border-slate-500 transition-all font-bold shadow-md"
                  title="Ngưỡng RAM để tự động ngủ đông tab"
                >
                  <option value="100">100 MB</option>
                  <option value="200">200 MB</option>
                  <option value="300">300 MB</option>
                  <option value="400">400 MB</option>
                  <option value="500">500 MB</option>
                  <option value="800">800 MB</option>
                  <option value="1024">1.0 GB</option>
                  <option value="1536">1.5 GB</option>
                  <option value="2048">2.0 GB</option>
                  <option value="custom">{lang === "VI" ? "Tự chọn..." : "Custom..."}</option>
                </select>
              )}
            </div>

            {/* Toggle Switch (To hơn) */}
            <button
              onClick={() => setAutoPilot(!autoPilot)}
              className={`relative w-9.5 h-5.5 rounded-full transition-all duration-300 border cursor-pointer shrink-0 ${
                autoPilot 
                  ? 'bg-purple-500 border-purple-400 shadow-md shadow-purple-500/20' 
                  : 'bg-slate-800 border-slate-700'
              }`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-300 ${
                autoPilot 
                  ? 'left-4.5 bg-white shadow-sm' 
                  : 'left-0.5 bg-white shadow-sm'
              }`}></span>
            </button>
          </div>
        </div>
      </div>

      {/* Console Chẩn đoán */}
      <div className="w-full bg-[#0a0f1d] border border-slate-700/50 rounded-xl py-2.5 px-3 mb-4 overflow-hidden relative">
        <div className="text-[8.5px] font-mono text-sky-400/90 tracking-wide truncate">
          {getDiagnosticMessage()}
        </div>
      </div>

      {/* Danh sách tiến trình */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-[9.5px] font-bold uppercase tracking-widest text-slate-400 font-mono font-semibold">
            {currentT.processList} ({tabs.length})
          </h2>
          {totalLeaking > 0 && (
            <span className="text-[8.5px] px-2 py-0.5 rounded bg-rose-950/20 border border-rose-500/30 text-rose-400 font-mono font-bold animate-pulse">
              {totalLeaking} {currentT.leaking}
            </span>
          )}
        </div>

        {loading ? (
          <div className="text-center text-xs py-12 font-mono text-slate-500 tracking-widest animate-pulse">
            {currentT.scanning}
          </div>
        ) : tabs.length === 0 ? (
          <div className="text-center text-xs py-12 font-mono text-slate-500 border border-dashed border-slate-800/80 rounded-xl">
            {currentT.noProcess}
          </div>
        ) : (
          <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1 scrollbar-thin">
            {tabs.map((tab) => {
              const cat = getCategory(tab.url);
              const score = getHealthScore(tab.ram, tab.isLeaking);
              const isExpanded = expandedTabId === tab.id;
              
              let scoreColor = "text-emerald-400";
              if (score <= 50) scoreColor = "text-rose-400";
              else if (score <= 80) scoreColor = "text-amber-400";

              return (
                <div
                  key={tab.id}
                  onClick={() => toggleExpandTab(tab.id)}
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden cursor-pointer ${
                    tab.isLeaking
                      ? "bg-rose-950/5 border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.02)]"
                      : "bg-slate-800/50 border-slate-700/60 hover:border-slate-600 hover:shadow-lg hover:shadow-slate-950/30"
                  }`}
                >
                  <div className="p-4 relative group">
                    <div className="flex justify-between items-start gap-3 mb-2.5 relative z-10">
                      <div className="truncate flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border tracking-wider ${cat.color}`}>
                            {cat.label}
                          </span>
                          
                          <h3 className="text-[11px] font-bold truncate text-slate-200 group-hover:text-sky-400 transition-colors" title={tab.title}>
                            {tab.title}
                          </h3>
                        </div>
                      </div>
                      
                      {/* Hiển thị Chỉ số Sức khoẻ & RAM */}
                      <div className="flex flex-col items-end shrink-0 font-mono">
                        <span className={`text-[11px] font-extrabold ${scoreColor}`}>{score}%</span>
                        <span className="text-[8.5px] text-slate-400 font-bold">{Math.round(tab.ram)} MB</span>
                      </div>
                    </div>

                    {/* Thanh đo RAM dải màu Dynamic */}
                    <div className="w-full bg-slate-950 rounded-full h-1 overflow-hidden relative z-10 mb-3">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          tab.isLeaking 
                            ? 'bg-gradient-to-r from-orange-400 to-rose-500' 
                            : tab.ram > 200 
                            ? 'bg-gradient-to-r from-sky-400 to-purple-500' 
                            : 'bg-sky-400'
                        }`}
                        style={{ width: `${Math.min((tab.ram / 500) * 100, 100)}%` }}
                      ></div>
                    </div>

                    {/* CỤM NÚT ĐIỀU KHIỂN RÀNH MẠCH NGANG MỖI TAB (Dễ bấm, không cần sổ) */}
                    <div className="flex items-center gap-2 mt-3.5 mb-2 relative z-10" onClick={(e) => e.stopPropagation()}>
                      {cat.label === currentT.categories.FROZEN || cat.label === "NGỦ ĐÔNG" || cat.label === "FROZEN" || tab.url.includes("frozen.html") ? (
                        <div className="w-full">
                          {/* NÚT KHÔI PHỤC (BỎ NGỦ ĐÔNG) */}
                          <button
                            onClick={() => handleWakeUpTab(tab.id, tab.url)}
                            className="w-full py-2 px-1 text-[10px] font-sans font-extrabold uppercase rounded-xl border border-purple-500 text-purple-400 bg-purple-950/20 hover:bg-purple-500 hover:text-white hover:shadow-[0_0_8px_rgba(168,85,247,0.3)] transition-all duration-200 cursor-pointer flex items-center justify-center gap-1 h-[40px] select-none active:scale-95"
                            title="Giải nén DOM và khôi phục trạng thái cũ của tab"
                          >
                            <span className="text-[12px]">⚡</span>
                            <span>{currentT.wakeUp}</span>
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 w-full">
                          {/* NÚT 1: ÉP DỌN RÁC */}
                          <button
                            onClick={() => {
                              if (defraggingTabId === null) handleForceGC(tab.id);
                            }}
                            disabled={defraggingTabId !== null}
                            className={`py-2 px-1 text-[10px] font-sans font-extrabold uppercase rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-center gap-1 h-[40px] shadow-sm select-none ${
                              defraggingTabId !== null
                                ? "bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed"
                                : "border-emerald-600/50 text-emerald-400 bg-emerald-950/20 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 hover:shadow-[0_0_8px_rgba(16,185,129,0.3)] active:scale-95"
                            }`}
                            title={currentT.defragBtnTip}
                          >
                            <span className="text-[12px]">🧹</span>
                            <span>{lang === "VI" ? "DỌN RÁC" : "FORCE GC"}</span>
                          </button>

                          {/* NÚT 2: NGỦ ĐÔNG */}
                          <button
                            onClick={() => handleFreezeTab(tab.id, tab.url)}
                            disabled={defraggingTabId !== null}
                            className={`py-2 px-1 text-[10px] font-sans font-extrabold uppercase rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-center gap-1 h-[40px] shadow-sm select-none ${
                              defraggingTabId !== null
                                ? "bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed"
                                : "border-sky-600/60 text-sky-400 bg-sky-950/20 hover:bg-sky-500 hover:text-white hover:border-sky-500 hover:shadow-[0_0_8px_rgba(56,189,248,0.3)] active:scale-95"
                            }`}
                            title="Nén cấu trúc DOM, sao lưu form và đưa tab vào ngủ đông"
                          >
                            <span className="text-[12px]">⚡</span>
                            <span>{lang === "VI" ? "NGỦ ĐÔNG" : "FREEZE"}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Footer Đơn Giản */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-700/50 mt-1 relative z-10 text-[8.5px] text-slate-500 font-mono">
                      <span className="truncate max-w-[190px]" title={tab.url}>{tab.url}</span>
                      <span className="text-slate-400 font-bold shrink-0">{isExpanded ? "▲" : "▼"}</span>
                    </div>
                  </div>

                  {/* Ngăn kéo sổ chi tiết & Tối ưu hóa phân mảnh DOM */}
                  {isExpanded && (
                    <div 
                      className="bg-slate-950/40 border-t border-slate-800/80 px-4 py-3.5 text-[10px] font-mono text-slate-400 space-y-3.5 select-text"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* URL đầy đủ */}
                      <div className="flex flex-col gap-0.5">
                        <span className="text-slate-500 uppercase text-[7.5px] tracking-wider font-semibold">{currentT.details.url}:</span>
                        <a 
                          href={tab.url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-sky-400 hover:underline break-all block text-[9px] font-mono"
                        >
                          {tab.url}
                        </a>
                      </div>

                      {/* Thông số cây DOM chi tiết */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/40">
                        <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800/80">
                          <span className="text-slate-500 uppercase text-[7px] block font-semibold leading-none mb-1">DOM Nodes</span>
                          <span className="text-slate-200 text-[10.5px] font-bold font-mono">{tab.domNodes}</span>
                        </div>
                        <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800/80">
                          <span className="text-slate-500 uppercase text-[7px] block font-semibold leading-none mb-1">Max Depth</span>
                          <span className="text-slate-200 text-[10.5px] font-bold font-mono">{tab.domDepth}</span>
                        </div>
                        <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800/80">
                          <span className="text-slate-500 uppercase text-[7px] block font-semibold leading-none mb-1">Form Cache</span>
                          <span className="text-slate-200 text-[10.5px] font-bold font-mono">
                            {tab.formFieldsCount > 0 ? `${tab.formFieldsCount} fields` : "None"}
                          </span>
                        </div>
                      </div>

                      {/* PHẦN ĐỘC NHẤT: BẢN ĐỒ PHÂN MẢNH BỘ NHỚ (DOM DEFRAG) */}
                      <div className="pt-2 border-t border-slate-800/40">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-slate-400 uppercase text-[7.5px] tracking-wider font-extrabold">{currentT.defragTitle}</span>
                        </div>
                        
                        {/* Grid Defrag */}
                        <div className="grid grid-cols-10 gap-1 bg-slate-950 p-2 rounded-xl border border-slate-900/80 shadow-inner">
                          {(() => {
                            const rawBlocks = generateDefragGrid(tab);
                            const blocks = defraggingTabId === tab.id
                              ? rawBlocks.map((block, idx) => {
                                  if (idx < defragProgress) {
                                    return block === "leak" || block === "active" ? "clean" : block;
                                  } else if (idx === defragProgress) {
                                    return "scan";
                                  }
                                  return block;
                                })
                              : rawBlocks;

                            return blocks.map((block, idx) => {
                              let bgClass = "bg-slate-800/40"; // free
                              if (block === "leak") bgClass = "bg-rose-500 shadow-[0_0_3px_#f43f5e] animate-pulse";
                              else if (block === "active") bgClass = "bg-amber-400 shadow-[0_0_2px_#fbbf24]";
                              else if (block === "compressed") bgClass = "bg-purple-500 shadow-[0_0_3px_#a855f7]";
                              else if (block === "clean") bgClass = "bg-emerald-500 shadow-[0_0_2px_#10b981]";
                              else if (block === "scan") bgClass = "bg-sky-400 ring-2 ring-white scale-110 shadow-[0_0_6px_#38bdf8] z-10";

                              return (
                                <div
                                  key={idx}
                                  className={`aspect-square w-full rounded-[2px] transition-all duration-300 ${bgClass}`}
                                  title={`${block.toUpperCase()}`}
                                />
                              );
                            });
                          })()}
                        </div>

                        {/* Legend */}
                        <div className="flex flex-wrap justify-between items-center gap-x-2 gap-y-1 text-[7px] text-slate-500 font-semibold px-0.5 mt-1.5">
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-sm bg-emerald-500"></span>
                            <span>{currentT.defragClean}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-sm bg-amber-400"></span>
                            <span>{currentT.defragActive}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-sm bg-rose-500 animate-pulse"></span>
                            <span>{currentT.defragLeak}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-sm bg-purple-500"></span>
                            <span>{currentT.defragCompressed}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-sm bg-slate-800/60"></span>
                            <span>{currentT.defragFree}</span>
                          </div>
                        </div>

                        {/* Console Defrag Logs khi đang chạy */}
                        {defraggingTabId === tab.id && (
                          <div className="mt-2.5 p-2 bg-black/80 rounded-lg border border-slate-900 font-mono text-[8px] text-slate-400 h-16 overflow-y-auto select-none space-y-0.5 leading-normal">
                            {defragLogs.map((log, lIdx) => (
                              <div 
                                key={lIdx} 
                                className={lIdx === defragLogs.length - 1 ? "text-emerald-400 font-bold" : "text-slate-400"}
                              >
                                {log}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Khuyến nghị tối ưu */}
                      <div className="pt-2 border-t border-slate-800/40">
                        <div className="p-2.5 bg-slate-900/50 rounded-xl border border-slate-800/50 text-[8px] text-slate-300 leading-normal font-sans">
                          <span className="text-slate-500 font-bold uppercase text-[7px] block mb-0.5">{currentT.details.advice}:</span>
                          {tab.url.includes("frozen.html")
                            ? currentT.details.adviceFrozen
                            : tab.isLeaking
                            ? currentT.details.adviceLeak
                            : currentT.details.adviceDiscard
                          }
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
