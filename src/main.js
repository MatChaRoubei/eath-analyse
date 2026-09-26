import Globe from 'globe.gl';
import { geoCentroid } from 'd3-geo';
import { feature as topoFeature } from 'topojson-client';
import './style.css';
import './enhancements.css';

const metrics = [
  { id:'gdp', icon:'◇', name:'人均 GDP', en:'GDP / CAPITA', code:'NY.GDP.PCAP.CD', unit:'美元', description:'按现价美元计算的人均国内生产总值。', min:0,max:300000,step:1000,default:20000,format:'money' },
  { id:'life', icon:'♡', name:'预期寿命', en:'LIFE EXPECTANCY', code:'SP.DYN.LE00.IN', unit:'岁', description:'出生时预期寿命，男女合计。', min:40,max:90,step:1,default:75,format:'decimal' },
  { id:'internet', icon:'⌁', name:'互联网普及', en:'INTERNET USERS', code:'IT.NET.USER.ZS', unit:'%', description:'使用互联网的人口占总人口的比例。', min:0,max:100,step:1,default:80,format:'percent' },
  { id:'electricity', icon:'⚡', name:'电力覆盖', en:'ELECTRICITY', code:'EG.ELC.ACCS.ZS', unit:'%', description:'可以使用电力的人口比例。', min:0,max:100,step:1,default:95,format:'percent' },
  { id:'renewable', icon:'☼', name:'可再生能源', en:'RENEWABLE ENERGY', code:'EG.FEC.RNEW.ZS', unit:'%', description:'可再生能源占终端能源消费的比例。', min:0,max:100,step:1,default:40,format:'percent' },
  { id:'forest', icon:'♧', name:'森林覆盖', en:'FOREST AREA', code:'AG.LND.FRST.ZS', unit:'%', description:'森林面积占陆地面积的比例。', min:0,max:100,step:1,default:40,format:'percent' },
  { id:'co2', icon:'◌', name:'人均碳排放', en:'CO₂ / CAPITA', code:'EN.GHG.CO2.PC.CE.AR5', unit:'吨', description:'人均二氧化碳排放量，不含土地利用与林业，单位为吨二氧化碳当量。', min:0,max:30,step:0.5,default:5,format:'decimal' },
  { id:'population', icon:'♙', name:'人口规模', en:'POPULATION', code:'SP.POP.TOTL', unit:'人', description:'国家或地区的总人口。', min:0,max:1500000000,step:10000000,default:100000000,format:'population' },
  { id:'growth', icon:'↗', name:'经济增长', en:'GDP GROWTH', code:'NY.GDP.MKTP.KD.ZG', unit:'%', description:'国内生产总值的年度实际增长率。', min:-10,max:20,step:0.5,default:3,format:'percent' },
  { id:'unemployment', icon:'▤', name:'失业率', en:'UNEMPLOYMENT', code:'SL.UEM.TOTL.ZS', unit:'%', description:'劳动力中失业人口的比例，采用国际劳工组织估算。', min:0,max:35,step:0.5,default:5,format:'percent' },
  { id:'urban', icon:'▦', name:'城市人口', en:'URBAN POPULATION', code:'SP.URB.TOTL.IN.ZS', unit:'%', description:'生活在城市地区的人口比例。', min:0,max:100,step:1,default:70,format:'percent' }
];

const presets = [
  {id:'prosperity',name:'富裕且长寿',primary:'gdp',threshold:20000,secondary:'life',secondaryThreshold:80,secondaryOp:'above'},
  {id:'digital',name:'数字生活普及',primary:'internet',threshold:80,secondary:'electricity',secondaryThreshold:95,secondaryOp:'above'},
  {id:'clean',name:'绿色能源与低排放',primary:'renewable',threshold:40,secondary:'co2',secondaryThreshold:5,secondaryOp:'below'},
  {id:'jobs',name:'增长且低失业',primary:'growth',threshold:3,secondary:'unemployment',secondaryThreshold:6,secondaryOp:'below'}
];
const $ = s => document.querySelector(s);
const asset = path => path==='earth-blue-marble.jpg' && window.__ATLAS_TEXTURE__
  ? window.__ATLAS_TEXTURE__
  : `${import.meta.env.BASE_URL}data/${path}`;
async function fetchJSON(url) {
  try {
    const response=await fetch(url,{signal:AbortSignal.timeout(30000)});
    if(!response.ok) throw new Error(`请求失败（${response.status}）`);
    return await response.json();
  } catch(error) {
    if(error.name==='TypeError'||error.name==='TimeoutError') throw new Error(`${new URL(url,location.href).hostname} 暂时无法连接`);
    throw error;
  }
}
function indicatorRows(payload) {
  if(!Array.isArray(payload)||payload[0]?.message||(!Array.isArray(payload[1]) && Number(payload[0]?.total)!==0)) throw new Error('数据接口未返回有效结果');
  return payload[1]||[];
}
const state = { metric:metrics[0], threshold:metrics[0].default, operator:'above', year:'latest', secondaryEnabled:false, secondaryMetric:metrics[1], secondaryThreshold:80, secondaryOperator:'above', secondaryValues:new Map(), features:[], simpleFeatures:[], detailed:false, values:new Map(), cache:new Map(), selected:null, comparisons:[], globe:null, rotating:true, request:0, hover:null, activePreset:null, admin:{open:false,level:0,features:[],parentRegion:null,selectedIndex:-1,token:0,cache:new Map()} };
const zhNames = new Intl.DisplayNames(['zh-CN'],{type:'region'});
const chinaRegionNames = {
  'Anhui Province':'安徽省','Beijing Municipality':'北京市','Chongqing Municipality':'重庆市','Fujian Province':'福建省','Gansu Province':'甘肃省','Guangxi Zhuang Autonomous Region':'广西壮族自治区','Guangzhou Province':'广东省','Guizhou Province':'贵州省','Hainan Province':'海南省','Hebei Province':'河北省','Heilongjiang Province':'黑龙江省','Henan Province':'河南省','Hong Kong Special Administrative Region':'香港特别行政区','Hubei Province':'湖北省','Hunan Province':'湖南省','Inner Mongolia Autonomous Region':'内蒙古自治区','Jiangsu Province':'江苏省','Jiangxi Province':'江西省','Jilin Province':'吉林省','Liaoning Province':'辽宁省','Macau Special Administrative Region':'澳门特别行政区','Ningxia Ningxia Hui Autonomous Region':'宁夏回族自治区','Qinghai Province':'青海省','Shaanxi Province':'陕西省','Shandong Province':'山东省','Shanghai Municipality':'上海市','Shanxi Province':'山西省','Sichuan Province':'四川省','Taiwan Province':'台湾省','Tianjin Municipality':'天津市','Tibet Autonomous Region':'西藏自治区','Xinjiang Uyghur Autonomous Region':'新疆维吾尔自治区','Yunnan Province':'云南省','Zhejiang Province':'浙江省'
};
const taiwanRegionNames = {
  'Changhua County':'彰化县','Chiayi':'嘉义市','Chiayi County':'嘉义县','Hsinchu':'新竹市','Hsinchu County':'新竹县','Hualien County':'花莲县','Kaohsiung':'高雄市','Keelung':'基隆市','Kinmen':'金门县','Matsu Islands':'连江县','Miaoli County':'苗栗县','Nantou County':'南投县','New Taipei':'新北市','Penghu':'澎湖县','Pingtung County':'屏东县','Taichung':'台中市','Tainan':'台南市','Taipei':'台北市','Taitung County':'台东县','Taoyuan':'桃园市','Yilan County':'宜兰县','Yunlin County':'云林县'
};
const beijingDistrictNames = {
  'Changping District':'昌平区','Chaoyang District':'朝阳区','Daxing District':'大兴区','Dongcheng District':'东城区','Fangshan District':'房山区','Fengtai District':'丰台区','Haidian District':'海淀区','Pinggu District':'平谷区','Yanqing County':'延庆区','Mentougou District':'门头沟区','Tongzhou District':'通州区','Huairou District':'怀柔区','Shunyi District':'顺义区','Miyun District':'密云区','Xicheng District':'西城区','Shijingshan District':'石景山区'
};
const number = new Intl.NumberFormat('zh-CN',{maximumFractionDigits:1});
const compact = new Intl.NumberFormat('zh-CN',{notation:'compact',maximumFractionDigits:1});

function displayName(record, feature) {
  if(feature && codeFor(feature)==='TWN') return '中国台湾';
  if(feature && codeFor(feature)==='HKG') return '中国香港';
  if(feature && codeFor(feature)==='MAC') return '中国澳门';
  const iso2=record?.iso2 || feature?.properties?.ISO_A2;
  if (iso2 && iso2.length===2) {
    try { const value=zhNames.of(iso2); if(value && value!==iso2) return value; } catch {}
  }
  return record?.name || feature?.properties?.ADMIN || feature?.properties?.NAME || '未知地区';
}
function fmt(value, metric=state.metric, short=false) {
  if(value==null || !Number.isFinite(value)) return '暂无数据';
  if(metric.format==='money') return '$'+(short&&Math.abs(value)>=10000?compact.format(value):number.format(Math.round(value)));
  if(metric.format==='population') return compact.format(value);
  return number.format(value)+(metric.format==='percent'?'%':metric.unit==='岁'?' 岁':metric.unit==='吨'?' 吨':'');
}
function qualifies(value, code) {
  if(value==null || !(state.operator==='above'?value>=state.threshold:value<=state.threshold)) return false;
  if(!state.secondaryEnabled) return true;
  const other=state.secondaryValues.get(code)?.value;
  return other!=null && (state.secondaryOperator==='above'?other>=state.secondaryThreshold:other<=state.secondaryThreshold);
}
function codeFor(feature) { const p=feature.properties; return p.__code || [p.ADM0_A3,p.ISO_A3,p.SOV_A3].find(x=>x && x!=='-99') || ''; }
function recordFor(feature) { return state.values.get(codeFor(feature)); }
function colorFor(feature) {
  if(state.admin.open && state.selected===codeFor(feature)) return '#204955bb';
  if(state.selected && codeFor(feature)===state.selected) return '#b7ffe6';
  if(state.hover && codeFor(feature)===state.hover) return '#8ff3d3';
  const value=recordFor(feature)?.value;
  return qualifies(value,codeFor(feature))?'#48cfae':'#234657';
}
function altitudeFor(feature) { return state.selected===codeFor(feature)?(state.admin.open?0.002:0.025):qualifies(recordFor(feature)?.value,codeFor(feature))?0.013:0.004; }
function refreshGlobe() {
  if(!state.globe) return;
  state.globe.polygonCapColor(colorFor).polygonAltitude(altitudeFor).polygonSideColor(f=>qualifies(recordFor(f)?.value,codeFor(f))?'#188f78':'#173343');
}
function renderMetrics() {
  $('#metric-list').innerHTML=metrics.map(m=>`<button class="metric-button ${m.id===state.metric.id?'active':''}" data-metric="${m.id}" type="button"><span class="metric-icon">${m.icon}</span><span class="metric-name">${m.name}</span></button>`).join('');
  $('#metric-count').textContent=`${metrics.length} 项`;
}
function renderMetricHeader() {
  const m=state.metric;
  $('#insight-title').textContent=m.name;
  $('#insight-desc').textContent=m.description;
  $('#stage-metric').textContent=m.name;
  $('#list-unit').textContent=m.unit;
  $('#threshold-input').min=m.min; $('#threshold-input').max=m.max; $('#threshold-input').step=m.step;
  $('#threshold-range').min=m.min; $('#threshold-range').max=m.max; $('#threshold-range').step=m.step;
  $('#threshold-input').value=state.threshold; $('#threshold-range').value=state.threshold;
  $('#threshold-unit').textContent=m.unit;
  $('#range-min').textContent=fmt(m.min,m,true); $('#range-max').textContent=fmt(m.max,m,true);
  renderMetrics();
}
function renderExtras() {
  $('#preset-list').innerHTML=presets.map(p=>`<button type="button" data-preset="${p.id}" class="${state.activePreset===p.id?'active':''}">${p.name}</button>`).join('');
  $('#year-select').innerHTML='<option value="latest">各地最新值</option>'+Array.from({length:26},(_,i)=>2025-i).map(y=>`<option value="${y}">${y} 年</option>`).join('');
  $('#year-select').value=state.year;
  $('#secondary-metric').innerHTML=metrics.filter(m=>m.id!==state.metric.id).map(m=>`<option value="${m.id}">${m.name}</option>`).join('');
  if(state.secondaryMetric.id===state.metric.id) {
    state.secondaryMetric=metrics.find(m=>m.id!==state.metric.id);
    state.secondaryThreshold=state.secondaryMetric.default;
  }
  $('#secondary-metric').value=state.secondaryMetric.id;
  $('#secondary-enabled').checked=state.secondaryEnabled;
  $('#secondary-controls').hidden=!state.secondaryEnabled;
  $('#secondary-op').value=state.secondaryOperator;
  $('#secondary-threshold').min=state.secondaryMetric.min;
  $('#secondary-threshold').max=state.secondaryMetric.max;
  $('#secondary-threshold').step=state.secondaryMetric.step;
  $('#secondary-threshold').value=state.secondaryThreshold;
  $('#secondary-unit').textContent=state.secondaryMetric.unit;
}
function renderList() {
  $('#export-result').hidden=true;
  const allRows=state.features.map(feature=>({feature,code:codeFor(feature),record:recordFor(feature)}));
  const rows=allRows.filter(x=>x.record?.value!=null);
  rows.sort((a,b)=>state.operator==='above'?b.record.value-a.record.value:a.record.value-b.record.value);
  const matching=rows.filter(x=>qualifies(x.record.value,x.code));
  $('#export-csv').disabled=!matching.length || state.dataLoading;
  $('#match-count').textContent=matching.length;
  const complete=state.secondaryEnabled?rows.filter(x=>state.secondaryValues.has(x.code)).length:rows.length;
  $('#coverage').textContent=`${complete} 个地区有${state.secondaryEnabled?'两项':'该项'}数据 · ${state.year==='latest'?'各地最新值':state.year+' 年'}`;
  const query=$('#country-search').value.trim().toLowerCase();
  const shown=query?allRows.filter(x=>[displayName(x.record,x.feature),x.record?.name,x.code].some(s=>s?.toLowerCase().includes(query))):matching;
  $('#country-list').innerHTML=shown.length?shown.map((x,i)=>`<button class="country-row ${qualifies(x.record?.value,x.code)?'':'dim'} ${x.code===state.selected?'active':''}" type="button" data-code="${x.code}"><span class="country-rank">${String(i+1).padStart(2,'0')}</span><span class="country-name">${escapeHtml(displayName(x.record,x.feature))}</span><span class="country-value">${escapeHtml(fmt(x.record?.value,state.metric,true))}</span></button>`).join(''):`<div class="list-empty">${query?'没有找到匹配的国家或地区。':'当前条件下没有符合的国家或地区。'}</div>`;
  renderComparisons();
  if(state.selected && !state.dataLoading && !state.dataError) renderDetailMeta(state.selected);
  if(state.dataLoading||state.dataError) {
    $('#match-count').textContent='—';
    $('#coverage').textContent=state.dataLoading?'正在加载数据':'数据暂不可用';
  }
}
function renderDetailMeta(code) {
  const record=state.values.get(code);
  const other=state.secondaryEnabled?state.secondaryValues.get(code):null;
  $('#detail-meta').textContent=record?`${state.metric.name} · ${record.year} 年${state.secondaryEnabled?` · ${state.secondaryMetric.name} ${other?`${fmt(other.value,state.secondaryMetric)}（${other.year} 年）`:'暂无数据'}`:''} · ${qualifies(record.value,code)?'符合全部条件':'未满足全部条件'}`:'此指标暂无可用数据';
}
function renderComparisons() {
  $('#compare-panel').hidden=state.comparisons.length===0;
  $('#compare-list').innerHTML=state.comparisons.map(code=>{
    const feature=state.features.find(f=>codeFor(f)===code);
    const record=state.values.get(code);
    return `<div class="compare-row"><span>${escapeHtml(displayName(record,feature))}${record?` · ${record.year}`:''}</span><strong>${escapeHtml(fmt(record?.value))}</strong><button type="button" data-remove="${code}" aria-label="从对比中移除 ${escapeHtml(displayName(record,feature))}">×</button></div>`;
  }).join('');
  $('#compare-add').disabled=!state.selected || !state.values.has(state.selected) || state.comparisons.includes(state.selected) || state.comparisons.length>=4;
  $('#compare-add').textContent=state.comparisons.includes(state.selected)?'已加入对比':state.comparisons.length>=4?'最多对比 4 个地区':'＋ 加入对比';
}
function exportMatches() {
  if(state.dataLoading) return;
  const op=state.operator==='above'?'≥':'≤';
  const secondOp=state.secondaryOperator==='above'?'≥':'≤';
  const criteria=`${state.metric.name} ${op} ${state.threshold}${state.metric.unit}${state.secondaryEnabled?`；${state.secondaryMetric.name} ${secondOp} ${state.secondaryThreshold}${state.secondaryMetric.unit}`:''}`;
  const header=['地区','地区代码',state.metric.name, '单位','统计年份'];
  if(state.secondaryEnabled) header.push(state.secondaryMetric.name,'第二指标单位','第二指标年份');
  header.push('筛选条件','来源');
  const rows=state.features.map(feature=>({feature,code:codeFor(feature),record:recordFor(feature)}))
    .filter(x=>qualifies(x.record?.value,x.code))
    .sort((a,b)=>state.operator==='above'?b.record.value-a.record.value:a.record.value-b.record.value)
    .map(({feature,code,record})=>{
      const row=[displayName(record,feature),code,record.value,state.metric.unit,record.year];
      if(state.secondaryEnabled) { const other=state.secondaryValues.get(code); row.push(other.value,state.secondaryMetric.unit,other.year); }
      row.push(criteria,`https://api.worldbank.org/v2/country/${code}/indicator/${state.metric.code}`);
      return row;
    });
  if(!rows.length) return;
  const csvCell=value=>{
    let text=String(value??'');
    if(typeof value!=='number' && /^[\s]*[=+\-@\t\r]/.test(text)) text="'"+text;
    return '"'+text.replace(/"/g,'""')+'"';
  };
  const csv='\uFEFF'+[header,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n');
  if(state.exportUrl) URL.revokeObjectURL(state.exportUrl);
  state.exportCsv=csv;
  state.exportUrl=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const link=$('#export-download');
  link.href=state.exportUrl; link.download=`earth-atlas-${state.metric.id}-${state.year}.csv`;
  $('#export-result').hidden=false;
  $('#export-feedback').textContent=`${rows.length} 条`;
  $('#copy-csv').textContent='复制 CSV';
  link.click();
}
function escapeHtml(value) { return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
async function loadMetric() {
  const token=++state.request;
  state.dataLoading=true;
  state.dataError=false;
  state.detailToken=(state.detailToken||0)+1;
  $('#export-csv').disabled=true;
  const m=state.metric;
  $('#loading').hidden=false;
  $('#loading span').textContent=`正在读取${state.year==='latest'?'最新':state.year+' 年'}数据…`;
  $('#country-list').innerHTML='<div class="list-empty">正在获取数据…</div>';
  $('#update-label').textContent='正在连接数据';
  state.values=new Map();
  state.secondaryValues=new Map();
  renderComparisons();
  if(state.selected) {
    $('#detail-value').textContent='—';
    $('#detail-meta').textContent='正在读取数据…';
    $('#detail-source').hidden=true;
    $('#sparkline').innerHTML='';
    $('#spark-years').textContent='';
  }
  $('#match-count').textContent='—';
  $('#coverage').textContent='正在加载数据';
  refreshGlobe();
  try {
    const [data,secondary]=await Promise.all([
      fetchIndicator(m,state.year),
      state.secondaryEnabled?fetchIndicator(state.secondaryMetric,state.year):Promise.resolve(new Map())
    ]);
    if(token!==state.request) return;
    state.values=data;
    state.secondaryValues=secondary;
    state.dataLoading=false;
    $('#loading').hidden=true;
    $('#update-label').textContent='数据已更新';
    renderList(); refreshGlobe();
    if(state.selected) showDetail(state.selected);
  } catch(error) {
    if(token!==state.request) return;
    state.dataLoading=false;
    state.dataError=true;
    $('#loading').hidden=true;
    $('#update-label').textContent='连接失败';
    $('#country-list').innerHTML=`<div class="list-empty">数据加载失败。请检查网络后 <button id="retry-data" type="button">重试</button>。<br>${escapeHtml(error.message)}</div>`;
    $('#match-count').textContent='—'; $('#coverage').textContent='世界银行接口暂不可用';
    if(state.selected) $('#detail-meta').textContent='数据暂不可用，请重试';
  }
}
async function fetchIndicator(metric,year) {
  const key=`${metric.code}:${year}`;
  if(state.cache.has(key)) return state.cache.get(key);
  const params=new URLSearchParams({format:'json',per_page:'300'});
  if(year==='latest') params.set('mrnev','1'); else params.set('date',year);
  const base=`https://api.worldbank.org/v2/country/all/indicator/${metric.code}`;
  let rows;
  try {
    rows=indicatorRows(await fetchJSON(`${base}?${params}`));
  } catch(error) {
    if(year==='latest') throw error;
    params.set('per_page','100');
    const first=await fetchJSON(`${base}?${params}&page=1`);
    rows=indicatorRows(first);
    const pages=Math.min(5,Number(first[0]?.pages)||1);
    const rest=await Promise.all(Array.from({length:pages-1},(_,index)=>fetchJSON(`${base}?${params}&page=${index+2}`)));
    rows.push(...rest.flatMap(indicatorRows));
  }
  const data=new Map();
  for(const row of rows) {
    if(row.value==null || !Number.isFinite(Number(row.value)) || !row.countryiso3code) continue;
    const old=data.get(row.countryiso3code);
    if(!old || Number(row.date)>Number(old.year)) data.set(row.countryiso3code,{value:Number(row.value),year:row.date,name:row.country.value,iso2:row.country.id});
  }
  state.cache.set(key,data);
  return data;
}
function setThreshold(raw) {
  const parsed=Number(raw); if(!Number.isFinite(parsed)) return;
  state.activePreset=null; renderPresetSelection();
  state.threshold=Math.min(state.metric.max,Math.max(state.metric.min,parsed));
  $('#threshold-input').value=state.threshold; $('#threshold-range').value=state.threshold;
  renderList(); refreshGlobe();
}
function setOperator(value) {
  state.activePreset=null; renderPresetSelection();
  state.operator=value;
  $('#op-above').classList.toggle('active',value==='above');
  $('#op-below').classList.toggle('active',value==='below');
  renderList(); refreshGlobe();
}
function renderPresetSelection() {
  $('#preset-list').querySelectorAll('[data-preset]').forEach(button=>button.classList.toggle('active',button.dataset.preset===state.activePreset));
}
function focusCountry(code) {
  const feature=state.simpleFeatures.find(f=>codeFor(f)===code);
  if(!feature) return;
  if(state.selected!==code) clearAdmin();
  state.selected=code;
  if(state.detailed && !setDetailedCountry(code)) {
    state.features=state.simpleFeatures;
    state.globe.polygonsData(state.features);
    state.detailed=false;
    $('#detail-map-btn').classList.remove('active');
    $('#map-resolution').textContent='该地区没有精细边界';
  }
  let [lng,lat]=geoCentroid(feature);
  if(!Number.isFinite(lat)||!Number.isFinite(lng)) [lng,lat]=[0,0];
  state.globe.pointOfView({lat,lng,altitude:0.9},900);
  state.globe.controls().autoRotate=false; state.rotating=false; $('#rotate-btn').textContent='▶'; $('#rotate-btn').setAttribute('aria-label','继续自动旋转');
  refreshGlobe(); renderList(); showDetail(code);
}
async function showDetail(code) {
  const detailToken=state.detailToken=(state.detailToken||0)+1;
  const feature=state.features.find(f=>codeFor(f)===code);
  if(!feature) return;
  const record=state.values.get(code);
  $('#detail-card').hidden=false;
  $('#detail-name').textContent=displayName(record,feature);
  $('#detail-value').textContent=record?fmt(record.value):'暂无数据';
  renderDetailMeta(code);
  if(state.dataLoading) $('#detail-meta').textContent='正在读取数据…';
  if(state.dataError) $('#detail-meta').textContent='数据暂不可用，请重试';
  $('#detail-source').href=`https://data.worldbank.org/indicator/${state.metric.code}?locations=${code}`;
  $('#detail-source').hidden=!record;
  $('#sparkline').innerHTML='<span class="list-empty">正在读取历年数据…</span>';
  $('#spark-years').textContent='';
  renderComparisons();
  if(!record) { $('#sparkline').innerHTML='<span class="list-empty">暂无数据</span>'; return; }
  const expectedMetric=state.metric.code, expectedCountry=code;
  try {
    const historyKey=`history:${code}:${expectedMetric}`;
    const data=state.cache.get(historyKey)||await fetchJSON(`https://api.worldbank.org/v2/country/${code}/indicator/${expectedMetric}?format=json&per_page=100`);
    const rows=indicatorRows(data);
    state.cache.set(historyKey,data);
    if(state.selected!==expectedCountry||state.metric.code!==expectedMetric||detailToken!==state.detailToken) return;
    const points=rows.filter(x=>x.value!=null && (state.year==='latest'||Number(x.date)<=Number(state.year))).map(x=>({year:Number(x.date),value:Number(x.value)})).sort((a,b)=>a.year-b.year).slice(-25);
    if(points.length<2) { $('#sparkline').innerHTML='<span class="list-empty">历年数据不足</span>'; return; }
    const low=Math.min(...points.map(p=>p.value)), high=Math.max(...points.map(p=>p.value));
    const span=high-low||1;
    const coords=points.map(p=>`${((p.year-points[0].year)/(points.at(-1).year-points[0].year)*260).toFixed(1)},${(52-(p.value-low)/span*43).toFixed(1)}`).join(' ');
    $('#sparkline').innerHTML=`<svg viewBox="0 0 260 58" preserveAspectRatio="none" aria-label="${points[0].year} 年至 ${points.at(-1).year} 年的数据趋势"><line x1="0" y1="53" x2="260" y2="53" stroke="#47756e" stroke-width="1"/><polyline points="${coords}" fill="none" stroke="#8ae7cc" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
    $('#spark-years').textContent=`${points[0].year}—${points.at(-1).year}`;
  } catch { if(state.selected===expectedCountry&&detailToken===state.detailToken) $('#sparkline').innerHTML='<span class="list-empty">历年数据暂不可用</span>'; }
}
function initGlobe() {
  const container=$('#globe');
  const globe=Globe()(container).width(container.clientWidth).height(container.clientHeight)
    .globeImageUrl(asset('earth-blue-marble.jpg')).backgroundColor('rgba(0,0,0,0)')
    .showAtmosphere(true).atmosphereColor('#65b7c4').atmosphereAltitude(0.18)
    .polygonsData(state.features).polygonCapColor(colorFor).polygonSideColor(f=>qualifies(recordFor(f)?.value,codeFor(f))?'#188f78':'#173343')
    .polygonStrokeColor(()=> '#86b9b566').polygonAltitude(altitudeFor).polygonsTransitionDuration(450)
    .pathsData([]).pathPoints('points').pathPointLat(point=>point[1]).pathPointLng(point=>point[0]).pathPointAlt(()=>0.006)
    .pathTransitionDuration(0).pathResolution(.1).pathColor(path=>path.regionIndex===state.admin.selectedIndex?'#fff6a0':'#d5f7f0')
    .pathLabel(path=>escapeHtml(path.name)).onPathClick(path=>selectAdminRegion(path.regionIndex))
    .onPolygonHover((feature,event)=>{
      state.hover=feature?codeFor(feature):null; refreshGlobe();
      const tip=$('#globe-tooltip');
      if(!feature) { tip.hidden=true; return; }
      const record=recordFor(feature);
      const other=state.secondaryEnabled?state.secondaryValues.get(codeFor(feature)):null;
      tip.innerHTML=`<strong>${escapeHtml(displayName(record,feature))}</strong><span>${escapeHtml(record?`${state.metric.name} ${fmt(record.value)} · ${record.year} 年`:'暂无此指标数据')}${other?'<br>'+escapeHtml(`${state.secondaryMetric.name} ${fmt(other.value,state.secondaryMetric)} · ${other.year} 年`):''}</span>`;
      tip.hidden=false;
      if(event) { const rect=container.getBoundingClientRect(); tip.style.left=`${Math.min(event.clientX-rect.left+14,rect.width-210)}px`; tip.style.top=`${Math.max(10,event.clientY-rect.top-50)}px`; }
    }).onPolygonClick(feature=>focusCountry(codeFor(feature)));
  globe.pointOfView({lat:20,lng:20,altitude:2.3});
  const controls=globe.controls(); controls.autoRotate=true; controls.autoRotateSpeed=0.35; controls.enableDamping=true; controls.minDistance=101; controls.maxDistance=700;
  state.globe=globe;
  new ResizeObserver(()=>globe.width(container.clientWidth).height(container.clientHeight)).observe(container);
}
function zoom(factor) { const p=state.globe.pointOfView(); state.globe.pointOfView({...p,altitude:Math.max(.012,Math.min(4,p.altitude*factor))},350); }
async function toggleDetailedMap() {
  const button=$('#detail-map-btn');
  if(state.detailed) {
    state.detailed=false;
    state.features=state.simpleFeatures;
    state.globe.polygonsData(state.features);
    refreshGlobe(); renderList();
    button.classList.remove('active'); button.setAttribute('aria-label','加载精细国界'); button.title='加载精细国界';
    $('#map-resolution').textContent='标准国界';
    return;
  }
  if(!state.selected) { $('#map-resolution').textContent='请先选择一个国家'; return; }
  button.disabled=true; button.textContent='…';
  $('#map-resolution').textContent='正在加载所选国家';
  try {
    if(!state.detailedTopology) {
      const response=await fetch(asset('countries-10m.json'));
      if(!response.ok) throw new Error(`HTTP ${response.status}`);
      state.detailedTopology=await response.json();
    }
    if(!setDetailedCountry(state.selected)) throw new Error('该地区没有精细边界');
    state.detailed=true;
    button.classList.add('active'); button.setAttribute('aria-label','切换回普通国界'); button.title='切换回普通国界';
    $('#map-resolution').textContent='精细国界 · 1:1000万';
  } catch(error) {
    $('#map-resolution').textContent=`精细国界加载失败：${error.message}`;
  } finally { button.disabled=false; button.textContent='▧'; }
}
function setDetailedCountry(code) {
  const original=state.simpleFeatures.find(f=>codeFor(f)===code);
  if(!original || !state.detailedTopology) return false;
  const numeric=String(original.properties.ISO_N3||'').padStart(3,'0');
  const english=original.properties.NAME || original.properties.ADMIN;
  const geometry=state.detailedTopology.objects.countries.geometries.find(g=>
    (numeric!=='-99' && String(g.id).padStart(3,'0')===numeric) || g.properties?.name===english
  );
  if(!geometry) return false;
  const detailed=topoFeature(state.detailedTopology,geometry);
  detailed.properties={...original.properties,...detailed.properties,__code:code};
  state.features=state.simpleFeatures.filter(f=>codeFor(f)!==code).concat(detailed);
  state.globe.polygonsData(state.features);
  refreshGlobe(); renderList();
  return true;
}
function clearAdmin() {
  state.admin.token++;
  state.admin.open=false;
  state.admin.level=0;
  state.admin.features=[];
  state.admin.parentRegion=null;
  state.admin.selectedIndex=-1;
  $('#admin-panel').hidden=true;
  $('#admin-open').textContent='▦ 查看行政区';
  $('#admin-status').textContent='';
  $('#admin-list').innerHTML='';
  $('#admin-search').value='';
  $('#admin-retry').hidden=true;
  if(state.globe) { state.globe.pathsData([]); refreshGlobe(); }
}
async function fetchAdmin(code,level,parentRegion=null) {
  const taiwanChildren=level===2 && (code==='TWN'||parentRegion?.properties?.shapeName==='Taiwan Province');
  const source=code==='TWN'?'CHN':code;
  const chinaCounty=source==='CHN' && level===2 && !taiwanChildren;
  const key=taiwanChildren?'CHN:TWN-COUNTIES':chinaCounty?`CHN:COUNTIES:${parentRegion?.properties?.shapeID}`:`${source}:ADM${level}`;
  if(state.admin.cache.has(key)) return state.admin.cache.get(key);
  let url,year=level===1?'2019':'2017';
  if(taiwanChildren) url=asset('taiwan-adm2.geojson');
  else if(chinaCounty) url=asset(`china-counties/${encodeURIComponent(parentRegion.properties.shapeID)}.geojson`);
  else if(source==='CHN' && level===1) url=asset('china-adm1.geojson');
  else if(['DEU','USA','JPN','FRA','GBR'].includes(source)) {
    const metadata=await fetchJSON(asset(`admin/${source}/ADM${level}-source.json`));
    year=metadata.boundaryYearRepresented||'未注明';
    url=asset(`admin/${source}/ADM${level}.geojson`);
  }
  else {
    const metadata=await fetchJSON(`https://www.geoboundaries.org/api/current/gbOpen/${source}/ADM${level}/`);
    url=metadata.simplifiedGeometryGeoJSON;
    year=metadata.boundaryYearRepresented||'未注明';
    if(!url?.startsWith('https://')) throw new Error('边界下载地址不可用');
    // Large GeoJSON files are Git LFS objects; the media host serves their contents with CORS.
    url=url.replace(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/raw\//,'https://media.githubusercontent.com/media/$1/$2/');
  }
  const data=await fetchJSON(url);
  if(!Array.isArray(data.features)) throw new Error('边界文件格式不正确');
  const result={features:data.features,year};
  state.admin.cache.set(key,result);
  return result;
}
function adminName(feature) {
  const name=feature.properties?.shapeName||feature.properties?.name||'未命名区域';
  return chinaRegionNames[name]||taiwanRegionNames[name]||beijingDistrictNames[name]||name;
}
function ringContains([x,y],ring) {
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++) {
    const [xi,yi]=ring[i], [xj,yj]=ring[j];
    if((yi>y)!==(yj>y) && x<(xj-xi)*(y-yi)/(yj-yi)+xi) inside=!inside;
  }
  return inside;
}
function regionContains(feature,point) {
  const polygons=feature.geometry?.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry?.type==='MultiPolygon'?feature.geometry.coordinates:[];
  return polygons.some(rings=>ringContains(point,rings[0]) && !rings.slice(1).some(hole=>ringContains(point,hole)));
}
function regionCenter(feature) {
  const polygons=feature.geometry?.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry?.type==='MultiPolygon'?feature.geometry.coordinates:[];
  let best=null;
  for(const polygon of polygons) {
    const ring=polygon[0];
    let twiceArea=0,cx=0,cy=0;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++) {
      const cross=ring[j][0]*ring[i][1]-ring[i][0]*ring[j][1];
      twiceArea+=cross;
      cx+=(ring[j][0]+ring[i][0])*cross;
      cy+=(ring[j][1]+ring[i][1])*cross;
    }
    if(Math.abs(twiceArea)>1e-9 && (!best||Math.abs(twiceArea)>best.area)) best={area:Math.abs(twiceArea),point:[cx/(3*twiceArea),cy/(3*twiceArea)]};
  }
  return best?.point || polygons[0]?.[0]?.[0] || [0,0];
}
function adminPaths(features) {
  const paths=[];
  features.forEach((feature,regionIndex)=>{
    const polygons=feature.geometry?.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry?.type==='MultiPolygon'?feature.geometry.coordinates:[];
    polygons.forEach(polygon=>polygon.forEach(ring=>{
      if(ring.length<2) return;
      const step=Math.max(1,Math.ceil(ring.length/500));
      const points=ring.filter((_,i)=>i%step===0);
      if(points.at(-1)!==ring.at(-1)) points.push(ring.at(-1));
      paths.push({points,regionIndex,name:adminName(feature)});
    }));
  });
  return paths.slice(0,1200);
}
function renderAdmin() {
  const admin=state.admin;
  $('#admin-panel').hidden=!admin.open;
  $('#admin-open').textContent=admin.open?'× 关闭行政区':'▦ 查看行政区';
  $('#admin-level-1').classList.toggle('active',admin.level===1);
  $('#admin-level-2').classList.toggle('active',admin.level===2);
  $('#admin-level-2').disabled=!admin.parentRegion;
  $('#admin-level-2').textContent=['CHN','TWN'].includes(state.selected)?'区 / 县':'下一级';
  if(!admin.open) return;
  renderAdminList();
  const country=state.simpleFeatures.find(f=>codeFor(f)===state.selected);
  $('#admin-breadcrumb').textContent=displayName(state.values.get(state.selected),country)+(admin.level===2?` / ${adminName(admin.parentRegion)}`:'');
  $('#admin-back').hidden=admin.level!==2;
  $('#admin-status').textContent=`${admin.features.length} 个区域 · ${admin.year} 年边界 · 无该级指标`;
  state.globe.pathsData(adminPaths(admin.features)).pathColor(path=>path.regionIndex===admin.selectedIndex?'#fff6a0':'#d5f7f0');
}
function renderAdminList() {
  const query=$('#admin-search').value.trim().toLowerCase();
  const rows=state.admin.features.map((feature,i)=>({feature,i})).filter(({feature})=>[adminName(feature),feature.properties?.shapeName].some(name=>name?.toLowerCase().includes(query)));
  $('#admin-list').innerHTML=rows.map(({feature,i})=>`<button type="button" data-region="${i}" class="${i===state.admin.selectedIndex?'active':''}"><span>${escapeHtml(adminName(feature))}</span>${state.admin.level===1?`<span class="drilldown" data-drill="${i}" aria-hidden="true">›</span>`:''}</button>`).join('')||'<div class="list-empty">没有匹配的区域</div>';
}
async function loadAdmin(level) {
  if(!state.selected) return;
  if(level===2 && !state.admin.parentRegion) {
    $('#admin-status').textContent='请先选择一个省、州或同级区域'; return;
  }
  const token=++state.admin.token;
  const country=state.selected;
  state.admin.open=true;
  refreshGlobe();
  $('#globe-tooltip').hidden=true;
  state.admin.requestedLevel=level;
  state.admin.features=[];
  state.admin.selectedIndex=-1;
  state.globe.pathsData([]);
  $('#admin-search').value='';
  $('#admin-retry').hidden=true;
  $('#admin-level-1').disabled=true;
  $('#admin-level-2').disabled=true;
  $('#admin-panel').hidden=false;
  $('#admin-open').textContent='× 关闭行政区';
  $('#admin-status').textContent='正在加载行政边界…';
  $('#admin-list').innerHTML='';
  try {
    const result=await fetchAdmin(country,level,state.admin.parentRegion);
    if(token!==state.admin.token || country!==state.selected) return;
    let features=result.features;
    if(country==='TWN' && level===1) features=features.filter(f=>f.properties?.shapeName==='Taiwan Province');
    const taiwanChildren=level===2 && (country==='TWN'||state.admin.parentRegion?.properties?.shapeName==='Taiwan Province');
    if(level===2 && !taiwanChildren && country!=='CHN') {
      const parent=state.admin.parentRegion;
      features=features.filter(f=>regionContains(parent,regionCenter(f)));
    }
    state.admin.level=level;
    state.admin.year=result.year;
    state.admin.features=features;
    state.admin.selectedIndex=-1;
    renderAdmin();
    if(!features.length) $('#admin-status').textContent='该区域暂无下一级边界';
  } catch(error) {
    if(token!==state.admin.token) return;
    $('#admin-status').textContent=`加载失败：${error.message}`;
    $('#admin-retry').hidden=false;
    state.globe.pathsData([]);
  } finally {
    if(token===state.admin.token) {
      $('#admin-level-1').disabled=false;
      $('#admin-level-2').disabled=!state.admin.parentRegion;
    }
  }
}
function selectAdminRegion(index) {
  const feature=state.admin.features[index];
  if(!feature) return;
  state.admin.selectedIndex=index;
  if(state.admin.level===1) state.admin.parentRegion=feature;
  renderAdmin();
  const [lng,lat]=regionCenter(feature);
  const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;
  const points=polygons.flatMap(p=>p[0]);
  const lngs=points.map(p=>p[0]),lats=points.map(p=>p[1]);
  const extent=Math.max(Math.max(...lngs)-Math.min(...lngs),Math.max(...lats)-Math.min(...lats));
  if(Number.isFinite(lat)&&Number.isFinite(lng)) state.globe.pointOfView({lat,lng,altitude:Math.max(.018,Math.min(1.2,extent/35))});
}
function applyPreset(preset) {
  state.activePreset=preset.id;
  state.metric=metrics.find(m=>m.id===preset.primary);
  state.threshold=preset.threshold;
  state.operator='above';
  state.secondaryEnabled=true;
  state.secondaryMetric=metrics.find(m=>m.id===preset.secondary);
  state.secondaryThreshold=preset.secondaryThreshold;
  state.secondaryOperator=preset.secondaryOp;
  $('#op-above').classList.add('active'); $('#op-below').classList.remove('active');
  renderMetricHeader(); renderExtras(); loadMetric();
}
function bind() {
  $('#preset-list').addEventListener('click',e=>{const button=e.target.closest('[data-preset]');if(button)applyPreset(presets.find(p=>p.id===button.dataset.preset));});
  $('#metric-list').addEventListener('click',e=>{const button=e.target.closest('[data-metric]');if(!button)return;const m=metrics.find(x=>x.id===button.dataset.metric);if(!m||m===state.metric)return;state.activePreset=null;state.metric=m;state.threshold=m.default;renderMetricHeader();renderExtras();loadMetric();});
  $('#year-select').addEventListener('change',e=>{state.year=e.target.value;loadMetric();});
  $('#secondary-enabled').addEventListener('change',e=>{state.secondaryEnabled=e.target.checked;state.activePreset=null;renderExtras();loadMetric();});
  $('#secondary-metric').addEventListener('change',e=>{state.secondaryMetric=metrics.find(m=>m.id===e.target.value);state.secondaryThreshold=state.secondaryMetric.default;state.activePreset=null;renderExtras();loadMetric();});
  $('#secondary-op').addEventListener('change',e=>{state.secondaryOperator=e.target.value;state.activePreset=null;renderPresetSelection();renderList();refreshGlobe();});
  $('#secondary-threshold').addEventListener('change',e=>{const value=Number(e.target.value);if(!Number.isFinite(value))return;state.secondaryThreshold=Math.max(state.secondaryMetric.min,Math.min(state.secondaryMetric.max,value));state.activePreset=null;renderExtras();renderList();refreshGlobe();});
  $('#threshold-range').addEventListener('input',e=>setThreshold(e.target.value));
  $('#threshold-input').addEventListener('change',e=>setThreshold(e.target.value));
  $('#op-above').addEventListener('click',()=>setOperator('above'));
  $('#op-below').addEventListener('click',()=>setOperator('below'));
  $('#country-search').addEventListener('input',renderList);
  $('#export-csv').addEventListener('click',exportMatches);
  $('#copy-csv').addEventListener('click',async()=>{
    try { await navigator.clipboard.writeText(state.exportCsv); $('#copy-csv').textContent='已复制'; }
    catch { $('#export-feedback').textContent='请使用保存链接'; }
  });
  $('#country-list').addEventListener('click',e=>{const row=e.target.closest('[data-code]');if(row)focusCountry(row.dataset.code);});
  $('#country-list').addEventListener('click',e=>{if(e.target.id==='retry-data')loadMetric();});
  $('#detail-close').addEventListener('click',()=>{clearAdmin();state.selected=null;$('#detail-card').hidden=true;refreshGlobe();renderList();});
  $('#admin-open').addEventListener('click',()=>state.admin.open?clearAdmin():loadAdmin(1));
  $('#admin-level-1').addEventListener('click',()=>loadAdmin(1));
  $('#admin-level-2').addEventListener('click',()=>loadAdmin(2));
  $('#admin-back').addEventListener('click',()=>loadAdmin(1));
  $('#admin-retry').addEventListener('click',()=>loadAdmin(state.admin.requestedLevel||1));
  $('#admin-search').addEventListener('input',renderAdminList);
  $('#admin-list').addEventListener('click',e=>{
    const button=e.target.closest('[data-region]');
    if(!button)return;
    selectAdminRegion(Number(button.dataset.region));
    if(e.target.closest('[data-drill]'))loadAdmin(2);
  });
  $('#compare-add').addEventListener('click',()=>{if(!state.selected||state.comparisons.includes(state.selected)||state.comparisons.length>=4)return;state.comparisons.push(state.selected);renderComparisons();});
  $('#compare-clear').addEventListener('click',()=>{state.comparisons=[];renderComparisons();});
  $('#compare-list').addEventListener('click',e=>{const button=e.target.closest('[data-remove]');if(!button)return;state.comparisons=state.comparisons.filter(code=>code!==button.dataset.remove);renderComparisons();});
  $('#detail-map-btn').addEventListener('click',toggleDetailedMap);
  $('#zoom-in').addEventListener('click',()=>zoom(.72)); $('#zoom-out').addEventListener('click',()=>zoom(1.4));
  $('#reset-view').addEventListener('click',()=>{clearAdmin();state.selected=null;if(state.detailed)toggleDetailedMap();$('#detail-card').hidden=true;state.globe.pointOfView({lat:20,lng:20,altitude:2.3},900);refreshGlobe();renderList();});
  $('#rotate-btn').addEventListener('click',()=>{state.rotating=!state.rotating;state.globe.controls().autoRotate=state.rotating;$('#rotate-btn').textContent=state.rotating?'Ⅱ':'▶';$('#rotate-btn').setAttribute('aria-label',state.rotating?'暂停自动旋转':'继续自动旋转');});
}
async function main() {
  $('#metric-list').previousElementSibling.before($('.threshold-panel'),$('.secondary-panel'));
  renderMetricHeader(); renderExtras(); bind();
  try {
    const response=await fetch(asset('countries.geojson'));
    if(!response.ok) throw new Error(`地图 HTTP ${response.status}`);
    const data=await response.json();
    state.features=data.features.filter(f=>f.properties?.ADMIN!=='Antarctica');
    state.simpleFeatures=state.features;
    initGlobe(); await loadMetric();
  } catch(error) { $('#loading span').textContent=`地球加载失败：${error.message}`; $('#update-label').textContent='地图加载失败'; }
}
main();
