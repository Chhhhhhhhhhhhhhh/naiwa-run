# 奶娃快跑 · 热梗跑酷

在大学城、奶昔商业街和躺平公园一路跑酷。可以跟着奶瓶走地面，也可以沿斜坡上货车、踩着车顶箭头连跳。

**在线试玩**　[网页版](https://chhhhhhhhhhhhhhh.github.io/naiwa-run/)

电脑和手机都可以直接在浏览器开跑。[版本记录](https://github.com/Chhhhhhhhhhhhhhh/naiwa-run/releases)

## 截图

| 开始页 | 跑酷画面 |
| --- | --- |
| ![开始页](screenshots/01-menu.png) | ![跑酷画面](screenshots/02-gameplay.png) |

| 跑上货车车顶 | 失败页 |
| --- | --- |
| ![货车车顶](screenshots/03-truck-roof.png) | ![失败页](screenshots/04-gameover.png) |

### 手机竖屏

![手机竖屏](screenshots/05-mobile.png)

## 玩法

| 操作 | 键盘 | 手机 |
| --- | --- | --- |
| 闪身步（变道） | `←` `→` / `A` `D` | 左右滑动 |
| 跳跃（空中翻转） | `↑` / `空格` / `W` | 上滑 |
| 奶蛋出击（滑铲） | `↓` / `S` | 下滑 |

- 躲开低头族手机、EMO 立牌、灭霸、早八闹钟、油饼、杠精和货车。看到黄黑底座上的「跳过闹钟」标记时，可以跳过去或换道。
- 开局第 26 米有三辆车组成的连跳路线。沿斜坡上车，在车顶箭头处起跳。后续有 7 种车队组合，包括同车道直跳、换道连跳和错位并排。奶瓶沿斜坡和车顶排列，地面也有奶瓶引导绕行。
- 相信光盾、奥利给冲刺、磁吸奶瓶和篮球都用半透明光柱和地面光圈标记。护盾和冲刺能把撞到的障碍旋转撞飞，弹出「肘开！」，最后在空中留下十字闪光。冲刺期间可以连续撞飞障碍，护盾每次抵挡消耗一层。
- 拾取篮球彩蛋「鸡你太美」可获得 5 枚奶币。
- 速度从 13 m/s 起步，500 米后加速更快，3000 米前平缓封顶 27 m/s；跑过 3000 米进入「狂暴模式」，速度突破封顶稳步升至 34.5 m/s，镜头 FOV 会跟着拉大。
- 撞了就随机来一句梗，豆包老师会沿着奶娃跑过的车道追来。右上角可以暂停或静音。
- 3000 米狂暴模式：障碍换成高墙 + 货车 + 滑铲/低障的高压组合，62%→75% 概率排出「必跳」或「必滑」的全三车道组合阵（100% 有解），护盾保底路线变稀疏；还会出现迎面驶来的动态货车（大灯光锥 +「⚠️ 来车!」预警，3000 米后每跑 100 米来车速度递增 2%），刷车前必留一条完全安全通道，奶瓶收益 ×2。

## 特性

- 奶娃与豆包老师使用 GLB 骨骼模型，支持待机、跑步与角色专属动作。
- 两位角色随街景的日光和天光变化，脚下的接触阴影贴合路面、斜坡和车顶。
- 奶娃会换道侧倾、屈膝落地和踉跄。第二次受撞后，豆包老师会追上伸手抓住奶娃，再进入结算。
- three.js 沿赛道布置 Blender 街景。大学城有钟楼，商业街有彩旗和奶昔招牌，公园有荷塘、步道和林带。天色和远山随着路段渐变。
- 重复的建筑和街道组件共享网格，远景使用减面版本。道路分道线采用细米白实线。
- 普通和加长货车都支持车顶落脚。带斜坡的货车可以一路跑到 2.3 米高的车顶，整辆车驶出镜头后才会回收。
- 磁吸奶瓶让附近的奶币划弧越过货车，飞向奶娃。左上角的道具栏显示剩余时间。
- 首页先展示街景预览，角色和街景在后台加载。提前点击「开跑」会在赛道准备好后进场，开局提示会随上车和连跳阶段切换。手机端会调整竖屏镜头和渲染分辨率。
- 首页点击「开跑」先播放约 6.6 秒的开场动画（放学被豆包老师追要作业），镜头最后甩到奶娃身后无缝接入跑酷；可点「跳过」或按 Enter / 空格 / Esc 跳过。重开局不再播放。
- 被豆包老师抓住后播放约 5 秒的过场：「抓到了！」→ 老师「抓到你了！作业呢？」→ 奶娃被拎起求饶 → 老师拎着奶娃往回走、镜头拉远，再显示结算；可点「跳过」或按 Enter / 空格 / Esc 跳过。过场镜头重新设计了站位与机位，修复了原有摄像机视角穿模和遮挡问题。
- 首页为 three.js 动态舞台：悬浮圆环上奶娃与豆包老师追逐演出，三层云海缓缓漂移，奶瓶、小羊、奶粉罐、火箭和篮球环绕公转，随屏幕宽高比自动避让 UI。
- 首页新增奶瓶商店与成就图鉴。商店分「购买专区」（可叠加携带的开局消耗道具、永久解锁的 3D 潮酷装扮）与「升级专区」（磁吸小羊、奥利给推进器、光之信念镀膜 Lv.0–5 永久强化）；商店右侧内置 360° 拖拽 3D 试衣间，支持未购买装扮先试穿预览与正/背面视角切换，装扮采用摄影棚环境贴图 PBR 金属/宝石质感，实时穿在首页和跑酷中的奶娃 3D 模型上。
- 成就系统收录 50 项热梗成就（常规/稀有/传说 + 隐藏彩蛋），分跑酷实力、道具整活、惨案奇观、隐藏彩蛋四类，带详细档案、豆包老师批注和 8 阶段位；解锁时有预热动效队列与专属语音，零卡顿；结算页新解锁成就默认展示 3 个徽章，超出时支持横向滚轮与触屏左右滑动查看，点击直接弹出单卡详情。
- 支持后处理辉光（Bloom）与狂暴黄昏街灯/橱窗自发光特效，暂停菜单提供「高画质（辉光） / 流畅模式（无后效）」一键切换并记住偏好；全面优化手机端安全区边距、2×2 结算数据网格、首页双入口排版与弹窗高度适配。
- 火箭升空后进入高空巡航，左右建筑上方升起蓬松云海与立体云团遮住两侧空地，空中排布金装奶粉罐（每罐 +5 奶币）；火箭刷新概率小幅上调（常规 25%）。
- 整体背景音乐更换为 Gemini4 neon 风格的 8 小节多轨电音（主音合成器 + 和弦律动 + 木琴琶音 + 放克贝斯 + 街机鼓组，带空间回声），狂暴模式下节奏自动提速。
- 项目为纯静态站点，运行需要 WebGL，音效由 WebAudio 实时合成，语音为 edge-tts 预生成的离线中文神经语音（`assets/voice/`）。

## 本地运行

在项目根目录运行任意一种静态服务器。下列命令均使用 [http://localhost:8080](http://localhost:8080)。游戏需要通过 HTTP 加载本地 GLB 模型，请勿直接双击 `index.html` 使用 `file://` 运行。

```bash
npx serve . -l 8080
# 或者
python -m http.server 8080
```

## 角色模型

- `assets/naiwa-runner.glb` 含待机、跑步、招手、跳跃、滑铲、左右闪身、落地、踉跄和被抓住动作。
- `assets/doubao-teacher.glb` 含待机、追跑、跳跃、招手和伸手抓捕动作。

角色网格以三视图为参考，在 Blender 中绑定骨骼。原图的颜色、五官和衣服细节存于贴图，游戏运行时使用与街景一致的光照。

用下列命令和两张角色三视图生成带骨骼、动作和参考图的 Blender 源文件。第三个参数是源文件保存目录，GLB 输出到本项目的 `assets/`。

```bash
blender --background --factory-startup --python tools/build_blender_characters.py -- "/path/to/naiwa.jpg" "/path/to/doubao.jpg" "../naiwa-run-art"
```

已有 Blender 角色源文件时，可以把新动作导出到单独的目录。

```bash
blender --background --factory-startup --python tools/build_blender_characters.py -- --reanimate "../naiwa-run-art" "../naiwa-run-next-art"
```

## 灭霸和街景资产

使用 Blender 编辑生成的 `thanos-obstacle.blend`、`street-kit.blend` 和 `obstacle-kit.blend`。下面的命令同时生成游戏使用的 GLB，输出到 `assets/`。

```bash
blender --background --factory-startup --python tools/build_thanos.py -- "../naiwa-run-art" --turnaround "../naiwa-run-art/thanos-turnaround.png"
blender --background --factory-startup --python tools/build_street_kit.py -- "../naiwa-run-art"
blender --background --factory-startup --python tools/build_obstacle_kit.py -- "../naiwa-run-art"
```

灭霸采用适合游戏视角的 Q 版比例，造型参考电影概念设计和 Hot Toys 收藏模型。[电影概念设计](https://jsmarantz.artstation.com/projects/OyAnlw?album_id=6196360) · [Hot Toys 造型图](https://www.sideshow.com/collectibles/marvel-thanos-hot-toys-904600)

## 技术栈

- three.js r128（`vendor/three.min.js`）与 GLTFLoader（`vendor/GLTFLoader.js`）
- 原生 HTML / CSS / JavaScript，无前端框架、无构建步骤
- 本地 GLB 骨骼角色与 Blender 街景 + three.js 程序化模型
- WebAudio 实时合成音效与多轨 BGM + edge-tts 预生成的离线中文神经语音
- 字体使用 ZCOOL KuaiLe，加载失败时回退到系统字体。

## 目录结构

```text
index.html      页面入口、HUD 与菜单/商店/成就/暂停/结算遮罩层
boot.js         菜单首屏与游戏启动
game.js         游戏状态、主循环、玩法、碰撞、道具与 UI
models.js       程序化模型、道具标记和 Blender 街景组件
home-stage.js   首页 three.js 悬浮圆环追逐舞台
shop.js         奶瓶商店：购买/升级专区、开局携带与 3D 装扮
achievements.js 50 项热梗成就、8 阶段位与成就图鉴
assets/         角色、灭霸障碍和街景的 GLB；voice/ 离线语音 mp3
tools/          Blender 建模、动作、GLB 导出与语音生成脚本
audio.js        WebAudio 合成音效、BGM、语音与静音控制
style.css       页面样式、动画与移动端适配
vendor/         three.js 与 GLTFLoader
screenshots/    README 截图
docs/           过场动画等设计计划文档
```

游戏运行只需要静态文件服务；Blender 与建模脚本仅在重新生成角色和街景资产时需要。

## 说明

- 梗文案仅作幽默表达。
