// Imports removed for standard script loading
// import { VehicleModel, vehiclePresets } from './VehicleModel.js';
// import { SimulationEngine } from './SimulationEngine.js';
// import { Renderer } from './Renderer.js';

// --- Global Variables ---
let calibrationState = 'none'; // 'none', 'point1', 'point2'
let calPoint1 = null;
let calPoint2 = null;
let currentMousePos = null;
let interactionMode = 'draw'; // 'draw', 'pan'
let isPanning = false;
let lastPanPos = { x: 0, y: 0 };

// --- Main Logic ---

// Since this is a module, it is deferred by default and runs after parsing.
// We can access DOM elements directly.

const canvas = document.getElementById('mainCanvas');
const renderer = new Renderer(canvas);
const vehicle = new VehicleModel();
const engine = new SimulationEngine();

let paths = []; // Array of path arrays
let currentPath = [];
let isDrawing = false;

// Background & Calibration Globals
let bgImageElement = null;
// bgMetersPerPixel is now in renderer, but we might need to update it
// renderer.bgMetersPerPixel = 0.05; // Default

const inputs = {
    // Toolbar
    drawBtn: document.getElementById('drawBtn'),
    panBtn: document.getElementById('panBtn'),
    toggleVehiclePanelBtn: document.getElementById('toggleVehiclePanelBtn'),
    toggleBgPanelBtn: document.getElementById('toggleBgPanelBtn'),
    undoBtn: document.getElementById('undoBtn'),
    clearBtn: document.getElementById('clearBtn'),
    exportDxfBtn: document.getElementById('exportDxfBtn'),

    // Panels
    vehiclePanel: document.getElementById('vehicle-panel'),
    backgroundPanel: document.getElementById('background-panel'),
    closeVehiclePanelBtn: document.getElementById('closeVehiclePanelBtn'),
    closeBgPanelBtn: document.getElementById('closeBgPanelBtn'),

    // Controls
    vehiclePreset: document.getElementById('vehiclePreset'),
    poleLengthGroup: document.getElementById('poleLengthGroup'),
    poleLengthInput: document.getElementById('poleLengthInput'),
    poleLengthVal: document.getElementById('poleLengthVal'),
    drawIntervalInput: document.getElementById('drawIntervalInput'),
    openSettingsBtn: document.getElementById('openSettingsBtn'),
    bgFileInput: document.getElementById('bgFileInput'),
    bgOpacity: document.getElementById('bgOpacity'),
    calibrateBtn: document.getElementById('calibrateBtn'),
    calibrationStatus: document.getElementById('calibrationStatus'),

    // Modal
    settingsModal: document.getElementById('settingsModal'),
    closeModalBtn: document.querySelector('.close'),
    saveSettingsBtn: document.getElementById('saveSettingsBtn'),
    cancelSettingsBtn: document.getElementById('cancelSettingsBtn'),

    // Modal Inputs
    m_width: document.getElementById('m_width'),
    m_wheelbase: document.getElementById('m_wheelbase'),
    m_overhangFront: document.getElementById('m_overhangFront'),
    m_overhangRear: document.getElementById('m_overhangRear'),
    m_maxSteering: document.getElementById('m_maxSteering'),
    m_tractorAxles: document.getElementById('m_tractorAxles'),

    m_hasTrailer: document.getElementById('m_hasTrailer'),
    m_trailerWheelbase: document.getElementById('m_trailerWheelbase'),
    m_trailerWidth: document.getElementById('m_trailerWidth'),
    m_trailerOverhangRear: document.getElementById('m_trailerOverhangRear'),
    m_trailerOverhangFront: document.getElementById('m_trailerOverhangFront'),
    m_hitchOffset: document.getElementById('m_hitchOffset'),
    m_trailerAxles: document.getElementById('m_trailerAxles'),
    m_trailerParams: document.getElementById('m_trailerParams'),
    m_isPoleTrailer: document.getElementById('m_isPoleTrailer'),

    modalPreset: document.getElementById('modalPreset'),

    // Calibration Modal
    calibrationModal: document.getElementById('calibrationModal'),
    calDistanceInput: document.getElementById('calDistanceInput'),
    calOkBtn: document.getElementById('calOkBtn'),
    calCancelBtn: document.getElementById('calCancelBtn'),
};

// --- Toolbar Logic ---
function setMode(mode) {
    interactionMode = mode;
    inputs.drawBtn.classList.remove('active');
    inputs.panBtn.classList.remove('active');

    if (mode === 'draw') {
        inputs.drawBtn.classList.add('active');
        canvas.style.cursor = 'crosshair';
    } else if (mode === 'pan') {
        inputs.panBtn.classList.add('active');
        canvas.style.cursor = 'grab';
    }
}

inputs.drawBtn.addEventListener('click', () => setMode('draw'));
inputs.panBtn.addEventListener('click', () => setMode('pan'));

// Toggle Panels
function togglePanel(panel, btn) {
    const isHidden = panel.style.display === 'none' || panel.style.display === '';
    // Close all
    inputs.vehiclePanel.style.display = 'none';
    inputs.backgroundPanel.style.display = 'none';
    inputs.toggleVehiclePanelBtn.classList.remove('active');
    inputs.toggleBgPanelBtn.classList.remove('active');

    if (isHidden) {
        panel.style.display = 'block';
        btn.classList.add('active');
    }
}

inputs.toggleVehiclePanelBtn.addEventListener('click', () => {
    togglePanel(inputs.vehiclePanel, inputs.toggleVehiclePanelBtn);
});

inputs.toggleBgPanelBtn.addEventListener('click', () => {
    togglePanel(inputs.backgroundPanel, inputs.toggleBgPanelBtn);
});

inputs.closeVehiclePanelBtn.addEventListener('click', () => {
    inputs.vehiclePanel.style.display = 'none';
    inputs.toggleVehiclePanelBtn.classList.remove('active');
});

inputs.closeBgPanelBtn.addEventListener('click', () => {
    inputs.backgroundPanel.style.display = 'none';
    inputs.toggleBgPanelBtn.classList.remove('active');
});

// Click outside to close panels
document.addEventListener('click', (e) => {
    // Vehicle Panel
    if (inputs.vehiclePanel.style.display === 'block') { // Changed from flex to block/none check
        // Note: In CSS it might be block or flex, but togglePanel sets it to block.
        if (!inputs.vehiclePanel.contains(e.target) && !inputs.toggleVehiclePanelBtn.contains(e.target)) {
            inputs.vehiclePanel.style.display = 'none';
            inputs.toggleVehiclePanelBtn.classList.remove('active');
        }
    }
    // Background Panel
    if (inputs.backgroundPanel.style.display === 'block') {
        if (!inputs.backgroundPanel.contains(e.target) && !inputs.toggleBgPanelBtn.contains(e.target)) {
            inputs.backgroundPanel.style.display = 'none';
            inputs.toggleBgPanelBtn.classList.remove('active');
        }
    }
});

// --- Calibration Modal Logic ---
let tempDistImagePixels = 0;

inputs.calOkBtn.addEventListener('click', () => {
    const realDist = parseFloat(inputs.calDistanceInput.value);
    if (realDist > 0 && tempDistImagePixels > 0) {
        renderer.bgMetersPerPixel = realDist / tempDistImagePixels;
        alert(`尺度を調整しました(Scale updated): 1px = ${renderer.bgMetersPerPixel.toFixed(4)} m`);
        closeCalibrationModal();
    } else {
        alert("有効な数値を入力してください (Invalid number)");
    }
});

inputs.calCancelBtn.addEventListener('click', () => {
    closeCalibrationModal();
});

function closeCalibrationModal() {
    inputs.calibrationModal.style.display = 'none';
    calibrationState = 'none';
    calPoint1 = null;
    calPoint2 = null;
    inputs.calibrationStatus.classList.add('hidden');

    // Restore cursor based on mode
    setMode(interactionMode);

    update();
}

// --- Background & Calibration Logic ---

inputs.bgFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type === 'application/pdf') {
        const fileReader = new FileReader();
        fileReader.onload = async function () {
            const typedarray = new Uint8Array(this.result);
            // pdfjsLib is global from script tag
            const pdf = await window.pdfjsLib.getDocument(typedarray).promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 2.0 }); // High res

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport: viewport }).promise;

            bgImageElement = new Image();
            bgImageElement.onload = () => {
                renderer.setBackground(bgImageElement);
                renderer.bgMetersPerPixel = 0.05;
                update();
            };
            bgImageElement.src = canvas.toDataURL();
        };
        fileReader.readAsArrayBuffer(file);
    } else {
        const fileReader = new FileReader();
        fileReader.onload = function (e) {
            bgImageElement = new Image();
            bgImageElement.onload = () => {
                renderer.setBackground(bgImageElement);
                renderer.bgMetersPerPixel = 0.05;
                update();
            };
            bgImageElement.src = e.target.result;
        };
        fileReader.readAsDataURL(file);
    }
});

inputs.bgOpacity.addEventListener('input', (e) => {
    renderer.bgOpacity = parseFloat(e.target.value);
    update();
});

inputs.calibrateBtn.addEventListener('click', () => {
    try {
        console.log("Calibrate button clicked");
        if (!bgImageElement) {
            alert('先に背景画像を読み込んでください (Please load a background first)');
            return;
        }
        calibrationState = 'point1';
        loadModalValues(); // Why load modal values here? Maybe mistake in original code, but harmless.
        // drawPreview(); // Not needed for calibration
        inputs.calibrationStatus.classList.remove('hidden');
        inputs.calibrationStatus.textContent = "図面上の点Aをクリックしてください (1/2)";
        canvas.style.cursor = 'default'; // Use arrow cursor for calibration
    } catch (e) {
        alert("Calibrate Error: " + e.message);
        console.error(e);
    }
});

// --- Event Listeners ---

// Canvas Interaction
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseleave', stopDrawing);
canvas.addEventListener('wheel', handleZoom, { passive: false });

// Right-click to finish drawing
canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    finishCurrentPath();
});

function handleZoom(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const delta = -Math.sign(e.deltaY);
    renderer.zoomAt(x, y, delta);
    update();
}

function startDrawing(e) {
    // Ignore right click for starting drawing (handled by contextmenu)
    if (e.button !== 0) return;

    // Calibration Logic (Priority)
    if (calibrationState === 'point1') {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        calPoint1 = renderer.toWorld(x, y);

        calibrationState = 'point2';
        inputs.calibrationStatus.textContent = '点Bをクリックしてください (Click Point B)';
        update();
        return;
    }

    if (calibrationState === 'point2') {
        try {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            calPoint2 = renderer.toWorld(x, y);

            if (!calPoint1) {
                calibrationState = 'point1';
                inputs.calibrationStatus.textContent = '点Aをクリックしてください (1/2)';
                update();
                return;
            }

            const distWorld = Math.hypot(calPoint2.x - calPoint1.x, calPoint2.y - calPoint1.y);
            tempDistImagePixels = distWorld / renderer.bgMetersPerPixel;

            // Show Modal
            inputs.calibrationModal.style.display = 'block';
            inputs.calDistanceInput.focus();

            update(); // Show point B
        } catch (err) {
            console.error(err);
            calibrationState = 'none';
            update();
        }
        return;
    }

    // Pan Mode Logic
    if (interactionMode === 'pan') {
        isPanning = true;
        lastPanPos = { x: e.clientX, y: e.clientY };
        canvas.style.cursor = 'grabbing';
        return;
    }

    // Normal Drawing Logic
    if (calibrationState !== 'none') return;

    isDrawing = true;
    addPoint(e);
}

function draw(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    currentMousePos = renderer.toWorld(x, y);

    if (isPanning) {
        const dx = e.clientX - lastPanPos.x;
        const dy = e.clientY - lastPanPos.y;
        renderer.pan(dx, dy);
        lastPanPos = { x: e.clientX, y: e.clientY };
        update();
        return;
    }

    if (!isDrawing) {
        // Just update for rubber-band or cursor
        update();
        return;
    }
    addPoint(e);
}

function stopDrawing() {
    isDrawing = false;
    isPanning = false;
    if (interactionMode === 'pan') {
        canvas.style.cursor = 'grab';
    }
    update();
}

function finishCurrentPath() {
    if (currentPath.length > 0) {
        paths.push([...currentPath]);
        currentPath = [];
        isDrawing = false;
        update();
    }
}

function addPoint(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 画面座標からワールド座標へ変換
    const worldPos = renderer.toWorld(x, y);

    // 点の間隔が近すぎる場合は追加しない（間引き）
    if (currentPath.length > 0) {
        const last = currentPath[currentPath.length - 1];
        const dist = Math.hypot(worldPos.x - last.x, worldPos.y - last.y);
        if (dist < 0.5) return; // 0.5m以内は無視
    }

    currentPath.push(worldPos);
    update();
}

// Buttons
inputs.undoBtn.addEventListener('click', () => {
    if (currentPath.length > 0) {
        currentPath.pop();
    } else if (paths.length > 0) {
        // Restore last path to currentPath to allow editing?
        // Or just delete last path?
        // Let's delete last path for simplicity, or pop from it.
        // User expectation: Undo last action.
        // If currentPath is empty, undo removes the last completed path.
        paths.pop();
    }
    update();
});

inputs.clearBtn.addEventListener('click', () => {
    paths = [];
    currentPath = [];
    update();
});

// DXF Export Logic
inputs.exportDxfBtn.addEventListener('click', () => {
    if (paths.length === 0 && currentPath.length === 0) {
        alert("エクスポートする軌跡がありません (No path to export)");
        return;
    }

    let dxfContent = "0\nSECTION\n2\nENTITIES\n";

    // Helper to add LINE entity
    function addLine(x1, y1, x2, y2, layer) {
        dxfContent += "0\nLINE\n";
        dxfContent += "8\n" + layer + "\n";
        dxfContent += "10\n" + x1.toFixed(4) + "\n";
        dxfContent += "20\n" + y1.toFixed(4) + "\n";
        dxfContent += "11\n" + x2.toFixed(4) + "\n";
        dxfContent += "21\n" + y2.toFixed(4) + "\n";
    }

    // Process all paths
    const allPaths = [...paths];
    if (currentPath.length > 0) allPaths.push(currentPath);

    allPaths.forEach((p, index) => {
        if (p.length < 2) return;

        // Simulate
        const states = engine.simulate(p, vehicle);
        if (!states || states.length === 0) return;

        // 1. Swept Path (Envelope) - Layer: ENVELOPE
        // Tractor Front Left
        for (let i = 0; i < states.length - 1; i++) {
            const s1 = states[i];
            const s2 = states[i + 1];
            addLine(s1.envelope.tractor.fl.x, s1.envelope.tractor.fl.y, s2.envelope.tractor.fl.x, s2.envelope.tractor.fl.y, "ENVELOPE_TRACTOR");
            addLine(s1.envelope.tractor.fr.x, s1.envelope.tractor.fr.y, s2.envelope.tractor.fr.x, s2.envelope.tractor.fr.y, "ENVELOPE_TRACTOR");

            if (vehicle.hasTrailer) {
                addLine(s1.envelope.trailer.rl.x, s1.envelope.trailer.rl.y, s2.envelope.trailer.rl.x, s2.envelope.trailer.rl.y, "ENVELOPE_TRAILER");
                addLine(s1.envelope.trailer.rr.x, s1.envelope.trailer.rr.y, s2.envelope.trailer.rr.x, s2.envelope.trailer.rr.y, "ENVELOPE_TRAILER");
            } else {
                addLine(s1.envelope.tractor.rl.x, s1.envelope.tractor.rl.y, s2.envelope.tractor.rl.x, s2.envelope.tractor.rl.y, "ENVELOPE_TRACTOR");
                addLine(s1.envelope.tractor.rr.x, s1.envelope.tractor.rr.y, s2.envelope.tractor.rr.x, s2.envelope.tractor.rr.y, "ENVELOPE_TRACTOR");
            }
        }

        // 2. Wheel Path - Layer: WHEEL_PATH
        for (let i = 0; i < states.length - 1; i++) {
            addLine(states[i].x, states[i].y, states[i + 1].x, states[i + 1].y, "WHEEL_PATH_TRACTOR");
            if (vehicle.hasTrailer) {
                addLine(states[i].trailer.x, states[i].trailer.y, states[i + 1].trailer.x, states[i + 1].trailer.y, "WHEEL_PATH_TRAILER");
            }
        }
    });

    dxfContent += "0\nENDSEC\n0\nEOF\n";

    // Download
    const blob = new Blob([dxfContent], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trajectory_${new Date().toISOString().slice(0, 19).replace(/[-T:]/g, '')}.dxf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// Vehicle Preset Logic
inputs.vehiclePreset.addEventListener('change', (e) => {
    const presetId = e.target.value;
    const preset = vehiclePresets.find(p => p.id === presetId);
    if (preset) {
        // Apply preset to vehicle model
        Object.assign(vehicle, preset.params);

        // Update Pole Length UI
        if (preset.id === 'pole_trailer') {
            inputs.poleLengthGroup.style.display = 'flex';
            inputs.poleLengthInput.value = preset.params.trailerWheelbase;
            inputs.poleLengthVal.textContent = preset.params.trailerWheelbase.toFixed(1);
        } else {
            inputs.poleLengthGroup.style.display = 'none';
        }

        update();
    }
});

inputs.poleLengthInput.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    inputs.poleLengthVal.textContent = val.toFixed(1);
    vehicle.trailerWheelbase = val;
    update();
});

inputs.drawIntervalInput.addEventListener('change', (e) => {
    engine.stepSize = parseFloat(e.target.value) || 0.5;
    update();
});

// Settings Modal
inputs.openSettingsBtn.addEventListener('click', () => {
    loadModalValues();
    drawPreview();
    inputs.settingsModal.style.display = 'block';
});

inputs.closeModalBtn.addEventListener('click', () => {
    inputs.settingsModal.style.display = 'none';
});
window.addEventListener('click', (e) => {
    if (e.target == inputs.settingsModal) {
        inputs.settingsModal.style.display = 'none';
    }
});

// Populate Modal Preset
vehiclePresets.forEach(preset => {
    const option = document.createElement('option');
    option.value = preset.id;
    option.textContent = preset.name;
    inputs.modalPreset.appendChild(option);
});

inputs.modalPreset.addEventListener('change', (e) => {
    const selectedId = e.target.value;
    if (selectedId === 'custom') return;
    const preset = vehiclePresets.find(p => p.id === selectedId);
    if (preset) applyModalPreset(preset);
});

function applyModalPreset(preset) {
    const p = preset.params;
    inputs.m_width.value = p.width;
    inputs.m_wheelbase.value = p.wheelbase;
    inputs.m_overhangFront.value = p.overhangFront;
    inputs.m_overhangRear.value = p.overhangRear;
    inputs.m_maxSteering.value = p.maxSteeringAngle;
    inputs.m_tractorAxles.value = p.tractorAxles || 1;

    inputs.m_hasTrailer.checked = (preset.type === 'trailer');
    if (preset.type === 'trailer') {
        inputs.m_trailerWidth.value = p.trailerWidth;
        inputs.m_trailerWheelbase.value = p.trailerWheelbase;
        inputs.m_trailerOverhangFront.value = p.trailerOverhangFront || 0;
        inputs.m_trailerOverhangRear.value = p.trailerOverhangRear;
        inputs.m_hitchOffset.value = p.hitchOffset || 0;
        inputs.m_trailerAxles.value = p.trailerAxles || 2;
        inputs.m_isPoleTrailer.checked = !!p.isPoleTrailer;
    } else {
        inputs.m_isPoleTrailer.checked = false;
    }
    toggleModalTrailer();
    drawPreview();
}

function loadModalValues() {
    inputs.m_width.value = vehicle.width;
    inputs.m_wheelbase.value = vehicle.wheelbase;
    inputs.m_overhangFront.value = vehicle.overhangFront;
    inputs.m_overhangRear.value = vehicle.overhangRear;
    inputs.m_maxSteering.value = (vehicle.maxSteeringAngle * 180 / Math.PI).toFixed(0);
    inputs.m_tractorAxles.value = vehicle.tractorAxles || 1;

    inputs.m_hasTrailer.checked = vehicle.hasTrailer;
    inputs.m_trailerWidth.value = vehicle.trailerWidth;
    inputs.m_trailerWheelbase.value = vehicle.trailerWheelbase;
    inputs.m_trailerOverhangFront.value = vehicle.trailerOverhangFront || 0;
    inputs.m_trailerOverhangRear.value = vehicle.trailerOverhangRear;
    inputs.m_hitchOffset.value = vehicle.hitchOffset;
    inputs.m_trailerAxles.value = vehicle.trailerAxles || 2;
    inputs.m_isPoleTrailer.checked = vehicle.isPoleTrailer;

    toggleModalTrailer();
}

function saveModalValues() {
    vehicle.width = parseFloat(inputs.m_width.value);
    vehicle.wheelbase = parseFloat(inputs.m_wheelbase.value);
    vehicle.overhangFront = parseFloat(inputs.m_overhangFront.value);
    vehicle.overhangRear = parseFloat(inputs.m_overhangRear.value);
    vehicle.maxSteeringAngle = parseFloat(inputs.m_maxSteering.value) * Math.PI / 180;
    vehicle.tractorAxles = parseInt(inputs.m_tractorAxles.value);

    vehicle.hasTrailer = inputs.m_hasTrailer.checked;
    vehicle.trailerWidth = parseFloat(inputs.m_trailerWidth.value);
    vehicle.trailerWheelbase = parseFloat(inputs.m_trailerWheelbase.value);
    vehicle.trailerOverhangFront = parseFloat(inputs.m_trailerOverhangFront.value);
    vehicle.trailerOverhangRear = parseFloat(inputs.m_trailerOverhangRear.value);
    vehicle.hitchOffset = parseFloat(inputs.m_hitchOffset.value);
    vehicle.trailerAxles = parseInt(inputs.m_trailerAxles.value);
    vehicle.isPoleTrailer = inputs.m_isPoleTrailer.checked;

    inputs.settingsModal.style.display = 'none';
    update();
}

inputs.saveSettingsBtn.addEventListener('click', saveModalValues);
inputs.cancelSettingsBtn.addEventListener('click', () => {
    inputs.settingsModal.style.display = 'none';
});

inputs.m_hasTrailer.addEventListener('change', toggleModalTrailer);
inputs.m_isPoleTrailer.addEventListener('change', toggleModalTrailer);
function toggleModalTrailer() {
    inputs.m_trailerParams.style.display = inputs.m_hasTrailer.checked ? 'block' : 'none';
    drawPreview();
}

// Preview Canvas Logic
const previewCanvas = document.getElementById('previewCanvas');
const pCtx = previewCanvas.getContext('2d');

// Listen to all inputs to update preview
const allInputs = [
    inputs.m_width, inputs.m_wheelbase, inputs.m_overhangFront, inputs.m_overhangRear,
    inputs.m_maxSteering, inputs.m_tractorAxles,
    inputs.m_hasTrailer, inputs.m_trailerWheelbase, inputs.m_trailerWidth,
    inputs.m_trailerOverhangFront, inputs.m_trailerOverhangRear, inputs.m_hitchOffset,
    inputs.m_trailerAxles, inputs.m_isPoleTrailer
];
allInputs.forEach(input => {
    if (input) {
        input.addEventListener('input', drawPreview);
        input.addEventListener('change', drawPreview);
    }
});

function drawPreview() {
    // Resize
    previewCanvas.width = previewCanvas.clientWidth;
    previewCanvas.height = previewCanvas.clientHeight;
    const w = previewCanvas.width;
    const h = previewCanvas.height;
    pCtx.clearRect(0, 0, w, h);

    // Draw Schematic in Preview
    const cxTop = previewCanvas.width / 2;
    const cyTop = previewCanvas.height * 0.35; // Move down slightly
    const scaleTop = 25; // Reduced scale to fit dimensions (was 30)

    const cxSide = previewCanvas.width / 2;
    const cySide = previewCanvas.height * 0.65; // Move up slightly
    const scaleSide = 25; // Reduced scale (was 30)

    // --- Shared Calculations ---
    const wb = parseFloat(inputs.m_wheelbase.value) || 0;
    const ohF = parseFloat(inputs.m_overhangFront.value) || 0;
    const ohR = parseFloat(inputs.m_overhangRear.value) || 0;
    const width = parseFloat(inputs.m_width.value) || 0;
    const trAxles = parseInt(inputs.m_tractorAxles.value) || 1;

    let totalLen = wb + ohF + ohR;
    let totalWidth = width;

    let tWb = 0, tOhR = 0, tOhF = 0, hitch = 0, tWidth = 0, tAxles = 1;
    const isPoleTrailer = inputs.m_isPoleTrailer.checked;

    if (inputs.m_hasTrailer.checked) {
        tWb = parseFloat(inputs.m_trailerWheelbase.value) || 0;
        tOhR = parseFloat(inputs.m_trailerOverhangRear.value) || 0;
        tOhF = parseFloat(inputs.m_trailerOverhangFront.value) || 0;
        hitch = parseFloat(inputs.m_hitchOffset.value) || 0;
        tWidth = parseFloat(inputs.m_trailerWidth.value) || 0;
        tAxles = parseInt(inputs.m_trailerAxles.value) || 1;

        if (isPoleTrailer) {
            // For pole trailer, hitch is at tractor rear axle, trailer axle is at tWb
            // So, tractor rear axle is 0. Hitch is at -hitch. Trailer axle is at -hitch - tWb.
            // Trailer rear overhang is from trailer axle.
            const tractorRearAxleX = 0;
            const hitchPointX = tractorRearAxleX - hitch;
            const trailerAxleX = hitchPointX - tWb;
            const trailerRearMostX = trailerAxleX - tOhR;

            const maxFront = wb + ohF;
            const minRear = trailerRearMostX;
            totalLen = maxFront - minRear;
            totalWidth = Math.max(totalWidth, tWidth); // Trailer width is for bogie
        } else {
            const maxFront = Math.max(wb + ohF, hitch + tOhF);
            const minRear = Math.min(-ohR, hitch - tWb - tOhR);
            totalLen = maxFront - minRear;
            totalWidth = Math.max(totalWidth, tWidth);
        }
    }

    // Add margins
    const margin = 30;

    // --- Top View (Upper Half) ---
    // Scale for Top View
    let scaleX = (w - margin * 2) / (totalLen || 1);
    let scaleY = (h / 2 - margin * 2) / (totalWidth || 1);
    const actualScaleTop = Math.min(scaleX, scaleY, scaleTop);

    // --- Side View (Lower Half) ---
    // Scale for Side View (Height ~ 3.5m)
    let scaleYSide = (h / 2 - margin * 2) / 4.0;
    const actualScaleSide = Math.min(scaleX, scaleYSide, scaleSide);

    // Calculate Bounding Box Center X
    let minX = -ohR;
    let maxX = wb + ohF;
    if (inputs.m_hasTrailer.checked) {
        if (isPoleTrailer) {
            const tractorRearAxleX = 0;
            const hitchPointX = tractorRearAxleX - hitch;
            const trailerAxleX = hitchPointX - tWb;
            const trailerRearMostX = trailerAxleX - tOhR;
            minX = Math.min(minX, trailerRearMostX);
        } else {
            minX = Math.min(minX, hitch - tWb - tOhR);
            maxX = Math.max(maxX, hitch + tOhF);
        }
    }
    const midX = (minX + maxX) / 2;

    // --- Draw Top View ---
    pCtx.save();
    pCtx.translate(cxTop, cyTop);
    pCtx.scale(actualScaleTop, actualScaleTop);
    pCtx.translate(-midX, 0); // Center horizontally
    pCtx.lineWidth = 2 / actualScaleTop;

    drawVehicleTop(pCtx,
        wb, ohF, ohR, width, trAxles,
        tWb, tOhR, tOhF, hitch, tWidth, tAxles,
        isPoleTrailer
    );
    pCtx.restore();

    // --- Draw Side View ---
    pCtx.save();
    pCtx.translate(cxSide, cySide + (actualScaleSide * 1.5)); // Shift down to put ground lower
    pCtx.scale(actualScaleSide, -actualScaleSide); // Y up
    pCtx.translate(-midX, 0);
    pCtx.lineWidth = 2 / actualScaleSide;

    drawVehicleSide(pCtx,
        wb, ohF, ohR, width, trAxles,
        tWb, tOhR, tOhF, hitch, tWidth, tAxles,
        isPoleTrailer
    );
    pCtx.restore();
}

// Helper functions for drawing schematic (copied from original)
function drawAxleGroup(ctx, centerX, width, count, wL, wW) {
    const spacing = 1.2; // 1.2m spacing
    const startX = centerX + (count - 1) * spacing / 2;
    for (let i = 0; i < count; i++) {
        const x = startX - i * spacing;
        ctx.fillRect(x - wL / 2, width / 2 - wW, wL, wW);
        ctx.fillRect(x - wL / 2, -width / 2, wL, wW);
    }
}
function drawAxleGroupSide(ctx, centerX, count, radius) {
    const spacing = 1.2;
    const startX = centerX + (count - 1) * spacing / 2;
    for (let i = 0; i < count; i++) {
        const x = startX - i * spacing;
        ctx.beginPath(); ctx.arc(x, radius, radius, 0, Math.PI * 2); ctx.fill();
    }
}

function drawVehicleTop(ctx, wb, ohF, ohR, width, trAxles, tWb, tOhR, tOhF, hitch, tWidth, tAxles, isPoleTrailer) {
    // Static Schematic Logic: Fixed visual proportions
    // These values are purely for drawing the "ideal" shape
    const vWb = 3.5;
    const vOhF = 1.0;
    const vOhR = 1.0;
    const vWidth = 2.5;

    // Tractor Body (Visual)
    ctx.fillStyle = '#eef2ff'; // Light fill
    ctx.fillRect(-vOhR, -vWidth / 2, vWb + vOhF + vOhR, vWidth);
    ctx.strokeStyle = '#333';
    ctx.strokeRect(-vOhR, -vWidth / 2, vWb + vOhF + vOhR, vWidth);

    // Tractor Wheels (Visual)
    ctx.fillStyle = '#000'; // Black tires
    drawAxleGroup(ctx, vWb, vWidth, 1, 0.8, 0.25); // Front
    drawAxleGroup(ctx, 0, vWidth, trAxles, 0.8, 0.25); // Rear

    // Trailer
    if (tWb > 0) {
        const vHitchX = -hitch; // Relative to tractor rear axle (0)
        // For Pole Trailer, use actual length to show telescopic effect.
        // For Standard Trailer, use fixed visual length to maintain icon look.
        const vTrailerWb = isPoleTrailer ? tWb : 5.0;
        const vTrailerOhR = 1.5;
        const vTrailerOhF = isPoleTrailer ? 0 : 0.5;
        const vTrailerWidth = isPoleTrailer ? 2.3 : 2.5;

        const vAxleX = vHitchX - vTrailerWb;
        const vRearX = vAxleX - vTrailerOhR;
        const vFrontX = vAxleX + vTrailerOhF; // For standard trailer, front is relative to axle

        ctx.save();
        // Draw Trailer Body
        if (isPoleTrailer) {
            // Pole
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(vAxleX, -0.2, vTrailerWb, 0.4); // Pole

            // Rear Bogie
            ctx.fillStyle = '#cbd5e1';
            ctx.fillRect(vRearX, -vTrailerWidth / 2, vTrailerOhR + 0.5, vTrailerWidth);
            ctx.strokeStyle = '#333';
            ctx.strokeRect(vRearX, -vTrailerWidth / 2, vTrailerOhR + 0.5, vTrailerWidth);
        } else {
            ctx.fillStyle = '#fff1f2'; // Light red
            ctx.fillRect(vRearX, -vTrailerWidth / 2, vFrontX - vRearX, vTrailerWidth);
            ctx.strokeStyle = '#333';
            ctx.strokeRect(vRearX, -vTrailerWidth / 2, vFrontX - vRearX, vTrailerWidth);
        }

        // Trailer Wheels
        ctx.fillStyle = '#000';
        drawAxleGroup(ctx, vAxleX, vTrailerWidth, tAxles, 0.8, 0.25);
        ctx.restore();

        // Dimensions (Top View)
        const dimOffsetW = 2.0;
        drawDim(ctx, vWb + vOhF, vWidth / 2, vWb + vOhF, -vWidth / 2, width.toFixed(2), dimOffsetW); // Tractor Width

        if (isPoleTrailer) {
            // Pole Length Dimension
            drawDim(ctx, vHitchX, -0.5, vAxleX, -0.5, tWb.toFixed(2), 1.0);
        } else {
            drawDim(ctx, vRearX, vTrailerWidth / 2, vRearX, -vTrailerWidth / 2, tWidth.toFixed(2), dimOffsetW); // Trailer Width
        }

        // Total Length Calculation
        const totalLen = (wb + ohF - hitch) + tWb + tOhR;

        // Visual Coords for Total Length
        const vFrontMost = vWb + vOhF;
        const vRearMost = vRearX;

        // Draw Total Length (Top, above other dims)
        drawDim(ctx, vRearMost, -vWidth / 2, vFrontMost, -vWidth / 2, `全長 ${totalLen.toFixed(2)}`, -3.5); // Increased offset
    } else {
        // Total Length for Tractor Only
        const totalLen = wb + ohF + ohR;
        const vFrontMost = vWb + vOhF;
        const vRearMost = -vOhR;
        drawDim(ctx, vRearMost, -vWidth / 2, vFrontMost, -vWidth / 2, `全長 ${totalLen.toFixed(2)}`, -3.5); // Increased offset
    }
}

function drawVehicleSide(ctx, wb, ohF, ohR, width, trAxles, tWb, tOhR, tOhF, hitch, tWidth, tAxles, isPoleTrailer) {
    // Static Schematic Logic
    const vWb = 3.5;
    const vOhF = 1.0;
    const vOhR = 1.0;

    const cabH = 2.8;
    const chassisH = 1.0;
    const wheelR = 0.5;

    // Tractor
    // Chassis
    ctx.fillStyle = '#eef2ff';
    ctx.fillRect(-vOhR, 0.4, vWb + vOhF + vOhR, chassisH - 0.4);
    ctx.strokeStyle = '#333';
    ctx.strokeRect(-vOhR, 0.4, vWb + vOhF + vOhR, chassisH - 0.4);
    // Cab
    ctx.fillRect(vWb - 0.5, chassisH, vOhF + 0.5, cabH - chassisH);
    ctx.strokeRect(vWb - 0.5, chassisH, vOhF + 0.5, cabH - chassisH);

    // Wheels
    ctx.fillStyle = '#000';
    drawAxleGroupSide(ctx, vWb, 1, wheelR);
    drawAxleGroupSide(ctx, 0, trAxles, wheelR);

    // Trailer
    if (tWb > 0) {
        const vHitchX = -hitch;
        // For Pole Trailer, use actual length to show telescopic effect.
        const vTrailerWb = isPoleTrailer ? tWb : 5.0;
        const vTrailerOhR = 1.5;
        const vTrailerOhF = isPoleTrailer ? 0 : 0.5;
        const vTrailerH = 2.8;
        const vBedH = 1.2;

        const vAxleX = vHitchX - vTrailerWb;
        const vRearX = vAxleX - vTrailerOhR;
        const vFrontX = vAxleX + vTrailerOhF;

        // Draw Trailer Body
        if (isPoleTrailer) {
            // Pole
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(vAxleX, 0.8, vTrailerWb, 0.2); // Pole

            // Rear Bogie
            ctx.fillStyle = '#cbd5e1';
            ctx.fillRect(vRearX, 0.6, vTrailerOhR + 0.5, 0.6);
            ctx.strokeStyle = '#333';
            ctx.strokeRect(vRearX, 0.6, vTrailerOhR + 0.5, 0.6);
        } else {
            ctx.fillStyle = '#fff1f2';
            ctx.fillRect(vRearX, vBedH, vFrontX - vRearX, vTrailerH - vBedH);
            ctx.strokeStyle = '#333';
            ctx.strokeRect(vRearX, vBedH, vFrontX - vRearX, vTrailerH - vBedH);
        }

        // Trailer Wheels
        ctx.fillStyle = '#000';
        drawAxleGroupSide(ctx, vAxleX, tAxles, wheelR);

        // Dimensions (Side View)
        const dimOffsetWB = 1.2;
        const dimOffsetOH = 2.8;

        drawDim(ctx, 0, 0, vWb, 0, wb.toFixed(2), -dimOffsetWB); // WB
        drawDim(ctx, vWb, 0, vWb + vOhF, 0, ohF.toFixed(2), -dimOffsetOH); // Front OH
        drawDim(ctx, -vOhR, 0, 0, 0, ohR.toFixed(2), -dimOffsetOH); // Rear OH

        // Trailer Dims
        drawDim(ctx, vAxleX, 0, vHitchX, 0, tWb.toFixed(2), -dimOffsetWB); // Trailer WB

        if (!isPoleTrailer) {
            drawDim(ctx, vHitchX, 0, vFrontX, 0, tOhF.toFixed(2), -dimOffsetOH); // Trailer Front OH
        }
        drawDim(ctx, vRearX, 0, vAxleX, 0, tOhR.toFixed(2), -dimOffsetOH); // Trailer Rear OH

        // Hitch Offset (Top of vehicle)
        // Draw from Rear Axle (0) to Hitch (vHitchX)
        // If hitch is negative (forward), vHitchX is positive.
        // Wait, vHitchX = -hitch. If hitch is -1 (forward), vHitchX = 1.
        // Draw dim from 0 to vHitchX.
        const hitchDimY = 3.5; // Above cab
        drawDim(ctx, 0, hitchDimY, vHitchX, hitchDimY, `連結オフセット ${Math.abs(hitch).toFixed(2)}`, 0.5);

    } else {
        // Side View Dimensions (Tractor Only)
        const dimOffsetWB = 1.2;
        const dimOffsetOH = 2.8;
        drawDim(ctx, 0, 0, vWb, 0, wb.toFixed(2), -dimOffsetWB); // WB
        drawDim(ctx, vWb, 0, vWb + vOhF, 0, ohF.toFixed(2), -dimOffsetOH); // Front OH
        drawDim(ctx, -vOhR, 0, 0, 0, ohR.toFixed(2), -dimOffsetOH); // Rear OH
    }
}

function drawDim(ctx, x1, y1, x2, y2, text, offset = 0) {
    ctx.save();
    ctx.strokeStyle = '#666';
    ctx.fillStyle = '#666';
    const t = ctx.getTransform();
    const scale = Math.sqrt(t.a * t.a + t.b * t.b); // Extract scale
    ctx.lineWidth = 1 / scale;
    const fontScale = 1 / scale;
    ctx.font = `${12 * fontScale}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    // Calculate perpendicular vector for offset
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) { ctx.restore(); return; }

    const nx = -dy / len;
    const ny = dx / len;

    // Draw Lines
    ctx.beginPath();
    // Main line
    ctx.moveTo(x1 + nx * offset, y1 + ny * offset);
    ctx.lineTo(x2 + nx * offset, y2 + ny * offset);
    // Extension lines (from object to dim line)
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 + nx * offset, y1 + ny * offset);
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 + nx * offset, y2 + ny * offset);
    ctx.stroke();

    // Draw Dots at Endpoints
    ctx.fillStyle = '#000'; // Black dots
    const dotRadius = 0.15; // Increased size (was 0.08) for better visibility

    // Start Dot
    ctx.beginPath();
    ctx.arc(x1 + nx * offset, y1 + ny * offset, dotRadius, 0, Math.PI * 2);
    ctx.fill();

    // End Dot
    ctx.beginPath();
    ctx.arc(x2 + nx * offset, y2 + ny * offset, dotRadius, 0, Math.PI * 2);
    ctx.fill();

    // Text
    const ox1 = x1 + nx * offset; // Define ox1, oy1, ox2, oy2 for text positioning
    const oy1 = y1 + ny * offset;
    const ox2 = x2 + nx * offset;
    const oy2 = y2 + ny * offset;

    const mx = (ox1 + ox2) / 2;
    const my = (oy1 + oy2) / 2;

    ctx.save();
    ctx.translate(mx, my);

    // Calculate angle
    let angle = Math.atan2(dy, dx);
    // Ensure text is always upright (readable from bottom or right)
    if (angle > Math.PI / 2 || angle <= -Math.PI / 2) {
        angle += Math.PI;
    }
    ctx.rotate(angle);

    // Check for vertical flip (scale Y is negative)
    const transform = ctx.getTransform();
    if (transform.d < 0) {
        ctx.scale(1, -1);
    }

    // Text Background (to avoid overlap)
    ctx.textBaseline = 'middle';
    const textMetrics = ctx.measureText(text);
    const padding = 2 * fontScale;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; // Semi-transparent white
    ctx.fillRect(
        -textMetrics.width / 2 - padding,
        -10 * fontScale, // Approx height
        textMetrics.width + padding * 2,
        20 * fontScale
    );
    ctx.fillStyle = '#666';
    ctx.fillText(text, 0, 0);

    ctx.restore();
    ctx.restore();
}

// --- Main Loop ---
function update() {
    renderer.clear();

    // Draw Completed Paths
    for (const p of paths) {
        renderer.drawPath(p, null); // No current mouse pos for completed paths
        if (p.length >= 2) {
            const states = engine.simulate(p, vehicle);
            renderer.drawSimulation(states, vehicle);
        }
    }

    // Draw Current Path (being drawn)
    renderer.drawPath(currentPath, currentMousePos, calibrationState, calPoint1, calPoint2);

    if (currentPath.length >= 2) {
        const states = engine.simulate(currentPath, vehicle);
        renderer.drawSimulation(states, vehicle);
    }
}

// Initial Resize & Update
renderer.resize();
update();

window.addEventListener('resize', () => {
    renderer.resize();
    update();
});

// Initialize with default preset
inputs.vehiclePreset.value = '2t_truck';
inputs.vehiclePreset.dispatchEvent(new Event('change'));
