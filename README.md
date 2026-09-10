# multipleX

XのホームタイムラインをCSS Gridで4列に並べるChrome拡張です。
左から右、上から下の順に投稿が並び、ページのスクロールで4列が一緒に動きます。
ホームの右サイドバーは非表示になります。投稿ボタンや配色はXのものを使います。

## 読み込み

1. Chromeの `chrome://extensions`（Braveでは `brave://extensions`）を開く。
2. 「デベロッパーモード」を有効にする。
3. 「パッケージ化されていない拡張機能を読み込む」でこのフォルダを選ぶ。
4. Xのホームを再読み込みする。

ビルド・APIキー・外部ライブラリは不要です。
ホーム以外からの画面遷移にも対応するため、スクリプトの対象は `https://x.com/*`、表示変更は `/home` のみです。
拡張の構成は[Chrome公式のcontent_scripts仕様](https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts)に従っています。

## テスト

```sh
node content.test.cjs
python3 -m http.server 8765 --bind 127.0.0.1
```

`http://127.0.0.1:8765/test.html` をブラウザで開くと、4列配置、重なり、横幅、共通スクロール、追加投稿、ホーム限定のレイアウト検証を実行します。

これはDOMを模したテストです。実際のXでの長時間スクロール・仮想スクロールによる投稿の入れ替え・追加取得は、拡張を読み込んだ実画面で別途確認が必要です。
