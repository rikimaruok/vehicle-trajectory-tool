export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;

        // 座標変換用（画面中心を原点にするなど）
        // 簡易的に 1px = 0.1m (10px = 1m) とする
        this.scale = 20;
        this.offsetX = 0;
        this.offsetY = 0;
    }

    resize() {
        this.width = this.canvas.parentElement.clientWidth;
        this.height = this.canvas.parentElement.clientHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    // 画面座標への変換
    toScreen(x, y) {
        return {
            x: x * this.scale + this.offsetX + this.width / 2,
            y: y * this.scale + this.offsetY + this.height / 2
        };
    }

    // ワールド座標への変換
    toWorld(screenX, screenY) {
        return {
            x: (screenX - this.offsetX - this.width / 2) / this.scale,
            y: (screenY - this.offsetY - this.height / 2) / this.scale
        };
    }

    drawPath(path) {
        if (path.length < 2) return;
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#aaa';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);

        const start = this.toScreen(path[0].x, path[0].y);
        this.ctx.moveTo(start.x, start.y);

        for (let i = 1; i < path.length; i++) {
            const p = this.toScreen(path[i].x, path[i].y);
            this.ctx.lineTo(p.x, p.y);
        }

        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // 点を描画
        this.ctx.fillStyle = '#666';
        for (const pt of path) {
            const p = this.toScreen(pt.x, pt.y);
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawSimulation(states, vehicle) {
        if (!states || states.length === 0) return;

        // 1. 後輪の軌跡（赤い線）
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'red';
        this.ctx.lineWidth = 2;

        const start = this.toScreen(states[0].x, states[0].y);
        this.ctx.moveTo(start.x, start.y);

        for (let i = 1; i < states.length; i++) {
            const p = this.toScreen(states[i].x, states[i].y);
            this.ctx.lineTo(p.x, p.y);
        }
        this.ctx.stroke();

        // 2. 車両の描画（一定間隔で）
        // 全ステップ描画すると重なりすぎるので間引く
        const step = Math.floor(states.length / 10) || 1;

        for (let i = 0; i < states.length; i += step) {
            this.drawVehicleBody(states[i], vehicle, i === states.length - 1);
        }
        // 最後の位置は必ず描画
        this.drawVehicleBody(states[states.length - 1], vehicle, true);
    }

    drawVehicleBody(state, vehicle, isLast) {
        const { x, y, heading } = state;
        const screenPos = this.toScreen(x, y);

        this.ctx.save();
        this.ctx.translate(screenPos.x, screenPos.y);
        this.ctx.rotate(heading);

        // 車両矩形の計算 (後輪中心が原点)
        // 前: wheelbase + overhangFront
        // 後: overhangRear
        // 幅: width
        const lengthFront = vehicle.wheelbase + vehicle.overhangFront;
        const lengthRear = vehicle.overhangRear;
        const halfWidth = vehicle.width / 2;

        // 車体
        this.ctx.fillStyle = isLast ? 'rgba(0, 123, 255, 0.5)' : 'rgba(0, 123, 255, 0.1)';
        this.ctx.strokeStyle = isLast ? '#0056b3' : 'rgba(0, 86, 179, 0.3)';
        this.ctx.lineWidth = 1;

        this.ctx.beginPath();
        this.ctx.rect(-lengthRear * this.scale, -halfWidth * this.scale, (lengthFront + lengthRear) * this.scale, vehicle.width * this.scale);
        this.ctx.fill();
        this.ctx.stroke();

        // 車軸（後輪）
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'black';
        this.ctx.moveTo(0, -halfWidth * this.scale);
        this.ctx.lineTo(0, halfWidth * this.scale);
        this.ctx.stroke();

        // 車軸（前輪）
        this.ctx.beginPath();
        this.ctx.moveTo(vehicle.wheelbase * this.scale, -halfWidth * this.scale);
        this.ctx.lineTo(vehicle.wheelbase * this.scale, halfWidth * this.scale);
        this.ctx.stroke();

        this.ctx.restore();
    }
}
