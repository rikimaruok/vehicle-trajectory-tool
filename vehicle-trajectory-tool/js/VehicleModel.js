/**
 * 車両の物理的特性を定義するクラス
 */
export class VehicleModel {
    constructor(wheelbase, width, maxSteeringAngleDeg) {
        this.wheelbase = wheelbase; // ホイールベース (m)
        this.width = width;         // 車幅 (m)
        // 度数法をラジアンに変換
        this.maxSteeringAngle = maxSteeringAngleDeg * (Math.PI / 180);

        // 簡易的なオーバーハング（見た目用）
        this.overhangFront = 1.0;
        this.overhangRear = 1.0;
    }

    updateParams(wheelbase, width, maxSteeringAngleDeg) {
        this.wheelbase = wheelbase;
        this.width = width;
        this.maxSteeringAngle = maxSteeringAngleDeg * (Math.PI / 180);
    }
}
