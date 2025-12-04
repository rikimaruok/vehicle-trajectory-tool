const vehiclePresets = [
    {
        id: '2t_truck',
        name: '2tトラック',
        type: 'single',
        params: {
            wheelbase: 2.5,
            width: 1.7,
            overhangFront: 1.0,
            overhangRear: 1.5,
            maxSteeringAngle: 35,
            tractorAxles: 1
        }
    },
    {
        id: '4t_truck',
        name: '4tトラック',
        type: 'single',
        params: {
            wheelbase: 3.8,
            width: 2.2,
            overhangFront: 1.2,
            overhangRear: 2.2,
            maxSteeringAngle: 40,
            tractorAxles: 1
        }
    },
    {
        id: '10t_truck',
        name: '10tトラック',
        type: 'single',
        params: {
            wheelbase: 5.5,
            width: 2.5,
            overhangFront: 1.5,
            overhangRear: 2.8,
            maxSteeringAngle: 45,
            tractorAxles: 2
        }
    },
    {
        id: 'semi_trailer',
        name: 'セミトレーラ',
        type: 'trailer',
        params: {
            wheelbase: 4.5,
            width: 2.5,
            overhangFront: 1.3,
            overhangRear: 1.5,
            maxSteeringAngle: 45,
            tractorAxles: 2,
            trailerWidth: 2.5,
            trailerWheelbase: 8.5,
            trailerOverhangFront: 0,
            trailerOverhangRear: 2.0,
            hitchOffset: 0,
            trailerAxles: 3
        }
    },
    {
        id: 'pole_trailer',
        name: 'ポールトレーラ',
        type: 'trailer',
        params: {
            wheelbase: 5.5, // 10t truck tractor
            width: 2.5,
            overhangFront: 1.5,
            overhangRear: 2.8,
            maxSteeringAngle: 45,
            tractorAxles: 2,
            trailerWidth: 2.3,
            trailerWheelbase: 10.0, // Default pole length
            trailerOverhangFront: 0,
            trailerOverhangRear: 1.0,
            hitchOffset: 1.0, // Fixed: Hitch is usually at the rear
            trailerAxles: 1,
            isPoleTrailer: true
        }
    }
];

class VehicleModel {
    constructor() {
        // 初期値 (2tトラック相当)
        this.wheelbase = 2.5;
        this.width = 1.7;
        this.overhangFront = 1.0;
        this.overhangRear = 1.5;
        this.maxSteeringAngle = 35 * (Math.PI / 180); // Radian
        this.tractorAxles = 1;

        // トレーラー用パラメータ
        this.hasTrailer = false;
        this.trailerWheelbase = 0; // 連結点からトレーラー車軸まで
        this.trailerWidth = 0;
        this.trailerOverhangRear = 0;
        this.trailerOverhangFront = 0;
        this.hitchOffset = 0; // トラクター後車軸からの連結点オフセット（正：後ろ、負：前）
        this.trailerAxles = 2;
        this.isPoleTrailer = false;
    }
}

// Expose to global scope
window.VehicleModel = VehicleModel;
window.vehiclePresets = vehiclePresets;
