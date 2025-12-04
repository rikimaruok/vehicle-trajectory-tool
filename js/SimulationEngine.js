export class SimulationEngine {
    constructor() {
        this.stepSize = 0.1;
    }

    transformPoint(lx, ly, wx, wy, heading) {
        return {
            x: wx + lx * Math.cos(heading) - ly * Math.sin(heading),
            y: wy + lx * Math.sin(heading) + ly * Math.cos(heading)
        };
    }

    getVehicleCorners(axleX, axleY, heading, frontOverhangFromAxle, rearOverhangFromAxle, width) {
        const halfW = width / 2;
        return {
            fl: this.transformPoint(frontOverhangFromAxle, halfW, axleX, axleY, heading),
            fr: this.transformPoint(frontOverhangFromAxle, -halfW, axleX, axleY, heading),
            rl: this.transformPoint(rearOverhangFromAxle, halfW, axleX, axleY, heading),
            rr: this.transformPoint(rearOverhangFromAxle, -halfW, axleX, axleY, heading)
        };
    }

    simulate(path, vehicle) {
        if (!path || path.length < 2) return [];

        const stepSize = this.stepSize || 0.1;
        const wb = Number(vehicle.wheelbase);
        const ohF = Number(vehicle.overhangFront);
        const ohR = Number(vehicle.overhangRear);
        const width = Number(vehicle.width);
        const tWb = Number(vehicle.trailerWheelbase);
        const tOhR = Number(vehicle.trailerOverhangRear);
        const tWidth = Number(vehicle.trailerWidth);
        const hitch = Number(vehicle.hitchOffset);
        const maxSteer = vehicle.maxSteeringAngle;

        const states = [];

        // --- Interpolate Path ---
        const interpolatedPath = [];
        interpolatedPath.push(path[0]);
        for (let i = 0; i < path.length - 1; i++) {
            const p1 = path[i];
            const p2 = path[i + 1];
            const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            const numSteps = Math.ceil(dist / stepSize);
            for (let j = 1; j <= numSteps; j++) {
                const t = j / numSteps;
                interpolatedPath.push({
                    x: p1.x + (p2.x - p1.x) * t,
                    y: p1.y + (p2.y - p1.y) * t
                });
            }
        }

        // --- Initialization ---
        // Start aligned with first segment
        const startHeading = Math.atan2(path[1].y - path[0].y, path[1].x - path[0].x);

        // Rear Axle Position (Start)
        // Assuming path[0] is the Front Axle position
        let currRearX = path[0].x - wb * Math.cos(startHeading);
        let currRearY = path[0].y - wb * Math.sin(startHeading);
        let currHeading = startHeading;

        // Trailer State (Start)
        let trailerHeading = startHeading;
        let trailerX = currRearX - hitch * Math.cos(currHeading) - tWb * Math.cos(trailerHeading);
        let trailerY = currRearY - hitch * Math.sin(currHeading) - tWb * Math.sin(trailerHeading);

        // Simulation Loop
        let targetIndex = 0;
        // Lookahead distance: proportional to wheelbase but with min/max
        const lookaheadDist = Math.max(wb, 2.0);

        // Safety break
        const maxSteps = interpolatedPath.length * 3 + 1000;

        for (let step = 0; step < maxSteps; step++) {
            // Current Front Axle Position (approximate)
            const currFrontX = currRearX + wb * Math.cos(currHeading);
            const currFrontY = currRearY + wb * Math.sin(currHeading);

            // Check distance to end of path
            const endPt = interpolatedPath[interpolatedPath.length - 1];
            const distToEnd = Math.hypot(endPt.x - currFrontX, endPt.y - currFrontY);
            if (distToEnd < 0.5 && targetIndex >= interpolatedPath.length - 5) break;

            // --- 1. Find Target Point (Pure Pursuit) ---
            // Find the point on path closest to lookahead distance from REAR axle
            let bestTarget = interpolatedPath[interpolatedPath.length - 1];

            for (let i = targetIndex; i < interpolatedPath.length; i++) {
                const pt = interpolatedPath[i];
                const d = Math.hypot(pt.x - currRearX, pt.y - currRearY);
                if (d >= lookaheadDist) {
                    bestTarget = pt;
                    targetIndex = i;
                    break;
                }
            }

            // --- 2. Calculate Steering Angle ---
            const dx = bestTarget.x - currRearX;
            const dy = bestTarget.y - currRearY;
            const distToTarget = Math.hypot(dx, dy);
            const angleToTarget = Math.atan2(dy, dx);

            let alpha = angleToTarget - currHeading;
            // Normalize alpha
            while (alpha > Math.PI) alpha -= 2 * Math.PI;
            while (alpha < -Math.PI) alpha += 2 * Math.PI;

            let steeringAngle = Math.atan(2 * wb * Math.sin(alpha) / distToTarget);

            // Limit Steering
            if (steeringAngle > maxSteer) steeringAngle = maxSteer;
            if (steeringAngle < -maxSteer) steeringAngle = -maxSteer;

            // --- 3. Update State (Kinematic Bicycle) ---
            const dMove = stepSize; // Distance to move this step

            const nextRearX = currRearX + dMove * Math.cos(currHeading);
            const nextRearY = currRearY + dMove * Math.sin(currHeading);
            const nextHeading = currHeading + (dMove / wb) * Math.tan(steeringAngle);

            currRearX = nextRearX;
            currRearY = nextRearY;
            currHeading = nextHeading;

            // --- 4. Update Trailer ---
            if (vehicle.hasTrailer) {
                const hitchX = currRearX - hitch * Math.cos(currHeading);
                const hitchY = currRearY - hitch * Math.sin(currHeading);

                const dxT = hitchX - trailerX;
                const dyT = hitchY - trailerY;
                const distT = Math.hypot(dxT, dyT);

                if (distT > 0.001) {
                    trailerHeading = Math.atan2(dyT, dxT);
                }

                trailerX = hitchX - tWb * Math.cos(trailerHeading);
                trailerY = hitchY - tWb * Math.sin(trailerHeading);
            }

            // --- 5. Store State ---
            const tractorCorners = this.getVehicleCorners(currRearX, currRearY, currHeading, wb + ohF, -ohR, width);
            let trailerCorners = null;
            if (vehicle.hasTrailer) {
                trailerCorners = this.getVehicleCorners(trailerX, trailerY, trailerHeading, tWb, -tOhR, tWidth);
            }

            states.push({
                x: currRearX,
                y: currRearY,
                heading: currHeading,
                steeringAngle: steeringAngle,
                trailer: vehicle.hasTrailer ? {
                    x: trailerX,
                    y: trailerY,
                    heading: trailerHeading
                } : null,
                envelope: {
                    tractor: tractorCorners,
                    trailer: trailerCorners
                }
            });
        }

        return states;
    }
}
