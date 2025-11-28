export class SimulationEngine {
    constructor() {
        this.stepSize = 0.1; // シミュレーションの刻み幅 (m)
    }

    /**
     * パスに沿って車両を走行させ、軌跡を計算する
     * @param {Array<{x, y}>} path 目標経路（点列）
     * @param {VehicleModel} vehicle 車両モデル
     * @returns {Array} タイムステップごとの車両状態の配列
     */
    simulate(path, vehicle) {
        if (!path || path.length < 2) return [];

        const states = [];

        // 初期状態: パスの始点に配置し、2点目の方向を向く
        let currentPos = { x: path[0].x, y: path[0].y };
        let currentHeading = Math.atan2(path[1].y - path[0].y, path[1].x - path[0].x);

        // 前輪中心の位置（Pure Pursuit用）
        // Bicycle Modelでは通常、後輪中心を基準にするが、
        // ユーザーが描くパスは「前輪が通る道」または「車体中心」を想定することが多い。
        // ここではシンプルに「後輪中心」を基準として計算し、
        // ターゲットパスへの追従を行う。

        // パス上のターゲットインデックス
        let targetIndex = 1;

        // シミュレーションループ
        // 安全のため最大ステップ数を設ける
        const maxSteps = 10000;
        for (let i = 0; i < maxSteps; i++) {
            // 終了条件: 最後の点に近づいたら終了
            const distToEnd = Math.hypot(path[path.length - 1].x - currentPos.x, path[path.length - 1].y - currentPos.y);
            if (distToEnd < 0.5) break;

            // 1. Lookahead Point (目標点) の探索
            // 現在位置から一定距離（Lookahead Distance）先にあるパス上の点を探す
            // 簡易的に、現在のターゲットインデックスの点を目指す
            const targetPt = path[targetIndex];
            const distToTarget = Math.hypot(targetPt.x - currentPos.x, targetPt.y - currentPos.y);

            // ターゲットに近づきすぎたら次の点へ
            if (distToTarget < 1.0 && targetIndex < path.length - 1) {
                targetIndex++;
            }

            // 2. 操舵角の計算 (Pure Pursuit)
            // 車両の向きとターゲット方向の偏差
            const angleToTarget = Math.atan2(targetPt.y - currentPos.y, targetPt.x - currentPos.x);
            let alpha = angleToTarget - currentHeading;

            // 角度を -PI ~ PI に正規化
            while (alpha > Math.PI) alpha -= 2 * Math.PI;
            while (alpha < -Math.PI) alpha += 2 * Math.PI;

            // ステアリング角 delta = atan(2 * L * sin(alpha) / Ld) 
            // Ld (Lookahead Distance) はここでは distToTarget を使用
            // 簡易式: delta = alpha (偏差をそのまま修正しようとするP制御的アプローチ)
            // より物理的なPure Pursuit: delta = atan(2 * vehicle.wheelbase * Math.sin(alpha) / distToTarget)

            let steeringAngle = Math.atan(2 * vehicle.wheelbase * Math.sin(alpha) / distToTarget);

            // 3. 操舵角の制限
            if (steeringAngle > vehicle.maxSteeringAngle) steeringAngle = vehicle.maxSteeringAngle;
            if (steeringAngle < -vehicle.maxSteeringAngle) steeringAngle = -vehicle.maxSteeringAngle;

            // 4. 車両位置の更新 (Kinematic Bicycle Model)
            // 後輪中心基準
            // x' = x + v * cos(heading) * dt
            // y' = y + v * sin(heading) * dt
            // heading' = heading + (v / L) * tan(delta) * dt
            // ここでは v * dt = stepSize (移動距離) として扱う

            const dx = this.stepSize * Math.cos(currentHeading);
            const dy = this.stepSize * Math.sin(currentHeading);
            const dHeading = (this.stepSize / vehicle.wheelbase) * Math.tan(steeringAngle);

            currentPos.x += dx;
            currentPos.y += dy;
            currentHeading += dHeading;

            // 状態を保存
            states.push({
                x: currentPos.x,
                y: currentPos.y,
                heading: currentHeading,
                steeringAngle: steeringAngle
            });
        }

        return states;
    }
}
