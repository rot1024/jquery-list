jQuery-list
===========

jQuery 1.x/2.x sortable and multiselectable list plugin

## Demo

[Live demo](http://rot1024.github.io/jquery-list/)

## Usage

```javascript
$("#list").list({
    // options
    revert: 300,
    // events
    selected: function(e, target) {
        alert(target.text() + " is selected. ");
    },
    unselected: function(e, target) {
        alert(target.text() + " is unselected. ");
    },
    update: function(e, target, oldIndex, newIndex) {
        alert(target.text() + " is sorted. " + oldIndex + " => " + newIndex);
    }
});
```

## Options

```javascript
// getter
var value = $("#list").list("option", "key");
// setter
$("#list").list("option", "key", value);
```
### additonSpeed: 100
追加アニメーションの長さ 0=アニメーションなし

### disabled: false
選択もソートもできなくなる

### disabledClass: "disabled"
disabled時のクラス。null or "" でクラスを付加しない

### forceHelperStyle: true
ドラッグ中のアイテムのCSS自動設定

### forcePlaceholderSize: true
placeholderのCSS自動設定

### helper: "dragging"
ドラッグ中のアイテムのクラス

### items: ">*"
ドラッグ・選択対象

### multiselectable: true
複数選択可能か

### multiselectOnKey: true
キーボードによる複数選択が可能か

### nonselection: true
何も選択しない状態を許可するかアニメーションなし

### placeholder: "placeholder"
placeholderのクラス

### placeholderElement: null
並び替え時の挿入先に入る空白の要素

### placeholderSpeed: 300
shift/swapアニメーションの長さ 0=アニメーションなし

### removalSpeed: 100
削除アニメーションの長さ 0=アニメーションなし

### revert: 0
並び替え終了時アニメーションの長さ 0=アニメーションなし

### scroll: true
ドラッグ中に端に達したらスクロールするか

### scrollDelay: 10
スクロール更新間隔 0でrequestAnimationFrame使用

### scrollInStopping: true
マウスポインタを動かさなくてもスクロールするか

### scrollSensitivity: 40
scrollの上下の有効範囲（px）

### scrollSpeed: 1
scrollにおけるスクロール量（px）

### selectable: true
選択可能か

### selectee: "active"
選択項目のクラス

### shiftZIndex: 100
shift時のz-index

### sortable: true
並び替え可能か

## Events

### selected

項目が選択された時に呼ばれる

### selecting

項目が選択される前に呼ばれる。falseを返すと選択がキャンセルされる

### unselected

項目の選択が解除された時に呼ばれる

### unselecting

項目の選択が解除される前に呼ばれる。falseを返すと選択解除がキャンセルされる

### change

ドラッグ中にplaceholderが動いた時に呼ばれる

### start

ドラッグを開始したときに呼ばれる

### stop

ドラッグを終了したときに呼ばれる。ソートされた場合updateの後に呼ばれる

### update

ドラッグを終了したときにソートされている場合に呼ばれる

### click

項目をクリックしたときに呼ばれる

## Methods

```javascript
// how to call
$("#list").list("method name", arguments);
```

### init

### destroy

### enable

### disable

### option

### instance

### widget

### serialize

### toArray

### cancel

### select

### unselect

### toggle

### items

### add

### remove

### shiftUp

### shiftDown

### shift

### swap

## TODO

* 複数選択時のドラッグ
* placeholder入れ替えアニメーション
* キーボードで複数選択

## Licence

[MIT](LICENSE)

## Author

[rot1024](https://github.com/rot1024)
