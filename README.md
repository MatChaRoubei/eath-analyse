# 地球数据观测站

交互式 3D 地球数据网页。拖动旋转、滚轮或按钮缩放；选择指标与自定义门槛后，地图会高亮符合条件的国家和地区。点击地图或列表可定位并查看该指标的历史趋势。

现在可选择 2000—2025 年的具体年份，或查看各地最近一个有值的年份；可用两个指标同时筛选，并用七个快速提问直接开始分析。27 项指标涵盖经济、人口与健康、数字与基础设施、能源与环境、贸易与创新，可按分类浏览或搜索。最多将四个国家加入对比。选中一个国家后，点击地图右上角的「▧」可按需加载该国的 1:10m 精细边界。精细边界只增加海岸线和国界的形状细节，不会产生省市级统计值。

## 运行

**直接打开、无需本地端口：**双击项目根目录的 `index.html`。运行 `npm run build:offline` 可重新生成它。这是单文件版，内含 CSS、脚本、地球纹理、国界和已缓存的行政区边界；首次打开约 70 MB，可能需要等待数秒。世界银行指标及未缓存地区的边界仍需联网获取。

需要重新生成单文件版时，使用 Node.js 20.19+ 或 22.12+：

```bash
npm ci
npm run build:offline
```

**部署到网站：**构建完成后上传 `dist/` **里面的所有内容**到静态站点目录（例如 `earth-atlas/`），无需运行本地服务，也不会占用端口。本仓库会在每次推送 `main` 后自动构建并发布 GitHub Pages。

Cloudflare Workers Builds 使用 `npm run build` 构建，部署命令使用 `npx wrangler deploy`。根目录的 `wrangler.jsonc` 将 Worker 配置为静态资源站点，并指向 Vite 生成的 `dist/`。

```bash
npm run build
```

项目源网页保存在 `app.html`。`dist/index.html`、`dist/assets/`、`dist/data/` 和 `.nojekyll` 需要保持相对目录结构。部署版通过网站的 HTTPS 地址访问；`dist/index.html` 不能直接双击。

## 数据

- 27 项指标及历年趋势： [世界银行开放数据 API v2](https://datahelpdesk.worldbank.org/knowledgebase/articles/898581)。网页在线获取每个国家或地区最近一个有值的年份，因此年份可能不同；指标覆盖率也不相同。国际贫困线指标采用世界银行 API 当前提供的 $3.00 / 日、2021 年购买力平价口径。
- 普通国界： [Natural Earth 1:50m GeoJSON](https://github.com/nvkelso/natural-earth-vector/tree/master/geojson)，随项目保存在 `public/data/countries.geojson`。
- 精细国界： [world-atlas 1:10m TopoJSON](https://github.com/topojson/world-atlas)，随项目保存在 `public/data/countries-10m.json`，仅在用户请求时加载所选国家。
- 地球纹理： [three-globe 示例资源](https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg)，随项目保存在 `public/data/earth-blue-marble.jpg`。

## 行政区与操作

- 选择国家或地区 →「查看行政区」→ 搜索省/州 → 点击名称定位，点击右侧箭头或「市 / 县」继续下钻；「←」返回上一级。
- 中国省级边界共 34 个区域，资料年份为 2019；大陆区县来自 2017 年 geoBoundaries CHN ADM3，按省拆分、按需下载。北京显示 16 区。台湾省下接 22 个县市，资料年份为 2017。
- 德国、美国、日本、法国、英国的 ADM1 / ADM2 也已缓存到本地，按需读取；其他地区通过 geoBoundaries gbOpen API 加载。海外「下一级」是来源的 ADM2，不保证等同于中国的区县级。覆盖范围、语言和资料年份依来源而异，接口缺失时可重试。
- 台湾、香港、澳门采用「中国台湾」「中国香港」「中国澳门」显示；台湾省置于中国行政区层级中。统计序列仍按来源代码读取，缺失值不使用其他地区数据填充。
- 搜索国家或地区时也能找到不满足条件或暂无数据的地区。行政区搜索支持已翻译的中文名称和源名称。
- CSV 按当前指标、年份和全部筛选条件导出符合条件的地区，包含数值、单位、实际统计年份、条件和来源。搜索框只用于定位，不限制导出范围。UTF-8 BOM 支持 Excel 中文读取。
- 国界的 1:5000万 / 1:1000万是数据比例尺，不是米级精度。区县视图自动按区域范围缩放，选中边界显示为黄色。

## 数据限制与来源声明

世界银行指标仍是国家或地区级数据，没有把全国人均 GDP 套到每个省市。行政区仅提供边界与定位，不会自动产生地方统计。门槛由使用者设置，不是世界银行的官方收入分类。具体年份无值时不会以相邻年份代替；趋势在选择年份之前取最多 25 个有效观测，并按实际年份间隔绘图。

中国区县按简化省界和区县质心做空间归组，其中 21 个沿海或岛屿区域使用最近边界归组；大厂回族自治县显式归入河北。这是为按需加载生成的近似归组，不是权威行政隶属表。生成脚本为 `scripts/build-china-counties.py`，原始区县数据为 `scripts/source/china-adm3.geojson`。海外 ADM2 采用质心落在上一级边界内的筛选，可能遗漏跨界或离岸区域。

行政区采用 [geoBoundaries gbOpen](https://www.geoboundaries.org/api.html)，保留其底层数据来源与许可。中国省界原始来源为 Wikimedia Commons / geoBoundaries（Public Domain）；中国区县为 Lee Beryman / OpenStreetMap（ODbL 1.0）；台湾县市为 OpenStreetMap / Wambacher（ODbL 1.0）。本项目切分后的区县数据库继续按 ODbL 1.0 提供，详见 `public/data/SOURCES.md`。

地图使用公开地理数据进行可视化，尚未完成对官方标准地图的逐项核验，也未取得审图号。中文名称和层级调整不代表边界已获官方审核；正式公开发布前仍需核对官方标准地图与适用要求。网页运行时需要联网获取世界银行数据和未缓存地区的行政区边界；中国及上述五国边界和纹理在本地提供。

Vite 使用相对资源路径，`dist/` 可以部署在网站子目录中。世界银行 API 数据仍需访问网络。
