import { VehicleModel } from './VehicleModel.js';
import { SimulationEngine } from './SimulationEngine.js';
import { Renderer } from './Renderer.js';

// 初期化
const canvas = document.getElementById('mainCanvas');
const renderer = new Renderer(canvas);
const vehicle = new VehicleModel(4.5, 2.5, 45);
const engine = new SimulationEngine();

// 状態
let path = []; // ユーザーが描いたパス（点の配列）
let isDrawing = false;

// UI要素
const inputs = {
    wheelbase: document.getElementById('wheelbase'),
    width: document.getElementById('width'),
    maxSteering: document.getElementById('maxSteering'),
    clearBtn: document.getElementById('clearBtn')
};

// リサイズ対応
window.addEventListener('resize', () => {
    renderer.resize();
    update();
});
renderer.resize(); // 初回実行

// イベントリスナー設定
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseleave', stopDrawing);

inputs.clearBtn.addEventListener('click', () => {
    path = [];
    update();
});

// パラメータ変更時の更新
Object.values(inputs).forEach(input => {
    if (input.tagName === 'INPUT') {
        input.addEventListener('change', updateParams);
    }
});

function updateParams() {
    const wb = parseFloat(inputs.wheelbase.value);
    const w = parseFloat(inputs.width.value);
    const maxS = parseFloat(inputs.maxSteering.value);

    vehicle.updateParams(wb, w, maxS);
    update();
}

// 描画操作
function startDrawing(e) {
    isDrawing = true;
    // クリックした位置をパスに追加（新規作成または追記）
    // ここではシンプルに「新規作成」のみとする（クリックでリセット）
    if (path.length > 0 && !e.shiftKey) {
        path = [];
    }
    addPoint(e);
}

function draw(e) {
    if (!isDrawing) return;
    addPoint(e);
}

function stopDrawing() {
    isDrawing = false;
    update();
}

function addPoint(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 画面座標からワールド座標へ変換
    const worldPos = renderer.toWorld(x, y);

    // 点の間隔が近すぎる場合は追加しない（間引き）
    if (path.length > 0) {
        const last = path[path.length - 1];
        const dist = Math.hypot(worldPos.x - last.x, worldPos.y - last.y);
        if (dist < 0.5) return; // 0.5m以内は無視
    }

    path.push(worldPos);
    update();
}

// メイン更新ループ
function update() {
    renderer.clear();

    // 1. パスの描画
    renderer.drawPath(path);

    // 2. シミュレーション実行
    if (path.length >= 2) {
        const states = engine.simulate(path, vehicle);

        // 3. 結果の描画
        renderer.drawSimulation(states, vehicle);
    }
}

// 初期描画
update();
