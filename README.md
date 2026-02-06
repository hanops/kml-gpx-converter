# KML / KMZ / GPX 互转工具

纯前端 Web 工具，在浏览器中完成 **KML**、**KMZ**、**GPX** 三种格式的互转。输出符合 Google Earth 要求，包含轨迹点、轨迹线、起终点路点（可自定义名称）。

## 功能概览

- **三格式互转**：支持 KML、KMZ（含 KML 的 ZIP）、GPX 相互转换；可选方向包括 GPX→KML、GPX→KMZ、KML→GPX、KML→KMZ、KMZ→KML、KMZ→GPX。
- **多轨迹**：支持文件中多条轨迹（多 `<trk>` / 多 LineString），每条都有起终点。
- **预览**：选择单个文件后显示轨迹数、每条点数、起终点坐标及卫星地图预览；若仅有路点则提示「无轨迹线，仅路点」。
- **仅路点**：当文件中没有轨迹线、只有路点时，仍可转换，输出仅含路点。
- **批量**：一次选择多个 KML/KMZ/GPX 文件，逐条转换后，在「批量结果」中为每个文件提供独立下载。
- **导出选项**：可自定义起点/终点名称，并可勾选「保留时间戳」。

## 使用方式

1. 用浏览器打开 `index.html`（或通过本地静态服务器访问项目目录）。
2. 将 KML、KMZ 或 GPX 文件拖放到上传区，或点击选择文件（可多选）。
3. 在「导出选项」中设置起点/终点名称及是否保留时间戳。
4. 选择转换方向（自动会根据文件类型选择；也可手动选 GPX→KML、GPX→KMZ、KML→GPX、KML→KMZ、KMZ→KML、KMZ→GPX）。
5. **单文件**：点击「转换并下载」得到转换后的文件；选择文件后可在「预览」中查看解析结果与卫星地图。
6. **多文件**：在「批量结果」中为每个文件点击「下载」即可逐一下载。

转换在本地完成，文件不会上传到任何服务器。

## 项目结构

```
kml-gpx-converter/
├── index.html        # 单页：上传区、导出选项、转换、预览、批量结果（含 Leaflet、JSZip 等 CDN）
├── css/style.css     # 布局与样式
├── js/
│   ├── parser.js     # KML/GPX 解析 → { tracks, waypoints }（KMZ 在 app 中解压后按 KML 解析）
│   ├── builder.js    # { tracks, waypoints } + opts → KML/GPX 字符串
│   └── app.js        # 文件选择、拖拽、KMZ 解压/打包（JSZip）、预览、批量、解析/构建、下载
└── README.md
```

## 本地运行

可直接用浏览器打开 `index.html`。若需通过 HTTP 访问（例如避免部分浏览器的本地文件限制），可用：

```bash
# Python 3
python3 -m http.server 8080

# 或 npx
npx serve -p 8080
```

然后访问 `http://localhost:8080`。
