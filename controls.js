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
  const elLine = document.getElementById("lineDensity");
  if (elLine) { elLine.value = params.lineDensity; elLine.addEventListener("input", (e) => { params.lineDensity = parseFloat(e.target.value); regenerate(); }); }

  const elFlow = document.getElementById("flowScale");
  if (elFlow) { elFlow.value = params.flowScale; elFlow.addEventListener("input", (e) => { params.flowScale = parseFloat(e.target.value); regenerate(); }); }

  const elSteps = document.getElementById("numSteps");
  if (elSteps) { elSteps.value = params.numSteps; elSteps.addEventListener("input", (e) => { params.numSteps = parseInt(e.target.value); regenerate(); }); }

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
    elRibbonDensity.addEventListener("input", (e) => { params.ribbonDensity = parseFloat(e.target.value); params.ribbonWidth = 12 + params.ribbonDensity * 80; debouncedRibbonUpdate(); });
  }

  const elRibbonOpacity = document.getElementById("ribbonOpacity");
  if (elRibbonOpacity) { elRibbonOpacity.value = params.ribbonOpacity; elRibbonOpacity.addEventListener("input", (e) => { params.ribbonOpacity = parseFloat(e.target.value); debouncedRibbonUpdate(); }); }

  const col0 = document.getElementById("col0"), col1 = document.getElementById("col1"), col2 = document.getElementById("col2");

  // COLOR
  const createHexInput = (colorPicker, index) => {
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 7;
    input.value = params.ribbonColors[index];
    input.style.cssText = 'background: transparent; border: none; border-bottom: 0.5px solid #fff; color: #fff; font-family: Jost, sans-serif; font-size: 13px; width: 60px; padding: 2px 4px; outline: none;';
    
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

  if (col0) {
    col0.value = params.ribbonColors[0];
    col0.addEventListener("input", (e) => { params.ribbonColors[0] = e.target.value; debouncedRibbonUpdate(); });
    const wrapper = col0.closest('.color-preview');
    if (wrapper) {
      const container = document.createElement('div');
      container.style.cssText = 'display: flex; align-items: center; gap: 8px;';
      wrapper.parentNode.insertBefore(container, wrapper);
      container.appendChild(wrapper);
      container.appendChild(createHexInput(col0, 0));
    }
  }

  if (col1) {
    col1.value = params.ribbonColors[1];
    col1.addEventListener("input", (e) => { params.ribbonColors[1] = e.target.value; debouncedRibbonUpdate(); });
    const wrapper = col1.closest('.color-preview');
    if (wrapper) {
      const container = document.createElement('div');
      container.style.cssText = 'display: flex; align-items: center; gap: 8px;';
      wrapper.parentNode.insertBefore(container, wrapper);
      container.appendChild(wrapper);
      container.appendChild(createHexInput(col1, 1));
    }
  }

  if (col2) {
    col2.value = params.ribbonColors[2];
    col2.addEventListener("input", (e) => { params.ribbonColors[2] = e.target.value; debouncedRibbonUpdate(); });
    const wrapper = col2.closest('.color-preview');
    if (wrapper) {
      const container = document.createElement('div');
      container.style.cssText = 'display: flex; align-items: center; gap: 8px;';
      wrapper.parentNode.insertBefore(container, wrapper);
      container.appendChild(wrapper);
      container.appendChild(createHexInput(col2, 2));
    }
  }

  const bgWhite = document.getElementById("bgWhite"), bgBlack = document.getElementById("bgBlack"), bgPicker = document.getElementById("bgColorPicker");
  if (bgPicker) bgPicker.value = params.bgColor;
  if (bgWhite) bgWhite.addEventListener("change", (e) => { if (e.target.checked) { params.bgColor = "#ffffff"; if (bgPicker) bgPicker.value = params.bgColor; renderComposite(); } });
  if (bgBlack) bgBlack.addEventListener("change", (e) => { if (e.target.checked) { params.bgColor = "#000000"; if (bgPicker) bgPicker.value = params.bgColor; renderComposite(); } });
  if (bgPicker) bgPicker.addEventListener("input", (e) => { params.bgColor = e.target.value; if (bgWhite) bgWhite.checked = false; if (bgBlack) bgBlack.checked = false; renderComposite(); });

  // Pixel sort control
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
    psThreshold.addEventListener("input", (e) => {
      params.pixelSort.threshold = parseInt(e.target.value, 10);
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

  wireCheckboxToggle('discontinuityToggle', 'Discontinuous', 'Smooth', (group) => {
    const section = document.querySelector('#flowfield-section .section-content');
    if (section) section.insertBefore(group, section.firstChild);
  });

  wireCheckboxToggle('showFlowLines', 'Show lines', 'Hide', (group) => {
    const section = document.querySelector('#flowfield-section .section-content');
    if (section) section.insertBefore(group, section.children[1]);
  });

  (() => {
    const bgWhite = document.getElementById('bgWhite');
    const bgBlack = document.getElementById('bgBlack');
    if (!bgWhite || !bgBlack) return;

    const labA = bgWhite.closest('label');
    const labB = bgBlack.closest('label');
    if (labA) labA.style.display = 'none';
    if (labB) labB.style.display = 'none';

    const wrapper = document.createElement('label');
    wrapper.className = 'setting-title';
    wrapper.style.pointerEvents = 'none';
    wrapper.style.userSelect = 'none';
    
    const titleSpan = document.createElement('span');
    titleSpan.textContent = 'Background';
    wrapper.appendChild(titleSpan);

    const { group, a, b } = createToggleGroup('light', 'dark');
    group.style.pointerEvents = 'auto';

    const refresh = () => {
      if (bgWhite.checked) {
        a.classList.add('active');
        b.classList.remove('active');
      } else if (bgBlack.checked) {
        a.classList.remove('active');
        b.classList.add('active');
      }
    };

    a.addEventListener('click', () => { bgWhite.checked = true; bgWhite.dispatchEvent(new Event('change')); refresh(); });
    b.addEventListener('click', () => { bgBlack.checked = true; bgBlack.dispatchEvent(new Event('change')); refresh(); });
    bgWhite.addEventListener('change', refresh);
    bgBlack.addEventListener('change', refresh);

    wrapper.appendChild(group);

    const flowfieldContent = document.querySelector('#flowfield-section .section-content');
    if (flowfieldContent) flowfieldContent.appendChild(wrapper);

    refresh();
  })();

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

  (() => {
    const select = document.getElementById('exportFormat');
    if (!select) return;

    const wrapLabel = select.closest('.setting-title');
    if (wrapLabel) {
      wrapLabel.style.pointerEvents = 'none';
      wrapLabel.style.userSelect = 'none';
    }

    select.style.pointerEvents = 'none';

    const { group, a, b } = createToggleGroup('PNG', 'SVG');
    group.style.pointerEvents = 'auto';

    const refresh = () => {
      if (select.value === 'png') {
        a.classList.add('active');
        b.classList.remove('active');
      } else {
        a.classList.remove('active');
        b.classList.add('active');
      }
    };

    a.addEventListener('click', () => { select.value = 'png'; select.dispatchEvent(new Event('change')); refresh(); });
    b.addEventListener('click', () => { select.value = 'svg'; select.dispatchEvent(new Event('change')); refresh(); });
    select.addEventListener('change', refresh);

    if (wrapLabel) wrapLabel.appendChild(group);
    refresh();
  })();
}

// Exporter
const exportBtn = document.getElementById("exportBtn");
const exportFormat = document.getElementById("exportFormat");
if (exportBtn) {
exportBtn.addEventListener("click", () => {
  const format = exportFormat ? exportFormat.value : 'png';
  
  if (format === 'png') {
    saveCanvas('flowfield-export', 'png');
  }
});
}