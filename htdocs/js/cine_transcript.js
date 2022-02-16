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

    const CineTranscript = $n2.Class('ThemeTranscript', $n2.widgetTranscript.TranscriptWidget, {    
        initialize: function(opts_){
            const opts = {
                containerClass: undefined
                , dispatchService: undefined
                , attachmentService: undefined
                , name: undefined
                , docId: undefined
                , doc: undefined
                , sourceModelId: undefined
                , cinemapModelId: undefined
                , subtitleModelId: undefined
                , isInsideContentTextPanel : true
                , ...opts_
            };
    
            const _this = this;
    
            this.dispatchService = opts.dispatchService;
            this.attachmentService = opts.attachmentService;
            this.name = opts.name;
            this.docId = opts.docId;
            this.sourceModelId = opts.sourceModelId;
            this.subtitleModelId = opts.subtitleModelId;
            this._contextMenuClass = 'transcript-context-menu';
            
            this.isInsideContentTextPanel = opts.isInsideContentTextPanel;
    
            if (opts.doc) {
                this.doc = opts.doc;
                this.docId = this.doc._id;
            }

            if (!this.name) {
                this.name = $n2.getUniqueId();
            }
    
            this.transcriptDiv = undefined;
            this.transcript_array = [];
            this.subtitleFormat = undefined;
            this.lastTimeUserScroll = 0;
            this.mediaDivId = undefined;
            this.annotationEditor = undefined;
            this._lastCtxTime = undefined;
            
            const containerClass = opts.containerClass;
            if( !containerClass ){
                throw new Error('containerClass must be specified');
            }
    
            const $container = $('.'+containerClass);
            
            this.elemId = $n2.getUniqueId();
            this.mediaAndSubtitleDivId = $n2.getUniqueId();
            this.mediaDivId = $n2.getUniqueId();
            this.subtitleDivId = $n2.getUniqueId();
            this.subtitleSelectionDivId = $n2.getUniqueId();
            this.srtSelectionId = $n2.getUniqueId();
            this.srtSelector = undefined;
            
            if (this.isInsideContentTextPanel) {
                const $elem = $('<div>')
                    .attr('id', this.elemId)
                    .appendTo($container);

                $('<div>')
                    .attr('id', this.subtitleSelectionDivId)
                    .appendTo($elem);

                const $mediaAndSubtitleDiv = $('<div>')
                    .attr('id', this.mediaAndSubtitleDivId)
                    .addClass('n2widgetTranscript n2widgetTranscript_insideTextPanel')
                    .appendTo($elem);

                $('<div>')
                    .attr('id', this.mediaDivId)
                    .appendTo($mediaAndSubtitleDiv);

                $('<div>')
                    .attr('id', this.subtitleDivId)
                    .addClass('n2widgetTranscript_transcript')
                    .appendTo($mediaAndSubtitleDiv);

                this._reInstallSubtitleSel();
            }
            else {
                $('<div>')
                    .attr('id', this.elemId)
                    .addClass('n2widgetTranscript')
                    .appendTo($container);
            }

            if (this.dispatchService) {
                if (this.sourceModelId) {
                    const modelInfoRequest = {
                        type: 'modelGetInfo'
                        , modelId: this.sourceModelId
                        , modelInfo: null
                    };
                    this.dispatchService.synchronousCall(DH, modelInfoRequest);
                    const sourceModelInfo = modelInfoRequest.modelInfo;

                    if (sourceModelInfo
                        && sourceModelInfo.parameters) {
                        if (sourceModelInfo.parameters.interval) {
                            var paramInfo = sourceModelInfo.parameters.interval;
                            this.intervalChangeEventName = paramInfo.changeEvent;
                            this.intervalGetEventName = paramInfo.getEvent;
                            this.intervalSetEventName = paramInfo.setEvent;

                            if (paramInfo.value) {
                                this.intervalMin = paramInfo.value.min;
                                this.intervalMax = paramInfo.value.max;
                            }
                        }

                        if (sourceModelInfo.parameters.range) {
                            var paramInfo = sourceModelInfo.parameters.range;
                            this.rangeChangeEventName = paramInfo.changeEvent;
                            this.rangeGetEventName = paramInfo.getEvent;
                            this.rangeSetEventName = paramInfo.setEvent;
                        }
                    }
                }
    
                const f = function(m, addr, dispatcher){
                    _this._handle(m, addr, dispatcher);
                };
    
                this.dispatchService.register(DH, 'modelStateUpdated', f);
                this.dispatchService.register(DH, 'mediaTimeChanged', f);
                this.dispatchService.register(DH, 'renderStyledTranscript', f);
                this.dispatchService.register(DH, 'documentContent', f);
                this.dispatchService.register(DH, 'replyColorForDisplayedSentences', f);
    
                if (this.intervalChangeEventName) {
                    this.dispatchService.register(DH, this.intervalChangeEventName, f);
                }

                if (!this.docId) {
                    this.timeTable = [];
                    this.transcript = undefined;
                    this.srtData = undefined;
                    this.subtitleFormat = undefined;
                }
            }
    
            this._refresh = $n2.utils.debounce(this._refresh, 10);

            $n2.log(this._classname, this);
    
            this._documentChanged();
        },
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
        _updateCurrentTime: function (currentTime, origin) {
            /* Override n2.widgetTranscript's _updateCurrentTime */
            this.dispatchService.send(DH, {
                type: 'mediaTimeChanged'
                , name: this.name
                , currentTime: currentTime
                , origin: origin
            });
            if (!this.intervalSetEventName) return;
            let max = currentTime;
            if (typeof max === 'number') {
                if (max === 0) {
                    /*  
                        max being zero means video is not playing or just started playing 
                        (and will very quickly move out of time zero)
                        so retrieve all documents instead.
                        This operates under the assumption that the documents will live within
                        the range of 0 to Number.MAX_SAFE_INTEGER.
                    */
                   max = Number.MAX_SAFE_INTEGER;
                }
                this.dispatchService.send(DH, {
                    type: this.intervalSetEventName
                    , value: new $n2.date.DateInterval({
                        min: 0
                        , max: max
                        , ongoing: false
                    })
                });
            }
        },
        _timeChanged: function (currentTime, origin) {
            const $video = $('#' + this.videoId);
            const _this = this;
            const numCurrentTime = Number(currentTime);

            $('#' + _this.transcriptId + ' > div').removeClass('highlight');

            $n2.utils.processLargeArrayAsync(_this.transcript_array, function (transcriptElem, _index_, _array_) {
                const $transcriptElem = $('#' + transcriptElem.id);
                if (numCurrentTime >= transcriptElem.start && numCurrentTime < transcriptElem.fin) {
                    /* Entering a new transcript segment - highlight it. */
                    $transcriptElem.addClass('highlight');
                    /* Check if it has a colour, if so, emit event to be able to center the view on the generated donut */
                    const currentHighlightedLine = document.querySelector(`#${_this.transcriptId} > div.highlight`);
                    if (currentHighlightedLine !== null) {
                        if (currentHighlightedLine.hasAttribute('style')) {
                            _this.dispatchService.send(DH, {
                                type: 'renderStyledTranscript'
                            });
                        }
                    }
                    if ($.now() - _this.lastTimeUserScroll > 5000) {
                        _this._scrollToView($transcriptElem);
                    }
                }
            });

            if ('model' === origin) {
                const currentVideoTime = $video[0].currentTime;
                if (Math.abs(currentVideoTime - currentTime) < 0.5) {
                } else {
                    $video[0].currentTime = currentTime;
                    $video[0].play();
                }

            } else if ('text' === origin) {
                $video[0].currentTime = currentTime;
                $video[0].play();

            } else if ('text-oneclick' === origin) {
                _this.pauseVideo($video[0], currentTime);

            } else if ('startEditing' === origin) {
                _this._lastCtxTime = currentTime;

            } else if ('savedState' === origin) {
                $video[0].load();
                $video[0].currentTime = currentTime;

                $video[0].play();
                const inid = setInterval(function () {
                    const isPlaying = $video[0].currentTime > 0 && !$video[0].paused && !$video[0].ended
                        && $video[0].readyState > 2;

                    if (!isPlaying) {

                    } else {
                        $video[0].pause();
                        clearInterval(inid);
                    }
                }, 100);
            }
        }
    });

    $n2.atlascine = { "CineTranscript": CineTranscript, ...$n2.atlascine };

})(jQuery, nunaliit2);
