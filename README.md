# Snail Girl Folktale

Three.js 桌面艺术展示：纯黑背景、白色环状三角桌、三条边各一只海螺。左上角仅保留网站标题。首页采用靠近桌面的透视构图，前方桌角在画面下缘自然裁切。

初始排列为红色在远端、蓝色在左、白色在右；降低机位压缩中央空缺的可见纵深。环境光较暗，顶光在每只海螺下方形成边缘柔和的圆形光斑。首次加载为白色全屏，中间显示 `Loading…`；准备完成后切换到黑色场景。所有操作提示使用英文。

## 本地预览

```sh
npm ci
npm run dev -- --port 5173
```

地址为 `http://127.0.0.1:5173/`。当前只考虑桌面浏览器，未部署公网网站。

## 交互

- A/D 或底部方向按钮：整桌平滑旋转 120°，同方向独立输入三次归位。
- 鼠标停留在可见海螺上约 450 毫秒后打开中央窗口；点击物件和键盘激活可立即打开。
- 窗口中左右、上下拖动均可绕模型中心自由旋转 360°，滚轮或加减按钮缩放至 75%–180%，复位恢复初始角度和比例。新的 100% 对应旧版 180% 的大小，重复打开也保持相同取景。
- 查看窗口显示英文时期标题、图标和缩放百分比，没有可见中文操作说明。点击标题直接进入对应的阅读页面：白色为晋代、蓝色为唐代、红色为中华人民共和国。
- 点击 ×、外部或按 Esc 关闭。重新 hover 前需移出物件区域；快速经过、拖动、切换窗口和整桌旋转会取消待打开计时。
- 查看窗口的旋转与缩放独立于桌上陈列。没有餐盘、刀叉、杯子和餐巾。
- 首页每只模型外侧有约 4800 个取自真实表面轮廓的粒子，匹配海螺主色，沿法线小幅随机漂移。透明度固定 80%（不透明度 20%），临时滑动条已移除；弹窗不显示粒子。

## 模型与摆位

用户 OBJ 和 PBR 贴图转换为 Draco 压缩 GLB，使用 `public/draco/` 的本地解码器。当前加载三角桌和三只海螺，原餐盘文件保留但不加载。

`src/table.js` 按当前桌子 GLB 的实际桌面角点校正三角轮廓，并将三角形重心设为旋转轴。三边锚点按 120° 分布，以真实网格射线确定支撑高度。若未来替换桌子 GLB，需要重新测量该文件中的角点校准数据。

`src/objects.js` 配置每只海螺的路径、比例、初始朝向和阅读章节。蓝色海螺斜转 20°，白色海螺按基础尺寸的 90% 陈列；白色和红色分别向桌面外侧移动 .16，拉开与内沿的距离。模型的居中偏移在局部旋转轴内部，避免旋转引起位置偏移。左上角网站标题对齐桌体初始视角的最左轮廓，A/D 转动时不移动。

## 阅读页面

用户提供的文本 demo 已整合到 `public/readings/`，保留正文、脚注、搜索和本地批注功能；原文件夹未修改。三条直接入口分别是 `/readings/index.html#/read/jin-dynasty`、`/readings/index.html#/read/tang-dynasty`、`/readings/index.html#/read/peoples-republic-of-china`。阅读页的 `Back to Home` 与左上角名称返回三维餐桌首页。四个页面共用 `public/site-header.css` 与 `public/site-header.js`，统一标题字体、字号、顶部与左侧位置。继续修改正文请编辑本项目中的 `public/readings/content.js`。

“三角桌子”和“白色海螺”的原素材目录曾命名反了，目前已交换目录名称并更新转换映射。重新导出需要 Blender 4.1+ 与 Python Pillow：

```sh
python3 scripts/prepare-models.py --source /path/to/素材 --output public/models --blender /Applications/Blender.app/Contents/MacOS/Blender
```

## 验证与工作流

```sh
npm test
npm run build
```

实际检查记录见 [VERIFICATION.md](VERIFICATION.md)，当前需求 Prompt 见 [WEBSITE_PROMPT.md](WEBSITE_PROMPT.md)。遵照用户最新要求，只保留本地提交，不执行 push、不操作 GitHub Desktop、不部署。
