(function ($, $n2) {
    "use strict";

    var DH = 'n2.widgetTranscript';

    var context_menu_text = ['Tag Selection...', 'Map Tags...', 'Settings...'];

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

    var SubtitleFileParser = {
        srt: {
            parse: function (srtData) {
                var reTimeCode = /^([0-9]{2}:[0-9]{2}:[0-9]{2}([,.][0-9]{1,3})?) --\> ([0-9]{2}:[0-9]{2}:[0-9]{2}([,.][0-9]{3})?)(.*)$/;
                var reTimeCode_s = /([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2})((\,|\.)([0-9]+))?\s*/i;
                var json = [];
                var lines = srtData.split(/\r?\n/);
                if (!$n2.isArray(lines)) {
                    throw new Error('srtFile data processing error');
                }
                var cur = -1;
                var totalLength = lines.length;

                var curSentence = "";
                while (++cur < (totalLength - 1)) {
                    if (lines[cur].replace(/^\sj|\s+$/g, '') === "") {
                        continue;
                    } else {
                        var tmpIdx = lines[cur].replace(/^\s+|\s+$/g, '');
                        var tmpTimecode = lines[++cur].replace(/^\s+|\s+$/g, '');
                        var matcher = reTimeCode.exec(tmpTimecode);
                        if (tmpIdx.search(/[0-9]+/i) === -1
                            || !matcher) {
                            continue;

                        } else {
                            var curEntry = {
                                "start": null,
                                "startTimeCode": matcher[1],
                                "fin": null,
                                "finTimeCode": matcher[3],
                                "text": ""
                            };
                            curEntry.start = $n2.utils.convertSMPTEtoSeconds(matcher[1]);
                            curEntry.fin = $n2.utils.convertSMPTEtoSeconds(matcher[3]);
                            while (++cur < totalLength) {
                                curSentence = lines[cur];
                                if (curSentence.replace(/^\s+|\s+$/g, '') === "") {
                                    curEntry.text += ' ';
                                    break;
                                }
                                curEntry.text += curSentence;
                            }

                            json.push(curEntry);
                        }
                    }
                }
                return json;
            }
        },

        webvtt: {
            pattern_identifier: /^([a-zA-z]+-)?[0-9]+$/
            , pattern_timecode: /^([0-9]{2}:[0-9]{2}:[0-9]{2}([,.][0-9]{1,3})?) --\> ([0-9]{2}:[0-9]{2}:[0-9]{2}([,.][0-9]{3})?)(.*)$/
            , parse: function (trackText) {

                var i = 0,
                    lines = trackText.split(/\r?\n/),
                    entries = [],
                    timecode,
                    text;

                for (; i < lines.length; i++) {
                    timecode = this.pattern_timecode.exec(lines[i]);
                    if (timecode && i < lines.length) {
                        i++;
                        text = lines[i];
                        i++;

                        while (lines[i] !== '' && i < lines.length) {
                            text = text + '\n' + lines[i];
                            i++;
                        }

                        entries.push({
                            'start': ($n2.utils.convertSMPTEtoSeconds(timecode[1]) == 0) ? 0.000 : $n2.utils.convertSMPTEtoSeconds(timecode[1]),
                            'fin': $n2.utils.convertSMPTEtoSeconds(timecode[3]),
                            'startTimeCode': timecode[1],
                            'finTimeCode': timecode[3],
                            'settings': timecode[5],
                            'text': text
                        });
                    }
                }
                return entries;
            }
        }
    };

    var ThemeTranscript = $n2.Class('ThemeTranscript', $n2.widgetTranscript.TranscriptWidget, {
        selectedIndexDoc: null,
        docInfosByDocId: null,

        initialize: function (opts_) {
            var opts = $n2.extend({
                containerClass: undefined,
                dispatchService: undefined,
                attachmentService: undefined,
                name: undefined,
                docId: undefined,
                doc: undefined,
                sourceModelId: undefined,
                cinemapModelId: undefined,
                subtitleModelId: undefined,
                isInsideContentTextPanel: true
            }, opts_);

            var _this = this;

            this.dispatchService = opts.dispatchService;
            this.attachmentService = opts.attachmentService;
            this.name = opts.name;
            this.docId = opts.docId;
            this.sourceModelId = opts.sourceModelId;
            this.subtitleModelId = opts.subtitleModelId;
            this._contextMenuClass = 'transcript-context-menu';
            this.docInfosByDocId = {};

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

            var containerClass = opts.containerClass;
            if (!containerClass) {
                throw new Error('containerClass must be specified');
            }

            var $container = $('.' + containerClass);

            this.elemId = $n2.getUniqueId();
            this.mediaAndSubtitleDivId = $n2.getUniqueId();
            this.mediaDivId = $n2.getUniqueId();
            this.subtitleDivId = $n2.getUniqueId();
            this.subtitleSelectionDivId = $n2.getUniqueId();
            this.srtSelectionId = $n2.getUniqueId();
            this.srtSelector = undefined;

            if (this.isInsideContentTextPanel) {
                var $elem = $('<div>')
                    .attr('id', this.elemId)
                    .appendTo($container);

                $('<div>')
                    .attr('id', this.subtitleSelectionDivId)
                    .appendTo($elem);

                var $mediaAndSubtitleDiv = $('<div>')
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

            } else {
                $('<div>')
                    .attr('id', this.elemId)
                    .addClass('n2widgetTranscript')
                    .appendTo($container);
            }

            if (this.dispatchService) {
                if (this.sourceModelId) {
                    var modelInfoRequest = {
                        type: 'modelGetInfo'
                        , modelId: this.sourceModelId
                        , modelInfo: null
                    };
                    this.dispatchService.synchronousCall(DH, modelInfoRequest);
                    var sourceModelInfo = modelInfoRequest.modelInfo;

                    if (sourceModelInfo && sourceModelInfo.parameters) {
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

                var f = function (m, addr, dispatcher) {
                    _this._handle(m, addr, dispatcher);
                };

                this.dispatchService.register(DH, 'modelStateUpdated', f);
                this.dispatchService.register(DH, 'mediaTimeChanged', f);
                this.dispatchService.register(DH, 'documentContent', f);
                this.dispatchService.register(DH, 'changeCineViaDonut', f);
                this.dispatchService.register(DH, 'themeChanged', f);

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

        _donutRedirection: function (m) {
            var previousDocId = this.docId;
            if (m.docId) {
                var doc = this.docInfosByDocId[m.docId];
                if (doc) {
                    this.selectedIndexDoc = doc;
                    var currentDocId = doc.atlascine_cinemap.media_doc_ref.doc;
                    if (previousDocId !== currentDocId) {
                        this._clear();
                        this.docId = currentDocId;
                        this._documentChanged();
                    }
                    this._timeChanged(m.currentTime, m.origin);
                }
            }
        },

        _documentChanged: function () {
            var _this = this;
            if (!this.docId) {
                $n2.log('n2.widgetTranscript inital document change');
                return;
            } else if (!this.doc || this.docId !== this.doc._id) {
                this.doc = undefined;
                this.dispatchService.send(DH, {
                    'type': 'requestDocument'
                    , 'docId': this.docId
                });
                this._reInstallSubtitleSel();
            } else if (!this.transcript) {
                this._loadVideoFile();
                this._loadTranscript(this.doc);
            } else if (!this.srtData) {
                var attSrt = undefined;
                if (this.attachmentService && this.transcript && this.transcript.fromMediaDoc) {
                    attSrt = this.attachmentService.getAttachment(this.doc, this.transcript.srtAttName);
                } else if (this.attachmentService && this.transcript && this.transcript.srtAttName) {
                    attSrt = this.attachmentService.getAttachment(this.srtDocs[this.transcript.srtDocId], this.transcript.srtAttName);
                }

                var srtUrl = undefined;
                if (attSrt) {
                    srtUrl = attSrt.computeUrl();
                }

                if (srtUrl) {
                    $.ajax({
                        url: srtUrl
                        , type: 'GET'
                        , async: true
                        , traditional: true
                        , data: {}
                        , dataType: 'text'
                        , success: function (srtData) {
                            _this.srtData = srtData;
                            _this.subtitleFormat = _this.subtitleFormat || 'SRT';
                            switch (_this.subtitleFormat) {
                                case 'SRT':
                                    _this.transcript_array = SubtitleFileParser.srt.parse(srtData);
                                    break;
                                case 'WEBVTT':
                                    _this.transcript_array = SubtitleFileParser.webvtt.parse(srtData);
                                    break;
                            }
                            _this._documentChanged();
                            _this._refresh();
                        }
                        , error: function () {
                            _this._documentChanged();
                        }
                    });
                } else {
                    $n2.log('Can not find any valid SRT/WEBVTT file');
                }
            }
        },

        _refresh: function () {
            var _this = this;
            var $subtitleSelectionDiv = this._getSubtitleSelectionDiv();

            var $elem = this._getMediaDiv();
            $elem.empty();
            $elem = this._getSubtitleDiv();
            $elem.empty();

            if (!this.doc || this.docId !== this.doc._id) {
                return;
            }

            if (!this.transcript || !this.transcript.videoAttName) {
                return;
            }

            var attVideoName = undefined;
            if (this.transcript) {
                attVideoName = this.transcript.videoAttName;
            }

            var attVideoDesc = null;
            var data = this.doc; // shorthand
            if (data
                && data.nunaliit_attachments
                && data.nunaliit_attachments.files
                && attVideoName) {
                attVideoDesc = data.nunaliit_attachments.files[attVideoName];

                if (attVideoDesc
                    && attVideoDesc.fileClass !== 'video') {
                    attVideoDesc = undefined;
                }
            }

            var thumbnailUrl = null;
            if (attVideoDesc
                && attVideoDesc.thumbnail) {
                var attThumb = this.attachmentService.getAttachment(this.doc, attVideoDesc.thumbnail);

                if (attThumb) {
                    thumbnailUrl = attThumb.computeUrl();
                }
            }

            var attVideoUrl = undefined;
            if (attVideoDesc
                && attVideoDesc.status === 'attached') {
                var attVideo = this.attachmentService.getAttachment(this.doc, attVideoName);

                if (attVideo) {
                    attVideoUrl = attVideo.computeUrl();
                }
            }

            if (attVideoUrl) {
                var mediaDivId = this.mediaDivId;
                this.videoId = $n2.getUniqueId();
                this.transcriptId = this.subtitleDivId;

                var $mediaDiv = this._getMediaDiv();
                $mediaDiv.empty();

                var $video = $('<video>')
                    .attr('id', this.videoId)
                    .attr('controls', 'controls')
                    .attr('width', '100%')
                    .attr('height', '360px')
                    .appendTo($mediaDiv);

                var $videoSource = $('<source>')
                    .attr('src', attVideoUrl)
                    .appendTo($video);

                if (attVideoDesc.mimeType) {
                    $videoSource.attr('type', attVideoDesc.mimeType);
                }

                $video.mediaelementplayer({
                    poster: thumbnailUrl
                    , alwaysShowControls: true
                    , pauseOtherPlayers: false
                    , features: ['playpause', 'progress', 'volume', 'sourcechooser', 'fullscreen']
                });

                $video
                    .bind('timeupdate', function () {
                        var currentTime = this.currentTime;
                        _this._updateCurrentTime(currentTime, 'video');
                    })
                    .bind('durationchange', function (e) {
                        var duration = this.duration;
                        $n2.log('video duration changed: ' + duration);
                    });

                if (this.transcript.fromMediaDoc) {
                    this._getSubtitleSelectionDiv().empty();
                }

                if (this.transcript && this.transcript.srtAttName) {
                    var $transcript = this._getSubtitleDiv();
                    $transcript.empty();
                    prep_transcript($transcript, this.transcript_array);
                }
            } else {
                _this._renderError('Can not compute URL for video');
            }

            function _rightClickCallback(e, $this, contextMenu, selections) {
                var hoveredElem = e.target;

                var isEditorAvailable = _this._isAnnotationEditorAvailable();

                if (isEditorAvailable) {
                    for (var i = 0; i < _this.transcript_array.length; i++) {
                        var transcriptElem = _this.transcript_array[i];
                        var $transcriptElem = $('#' + transcriptElem.id);
                        $transcriptElem.removeClass('sentence-highlight-pending');
                    }

                    if (!selections || selections.size() === 0) {
                        return;
                    }

                    var ctxdata = [];
                    var idxOfHoverEl = selections.index(
                        $('div#' + $(hoveredElem).attr('id'))
                    );

                    if (idxOfHoverEl >= 0) {
                        selections.each(function () {
                            var $elmnt = $(this);
                            var curStart = $elmnt.attr('data-start');
                            var curFin = $elmnt.attr('data-fin');
                            var startTimeCode = $elmnt.attr('data-startcode');
                            var finTimeCode = $elmnt.attr('data-fincode');
                            var curTxt = $elmnt.text();

                            var _d = {
                                start: curStart,
                                startTimeCode: startTimeCode,
                                finTimeCode: finTimeCode,
                                end: curFin,
                                text: curTxt
                            };
                            ctxdata.push(_d);
                            $elmnt.addClass('sentence-highlight-pending');
                        })

                    } else {
                        $(hoveredElem)
                            .parent()
                            .children().each(function () {
                                if ($(this).hasClass('selected')) {
                                    $(this).removeClass('selected');
                                }
                            });
                        $(hoveredElem).addClass('selected');

                        var $elmnt = $(hoveredElem);
                        var curStart = $elmnt.attr('data-start');
                        var curFin = $elmnt.attr('data-fin');
                        var startTimeCode = $elmnt.attr('data-startcode');
                        var finTimeCode = $elmnt.attr('data-fincode');
                        var curTxt = $elmnt.text();

                        var _d = {
                            start: curStart,
                            startTimeCode: startTimeCode,
                            finTimeCode: finTimeCode,
                            end: curFin,
                            text: curTxt
                        };
                        ctxdata.push(_d);
                    }

                    contextMenu.data({ value: ctxdata });
                    contextMenu[0].style.left = e.pageX + 'px';
                    contextMenu[0].style.top = e.pageY + 'px';
                    contextMenu.removeClass('transcript-context-menu-hide');
                }
            }

            function prep_transcript($transcript, transcript_array) {
                if (!transcript_array || !Array.isArray(transcript_array) || transcript_array.length === 0) {
                    return;
                }
                var currentSelectSentences = undefined;

                var contextMenu = $('div.' + _this._contextMenuClass);
                if (contextMenu.length > 0) {
                    contextMenu.remove();
                }

                var transcript_context_menu_list = $('<ul>');
                $.each(context_menu_text, function (i) {
                    $('<li/>')
                        .text(context_menu_text[i])
                        .click(function () {
                            var senDataArr = contextMenu.data().value;
                            if (senDataArr && senDataArr.length == 1) {
                                var currentTime = senDataArr[0].start;
                                if (typeof currentTime !== "undefined") {
                                    _this._updateCurrentTime(currentTime, 'startEditing');
                                }
                            }

                            if (senDataArr && senDataArr.length > 0) {
                                _this._renderDrawer(context_menu_text[i], senDataArr);
                            }

                            $('div.' + _this._contextMenuClass).addClass("transcript-context-menu-hide");
                        })
                        .appendTo(transcript_context_menu_list);
                });

                contextMenu = $('<div>')
                    .addClass(_this._contextMenuClass)
                    .addClass("transcript-context-menu-hide")
                    .append(transcript_context_menu_list)
                    .appendTo(document.body);

                var timeLinksMap = {};
                if (_this.selectedIndexDoc && _this.selectedIndexDoc.atlascine_cinemap && _this.selectedIndexDoc.atlascine_cinemap.timeLinks) {
                    var timeLinks = _this.selectedIndexDoc.atlascine_cinemap.timeLinks;
                    timeLinksMap = timeLinks.reduce((acc, timeLink) => {
                        if (timeLink && timeLink.starttime && timeLink.endtime) {
                            var start = $n2.atlascine.convertTimecodeToMs(timeLink.starttime);
                            var end = $n2.atlascine.convertTimecodeToMs(timeLink.endtime);
                            acc[start + '-' + end] = timeLink;
                        }
                        return acc;
                    }, {});
                }

                for (var i = 0, e = transcript_array.length; i < e; i++) {
                    var transcriptElem = transcript_array[i];
                    var DELAY = 300, clicks = 0, timer = null;
                    var id = $n2.getUniqueId();
                    transcriptElem.id = id;
                    var target_start = $n2.atlascine.convertTimecodeToMs(transcriptElem.startTimeCode);
                    var target_end = $n2.atlascine.convertTimecodeToMs(transcriptElem.finTimeCode);
                    var query = target_start + '-' + target_end;
                    $('<div>')
                        .attr('id', id)
                        .attr('data-start', transcriptElem.start)
                        .attr('data-fin', transcriptElem.fin)
                        .attr('data-startcode', transcriptElem.startTimeCode)
                        .attr('data-fincode', transcriptElem.finTimeCode)
                        .addClass('n2-transcriptWidget-sentence')
                        .addClass('n2transcript_sentence_' + $n2.utils.stringToHtmlId(id))
                        .css('background-color', query in timeLinksMap ? _this.selectedIndexDoc._color : '#ffffff')
                        .html(transcriptElem.text + " ")
                        .appendTo($transcript)
                }

                $('div#' + _this.transcriptId).multiSelect({
                    unselectOn: 'head',
                    keepSelection: false,
                    stop: function ($sel, $elem) {
                        currentSelectSentences = undefined;
                        currentSelectSentences = $sel;
                    }
                });

                $('div.n2widgetTranscript_transcript div').on('mouseup', function (e) {
                    e.preventDefault();
                    var _that = this;
                    if (e.ctrlKey) {
                        e.preventDefault();
                        return false;
                    }

                    clicks++;
                    if (clicks === 1) {
                        timer = setTimeout(function () {
                            switch (e.which) {
                                case 1:
                                    contextMenu.addClass('transcript-context-menu-hide');
                                    if (e.ctrlKey || e.metaKey || e.shiftKey) {

                                    } else {
                                        $(_that).removeClass('sentence-highlight-pending')
                                        var $span = $(_that);
                                        var currentTime = $span.attr('data-start');
                                        _this._updateCurrentTime(currentTime, 'text-oneclick');
                                    }

                                    break;
                                case 2:
                                    break;
                                case 3:
                                    _rightClickCallback(e, $(this), contextMenu, currentSelectSentences);

                            }
                            clicks = 0;
                        }, DELAY);

                    } else {
                        clearTimeout(timer);
                        switch (e.which) {
                            case 1:
                                contextMenu.addClass('transcript-context-menu-hide');
                                $(_that).removeClass('sentence-highlight-pending')
                                var $span = $(_that);
                                var currentTime = $span.attr('data-start');
                                _this._updateCurrentTime(currentTime, 'text');
                                break;
                            case 2:
                                break;
                            case 3:
                                break;
                        }
                        clicks = 0;
                    }
                })
                    .on('dblclick', function (e) {
                        e.preventDefault();
                    })
                    .on('contextmenu', function (e) {
                        e.preventDefault();
                        return true;
                    });

                $transcript.on('scroll', function (e) {
                    e.stopPropagation();
                    contextMenu.addClass('transcript-context-menu-hide');
                    _this._closeDrawer();
                })
            }
        },

        _cinemapUpdated: function (sourceState) {
            this._clear();

            var i, e, doc, docId;
            var _this = this;

            if (sourceState.removed) {
                for (i = 0, e = sourceState.removed.length; i < e; ++i) {
                    doc = sourceState.removed[i];
                    docId = doc._id;
                    if (docId in _this.docInfosByDocId) {
                        delete _this.docInfosByDocId[docId];
                    }
                }
            }

            if (sourceState.added) {
                for (i = 0, e = sourceState.added.length; i < e; ++i) {
                    doc = sourceState.added[i];
                    docId = doc._id;

                    if (doc.atlascine_cinemap) {
                        docId = doc._id;
                        _this.docInfosByDocId[docId] = doc;
                    }
                }
            }

            if (sourceState.updated) {
                for (i = 0, e = sourceState.updated.length; i < e; ++i) {
                    doc = sourceState.updated[i];
                    docId = doc._id;
                    if (doc.atlascine_cinemap) {
                        docId = doc._id;
                        _this.docInfosByDocId[docId] = doc;
                    }
                }
            }
        },

        _clear() {
            if (this.docId) {
                this.doc = undefined;
                this.docId = undefined;
                this.timeTable = [];
                this.transcript = undefined;
                this.srtData = undefined;
                this.subtitleFormat = undefined;
                this._refresh();
                this._reInstallSubtitleSel();
            }
        },

        _handle: function (m) {
            if ('mediaTimeChanged' === m.type) {
                if (m.name == this.name) {
                    this._timeChanged(m.currentTime, m.origin);
                }
            } else if ('documentContent' === m.type) {
                if (m.docId == this.docId) {
                    if (!this.doc) {
                        this.doc = m.doc;
                        this._documentChanged();
                    } else if (this.doc._rev != m.doc._rev) {
                        this.doc = m.doc;
                        this._documentChanged();
                    }
                }
            } else if (this.intervalChangeEventName === m.type) {
                if (m.value) {
                    this.intervalMin = m.value.min;
                    this.intervalMax = m.value.max;

                    var videoTime = this._convertTimeToVideoTime(this.intervalMin);
                    if (typeof videoTime == 'number') {
                        this._timeChanged(videoTime, 'model');
                    }
                }
            } else if ('modelStateUpdated' === m.type) {
                if (this.sourceModelId === m.modelId) {
                    this._cinemapUpdated(m.state);
                } else if (this.subtitleModelId === m.modelId) {
                    this._updateMediaToSrtMap(m.state);
                    this._reInstallSubtitleSel();
                }
            } else if ('selected' === m.type) {
                if (m.docId != this.docId) {
                    this.docId = m.docId;
                    this.doc = m.doc;
                    this.timeTable = [];
                    this.transcript = undefined;
                    this.srtData = undefined;
                    this.subtitleFormat = undefined;
                    this._documentChanged();
                }
            } else if ('changeCineViaDonut' === m.type) {
                this._donutRedirection(m);
            } else if ('themeChanged' === m.type) {
                this._clear()
            }
        },

        _scrollToView: function ($dst) {
            if ($dst) {
                var _this = this;
                var parent_height = $dst.parent().innerHeight();
                if ($dst.offset() && $dst.parent()) {
                    var curr_pos = $dst.offset().top - $dst.parent().offset().top;
                    if (curr_pos > parent_height * 2 / 3 || curr_pos < 0) {
                        $('#' + this.transcriptId).off("scroll", _this._onUserScrollAction.bind(_this));
                        var oldOffset = $dst.parent().scrollTop();
                        $dst.parent().scrollTop(oldOffset + curr_pos);
                        var inid = setInterval(function () {
                            var curOffset = $dst.parent().scrollTop();
                            if (curOffset !== oldOffset) {
                            } else {
                                $('#' + _this.transcriptId).on("scroll", _this._onUserScrollAction.bind(_this));
                                clearInterval(inid);
                            }
                            oldOffset = curOffset;
                        }, 100);
                    }
                }
            }
        },

        _timeChanged: function(currentTime, origin) {
            var $video;
            var _this = this;
            var n_cur = Number (currentTime);
            $('#' + _this.transcriptId + ' > div').removeClass('highlight');

            $n2.utils.processLargeArrayAsync(_this.transcript_array, function(transcriptElem, _index_, _array_) {
                var $transcriptElem = $('#'+transcriptElem.id);
                if(n_cur >= transcriptElem.start && n_cur < transcriptElem.fin) {
                    $transcriptElem.addClass('highlight');
                    if ($.now() - _this.lastTimeUserScroll > 5000) {
                        _this._scrollToView($transcriptElem);
                    }
                }
            });

            if ('model' === origin) {
                $video = $('#'+this.videoId);
                if ($video[0] != null) {
                    var currentVideoTime = $video[0].currentTime;
                    if (Math.abs(currentVideoTime - currentTime) < 0.5) {} else {
                        $video[0].currentTime = currentTime;
                        $video[0].play();
                    }
                }
            } else if ('text' === origin) {
                $video = $('#'+this.videoId);
                if ($video[0] != null) {
                    $video[0].currentTime = currentTime;
                    $video[0].play();
                }
            } else if ('text-oneclick' === origin) {
                $video = $('#'+this.videoId);
                if ($video[0] != null) {
                    _this.pauseVideo($video[0], currentTime);
                }
            } else if ('startEditing' === origin) {
                _this._lastCtxTime = currentTime;
            } else if ('savedState' === origin) {
                $video = $('#'+this.videoId);
                if ($video[0] != null) {
                    $video[0].load();
                    $video[0].currentTime = currentTime;
                    $video[0].play();
                    var inid = setInterval(function() {
                        var isPlaying = $video[0].currentTime > 0 && !$video[0].paused && !$video[0].ended && $video[0].readyState > 2;
                        if (!isPlaying) {
                            $video[0].pause();
                            clearInterval(inid);
                        }
                    }, 100);
                }
            }
        },
    });

    Object.assign($n2.atlascine, {
        ThemeTranscript: ThemeTranscript,
    });

})(jQuery, nunaliit2);
