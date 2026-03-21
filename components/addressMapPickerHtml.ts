/**
 * Inline HTML for Leaflet + OSM tiles inside WebView (native) or iframe srcDoc (web).
 * Marker is draggable; user confirms the pin before we reverse-geocode.
 */
export function buildAddressMapPickerHtml(latitude: number, longitude: number): string {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return '<html><body>Invalid location</body></html>';
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
  <style>
    html, body { margin: 0; height: 100%; }
    #map { position: absolute; top: 0; left: 0; right: 0; bottom: 56px; }
    .bar {
      position: fixed; bottom: 0; left: 0; right: 0; height: 56px; padding: 8px 10px;
      background: #12121a; display: flex; gap: 8px; align-items: center; z-index: 10000;
      box-sizing: border-box;
    }
    .bar button {
      flex: 1; height: 40px; border: none; border-radius: 10px; font-size: 15px; font-weight: 600;
    }
    .cancel { background: #2a2a36; color: #e8e8f0; }
    .ok { background: #6d28d9; color: #fff; }
    .hint { position: fixed; top: 8px; left: 8px; right: 8px; z-index: 9999;
      background: rgba(0,0,0,.72); color: #fff; font: 13px/1.4 system-ui,sans-serif;
      padding: 10px 12px; border-radius: 10px; pointer-events: none; }
  </style>
</head>
<body>
  <div class="hint">Drag the pin to your exact spot, then confirm.</div>
  <div id="map"></div>
  <div class="bar">
    <button type="button" class="cancel" onclick="sendHost({ type: 'cancel' })">Cancel</button>
    <button type="button" class="ok" onclick="confirmPin()">Use this location</button>
  </div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
  <script>
    var lat0 = ${lat};
    var lng0 = ${lng};
    var map = L.map('map', { zoomControl: true }).setView([lat0, lng0], 17);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    var marker = L.marker([lat0, lng0], { draggable: true, autoPan: true }).addTo(map);
    function sendHost(obj) {
      var s = JSON.stringify(obj);
      try {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(s);
          return;
        }
      } catch (e) {}
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(s, '*');
      }
    }
    function confirmPin() {
      var p = marker.getLatLng();
      sendHost({ type: 'REVERSE_GEOCODE', lat: p.lat, lon: p.lng });
    }
  </script>
</body>
</html>`;
}
