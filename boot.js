(() => {
  const button = document.getElementById('btn-start');
  let startRequested = false;

  function requestStart() {
    if (startRequested) return;
    startRequested = true;
    button.disabled = true;
    button.textContent = '赛道准备中…';
    AudioSys.init();
  }

  function startFromKeyboard(event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    requestStart();
  }

  button.addEventListener('click', requestStart);
  window.addEventListener('keydown', startFromKeyboard);
  const game = document.createElement('script');
  game.src = 'game.js';
  game.onload = () => {
    button.removeEventListener('click', requestStart);
    window.removeEventListener('keydown', startFromKeyboard);
    button.disabled = false;
    if (startRequested) button.click();
  };

  // 先让菜单完成一次绘制，再创建 WebGL 场景。
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.append(game)));
})();
