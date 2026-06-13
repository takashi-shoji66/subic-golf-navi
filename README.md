# ⛳ スービック ゴルフナビ (PWA)

スービックインターナショナルゴルフクラブの18ホール攻略ナビ。
OpenStreetMap / Esri航空写真 + Leaflet.js で作った、オフライン対応・GPS対応のWebアプリ（PWA）です。

## 機能

- 🗺 航空写真 / 地図の切り替え表示
- 📍 GPS現在地表示 + 選択ホールのグリーンまでの残り距離をリアルタイム計算
- ⬇ コース範囲の地図タイルを端末に保存してオフライン利用
- 📱 ホーム画面に追加してアプリのように起動（PWA）
- ⛳ 18ホールの攻略情報（スコアカード実データ + 攻略ポイント）

## ファイル構成

```
index.html         アプリ本体（UI）
app.js             地図・GPS・キャッシュ制御ロジック
holes.js           18ホールのデータ（座標・ヤード・攻略文）
service-worker.js  オフラインキャッシュ制御
manifest.json      PWA設定
icon-192.png       アイコン
icon-512.png       アイコン
```

## GitHub Pages での公開手順

1. GitHubで新しいリポジトリを作成（例: `subic-golf-navi`）
2. このフォルダの全ファイルをリポジトリにpush
   ```bash
   git init
   git add .
   git commit -m "initial commit"
   git branch -M main
   git remote add origin https://github.com/<ユーザー名>/subic-golf-navi.git
   git push -u origin main
   ```
3. リポジトリの Settings → Pages を開く
4. 「Source」で `main` ブランチ / `/ (root)` を選択して Save
5. 数分後、`https://<ユーザー名>.github.io/subic-golf-navi/` で公開されます

※ GitHub Pages はHTTPSが自動で付くため、Service Worker（オフライン）もGPSもそのまま動作します。

## 使い方（スマホ）

1. 上記URLをスマホのブラウザ（Safari / Chrome）で開く
2. ホーム画面に追加（iPhoneは共有ボタン→「ホーム画面に追加」）
3. オンラインのうちに「⬇ オフライン保存」をタップしてコース範囲を保存
4. 現地では「📍 現在地」でGPSナビとして利用（電波が無くてもOK）

## ⚠ 重要：ホール座標について

`holes.js` の `lat` / `lng` は、コース中心点と航空写真レイアウトからの **概算配置** です。
実コースの正確なGPS座標ではありません。

正確にするには、現地で各ホール（ティー or グリーン）のGPS座標を取得し、
`holes.js` の数値を差し替えてください。スマホの地図アプリで長押しすると緯度経度が表示されます。

## ⚠ タイル利用規約について

現在はEsri World Imagery / OpenStreetMapの公開タイルを使用しています。
公開アプリとして大量のタイルをキャッシュ・再配布する場合、各サービスの利用規約をご確認ください。
商用・本格運用では MapTiler（無料枠あり・要APIキー）等への切り替えを推奨します。

切り替えは `app.js` のタイルURL（`satLayer` / `streetLayer`）と
`service-worker.js`・`app.js` の `buildTileUrls()` を変更するだけです。

## 発展案

- Firestoreと連携したスコア記録・履歴保存（既存のFirebase経験を活用）
- 各ホールのSVGコース図表示
- ピンの正確な座標化（現地実測）
