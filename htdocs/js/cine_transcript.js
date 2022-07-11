(function ($, $n2) {
    "use strict";

    var showService;

    var _loc = function (str, args) {
        return $n2.loc(str, 'nunaliit2', args);
    };

    const SubtitleFileParser = {
        srt: {
            parse: function (srtData) {
                var reTimeCode = /^([0-9]{2}:[0-9]{2}:[0-9]{2}([,.][0-9]{1,3})?) --\> ([0-9]{2}:[0-9]{2}:[0-9]{2}([,.][0-9]{3})?)(.*)$/;
                var json = [];
                var lines = srtData.split(/\r?\n/);
                if (!$n2.isArray(lines)) {
                    throw new Error('srtFile data processing error');
                }
                var cur = -1;
                var totalLength = lines.length;

                var curSentence = "";
                while (++cur < (totalLength - 1)) {
                    if (lines[cur].replace(/^\s+|\s+$/g, '') === "") {
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
    }

    /*
	    For controlling what events are emitted from the transcript since that got out of hand
    */
    const TranscriptEventControl = $n2.Construct('TranscriptEventControl', {
        transcriptLines: [],
        currentLine: {},
        hasCurrentLineUsedColour: false,

        initialize: function() {},

        setLines(lines) {
            this.transcriptLines = lines;
            this.currentLine = {};
            this.hasCurrentLineUsedColour = false;
        },

        _setCurrentLine(line) {
            this.currentLine = line;
        },

        _getCurrentLine() {
            return this.currentLine;
        },

        _getLineFromTime(time) {
            return this.transcriptLines.find(line => {
                return ((time >= line.start) && (time < line.fin))
            });
        },

        joinColours(colours) {
            this.transcriptLines = this.transcriptLines.map(line => {
                const matchingColourLine = colours[line.id];

                if (matchingColourLine) {
                    const matchedLineColour = matchingColourLine.color;
                    line.colour = matchedLineColour ? matchedLineColour : null;
                }

                return line;
            });
        },

        styledLineEventEmitType() {
            if (this.hasCurrentLineUsedColour) return false;
            this.hasCurrentLineUsedColour = true;
            return this.currentLine.colour;
        },

        shouldEventEmit(currentTime) {
            const numCurrentTime = Number(currentTime);
            const activeLine = this._getLineFromTime(numCurrentTime);
            if (activeLine === undefined) return false;
            if (activeLine === this._getCurrentLine()) return false;
            this._setCurrentLine(activeLine);
            this.hasCurrentLineUsedColour = false;
            return true;
        }
    });

    $n2.Class({
        initialize: function (opts_) {
            var opts = $n2.extend({
                showService: null,
                siteDesign: null
            }, opts_);

            showService = opts.showService;
        }
    });

    const CineTranscript = $n2.Class('CineTranscript', $n2.widgetTranscript.TranscriptWidget, {    
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
            this.DH = 'CineTranscript';
            this.transcriptEventControl = new TranscriptEventControl();
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
            this.loadingDiv = null;
            
            if (this.isInsideContentTextPanel) {
                const $elem = $('<div>')
                    .attr('id', this.elemId)
                    .css({"height": "100%"})
                    .appendTo($container);

                const titleBar = document.getElementById("module_title_bar");
                const subLangDiv = document.createElement("div");
                subLangDiv.setAttribute("id", this.subtitleSelectionDivId);
                subLangDiv.setAttribute("class", "cinemapTranscriptLanguageDiv");
                titleBar.insertBefore(subLangDiv, titleBar.children[titleBar.children.length - 1]);

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

                this.loadingDiv = document.createElement("div");
                this.loadingDiv.setAttribute("id", $n2.getUniqueId());
                this.loadingDiv.setAttribute("class", "loading");
                $mediaAndSubtitleDiv.append(this.loadingDiv);

                this._reInstallSubtitleSel();
            }
            else {
                $('<div>')
                    .attr('id', this.elemId)
                    .addClass('n2widgetTranscript')
                    .appendTo($container);
                
                this.loadingDiv = document.createElement("div");
                this.loadingDiv.setAttribute("id", $n2.getUniqueId());
                this.loadingDiv.setAttribute("class", "loading");
                $container.append(this.loadingDiv);
            }

            if (this.dispatchService) {
                if (this.sourceModelId) {
                    const modelInfoRequest = {
                        type: 'modelGetInfo'
                        , modelId: this.sourceModelId
                        , modelInfo: null
                    };
                    this.dispatchService.synchronousCall(this.DH, modelInfoRequest);
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
    
                this.dispatchService.register(this.DH, 'modelStateUpdated', f);
                this.dispatchService.register(this.DH, 'mediaTimeChanged', f);
                this.dispatchService.register(this.DH, 'mapStoryTimelineBarClick', f);
                this.dispatchService.register(this.DH, 'renderStyledTranscript', f);
                this.dispatchService.register(this.DH, 'documentContent', f);
                this.dispatchService.register(this.DH, 'replyColorForDisplayedSentences', f);
    
                if (this.intervalChangeEventName) {
                    this.dispatchService.register(this.DH, this.intervalChangeEventName, f);
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

        _documentChanged: function(){
            if (!this.docId){
                $n2.log('n2.widgetTranscript initial document change');
                return;
            } 
            else if( !this.doc || this.docId !== this.doc._id ){
                this.doc = undefined;
                this.dispatchService.send(this.DH, {
                    'type': 'requestDocument',
                    'docId': this.docId
                });
                this._reInstallSubtitleSel();
            }
            else if( !this.transcript ){
                this._loadMediaFile();
                this._loadTranscript(this.doc);
            }
            else if( !this.srtData ){
                let attSrt = undefined;
                if (this.attachmentService
                    && this.transcript 
                    && this.transcript.fromMediaDoc){
                    attSrt = this.attachmentService.getAttachment(this.doc, this.transcript.srtAttName);
                }
                else if( this.attachmentService
                    && this.transcript 
                    && this.transcript.srtAttName ){
                    attSrt = this.attachmentService.getAttachment(this.srtDocs[this.transcript.srtDocId], this.transcript.srtAttName);
                }
                let srtUrl = undefined;
                if( attSrt ){
                    srtUrl = attSrt.computeUrl();
                }
    
                if( srtUrl ){
                    $.ajax({
                        url: srtUrl
                        ,type: 'GET'
                        ,async: true
                        ,traditional: true
                        ,data: {}
                        ,dataType: 'text'
                        ,success: (srtData) => {
                            this.srtData = srtData;
                            this.subtitleFormat = this.subtitleFormat || 'SRT';
                            switch(this.subtitleFormat){
                                case 'SRT':
                                    this.transcript_array = SubtitleFileParser.srt.parse(srtData);
                                    this.transcriptEventControl.setLines(this.transcript_array);
                                    break;
                                case 'WEBVTT':
                                    this.transcript_array = SubtitleFileParser.webvtt.parse(srtData);
                                    this.transcriptEventControl.setLines(this.transcript_array);
                                    break;
                            }
                            this._documentChanged();
                        },
                        error: function(XMLHttpRequest, textStatus, errorThrown) {
                            this._documentChanged();
                        }
                    });
    
                } else {
                    $n2.log('Can not find any valid SRT/WEBVTT file');
                }
            }
            this.dispatchService.send(this.DH, {
                type: 'renderStyledTranscript',
                hideImage: true
            })
            this._refresh();
        },

        _handle: function (m, addr, dispatcher) {
            const {
                type,
                doc,
                docId,
                modelId
            } = m;

            if ('mediaTimeChanged' === type) {
                if (m.name === this.name) {
                    this._timeChanged(m.currentTime, m.origin);
                }
            }
            else if ('documentContent' === type) {
                if (docId === this.docId) {
                    if (!this.doc) {
                        this.doc = doc;
                        this._documentChanged();
                    } else if (this.doc._rev !== doc._rev) {
                        this.doc = doc;
                        this._documentChanged();
                    }
                }
            }
            else if ("mapStoryTimelineBarClick" === type) {
                this._updateCurrentTime(m.currentTime, m.origin);
            }
            else if (this.intervalChangeEventName === type) {
                if (m.value) {
                    this.intervalMin = m.value.min;
                    this.intervalMax = m.value.max;
                    const videoTime = this._convertTimeToVideoTime(this.intervalMin);
                    if (typeof videoTime == 'number') {
                        this._timeChanged(videoTime, 'model');
                    }
                }
            }
            else if ('modelStateUpdated' === type) {
                if (this.sourceModelId === modelId) {
                    const mediaDocChanged = this._cinemapUpdated(m.state);
                    if (mediaDocChanged) {
                        this.loadingDiv.style.display = "";
                        this.timeTable = [];
                        this.transcript = undefined;
                        this.srtData = undefined;
                        this.subtitleFormat = undefined;
                        this._refresh();
                        this._documentChanged();
                        const {
                            state: {
                                added
                            }
                        } = m;
                        if (added.length < 1) return;
                        if (!added[0].atlascine_cinemap || !added[0].atlascine_cinemap.settings) return;
                        const {
                            atlascine_cinemap: {
                                settings: {
                                    globalInitialMapExtent
                                }
                            }
                        } = added[0];
                        if (!globalInitialMapExtent) return;
                        if (globalInitialMapExtent.length === 1 
                            && globalInitialMapExtent[0] === 0) return;
                        const webProjection = nunaliit2.n2es6.ol_proj_transformExtent(
                            globalInitialMapExtent,
                            new nunaliit2.n2es6.ol_proj_Projection({code: "EPSG:4326"}),
                            new nunaliit2.n2es6.ol_proj_Projection({code: "EPSG:3857"})
                        );
                        this.dispatchService.send(this.DH, {
                            type: "mapFitExtent"
                            , value: webProjection
                        });
                    }
                }
                else if (this.subtitleModelId === modelId) {
                    this._updateMediaToSrtMap(m.state);
                    this._reInstallSubtitleSel();
                }
            }
            else if ('selected' === type) {
                if (docId !== this.docId) {
                    this.docId = docId;
                    this.doc = doc;
                    this.timeTable = [];
                    this.transcript = undefined;
                    this.srtData = undefined;
                    this.subtitleFormat = undefined;
                    this._documentChanged();
                }
            }
            else if ('replyColorForDisplayedSentences' === type) {
                this.transcriptEventControl.joinColours(m.data);
                this._color_transcript(m.data);
            }
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
                const subSelect = document.createElement("select");
                menOpts.forEach(option => {
                    subSelect.add(new Option(option.text, option.value));
                });
                subSelect.onchange = function() {
                    _this._handleSrtSelectionChanged(this.value)
                }
                this.srtSelector = subSelect;
                $elem.append(this.srtSelector);
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
                    $transcriptElem.addClass('highlight');
                    if ($.now() - _this.lastTimeUserScroll > 5000) {
                        _this._scrollToView($transcriptElem);
                    }
                }
            });

            
            if ('video' === origin) {
                if (numCurrentTime === 0) return;
                const eventType = this.transcriptEventControl.styledLineEventEmitType();
                if (eventType === null){
                    this.dispatchService.send(this.DH, {
                        type: 'renderStyledTranscript',
                        hideImage: true
                    })
                }
                else if (eventType !== false) {
                    this.dispatchService.synchronousCall(this.DH, {
                        type: 'renderStyledTranscript',
                        hideImage: true
                    })
                    this.dispatchService.send(this.DH, {
                        type: 'renderStyledTranscript',
                        currentTime: numCurrentTime
                    })
                }
            }
            else if ('MapStoryFilterableLegendWidgetWithGraphic' === origin) {
                $video[0].currentTime = currentTime;
                $video[0].play();
            }
            else if ('model' === origin) {
                const currentVideoTime = $video[0].currentTime;
                if (Math.abs(currentVideoTime - currentTime) < 0.5) {
                } else {
                    $video[0].currentTime = currentTime;
                    $video[0].play();
                }
            }
            else if ('text' === origin) {
                $video[0].currentTime = currentTime;
                $video[0].play();
            }
            else if ('text-oneclick' === origin) {
                _this.pauseVideo($video[0], currentTime);

            }
            else if ('startEditing' === origin) {
                _this._lastCtxTime = currentTime;

            }
            else if ('savedState' === origin) {
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
        },

        _updateCurrentTime: function (currentTime, origin) {
            /* Override n2.widgetTranscript's _updateCurrentTime */
            this.dispatchService.send(this.DH, {
                type: 'mediaTimeChanged'
                , name: this.name
                , currentTime: currentTime
                , origin: origin
            });
            if (!this.intervalSetEventName) return;
            if (typeof currentTime === 'number') {
                if (!this.transcriptEventControl.shouldEventEmit(currentTime)) return;
                this.dispatchService.send(this.DH, {
                    type: this.intervalSetEventName
                    , value: new $n2.date.DateInterval({
                        min: 0
                        , max: currentTime
                        , ongoing: false
                    })
                });
            }
        }
    });

    $n2.atlascine = { "CineTranscript": CineTranscript, ...$n2.atlascine };

})(jQuery, nunaliit2);
