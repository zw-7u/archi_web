/* ==========================================
   首页 · Three.js 故宫粒子场景
   增强版：鼠标视差、层次粒子、精细消散
   ========================================== */

   const Landing = (() => {
    let scene, camera, renderer;
    let mainParticles, mainGeo, mainMat;
    let dustParticles, dustGeo, dustMat;
    let isDissolving = false;
    let animationId;
    let mouseX = 0, mouseY = 0;
    let targetMouseX = 0, targetMouseY = 0;
  
    const MAIN_COUNT = 6000;
    const DUST_COUNT = 3000;
  
    /* ========== 故宫轮廓生成（太和殿重檐庑殿顶） ========== */
    function generatePalacePoints() {
      const pts = [];
  
      // ─── 上层屋顶 ───
      for (let i = 0; i < MAIN_COUNT * 0.18; i++) {
        const t = (Math.random() - 0.5) * 2;
        const curve = 1 - t * t;
        pts.push({
          x: t * 1.5,
          y: curve * 0.6 + 1.1 + (Math.random() - 0.5) * 0.06,
          z: (Math.random() - 0.5) * 0.3,
          type: 'roof'
        });
      }
  
      // ─── 下层屋顶（更宽更缓） ───
      for (let i = 0; i < MAIN_COUNT * 0.2; i++) {
        const t = (Math.random() - 0.5) * 2;
        const curve = 1 - t * t * 0.8;
        pts.push({
          x: t * 2.2,
          y: curve * 0.45 + 0.5 + (Math.random() - 0.5) * 0.06,
          z: (Math.random() - 0.5) * 0.4,
          type: 'roof'
        });
      }
  
      // ─── 屋脊正脊 ───
      for (let i = 0; i < MAIN_COUNT * 0.04; i++) {
        pts.push({
          x: (Math.random() - 0.5) * 1.0,
          y: 1.65 + (Math.random() - 0.5) * 0.08,
          z: (Math.random() - 0.5) * 0.1,
          type: 'ridge'
        });
      }
  
      // ─── 飞檐翘角 ───
      for (let i = 0; i < MAIN_COUNT * 0.06; i++) {
        const side = Math.random() > 0.5 ? 1 : -1;
        if (Math.random() > 0.5) {
          const spread = 1.5 + Math.random() * 0.3;
          pts.push({
            x: side * spread,
            y: 0.9 + Math.random() * 0.35 + (spread - 1.5) * 0.5,
            z: (Math.random() - 0.5) * 0.15,
            type: 'eave'
          });
        } else {
          const spread = 2.2 + Math.random() * 0.4;
          pts.push({
            x: side * spread,
            y: 0.35 + Math.random() * 0.25 + (spread - 2.2) * 0.4,
            z: (Math.random() - 0.5) * 0.2,
            type: 'eave'
          });
        }
      }
  
      // ─── 殿身（柱廊门窗） ───
      for (let i = 0; i < MAIN_COUNT * 0.15; i++) {
        const x = (Math.random() - 0.5) * 3.8;
        const y = Math.random() * 0.5 - 0.1;
        const isColumn = Math.abs(x % 0.4) < 0.06;
        if (isColumn || Math.random() > 0.3) {
          pts.push({ x, y, z: (Math.random() - 0.5) * 0.3, type: 'body' });
        }
      }
  
      // ─── 三层汉白玉台基 ───
      for (let level = 0; level < 3; level++) {
        const baseW = 2.3 + level * 0.35;
        const baseY = -0.35 - level * 0.18;
        const count = Math.floor(MAIN_COUNT * 0.06);
        for (let i = 0; i < count; i++) {
          pts.push({
            x: (Math.random() - 0.5) * baseW * 2,
            y: baseY + (Math.random() - 0.5) * 0.06,
            z: (Math.random() - 0.5) * 0.5,
            type: 'base'
          });
        }
        for (let i = 0; i < count * 0.3; i++) {
          const side = Math.random() > 0.5 ? 1 : -1;
          pts.push({
            x: side * baseW,
            y: baseY + (Math.random() - 0.5) * 0.1,
            z: (Math.random() - 0.5) * 0.5,
            type: 'base'
          });
        }
      }
  
      // ─── 中央御道台阶 ───
      for (let i = 0; i < MAIN_COUNT * 0.04; i++) {
        pts.push({
          x: (Math.random() - 0.5) * 0.8,
          y: -0.85 - Math.random() * 0.5,
          z: (Math.random() - 0.5) * 0.2,
          type: 'stairs'
        });
      }
  
      // ─── 左右配殿 ───
      for (let side = -1; side <= 1; side += 2) {
        for (let i = 0; i < MAIN_COUNT * 0.04; i++) {
          const ox = side * 3.5;
          const x = ox + (Math.random() - 0.5) * 1.2;
          const t = (x - ox) / 0.6;
          const roofY = (1 - t * t) * 0.25 + 0.15;
          const y = Math.random() > 0.5
            ? roofY + (Math.random() - 0.5) * 0.04
            : (Math.random() - 0.3) * 0.4;
          pts.push({ x, y, z: (Math.random() - 0.5) * 0.3, type: 'side' });
        }
      }
  
      // ─── 周围光晕 ───
      for (let i = 0; i < MAIN_COUNT * 0.09; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = 1.5 + Math.random() * 2.5;
        pts.push({
          x: Math.cos(angle) * r,
          y: (Math.random() - 0.5) * 2,
          z: Math.sin(angle) * r * 0.5,
          type: 'glow'
        });
      }
  
      return pts;
    }
  
    /* ========== 初始化 ========== */
    function init() {
      const canvas = document.getElementById('landing-canvas');
      if (!canvas) return;
  
      scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x1a1714, 0.08);
  
      camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
      camera.position.set(0, 0.2, 6);
  
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x1a1714, 1);
  
      createMainParticles();
      createDustParticles();
  
      // 鼠标追踪
      document.addEventListener('mousemove', (e) => {
        targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        targetMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
      });
  
      // 标题字符动画
      document.querySelectorAll('.title-char').forEach((c, i) => {
        c.style.setProperty('--i', i);
      });
  
      window.addEventListener('resize', onResize);
      animate();
    }
  
    /* ========== 主体粒子 ========== */
    function createMainParticles() {
      const points = generatePalacePoints();
      mainGeo = new THREE.BufferGeometry();
  
      const pos = new Float32Array(points.length * 3);
      const origPos = new Float32Array(points.length * 3);
      const colors = new Float32Array(points.length * 3);
      const vel = new Float32Array(points.length * 3);
  
      const palette = {
        roof: [0.83, 0.66, 0.26],
        ridge: [0.91, 0.78, 0.38],
        eave: [0.78, 0.56, 0.22],
        body: [0.72, 0.30, 0.17],
        base: [0.60, 0.56, 0.50],
        stairs: [0.54, 0.50, 0.44],
        side: [0.54, 0.48, 0.35],
        glow: [0.42, 0.35, 0.23]
      };
  
      points.forEach((p, i) => {
        const i3 = i * 3;
        pos[i3] = p.x;
        pos[i3 + 1] = p.y;
        pos[i3 + 2] = p.z;
        origPos[i3] = p.x;
        origPos[i3 + 1] = p.y;
        origPos[i3 + 2] = p.z;
  
        const c = palette[p.type] || palette.body;
        const v = 0.12;
        colors[i3] = c[0] + (Math.random() - 0.5) * v;
        colors[i3 + 1] = c[1] + (Math.random() - 0.5) * v;
        colors[i3 + 2] = c[2] + (Math.random() - 0.5) * v * 0.5;
  
        const upBias = (p.type === 'roof' || p.type === 'ridge') ? 2.5 : 1;
        const spreadBias = p.type === 'base' ? 2 : 1;
        vel[i3] = (Math.random() - 0.5) * 3 * spreadBias;
        vel[i3 + 1] = (Math.random() * 1.5 + 0.5) * upBias;
        vel[i3 + 2] = (Math.random() - 0.5) * 2;
      });
  
      mainGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      mainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      mainGeo.userData = { origPos, vel };
  
      mainMat = new THREE.PointsMaterial({
        size: 0.022,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
  
      mainParticles = new THREE.Points(mainGeo, mainMat);
      scene.add(mainParticles);
    }
  
    /* ========== 飘尘粒子 ========== */
    function createDustParticles() {
      dustGeo = new THREE.BufferGeometry();
      const pos = new Float32Array(DUST_COUNT * 3);
      const colors = new Float32Array(DUST_COUNT * 3);
  
      for (let i = 0; i < DUST_COUNT; i++) {
        const i3 = i * 3;
        pos[i3] = (Math.random() - 0.5) * 16;
        pos[i3 + 1] = (Math.random() - 0.5) * 8;
        pos[i3 + 2] = (Math.random() - 0.5) * 8 - 2;
        const w = Math.random();
        colors[i3] = 0.35 + w * 0.15;
        colors[i3 + 1] = 0.28 + w * 0.1;
        colors[i3 + 2] = 0.15 + w * 0.05;
      }
  
      dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      dustGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  
      dustMat = new THREE.PointsMaterial({
        size: 0.012,
        vertexColors: true,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
  
      dustParticles = new THREE.Points(dustGeo, dustMat);
      scene.add(dustParticles);
    }
  
    function onResize() {
      if (!camera || !renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
  
    /* ========== 动画循环 ========== */
    let time = 0;
    let dissolveProgress = 0;
  
    function animate() {
      animationId = requestAnimationFrame(animate);
      time += 0.002;
  
      mouseX += (targetMouseX - mouseX) * 0.03;
      mouseY += (targetMouseY - mouseY) * 0.03;
  
      const mPos = mainGeo.attributes.position.array;
      const orig = mainGeo.userData.origPos;
      const vel = mainGeo.userData.vel;
  
      if (isDissolving) {
        dissolveProgress += 0.006;
        const speed = dissolveProgress * dissolveProgress;
  
        for (let i = 0; i < mPos.length; i += 3) {
          mPos[i] += vel[i] * 0.015 * speed;
          mPos[i + 1] += vel[i + 1] * 0.012 * speed;
          mPos[i + 2] += vel[i + 2] * 0.01 * speed;
        }
  
        mainMat.opacity = Math.max(0, 0.9 - dissolveProgress * 0.7);
        dustMat.opacity = Math.max(0, 0.35 - dissolveProgress * 0.3);
        mainGeo.attributes.position.needsUpdate = true;
  
        camera.position.z -= 0.02 * dissolveProgress;
        camera.lookAt(0, 0, -2);
  
        if (dissolveProgress > 2) {
          cleanup();
          App.enterScenes();
          return;
        }
      } else {
        // 建筑粒子微浮动 + 鼠标视差
        for (let i = 0; i < mPos.length; i += 3) {
          const phase = i * 0.003;
          mPos[i] = orig[i]
            + Math.sin(time * 1.2 + phase) * 0.012
            + mouseX * 0.04 * (1 - Math.abs(orig[i]) * 0.08);
          mPos[i + 1] = orig[i + 1]
            + Math.cos(time + phase * 1.3) * 0.008
            - mouseY * 0.03;
          mPos[i + 2] = orig[i + 2]
            + Math.sin(time * 0.7 + phase * 0.8) * 0.006;
        }
        mainGeo.attributes.position.needsUpdate = true;
  
        // 飘尘上升
        const dPos = dustGeo.attributes.position.array;
        for (let i = 0; i < dPos.length; i += 3) {
          dPos[i + 1] += 0.001 + Math.sin(time + i) * 0.0003;
          if (dPos[i + 1] > 4) dPos[i + 1] = -4;
          dPos[i] += Math.sin(time * 0.5 + i * 0.1) * 0.001;
        }
        dustGeo.attributes.position.needsUpdate = true;
  
        camera.position.x = mouseX * 0.2;
        camera.position.y = 0.2 - mouseY * 0.1;
        camera.lookAt(0, 0.1, 0);
      }
  
      renderer.render(scene, camera);
    }
  
    /* ========== 消散 ========== */
    function dissolve() {
      if (isDissolving) return;
      isDissolving = true;
  
      document.getElementById('landing').classList.add('dissolving');
      document.getElementById('dissolve-overlay').classList.add('active');
  
      const content = document.querySelector('.landing-content');
      if (content) {
        content.style.transition = 'opacity 0.8s ease-out';
        content.style.opacity = '0';
      }
    }
  
    function cleanup() {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', onResize);
      [mainParticles, dustParticles].forEach(p => { if (p) scene.remove(p); });
      [mainGeo, dustGeo].forEach(g => { if (g) g.dispose(); });
      [mainMat, dustMat].forEach(m => { if (m) m.dispose(); });
      if (renderer) renderer.dispose();
      document.getElementById('landing').classList.add('gone');
    }
  
    return { init, dissolve };
  })();