# 追加スタンダード3曲 — Jazz Harmony Treebank

Fly Me To The Moon / Autumn Leaves / Blue Bossa

出典: Jazz Harmony Treebank (JHT), Digital and Cognitive Musicology Lab
https://github.com/DCMLab/JazzHarmonyTreebank

著者: D. Harasim, C. Finkensiep, P. Ericson, T. J. O'Donnell, M. Rohrmeier

Harasim et al. (2020). The Jazz Harmony Treebank. ISMIR 2020, pp. 207–215.
https://doi.org/10.5281/zenodo.4245406

取得版: 26ec6170939054f08ba1b63db44712636d0d1db3 / 2026-11-08

## 利用条件

**CC BY-NC-SA 4.0（表示・非営利・継承）**
https://creativecommons.org/licenses/by-nc-sa/4.0/

配布元のLICENSE.mdをJHT-LICENSE.mdとして同梱しています。
論文本文のライセンスとは区別し、リポジトリのデータ利用条件に従っています。
この追加データは非商用の個人練習用です。商用サービスへの同梱はこの許諾に含まれません。
データを共有・加工して提供するときは、出典・変更内容・同ライセンスを保持してください。
元データは無保証で提供され、許諾者が許諾できる権利の範囲に適用されます。

## 加工内容

`jht-standards.json` は同ライセンスで提供する派生データです。
指定3曲のコード記号・小節・拍・キー・作曲者を抽出しました。
元の小節・拍の配置を維持し、各小節を4拍に展開しました。
半減七の `%7` 表記を `m7b5` に正規化しました。
検索用の別表記と識別子を追加し、原文の配列を`original`に残しました。
メロディー・歌詞・音源・分析ツリーは収録していません。
特定の録音の採譜ではなく、JHT収録版のコード進行です。

ワイマールのODbLデータとは別ファイル・別ライセンスで管理しています。
アプリ本体やベース音源のライセンスとも別です。

## 再現

上記コミットのtreebank.jsonを取得し、以下を実行します。

```sh
python3 scripts/extract_jht.py /path/to/treebank.json
```
