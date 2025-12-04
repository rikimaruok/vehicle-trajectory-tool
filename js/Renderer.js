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

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        this.scale = 20;
        this.offsetX = 0;
        this.offsetY = 0;

        // Background
        this.bgImage = null;
        this.bgOpacity = 0.5;
        this.bgX = 0;
        this.bgY = 0;
        // Global bgMetersPerPixel needs to be managed. 
        // In the original code it was a global variable.
        // We will make it a property of Renderer or pass it in.
        // For now, let's assume it's passed or managed by main.js and set here.
        // Actually, drawPath uses it. Let's add it as a property.
        this.bgMetersPerPixel = 0.05;

        // View Transform (Zoom/Pan)
        this.viewScale = 1.0;
        this.viewOffset = { x: 0, y: 0 };
    }

    resize() {
        if (this.canvas.parentElement) {
            this.width = this.canvas.parentElement.clientWidth;
            this.height = this.canvas.parentElement.clientHeight;
            this.canvas.width = this.width;
            this.canvas.height = this.height;
        }
    }

    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    setBackground(image) {
        this.bgImage = image;
        // Reset background position to center
        this.bgX = -image.width / 2;
        this.bgY = -image.height / 2;
    }

    toScreen(x, y) {
        // World -> Screen
        // 1. Scale by meters-to-pixels (this.scale)
        // 2. Apply View Zoom (this.viewScale)
        // 3. Apply View Pan (this.viewOffset)
        // 4. Center on screen

        const worldScaledX = x * this.scale;
        const worldScaledY = y * this.scale;

        return {
            x: (worldScaledX + this.offsetX) * this.viewScale + this.viewOffset.x + this.width / 2,
            y: (worldScaledY + this.offsetY) * this.viewScale + this.viewOffset.y + this.height / 2
        };
    }

    toWorld(screenX, screenY) {
        // Screen -> World
        // Reverse of toScreen

        const centeredX = screenX - this.width / 2 - this.viewOffset.x;
        const centeredY = screenY - this.height / 2 - this.viewOffset.y;

        const unzoomedX = centeredX / this.viewScale;
        const unzoomedY = centeredY / this.viewScale;

        return {
            x: (unzoomedX - this.offsetX) / this.scale,
            y: (unzoomedY - this.offsetY) / this.scale
        };
    }

    zoomAt(screenX, screenY, delta) {
        const zoomIntensity = 0.1;
        const newScale = this.viewScale * (1 + delta * zoomIntensity);

        // Limit zoom
        if (newScale < 0.1 || newScale > 10) return;

        // Calculate mouse position in world coordinates before zoom
        const worldPos = this.toWorld(screenX, screenY);

        this.viewScale = newScale;

        // Adjust offset to keep the world position under the mouse fixed
        // New Screen = (World * scale + offset) * viewScale + viewOffset + Center
        // viewOffset.x = ScreenX - Width/2 - (WorldX * scale + offsetX) * viewScale

        const worldScaledX = worldPos.x * this.scale;
        const worldScaledY = worldPos.y * this.scale;

        this.viewOffset.x = screenX - this.width / 2 - (worldScaledX + this.offsetX) * this.viewScale;
        this.viewOffset.y = screenY - this.height / 2 - (worldScaledY + this.offsetY) * this.viewScale;
    }

    pan(dx, dy) {
        this.viewOffset.x += dx;
        this.viewOffset.y += dy;
    }

    drawCalibration(currentMousePos, calibrationState, calPoint1, calPoint2) {
        if (!calPoint1) return;

        const p1 = this.toScreen(calPoint1.x, calPoint1.y);

        // Draw Point A
        this.ctx.fillStyle = 'blue';
        this.ctx.beginPath(); this.ctx.arc(p1.x, p1.y, 5, 0, Math.PI * 2); this.ctx.fill();

        // Draw Dynamic Line (Point A to Cursor)
        const mousePos = currentMousePos;

        if (calibrationState === 'point2' && mousePos && !calPoint2) {
            const p2 = this.toScreen(mousePos.x, mousePos.y);

            this.ctx.strokeStyle = '#ff00ff'; // Magenta
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(p1.x, p1.y);
            this.ctx.lineTo(p2.x, p2.y);
            this.ctx.stroke();
            this.ctx.setLineDash([]);

            // Cursor Marker
            this.ctx.beginPath(); this.ctx.arc(p2.x, p2.y, 3, 0, Math.PI * 2); this.ctx.fill();
        }

        // Draw Point B and Fixed Line
        if (calPoint2) {
            const p2 = this.toScreen(calPoint2.x, calPoint2.y);

            // Point B
            this.ctx.fillStyle = 'blue';
            this.ctx.beginPath(); this.ctx.arc(p2.x, p2.y, 5, 0, Math.PI * 2); this.ctx.fill();

            // Fixed Line
            this.ctx.strokeStyle = 'blue';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([]);
            this.ctx.beginPath();
            this.ctx.moveTo(p1.x, p1.y);
            this.ctx.lineTo(p2.x, p2.y);
            this.ctx.stroke();
        }
    }

    drawPath(path, currentMousePos = null, calibrationState = 'none', calPoint1 = null, calPoint2 = null) {
        // Draw Background
        if (this.bgImage) {
            this.ctx.save();
            this.ctx.globalAlpha = this.bgOpacity;

            const worldW = this.bgImage.width * this.bgMetersPerPixel;
            const worldH = this.bgImage.height * this.bgMetersPerPixel;

            // Draw centered at (0,0) world
            const screenTopLeft = this.toScreen(-worldW / 2, -worldH / 2);
            const screenBottomRight = this.toScreen(worldW / 2, worldH / 2);

            this.ctx.drawImage(this.bgImage,
                screenTopLeft.x, screenTopLeft.y,
                screenBottomRight.x - screenTopLeft.x,
                screenBottomRight.y - screenTopLeft.y
            );
            this.ctx.restore();
        }

        // Draw Calibration Points
        this.drawCalibration(currentMousePos, calibrationState, calPoint1, calPoint2);

        if (path.length < 1 && !calPoint1 && !currentMousePos) return; // Allow drawing background even if no path

        if (path.length >= 1) {
            // Draw Lines (only if 2+ points)
            if (path.length >= 2) {
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
            }

            // Draw Dots
            this.ctx.fillStyle = '#666';
            for (const pt of path) {
                const p = this.toScreen(pt.x, pt.y);
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        // Draw Rubber-band line (Preview next segment)
        if (path.length > 0 && currentMousePos) {
            const lastPt = path[path.length - 1];
            const pLast = this.toScreen(lastPt.x, lastPt.y);
            const pCurr = this.toScreen(currentMousePos.x, currentMousePos.y);

            this.ctx.beginPath();
            this.ctx.strokeStyle = '#666'; // Preview line color
            this.ctx.lineWidth = 1;
            this.ctx.setLineDash([2, 2]); // Finer dash for preview

            this.ctx.moveTo(pLast.x, pLast.y);
            this.ctx.lineTo(pCurr.x, pCurr.y);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
    }

    drawSimulation(states, vehicle, step = 50) {
        try {
            if (!states || states.length === 0) return;

            // 0. Swept Path (包絡線) - 青い破線
            this.ctx.strokeStyle = 'blue';
            this.ctx.lineWidth = 1;
            this.ctx.setLineDash([3, 3]);

            this.drawEnvelopeLine(states, s => s.envelope.tractor.fl);
            this.drawEnvelopeLine(states, s => s.envelope.tractor.fr);

            if (vehicle.hasTrailer) {
                // トレーラーの左後・右後
                this.drawEnvelopeLine(states, s => s.envelope.trailer.rl);
                this.drawEnvelopeLine(states, s => s.envelope.trailer.rr);
            } else {
                // 単車の場合はトラクターの後ろも描く
                this.drawEnvelopeLine(states, s => s.envelope.tractor.rl);
                this.drawEnvelopeLine(states, s => s.envelope.tractor.rr);
            }

            this.ctx.setLineDash([]);

            // 1. トラクター後輪軌跡
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

            // 2. トレーラー後輪軌跡
            if (vehicle.hasTrailer) {
                this.ctx.beginPath();
                this.ctx.strokeStyle = 'green';
                this.ctx.lineWidth = 2;
                const tStart = this.toScreen(states[0].trailer.x, states[0].trailer.y);
                this.ctx.moveTo(tStart.x, tStart.y);
                for (let i = 1; i < states.length; i++) {
                    const p = this.toScreen(states[i].trailer.x, states[i].trailer.y);
                    this.ctx.lineTo(p.x, p.y);
                }
                this.ctx.stroke();
            }

            // 3. 車両描画
            for (let i = 0; i < states.length; i += step) {
                this.drawVehicleBody(states[i], vehicle, i === states.length - 1);
            }
            this.drawVehicleBody(states[states.length - 1], vehicle, true);
        } catch (e) {
            console.error("Error in drawSimulation:", e);
        }
    }

    drawEnvelopeLine(states, selector) {
        this.ctx.beginPath();
        const start = this.toScreen(selector(states[0]).x, selector(states[0]).y);
        this.ctx.moveTo(start.x, start.y);
        for (let i = 1; i < states.length; i++) {
            const pt = selector(states[i]);
            const p = this.toScreen(pt.x, pt.y);
            this.ctx.lineTo(p.x, p.y);
        }
        this.ctx.stroke();
    }

    drawVehicleBody(state, vehicle, isLast) {
        // Effective scale (Base scale * Zoom)
        const s = this.scale * this.viewScale;

        // --- トラクター ---
        const { x, y, heading } = state;
        const screenPos = this.toScreen(x, y);

        this.ctx.save();
        this.ctx.translate(screenPos.x, screenPos.y);
        this.ctx.rotate(heading);

        const lenFront = vehicle.wheelbase + vehicle.overhangFront;
        const lenRear = vehicle.overhangRear;
        const halfWidth = vehicle.width / 2;

        this.ctx.fillStyle = isLast ? 'rgba(0, 123, 255, 0.5)' : 'rgba(0, 123, 255, 0.1)';
        this.ctx.strokeStyle = isLast ? '#0056b3' : 'rgba(0, 86, 179, 0.3)';
        this.ctx.lineWidth = 1; // Line width can remain constant or scale if desired

        // 車体
        this.ctx.beginPath();
        this.ctx.rect(-lenRear * s, -halfWidth * s, (lenFront + lenRear) * s, vehicle.width * s);
        this.ctx.fill();
        this.ctx.stroke();

        // 車軸
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'black';
        this.ctx.moveTo(0, -halfWidth * s);
        this.ctx.lineTo(0, halfWidth * s);
        this.ctx.stroke();
        this.ctx.moveTo(vehicle.wheelbase * s, -halfWidth * s);
        this.ctx.lineTo(vehicle.wheelbase * s, halfWidth * s);
        this.ctx.stroke();

        this.ctx.restore();

        // --- トレーラー ---
        if (vehicle.hasTrailer && state.trailer) {
            const tx = state.trailer.x;
            const ty = state.trailer.y;
            const th = state.trailer.heading;
            const tScreenPos = this.toScreen(tx, ty);

            this.ctx.save();
            this.ctx.translate(tScreenPos.x, tScreenPos.y);
            this.ctx.rotate(th);

            // Scale coordinates for drawing
            this.ctx.scale(s, s);
            this.ctx.lineWidth = 1 / s; // Adjust line width to remain constant visually

            if (vehicle.isPoleTrailer) {
                // Pole Trailer Rendering
                // Draw Pole (from hitch to trailer axle)
                // Since we are at trailer axle (0,0), hitch is at distance 'trailerWheelbase' in front
                const poleLen = vehicle.trailerWheelbase;

                this.ctx.fillStyle = '#94a3b8'; // Slate 400 (Pole color)
                this.ctx.fillRect(0, -0.15, poleLen, 0.3); // Pole thickness 0.3m

                // Draw Rear Bogie (Axles)
                const bogieLen = vehicle.trailerOverhangRear + 0.5; // Small front overhang for bogie
                const bogieWidth = vehicle.trailerWidth;

                this.ctx.fillStyle = isLast ? 'rgba(40, 167, 69, 0.5)' : 'rgba(40, 167, 69, 0.1)'; // Greenish for trailer
                this.ctx.fillRect(-vehicle.trailerOverhangRear, -bogieWidth / 2, bogieLen, bogieWidth);
                this.ctx.strokeStyle = isLast ? '#1e7e34' : 'rgba(40, 167, 69, 0.3)';
                this.ctx.strokeRect(-vehicle.trailerOverhangRear, -bogieWidth / 2, bogieLen, bogieWidth);

                // Draw Wheels
                this.ctx.fillStyle = '#000';
                drawAxleGroup(this.ctx, 0, bogieWidth, vehicle.trailerAxles || 1, 0.8, 0.25);

            } else {
                // Standard Trailer Rendering
                const tLenFront = vehicle.trailerWheelbase;
                const tLenRear = vehicle.trailerOverhangRear;
                const tHalfWidth = vehicle.trailerWidth / 2;

                this.ctx.fillStyle = isLast ? 'rgba(40, 167, 69, 0.5)' : 'rgba(40, 167, 69, 0.1)'; // Greenish for trailer
                this.ctx.strokeStyle = isLast ? '#1e7e34' : 'rgba(40, 167, 69, 0.3)';

                // 車体
                this.ctx.beginPath();
                this.ctx.rect(-tLenRear, -tHalfWidth, (tLenFront + tLenRear), vehicle.trailerWidth);
                this.ctx.fill();
                this.ctx.stroke();

                // 車軸
                this.ctx.beginPath();
                this.ctx.strokeStyle = 'black';
                this.ctx.moveTo(0, -tHalfWidth);
                this.ctx.lineTo(0, tHalfWidth);
                this.ctx.stroke();
            }

            this.ctx.restore();
        }
    }
}
