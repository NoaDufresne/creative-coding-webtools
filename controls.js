// sliders input handle position
function updateHandleForInput(input) {
  const wrapper = input.closest('.slider-wrapper');
  if (!wrapper) return;
  const handle = wrapper.querySelector('.slider-handle');
  if (!handle) return;
  const min = parseFloat(input.min) || 0;
  const max = parseFloat(input.max);
  const val = parseFloat(input.value);
  const pct = (isNaN(max) || max === min) ? 0 : ((val - min) / (max - min)) * 100;
  handle.style.left = pct + '%';
}

// sliders
function initSliderHandles() {
  const inputs = Array.from(document.querySelectorAll('.slider-wrapper .slider'));
  inputs.forEach((input) => {
    updateHandleForInput(input);
    input.addEventListener('input', () => updateHandleForInput(input));
    input.addEventListener('change', () => updateHandleForInput(input));
  });

  window.addEventListener('resize', () => {
    inputs.forEach(updateHandleForInput);
  });
}

function setupCollapsibleSections() {
  document.querySelectorAll('.section-title').forEach(title => {
    const section = title.closest('.sidebar-section');
    if (!section) return;

    const content = section.querySelector('.section-content');
    if (!content) return;
    if (section.id === 'flowfield-section') {
      content.classList.add('open');
      return;
    }

    const originalText = title.textContent;
    const isPixelSortSection = section.id === 'pixelsort-section';
    const isColorsSection = section.id === 'colors-section';

    title.textContent = '';

    const indicator = document.createElement('span');
    indicator.style.display = 'inline-block';
    indicator.style.minWidth = '28px';
    indicator.style.fontWeight = '200';
    indicator.style.fontFamily = 'monospace';
    indicator.style.whiteSpace = 'nowrap';
    indicator.style.marginRight = '8px';

    if (isPixelSortSection) {
      indicator.textContent = '[+]';
      content.classList.remove('open');
    } else {
      indicator.textContent = '[-]';
      content.classList.add('open');
    }

    const textSpan = document.createElement('span');
    textSpan.textContent = originalText;

    title.appendChild(indicator);
    title.appendChild(textSpan);

    title.addEventListener('click', () => {
      const isOpen = content.classList.contains('open');
      content.classList.toggle('open');
      indicator.textContent = isOpen ? '[+]' : '[-]';
      if (isPixelSortSection) {
        params.pixelSort.enabled = !isOpen;
        if (params.pixelSort.enabled) {
          startPixelSortProgress();
        } else {
          stopPixelSortProgress();
          renderComposite();
        }
      }
      if (isColorsSection) {
        params.showRibbons = !isOpen;
        debouncedRibbonUpdate();
      }
    });
  });
}

// SETUP
function setupSidebarControls() {
  // store references to the small hex text inputs next to color pickers
  if (typeof window.hexInputs === 'undefined') window.hexInputs = [null, null, null];
  const elLine = document.getElementById("lineDensity");
  if (elLine) { elLine.value = params.lineDensity; elLine.addEventListener("input", (e) => { params.lineDensity = parseFloat(e.target.value); const display = document.getElementById('lineDensity-value'); if (display) display.textContent = e.target.value; regenerate(); }); }

  const elFlow = document.getElementById("flowScale");
  if (elFlow) { 
    elFlow.value = params.flowScale; 
    const display = document.getElementById('flowScale-value');
    if (display) display.textContent = params.flowScale.toFixed(3);
    elFlow.addEventListener("input", (e) => { 
      params.flowScale = parseFloat(e.target.value); 
      if (display) display.textContent = parseFloat(e.target.value).toFixed(3);
      regenerate(); 
    }); 
  }

  const elSteps = document.getElementById("numSteps");
  if (elSteps) { 
    elSteps.value = params.numSteps; 
    const display = document.getElementById('numSteps-value');
    if (display) display.textContent = params.numSteps;
    elSteps.addEventListener("input", (e) => { 
      params.numSteps = parseInt(e.target.value); 
      if (display) display.textContent = e.target.value;
      regenerate(); 
    }); 
  }

  const discontinuityToggle = document.getElementById("discontinuityToggle");
  if (discontinuityToggle) { discontinuityToggle.checked = params.discontinuity; discontinuityToggle.addEventListener("change", (e) => { params.discontinuity = e.target.checked; regenerate(); }); }

  const showFlowLinesEl = document.getElementById("showFlowLines");
  if (showFlowLinesEl) { showFlowLinesEl.checked = params.showFlowLines; showFlowLinesEl.addEventListener("change", (e) => { params.showFlowLines = e.target.checked; redrawBaseGraphics(); }); }

  const showRibbonsCheckbox = document.getElementById("showRibbons");
  const ribbonSettings = document.getElementById("ribbon-settings");
  if (showRibbonsCheckbox) {
    showRibbonsCheckbox.checked = params.showRibbons;
    if (params.showRibbons && ribbonSettings) ribbonSettings.classList.remove("hidden");
    showRibbonsCheckbox.addEventListener("change", (e) => { params.showRibbons = e.target.checked; if (ribbonSettings) ribbonSettings.classList.toggle("hidden"); debouncedRibbonUpdate(); });
  }

  const elRibbonDensity = document.getElementById("ribbonDensity");
  if (elRibbonDensity) {
    elRibbonDensity.value = params.ribbonDensity;
    const display = document.getElementById('ribbonDensity-value');
    if (display) display.textContent = params.ribbonDensity.toFixed(2);
    elRibbonDensity.addEventListener("input", (e) => { 
      params.ribbonDensity = parseFloat(e.target.value); 
      params.ribbonWidth = 12 + params.ribbonDensity * 80; 
      if (display) display.textContent = parseFloat(e.target.value).toFixed(2);
      debouncedRibbonUpdate(); 
    });
  }

  const elRibbonOpacity = document.getElementById("ribbonOpacity");
  if (elRibbonOpacity) { 
    elRibbonOpacity.value = params.ribbonOpacity; 
    const display = document.getElementById('ribbonOpacity-value');
    if (display) display.textContent = params.ribbonOpacity;
    elRibbonOpacity.addEventListener("input", (e) => { 
      params.ribbonOpacity = parseFloat(e.target.value); 
      if (display) display.textContent = e.target.value;
      debouncedRibbonUpdate(); 
    }); 
  }

  const col0 = document.getElementById("col0"), col1 = document.getElementById("col1"), col2 = document.getElementById("col2");

  // COLOR
  const createHexInput = (colorPicker, index) => {
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 7;
    input.value = params.ribbonColors[index];
    input.style.cssText = 'background: transparent; border: none; border-bottom: 0.5px solid #fff; color: #fff; font-family: "JetBrains Mono NL", Jost, sans-serif; font-size: 13px; width: 86px; padding: 2px 4px; outline: none;';
    
    input.addEventListener('input', (e) => {
      let val = e.target.value;
      if (!val.startsWith('#')) val = '#' + val;
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        params.ribbonColors[index] = val;
        colorPicker.value = val;
        debouncedRibbonUpdate();
      }
    });
    
    colorPicker.addEventListener('input', (e) => {
      input.value = e.target.value;
    });
    
    return input;
  };

  const ensureRibbonEnabled = () => {
    if (!Array.isArray(params.ribbonEnabled) || params.ribbonEnabled.length < 3) {
      params.ribbonEnabled = [true, true, true];
    }
  };

  const setupColorRow = (colorPicker, index) => {
    if (!colorPicker) return;
    ensureRibbonEnabled();
    colorPicker.value = params.ribbonColors[index];
    colorPicker.addEventListener("input", (e) => { params.ribbonColors[index] = e.target.value; debouncedRibbonUpdate(); });

    const wrapper = colorPicker.closest('.color-preview');
    if (!wrapper) return;

    const row = document.createElement('div');
    row.className = 'color-row';

    const eyeBtn = document.createElement('button');
    eyeBtn.type = 'button';
    eyeBtn.className = 'color-eye-btn';
    const eyeIcon = document.createElement('img');
    eyeIcon.alt = 'toggle color visibility';
    eyeIcon.draggable = false;
    eyeBtn.appendChild(eyeIcon);

    const syncIcon = () => {
      const visible = params.ribbonEnabled[index] !== false;
      eyeIcon.src = visible ? 'images/hide.svg' : 'images/show.svg';
      eyeBtn.classList.toggle('is-off', !visible);
    };

    eyeBtn.addEventListener('click', () => {
      ensureRibbonEnabled();
      const next = params.ribbonEnabled[index] === false ? true : false;
      params.ribbonEnabled[index] = next ? true : false;
      syncIcon();
      debouncedRibbonUpdate();
    });

    const hexInput = createHexInput(colorPicker, index);

    const parent = wrapper.parentNode;
    if (parent) parent.insertBefore(row, wrapper);
    row.appendChild(wrapper);
    row.appendChild(hexInput);
    row.appendChild(eyeBtn);

    window.hexInputs[index] = hexInput;
    syncIcon();
  };

  setupColorRow(col0, 0);
  setupColorRow(col1, 1);
  setupColorRow(col2, 2);

  const bgWhite = document.getElementById("bgWhite"), bgBlack = document.getElementById("bgBlack"), bgPicker = document.getElementById("bgColorPicker");
  if (bgPicker) bgPicker.value = params.bgColor;
  if (bgWhite) bgWhite.addEventListener("change", (e) => { if (e.target.checked) { params.bgColor = "#ffffff"; if (bgPicker) bgPicker.value = params.bgColor; renderComposite(); } });
  if (bgBlack) bgBlack.addEventListener("change", (e) => { if (e.target.checked) { params.bgColor = "#000000"; if (bgPicker) bgPicker.value = params.bgColor; renderComposite(); } });
  if (bgPicker) bgPicker.addEventListener("input", (e) => { params.bgColor = e.target.value; if (bgWhite) bgWhite.checked = false; if (bgBlack) bgBlack.checked = false; renderComposite(); });

  // pixel sort control
  const psAxis = document.getElementById("pixelSortAxis");
  if (psAxis) {
    psAxis.value = params.pixelSort.axis;
    psAxis.addEventListener("change", (e) => {
      params.pixelSort.axis = e.target.value;
      if (params.pixelSort.enabled) startPixelSortProgress();
    });
  }

  const psThreshold = document.getElementById("pixelSortThreshold");
  if (psThreshold) {
    psThreshold.value = params.pixelSort.threshold;
    const display = document.getElementById('pixelSortThreshold-value');
    if (display) display.textContent = params.pixelSort.threshold;
    psThreshold.addEventListener("input", (e) => {
      params.pixelSort.threshold = parseInt(e.target.value, 10);
      if (display) display.textContent = e.target.value;
      if (params.pixelSort.enabled) startPixelSortProgress();
    });
  }

  const regenBtn = document.getElementById("regenBtn");
  if (regenBtn) regenBtn.addEventListener("click", regenerate);
}

// text toggles
function setupTextToggles() {
  function createToggleGroup(buttonAText, buttonBText) {
    const group = document.createElement('div');
    group.className = 'toggle-group';
    const a = document.createElement('button');
    const b = document.createElement('button');
    a.type = b.type = 'button';
    a.className = 'toggle-btn';
    b.className = 'toggle-btn';
    a.textContent = buttonAText;
    b.textContent = buttonBText;
    group.appendChild(a);
    group.appendChild(b);
    return { group, a, b };
  }

  function wireCheckboxToggle(inputId, buttonAText, buttonBText, insertLocation) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const label = input.closest('label');
    if (label) label.style.display = 'none';

    const { group, a, b } = createToggleGroup(buttonAText, buttonBText);

    const refresh = () => {
      if (input.checked) {
        a.classList.add('active');
        b.classList.remove('active');
      } else {
        a.classList.remove('active');
        b.classList.add('active');
      }
    };

    a.addEventListener('click', () => { input.checked = true; input.dispatchEvent(new Event('change')); refresh(); });
    b.addEventListener('click', () => { input.checked = false; input.dispatchEvent(new Event('change')); refresh(); });
    input.addEventListener('change', refresh);

    insertLocation(group);
    refresh();
  }

  // Create container for toggle settings group
  const toggleSettingsGroup = document.createElement('div');
  toggleSettingsGroup.className = 'toggle-settings-group';

  wireCheckboxToggle('discontinuityToggle', 'Discontinuous', 'Smooth', (group) => {
    // Wrap in setting-title structure
    const wrapper = document.createElement('div');
    wrapper.className = 'setting-title';
    
    const titleSpan = document.createElement('span');
    titleSpan.textContent = 'Line type';
    
    // Add help icon
    const helpIcon = document.createElement('button');
    helpIcon.className = 'help-icon';
    helpIcon.setAttribute('data-help', 'line-type');
    helpIcon.textContent = '?';
    helpIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      const settingModal = document.getElementById('settingModal');
      if (settingModal) {
        document.getElementById('settingModalTitle').textContent = 'Line Type';
        document.getElementById('settingModalDescription').textContent = 'Discontinuous creates angular, segmented paths by quantizing the flow field angles into discrete steps, resulting in sharp geometric patterns. Smooth creates flowing organic curves by following the continuous Perlin noise field without quantization.';
        settingModal.classList.add('open');
      }
    });
    titleSpan.appendChild(helpIcon);
    
    wrapper.appendChild(titleSpan);
    wrapper.appendChild(group);
    
    toggleSettingsGroup.appendChild(wrapper);
  });

  wireCheckboxToggle('showFlowLines', 'Show', 'Hide', (group) => {
    // Wrap in setting-title structure
    const wrapper = document.createElement('div');
    wrapper.className = 'setting-title';
    
    const titleSpan = document.createElement('span');
    titleSpan.textContent = 'Show lines';
    wrapper.appendChild(titleSpan);
    wrapper.appendChild(group);
    
    toggleSettingsGroup.appendChild(wrapper);
  });

  (() => {
    const bgWhite = document.getElementById('bgWhite');
    const bgBlack = document.getElementById('bgBlack');
    if (!bgWhite || !bgBlack) return;

    const labA = bgWhite.closest('label');
    const labB = bgBlack.closest('label');
    if (labA) labA.style.display = 'none';
    if (labB) labB.style.display = 'none';

    const wrapper = document.createElement('div');
    wrapper.className = 'setting-title';
    
    const titleSpan = document.createElement('span');
    titleSpan.textContent = 'Background';
    wrapper.appendChild(titleSpan);

    const { group, a, b } = createToggleGroup('Light', 'Dark');

    const refresh = () => {
      if (bgWhite.checked) {
        a.classList.add('active');
        b.classList.remove('active');
      } else if (bgBlack.checked) {
        a.classList.remove('active');
        b.classList.add('active');
      } else {
        a.classList.add('active');
        b.classList.remove('active');
      }
    };

    a.addEventListener('click', () => {
      bgWhite.checked = true;
      bgBlack.checked = false;
      bgWhite.dispatchEvent(new Event('change'));
      bgBlack.dispatchEvent(new Event('change'));
      refresh();
    });

    b.addEventListener('click', () => {
      bgBlack.checked = true;
      bgWhite.checked = false;
      bgBlack.dispatchEvent(new Event('change'));
      bgWhite.dispatchEvent(new Event('change'));
      refresh();
    });

    bgWhite.addEventListener('change', refresh);
    bgBlack.addEventListener('change', refresh);

    wrapper.appendChild(group);
    toggleSettingsGroup.appendChild(wrapper);

    refresh();
  })();

  const flowfieldContent = document.querySelector('#flowfield-section .section-content');
  if (flowfieldContent) {
    const thirdSlider = flowfieldContent.children[2];
    if (thirdSlider && thirdSlider.nextSibling) {
      flowfieldContent.insertBefore(toggleSettingsGroup, thirdSlider.nextSibling);
    } else {
      flowfieldContent.appendChild(toggleSettingsGroup);
    }
  }

  (() => {
    const select = document.getElementById('pixelSortAxis');
    if (!select) return;

    const wrapLabel = select.closest('.setting-title');
    if (wrapLabel) {
      wrapLabel.style.pointerEvents = 'none';
      wrapLabel.style.userSelect = 'none';

      Array.from(wrapLabel.childNodes).forEach(n => {
        if (n.nodeType === 3) n.remove();
      });

      const directionSpan = wrapLabel.querySelector('span');
      if (directionSpan) {
        directionSpan.style.marginRight = '12px';
      }
    }

    select.style.pointerEvents = 'none';

    const { group, a, b } = createToggleGroup('Horizontal', 'Vertical');
    group.style.pointerEvents = 'auto';

    const refresh = () => {
      if (select.value === 'horizontal') {
        a.classList.add('active');
        b.classList.remove('active');
      } else {
        a.classList.remove('active');
        b.classList.add('active');
      }
    };

    a.addEventListener('click', () => { select.value = 'horizontal'; select.dispatchEvent(new Event('change')); refresh(); });
    b.addEventListener('click', () => { select.value = 'vertical'; select.dispatchEvent(new Event('change')); refresh(); });
    select.addEventListener('change', refresh);

    if (wrapLabel) wrapLabel.appendChild(group);
    refresh();
  })();
}

const exportBtn = document.getElementById("exportBtn");
if (exportBtn) {
  exportBtn.addEventListener("click", () => {
    const transparentCheckbox = document.getElementById("transparentExport");
    const useTransparent = transparentCheckbox && transparentCheckbox.checked;
    exportFlowfield(useTransparent);
  });
}

window.addEventListener('keydown', (e) => {
  const key = (e.key || '').toLowerCase();
  const isSave = key === 's';
  const metaOrCtrl = e.metaKey || e.ctrlKey;
  if (metaOrCtrl && isSave) {
    e.preventDefault();
    const transparentCheckbox = document.getElementById("transparentExport");
    const useTransparent = transparentCheckbox && transparentCheckbox.checked;
    exportFlowfield(useTransparent);
    if (exportBtn) {
      exportBtn.classList.add('active-shortcut');
      setTimeout(() => exportBtn.classList.remove('active-shortcut'), 160);
    }
  }
});

const randomizeBtn = document.getElementById('randomizeColors');
if (randomizeBtn) {
  randomizeBtn.addEventListener('click', () => {
    const randomColor = () => '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    params.ribbonColors[0] = randomColor();
    params.ribbonColors[1] = randomColor();
    params.ribbonColors[2] = randomColor();
    if (col0) col0.value = params.ribbonColors[0];
    if (col1) col1.value = params.ribbonColors[1];
    if (col2) col2.value = params.ribbonColors[2];
    if (window.hexInputs && window.hexInputs[0]) window.hexInputs[0].value = params.ribbonColors[0];
    if (window.hexInputs && window.hexInputs[1]) window.hexInputs[1].value = params.ribbonColors[1];
    if (window.hexInputs && window.hexInputs[2]) window.hexInputs[2].value = params.ribbonColors[2];
    debouncedRibbonUpdate();
  });
}

const aboutLink = document.getElementById('aboutLink');
const infoModal = document.getElementById('infoModal');
const settingModal = document.getElementById('settingModal');

const helpContent = {
  'flow-scale': {
    title: 'Flow Scale',
    description: 'Controls the "zoom" level of the Perlin noise pattern that guides the flow lines. Lower values (0.006–0.02) create finer, more chaotic patterns with tight curves. Higher values (0.04–0.06) create broader, smoother, wave-like flows.'
  },
  'steps': {
    title: 'Steps',
    description: 'Determines how many steps each flow line takes through the field, controlling line length. Higher values create longer, more intricate paths that flow across the entire canvas. Lower values produce shorter, simpler line segments.'
  },
  'threshold': {
    title: 'Pixel Sort Threshold',
    description: 'Sets the brightness level at which pixels get sorted. Lower values (0–50) sort more pixels creating dramatic glitch effects. Higher values (150–200) sort fewer pixels for subtle distortion. At maximum, almost no pixels are sorted.'
  },
  'line-type': {
    title: 'Line Type',
    description: 'Discontinuous creates angular, segmented paths by quantizing the flow field angles into discrete steps, resulting in sharp geometric patterns. Smooth creates flowing organic curves by following the continuous Perlin noise field without quantization.'
  }
};

if (aboutLink && infoModal) {
  aboutLink.addEventListener('click', () => {
    infoModal.classList.add('open');
  });
  aboutLink.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); infoModal.classList.add('open'); } });
}

document.querySelectorAll('.help-icon').forEach(icon => {
  icon.addEventListener('click', (e) => {
    e.stopPropagation();
    const helpKey = icon.getAttribute('data-help');
    const content = helpContent[helpKey];
    
    if (content && settingModal) {
      document.getElementById('settingModalTitle').textContent = content.title;
      document.getElementById('settingModalDescription').textContent = content.description;
      settingModal.classList.add('open');
    }
  });
});

document.querySelectorAll('.info-modal-close').forEach(closeBtn => {
  closeBtn.addEventListener('click', () => {
    infoModal?.classList.remove('open');
    settingModal?.classList.remove('open');
  });
});

document.querySelectorAll('.info-modal').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('open');
    }
  });
});

(function(){
  const container = document.querySelector('.container');
  const sidebar = document.getElementById('sidebar');
  const resizer = document.querySelector('.sidebar-resizer');
  const sideBtn = document.getElementById('sidebarSideBtn');
  if (!container || !sidebar || !resizer || !sideBtn) return;

  const MIN_W = 180, MAX_W = 720;

  const savedW = localStorage.getItem('sidebarWidth');
  if (savedW) sidebar.style.width = savedW + 'px';
  const savedSide = localStorage.getItem('sidebarSide');
  if (savedSide === 'left') container.classList.add('sidebar-left');

  const sideIcon = document.getElementById('sidebarSideIcon');
  if (sideIcon) sideIcon.src = container.classList.contains('sidebar-left') ? 'images/sidebar-left.svg' : 'images/sidebar-right.svg';

  let dragging = false;

  function getClientX(e){ return e.touches ? e.touches[0].clientX : e.clientX; }

  function onMove(e){
    if (!dragging) return;
    const rect = container.getBoundingClientRect();
    const x = getClientX(e);
    const isLeft = container.classList.contains('sidebar-left');
    let newW = isLeft ? (x - rect.left) : (rect.right - x);
    newW = Math.max(MIN_W, Math.min(MAX_W, Math.round(newW)));
    sidebar.style.width = newW + 'px';
  }

  function stopDrag(){
    if (!dragging) return;
    dragging = false;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('mouseup', stopDrag);
    document.removeEventListener('touchend', stopDrag);
    document.body.classList.remove('resizing');
    localStorage.setItem('sidebarWidth', parseInt(sidebar.style.width||getComputedStyle(sidebar).width,10));
  }

  resizer.addEventListener('mousedown', (e)=>{ dragging = true; document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', stopDrag); document.body.classList.add('resizing'); e.preventDefault(); });
  resizer.addEventListener('touchstart', (e)=>{ dragging = true; document.addEventListener('touchmove', onMove, {passive:false}); document.addEventListener('touchend', stopDrag); document.body.classList.add('resizing'); e.preventDefault(); });

  sideBtn.addEventListener('click', ()=>{
    const isLeft = container.classList.toggle('sidebar-left');
    localStorage.setItem('sidebarSide', isLeft ? 'left' : 'right');
    if (sideIcon) sideIcon.src = isLeft ? 'images/sidebar-left.svg' : 'images/sidebar-right.svg';
  });
})();