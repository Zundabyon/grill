# Weimar Jazz Database — Grillで使用するコード進行

出典: The Jazzomat Research Project, Weimar Jazz Database (WJazzD)

- 公式サイト: https://jazzomat.hfm-weimar.de/
- 配布元: https://jazzomat.hfm-weimar.de/download/downloads/wjazzd.db
- 入手日: 2026-11-08
- 配布ファイル内の版: release 2.1 / schema 2.2 / 2018-01-07
- データベース: Open Database License 1.0 (ODbL)
  https://opendatacommons.org/licenses/odbl/1-0/
- 個々の収録内容: Database Contents License 1.0 (DbCL)
  https://opendatacommons.org/licenses/dbcl/1-0/

Contains information from the Weimar Jazz Database, which is made available
under the Open Database License (ODbL). Individual database contents are
licensed under the Database Contents License (DbCL).

## 加工内容と再現

`weimar.json` はODbL 1.0で提供する派生データベースです。
`solo_info`テーブルから資料ID・曲名・演奏者・キー・拍子・コード進行を抽出し、
JSONに変換しました。コード進行文字列は原文を保持しています。
`supported`はGrill初版のコード解析と4/4拍子に適合するかを示す独自追加項目です。
ソロの採譜音列・メロディー・歌詞・音源は抽出していません。

公式DBを取得した後、以下で再現できます。

```sh
python3 scripts/extract_weimar.py /path/to/wjazzd.db
node scripts/validate-data.mjs
```

元DBのSHA-256、版情報、原文ライセンス通知はJSONに記録しています。
曲名は重複します。同一曲でも演奏者・資料が違うと進行が異なることがあります。
Autumn Leaves / Les Feuilles Mortesは今回取得した版には見つかりませんでした。

参考文献: Pfleiderer, M., Frieler, K., Abeßer, J., Zaddach, W.-G., & Burkhart, B. (eds.).
Inside the Jazzomat – New Perspectives for Jazz Research. Schott Campus, 2017.

このデータ利用許諾とアプリ本体のライセンスは別です。
