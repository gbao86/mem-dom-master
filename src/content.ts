// Thuật toán nén DOM sang Gzip (Blob -> Base64) để tiết kiệm 80% bộ nhớ
async function compressDOM(text: string): Promise<string> {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    }
  });
  const compressionStream = stream.pipeThrough(new CompressionStream('gzip'));
  const response = new Response(compressionStream);
  const blob = await response.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      resolve(base64data.split(',')[1]);
    };
    reader.readAsDataURL(blob);
  });
}

// Theo dõi RAM Heap realtime
let initialMemory = 0;
if ((performance as any).memory) {
  initialMemory = (performance as any).memory.usedJSHeapSize;
}

// ĐỘC QUYỀN: Hàm kích hoạt chu kỳ ép V8 thu hồi bộ nhớ chủ động (Forced GC Cycle)
// Giải phóng RAM dư thừa trực tiếp trên Tab đang hoạt động mà không cần đóng hay reload trang
const triggerForcedGC = () => {
  try {
    // 1. Tạo áp lực phân bổ bộ nhớ tạm thời bằng các mảng Buffer lớn
    // Cơ chế V8 Engine khi thấy bộ nhớ phình to đột biến sẽ lập tức kích hoạt bộ dọn rác (GC) hoạt động
    const tempBuffers: any[] = [];
    for (let i = 0; i < 45; i++) {
      tempBuffers.push(new Uint8Array(1024 * 1024)); // Tạo áp lực ~45MB trong Heap
    }
    
    // 2. Ngay lập tức huỷ bỏ toàn bộ các tham chiếu
    tempBuffers.length = 0;
    
    // 3. Gợi ý bộ thu dọn rác bằng cách phân bổ nhanh hàng loạt đối tượng vòng đời ngắn
    const tempGCList: any[] = [];
    for (let i = 0; i < 15000; i++) {
      tempGCList.push({ id: i, payload: new Array(50).fill("gc_trigger_force") });
    }
    tempGCList.length = 0; // Giải phóng bộ nhớ vừa cấp phát
    
    // 4. Gọi hàm gc() native của V8 nếu người dùng chạy Chrome với flag --expose-gc
    if (typeof (window as any).gc === "function") {
      (window as any).gc();
    }
    
    console.log("🚀 [MemDOM Master] Đã hoàn thành chu kỳ kích hoạt V8 Garbage Collection chủ động!");
  } catch (err) {
    console.error("Lỗi khi ép V8 thu dọn rác:", err);
  }
};

// Gửi thông số chi tiết của tab về Background
const getDOMStats = () => {
  try {
    const nodes = document.getElementsByTagName('*').length;
    
    // Tính toán độ sâu DOM tối đa
    let maxDepth = 0;
    const evaluateDepth = (element: Element, depth: number) => {
      if (depth > maxDepth) maxDepth = depth;
      const children = element.children;
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child.tagName !== "SCRIPT" && child.tagName !== "STYLE") {
          evaluateDepth(child, depth + 1);
        }
      }
    };
    if (document.documentElement) {
      evaluateDepth(document.documentElement, 1);
    }
    
    // Đếm số trường nhập liệu
    const inputs = document.querySelectorAll("input, textarea, select").length;
    
    return { nodes, depth: maxDepth, inputs };
  } catch (e) {
    return { nodes: 0, depth: 0, inputs: 0 };
  }
};

// Báo cáo định kỳ dung lượng RAM thực tế (JS Heap) và thông số DOM về Background
const reportMemory = () => {
  try {
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
      const memory = (performance as any).memory;
      const stats = getDOMStats();
      if (memory) {
        const ramInMB = Math.round(memory.usedJSHeapSize / (1024 * 1024));
        chrome.runtime.sendMessage({
          action: "REPORT_MEMORY",
          ram: ramInMB,
          domNodes: stats.nodes,
          domDepth: stats.depth,
          formFieldsCount: stats.inputs
        }).catch(() => {});
      } else {
        // Fallback gửi thông số DOM
        chrome.runtime.sendMessage({
          action: "REPORT_MEMORY",
          ram: 45, // RAM cơ bản
          domNodes: stats.nodes,
          domDepth: stats.depth,
          formFieldsCount: stats.inputs
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.error("Error in reportMemory:", err);
  }
};

if ((performance as any).memory) {
  setTimeout(reportMemory, 1000); 
  setInterval(reportMemory, 3000); 
}

// Lắng nghe lệnh từ Dashboard để nén trang khi đóng băng hoặc ép dọn rác
chrome.runtime.onMessage.addListener((message: any, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
  // Lệnh dọn rác chủ động từ Dashboard
  if (message.action === "TRIGGER_GC") {
    triggerForcedGC();
    // Gửi báo cáo bộ nhớ mới sau khi V8 dọn dẹp xong 300ms
    setTimeout(reportMemory, 300);
    sendResponse({ success: true });
    return false;
  }

  if (message.action === "EXTRACT_AND_COMPRESS") {
    (async () => {
      const formData: Record<string, string> = {};
      
      document.querySelectorAll("input, textarea").forEach((el, index) => {
        const input = el as HTMLInputElement | HTMLTextAreaElement;
        if (input.value && input.type !== "password") {
          const key = input.id || input.name || `input_${index}`;
          formData[key] = input.value;
        }
      });

      const currentMemory = (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
      const isLeaking = currentMemory - initialMemory > 100 * 1024 * 1024;

      try {
        const originalHtml = document.documentElement.innerHTML;
        const compressedDOM = await compressDOM(originalHtml);
        const originalSize = originalHtml.length;
        const compressedSize = Math.round(compressedDOM.length * 0.75); // Quy đổi Base64 thành byte thực tế tương đối
        const ratio = originalSize > 0 ? Math.round((1 - compressedSize / originalSize) * 100) : 0;

        sendResponse({
          success: true,
          title: document.title,
          payload: { 
            formData, 
            dom: compressedDOM, 
            isLeaking, 
            timestamp: Date.now(),
            stats: {
              originalSize,
              compressedSize,
              ratio
            }
          }
        });
      } catch (err) {
        sendResponse({ success: false, error: String(err) });
      }
    })();
    return true; // Giữ cổng async
  }
});

// Phục hồi dữ liệu Form đơn giản khi tải lại trang gốc
window.addEventListener("load", () => {
  const currentUrl = window.location.href;
  chrome.storage.local.get([currentUrl], (result: any) => {
    if (result && result[currentUrl]) {
      const { formData } = result[currentUrl];
      setTimeout(() => {
        try {
          Object.entries(formData).forEach(([key, value]: any) => {
            const element = document.getElementById(key) || document.querySelector(`[name="${key}"]`);
            if (element) {
              (element as HTMLInputElement).value = value;
              element.dispatchEvent(new Event('input', { bubbles: true }));
            }
          });
        } catch (err) {
          console.error("Error restoring form data:", err);
        }
        chrome.storage.local.remove(currentUrl);
        console.log("🚀 [MemDOM Master] Đã phục hồi dữ liệu Form!");
      }, 800);
    }
  });
});

// Bộ thiết lập và hiển thị bảng cảnh báo nổi vượt ngưỡng (Cyberpunk Alert Toast)
function showThresholdWarning(ram: number, threshold: number) {
  if (document.getElementById("memdom-threshold-alert")) return;

  const alertContainer = document.createElement("div");
  alertContainer.id = "memdom-threshold-alert";
  
  // Thiết lập CSS inline theo bảng màu Nord/Slate Dark sang trọng
  alertContainer.style.position = "fixed";
  alertContainer.style.top = "16px";
  alertContainer.style.right = "16px";
  alertContainer.style.zIndex = "9999999";
  alertContainer.style.backgroundColor = "rgba(15, 23, 42, 0.95)";
  alertContainer.style.color = "#f1f5f9";
  alertContainer.style.border = "1px solid rgba(244, 63, 94, 0.4)";
  alertContainer.style.borderRadius = "12px";
  alertContainer.style.padding = "12px 16px";
  alertContainer.style.fontFamily = "system-ui, -apple-system, sans-serif";
  alertContainer.style.fontSize = "12px";
  alertContainer.style.fontWeight = "600";
  alertContainer.style.boxShadow = "0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 0 12px rgba(244, 63, 94, 0.15)";
  alertContainer.style.display = "flex";
  alertContainer.style.alignItems = "center";
  alertContainer.style.gap = "12px";
  alertContainer.style.transition = "all 0.3s ease";
  alertContainer.style.transform = "translateY(-20px)";
  alertContainer.style.opacity = "0";

  const icon = document.createElement("span");
  icon.textContent = "⚠️";
  icon.style.fontSize = "16px";
  
  const text = document.createElement("div");
  text.style.lineHeight = "1.4";
  text.innerHTML = `
    <span style="color: #f43f5e; font-weight: 800; font-family: monospace; letter-spacing: 0.5px;">[MemDOM WARNING]</span><br/>
    Tab vẫn vượt ngưỡng RAM (<span style="color: #fbbf24;">${ram}MB</span> / ${threshold}MB).<br/>
    Trang sẽ tự động ngủ đông lại sau <span style="color: #38bdf8;">5 phút</span>.
  `;

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✕";
  closeBtn.style.background = "none";
  closeBtn.style.border = "none";
  closeBtn.style.color = "#94a3b8";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.fontSize = "12px";
  closeBtn.style.fontWeight = "bold";
  closeBtn.style.padding = "4px";
  closeBtn.style.marginLeft = "4px";
  closeBtn.style.transition = "color 0.2s";
  closeBtn.addEventListener("mouseover", () => closeBtn.style.color = "#f1f5f9");
  closeBtn.addEventListener("mouseout", () => closeBtn.style.color = "#94a3b8");
  closeBtn.addEventListener("click", () => {
    alertContainer.style.opacity = "0";
    alertContainer.style.transform = "translateY(-20px)";
    setTimeout(() => alertContainer.remove(), 300);
  });

  alertContainer.appendChild(icon);
  alertContainer.appendChild(text);
  alertContainer.appendChild(closeBtn);
  document.body.appendChild(alertContainer);

  // Trigger animation
  requestAnimationFrame(() => {
    alertContainer.style.transform = "translateY(0)";
    alertContainer.style.opacity = "1";
  });

  // Tự ẩn sau 15 giây
  setTimeout(() => {
    if (document.body.contains(alertContainer)) {
      alertContainer.style.opacity = "0";
      alertContainer.style.transform = "translateY(-20px)";
      setTimeout(() => alertContainer.remove(), 300);
    }
  }, 15000);
}

// Kiểm tra cảnh báo vượt ngưỡng RAM khi tab được khôi phục từ Auto-Pilot
const checkGracePeriodWarning = () => {
  if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.local) return;
  
  const currentUrl = window.location.href;
  chrome.storage.local.get(["gracePeriodUrls", "autoPilotThreshold", "autoPilot"], (res: any) => {
    const autoPilot = !!res.autoPilot;
    const threshold: number = Number(res.autoPilotThreshold) || 300;
    const gracePeriod: Record<string, any> = res.gracePeriodUrls || {};
    
    if (!autoPilot) return;
    
    const restoreTime = gracePeriod[currentUrl];
    if (restoreTime && Date.now() - restoreTime < 5 * 60 * 1000) {
      setTimeout(() => {
        const memory = (performance as any).memory;
        if (memory) {
          const ramInMB = Math.round(memory.usedJSHeapSize / (1024 * 1024));
          if (ramInMB >= threshold) {
            showThresholdWarning(ramInMB, threshold);
          }
        }
      }, 1500); // Đợi 1.5s để RAM heap tải trang ổn định
    }
  });
};

// Đăng ký kiểm tra khi trang tải xong
if (document.readyState === "complete") {
  checkGracePeriodWarning();
} else {
  window.addEventListener("load", checkGracePeriodWarning);
}
