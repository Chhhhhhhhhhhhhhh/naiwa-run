# 奶娃快跑 · 热梗跑酷

> 一个打开浏览器就能玩的低多边形 3D 跑酷小游戏 —— 2026 Qoder 高校创造力大赛「LifeHack 生活娱乐」赛道参赛作品。

**在线试玩：** https://naiwa-run-z5gt91cnxll.qoder.zone/
**GitHub Pages 镜像：** https://chhhhhhhhhhhhhhh.github.io/naiba-run/
（免登录、免下载，电脑和手机都能直接打开）

## 截图

| 开始页 | 跑酷画面 |
| --- | --- |
| ![开始页](screenshots/01-menu.png) | ![跑酷画面](screenshots/02-gameplay.png) |

| 跑上货车车顶 | 失败页 |
| --- | --- |
| ![货车车顶](screenshots/03-truck-roof.png) | ![失败页](screenshots/04-gameover.png) |

手机竖屏：

![手机竖屏](screenshots/05-mobile.png)

## 玩法

| 操作 | 键盘 | 手机 |
| --- | --- | --- |
| 闪身步（变道） | `←` `→` / `A` `D` | 左右滑动 |
| 跳跃（空中翻转） | `↑` / `空格` / `W` | 上滑 |
| 奶蛋出击（滑铲） | `↓` / `S` | 下滑 |

- 躲开低头族手机、EMO 立牌、DDL、早八闹钟、画饼和货车；
- 部分货车带斜坡，可以直接跑上车顶，车顶上还有奶币；
- 吃到的道具：相信光盾、奥利给冲刺、磁吸奶瓶（附近金币会被吸过来）；
- 篮球彩蛋「鸡你太美」吃到 +5 奶币；
- 速度从 13 m/s 起步，越跑越快，最高 36 m/s，镜头 FOV 会跟着拉大；
- 撞了就随机来一句梗，右上角可以暂停 / 静音。

## 特性

- three.js 程序化建模，没有外部 3D 模型、图片或音频素材；
- 货车斜坡用“高度场”实现，能真的沿斜坡跑到 2.3 米高的车顶；
- 支持加长货车、并排货车车顶之间切换；
- 磁吸金币会划弧线飞向奶娃，并抬高越过货车，避免穿模；
- 速度递增 + FOV 速度感 + 提速提示；
- 大量随机梗文案：开始页标语、温馨提示、暂停标题与吐槽、失败标题 / 评语 / 底部梗；
- 响应式，手机竖屏自动调整镜头；
- 纯静态站点，无后端、无登录。

## 本地运行

需要一个静态服务器（不要直接双击 `index.html`，浏览器可能拦截部分资源）：

```bash
npx serve .
# 或者
python -m http.server 8080
```

然后打开 http://localhost:8080

## 技术栈

- three.js（`vendor/three.min.js`）
- 原生 HTML / CSS / JavaScript
- WebAudio 实时合成音效 + SpeechSynthesis 语音
- 字体：Google Fonts - ZCOOL KuaiLe（加载失败会回退系统字体）

## 目录结构

```
index.html      页面与 HUD
game.js         游戏主循环、玩法、碰撞、道具、UI 文案
models.js       程序化 3D 模型（奶娃、货车、障碍、城市、金币……）
audio.js        WebAudio 合成音效与语音
style.css       页面与遮罩层样式
vendor/         three.js
screenshots/    README 截图
```

## 用 Qoder 做出来

从 0 到上线全程在 Qoder 中完成：场景与程序化建模、玩法逻辑、移动端适配、界面文案，最后用 Qoder Sites 部署并公开访问；后续按试玩反馈继续在同一个 Qoder 工程里迭代。

## 说明

- 本项目为比赛展示作品，梗文案仅作幽默表达；
- 音效全部由 WebAudio 实时合成，无外部音频素材；
- 字体通过 Google Fonts 加载，网络不可用时会回退系统字体。
