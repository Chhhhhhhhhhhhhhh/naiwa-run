# 计划：被豆包老师抓住的过场动画

> 本文件是交接文档。任何模型接手时：先读完本文件，再看「进度」里第一个未勾选的步骤，从那里继续。
> 每完成一步就把 `[ ]` 改成 `[x]`，并在「进度日志」末尾追加一行。

## 需求（已和用户确认）

- 在现有约 1.4 秒的抓捕演出基础上，加长为约 5 秒的过场；风格与开场动画一致（电影黑边、台词气泡、大字特效、镜头切换），前后呼应。
- 剧情：豆包老师拎住奶娃：「抓到你了！作业呢？」→ 奶娃求饶「我明天一定交…」→ 豆包老师拎着奶娃往回走，镜头拉远 → 接结算页。
- 每次被抓都播；可以点「跳过」或按 Enter / 空格 / Esc 直接看结算。

## 现有代码要点（game.js，行号会变，按函数名搜索）

| 位置 | 作用 |
| --- | --- |
| `const CAPTURE_LENGTH = 1.4` 等常量 | 抓捕时长、伸手时刻、接触时刻 |
| `crash()` | 第二次撞击触发：`G.state='dying'`，`G.deadTimer=CAPTURE_LENGTH`，建立 `G.capture={from, side, height, touched, signs}` |
| `update(dt)` 中 `if (G.state === 'dying')` 分支 | 倒计时，奶娃落地，`deadTimer<=0` 时 `showGameOver()` |
| `updateCaptureChaser(dt)` | 豆包老师从 `capture.from` 跑到奶娃身边并 `Grab` |
| `updatePlayerMesh` 中 `fallen` 分支 | 奶娃转身，动作 `Caught` |
| `updateEffects` 中 `if (G.capture)` | 侧面抓捕镜头 |
| 开场动画模块（`/* ---------- 开场动画` 起） | `#intro` 遮罩 DOM 辅助函数：`introSay`、`introPop`、`introCut`、`retrigger`；跳过按钮 `#btn-intro-skip` |
| `keydown` 监听 | 开场时 Enter/空格/Esc 跳过 |

角色动画片段：奶娃 `Idle Run Greeting Jump DodgeLeft DodgeRight Land Stumble Caught`；豆包老师 `Idle Run Jump Greeting Grab`。没有走路片段，往回走用 `Run` 放慢（timeScale≈0.55）。

## 时间轴设计（elapsed = 被抓后经过的秒数，总长 `CAPTURE_TOTAL = 5.2`）

| 时间 | 画面 | 文字 / 音效 |
| --- | --- | --- |
| 0 – 1.4 | 保留现有：老师跑来伸手抓，侧面镜头 | 0.15 黑边进入、出现「跳过」；0.82 接触时大字「抓到了！」+ 震屏 |
| 1.4 – 2.7 | 老师近景（越过奶娃肩膀） | 老师：「抓到你了！作业呢？」 |
| 2.7 – 3.8 | 奶娃近景，被拎起离地约 0.3m 轻微晃动 | 奶娃：「我明天一定交…」 |
| 3.8 – 5.2 | 老师转身拎着奶娃沿赛道往回走（+Z 方向），镜头在前方抬高拉远 | 大字「补作业去！」；4.7 黑边收起；5.2 显示结算页 |

## 实施步骤

- [x] 1. **复用遮罩**：开场模块里的 DOM 辅助函数和跳过按钮改为两段过场共用。跳过按钮按 `G.state` 分派：`intro` → `finishIntro(true)`，`dying` → `skipCapture()`。CSS 无需改（`.intro-card` 只在开场显示）。
- [x] 2. **时长与计时**：新增 `CAPTURE_TOTAL = 5.2`，`crash()` 里 `G.deadTimer = CAPTURE_TOTAL`；新增 `captureElapsed()`，把所有 `CAPTURE_LENGTH - G.deadTimer` 替换为它。`G.capture` 增加 `next`（事件游标）、`hold`（拎起位置）。
- [x] 3. **事件表** `CAPTURE_EVENTS`（仿 `INTRO_EVENTS`）：黑边、台词、大字、音效、黑边收起。去掉原来 `touched` 时的 `setCoach('被豆包老师抓到了！')`，改为大字。
- [x] 4. **角色演出**：`updateCaptureChaser` 在 elapsed>1.4 后：2.7 前保持 `Grab`；3.8 后转身朝 +Z，用慢速 `Run` 往回走（速度约 1.3 m/s），高度取 `getTruckSurface` 平滑。`updatePlayerMesh` 的 `fallen` 分支在 2.7 后把奶娃挂在老师身侧（老师位置 + 侧向偏移，抬高 0.3，随步伐小幅晃动），朝向跟随老师。
- [x] 5. **镜头**：`updateEffects` 的 `G.capture` 分支在 1.4 后分三段：老师近景 → 奶娃近景 → 前方高位拉远（相机在两人前方 -Z 侧，看向 +Z，逐渐抬高后退）。段间用 `introCut()` 闪白衔接。
- [x] 6. **跳过与收尾**：`skipCapture()` 直接 `showGameOver()` 并隐藏遮罩；正常结束时黑边收起后隐藏遮罩。`keydown` 中 `dying` 状态的 Enter/空格/Esc 调用 `skipCapture()`。`showGameOver`/`startGame`/`showMenu` 确保 `#intro` 隐藏、跳过按钮不残留。
- [x] 7. **验证**：`node --check game.js`；起服务 `python -m http.server 8080`；浏览器里故意连撞两次，截图 0.5/2/3.2/4.5/5.5 秒，检查无穿模、无报错、结算页正常，「再跑一局」后开场不受影响；再测一次跳过。
- [x] 8. **收尾**：README「特性」补一句说明；本文件勾选完成。

## 进度日志

- 2026-11-23 计划创建，需求已确认。
- 2026-11-23 步骤 1–6 已实现（game.js：CAPTURE_TOTAL/captureElapsed、updateCaptureWalk、captureShot、CAPTURE_EVENTS、skipCapture）。下一步：步骤 7 浏览器验证。
- 2026-11-23 第一次浏览器验证：流程、跳过、结算均正常，0 报错。发现老师与奶娃手臂穿模、老师近景被奶娃挡住 → 新增 CAPTURE_GAP_X/Z 拉开站位，老师近景镜头改到侧面高位。待复测镜头 B/C。
- 2026-11-23 复测通过：老师近景脸部清晰、奶娃近景无明显穿模、跳过与再跑一局正常、0 报错。README 已更新。全部完成。
