/* Adapted from nestorrig/Fluid-Pixel-Cursor-Effect (MIT).
 * Original solver and pixel renderer; portfolio integration removes the demo
 * controls and touch scroll lock, sets brand red, and adds motion/idle guards.
 * Upstream source SHA: 2307af35e90404618aea207d20d36ebf549a56d5
 * See fluid-pixel-LICENSE.txt.
 */
(() => {
  if (!document.body.classList.contains("home")) return;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const mouse = matchMedia("(hover: hover) and (pointer: fine)");
  let dispose;
  function configure() {
    if (dispose) {
      dispose();
      dispose = null;
    }
    if (!motion.matches && mouse.matches) dispose = initPixelFluidCursor();
  }
  motion.addEventListener("change", configure);
  mouse.addEventListener("change", configure);
  configure();
  function initPixelFluidCursor() {
    const initialAccentHex = normalizeHexColor(
      getComputedStyle(document.documentElement)
        .getPropertyValue("--color-accent")
        .trim() || "#004bff",
    );

    const config = {
      SIM_RESOLUTION: 150,
      PIXEL_SIZE: 16,
      VELOCITY_DISSIPATION: 0.77,
      DENSITY_DISSIPATION: 0.95,
      PRESSURE_ITERATIONS: 10,
      SPLAT_FORCE: 18,
      SPLAT_RADIUS: 2.1,
      SPEED_RADIUS_GAIN: 0.045,
      SPEED_FORCE_GAIN: 1.1,
      FRICTION: 0.22,
      COLOR_BASE_INTENSITY: 0.6,
      COLOR_SPEED_INTENSITY: 0.006,
      COLOR_R_MULT: 1,
      COLOR_G_MULT: 1,
      COLOR_B_MULT: 1,
      COLOR_BASE_HEX: initialAccentHex,
      DYE_CLAMP: 1.6,
    };
    const RENDER_ALPHA_LIGHT = 1.85;

    const canvas = document.createElement("canvas");
    canvas.id = "fluid";
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.position = "fixed";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.maxHeight = "100svh";
    canvas.style.zIndex = "0";
    canvas.style.pointerEvents = "none";
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d", { alpha: true });
    const dyeCanvas = document.createElement("canvas");
    const dyeCtx = dyeCanvas.getContext("2d", { alpha: true });
    const pixelCanvas = document.createElement("canvas");
    const pixelCtx = pixelCanvas.getContext("2d", { alpha: true });

    let width = 0;
    let height = 0;
    let simW = 0;
    let simH = 0;
    let cellCount = 0;
    let lastTime = 0;
    let dpr = 1;
    let viewportWidthCss = window.innerWidth;
    let viewportHeightCss = window.innerHeight;

    let vx = null;
    let vy = null;
    let vx0 = null;
    let vy0 = null;
    let pressure = null;
    let pressure0 = null;
    let divergence = null;
    let dyeR = null;
    let dyeG = null;
    let dyeB = null;
    let dyeR0 = null;
    let dyeG0 = null;
    let dyeB0 = null;
    const pointer = {
      targetX: window.innerWidth * 0.5,
      targetY: window.innerHeight * 0.5,
      smoothX: window.innerWidth * 0.5,
      smoothY: window.innerHeight * 0.5,
      prevX: window.innerWidth * 0.5,
      prevY: window.innerHeight * 0.5,
      speed: 0,
      ready: false,
      lastInputAt: 0,
    };
    const POINTER_IDLE_MS = 80;
    const POINTER_SPLAT_SPEED = 0.04;

    const idx = (x, y) => x + y * simW;
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    let accentColor = parseHexColor(config.COLOR_BASE_HEX);

    function normalizeHexColor(hex) {
      const clean = hex.startsWith("#") ? hex.slice(1) : hex;
      if (clean.length === 3) {
        return `#${clean
          .split("")
          .map((ch) => ch + ch)
          .join("")}`.toLowerCase();
      }
      if (clean.length === 6) return `#${clean}`.toLowerCase();
      return "#004bff";
    }

    function parseHexColor(hex) {
      const normalized = normalizeHexColor(hex);
      const clean = normalized.slice(1);
      if (clean.length !== 6) return { r: 0, g: 75 / 255, b: 1 };
      const int = Number.parseInt(clean, 16);
      if (Number.isNaN(int)) return { r: 0, g: 75 / 255, b: 1 };
      return {
        r: ((int >> 16) & 255) / 255,
        g: ((int >> 8) & 255) / 255,
        b: (int & 255) / 255,
      };
    }

    function getAccentChannels() {
      return {
        r: accentColor.r * config.COLOR_R_MULT,
        g: accentColor.g * config.COLOR_G_MULT,
        b: accentColor.b * config.COLOR_B_MULT,
      };
    }

    function createFieldArrays() {
      cellCount = simW * simH;
      vx = new Float32Array(cellCount);
      vy = new Float32Array(cellCount);
      vx0 = new Float32Array(cellCount);
      vy0 = new Float32Array(cellCount);
      pressure = new Float32Array(cellCount);
      pressure0 = new Float32Array(cellCount);
      divergence = new Float32Array(cellCount);
      dyeR = new Float32Array(cellCount);
      dyeG = new Float32Array(cellCount);
      dyeB = new Float32Array(cellCount);
      dyeR0 = new Float32Array(cellCount);
      dyeG0 = new Float32Array(cellCount);
      dyeB0 = new Float32Array(cellCount);
    }

    function resize() {
      const viewport = window.visualViewport;
      viewportWidthCss = viewport ? viewport.width : window.innerWidth;
      viewportHeightCss = viewport ? viewport.height : window.innerHeight;

      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, Math.floor(viewportWidthCss * dpr));
      height = Math.max(1, Math.floor(viewportHeightCss * dpr));

      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${viewportWidthCss}px`;
      canvas.style.height = `${viewportHeightCss}px`;

      const aspect = width / height;
      simH = Math.max(48, Math.floor(config.SIM_RESOLUTION));
      simW = Math.max(48, Math.floor(simH * aspect));

      createFieldArrays();
    }

    function sample(field, x, y) {
      const cx = clamp(x, 0, simW - 1);
      const cy = clamp(y, 0, simH - 1);
      return field[idx(cx, cy)];
    }

    function bilerp(field, x, y) {
      const x0 = Math.floor(x);
      const y0 = Math.floor(y);
      const x1 = x0 + 1;
      const y1 = y0 + 1;
      const tx = x - x0;
      const ty = y - y0;

      const a = sample(field, x0, y0);
      const b = sample(field, x1, y0);
      const c = sample(field, x0, y1);
      const d = sample(field, x1, y1);

      return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
    }

    function addSplat(normX, normY, forceX, forceY, radiusCells, color) {
      const cx = Math.floor(normX * (simW - 1));
      const cy = Math.floor(normY * (simH - 1));
      const rad = Math.max(1.2, radiusCells);
      const minX = clamp(Math.floor(cx - rad * 2), 0, simW - 1);
      const maxX = clamp(Math.floor(cx + rad * 2), 0, simW - 1);
      const minY = clamp(Math.floor(cy - rad * 2), 0, simH - 1);
      const maxY = clamp(Math.floor(cy + rad * 2), 0, simH - 1);

      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const dx = x - cx;
          const dy = y - cy;
          const falloff = Math.exp(-(dx * dx + dy * dy) / (rad * rad));
          const i = idx(x, y);

          vx[i] += forceX * falloff;
          vy[i] += forceY * falloff;
          dyeR[i] += color.r * falloff;
          dyeG[i] += color.g * falloff;
          dyeB[i] += color.b * falloff;
        }
      }
    }

    function advectScalar(src, dst, dt, dissipation) {
      const dt0x = dt * (simW - 2);
      const dt0y = dt * (simH - 2);

      for (let y = 0; y < simH; y++) {
        for (let x = 0; x < simW; x++) {
          const i = idx(x, y);
          const backX = x - vx[i] * dt0x;
          const backY = y - vy[i] * dt0y;
          dst[i] = bilerp(src, backX, backY) * dissipation;
        }
      }
    }

    function advectVelocity(dt) {
      const dt0x = dt * (simW - 2);
      const dt0y = dt * (simH - 2);

      for (let y = 0; y < simH; y++) {
        for (let x = 0; x < simW; x++) {
          const i = idx(x, y);
          const backX = x - vx[i] * dt0x;
          const backY = y - vy[i] * dt0y;
          vx0[i] = bilerp(vx, backX, backY) * config.VELOCITY_DISSIPATION;
          vy0[i] = bilerp(vy, backX, backY) * config.VELOCITY_DISSIPATION;
        }
      }
      [vx, vx0] = [vx0, vx];
      [vy, vy0] = [vy0, vy];
    }

    function solvePressure() {
      for (let y = 1; y < simH - 1; y++) {
        for (let x = 1; x < simW - 1; x++) {
          const i = idx(x, y);
          const div =
            (vx[idx(x + 1, y)] -
              vx[idx(x - 1, y)] +
              vy[idx(x, y + 1)] -
              vy[idx(x, y - 1)]) *
            0.5;
          divergence[i] = div;
          pressure[i] = 0;
        }
      }

      for (let k = 0; k < config.PRESSURE_ITERATIONS; k++) {
        for (let y = 1; y < simH - 1; y++) {
          for (let x = 1; x < simW - 1; x++) {
            const i = idx(x, y);
            pressure0[i] =
              (pressure[idx(x - 1, y)] +
                pressure[idx(x + 1, y)] +
                pressure[idx(x, y - 1)] +
                pressure[idx(x, y + 1)] -
                divergence[i]) *
              0.25;
          }
        }
        [pressure, pressure0] = [pressure0, pressure];
      }

      for (let y = 1; y < simH - 1; y++) {
        for (let x = 1; x < simW - 1; x++) {
          const i = idx(x, y);
          vx[i] -= (pressure[idx(x + 1, y)] - pressure[idx(x - 1, y)]) * 0.5;
          vy[i] -= (pressure[idx(x, y + 1)] - pressure[idx(x, y - 1)]) * 0.5;
        }
      }
    }

    function updatePointerFluid(dt) {
      pointer.smoothX += (pointer.targetX - pointer.smoothX) * config.FRICTION;
      pointer.smoothY += (pointer.targetY - pointer.smoothY) * config.FRICTION;

      const dx = pointer.smoothX - pointer.prevX;
      const dy = pointer.smoothY - pointer.prevY;
      pointer.speed = Math.hypot(dx, dy);

      const normX = clamp(pointer.smoothX / viewportWidthCss, 0, 1);
      const normY = clamp(pointer.smoothY / viewportHeightCss, 0, 1);

      const speedBoost = clamp(pointer.speed * 1.6, 0, 60);
      const radius =
        config.SPLAT_RADIUS + speedBoost * config.SPEED_RADIUS_GAIN;
      const force = config.SPLAT_FORCE + speedBoost * config.SPEED_FORCE_GAIN;
      const intensity =
        config.COLOR_BASE_INTENSITY + speedBoost * config.COLOR_SPEED_INTENSITY;
      const hasInput =
        performance.now() - pointer.lastInputAt < POINTER_IDLE_MS;

      if (hasInput && pointer.speed > POINTER_SPLAT_SPEED) {
        const channels = getAccentChannels();
        const ink =
          intensity *
          Math.max(1 - Math.max(channels.r, channels.g, channels.b), 0.55);

        addSplat(normX, normY, dx * force * dt, dy * force * dt, radius, {
          r: ink,
          g: ink,
          b: ink,
        });
      }

      pointer.prevX = pointer.smoothX;
      pointer.prevY = pointer.smoothY;
    }

    function sampleCellColor(i) {
      const channels = getAccentChannels();
      const intensity = Math.max(0, dyeR[i], dyeG[i], dyeB[i]);
      return {
        r: clamp(channels.r, 0, 1),
        g: clamp(channels.g, 0, 1),
        b: clamp(channels.b, 0, 1),
        alpha: clamp(
          clamp(intensity, 0, config.DYE_CLAMP) * RENDER_ALPHA_LIGHT,
          0,
          1,
        ),
      };
    }

    function renderPixelDye() {
      const imageData = dyeCtx.createImageData(simW, simH);
      const pixels = imageData.data;

      for (let i = 0; i < cellCount; i++) {
        const o = i * 4;
        const { r, g, b, alpha } = sampleCellColor(i);
        pixels[o] = Math.floor(r * 255);
        pixels[o + 1] = Math.floor(g * 255);
        pixels[o + 2] = Math.floor(b * 255);
        pixels[o + 3] = Math.floor(alpha * 255);
      }

      dyeCanvas.width = simW;
      dyeCanvas.height = simH;
      dyeCtx.putImageData(imageData, 0, 0);

      const pixelStep = Math.max(1, Math.floor(config.PIXEL_SIZE * dpr));
      const pixelW = Math.max(1, Math.floor(width / pixelStep));
      const pixelH = Math.max(1, Math.floor(height / pixelStep));

      if (pixelCanvas.width !== pixelW || pixelCanvas.height !== pixelH) {
        pixelCanvas.width = pixelW;
        pixelCanvas.height = pixelH;
      }

      pixelCtx.clearRect(0, 0, pixelW, pixelH);
      pixelCtx.imageSmoothingEnabled = false;
      pixelCtx.drawImage(dyeCanvas, 0, 0, pixelW, pixelH);

      ctx.clearRect(0, 0, width, height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(pixelCanvas, 0, 0, width, height);
    }

    let animationId = 0;
    let lastActivity = 0;
    function frame(now) {
      animationId = 0;
      if (document.hidden) return;
      if (now - lastActivity > 5000) {
        ctx.clearRect(0, 0, width, height);
        createFieldArrays();
        pointer.ready = false;
        return;
      }
      if (lastTime === 0) lastTime = now;
      const dt = clamp((now - lastTime) * 0.001, 0.001, 0.018);
      lastTime = now;

      if (pointer.ready) {
        updatePointerFluid(dt);
      }

      advectVelocity(dt);
      solvePressure();
      advectScalar(dyeR, dyeR0, dt, config.DENSITY_DISSIPATION);
      advectScalar(dyeG, dyeG0, dt, config.DENSITY_DISSIPATION);
      advectScalar(dyeB, dyeB0, dt, config.DENSITY_DISSIPATION);
      [dyeR, dyeR0] = [dyeR0, dyeR];
      [dyeG, dyeG0] = [dyeG0, dyeG];
      [dyeB, dyeB0] = [dyeB0, dyeB];
      renderPixelDye();

      animationId = requestAnimationFrame(frame);
    }

    function onPointerMove(clientX, clientY) {
      if (!pointer.ready) {
        pointer.smoothX = pointer.prevX = clientX;
        pointer.smoothY = pointer.prevY = clientY;
      }
      lastActivity = performance.now();
      if (!animationId) {
        lastTime = 0;
        animationId = requestAnimationFrame(frame);
      }
      pointer.targetX = clientX;
      pointer.targetY = clientY;
      pointer.ready = true;
      pointer.lastInputAt = performance.now();
    }

    function onMouseMove(event) {
      onPointerMove(event.clientX, event.clientY);
    }
    function clear() {
      cancelAnimationFrame(animationId);
      animationId = 0;
      pointer.ready = false;
      pointer.lastInputAt = 0;
      lastTime = 0;
      ctx.clearRect(0, 0, width, height);
      createFieldArrays();
    }
    function leave(event) {
      if (!event.relatedTarget) {
        pointer.ready = false;
        pointer.lastInputAt = 0;
      }
    }
    function onVisibility() {
      if (document.hidden) clear();
    }
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("resize", resize);
    window.addEventListener("blur", clear);
    document.addEventListener("pointerout", leave);
    document.addEventListener("visibilitychange", onVisibility);
    if (window.visualViewport)
      window.visualViewport.addEventListener("resize", resize);
    resize();
    return () => {
      clear();
      canvas.remove();
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", resize);
      window.removeEventListener("blur", clear);
      document.removeEventListener("pointerout", leave);
      document.removeEventListener("visibilitychange", onVisibility);
      if (window.visualViewport)
        window.visualViewport.removeEventListener("resize", resize);
    };
  }
})();
