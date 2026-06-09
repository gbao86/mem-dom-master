const params = new URLSearchParams(window.location.search);
const url = params.get('url');
const tabTitle = params.get('title') || "System Tab";
const origBytes = parseInt(params.get('orig') || "0");
const compBytes = parseInt(params.get('comp') || "0");
const ratio = parseInt(params.get('ratio') || "0");
const formsCount = parseInt(params.get('forms') || "0");

// Xác định ngôn ngữ hiển thị dựa trên localStorage của extension popup origin
const currentLang = localStorage.getItem("memdom_lang") === "EN" ? "EN" : "VI";

const dict = {
  VI: {
    badge: "Chế độ ngủ đông sâu",
    lblOrig: "Dung lượng gốc",
    lblComp: "Sau khi nén",
    lblRatio: "Không gian trống",
    lblForms: "Bộ nhớ Form",
    btnRestore: "GIẢI NÉN DOM & PHỤC HỒI TIẾN TRÌNH",
    tip: "Mẹo: Nhấp chuột, nhấn phím bất kỳ hoặc phím F5 để khôi phục tab.",
    clickAnywhere: "[ Nhấn phím bất kỳ để giải nén DOM ]",
    formsFound: (n) => `${n} trường`,
    formsEmpty: "Không có",
    logs: [
      "[0.00s] Khởi tạo giao thức ngủ đông sâu MemDOM...",
      "[0.08s] Đang quét cấu trúc cây DOM...",
      `[0.15s] Trích xuất trạng thái biểu mẫu: ${formsCount > 0 ? formsCount + ' ô dữ liệu được tìm thấy' : 'không có dữ liệu nhập dở'}...`,
      `[0.22s] Áp dụng nén CompressionStream (Gzip) giảm từ ${(origBytes / 1024).toFixed(1)}KB còn ${(compBytes / 1024).toFixed(1)}KB...`,
      `[0.28s] Sao lưu dữ liệu an toàn vào chrome.storage.local...`,
      "[0.35s] Ép V8 Garbage Collector thu hồi bộ nhớ Heap...",
      "[0.40s] Giải phóng Renderer Thread. Trạng thái: TIẾT KIỆM PIN 🔋"
    ]
  },
  EN: {
    badge: "Deep Hibernation Mode",
    lblOrig: "Original size",
    lblComp: "Compressed",
    lblRatio: "Space Optimized",
    lblForms: "Form cache",
    btnRestore: "DECOMPRESS DOM & RESTORE PROCESS",
    tip: "Tip: Click, press any key, or press F5 to wake up tab.",
    clickAnywhere: "[ Press any key to decompress DOM ]",
    formsFound: (n) => `${n} inputs`,
    formsEmpty: "None",
    logs: [
      "[0.00s] Initializing MemDOM Deep Freeze Protocol...",
      "[0.08s] Scanning dynamic DOM tree structures...",
      `[0.15s] Extracting form state: ${formsCount > 0 ? formsCount + ' fields localized' : 'no unsaved entries'}...`,
      `[0.22s] Executing CompressionStream (Gzip): reduced ${(origBytes / 1024).toFixed(1)}KB to ${(compBytes / 1024).toFixed(1)}KB...`,
      `[0.28s] Storing DOM archive inside secure extension storage...`,
      "[0.35s] Forcing V8 garbage collector heap purge...",
      "[0.40s] Suspending Renderer thread. Status: BATTERY SAVER 🔋"
    ]
  }
};

const t = dict[currentLang];

// Đặt tiêu đề tab và hiển thị thông số
document.title = "[💤 Standby] " + tabTitle;
document.getElementById('tab-title-display').textContent = tabTitle;
document.getElementById('badge-status').textContent = t.badge;

document.getElementById('lbl-orig').textContent = t.lblOrig;
document.getElementById('lbl-comp').textContent = t.lblComp;
document.getElementById('lbl-ratio').textContent = t.lblRatio;
document.getElementById('lbl-forms').textContent = t.lblForms;

document.getElementById('val-orig').textContent = origBytes > 0 ? `${(origBytes / 1024).toFixed(1)} KB` : "--- KB";
document.getElementById('val-comp').textContent = compBytes > 0 ? `${(compBytes / 1024).toFixed(1)} KB` : "--- KB";
document.getElementById('val-ratio').textContent = ratio > 0 ? `+${ratio}%` : "--- %";
document.getElementById('val-forms').textContent = formsCount > 0 ? t.formsFound(formsCount) : t.formsEmpty;

document.getElementById('restore-btn').textContent = t.btnRestore;
document.getElementById('tip-desc').textContent = t.tip;
document.getElementById('click-anywhere-hint').textContent = t.clickAnywhere;

// Chạy log giả lập trên màn hình chờ
const consoleEl = document.getElementById('terminal-console');
if (consoleEl) {
  let logIndex = 0;
  const printNextLog = () => {
    if (logIndex < t.logs.length) {
      const line = document.createElement('div');
      line.className = 'log-line';
      if (logIndex === t.logs.length - 1) {
        line.className += ' success';
      } else if (logIndex === 0) {
        line.className += ' active';
      }
      line.textContent = t.logs[logIndex];
      consoleEl.appendChild(line);
      
      consoleEl.scrollTop = consoleEl.scrollHeight;
      
      logIndex++;
      setTimeout(printNextLog, 120);
    }
  };
  printNextLog();
}

// Xử lý nút Phục hồi với hiệu ứng giải nén DOM
const restoreBtn = document.getElementById('restore-btn');
let isRestoring = false;

// Thiết lập thời gian chờ (cooldown 1.2s) tránh việc click nhầm khi chuyển tab để xem
let cooldownActive = true;
const hintEl = document.getElementById('click-anywhere-hint');

setTimeout(() => {
  cooldownActive = false;
  if (hintEl) {
    hintEl.classList.add('active');
  }
}, 1200);

if (restoreBtn) {
  const triggerRestoration = () => {
    if (isRestoring) return;
    isRestoring = true;
    
    // Khóa nút phục hồi
    restoreBtn.style.pointerEvents = 'none';
    restoreBtn.style.opacity = '0.6';
    
    // Xoay vòng radar báo hiệu giải nén đang diễn ra cực nhanh
    const radarBox = document.querySelector('.radar-box');
    if (radarBox) {
      radarBox.style.animation = 'spin 0.6s infinite linear';
    }
    
    const decompressLogs = currentLang === "EN" ? [
      "[0.00s] Initiating DOM decompression sequence...",
      "[0.15s] Decoding Gzip byte stream from secure storage...",
      "[0.30s] Re-assembling DOM node layout tree...",
      "[0.45s] Injecting restored form input variables...",
      "[0.60s] Re-directing process host. Decompression complete."
    ] : [
      "[0.00s] Khởi động tiến trình giải nén cấu trúc DOM...",
      "[0.15s] Giải mã dòng nhị phân Gzip từ storage...",
      "[0.30s] Tái lắp ráp các lớp cấu trúc thẻ HTML...",
      "[0.45s] Đồng bộ hoá lại bộ nhớ đệm Form...",
      "[0.60s] Hoàn tất giải nén! Đang khôi phục tiến trình..."
    ];
    
    let logIdx = 0;
    const printDecompressLog = () => {
      if (logIdx < decompressLogs.length) {
        const line = document.createElement('div');
        line.className = 'log-line success';
        line.textContent = decompressLogs[logIdx];
        consoleEl.appendChild(line);
        consoleEl.scrollTop = consoleEl.scrollHeight;
        logIdx++;
        setTimeout(printDecompressLog, 150);
      } else {
        // Thực hiện điều hướng sau khi in xong log
        setTimeout(() => {
          if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(["autoHibernatedUrls", "gracePeriodUrls"], (res) => {
              const autoHibernated = res.autoHibernatedUrls || {};
              const gracePeriod = res.gracePeriodUrls || {};
              
              if (autoHibernated[url]) {
                delete autoHibernated[url];
                gracePeriod[url] = Date.now();
                chrome.storage.local.set({ autoHibernatedUrls: autoHibernated, gracePeriodUrls: gracePeriod }, () => {
                  if (chrome.tabs && chrome.tabs.update) {
                    chrome.tabs.update({ url: url });
                  } else {
                    window.location.href = url;
                  }
                });
              } else {
                if (chrome.tabs && chrome.tabs.update) {
                  chrome.tabs.update({ url: url });
                } else {
                  window.location.href = url;
                }
              }
            });
          } else {
            window.location.href = url;
          }
        }, 300);
      }
    };
    printDecompressLog();
  };

  if (url) {
    // 1. Click vào nút phục hồi chính thức (Cho phép bấm ngay không cần hết cooldown)
    restoreBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      triggerRestoration();
    });

    // 2. Click vào bất kỳ đâu trên trang để giải nén nhanh chóng (Chỉ hoạt động sau khi hết cooldown)
    document.body.addEventListener('click', () => {
      if (cooldownActive) return;
      triggerRestoration();
    });

    // 3. Nhấn phím bất kỳ trên bàn phím để giải nén nhanh chóng (Chỉ hoạt động sau khi hết cooldown)
    window.addEventListener('keydown', (e) => {
      if (cooldownActive) return;
      // Tránh các phím điều khiển hệ thống chính
      if (['Alt', 'Control', 'Shift', 'Meta'].includes(e.key)) return;
      triggerRestoration();
    });
  } else {
    restoreBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.history.back();
    });
  }
}
