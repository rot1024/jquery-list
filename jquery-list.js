/*
 * jQuery-list
 * Copyright (c) 2015 rot
 * MIT License
 */
(function($) {
    "use strict";
    
    var namespace = "list";
    
    var defaultOptions = {
        forceHelperStyle: true, // ドラッグ中のアイテムのCSS自動設定
        helper: "dragging", // ドラッグ中のアイテムのクラス
        placeholder: "placeholder", // placeholderのクラス
        placeholderElement: null, // 並び替え時の挿入先に入る空白要素
        forcePlaceholderSize: true, // placeholderのCSS自動設定
        placeholderSpeed: 100, // shift/swapアニメーションの長さ 0=アニメーションなし
        additonSpeed: 100, // 追加アニメーションの長さ 0=アニメーションなし
        removalSpeed: 100, // 削除アニメーションの長さ 0=アニメーションなし
        revert: 100, // 並び替え終了時アニメーションの長さ 0=アニメーションなし
        selectable: true, // 選択可能か
        nonselection: true, // 何も選択しない状態を許可するかアニメーションなし
        selectee: "active", // 選択項目のクラス
        items: ">*", // ドラッグ・選択対象
        multiselectable: true, // 複数選択可能か
        multiselectOnKey: true, // キーボードによる複数選択が可能か
        sortable: true, // 並び替え可能か
        scroll: true, // ドラッグ中に端に達したらスクロールするか
        scrollInStopping: true, // マウスポインタを動かさなくてもスクロールするか
        scrollSensitivity: 40, // scrollの上下の有効範囲（px）
        scrollSpeed: 1, // scrollにおけるスクロール量（px）
        scrollDelay: 10, // スクロール更新間隔 0でrequestAnimationFrame使用
        disabled: false,
        disabledClass: "disabled",
        shiftZIndex: 100,
        unselectOnClick: true,
        // events
        selected: null,
        selecting: null,
        unselected: null,
        unselecting: null,
        change: null,
        start: null,
        stop: null,
        update: null,
        click: null,
        observing: null,
        observe: null
    };
    
    var keyCode = {
        space: 32,
        pageUp: 33,
        pageDown: 34,
        end: 35,
        home: 36,
        up: 38,
        down: 40
    };
    
    // backport
    var requestAnimationFrame = (function(w, r) {
        return w['r' + r] || w['webkitR' + r] || w['mozR' + r] || w['msR' + r] || w['oR' + r] || 
            function(c) { return w.setTimeout(c, 1000 / 60); };
    })(window, 'equestAnimationFrame');
    
    $.fn.list = function(options) {
        if (typeof options === "string") {
            var data = this.data(namespace);
            if (typeof data === "object") {
                if (!(options in data)) {
                  throw "list.js Error: list.js has no method '" + options + "'";
                }
                var result = data[options].apply(data, Array.prototype.slice.call(arguments, 1));
                return result === void 0 ? this : result;
            }
        } else {
            this.each(function() {
                var $this = $(this);
                $this.data(namespace, new $.list($this, options));
            });
        }
        return this;
    };
    
    $.list = function(elem, options) {
        this.init.apply(this, arguments);
    };
    
    $.list.prototype.init = function(elem, options) {
        var self = this;
        this.element = elem;
        this.options = $.extend(true, {}, $.extend(defaultOptions, options));
        this.dragging = null;
        this.isPlaying = false;
        this.removing = [];
        this.shifting = [];
        this.swapping = [];
        
        if (this.id) {
            $(document).off("mousemove." + namespace + this.id + 
                            " mouseup." + namespace + this.id);
        }
        this.id = Math.random().toString(36).slice(2);
        
        elem.on("click." + namespace, function(e) {
            if (self.options.unselectOnClick === true &&
                self.options.nonselection === true) {
              self.unselect();
            }
        }).on("click." + namespace, ">*", function(e) {
            e.stopPropagation();
        });
        elem.on("keyup." + namespace, this.options.items, function(e) {
            switch (e.which) {
                case keyCode.space:
                    $(this).mousedown().mouseup();
                    e.preventDefault();
                    break;
                case keyCode.pageDown:
                case keyCode.end:
                    self.items().last().focus();
                    e.preventDefault();
                    break;
                case keyCode.pageUp:
                case keyCode.home:
                    self.items().first().focus();
                    e.preventDefault();
                    break;
                case keyCode.up:
                    $(this).prev().focus();
                    e.preventDefault();
                    break;
                case keyCode.down:
                    $(this).next().focus();
                    e.preventDefault();
                    break;
            }
        });
        
        elem.on("mousedown." + namespace, this.options.items, function(e) {
            e.currentTarget.focus();
            e.preventDefault();
            var $this = $(this);
            if (self.options.disabled === true ||
                self.removing.indexOf($this.index()) > -1)
                return;
            self.dragging = {
                target: $this, // ドラッグ対象（jQueryオブジェクト）
                index: $this.index(), // ドラッグ開始時のインデックス
                mouseX: e.pageX, // ドラッグ開始時のマウスX座標
                mouseY: e.pageY, // ドラッグ開始時のマウスY座標
                currentX: e.pageX, // 現在のマウスX座標 mousemoveで更新される
                currentY: e.pageY, // 現在のマウスY座標 mousemoveで更新される
                startX: $this.offset().left, // ドラッグ開始時の対象の座標
                startY: $this.offset().top, // ドラッグ開始時の対象の座標
                isDragging: false, // ドラッグしているかどうか クリック判定用
                isScrollingOnEdge: false, // 端でのスクロール中かどうか
                placeholder: null
            };
            $(document)
                .on("mousemove." + namespace + self.id, mousemove)
                .one("mouseup." + namespace + self.id, mouseup);
        });
        
        function scrollUpOnEdge() {
            if (self.dragging === null || self.options.scroll !== true) return;
            self.element.scrollTop(Math.max(0, 
                self.element.scrollTop() - self.options.scrollSpeed));
            if (self.dragging.isScrollingOnEdge !== false) {
                if (self.options.scrollDelay > 0)
                    setTimeout(scrollUpOnEdge, self.options.scrollDelay);
                else
                    requestAnimationFrame(scrollUpOnEdge);
            }
        }
        
        function scrollDownOnEdge() {
            if (self.dragging === null || self.options.scroll !== true) return;
            var scrollTop = self.element.scrollTop();
            self.element.scrollTop(Math.min(self.element.prop("scrollHeight"), 
                scrollTop + self.options.scrollSpeed));
            if (self.dragging.isScrollingOnEdge !== false) {
                if (self.options.scrollDelay > 0)
                    setTimeout(scrollDownOnEdge, self.options.scrollDelay);
                else
                    requestAnimationFrame(scrollDownOnEdge);
            }
        }
        
        function refreshPosition(e) {
            var left = self.dragging.currentX - self.dragging.mouseX + 
                self.dragging.startX;
            var top = self.dragging.currentY - self.dragging.mouseY + 
                self.dragging.startY;
            self.dragging.target.css({
                "left": left,
                "top": top
            });
            
            var index = self.dragging.placeholder.index();
            var children = self.pureItems();
            var child;
            for (var i = 0; i < children.length; i++) {
                child = children.eq(i);
                if (i === children.length - 1 ||
                    child.offset().top + child.height() / 2 >= top)
                    break;
            }
            
            if (i !== index) {
                self.shift(index, i, 0);
                if (typeof self.options.change === "function") {
                    self.options.change.call(self, e, self.dragging.target, index, i);
                }
            }
        }
        
        function mousemove(e) {
            if (self.dragging === null || self.options.disabled === true) {
                self.cancel();
                return;
            }
            if (e.pageX !== self.dragging.mouseX || e.pageY !== self.dragging.mouseY) {
                if (self.dragging.isDragging === true) {
                    self.dragging.currentX = e.pageX;
                    self.dragging.currentY = e.pageY;
                    // scroll
                    if (self.options.scroll === true) {
                        self.dragging.isScrollingOnEdge = false;
                        var left = self.element.offset().left;
                        var top = self.element.offset().top;
                        var w = self.element.outerWidth();
                        var h = self.element.outerHeight();
                        var area = self.options.scrollSensitivity;
                        var x = self.dragging.currentX;
                        var y = self.dragging.currentY;
                        if (x > left && x < left + w) {
                            if (y >= top && y < top + area) {
                                if (self.options.scrollInStopping === true)
                                    self.dragging.isScrollingOnEdge = true;
                                scrollUpOnEdge();
                            } else if (y > top + h - area && y <= top + h) {
                                if (self.options.scrollInStopping === true)
                                    self.dragging.isScrollingOnEdge = true;
                                scrollDownOnEdge();
                            }
                        }
                    }
                    refreshPosition(e);
                } else if (self.options.sortable === true) {
                    // start dragging
                    if (self.dragging.placeholder === null) {
                        if (self.options.placeholderElement === null) {
                            self.dragging.placeholder = $("<" + self.dragging.target[0].nodeName + ">");
                            if (typeof self.options.placeholder === "string" &&
                                self.options.placeholder.length > 0) {
                                self.dragging.placeholder.addClass(self.options.placeholder);
                            }
                        } else {
                            self.dragging.placeholder = self.options.placeholderElement;
                        }
                    }
                    
                    if (self.options.forcePlaceholderSize === true) {
                        self.dragging.placeholder.css("height", self.dragging.target.height() + "px");
                    }

                    if (typeof self.options.helper === "string" && self.options.helper.length > 0) {
                        self.dragging.target.addClass(self.options.helper);
                    }

                    self.dragging.isDragging = true;
                    self.dragging.currentX = e.pageX;
                    self.dragging.currentY = e.pageY;

                    if (self.options.forceHelperStyle === true) {
                        self.dragging.target.css({
                            position: "absolute",
                            width: self.dragging.target.width()
                        });
                    }
                    
                    self.dragging.placeholder.insertAfter(self.dragging.target);
                    self.dragging.target.appendTo($("body"));
                    
                    refreshPosition(e);
                    
                    if (typeof self.options.start === "function") {
                        self.options.start.call(self, e, self, self.dragging.target);
                    }
                }
            }
        }
        
        function mouseup(e) {
            $(document).off("mousemove." + namespace + self.id + " mouseup." + namespace + self.id);
            if (self.dragging === null) return;
            if (self.options.disabled !== true) {
                if (self.dragging.isDragging === true)
                    self.cancel();
                else if (self.options.disabled !== true && self.dragging.isDragging !== true)
                    click(e);
            }
            self.dragging = null;
        }
        
        function click(e) {
            if (self.options.selectable === true) {
                var selectedItems = self.selectedItems();
                var hasClass = self.dragging.target.hasClass(self.options.selectee);
                if (self.options.multiselectable === true ||
                    self.options.multiselectOnKey === true && e.ctrlKey) {
                    if (hasClass === true) {
                        if (selectedItems.length > 1 || self.options.nonselection === true) {
                            var unselecting;
                            if (typeof self.options.unselecting === "function") {
                                unselecting = self.options.unselecting.call(self, e, self.dragging.target);
                            }
                            if (unselecting !== false) {
                                self.dragging.target.removeClass(self.options.selectee);
                                if (typeof self.options.unselected === "function") {
                                    self.options.unselected.call(self, e, self.dragging.target);
                                }
                            }
                        }
                    } else {
                        var selecting;
                        if (typeof self.options.selecting === "function") {
                            selecting = self.options.selecting.call(self, e, self.dragging.target);
                        }
                        if (selecting !== false) {
                            self.dragging.target.addClass(self.options.selectee);
                            if (typeof self.options.selected === "function") {
                                self.options.selected.call(self, e, self.dragging.target);
                            }
                        }
                    }
                } else {
                    if (hasClass === true &&
                        (self.options.nonselection !== true && selectedItems.length === 1 ||
                         self.options.nonselection === true && selectedItems.length > 1 ||
                         self.options.multiselectable !== true && selectedItems.length > 1)) {
                        selectedItems = selectedItems.filter(function() {
                            return !$(this).is(self.dragging.target);
                        });
                    }
                    if (selectedItems.length > 0) {
                        selectedItems.removeClass(self.options.selectee);
                        var unselecting2;
                        if (typeof self.options.unselecting === "function") {
                            unselecting2 = self.options.unselecting.call(self, e, self.dragging.target);
                        }
                        if (unselecting2 !== false &&
                            typeof self.options.unselected === "function") {
                            selectedItems.each(function() {
                                self.options.unselected.call(self, e, $(this));
                            });
                        }
                    }
                    if (hasClass !== true) {
                        var selecting2;
                        if (typeof self.options.selecting === "function") {
                            selecting2 = self.options.selecting.call(self, e, self.dragging.target);
                        }
                        if (selecting2 !== false) {
                            self.dragging.target.addClass(self.options.selectee);
                            if (typeof self.options.selected === "function") {
                                self.options.selected.call(self, e, self.dragging.target);
                            }
                        }
                    }
                }
            }
            if (typeof self.options.click === "function") {
                self.options.click.call(self, e, self, self.dragging.target);
            }
        }
    };
    
    $.list.prototype.destroy = function() {
        this.cancel();
        this.element.off("mousedown." + namespace + " keyup." + namespace);
        $(document).off("mousemove." + namespace + this.id + 
                        " mouseup." + namespace + this.id);
        this.element.removeData(namespace);
        this.dragging = null;
    };
    
    $.list.prototype.enable = function() {
        this.options.disabled = false;
        if (typeof this.options.disabledClass === "string")
            this.element.removeClass(this.options.disabledClass);
    };
    
    $.list.prototype.disable = function() {
        this.cancel();
        this.options.disabled = true;
        if (typeof this.options.disabledClass === "string")
            this.element.addClass(this.options.disabledClass);
    };
    
    $.list.prototype.option = function(key, value) {
        if (arguments.length === 0) return this.options;
        else if (value === void 0) return this.options[key];
        else this.options[key] = value;
    };
    
    $.list.prototype.instance = function() {
        return this;
    };
    
    $.list.prototype.widget = function() {
        return this.element;
    };
    
    $.list.prototype.serialize = function(option) {
        var str = [];
		option = option || {};
		this.items().each(function() {
			var result = ($(this).attr(option.attribute || "id") || "").match(
                option.expression || (/(.+)[\-=_](.+)/));
			if (result) {
				str.push((option.key || result[1] + "[]") + "=" + 
                         (option.key && option.expression ? result[1] : result[2]));
			}
		});
		if(!str.length && option.key) {
			str.push(option.key + "=");
		}
		return str.join("&");
    };
    
    $.list.prototype.toArray = function() {
        var ids = [];
        this.items().each(function() {
            ids.push(this.id);
        });
        return ids;
    };
    
    $.list.prototype.cancel = function(e) {
        var self = this;
        function finish(target, placeholder, e, oldIndex, newIndex) {
            target.insertBefore(placeholder);
            var nt = placeholder.next();
            placeholder.remove();
            if (self.options.forceHelperStyle === true) {
                target.css({
                    position: "",
                    top: "",
                    width: ""
                });
            }
            if (typeof self.options.helper === "string" && 
                self.options.helper.length > 0) {
                target.removeClass(self.options.helper);
            }
            self.isPlaying = false;
            if (typeof self.options.update === "function" && newIndex >= 0) {
                self.options.update.call(self, e, target, oldIndex, newIndex);
            }
            if (typeof self.options.stop === "function" && newIndex >= 0) {
                self.options.stop.call(self, e, target);
            }
        }
        
        $(document).off("mousemove." + namespace + this.id + 
                        " mouseup." + namespace + this.id);
        if (this.dragging === null) return;
        if (this.dragging.isDragging === true) {
            var newIndex = -1;
            if (this.dragging.index !== this.dragging.placeholder.index())
                newIndex = this.dragging.placeholder.index();
            
            var target = this.dragging.target;
            var placeholder = this.dragging.placeholder;
            var oldIndex = this.dragging.index;
            
            if (this.options.revert > 0) {
                target.animate({
                    top: placeholder.offset().top,
                    left: placeholder.offset().left
                }, this.options.revert, "swing", function() {
                    finish(target, placeholder, e, oldIndex, newIndex);
                });
                this.isPlaying = true;
            } else {
                finish(target, placeholder, e, oldIndex, newIndex);
            }
        }
        this.dragging = null;
    };
    
    $.list.prototype.select = function(index, single) {
        if (single === true || single === void 0 &&
            this.options.multiselectable !== true)
            this.unselect(index, true);
        var self = this;
        var target;
        if (typeof index === "number")
            target = this.items().eq(index);
        else if (index instanceof Array)
            target = this.items().filter(function(i) {
                return index.indexOf(i) >= 0;
            });
        else target = this.items();
        if (typeof this.options.selecting === "function") {
            target = target.filter(function() {
                return self.options.selecting.call(self, null, $(this)) !== false;
            });
        }
        if (target.length > 0) {
            target.addClass(this.options.selectee);
            if (typeof this.options.selected === "function") {
                target.each(function() {
                    self.options.selected.call(self, null, $(this));
                });
            }
        }
    };
    
    $.list.prototype.unselect = function(index, except) {
        var self = this;
        var target;
        if (except === true)
            target = this.selectedItems().filter(
                index instanceof Array ? function() {
                    return index.indexOf($(this).index()) < 0;
                } : function() {
                    return $(this).index() !== index;
                });
        else if (index instanceof Array)
            target = this.selectedItems().filter(function(i) {
                return index.indexOf(i) >= 0;
            });
        else if (typeof index === "number") {
            target = this.items().eq(index).filter(function() {
                return self.isSelected(self.index($(this).index()));
            });
        }
        else target = this.selectedItems();
        
        if (typeof this.options.unselecting === "function") {
            target = target.filter(function() {
                return self.options.unselecting.call(self, null, $(this)) !== false;
            });
        }
        if (target.length > 0) {
            target.removeClass(this.options.selectee);
            if (typeof this.options.unselected === "function") {
                target.each(function() {
                    self.options.unselected.call(self, null, $(this));
                });
            }
        }
    };
    
    $.list.prototype.toggle = function(index) {
        var target;
        if (index instanceof Array)
            target = this.items().filter(function(i) {
                return index.indexOf(i) >= 0;
            });
        else if (typeof index === "number")
            target = this.items().eq(index);
        else target = this.items();
        target.toggleClass(this.options.selectee);
    };
    
    $.list.prototype.click = function(index) {
        this.items().eq(index).mousedown().mouseup();
    };
    
    $.list.prototype.items = function() {
        var self = this, from, to, buf;
        var items = this.dragging === null ?
            this.pureItems() : this.pureItems().map(function() {
            if ($(this).is(self.dragging.placeholder)) {
               return self.dragging.target.get(0); 
            }
            return this;
        });
        for (var i = 0; i < this.shifting.length; i++) {
            from = this.shifting[i].from;
            to = this.shifting[i].to;
            items.splice(to + 1, 0, items[from]);
            items.splice(from > to ? from + 1 : from, 1);
        }
        for (i = 0; i < this.swapping.length; i++) {
            from = this.swapping[i].from;
            to = this.swapping[i].to;
            buf = items[from];
            items[from] = items[to];
            items[to] = buf;
        }
        return items;
    };
    
    $.list.prototype.pureItems = function() {
        var self = this;
        return this.element.find(this.options.items).filter(function(i) {
            return self.removing.indexOf(i) === -1;
        });
    };
  
    $.list.prototype.index = function(index) {
        var items = this.items();
        for (var i = 0; i < items.length; i++) {
            if (index === items.eq(i).index())
                return i;
        }
        return -1;
    };
    
    $.list.prototype.selectedItems = function() {
        var self = this;
        return this.items().filter(function() {
            return $(this).hasClass(self.options.selectee);
        });
    };
    
    $.list.prototype.isSelected = function(index) {
        return this.items().eq(index).hasClass(this.options.selectee);
    };
    
    $.list.prototype.add = function(elem, index, animation) {
        if (typeof elem === "string") {
            var tagname;
            if (this.element[0].nodeName === "UL" || 
                this.element[0].nodeName === "OL")
                tagname = "li";
            else
                tagname = this.item()[0].nodeName;
            elem = $("<" + tagname + ">", {text: elem});
        } else {
            elem = $(elem);
        }
        elem.hide();
        
        var items = this.items();
        if (index >= 0 && index < items.length) {
            items.eq(index).before(elem);
        } else {
            this.element.append(elem);
        }
        
        if (animation === void 0) animation = -1;
        if (animation > 0 || animation < 0 && this.options.additonSpeed > 0) {
            elem.slideDown(animation < 0 ? this.options.additonSpeed : animation);
        } else {
            elem.show();
        }
    };
    
    $.list.prototype.remove = function(index, animation) {
        var self = this;
        var items = self.items();
        var target;
        if (index instanceof Array) {
            target = items.filter(function(i) {
                return index.indexOf(i) >= 0;
            });
        } else if (typeof index === "number") {
            target = items.eq(index);
        } else {
            target = this.selectedItems().filter(function() {
                return self.removing.indexOf($(this).index()) === -1;
            });
        }
        if (target.length === 0) return;
        
        var drg = false;
        target.each(function() {
            if (self.dragging !== null && self.dragging.target.is(this)) {
                drg = true;
            }
            var index = self.index($(this).index());
            if (self.isSelected(index) === true)
                self.unselect(index);
        });
        
        if (drg) this.cancel();
        
        if (animation === 0 && this.options.removalSpeed <= 0) {
            target.remove();
        } else {
            if (animation === void 0)
                animation = this.options.removalSpeed;
            var rem = target.map(function() {
                return $(this).index();
            }).get();
            this.removing = $.unique(this.removing.concat(rem));
            target.each(function() {
                var $this = $(this);
                var i = $this.index();
                $this.slideUp(animation, (function(i) {
                    return function() {
                        var f = self.removing.indexOf(i);
                        if (f > -1)
                            self.removing.splice(f, 1);
                        $this.remove();
                    };
                })(i));
            });
        }
    };
    
    $.list.prototype.empty = function(animation) {
        this.unselect();
        var target = this.items();
        if (animation === 0 && this.options.removalSpeed <= 0) {
            target.remove();
        } else {
            if (animation === void 0)
                animation = this.options.removalSpeed;
            target.slideUp(animation, function() {
                target.remove();
            });
        }
    };
    
    $.list.prototype.shiftUp = function(animation) {
        var items = this.selectedItems();
        if (this.isPlaying === true || items.length <= 0 ||
            this.index(items.first().index()) === 0)
            return;
        
        var self = this;
        var i1 = -1, i2, chunks = [];
        items.each(function() {
            i2 = self.index($(this).index());
            if (i1 === -1) {
                chunks.push({down: i2 - 1, up: -1});
            }
            if (i1 > -1 && i2 - i1 > 1) {
                chunks[chunks.length - 1].up = i1;
                chunks.push({down: i2 - 1, up: -1});
            }
            if (i2 === self.index(items.last().index())) {
                chunks[chunks.length - 1].up = i2;
            }
            i1 = i2;
        });
        
        $.each(chunks, function() {
            self.shift(this.down, this.up, animation, true);
        });
    };
    
    $.list.prototype.shiftDown = function(animation) {
        var items = this.selectedItems();
        if (this.isPlaying === true || items.length <= 0 ||
            this.index(items.last().index()) >= this.items().length - 1)
            return;
        
        var self = this;
        var i1 = -1, i2, chunks = [];
        items.each(function() {
            i2 = self.index($(this).index());
            if (i1 === -1) {
                chunks.push({down: i2, up: -1});
            }
            if (i1 > -1 && i2 - i1 > 1) {
                chunks[chunks.length - 1].up = i1 + 1;
                chunks.push({down: i2, up: -1});
            }
            if (i2 === self.index(items.last().index())) {
                chunks[chunks.length - 1].up = i2 + 1;
            }
            i1 = i2;
        });
        
        $.each(chunks, function() {
            self.shift(this.up, this.down, animation, true);
        });
    };
    
    $.list.prototype.shift = function(from, to, animation, order) {
        var items = this.pureItems();
        if (from === to || from < 0 || to < 0 ||
            from >= items.length || to >= items.length)
            return;
        var f = items.eq(from);
        var t = items.eq(to);
        var self = this;
        
        if (typeof self.options.observing === "function") {
            self.options.observing.call(self, from, to, f, t, "shift");
        }
        if (animation !== 0 && this.options.placeholderSpeed > 0) {
            if (animation === void 0 || animation < 0) {
                animation = this.options.placeholderSpeed;
            }
            var chunk = this.items().slice(
                from < to ? from + 1 : to, from < to ? to + 1: from);
            var height = 0;
            chunk.each(function() {
                height += $(this).outerHeight();
            });
            
            var data = {
                from: from,
                to: to
            };
            this.shifting.push(data);
            
            if (order === true)
                chunk.css("z-index", this.options.shiftZIndex);
            chunk.css({
                position: "relative",
                left: 0
            }).animate({
                top: f.outerHeight() * (from < to ? -1 : 1)
            }, animation);
            
            f.css({
                position: "relative",
                left: 0
            }).animate({
                top: height * (from < to ? 1 : -1)
            }, animation, "swing", function() {
                if (order === true) chunk.css("z-index", "");
                else f.css("z-index", "");
                chunk.css({position: "", left: "", top: ""});
                f.css({position: "", left: "", top: ""});
                t[from < to ? "after" : "before"](f);
                
                var i = self.shifting.indexOf(data);
                if (i >= 0) self.shifting.splice(i, 1);
                self.isPlaying = false;
                
                if (typeof self.options.observe === "function") {
                    self.options.observe.call(self, from, to, f, t, "shift");
                }
            });
            
            this.isPlaying = true;
        } else {
            t[from < to ? "after" : "before"](f);
            if (typeof self.options.observe === "function") {
                self.options.observe.call(self, from, to, f, t, "shift");
            }
        }
    };
    
    $.list.prototype.swap = function(index1, index2, animation) {
        if (this.isPlaying === true) return;
        var self = this;
        var elem = this.element;
        var items = this.pureItems();
        if (index1 > index2) {
            var i = index2;
            index2 = index1;
            index1 = i;
        }
        var item1 = items.eq(index1);
        var item2 = items.eq(index2);
        
        var swap = function() {
            item1.insertAfter(item2);
            if (item2.index() !== index1)
                item2.insertBefore(item1);
            if (typeof self.options.observe === "function") {
                self.options.observe.call(self, index1, index2, item1, item2, "swap");
            }
        };
        
        if (typeof self.options.observing === "function") {
            self.options.observing.call(self, index1, index2, item1, item2, "swap");
        }
        if (animation !== 0 && this.options.placeholderSpeed > 0) {
            if (animation === void 0 || animation < 0) {
                animation = this.options.placeholderSpeed;
            }
            
            var data = {
                from: index1,
                to: index2
            };
            this.swapping.push(data);
            
            item1.css({
                position: "relative",
                left: 0
            }).animate({
                top: item2.offset().top - item1.offset().top
            }, animation, "swing");
            item2.css({
                position: "relative",
                left: 0
            }).animate({
                top: item1.offset().top - item2.offset().top
            }, animation, "swing", function() {
                item1.css({position: "", top: "", left: ""});
                item2.css({position: "", top: "", left: ""});
                swap();
                var i = self.swapping.indexOf(data);
                if (i >= 0) self.swapping.splice(i, 1);
                self.isPlaying = false;
            });
            this.isPlaying = true;
        } else {
            swap();
        }
    };
})(jQuery);