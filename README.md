# CLES Word World v1.4.1

Updated: 2026-07-19

## Bug fixes
- 設定画面が開かない不具合を修正
- 初回の学習者／管理者選択を実装
- 設定からモードと表示名を変更可能
- 「今日はこんな日」が読み込み中のままになる不具合を修正
- today.json未登録日には既定文を表示
- 既定ヘッダー画像をトップに表示
- 会話上の個人的呼称を製品UIから削除
- 学習者ログと管理・確認ログの分離を維持

## Deploy
ZIP内の全ファイル・フォルダをリポジトリ直下へ上書きしてください。
Safariで古い表示が残る場合は、ページを再読み込みしてください。

## v1.4.2 — 2026-07-19

- `today.json` を他データと独立して読み込み
- 日本時間で「今日はこんな日」を判定
- 読み込み失敗時も必ず既定メッセージを表示
- JSON読込失敗がトップ・設定・ログへ連鎖しない構造に変更
- 設定画面にログ件数を表示
- 学習データのバックアップ／復元を追加
- 学習ログと管理・確認ログを個別に消去可能
- 設定変更後も保存済みログを維持

## v1.5.0 — Archive First / 2026-07-20

- 通常設定から削除操作を除外
- バックアップ、復元、アーカイブ、ログ統計を前面表示
- アーカイブJSONに期間名と集計情報を保存
- 管理・確認ログは学習レビューから除外
- 削除操作は詳細設定へ移動
- 学習ログ初期化は確認ダイアログとDELETE入力を必須化
- 保存スキーマ `cles.userdata.v1` を維持

## v1.5.2 relation-hint update
- The first view no longer highlights or exposes the target chunk in the question meta.
- Hint 1 masks the chunk and separates the left/right context so the learner can reason about the relation first.
- Hint 2 reveals/highlights the keyword only after the relation step.
- Learning logs now preserve `hint_level` and `hint_events` for later analysis.
- Existing `cles.userdata.v1` storage and schema remain unchanged so v1.5.0 learning logs continue to load.


## v1.5.2
- Review Room に「次の10問へ →」を追加
- レビューで示した弱点傾向を weakTypes() で反映し、そのまま次の10問へ進める導線を追加
- 「今日はここまで」も残し、学習継続を強制しない
