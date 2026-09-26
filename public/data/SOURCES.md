# 地理数据来源与许可

## geoBoundaries

平台与文档：https://www.geoboundaries.org/ ，https://www.geoboundaries.org/api.html

Runfola, D. et al. (2020). geoBoundaries: A global database of political administrative boundaries. PLOS ONE 15(4): e0231866. https://doi.org/10.1371/journal.pone.0231866

geoBoundaries gbOpen 平台数据按其公开许可及底层来源要求使用。以下许可为下载 API 元数据中声明的原始数据许可，保留原始归属。

| 文件 | 来源 ID | 资料年份 | 原始归属 | 许可 |
| --- | --- | --- | --- | --- |
| china-adm1.geojson | CHN-ADM1-43563684 | 2019 | geoBoundaries, Wikimedia Commons | Public Domain |
| china-counties/*.geojson | CHN-ADM3-62558664 | 2017 | Lee Beryman, © OpenStreetMap contributors | ODbL 1.0 |
| taiwan-adm2.geojson | TWN-ADM1-90331920 | 2017 | © OpenStreetMap contributors, Wambacher | ODbL 1.0 |

元数据：
- https://www.geoboundaries.org/api/current/gbOpen/CHN/ADM1/
- https://www.geoboundaries.org/api/current/gbOpen/CHN/ADM3/
- https://www.geoboundaries.org/api/current/gbOpen/TWN/ADM1/

上述代码保留用于数据溯源；界面将台湾县市置于中国台湾省下。

ODbL 1.0 完整许可：https://opendatacommons.org/licenses/odbl/1-0/
OpenStreetMap 归属说明：https://www.openstreetmap.org/copyright
geoBoundaries 平台许可：https://creativecommons.org/licenses/by/4.0/

本项目对中国区县进行了按省归组与文件切分。修改后的数据库以 ODbL 1.0 提供；应用代码不因此改变许可。分片即为可机器读取的完整派生区县数据，原始数据可通过上述 API 获取，生成脚本见项目 scripts/build-china-counties.py。区划名称有部分中文映射，形状未人为补绘。数据较旧且存在近似归组，不能当作当前权威区划。

## 本地海外行政区缓存

`admin/` 中的边界均来自 geoBoundaries 简化下载，未修改坐标。各文件旁的 `ADM1-source.json` / `ADM2-source.json` 保留完整元数据，包括边界 ID、原始来源、许可、许可网址和下载链接。

| 目录 | 资料年份 | 原始归属 | 许可（按元数据） |
| --- | --- | --- | --- |
| DEU | 2021 | Federal Agency for Cartography and Geodesy | Data licence Germany – attribution – version 2.0；https://www.govdata.de/dl-de/by-2-0 |
| USA | 2018 | United States Census Bureau, MAF/TIGER Database | Public Domain |
| JPN | 2017 | © OpenStreetMap contributors, Wambacher | ADM1: ODbL 1.0；ADM2: CC BY-SA 2.0（https://creativecommons.org/licenses/by-sa/2.0/）；原始元数据保留来源的不同许可标记 |
| FRA | 2022 | Institut national de l'information géographique et forestière (IGN-F) | Etalab Open License 2.0；https://www.etalab.gouv.fr/licence-ouverte-open-licence/ |
| GBR | ADM1 2021 / ADM2 2019 | Eurostat – European Commission / Office for National Statistics Open Geography Portal | ADM1: CC BY 4.0；ADM2: Open Government Licence v3.0（https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/） |

## 国界与纹理

- Natural Earth 1:50m：https://github.com/nvkelso/natural-earth-vector/tree/master/geojson （Public Domain；https://www.naturalearthdata.com/about/terms-of-use/）
- world-atlas 2.0.2 1:10m：https://github.com/topojson/world-atlas （ISC，基于 Natural Earth）
- 地球纹理来自 three-globe 示例中的 earth-blue-marble.jpg：https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg

## 统计数据

World Bank Indicators API v2：https://datahelpdesk.worldbank.org/knowledgebase/articles/889392
数据使用条款：https://www.worldbank.org/en/about/legal/terms-of-use-for-datasets

保留每个指标实际年份及来源，不以缺失值填零，不把国家统计值复制为行政区统计值。
