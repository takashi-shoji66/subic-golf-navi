// =====================================================================
// スービック ゴルフナビ - アプリロジック
// =====================================================================

let map, satLayer, streetLayer, currentLayer = 'sat';
let gpsWatchId = null, gpsMarker = null, gpsAccuracy = null;
let activeHole = null;
let deferredInstall = null;

// ---- 地図初期化 ----
map = L.map('map', { zoomControl: true, attributionControl: true }).setView(COURSE_CENTER, 16);

satLayer = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  { attribution: 'Tiles © Esri', maxZoom: 18, crossOrigin: true }
);
streetLayer = L.tileLayer(
  'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  { attribution: '© OpenStreetMap contributors', maxZoom: 19, crossOrigin: true }
);
satLayer.addTo(map);

// ---- ホールピン ----
const markers = {};
HOLES.forEach(h => {
  const hard = h.hcp <= 4;
  const icon = L.divIcon({
    className: '',
    html: `<div class="pin${hard ? ' hard' : ''}"><span>${h.n}</span></div>`,
    iconSize: [28, 28], iconAnchor: [14, 28], popupAnchor: [0, -28]
  });
  const m = L.marker([h.lat, h.lng], { icon }).addTo(map);
  m.bindPopup(`<b>${h.n}番</b> Par${h.par} / ${h.blue}yd<br>Hdcp ${h.hcp}${hard ? ' (難関)' : ''}`);
  m.on('click', () => selectHole(h));
  markers[h.n] = m;
});

// ---- ホール選択 ----
function selectHole(h) {
  activeHole = h;
  const hard = h.hcp <= 4;
  const body = document.getElementById('panel-body');
  body.innerHTML = `
    <div class="hi-head">
      <span class="hi-num">${h.n}</span>
      <span class="hi-par">Par ${h.par}</span>
      <span class="hi-badge${hard ? ' hard' : ''}">Hdcp ${h.hcp}${hard ? ' 難関' : ''}</span>
    </div>
    <div class="hi-yards">
      <span>Blue <b>${h.blue}</b>yd</span>
      <span>White <b>${h.white}</b>yd</span>
      <span>Red <b>${h.red}</b>yd</span>
    </div>
    <div class="hi-tip">${h.tip}</div>
    <div class="hi-dist" id="hi-dist"></div>`;
  updateDistance();
}

// ---- レイヤー切替 ----
function setLayer(type) {
  if (type === currentLayer) return;
  currentLayer = type;
  if (type === 'sat') {
    map.removeLayer(streetLayer); satLayer.addTo(map);
    toggleBtn('btn-sat', 'btn-street');
  } else {
    map.removeLayer(satLayer); streetLayer.addTo(map);
    toggleBtn('btn-street', 'btn-sat');
  }
}
function toggleBtn(on, off) {
  document.getElementById(on).classList.add('active');
  document.getElementById(off).classList.remove('active');
}

// ---- GPS ----
function toggleGPS() {
  const btn = document.getElementById('btn-gps');
  if (gpsWatchId !== null) {
    navigator.geolocation.clearWatch(gpsWatchId);
    gpsWatchId = null;
    if (gpsMarker) { map.removeLayer(gpsMarker); gpsMarker = null; }
    if (gpsAccuracy) { map.removeLayer(gpsAccuracy); gpsAccuracy = null; }
    btn.classList.remove('active');
    return;
  }
  if (!navigator.geolocation) { alert('この端末では位置情報が利用できません'); return; }
  btn.classList.add('active');
  gpsWatchId = navigator.geolocation.watchPosition(
    pos => {
      const ll = [pos.coords.latitude, pos.coords.longitude];
      const acc = pos.coords.accuracy;
      if (!gpsMarker) {
        gpsMarker = L.circleMarker(ll, { radius: 8, color: '#fff', weight: 2, fillColor: '#378ADD', fillOpacity: 1 }).addTo(map);
        gpsAccuracy = L.circle(ll, { radius: acc, color: '#378ADD', weight: 1, fillColor: '#378ADD', fillOpacity: .12 }).addTo(map);
        map.setView(ll, 17);
      } else {
        gpsMarker.setLatLng(ll);
        gpsAccuracy.setLatLng(ll).setRadius(acc);
      }
      updateDistance();
    },
    err => {
      btn.classList.remove('active');
      gpsWatchId = null;
      alert('位置情報を取得できませんでした。\n設定で位置情報の許可をご確認ください。');
    },
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
  );
}

// ---- グリーンまでの距離（GPS現在地→選択ホール）----
function updateDistance() {
  const box = document.getElementById('hi-dist');
  if (!box || !activeHole || !gpsMarker) { if (box) box.style.display = 'none'; return; }
  const from = gpsMarker.getLatLng();
  const to = L.latLng(activeHole.lat, activeHole.lng);
  const meters = from.distanceTo(to);
  const yards = Math.round(meters * 1.09361);
  box.style.display = 'block';
  box.innerHTML = `${activeHole.n}番ピンまで　<b>${yards}</b> yd <span style="font-size:12px">(${Math.round(meters)} m)</span>`;
}

// ---- オフライン保存（コース範囲のタイルを事前取得しSWキャッシュへ）----
async function cacheCourse() {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
    showToast('先にホーム画面に追加してから実行してください');
    return;
  }
  showToast('コース範囲を保存中…');
  const urls = buildTileUrls();
  let done = 0;
  for (const u of urls) {
    try { await fetch(u, { mode: 'no-cors' }); } catch (e) {}
    done++;
    if (done % 20 === 0) showToast(`保存中… ${done}/${urls.length}`);
  }
  showToast(`✓ ${urls.length}枚のタイルを保存しました`);
}

// コース範囲の航空写真タイルURL一覧を生成（ズーム15〜18）
function buildTileUrls() {
  const urls = [];
  const [sw, ne] = COURSE_BOUNDS;
  for (let z = 15; z <= 18; z++) {
    const x1 = lon2tile(sw[1], z), x2 = lon2tile(ne[1], z);
    const y1 = lat2tile(ne[0], z), y2 = lat2tile(sw[0], z);
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++)
      for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
        urls.push(`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`);
  }
  return urls;
}
function lon2tile(lon, z) { return Math.floor((lon + 180) / 360 * Math.pow(2, z)); }
function lat2tile(lat, z) { return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z)); }

function showToast(msg) {
  const t = document.getElementById('cache-toast');
  t.textContent = msg; t.style.display = 'block';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.display = 'none'; }, 2500);
}

// ---- ネット状態表示 ----
function updateNet() {
  const dot = document.getElementById('net-dot'), txt = document.getElementById('net-txt');
  if (navigator.onLine) { dot.classList.remove('offline'); txt.textContent = 'オンライン'; }
  else { dot.classList.add('offline'); txt.textContent = 'オフライン'; }
}
window.addEventListener('online', updateNet);
window.addEventListener('offline', updateNet);
updateNet();

// ---- PWA インストール ----
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferredInstall = e;
  document.getElementById('install-banner').style.display = 'flex';
});
function doInstall() {
  document.getElementById('install-banner').style.display = 'none';
  if (deferredInstall) { deferredInstall.prompt(); deferredInstall = null; }
}

// ---- Service Worker 登録 ----
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  });
}
