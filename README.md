# Route Converter

纯前端 Web 工具，在浏览器本地完成 **KML**、**KMZ**、**GPX** 与 **GeoJSON** 格式互转。适合把运动轨迹、Google Earth 路线、GPS 路点和 GIS 数据快速转换成可下载的新文件。

当前版本：**V1.2.0**

![Route Converter main interface](docs/assets/screenshot-main.png)

## 快速开始

直接用浏览器打开 `index.html` 即可使用。若浏览器限制本地文件访问，建议启动一个本地静态服务器：

```bash
python3 -m http.server 8080
```

然后访问：

```text
http://localhost:8080
```

打开页面后，将 KML、KMZ 或 GPX 文件拖入上传区，选择转换方向，点击「转换并下载」即可。

## 功能概览

- **格式互转**：支持 KML、KMZ（含 KML 的 ZIP）、GPX 与 GeoJSON；可在 Google Earth、GPS 与 GIS 工作流间转换。
- **多轨迹**：支持文件中多条轨迹（多 `<trk>` / `<rte>` / LineString / `gx:Track`），每条都有起终点。
- **预览**：选择单个文件后显示轨迹数、每条点数、起终点坐标及卫星地图预览；若仅有路点则提示「无轨迹线，仅路点」。
- **仅路点**：当文件中没有轨迹线、只有路点时，仍可转换，输出仅含路点。
- **批量**：一次选择多个 KML/KMZ/GPX 文件，逐条转换后，在「批量结果」中为每个文件提供独立下载。
- **转换前检查**：导出前显示格式兼容性、数据保留提示和路线统计（距离、时间跨度、累计爬升、平均速度）。
- **隐私与编辑**：可简化轨迹、移除时间/海拔、隐藏首尾各约 200 米，并保留 GPX 路线/分段结构。
- **离线优先**：可不加载卫星底图预览；支持安装为离线 Web App。

## 支持格式

| 输入 | 支持内容                                           |
| ---- | -------------------------------------------------- |
| GPX  | `trk` / `trkseg` / `trkpt`、`rte` / `rtept`、`wpt` |
| KML  | `LineString`、`gx:Track`、`Point` Placemark        |
| KMZ  | 包含 `.kml` 文件的 KMZ 压缩包                      |

KML/KMZ 输出采用 Google Earth 兼容的 KML 2.2 结构：共享样式、轨迹/路点分组和起终点标注会被生成；当一条轨迹的每个点都有时间戳时，输出会使用 Google Earth `gx:Track` 保留时间序列。KMZ 的根文档为 `doc.kml`。

## 使用方式

1. 将 KML、KMZ 或 GPX 文件拖放到上传区，或点击选择文件（可多选）。
2. 在「导出选项」中设置起点/终点名称及是否保留时间戳。
3. 选择转换方向；保留「自动」时会根据文件类型选择默认方向。
4. **单文件**：点击「转换并下载」得到转换后的文件，并在「预览」中查看解析结果与卫星地图。
5. **多文件**：在「批量结果」中为每个文件点击「下载」即可逐一下载。

转换在本地完成，文件不会上传到任何服务器。

## 示例文件

`examples/` 目录提供了两个可公开的手动测试文件：

- `examples/basic.gpx`
- `examples/basic.kml`

可以直接拖入页面验证单文件转换、地图预览和起终点输出。

## 隐私说明

- 文件解析、转换、KMZ 解压与打包均在当前浏览器本地完成。
- 本项目没有后端服务，不会主动上传用户选择的 KML/KMZ/GPX 文件。

- Leaflet 与 JSZip 已本地化在 `vendor/` 目录，页面运行不再依赖 CDN 加载脚本或样式。
- 地图预览会加载第三方地图瓦片；如果不希望请求地图服务，可以断网使用转换功能。

## 本地验证

启动本地静态服务器后访问：

```text
http://localhost:8080/tests/parser-builder.html
```

页面显示 `OK` 即表示解析/生成核心用例通过。

也可以先做 JavaScript 语法检查：

```bash
npm run check
npm run lint
```

GitHub Actions 会在 `main` 推送和 Pull Request 时运行基础校验。

## 项目结构

```
kml-gpx-converter/
├── .github/          # Issue / PR 模板与 CI workflow
├── index.html        # 单页 UI
├── css/style.css     # 布局与样式
├── examples/         # 可公开的手动试用样例
├── js/
│   ├── parser.js     # KML/GPX 解析 → { tracks, waypoints }
│   ├── builder.js    # { tracks, waypoints } → KML/GPX 字符串
│   └── app.js        # 文件选择、预览、批量、KMZ、下载
├── vendor/           # 本地化 Leaflet / JSZip 运行时依赖
├── tests/            # 浏览器测试页和 fixtures
├── vercel.json       # Vercel 部署与安全头配置
├── package.json      # npm scripts（check / lint）
├── CONTRIBUTING.md
├── CHANGELOG.md
├── LICENSE
├── SECURITY.md
├── VERSION
└── README.md
```

## 贡献与安全

- 贡献指南见 `CONTRIBUTING.md`。
- 安全问题报告方式见 `SECURITY.md`。
- 第三方依赖版本与来源见 `vendor/THIRD_PARTY.md`。

## 浏览器兼容性

建议使用当前版本的 Chrome、Edge、Safari 或 Firefox。项目依赖以下浏览器能力：

- `FileReader`
- `DOMParser`
- `Blob` / `URL.createObjectURL`
- `Promise`
- `fetch`（仅测试页读取 fixtures 使用）

## 已知限制

- 选择「保留路线与分段」时，GPX Route 与 Track Segment 会保留；更复杂的扩展元数据仍可能无法完全还原。
- KML/KMZ 转为 GPX 或 GeoJSON 时，KML 样式、图标与文件夹层级无法被目标格式表达；未做编辑的 KML↔KMZ 会保留原 KML 文本。
- KMZ 输出目前只打包生成的 `doc.kml`，不会保留原 KMZ 中的图片、图标或其他资源。
- 地图预览依赖网络瓦片服务，离线时仍可转换但无法显示卫星底图。

## 许可证

MIT License，详见 `LICENSE`。
