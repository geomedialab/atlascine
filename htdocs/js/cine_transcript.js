(function ($, $n2) {
    "use strict";

    var showService;

    var _loc = function (str, args) {
        return $n2.loc(str, 'nunaliit2', args);
    };

    var $mdc = window.mdc;

    if (!$mdc) {
        return;
    }

    $n2.Class({
        initialize: function (opts_) {
            var opts = $n2.extend({
                showService: null,
                siteDesign: null
            }, opts_);

            showService = opts.showService;
        }
    });

    var MDC = $n2.Class('MDC', {
        parentElem: null,
        mdcId: null,
        mdcClasses: null,
        mdcAttributes: null,

        initialize: function (opts_) {
            var opts = $n2.extend({
                parentElem: null,
                mdcId: null,
                mdcClasses: [],
                mdcAttributes: null
            }, opts_);

            this.parentElem = opts.parentElem;
            this.mdcId = opts.mdcId;
            this.mdcClasses = opts.mdcClasses;
            this.mdcAttributes = opts.mdcAttributes;

            if (!this.mdcId) {
                this.mdcId = $n2.getUniqueId();
            }
        },

        getId: function () {
            return this.mdcId;
        },

        getElem: function () {
            return $('#' + this.mdcId);
        }
    });

    var MDCSelect = $n2.Class('MDCSelect', MDC, {
        menuChgFunction: null,
        menuLabel: null,
        menuOpts: null,
        preSelected: null,
        nativeClasses: null,
        select: null,
        selectId: null,

        initialize: function (opts_) {
            var opts = $n2.extend({
                menuChgFunction: null,
                menuLabel: null,
                menuOpts: [],
                preSelected: false,
                nativeClasses: null
            }, opts_);

            MDC.prototype.initialize.call(this, opts);

            this.menuChgFunction = opts.menuChgFunction;
            this.menuLabel = opts.menuLabel;
            this.menuOpts = opts.menuOpts;
            this.preSelected = opts.preSelected;
            this.selectId = $n2.getUniqueId();
            this.nativeClasses = opts.nativeClasses;

            if (!this.parentElem) {
                throw new Error('parentElem must be provided, to add a Material Design Select Component');
            }

            this._generateMDCSelectMenu();
        },

        _generateMDCSelectMenu: function () {
            var $menu, $menuNotchedOutline, $menuNotchedOutlineNotch, $menuAnchor;
            var $label, keys, selector;
            var classesOnSelectMenu = '';
            var _this = this;

            this.mdcClasses.push('mdc-select', 'mdc-select--outlined', 'n2s_attachMDCSelect');

            $menu = $('<div>')
                .attr('id', this.mdcId)
                .addClass(this.mdcClasses.join(' '));

            if (this.mdcAttributes) {
                keys = Object.keys(this.mdcAttributes);
                keys.forEach(function (key) {
                    $menu.attr(key, _this.mdcAttributes[key]);
                });
            }

            $menuAnchor = $('<div>')
                .addClass('mdc-select__anchor')
                .appendTo($menu);

            $('<i>').addClass('mdc-select__dropdown-icon')
                .appendTo($menuAnchor);

            $('<div>').addClass('mdc-select__selected-text')
                .appendTo($menuAnchor);

            $menuNotchedOutline = $('<div>')
                .addClass('mdc-notched-outline')
                .appendTo($menuAnchor);

            $('<div>').addClass('mdc-notched-outline__leading')
                .appendTo($menuNotchedOutline);

            $menuNotchedOutlineNotch = $('<div>')
                .addClass('mdc-notched-outline__notch')
                .appendTo($menuNotchedOutline);

            $label = $('<label>')
                .attr('for', this.selectId)
                .addClass('mdc-floating-label')
                .text(_loc(this.menuLabel))
                .appendTo($menuNotchedOutlineNotch);

            $('<div>').addClass('mdc-notched-outline__trailing')
                .appendTo($menuNotchedOutline);

            if (this.nativeClasses) {
                classesOnSelectMenu = this.nativeClasses.join(' ');
            }

            this.select = $('<div>')
                .attr('id', this.selectId)
                .addClass('mdc-select__menu mdc-menu mdc-menu-surface')
                .addClass(classesOnSelectMenu)
                .appendTo($menu);

            if (this.menuOpts && $n2.isArray(this.menuOpts) && this.menuOpts.length > 0) {
                new $n2.mdc.MDCList({
                    parentElem: this.select,
                    listItems: this.menuOpts
                });
            }

            $menu.appendTo(this.parentElem);

            selector = document.getElementById(this.getId());
            if (selector) {
                selector.addEventListener("MDCSelect:change", this.menuChgFunction);
            }

            if (this.preSelected) {
                $label.addClass('mdc-floating-label--float-above');
            }

            if (showService) {
                showService.fixElementAndChildren($('#' + this.mdcId));
            }
        },

        getSelectId: function () {
            return this.selectId;
        },

        getSelectedValue: function () {
            var _this = this;
            var $elem = this.getElem();
            if ($elem.get(0)) {
                var vanilla = new mdc.select.MDCSelect(document.querySelector('#' + _this.mdcId));
                return vanilla.value;
            }
            return null;
        }
    });

    var CineTranscript = $n2.Class('ThemeTranscript', $n2.widgetTranscript.TranscriptWidget, {
        _reInstallSubtitleSel: function () {
            var _this = this;
            var $elem = this._getSubtitleSelectionDiv();

            $elem.empty();
            if (this.srtSelector) {
                delete this.srtSelector;
                this.srtSelector = undefined;
            }

            var menOpts = [];
            if (this.docId && _this.mediaDocIdToSrtDocs && _this.mediaDocIdToSrtDocs[this.docId]) {
                _this.mediaDocIdToSrtDocs[this.docId].forEach(function (srtDoc) {
                    menOpts.push({
                        value: srtDoc._id,
                        text: srtDoc.atlascine_subtitle.language
                    })
                });
            }

            if (menOpts.length > 0) {
                menOpts[0].activated = true;
                menOpts[0].selected = true;
                this.srtSelector = new MDCSelect({
                    selectId: _this.srtSelectionId,
                    menuOpts: menOpts,
                    parentElem: $elem,
                    preSelected: true,
                    menuLabel: 'Language',
                    menuChgFunction: function () {
                        var $sel = $(this).find('li.mdc-list-item--selected');
                        var selectValue;
                        if ($sel[0] && $sel[0].dataset && $sel[0].dataset.value) {
                            selectValue = $sel[0].dataset.value;
                        }
                        $n2.log('Change Subtitle File: ' + selectValue);
                        _this._handleSrtSelectionChanged(selectValue);
                    }
                })
            }
        },
    });

    Object.assign($n2.atlascine, {
        CineTranscript: CineTranscript,
    });

})(jQuery, nunaliit2);
