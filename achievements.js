/* 「奶娃快跑」豪华成就系统 v2：50 项高难度热梗成就、详细档案与豆包老师批注、8 阶段位、零卡顿预热动效队列 */
const AchievementSys = (() => {
  const STORAGE_KEY = 'naiwa-achievements-v2';
  const STORAGE_VERSION = 2;

  const safeStorage = {
    get(key) {
      try { return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null; }
      catch (e) { return null; }
    },
    set(key, val) {
      try { if (typeof localStorage !== 'undefined') localStorage.setItem(key, val); return true; }
      catch (e) { return false; }
    },
    remove(key) {
      try { if (typeof localStorage !== 'undefined') localStorage.removeItem(key); }
      catch (e) {}
    },
  };

  const CATEGORIES = [
    { id: 'all', label: '全部', icon: '🏆' },
    { id: 'skill', label: '跑酷实力', icon: '🏃' },
    { id: 'item', label: '道具整活', icon: '🎒' },
    { id: 'chaos', label: '惨案奇观', icon: '💥' },
    { id: 'secret', label: '隐藏彩蛋', icon: '🕵️' },
  ];

  const TIER_META = {
    common: { label: '常规成就', tag: '常规' },
    rare: { label: '稀有成就', tag: '稀有' },
    legend: { label: '传说成就', tag: '传说' },
    secret: { label: '隐藏彩蛋', tag: '隐藏' },
  };

  const RANKS = [
    { min: 0, icon: '🍼', title: '早八菜鸟', desc: '刚睡醒，作业还没写完' },
    { min: 5, icon: '🐟', title: '摸鱼学徒', desc: '开始掌握躲老师的基本功' },
    { min: 11, icon: '🛹', title: '校园街溜子', desc: '大学城三条街横着走' },
    { min: 18, icon: '⚡', title: '资深卷王', desc: '走位曼妙，导师看了都沉默' },
    { min: 25, icon: '🛡️', title: '相信光先锋', desc: '护盾加身，大货车见了绕道走' },
    { min: 33, icon: '🚀', title: '奶娃航天员', desc: '天上地下全是你的主场' },
    { min: 40, icon: '🌟', title: '奶娃战神', desc: '肘飞灭霸，甩爆豆包老师' },
    { min: 47, icon: '👑', title: '遥遥领先大宗师', desc: '满成就神话，建议直接保研！' },
  ];

  function defaultStats() {
    return {
      totalRuns: 0,
      totalDistance: 0,
      bestDistance: 0,
      bestCleanDistance: 0,
      bestDietDistance: 0,
      bestSilentDistance: 0,
      bestNoJumpDistance: 0,
      bestNoSlideDistance: 0,
      totalCoins: 0,
      bestRunCoins: 0,
      totalRockets: 0,
      bestFlightPowder: 0,
      totalMagnetPulls: 0,
      maxShieldStack: 0,
      maxRoofChain: 0,
      bestRunRoofs: 0,
      totalRoofs: 0,
      totalBingSlides: 0,
      totalAirSlams: 0,
      totalMemes: 0,
      totalElbows: 0,
      bestRunElbows: 0,
      totalThanosElbows: 0,
      totalTruckElbows: 0,
      totalEscapes: 0,
      totalCatches: 0,
      totalTechHits: 0,
      totalSkips: 0,
      maxRunPauses: 0,
      maxLaneBurst: 0,
      speedrunRips: 0,
      tripleBuffs: 0,
      totalRecords: 0,
    };
  }

  const ACHIEVEMENTS = [
    /* ==================== 一、跑酷实力 (14) ==================== */
    {
      id: 'dist_800', cat: 'skill', tier: 'common', icon: '🧋',
      name: '冲出大学城',
      condText: '单局跑过 800 米',
      summary: '闹钟响了八百遍，我已经横跨三个区了！',
      detail: '迎着微风狂飙 800 米，你完整穿过了奶娃大学城、奶昔商业街和躺平公园，连体测 800 米都没跑得这么拼命。别人还在找教学楼，你已经开始跑第二轮街区循环了！',
      teacherNote: '「体测 800 米喊脚疼，不交作业倒是跑得比谁都欢？」',
      goal: 800, unit: '米',
      progress: s => s.bestDistance,
    },
    {
      id: 'dist_1500', cat: 'skill', tier: 'rare', icon: '🗺️',
      name: '三区环游打卡王',
      condText: '单局跑过 1500 米',
      summary: '特种兵旅游不过如此，全程零门票！',
      detail: '一口气跑过 1500 米，足足绕完两轮三大街区！从图书馆到奶茶研究所再到摸鱼亭，沿街每个悬挑招牌都记住了你风驰电掣的背影。',
      teacherNote: '「绕着学校跑两圈还不喘气，你平时藏得挺深啊！」',
      goal: 1500, unit: '米',
      progress: s => s.bestDistance,
    },
    {
      id: 'dist_2500', cat: 'skill', tier: 'rare', icon: '🏃',
      name: '长跑特长生',
      condText: '单局跑过 2500 米',
      summary: '后期速度拉满？照样当散步跑！',
      detail: '在 2500 米的高速路段里，障碍密度拉满、货车接踵而至，普通奶娃早就眼花缭乱，你却像开了高精地图一样稳健穿梭。校田径队已经连夜把你的名字写进了免试名单！',
      teacherNote: '「老师骑电瓶车都快追不上你了，你鞋底装弹簧了吧！」',
      goal: 2500, unit: '米',
      progress: s => s.bestDistance,
    },
    {
      id: 'dist_4000', cat: 'skill', tier: 'legend', icon: '🏆',
      name: '遥遥领先',
      condText: '单局跑过 4000 米',
      summary: '豆包老师跑断腿，建议学校直接保研！',
      detail: '四千米漫漫长路，全程神经紧绷、容错极低，每一次换道和起跳都精准卡在毫秒级窗口里。此刻全大学城的显示屏都应该循环播放你的名字：遥！遥！领！先！',
      teacherNote: '「行吧……今天的作业老师给你免一半，前提是你先停下来！」',
      goal: 4000, unit: '米',
      progress: s => s.bestDistance,
    },
    {
      id: 'dist_6000', cat: 'skill', tier: 'legend', icon: '👑',
      name: '大学城传说',
      condText: '单局跑过 6000 米',
      summary: '传说中从未交过一次作业的终极奶娃！',
      detail: '单局 6000 米的恐怖续航！九轮街区斗转星移，柏油马路都快被你跑出火星子，豆包老师早已在起点线原地坐下喝保温杯枸杞茶，彻底放弃治疗。',
      teacherNote: '「我退休前教过最难抓的学生，名字就叫你！」',
      goal: 6000, unit: '米',
      progress: s => s.bestDistance,
    },
    {
      id: 'total_dist_10k', cat: 'skill', tier: 'rare', icon: '🧭',
      name: '十公里逃亡者',
      condText: '累计跑酷总里程达到 10,000 米',
      summary: '逃学总里程正式迈入万米俱乐部！',
      detail: '日积月累跑出整整十公里，相当于绕标准操场跑了整整二十五圈！哪怕每一局都被豆包老师抓回来，你用双脚丈量过的每一米柏油路都在闪闪发光。',
      teacherNote: '「一万米跑下来，微信步数今天肯定霸榜第一了吧？」',
      goal: 10000, unit: '米',
      progress: s => s.totalDistance,
    },
    {
      id: 'total_dist_30k', cat: 'skill', tier: 'legend', icon: '🌍',
      name: '绕校马拉松',
      condText: '累计跑酷总里程达到 30,000 米',
      summary: '三万米耐力拉满，奶娃跑鞋已报废十双！',
      detail: '三万米累计里程，差不多快跑完一场全程马拉松！大学城每一块人行道方砖、每一座玻璃天桥都见证了你从早八菜鸟一路蜕变成顶级跑酷宗师。',
      teacherNote: '「学校操场跑道被你磨平了一层，体育老师让我代他谢谢你！」',
      goal: 30000, unit: '米',
      progress: s => s.totalDistance,
    },
    {
      id: 'no_stumble_1000', cat: 'skill', tier: 'rare', icon: '✨',
      name: '从从容容游刃有余',
      condText: '单局零失误（未触发绊倒）跑过 1000 米',
      summary: '一千米零失误，走位曼妙得像在走红毯！',
      detail: '整整一千米没有碰倒任何障碍、没有蹭到任何车头，甚至连一次踉跄都没有发生！全程丝滑流畅，把「过程基础，走位不基础」演绎得淋漓尽致。',
      teacherNote: '「居然一次失误都没有……你写卷子要是有这细心早满分了！」',
      goal: 1000, unit: '米',
      progress: s => s.bestCleanDistance,
    },
    {
      id: 'no_stumble_2200', cat: 'skill', tier: 'legend', icon: '💎',
      name: '无伤神走位',
      condText: '单局零失误（未触发绊倒）跑过 2200 米',
      summary: '连风都抓不住你的衣角，零磕碰通关大师！',
      detail: '在高速高压环境下连续 2200 米零失误零绊倒！无数次贴边闪避与毫秒级起跳，你用近乎外科手术般的精准操作，证明了人类反应速度的上限。',
      teacherNote: '「老师连你衣角都没摸到过，你这真是纯手打的吗？！」',
      goal: 2200, unit: '米',
      progress: s => s.bestCleanDistance,
    },
    {
      id: 'roof_chain_3', cat: 'skill', tier: 'rare', icon: '🚚',
      name: '屋顶飞人',
      condText: '不落地连续踩上 3 辆不同货车车顶',
      summary: '地面太烫脚，奶娃选择走高架专线！',
      detail: '沿着斜坡冲上车顶后，看准车顶白色跳车箭头连续两次精准凌空飞跃，脚不沾地连跨三辆黄色大货车！货车司机听着车顶咚咚声至今怀疑人生。',
      teacherNote: '「下来！那可是奶娃物流的加长专车，踩出脚印要赔钱的！」',
      goal: 3, unit: '辆',
      progress: s => s.maxRoofChain,
    },
    {
      id: 'roof_run_12', cat: 'skill', tier: 'rare', icon: '🛣️',
      name: '高架专线常客',
      condText: '单局累计踩上 12 辆不同货车车顶',
      summary: '一局踩遍十二辆车顶，车流就是你的楼梯！',
      detail: '别人躲着货车走，你专挑带斜坡的黄色货车往上冲！单局累计征服 12 辆货车车顶，不仅视野高人一等，还把整条物流车队当成了自家阳台。',
      teacherNote: '「奶娃物流客服刚给我打电话，问我能不能管管班里爱爬车的同学！」',
      goal: 12, unit: '辆',
      progress: s => s.bestRunRoofs,
    },
    {
      id: 'roof_total_60', cat: 'skill', tier: 'common', icon: '🏗️',
      name: '货车质检员',
      condText: '累计踩上 60 辆货车车顶',
      summary: '六十辆货车顶承重测试全部合格！',
      detail: '累计踩过 60 辆黄色大货车的车顶，每一块车顶铁皮的弹性、每一条斜坡的倾角你都了如指掌。奶娃物流正式聘请你担任荣誉车顶质量检验官！',
      teacherNote: '「质检费结一下，顺便把欠我的数学练习册补了！」',
      goal: 60, unit: '辆',
      progress: s => s.totalRoofs,
    },
    {
      id: 'bing_slider_20', cat: 'skill', tier: 'common', icon: '🥞',
      name: '拒绝画大饼',
      condText: '累计用滑铲穿过 20 次「画饼」障碍',
      summary: '二十张大饼摆在面前，老子一个都不吃！',
      detail: '面对接二连三迎面砸来的巨型「画饼」横梁，你二十次干脆利落地贴地「奶蛋出击」丝滑钻过，连一粒芝麻都没沾到！堪称职场与校园双重反套路典范。',
      teacherNote: '「这波滑铲确实丝滑，但下周期中测验可不能这么划过去！」',
      goal: 20, unit: '次',
      progress: s => s.totalBingSlides,
    },
    {
      id: 'air_slam_30', cat: 'skill', tier: 'rare', icon: '☄️',
      name: '天降奶蛋',
      condText: '累计在半空中按「下滑」急速坠落滑铲 30 次',
      summary: '滞空太慢？一记从天而降的奶蛋速降解决！',
      detail: '高手从不等重力慢慢把自己拉回地面！你熟练掌握了「起跳 → 半空急坠 → 落地瞬间滚蛋滑铲」的进阶连招，三十次凌空砸地行云流水，把滞空时间压缩到了极致。',
      teacherNote: '「咣咣咣砸柏油路，楼下教务处的吊灯都在跟着晃！」',
      goal: 30, unit: '次',
      progress: s => s.totalAirSlams,
    },

    /* ==================== 二、道具整活 (14) ==================== */
    {
      id: 'coins_150', cat: 'item', tier: 'common', icon: '🍼',
      name: '干奶达人',
      condText: '单局收集 150 奶币',
      summary: '一局豪饮一百五，这波钙质彻底超标！',
      detail: '从地面奶瓶到车顶奶瓶，再到天上的金装奶粉，一局顺手扫走 150 奶币！圆滚滚的奶白大肚皮已经发出满足的咕噜声，跑起来比平时更有劲儿了。',
      teacherNote: '「一局喝这么多奶不怕跑岔气吗？慢点吨吨吨！」',
      goal: 150, unit: '币',
      progress: s => s.bestRunCoins,
    },
    {
      id: 'coins_350', cat: 'item', tier: 'rare', icon: '🥛',
      name: '吨吨吨狂魔',
      condText: '单局收集 350 奶币',
      summary: '赛道奶瓶一扫而空，身后寸奶不生！',
      detail: '单局暴风吸入 350 奶币！车顶、地面、高空三线开花，所到之处奶瓶颗颗不留。666 超市的补货员刚摆完一排，转头一看货架又空了。',
      teacherNote: '「你跑酷是顺便进货的吧？书包里装的不是作业全是奶瓶！」',
      goal: 350, unit: '币',
      progress: s => s.bestRunCoins,
    },
    {
      id: 'coins_600', cat: 'item', tier: 'legend', icon: '🏰',
      name: '移动乳业帝国',
      condText: '单局收集 600 奶币',
      summary: '单局六百奶币入账，直接上市敲钟！',
      detail: '单局 600 奶币的惊天战绩！需要超长续航、完美吃满火箭空中奶粉与小羊磁吸爆发才能触及的财富巅峰。奶昔商业街已经准备好把整条街冠名权转给你了！',
      teacherNote: '「单局六百奶币……要不你直接资助学校修个新操场吧？」',
      goal: 600, unit: '币',
      progress: s => s.bestRunCoins,
    },
    {
      id: 'total_coins_1500', cat: 'item', tier: 'common', icon: '💰',
      name: '奶币大亨',
      condText: '累计收集 1,500 奶币',
      summary: '赛博对账完毕，你是大学城小富婆/小富翁！',
      detail: '累计收入突破 1500 奶币大关！按照奶昔商业街的行情，足够包下奶茶研究所一个季度的招牌珍珠奶昔，还能给全班每人发一箱鲜奶。',
      teacherNote: '「这么多奶币，请老师喝杯热美式提提神不过分吧？」',
      goal: 1500, unit: '币',
      progress: s => s.totalCoins,
    },
    {
      id: 'total_coins_5000', cat: 'item', tier: 'legend', icon: '🏦',
      name: '大学城首富',
      condText: '累计收集 5,000 奶币',
      summary: '五千奶币堆成金山，奶娃财富自由了！',
      detail: '整整 5000 奶币入库！你不仅是大学城跑得最快的崽，更是身家最雄厚的奶币资本家。听说连奶娃小卖部老板看见你都要提前铺红毯迎接！',
      teacherNote: '「富归富，作业可不能拿奶币买通老师代写哦！」',
      goal: 5000, unit: '币',
      progress: s => s.totalCoins,
    },
    {
      id: 'rocket_5', cat: 'item', tier: 'common', icon: '🚀',
      name: '奶娃航天局',
      condText: '累计搭乘「奥利给火箭」升空 5 次',
      summary: '五次点火发射全部成功，屁股微烫！',
      detail: '虽然奥利给火箭刷出概率极低，你依然凭借过人运气与执着完成了五次载人高空试飞！每次十米高空俯瞰天桥与街景，都能听见地面豆包老师绝望的呼喊。',
      teacherNote: '「校园空域禁止私自发射载人火箭！你这都第五回了！」',
      goal: 5, unit: '次',
      progress: s => s.totalRockets,
    },
    {
      id: 'rocket_15', cat: 'item', tier: 'rare', icon: '🛸',
      name: '常驻空间站',
      condText: '累计搭乘「奥利给火箭」升空 15 次',
      summary: '地面太堵车，我长期定居十米平流层！',
      detail: '累计十五次背着奥利给火箭冲上云霄！高空巡航对你来说已经像坐校园摆渡车一样稀松平常，连云朵飘过都要主动跟你打声招呼。',
      teacherNote: '「下次交作业是不是得用太空舱从天上给我空投下来？」',
      goal: 15, unit: '次',
      progress: s => s.totalRockets,
    },
    {
      id: 'powder_haul_5', cat: 'item', tier: 'rare', icon: '🥫',
      name: '云端干奶粉',
      condText: '单次火箭高空飞行期间收集至少 5 罐金装奶粉',
      summary: '别人在天上数星星，你在天上疯狂囤奶粉！',
      detail: '抓住短短 7 秒的高空巡航窗口，你在三条空中航道间精准变道，一口气顺走 5 罐以上「+5 奶币」金装大奶粉！一趟航班直接进账 25+ 奶币，赚麻了！',
      teacherNote: '「怪不得每次捡到火箭眼睛都在发光，天上全是你的私房钱！」',
      goal: 5, unit: '罐',
      progress: s => s.bestFlightPowder,
    },
    {
      id: 'powder_haul_7', cat: 'item', tier: 'legend', icon: '🌌',
      name: '天界进货王',
      condText: '单次火箭高空飞行期间收集至少 7 罐金装奶粉',
      summary: '一飞七罐满载而归，高空航线一根毛不剩！',
      detail: '单次火箭飞行横扫 7 罐高空金装奶粉，需要进入中后期高速巡航并几乎一罐不漏地精准卡点变道！单趟狂揽 35+ 奶币，堪称航天带货天花板。',
      teacherNote: '「高空补给都被你搬空了，后面起飞的同学喝西北风去啊？」',
      goal: 7, unit: '罐',
      progress: s => s.bestFlightPowder,
    },
    {
      id: 'sheep_magnet_120', cat: 'item', tier: 'common', icon: '🐑',
      name: '喜羊羊の引力',
      condText: '借「磁吸小羊」累计吸来 120 份奶瓶或奶粉',
      summary: '库里库里~ 只要小羊在，奶瓶自己长腿跑嘴里！',
      detail: '别看那只黄色小羊圆滚滚一脸呆萌，吸起奶瓶来简直就是便携式引力黑洞！累计为你隔空吸回 120 份补给，真正实现了躺赢式收菜。',
      teacherNote: '「这只黄色小羊怎么比我的课堂点名器吸引力还强？！」',
      goal: 120, unit: '份',
      progress: s => s.totalMagnetPulls,
    },
    {
      id: 'sheep_magnet_400', cat: 'item', tier: 'rare', icon: '🌀',
      name: '奶瓶黑洞',
      condText: '借「磁吸小羊」累计吸来 400 份奶瓶或奶粉',
      summary: '四百份补给隔空飞入怀，物理定律已失效！',
      detail: '累计借小羊之力吸回 400 份奶瓶与奶粉！每当你头顶亮起蔚蓝光环，三条车道上所有奶瓶瞬间排成银河朝你奔涌而来，场面极其解压。',
      teacherNote: '「要是有个磁铁能把你的作业本自动吸到我办公桌上就好了！」',
      goal: 400, unit: '份',
      progress: s => s.totalMagnetPulls,
    },
    {
      id: 'shield_stack_4', cat: 'item', tier: 'rare', icon: '🛡️',
      name: '光之巨人',
      condText: '同时叠加持有 4 层「相信光盾」',
      summary: '四层金光护体，此刻我就是移动堡垒！',
      detail: '既然相信光盾没有层数上限，那就把安全感拉到爆表！连续攒齐 4 层护盾舍不得撞，浑身金光闪耀得连路灯都要甘拜下风。',
      teacherNote: '「叠了四层盾……行，老师先戴副墨镜免得被你闪瞎！」',
      goal: 4, unit: '层',
      progress: s => s.maxShieldStack,
    },
    {
      id: 'shield_stack_7', cat: 'item', tier: 'legend', icon: '☀️',
      name: '迪迦本迦',
      condText: '同时叠加持有 7 层「相信光盾」',
      summary: '七层神盾加身，召唤神龙都能顺手办了！',
      detail: '能在一局里零失误攒出整整 7 层相信光盾而不消耗，说明你不仅走位稳如泰山，还是个极度爱囤货的仓鼠系玩家！前方哪怕摆一排卡车也只配给你挠痒痒。',
      teacherNote: '「七层护盾？！你这是准备直接硬闯教导主任办公室吗！」',
      goal: 7, unit: '层',
      progress: s => s.maxShieldStack,
    },
    {
      id: 'jntm_5', cat: 'item', tier: 'rare', icon: '🏀',
      name: '练习时长两年半',
      condText: '累计收集 5 个「鸡你太美」篮球',
      summary: '唱、跳、rap、跑酷，五次接球丝滑无比！',
      detail: '在熙攘的车流里五次稳稳接住旋转的背带篮球，每颗都带来 +5 奶币和响亮的节奏感。看这熟练的跨步收球身姿，背后绝对偷偷练了不止两年半！',
      teacherNote: '「体育课三步上篮走步，逃跑路上捡篮球倒是百发百中？」',
      goal: 5, unit: '次',
      progress: s => s.totalMemes,
    },

    /* ==================== 三、惨案奇观 (12) ==================== */
    {
      id: 'runs_5', cat: 'chaos', tier: 'common', icon: '🎒',
      name: '逃学常客',
      condText: '累计完成 5 局跑酷',
      summary: '作业天天不交，柏油路天天打卡！',
      detail: '连续五次在放学铃响后拔腿狂奔，虽然每次最后都被豆包老师拎了回去，但你百折不挠的逃学精神已经深深感动了路边的行道树。',
      teacherNote: '「这周已经抓你五回了，明天是不是还打算继续跑？」',
      goal: 5, unit: '局',
      progress: s => s.totalRuns,
    },
    {
      id: 'runs_25', cat: 'chaos', tier: 'rare', icon: '🔥',
      name: '校园老油条',
      condText: '累计完成 25 局跑酷',
      summary: '二十五局摸鱼实战，闭着眼都知道哪有坑！',
      detail: '整整 25 局高强度跑酷洗礼！哪个路口容易刷斜坡货车、哪段画饼紧跟闹钟、哪块斑马线适合换道，全都刻进了你的肌肉记忆里。',
      teacherNote: '「二十五局了……你把玩游戏这股韧劲分十分之一给背单词行不行？」',
      goal: 25, unit: '局',
      progress: s => s.totalRuns,
    },
    {
      id: 'elbow_10', cat: 'chaos', tier: 'common', icon: '💪',
      name: '肘击之王',
      condText: '累计用护盾或火箭肘飞 10 个障碍物',
      summary: '十连铁肘送障碍物上天，化作璀璨星光✨',
      detail: '挡路？不存在的！借着护盾与火箭的神力，你已经把整整 10 个障碍物一肘子轰进了平流层，每次听见天边「叮——」的一声闪光都神清气爽。',
      teacherNote: '「校园里的设施怎么每天少几个？原来全被你肘上天了！」',
      goal: 10, unit: '次',
      progress: s => s.totalElbows,
    },
    {
      id: 'elbow_40', cat: 'chaos', tier: 'rare', icon: '🏗️',
      name: '拆迁办主任',
      condText: '累计肘飞 40 个障碍物',
      summary: '市政维修队连夜把你拉进了大学城黑名单！',
      detail: '四十个障碍物在你的铁肘之下原地升天！从手机墙、早八闹钟到加长泥头车无一幸免。大学城后勤部已发布红色预警：见黄色大肚娃请立刻绕行！',
      teacherNote: '「今年学校公共设施维修费超支 500%，账单已经贴你桌上了！」',
      goal: 40, unit: '次',
      progress: s => s.totalElbows,
    },
    {
      id: 'elbow_100', cat: 'chaos', tier: 'legend', icon: '🚜',
      name: '人形推土机',
      condText: '累计肘飞 100 个障碍物',
      summary: '百肘百中，物理引擎见你都得喊一声大哥！',
      detail: '整整 100 次硬核肘击清障！哪里有障碍哪里就有你的铁肘，所过之处片甲不留，星空中已经飘满了被你送上天的路障和货车。',
      teacherNote: '「一百个障碍全飞了……老师决定今天不对你动粗，咱们以德服人！」',
      goal: 100, unit: '次',
      progress: s => s.totalElbows,
    },
    {
      id: 'elbow_run_8', cat: 'chaos', tier: 'rare', icon: '💥',
      name: '一路横推',
      condText: '单局内累计肘飞 8 个障碍物',
      summary: '单局连肘八个，主打一个绝不绕路！',
      detail: '别人在单局里小心翼翼走位避障，你偏偏攒满护盾和火箭一路平推过去，单局狂肘 8 个障碍物，硬生生把躲避跑酷玩成了无双割草游戏！',
      teacherNote: '「一条好端端的马路被你肘成了拆迁现场，真有你的！」',
      goal: 8, unit: '次',
      progress: s => s.bestRunElbows,
    },
    {
      id: 'elbow_thanos_3', cat: 'chaos', tier: 'rare', icon: '🧤',
      name: '灭霸？三肘子的事！',
      condText: '累计正面肘飞 3 次「灭霸」障碍',
      summary: '打响指之前先问问奶娃的胳膊肘答不答应！',
      detail: '宇宙计生委主任紫薯精三次威风凛凛地站在路中央准备打响指，结果三次都被你迎面一铁肘干进外太空！无限手套在奶娃的相信光面前彻底沦为笑话。',
      teacherNote: '「灭霸都被你干飞三次了，今晚那三张数学卷子你应该也能秒杀吧？」',
      goal: 3, unit: '次',
      progress: s => s.totalThanosElbows,
    },
    {
      id: 'elbow_truck_15', cat: 'chaos', tier: 'rare', icon: '🚛',
      name: '徒手掀卡车',
      condText: '累计肘飞 15 辆大货车',
      summary: '几吨重的黄色物流车？一肘子照样起飞！',
      detail: '哪怕是长达十几米的加长物流大货车，撞上开盾的你照样像纸糊的一样翻滚上天、化成流星！牛顿看了棺材板都要按不住了。',
      teacherNote: '「十五辆卡车啊！！物流公司老总正在校门口找你聊赔偿呢！」',
      goal: 15, unit: '辆',
      progress: s => s.totalTruckElbows,
    },
    {
      id: 'escape_5', cat: 'chaos', tier: 'common', icon: '💨',
      name: '脚底抹油',
      condText: '撞障碍引来豆包老师追捕后成功甩开 5 次',
      summary: '五次丝血虎口脱险，走位就是这么不基础！',
      detail: '五次失误绊倒后豆包老师都杀到屁股后面伸手抓人了，你愣是顶住巨大心理压力稳住操作、扛过追捕倒计时把老师甩回身后，心脏素质堪比拆弹专家！',
      teacherNote: '「每次都差半步抓到你衣领，你鞋底到底抹了多少油？！」',
      goal: 5, unit: '次',
      progress: s => s.totalEscapes,
    },
    {
      id: 'escape_15', cat: 'chaos', tier: 'rare', icon: '🐍',
      name: '滑不留手泥鳅娃',
      condText: '撞障碍引来豆包老师追捕后成功甩开 15 次',
      summary: '十五次绝境逃生，老师手里根本抓不住！',
      detail: '整整十五次从豆包老师眼皮底下惊险溜走！对你而言，绊倒一下根本不算失误，只是为了给跑酷增加一点心跳刺激的开胃小菜。',
      teacherNote: '「呼……呼……我跑不动了，你赢了，这学期逃生课给你满分！」',
      goal: 15, unit: '次',
      progress: s => s.totalEscapes,
    },
    {
      id: 'caught_10', cat: 'chaos', tier: 'common', icon: '📝',
      name: '补作业专业户',
      condText: '累计被豆包老师抓去补作业 10 次',
      summary: '办公室饮水机和草稿纸都已经认得你了！',
      detail: '十次被豆包老师当场拎着衣领押回办公室补作业，连「我、我明天一定交…」的求饶台词都念出了播音腔。胜败乃兵家常事，补完作业明天继续跑！',
      teacherNote: '「老位置坐好！黑笔、错题本、温开水老师全给你备齐了！」',
      goal: 10, unit: '次',
      progress: s => s.totalCatches,
    },
    {
      id: 'hit_tech_8', cat: 'chaos', tier: 'common', icon: '📱',
      name: '低头族现世报',
      condText: '累计撞上「手机墙」或「早八闹钟」障碍 8 次',
      summary: '熬夜刷手机 + 赖床早八，八连暴击精准拿捏！',
      detail: '三条宽敞的柏油路你不走，偏偏八次一头栽进巨大手机屏和早八闹钟的怀抱！果然当代年轻人最大的两座大山，哪怕躲进跑酷世界也照样精准制裁你。',
      teacherNote: '「说了多少遍走路别低头玩手机、晚上早点睡，现在信了吧？」',
      goal: 8, unit: '次',
      progress: s => s.totalTechHits,
    },

    /* ==================== 四、隐藏彩蛋 (10) ==================== */
    {
      id: 'speedrun_rip', cat: 'secret', tier: 'secret', secret: true, icon: '🛌',
      name: '开局即下班',
      hint: '提示：以史上最快速度向豆包老师主动自首…',
      condText: '单局在 35 米内被豆包老师抓获',
      summary: '史上最快交作业速通纪录！躺平效率拉满！',
      detail: '才刚喊完「冲鸭！」不到两秒钟，连第一个街口都没摸到，你便以惊人的果断光速芭比Q！这哪是逃跑，分明是思念办公室温暖的椅子了。',
      teacherNote: '「表扬！主动冲回来交作业的模范生，奖励多抄两遍古诗！」',
      goal: 1, unit: '次',
      progress: s => s.speedrunRips,
    },
    {
      id: 'diet_master', cat: 'secret', tier: 'secret', secret: true, icon: '🧘',
      name: '戒奶大师',
      hint: '提示：滴奶不沾，靠纯钢铁意志硬扛很远…',
      condText: '单局 0 奶币跑过 260 米',
      summary: '二百六十米一口奶没喝，反人性自律天花板！',
      detail: '满大街金灿灿的奶瓶冲你疯狂招手，你却心如止水、刻意绕开每一道奶瓶引导线，愣是 0 奶币硬生生撑过 260 米！这份反直觉微操功力令人叹服。',
      teacherNote: '「连最爱的奶瓶都能忍住 260 米不碰，你是悟道成仙了吗？」',
      goal: 260, unit: '米',
      progress: s => s.bestDietDistance,
    },
    {
      id: 'pause_slacker', cat: 'secret', tier: 'secret', secret: true, icon: '☕',
      name: '摸鱼大师',
      hint: '提示：带薪休息哪有嫌多的，一局多歇好几次…',
      condText: '单局内手动暂停游戏达到 5 次',
      summary: '跑两步歇一口气，暂停键都被你按出包浆了！',
      detail: '一局跑酷里连续祭出五次「战术暂停」！一会儿喝口水、一会儿系鞋带、一会儿调音量，硬生生把生死时速的逃学追逐玩成了精致下午茶。',
      teacherNote: '「怎么每隔十秒整个世界就定格一次？你偷偷学了时间暂停术？」',
      goal: 5, unit: '次',
      progress: s => s.maxRunPauses,
    },
    {
      id: 'skip_cutscene_10', cat: 'secret', tier: 'secret', secret: true, icon: '⏩',
      name: '真没空陪你闹了',
      hint: '提示：别讲大道理了，每次我都想一键快进！',
      condText: '累计跳过开场动画或被抓过场 10 次',
      summary: '豆包老师嘴还没张开，你已经十次光速快进！',
      detail: '无论是放学门口的灵魂拷问，还是被抓后的苦口婆心，你十次果断点击跳过绝不浪费一秒！时间就是里程，这就是极致效率主义者的冷酷觉悟。',
      teacherNote: '「喂！我都十次没念完台词了，稍微给老师一点戏份好不好！」',
      goal: 10, unit: '次',
      progress: s => s.totalSkips,
    },
    {
      id: 'lane_dancer', cat: 'secret', tier: 'secret', secret: true, icon: '💃',
      name: '凌波微步',
      hint: '提示：5 秒内把「闪身步」疯狂按成电风扇…',
      condText: '5 秒内连续左右换道达到 18 次',
      summary: '五秒十八次横跳，赛道已经被你晃出残影了！',
      detail: '短短五秒内在三条车道间左右狂扭十八次，手速快到连「闪身步！」的配音都彻底跟不上节奏！身后追赶的豆包老师当场晕车，眼睁睁看着一团黄色闪电疯狂抽搐。',
      teacherNote: '「别晃了别晃了！老师眼睛都看花了，你的键盘还好吗？」',
      goal: 18, unit: '次',
      progress: s => s.maxLaneBurst,
    },
    {
      id: 'silent_ninja', cat: 'secret', tier: 'secret', secret: true, icon: '🤫',
      name: '工位偷偷玩',
      hint: '提示：嘘——班味最重的超长静音潜行挑战…',
      condText: '单局在静音状态下跑过 600 米',
      summary: '表情严肃像写周报，静音潜行已冲六百米🤫',
      detail: '默默关掉全部声音、神情沉稳得仿佛正在审阅千万级方案，实则已经在无声世界里飙过整整 600 米！每一句没播出来的「冲鸭！」都在你内心默默回响。',
      teacherNote: '「嘘……老师替你把音量键焊死了，领导路过记得秒按 P！」',
      goal: 600, unit: '米',
      progress: s => s.bestSilentDistance,
    },
    {
      id: 'no_jump_300', cat: 'secret', tier: 'secret', secret: true, icon: '🦶',
      name: '脚踏实地',
      hint: '提示：谁说中国人非得飞？全程双脚不离地试试…',
      condText: '单局全程 0 次跳跃跑过 300 米',
      summary: '三百米一次没跳，纯靠左右走位与滑铲硬过！',
      detail: '扣掉空格键和上方向键，硬是凭借精准的预判换道与贴地滑铲，一步不离地面稳稳跑过 300 米！谁说跑酷非要飞檐走壁，咱讲究的就是一个脚踏实地！',
      teacherNote: '「一步都没跳还能跑三百米，你的地板走位确实有点东西！」',
      goal: 300, unit: '米',
      progress: s => s.bestNoJumpDistance,
    },
    {
      id: 'no_slide_500', cat: 'secret', tier: 'secret', secret: true, icon: '🧍',
      name: '宁折不弯',
      hint: '提示：头可断腰不能弯，绝不低头滚蛋试试…',
      condText: '单局全程 0 次滑铲跑过 500 米',
      summary: '五百米全程挺直腰板，绝不使出一记滑铲！',
      detail: '面对迎面而来的画饼横梁与密集障碍，你愣是保持着顶天立地的笔直站姿，一次滑铲都没按、纯靠换道和跳跃硬闯 500 米！这份傲骨值得全校起立鼓掌。',
      teacherNote: '「腰板挺得这么直，上课坐姿要也能保持这样就好了！」',
      goal: 500, unit: '米',
      progress: s => s.bestNoSlideDistance,
    },
    {
      id: 'triple_buff', cat: 'secret', tier: 'secret', secret: true, icon: '🌈',
      name: '满身外挂',
      hint: '提示：把护盾、火箭、小羊三大神器凑在同一秒…',
      condText: '同一瞬间同时生效「相信光盾 + 奥利给火箭 + 磁吸小羊」',
      summary: '三神装同框发光，此刻你就是宇宙中心！',
      detail: '金光护盾护体、屁股喷着奥利给尾焰翱翔十米高空、同时还带着黄色小羊隔空狂吸空中金装奶粉！三大顶级 Buff 同框叠加的梦幻瞬间，全服欧皇认证！',
      teacherNote: '「又是盾又是火箭又是小羊……这局不算，你绝对开挂了！」',
      goal: 1, unit: '次',
      progress: s => s.tripleBuffs,
    },
    {
      id: 'new_record_5', cat: 'secret', tier: 'secret', secret: true, icon: '📈',
      name: '卷王进化论',
      hint: '提示：没有最强只有更强，不断超越昨天的自己…',
      condText: '累计刷新个人「最佳距离」纪录 5 次',
      summary: '五次打破自己的天花板，卷王永不止步！',
      detail: '一次次刷新个人最佳距离，每次结算都听见那句响亮的「遥遥领先！」。真正的强者从不和别人攀比，只是一遍遍把昨天的自己甩在身后！',
      teacherNote: '「进步速度这么快，老师决定给你发一张三好逃学奖状！」',
      goal: 5, unit: '次',
      progress: s => s.totalRecords,
    },
  ];

  const ACH_BY_ID = Object.create(null);
  for (const a of ACHIEVEMENTS) ACH_BY_ID[a.id] = a;

  function loadState() {
    const fallback = { version: STORAGE_VERSION, unlocked: Object.create(null), stats: defaultStats() };
    const raw = safeStorage.get(STORAGE_KEY);
    if (!raw) return fallback;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return fallback;
      const stats = defaultStats();
      if (parsed.stats && typeof parsed.stats === 'object') {
        for (const key of Object.keys(stats)) {
          const v = Number(parsed.stats[key]);
          if (Number.isFinite(v) && v >= 0) stats[key] = v;
        }
      }
      const unlocked = Object.create(null);
      if (parsed.unlocked && typeof parsed.unlocked === 'object') {
        for (const [id, entry] of Object.entries(parsed.unlocked)) {
          if (!ACH_BY_ID[id]) continue;
          if (typeof entry === 'number' && Number.isFinite(entry)) {
            unlocked[id] = { at: entry, snapshot: '' };
          } else if (entry && typeof entry === 'object') {
            unlocked[id] = {
              at: Number.isFinite(Number(entry.at)) ? Number(entry.at) : Date.now(),
              snapshot: typeof entry.snapshot === 'string' ? entry.snapshot.slice(0, 80) : '',
            };
          }
        }
      }
      return { version: STORAGE_VERSION, unlocked, stats };
    } catch (e) {
      return fallback;
    }
  }

  let data = loadState();
  let dirty = false;
  let saveTimer = null;

  function saveNow() {
    dirty = false;
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    safeStorage.set(STORAGE_KEY, JSON.stringify({
      version: STORAGE_VERSION,
      unlocked: data.unlocked,
      stats: data.stats,
    }));
  }

  // 所有局内写盘一律延迟至空闲回调或异步宏任务，避免同步 localStorage IPC 阻塞 WebGL 渲染帧
  function scheduleSave(soon = false) {
    dirty = true;
    if (typeof window === 'undefined') { saveNow(); return; }
    if (saveTimer) {
      if (!soon) return;
      clearTimeout(saveTimer);
    }
    const delay = soon ? 180 : 1200;
    saveTimer = setTimeout(() => {
      saveTimer = null;
      if (!dirty) return;
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(() => { if (dirty) saveNow(); }, { timeout: 600 });
      } else {
        saveNow();
      }
    }, delay);
  }

  function freshRun() {
    return {
      active: false,
      distance: 0,
      coins: 0,
      stumbles: 0,
      cleanDist: 0,
      silentDist: 0,
      lastTickDist: 0,
      roofChain: 0,
      runRoofs: 0,
      lastTruck: null,
      flightPowder: 0,
      runElbows: 0,
      jumps: 0,
      slides: 0,
      pauses: 0,
      laneTimes: [],
      newUnlocked: [],
    };
  }
  let run = freshRun();

  function unlockedCount() {
    return Object.keys(data.unlocked).length;
  }

  function getRank(count = unlockedCount()) {
    let current = RANKS[0];
    let next = null;
    for (let i = 0; i < RANKS.length; i++) {
      if (count >= RANKS[i].min) {
        current = RANKS[i];
        next = RANKS[i + 1] || null;
      }
    }
    return { current, next, count, total: ACHIEVEMENTS.length };
  }

  function formatTime(ts) {
    if (!Number.isFinite(ts) || ts <= 0) return '已解锁';
    try {
      const d = new Date(ts);
      const pad = n => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch (e) {
      return '已解锁';
    }
  }

  /* ---------- 零卡顿预热复用式 Toast 串行队列 ---------- */
  const toastQueue = [];
  let toastActive = false;
  let toastScheduled = false;
  let toastToken = 0;
  let toastTimer = null;
  let toastExitTimer = null;
  let toastShell = null;

  const CONFETTI_DIRS = [
    [34, -18, 45], [44, 6, 110], [26, 28, 175],
    [-28, -22, 230], [-42, 4, 290], [-22, 26, 340],
  ];

  function ensureToastShell() {
    if (toastShell || typeof document === 'undefined') return toastShell;
    const layer = document.getElementById('ach-toast-layer');
    if (!layer) return null;

    const el = document.createElement('div');
    el.className = 'ach-toast is-idle';
    el.dataset.tier = 'common';

    const confettiWrap = document.createElement('div');
    confettiWrap.className = 'ach-confetti-wrap';
    const confettiNodes = [];
    for (const [cx, cy, cr] of CONFETTI_DIRS) {
      const p = document.createElement('span');
      p.className = 'ach-confetti';
      p.style.setProperty('--cx', `${cx}px`);
      p.style.setProperty('--cy', `${cy}px`);
      p.style.setProperty('--cr', `${cr}deg`);
      confettiWrap.appendChild(p);
      confettiNodes.push(p);
    }

    const sheen = document.createElement('div');
    sheen.className = 'ach-toast-sheen';
    const sheenBar = document.createElement('span');
    sheenBar.className = 'ach-toast-sheen-bar';
    sheen.appendChild(sheenBar);

    const badge = document.createElement('div');
    badge.className = 'ach-toast-badge';
    const front = document.createElement('span');
    front.className = 'ach-badge-front';
    front.textContent = '❓';
    const back = document.createElement('span');
    back.className = 'ach-badge-back';
    back.textContent = '🏆';
    badge.append(front, back);

    const body = document.createElement('div');
    body.className = 'ach-toast-body';
    const topRow = document.createElement('div');
    topRow.className = 'ach-toast-top';
    const tag = document.createElement('span');
    tag.className = 'ach-toast-tag';
    tag.textContent = '🎉 成就解锁';
    const queuePill = document.createElement('span');
    queuePill.className = 'ach-toast-queue hidden';
    topRow.append(tag, queuePill);
    const title = document.createElement('div');
    title.className = 'ach-toast-title';
    title.textContent = '预热';
    const sub = document.createElement('div');
    sub.className = 'ach-toast-sub';
    sub.textContent = '预热';
    body.append(topRow, title, sub);

    el.append(confettiWrap, sheen, badge, body);
    layer.appendChild(el);
    toastShell = { el, badge, front, back, tag, queuePill, title, sub, confettiNodes };
    return toastShell;
  }

  function scheduleDrainToast() {
    if (toastActive || toastScheduled || toastQueue.length === 0) return;
    if (typeof document === 'undefined') { toastQueue.length = 0; return; }
    toastScheduled = true;
    // 放到当前 WebGL 渲染帧之后再触发 DOM 过渡，绝不抢占物理步耗时
    setTimeout(() => {
      toastScheduled = false;
      drainToastQueue();
    }, 0);
  }

  function drainToastQueue() {
    if (typeof document === 'undefined') { toastQueue.length = 0; return; }
    if (toastActive || toastQueue.length === 0) return;
    const shell = ensureToastShell();
    if (!shell) return;

    toastActive = true;
    const token = ++toastToken;
    const ach = toastQueue.shift();
    const remaining = toastQueue.length;
    const tierInfo = TIER_META[ach.tier] || TIER_META.common;

    const colors = ach.tier === 'secret'
      ? ['#c48bff', '#ffcf3f', '#ff7bac', '#8fe8ff']
      : ach.tier === 'legend'
        ? ['#ffcf3f', '#ff7a3c', '#8fe8ff', '#fff6e3']
        : ['#ffcf3f', '#ffe89c', '#5ec8f2', '#ff9fcf'];
    for (let i = 0; i < shell.confettiNodes.length; i++) {
      shell.confettiNodes[i].style.background = colors[i % colors.length];
    }

    shell.el.dataset.tier = ach.tier;
    shell.badge.classList.toggle('is-secret', Boolean(ach.secret));
    shell.back.textContent = ach.icon;
    shell.tag.textContent = `🎉 ${tierInfo.label}解锁`;
    if (remaining > 0) {
      shell.queuePill.textContent = `+${remaining}`;
      shell.queuePill.classList.remove('hidden');
    } else {
      shell.queuePill.classList.add('hidden');
    }
    shell.title.textContent = ach.name;
    shell.sub.textContent = `${ach.condText} · ${ach.summary}`;

    // 重置一次动画态并在下一帧启用 GPU 合成动画，避免强制同步回流（offsetWidth）
    shell.el.classList.remove('is-show', 'is-leave', 'is-idle');
    shell.el.classList.add('is-prep');
    requestAnimationFrame(() => {
      if (token !== toastToken) return;
      shell.el.classList.remove('is-prep');
      shell.el.classList.add('is-show');
    });

    if (typeof AudioSys !== 'undefined' && typeof AudioSys.playAchievement === 'function') {
      AudioSys.playAchievement(ach.tier, { withVoice: true });
    }

    const stayMs = remaining > 0 ? 2500 : 3300;
    toastTimer = setTimeout(() => {
      if (token !== toastToken) return;
      shell.el.classList.remove('is-show');
      shell.el.classList.add('is-leave');
      toastExitTimer = setTimeout(() => {
        if (token !== toastToken) return;
        shell.el.classList.remove('is-leave');
        shell.el.classList.add('is-idle');
        toastActive = false;
        scheduleDrainToast();
      }, 300);
    }, stayMs);
  }

  function unlock(id, snapshot = '') {
    const ach = ACH_BY_ID[id];
    if (!ach || data.unlocked[id]) return false;
    data.unlocked[id] = { at: Date.now(), snapshot: String(snapshot || '').slice(0, 80) };
    if (run.active && !run.newUnlocked.includes(id)) run.newUnlocked.push(id);
    // 异步延迟存盘，绝不在游戏帧内同步阻塞 localStorage
    scheduleSave(true);
    toastQueue.push(ach);
    scheduleDrainToast();
    if (!run.active) syncEntryBadges();
    if (isModalOpen()) renderModalContent();
    return true;
  }

  /* ---------- 玩法事件接入 ---------- */
  function record(event, payload = {}) {
    const s = data.stats;
    switch (event) {
      case 'runStart': {
        run = freshRun();
        run.active = true;
        run.lastTickDist = Math.max(0, Number(payload.distance) || 0);
        return;
      }
      case 'tick': {
        if (!run.active) return;
        const dist = Math.max(0, Number(payload.distance) || 0);
        const score = Math.floor(dist);
        const delta = Math.max(0, dist - run.lastTickDist);
        run.lastTickDist = dist;
        run.distance = dist;

        if (score > s.bestDistance) { s.bestDistance = score; scheduleSave(); }
        if (score >= 800) unlock('dist_800', `单局狂奔至 ${score} 米`);
        if (score >= 1500) unlock('dist_1500', `单局三区环游达 ${score} 米`);
        if (score >= 2500) unlock('dist_2500', `单局高速长跑至 ${score} 米`);
        if (score >= 4000) unlock('dist_4000', `单局突破 ${score} 米遥遥领先`);
        if (score >= 6000) unlock('dist_6000', `单局封神跑出 ${score} 米`);

        const liveTotalDist = s.totalDistance + score;
        if (liveTotalDist >= 10000) unlock('total_dist_10k', `累计里程突破 ${liveTotalDist} 米`);
        if (liveTotalDist >= 30000) unlock('total_dist_30k', `累计里程突破 ${liveTotalDist} 米`);

        if (run.stumbles === 0) {
          run.cleanDist = dist;
          const clean = Math.floor(run.cleanDist);
          if (clean > s.bestCleanDistance) { s.bestCleanDistance = clean; scheduleSave(); }
          if (clean >= 1000) unlock('no_stumble_1000', `零失误跑至 ${clean} 米`);
          if (clean >= 2200) unlock('no_stumble_2200', `无伤神走位达 ${clean} 米`);
        }

        if (run.coins === 0) {
          if (score > s.bestDietDistance) { s.bestDietDistance = score; scheduleSave(); }
          if (score >= 260) unlock('diet_master', `滴奶未沾硬扛 ${score} 米`);
        }

        if (run.jumps === 0) {
          if (score > s.bestNoJumpDistance) { s.bestNoJumpDistance = score; scheduleSave(); }
          if (score >= 300) unlock('no_jump_300', `全程零跳跃跑过 ${score} 米`);
        }

        if (run.slides === 0) {
          if (score > s.bestNoSlideDistance) { s.bestNoSlideDistance = score; scheduleSave(); }
          if (score >= 500) unlock('no_slide_500', `全程零滑铲跑过 ${score} 米`);
        }

        if (payload.muted && delta > 0) {
          run.silentDist += delta;
          const sd = Math.floor(run.silentDist);
          if (sd > s.bestSilentDistance) { s.bestSilentDistance = sd; scheduleSave(); }
          if (sd >= 600) unlock('silent_ninja', `静音潜行跑过 ${sd} 米`);
        }

        if (payload.tripleBuff) {
          if (!data.unlocked.triple_buff) {
            s.tripleBuffs += 1;
            unlock('triple_buff', `在 ${score} 米处三神装同框生效`);
          }
        }
        return;
      }
      case 'jump': {
        if (!run.active) return;
        run.jumps += 1;
        return;
      }
      case 'slide': {
        if (!run.active) return;
        run.slides += 1;
        if (payload.airSlam) {
          s.totalAirSlams += 1;
          scheduleSave();
          if (s.totalAirSlams >= 30) unlock('air_slam_30', `累计施展 ${s.totalAirSlams} 次凌空急坠滑铲`);
        }
        return;
      }
      case 'coin': {
        if (!run.active) return;
        const amount = Math.max(1, Number(payload.amount) || 1);
        run.coins += amount;
        s.totalCoins += amount;
        if (run.coins > s.bestRunCoins) s.bestRunCoins = run.coins;
        if (payload.fromMagnet) {
          s.totalMagnetPulls += 1;
          if (s.totalMagnetPulls >= 120) unlock('sheep_magnet_120', `磁吸小羊已吸来 ${s.totalMagnetPulls} 份补给`);
          if (s.totalMagnetPulls >= 400) unlock('sheep_magnet_400', `磁吸小羊累计吸来 ${s.totalMagnetPulls} 份补给`);
        }
        scheduleSave();
        if (run.coins >= 150) unlock('coins_150', `单局豪饮 ${run.coins} 奶币`);
        if (run.coins >= 350) unlock('coins_350', `单局扫荡 ${run.coins} 奶币`);
        if (run.coins >= 600) unlock('coins_600', `单局暴富达 ${run.coins} 奶币`);
        if (s.totalCoins >= 1500) unlock('total_coins_1500', `累计存满 ${s.totalCoins} 奶币`);
        if (s.totalCoins >= 5000) unlock('total_coins_5000', `累计资产突破 ${s.totalCoins} 奶币`);
        return;
      }
      case 'powder': {
        if (!run.active) return;
        const amount = Math.max(1, Number(payload.amount) || 5);
        run.coins += amount;
        s.totalCoins += amount;
        if (run.coins > s.bestRunCoins) s.bestRunCoins = run.coins;
        run.flightPowder += 1;
        if (run.flightPowder > s.bestFlightPowder) s.bestFlightPowder = run.flightPowder;
        if (payload.fromMagnet) {
          s.totalMagnetPulls += 1;
          if (s.totalMagnetPulls >= 120) unlock('sheep_magnet_120', `磁吸小羊已吸来 ${s.totalMagnetPulls} 份补给`);
          if (s.totalMagnetPulls >= 400) unlock('sheep_magnet_400', `磁吸小羊累计吸来 ${s.totalMagnetPulls} 份补给`);
        }
        scheduleSave();
        if (run.flightPowder >= 5) unlock('powder_haul_5', `单次火箭飞行揽获 ${run.flightPowder} 罐金装奶粉`);
        if (run.flightPowder >= 7) unlock('powder_haul_7', `单次火箭满载 ${run.flightPowder} 罐金装奶粉`);
        if (run.coins >= 150) unlock('coins_150', `单局豪饮 ${run.coins} 奶币`);
        if (run.coins >= 350) unlock('coins_350', `单局扫荡 ${run.coins} 奶币`);
        if (run.coins >= 600) unlock('coins_600', `单局暴富达 ${run.coins} 奶币`);
        if (s.totalCoins >= 1500) unlock('total_coins_1500', `累计存满 ${s.totalCoins} 奶币`);
        if (s.totalCoins >= 5000) unlock('total_coins_5000', `累计资产突破 ${s.totalCoins} 奶币`);
        return;
      }
      case 'meme': {
        if (!run.active) return;
        const amount = Math.max(1, Number(payload.amount) || 5);
        run.coins += amount;
        s.totalCoins += amount;
        if (run.coins > s.bestRunCoins) s.bestRunCoins = run.coins;
        s.totalMemes += 1;
        scheduleSave();
        if (s.totalMemes >= 5) unlock('jntm_5', `累计丝滑接住 ${s.totalMemes} 颗背带篮球`);
        if (run.coins >= 150) unlock('coins_150', `单局豪饮 ${run.coins} 奶币`);
        if (run.coins >= 350) unlock('coins_350', `单局扫荡 ${run.coins} 奶币`);
        if (run.coins >= 600) unlock('coins_600', `单局暴富达 ${run.coins} 奶币`);
        if (s.totalCoins >= 1500) unlock('total_coins_1500', `累计存满 ${s.totalCoins} 奶币`);
        if (s.totalCoins >= 5000) unlock('total_coins_5000', `累计资产突破 ${s.totalCoins} 奶币`);
        return;
      }
      case 'power': {
        if (!run.active) return;
        if (payload.type === 'sprint') {
          run.flightPowder = 0;
          run.roofChain = 0;
          run.lastTruck = null;
          s.totalRockets += 1;
          scheduleSave();
          if (s.totalRockets >= 5) unlock('rocket_5', `累计完成第 ${s.totalRockets} 次高空试飞`);
          if (s.totalRockets >= 15) unlock('rocket_15', `累计第 ${s.totalRockets} 次火箭升空巡航`);
        } else if (payload.type === 'shield') {
          const stack = Math.max(1, Number(payload.stack) || 1);
          if (stack > s.maxShieldStack) { s.maxShieldStack = stack; scheduleSave(); }
          if (stack >= 4) unlock('shield_stack_4', `同时叠加 ${stack} 层相信光盾`);
          if (stack >= 7) unlock('shield_stack_7', `同时叠加 ${stack} 层神盾闪耀全场`);
        }
        if (payload.tripleBuff && !data.unlocked.triple_buff) {
          s.tripleBuffs += 1;
          unlock('triple_buff', `在 ${Math.floor(run.distance)} 米处三神装同框生效`);
        }
        return;
      }
      case 'elbow': {
        if (!run.active) return;
        s.totalElbows += 1;
        run.runElbows += 1;
        if (run.runElbows > s.bestRunElbows) s.bestRunElbows = run.runElbows;
        if (payload.type === 'thanos') {
          s.totalThanosElbows += 1;
          if (s.totalThanosElbows >= 3) unlock('elbow_thanos_3', `累计第 ${s.totalThanosElbows} 次正面肘飞灭霸`);
        }
        if (payload.isTruck) {
          s.totalTruckElbows += 1;
          if (s.totalTruckElbows >= 15) unlock('elbow_truck_15', `累计徒手肘飞 ${s.totalTruckElbows} 辆大货车`);
        }
        scheduleSave();
        if (s.totalElbows >= 10) unlock('elbow_10', `累计肘飞 ${s.totalElbows} 个障碍物`);
        if (s.totalElbows >= 40) unlock('elbow_40', `累计肘飞 ${s.totalElbows} 个障碍物`);
        if (s.totalElbows >= 100) unlock('elbow_100', `百肘达成，累计清障 ${s.totalElbows} 次`);
        if (run.runElbows >= 8) unlock('elbow_run_8', `单局一路横推肘飞 ${run.runElbows} 个障碍`);
        return;
      }
      case 'bingSlide': {
        if (!run.active) return;
        s.totalBingSlides += 1;
        scheduleSave();
        if (s.totalBingSlides >= 20) unlock('bing_slider_20', `累计丝滑钻过 ${s.totalBingSlides} 个大画饼`);
        return;
      }
      case 'roofLand': {
        if (!run.active || !payload.truck) return;
        if (payload.truck !== run.lastTruck) {
          run.lastTruck = payload.truck;
          run.roofChain += 1;
          run.runRoofs += 1;
          s.totalRoofs += 1;
          if (run.roofChain > s.maxRoofChain) s.maxRoofChain = run.roofChain;
          if (run.runRoofs > s.bestRunRoofs) s.bestRunRoofs = run.runRoofs;
          scheduleSave();
          if (run.roofChain >= 3) unlock('roof_chain_3', `不落地连续飞跃 ${run.roofChain} 辆货车`);
          if (run.runRoofs >= 12) unlock('roof_run_12', `单局累计踩上 ${run.runRoofs} 辆货车车顶`);
          if (s.totalRoofs >= 60) unlock('roof_total_60', `累计质检 ${s.totalRoofs} 辆货车车顶`);
        }
        return;
      }
      case 'roofReset': {
        if (!run.active) return;
        run.lastTruck = null;
        run.roofChain = 0;
        return;
      }
      case 'stumble': {
        if (!run.active) return;
        run.stumbles += 1;
        if (payload.type === 'phone' || payload.type === 'alarm') {
          s.totalTechHits += 1;
          scheduleSave();
          if (s.totalTechHits >= 8) unlock('hit_tech_8', `第 ${s.totalTechHits} 次被手机/早八闹钟精准制裁`);
        }
        return;
      }
      case 'stumbleEscaped': {
        if (!run.active) return;
        s.totalEscapes += 1;
        scheduleSave();
        if (s.totalEscapes >= 5) unlock('escape_5', `第 ${s.totalEscapes} 次从豆包老师眼皮下丝血逃脱`);
        if (s.totalEscapes >= 15) unlock('escape_15', `累计 ${s.totalEscapes} 次惊险甩开贴身追捕`);
        return;
      }
      case 'laneMove': {
        if (!run.active) return;
        const now = Number.isFinite(payload.now) ? payload.now
          : (typeof performance !== 'undefined' ? performance.now() : Date.now());
        run.laneTimes.push(now);
        const cutoff = now - 5000;
        while (run.laneTimes.length > 0 && run.laneTimes[0] < cutoff) run.laneTimes.shift();
        if (run.laneTimes.length > s.maxLaneBurst) { s.maxLaneBurst = run.laneTimes.length; scheduleSave(); }
        if (run.laneTimes.length >= 18) unlock('lane_dancer', `5 秒内狂按 ${run.laneTimes.length} 次闪身步`);
        return;
      }
      case 'pause': {
        if (!run.active) return;
        run.pauses += 1;
        if (run.pauses > s.maxRunPauses) { s.maxRunPauses = run.pauses; scheduleSave(); }
        if (run.pauses >= 5) unlock('pause_slacker', `单局战术暂停达 ${run.pauses} 次`);
        syncEntryBadges();
        return;
      }
      case 'skipCutscene': {
        s.totalSkips += 1;
        scheduleSave();
        if (s.totalSkips >= 10) unlock('skip_cutscene_10', `累计一键快进过场 ${s.totalSkips} 次`);
        return;
      }
      case 'runAbort': {
        if (run.active) { run.active = false; if (dirty) saveNow(); }
        syncEntryBadges();
        return;
      }
      case 'runEnd': {
        if (!run.active) return;
        const finalDist = Math.max(0, Math.floor(Number(payload.distance) || run.distance));
        const finalCoins = Math.max(0, Math.floor(Number(payload.coins) || run.coins));
        const caught = payload.caught !== false;

        s.totalRuns += 1;
        s.totalDistance += finalDist;
        if (finalDist > s.bestDistance) s.bestDistance = finalDist;
        if (finalCoins > s.bestRunCoins) s.bestRunCoins = finalCoins;
        if (caught) s.totalCatches += 1;

        if (payload.isRecord && finalDist > 0) {
          s.totalRecords += 1;
          if (s.totalRecords >= 5) unlock('new_record_5', `第 ${s.totalRecords} 次刷新个人最佳（${finalDist} 米）`);
        }

        if (payload.hitType === 'phone' || payload.hitType === 'alarm') {
          s.totalTechHits += 1;
          if (s.totalTechHits >= 8) unlock('hit_tech_8', `第 ${s.totalTechHits} 次被手机/早八闹钟精准制裁`);
        }

        if (s.totalRuns >= 5) unlock('runs_5', `完成第 ${s.totalRuns} 局逃学实战`);
        if (s.totalRuns >= 25) unlock('runs_25', `累计完成 ${s.totalRuns} 局高强度跑酷`);
        if (s.totalDistance >= 10000) unlock('total_dist_10k', `累计跑酷里程突破 ${s.totalDistance} 米`);
        if (s.totalDistance >= 30000) unlock('total_dist_30k', `累计跑酷里程突破 ${s.totalDistance} 米`);
        if (caught && s.totalCatches >= 10) unlock('caught_10', `第 ${s.totalCatches} 次被拎去办公室补作业`);
        if (caught && finalDist <= 35) {
          s.speedrunRips += 1;
          unlock('speedrun_rip', `仅跑 ${finalDist} 米便光速自首`);
        }

        run.active = false;
        saveNow();
        renderGameOverStrip();
        syncEntryBadges();
        return;
      }
    }
  }

  /* ---------- UI 同步：首页 / 暂停 / 结算入口 ---------- */
  function syncEntryBadges() {
    if (typeof document === 'undefined') return;
    const info = getRank();
    const menuCount = document.getElementById('ach-menu-count');
    const menuRank = document.getElementById('ach-menu-rank');
    if (menuCount) menuCount.textContent = `${info.count}/${info.total}`;
    if (menuRank) menuRank.textContent = `${info.current.icon} ${info.current.title}`;

    const pauseCount = document.getElementById('ach-pause-count');
    if (pauseCount) pauseCount.textContent = `${info.count}/${info.total}`;

    const overCount = document.getElementById('ach-over-count');
    if (overCount) overCount.textContent = `${info.count}/${info.total}`;
  }

  function renderGameOverStrip() {
    if (typeof document === 'undefined') return;
    const strip = document.getElementById('over-ach-strip');
    const list = document.getElementById('over-ach-list');
    if (!strip || !list) return;
    if (!run.newUnlocked.length) {
      strip.classList.add('hidden');
      list.classList.remove('is-scroll');
      list.replaceChildren();
      return;
    }
    const scrollable = run.newUnlocked.length > 3;
    const head = strip.querySelector('.over-ach-head');
    if (head) {
      head.textContent = scrollable
        ? `🎉 本局新达成成就 (${run.newUnlocked.length}) · 滚轮/左右滑查看更多`
        : '🎉 本局新达成成就（点击看详细说明）';
    }
    strip.classList.remove('hidden');
    list.classList.toggle('is-scroll', scrollable);
    list.replaceChildren();
    for (const id of run.newUnlocked) {
      const ach = ACH_BY_ID[id];
      if (!ach) continue;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'over-ach-pill';
      btn.dataset.tier = ach.tier;
      btn.title = '点击查看该成就详细说明';
      const ic = document.createElement('span');
      ic.className = 'over-ach-ic';
      ic.textContent = ach.icon;
      const nm = document.createElement('span');
      nm.textContent = ach.name;
      btn.append(ic, nm);
      btn.addEventListener('click', () => openDetail(id, btn));
      list.appendChild(btn);
    }
    list.scrollLeft = 0;
  }

  /* ---------- 成就图鉴弹窗 + 详情勋章卡 ---------- */
  let modalOpen = false;
  let activeCategory = 'all';
  let activeDetailId = null;
  let returnFocusEl = null;
  let detailReturnFocusEl = null;
  let resetConfirmTimer = null;
  let resetArmed = false;

  function isModalOpen() { return modalOpen || Boolean(activeDetailId); }
  function isDetailOpen() { return Boolean(activeDetailId); }

  function renderModalContent() {
    if (typeof document === 'undefined') return;
    const rankBox = document.getElementById('ach-rank-card');
    const tabsEl = document.getElementById('ach-tabs');
    const gridEl = document.getElementById('ach-grid');
    const statsEl = document.getElementById('ach-lifetime-stats');
    if (!rankBox || !tabsEl || !gridEl) return;

    const info = getRank();
    const pct = Math.round((info.count / info.total) * 100);
    const nextCopy = info.next
      ? `再解锁 ${info.next.min - info.count} 个晋升「${info.next.icon} ${info.next.title}」`
      : '已达成最高段位！全大学城膜拜中！';

    rankBox.replaceChildren();
    const rIcon = document.createElement('div');
    rIcon.className = 'ach-rank-icon';
    rIcon.textContent = info.current.icon;
    const rMain = document.createElement('div');
    rMain.className = 'ach-rank-main';
    const rHead = document.createElement('div');
    rHead.className = 'ach-rank-head';
    const rTitle = document.createElement('strong');
    rTitle.textContent = info.current.title;
    const rCount = document.createElement('span');
    rCount.className = 'ach-rank-count';
    rCount.textContent = `${info.count} / ${info.total} (${pct}%)`;
    rHead.append(rTitle, rCount);
    const rDesc = document.createElement('div');
    rDesc.className = 'ach-rank-desc';
    rDesc.textContent = `${info.current.desc} · ${nextCopy}`;
    const rBar = document.createElement('div');
    rBar.className = 'ach-rank-bar';
    const rFill = document.createElement('span');
    rFill.style.width = `${pct}%`;
    rBar.appendChild(rFill);
    rMain.append(rHead, rDesc, rBar);
    rankBox.append(rIcon, rMain);

    if (statsEl) {
      const s = data.stats;
      const items = [
        ['累计跑酷', `${s.totalDistance}米`],
        ['累计奶币', `${s.totalCoins}`],
        ['肘飞障碍', `${s.totalElbows}次`],
        ['被抓次数', `${s.totalCatches}次`],
      ];
      statsEl.replaceChildren();
      for (const [k, v] of items) {
        const chip = document.createElement('div');
        chip.className = 'ach-stat-chip';
        const kb = document.createElement('small'); kb.textContent = k;
        const vb = document.createElement('b'); vb.textContent = v;
        chip.append(kb, vb);
        statsEl.appendChild(chip);
      }
    }

    tabsEl.replaceChildren();
    for (const cat of CATEGORIES) {
      const list = cat.id === 'all' ? ACHIEVEMENTS : ACHIEVEMENTS.filter(a => a.cat === cat.id);
      const done = list.filter(a => Boolean(data.unlocked[a.id])).length;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ach-tab' + (activeCategory === cat.id ? ' active' : '');
      btn.setAttribute('aria-selected', activeCategory === cat.id ? 'true' : 'false');
      btn.textContent = `${cat.icon} ${cat.label} ${done}/${list.length}`;
      btn.addEventListener('click', () => {
        activeCategory = cat.id;
        if (typeof AudioSys !== 'undefined') AudioSys.click();
        renderModalContent();
      });
      tabsEl.appendChild(btn);
    }

    const filtered = activeCategory === 'all'
      ? ACHIEVEMENTS
      : ACHIEVEMENTS.filter(a => a.cat === activeCategory);
    const ordered = filtered.slice().sort((a, b) => {
      const ua = data.unlocked[a.id] ? 1 : 0;
      const ub = data.unlocked[b.id] ? 1 : 0;
      return ub - ua;
    });

    const frag = document.createDocumentFragment();
    for (const ach of ordered) {
      const rec = data.unlocked[ach.id];
      const unlockedState = Boolean(rec);
      const hiddenLocked = Boolean(ach.secret && !unlockedState);
      const curRaw = Math.max(0, Math.floor(ach.progress(data.stats) || 0));
      const cur = Math.min(ach.goal, unlockedState ? ach.goal : curRaw);
      const progPct = Math.min(100, Math.round((cur / ach.goal) * 100));

      const card = document.createElement(unlockedState ? 'button' : 'div');
      if (unlockedState) card.type = 'button';
      card.className = `ach-card ${unlockedState ? 'unlocked' : 'locked'}${hiddenLocked ? ' secret-locked' : ''}`;
      card.dataset.tier = ach.tier;

      const iconWrap = document.createElement('div');
      iconWrap.className = 'ach-card-icon';
      iconWrap.textContent = hiddenLocked ? '❓' : ach.icon;

      const content = document.createElement('div');
      content.className = 'ach-card-body';

      const head = document.createElement('div');
      head.className = 'ach-card-head';
      const title = document.createElement('h3');
      title.textContent = hiddenLocked ? '??? 隐藏彩蛋' : ach.name;
      const badge = document.createElement('span');
      badge.className = 'ach-tier-pill';
      badge.dataset.tier = ach.tier;
      badge.textContent = (TIER_META[ach.tier] || TIER_META.common).tag;
      head.append(title, badge);

      const cond = document.createElement('p');
      cond.className = 'ach-card-cond';
      cond.textContent = hiddenLocked ? ach.hint : `达成条件：${ach.condText}`;

      const desc = document.createElement('p');
      desc.className = 'ach-card-desc';
      desc.textContent = hiddenLocked
        ? '解锁后揭晓详细档案、真实条件与豆包老师批注'
        : unlockedState ? ach.detail : ach.summary;

      content.append(head, cond, desc);

      if (unlockedState) {
        const foot = document.createElement('div');
        foot.className = 'ach-card-foot';
        const timeEl = document.createElement('span');
        timeEl.className = 'ach-card-time';
        timeEl.textContent = `✓ ${formatTime(rec.at)}`;
        const more = document.createElement('span');
        more.className = 'ach-card-more';
        more.textContent = '查看详细档案 →';
        foot.append(timeEl, more);
        content.appendChild(foot);
        card.addEventListener('click', () => openDetail(ach.id, card));
      } else if (!hiddenLocked) {
        const progWrap = document.createElement('div');
        progWrap.className = 'ach-card-prog';
        const track = document.createElement('div');
        track.className = 'ach-prog-track';
        const fill = document.createElement('span');
        fill.style.width = `${progPct}%`;
        track.appendChild(fill);
        const num = document.createElement('span');
        num.className = 'ach-prog-num';
        num.textContent = `${cur}/${ach.goal}${ach.unit}`;
        progWrap.append(track, num);
        content.appendChild(progWrap);
      }

      card.append(iconWrap, content);
      frag.appendChild(card);
    }
    gridEl.replaceChildren(frag);
  }

  function openDetail(id, triggerEl = null) {
    if (typeof document === 'undefined') return;
    const ach = ACH_BY_ID[id];
    const rec = data.unlocked[id];
    const sheet = document.getElementById('ach-detail');
    if (!ach || !rec || !sheet) return;
    detailReturnFocusEl = triggerEl || document.activeElement;
    activeDetailId = id;

    const card = sheet.querySelector('.ach-detail-card');
    if (card) card.dataset.tier = ach.tier;
    const iconEl = document.getElementById('ach-detail-icon');
    const tierEl = document.getElementById('ach-detail-tier');
    const titleEl = document.getElementById('ach-detail-title');
    const condEl = document.getElementById('ach-detail-cond');
    const snapEl = document.getElementById('ach-detail-snap');
    const storyEl = document.getElementById('ach-detail-story');
    const noteEl = document.getElementById('ach-detail-note');
    const metaEl = document.getElementById('ach-detail-meta');

    const curVal = Math.max(ach.goal, Math.floor(ach.progress(data.stats) || 0));
    if (iconEl) {
      iconEl.textContent = ach.icon;
      iconEl.classList.remove('pop');
      requestAnimationFrame(() => iconEl.classList.add('pop'));
    }
    if (tierEl) {
      tierEl.dataset.tier = ach.tier;
      tierEl.textContent = (TIER_META[ach.tier] || TIER_META.common).label;
    }
    if (titleEl) titleEl.textContent = ach.name;
    if (condEl) condEl.textContent = ach.condText;
    if (snapEl) {
      snapEl.textContent = rec.snapshot ? `解锁瞬间：${rec.snapshot}` : `解锁瞬间：${ach.summary}`;
    }
    if (storyEl) storyEl.textContent = ach.detail;
    if (noteEl) noteEl.textContent = ach.teacherNote;
    if (metaEl) metaEl.textContent = `首次达成：${formatTime(rec.at)}  ·  当前记录：${curVal}${ach.unit}`;

    sheet.classList.remove('hidden');
    if (typeof AudioSys !== 'undefined') AudioSys.click();
    const closeBtn = document.getElementById('btn-ach-detail-close');
    if (closeBtn) closeBtn.focus({ preventScroll: true });
  }

  function closeDetail() {
    if (typeof document === 'undefined') return;
    const sheet = document.getElementById('ach-detail');
    if (sheet) sheet.classList.add('hidden');
    const wasOpen = Boolean(activeDetailId);
    activeDetailId = null;
    if (wasOpen && detailReturnFocusEl && typeof detailReturnFocusEl.focus === 'function') {
      try { detailReturnFocusEl.focus({ preventScroll: true }); } catch (e) {}
    }
    detailReturnFocusEl = null;
  }

  function disarmReset() {
    resetArmed = false;
    if (resetConfirmTimer) { clearTimeout(resetConfirmTimer); resetConfirmTimer = null; }
    const btn = typeof document !== 'undefined' ? document.getElementById('btn-ach-reset') : null;
    if (btn) {
      btn.textContent = '重置成就数据';
      btn.classList.remove('armed');
    }
  }

  function openModal(triggerEl = null, focusAchId = null) {
    if (typeof document === 'undefined') return;
    const modal = document.getElementById('ach-modal');
    if (!modal) return;
    returnFocusEl = triggerEl || document.activeElement;
    modalOpen = true;
    disarmReset();
    renderModalContent();
    modal.classList.remove('hidden');
    if (typeof AudioSys !== 'undefined') AudioSys.click();
    if (focusAchId && data.unlocked[focusAchId]) {
      openDetail(focusAchId);
    } else {
      closeDetail();
      const dialog = modal.querySelector('.ach-dialog');
      if (dialog) dialog.focus({ preventScroll: true });
    }
  }

  function closeModal() {
    if (typeof document === 'undefined') return;
    closeDetail();
    disarmReset();
    const modal = document.getElementById('ach-modal');
    if (modal) modal.classList.add('hidden');
    modalOpen = false;
    if (returnFocusEl && typeof returnFocusEl.focus === 'function') {
      try { returnFocusEl.focus({ preventScroll: true }); } catch (e) {}
    }
    returnFocusEl = null;
  }

  function handleEscape() {
    if (isDetailOpen()) { closeDetail(); return true; }
    if (modalOpen) { closeModal(); return true; }
    return false;
  }

  function resetAll() {
    data = { version: STORAGE_VERSION, unlocked: Object.create(null), stats: defaultStats() };
    run = freshRun();
    toastQueue.length = 0;
    toastToken++;
    toastScheduled = false;
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
    if (toastExitTimer) { clearTimeout(toastExitTimer); toastExitTimer = null; }
    toastActive = false;
    if (toastShell) {
      toastShell.el.classList.remove('is-show', 'is-leave', 'is-prep');
      toastShell.el.classList.add('is-idle');
    }
    safeStorage.remove(STORAGE_KEY);
    closeDetail();
    disarmReset();
    syncEntryBadges();
    renderGameOverStrip();
    if (modalOpen) renderModalContent();
  }

  function bindUI() {
    if (typeof document === 'undefined') return;
    // 启动阶段即预建并预热 Toast 复用壳，避免首次解锁成就时现场建 DOM 和上传 Emoji 纹理导致掉帧
    ensureToastShell();

    const bindOpen = id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', () => openModal(el));
    };
    bindOpen('btn-ach-menu');
    bindOpen('btn-ach-pause');
    bindOpen('btn-ach-over');

    const closeBtn = document.getElementById('btn-ach-close');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    const modal = document.getElementById('ach-modal');
    if (modal) {
      modal.addEventListener('click', e => {
        if (e.target === modal) closeModal();
      });
    }

    const detail = document.getElementById('ach-detail');
    if (detail) {
      detail.addEventListener('click', e => {
        if (e.target === detail) closeDetail();
      });
    }
    const detailClose = document.getElementById('btn-ach-detail-close');
    if (detailClose) detailClose.addEventListener('click', closeDetail);

    const overAchList = document.getElementById('over-ach-list');
    if (overAchList) {
      overAchList.addEventListener('wheel', e => {
        if (overAchList.scrollWidth <= overAchList.clientWidth) return;
        const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
        if (delta !== 0) {
          e.preventDefault();
          overAchList.scrollLeft += delta;
        }
      }, { passive: false });
    }

    const replayBtn = document.getElementById('btn-ach-replay');
    if (replayBtn) {
      replayBtn.addEventListener('click', () => {
        const ach = activeDetailId ? ACH_BY_ID[activeDetailId] : null;
        if (!ach) return;
        const iconEl = document.getElementById('ach-detail-icon');
        if (iconEl) {
          iconEl.classList.remove('pop');
          requestAnimationFrame(() => iconEl.classList.add('pop'));
        }
        if (typeof AudioSys !== 'undefined' && typeof AudioSys.playAchievement === 'function') {
          AudioSys.playAchievement(ach.tier, { withVoice: true, force: true });
        }
      });
    }

    const resetBtn = document.getElementById('btn-ach-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (!resetArmed) {
          resetArmed = true;
          resetBtn.textContent = '再次点击确认清空';
          resetBtn.classList.add('armed');
          if (typeof AudioSys !== 'undefined') AudioSys.click();
          resetConfirmTimer = setTimeout(disarmReset, 3500);
          return;
        }
        resetAll();
        if (typeof AudioSys !== 'undefined') AudioSys.click();
      });
    }

    window.addEventListener('keydown', e => {
      if (!isModalOpen()) return;
      if (e.key === 'Escape' && !document.documentElement.classList.contains('game-mounted')) {
        e.preventDefault();
        handleEscape();
      }
    });

    // 页面隐藏/关闭时安全刷盘，确保延迟写盘不丢任何进度
    const flushIfDirty = () => { if (dirty) saveNow(); };
    window.addEventListener('pagehide', flushIfDirty);
    document.addEventListener('visibilitychange', () => { if (document.hidden) flushIfDirty(); });

    syncEntryBadges();
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bindUI, { once: true });
    } else {
      bindUI();
    }
  }

  return {
    ACHIEVEMENTS,
    CATEGORIES,
    RANKS,
    record,
    openModal,
    closeModal,
    openDetail,
    closeDetail,
    isModalOpen,
    isDetailOpen,
    handleEscape,
    getRank,
    resetAll,
    syncEntryBadges,
    getState: () => ({
      unlocked: Object.assign({}, data.unlocked),
      stats: Object.assign({}, data.stats),
      newUnlocked: run.newUnlocked.slice(),
    }),
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AchievementSys;
}
