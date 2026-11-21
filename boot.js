(() => {
  const button = document.getElementById('btn-start');
  const label = document.getElementById('start-label');
  let startRequested = false;

  function requestStart() {
    if (startRequested) return;
    startRequested = true;
    button.disabled = true;
    label.textContent = '赛道准备中';
    if (typeof AudioSys !== 'undefined') {
      AudioSys.init();
      AudioSys.duckBGM(true);
    }
  }

  function startFromKeyboard(event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (event.target instanceof HTMLButtonElement || event.target instanceof HTMLInputElement) return;
    event.preventDefault();
    requestStart();
  }

  button.addEventListener('click', requestStart);
  window.addEventListener('keydown', startFromKeyboard);
  const game = document.createElement('script');
  game.src = 'game.js';
  function handoff() {
    button.removeEventListener('click', requestStart);
    window.removeEventListener('keydown', startFromKeyboard);
    button.disabled = false;
  }
  function showRetry() {
    handoff();
    label.textContent = '重试启动';
    document.getElementById('loading-stage').textContent = '游戏启动遇到问题';
    button.addEventListener('click', () => location.reload(), { once: true });
  }
  game.onload = () => {
    if (!document.documentElement.classList.contains('game-mounted')) {
      showRetry();
      return;
    }
    handoff();
    if (startRequested) button.click();
  };
  game.onerror = showRetry;

  // 先让菜单完成一次绘制，再创建 WebGL 场景。
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.append(game)));
})();
