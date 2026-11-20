# 奶娃快跑 · 热梗跑酷

> 一个打开浏览器就能玩的低多边形 3D 跑酷小游戏。

**在线试玩：** https://naiwa-run-z5gt91cnxll.qoder.zone/
**GitHub Pages 镜像：** https://chhhhhhhhhhhhhhh.github.io/naiwa-run/
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

- 城市场景、障碍和道具主要由 three.js 程序化建模；主角与追捕者使用 `assets/` 中的本地 GLB 模型；
- 主角 GLB 加载完成前或加载失败时，使用程序化后备模型，不影响开始游戏；
- 大学城、奶昔商业街、躺平公园三片区域循环切换，建筑配色与招牌随区域变化；
- 新增行道树、花坛、长椅、公交站、奶昔摊位、斑马线和屋顶设备；
- 人行道铺装与建筑立面使用程序化贴图，减少重复感并控制绘制开销；
- 货车斜坡用“高度场”实现，能真的沿斜坡跑到 2.3 米高的车顶；
- 支持加长货车、并排货车车顶之间切换；
- 磁吸金币会划弧线飞向奶娃，并抬高越过货车，避免穿模；
- 速度递增 + FOV 速度感 + 提速提示；
- 大量随机梗文案：开始页标语、温馨提示、暂停标题与吐槽、失败标题 / 评语 / 底部梗；
- 响应式，手机竖屏自动调整镜头；
- 纯静态站点，无后端、无登录。

## 本地运行

需要一个静态服务器：

```bash
npx serve . -l 8080
# 或者
python -m http.server 8080
```

然后打开 http://localhost:8080。游戏会通过 HTTP 加载本地 GLB 模型，请不要直接双击 `index.html` 使用 `file://` 运行。

## 技术栈

- three.js r128（`vendor/three.min.js`）与 GLTFLoader（`vendor/GLTFLoader.js`）
- 原生 HTML / CSS / JavaScript，无前端框架、无构建步骤
- 本地 GLB 角色模型 + three.js 程序化场景与模型
- WebAudio 实时合成音效 + SpeechSynthesis 语音
- 字体：Google Fonts - ZCOOL KuaiLe（加载失败会回退系统字体）

## 目录结构

```text
index.html      页面入口、HUD 与菜单/暂停/结算遮罩层
style.css       页面样式、动画与移动端适配
game.js         游戏状态、主循环、输入、物理、碰撞、道具与 UI
models.js       程序化 3D 模型和贴图（后备奶娃、货车、障碍、城市、金币等）
audio.js        WebAudio 合成音效、BGM、语音与静音控制
assets/         本地 GLB 角色模型、模型预览图及模型检查辅助脚本
vendor/         three.js 与 GLTFLoader
screenshots/    README 截图
```

`assets/_*.py` 和 `assets/preview*.png` 仅用于模型制作与检查，不参与游戏运行。游戏运行只需要静态文件服务，不需要安装 Python 依赖。

## 说明

- 本项目为比赛展示作品，梗文案仅作幽默表达；
- 音效全部由 WebAudio 实时合成，无外部音频素材；
- 字体通过 Google Fonts 加载，网络不可用时会回退系统字体。
