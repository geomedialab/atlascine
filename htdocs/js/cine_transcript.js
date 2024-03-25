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
            this.currentTime = 0;
            
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
            
            this.minMarkerTime = 0
            this.maxMarkerTime = 0

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

        _refresh: function(){
            var _this = this;
            var $elem = this._getMediaDiv();
            $elem.empty();
            $elem = this._getSubtitleDiv();
            $elem.empty();
    
            this.minMarkerTime = 0
            this.maxMarkerTime = 0

            if( !this.doc || this.docId !== this.doc._id ){
                return;
            }
    
            if ( !this.transcript || !this.transcript.mediaAttName ){
                return;
            }
    
            var attMediaName = undefined;
            if( this.transcript ){
                attMediaName = this.transcript.mediaAttName;
            }
    
            var attMediaDesc = null;
            var data = this.doc;
            let mediaType = "none";
            if( data 
                && data.nunaliit_attachments
                && data.nunaliit_attachments.files
                && attMediaName ) {
                attMediaDesc = data.nunaliit_attachments.files[attMediaName];
    
                if( attMediaDesc
                    && (attMediaDesc.fileClass !== 'video' && attMediaDesc.fileClass !== 'audio')){
                    attMediaDesc = undefined;
                }
                else if (attMediaDesc && attMediaDesc.fileClass) {
                    mediaType = attMediaDesc.fileClass;
                }
            }
    
            var thumbnailUrl = null;
            if( attMediaDesc
                && attMediaDesc.thumbnail ){
                var attThumb = this.attachmentService.getAttachment(this.doc, attMediaDesc.thumbnail);
    
                if( attThumb ){
                    thumbnailUrl = attThumb.computeUrl();
                }
            }
    
            var attVideoUrl = undefined;
            if( attMediaDesc 
                && attMediaDesc.status === 'attached' ) {
                var attVideo = this.attachmentService.getAttachment(this.doc, attMediaName);
    
                if( attVideo ){
                    attVideoUrl = attVideo.computeUrl();
                }
            }
    
            if( attVideoUrl ) {
                this.videoId = $n2.getUniqueId();
                this.transcriptId = this.subtitleDivId;
    
                var $mediaDiv = this._getMediaDiv();
                $mediaDiv.empty();
                
                var $video = $('<video>')
                    .attr('id', this.videoId)
                    .attr('controls', 'controls')
                    .attr('width', '100%')
                    .attr('height', '240px')
                    .attr('preload', 'metadata')
                    .appendTo($mediaDiv);
                
                if (mediaType === "video") {
                    $video
                    .attr('width', '100%')
                    .attr('height', '240px');
                }
                else if (mediaType === "audio") {
                    $video
                    .attr('width', '0px')
                    .attr('height', '0px');
                }
    
                var $videoSource = $('<source>')
                    .attr('src', attVideoUrl)
                    .appendTo($video);
    
                if( attMediaDesc.mimeType ){
                    $videoSource.attr('type', attMediaDesc.mimeType);
                }
        
                $video.mediaelementplayer({
                    poster: thumbnailUrl
                    ,alwaysShowControls : true
                    ,pauseOtherPlayers : false
                    ,markerWidth: 5
                    ,features: ['volume', 'playpause', 'current', 'duration', 'progress', 'abrepeat']
                }); 
    
                $video
                    .bind('timeupdate', function() {
                        var currentTime = this.currentTime;
                        _this._updateCurrentTime(currentTime, 'video');
                    })
                    .bind('durationchange', function(e) {
                        _this.loadingDiv.style.display = "none";
                        _this.dispatchService.send(DH, {
                            type: "transcriptVideoDurationChange",
                            value: this.duration
                        });
                        _this.dispatchService.send(DH, {
                            type: _this.intervalSetEventName
                            , value: new $n2.date.DateInterval({
                                min: 0
                                , max: this.duration
                                , ongoing: false
                            })
                        });
                    });

                const slider = $('.mejs__time-slider')
                if (slider) {
                    slider.bind('setmarker', (ev) => {
                        const detail = ev?.originalEvent?.detail
                        if (!detail) return
                        if (detail.marker === 0) {
                            this.minMarkerTime = detail.position
                            this._updateCurrentTime(this.minMarkerTime, 'text');
                        }
                        else if (detail.marker === 1) {
                            this.maxMarkerTime = detail.position
                            this.dispatchService.send(DH, {
                                type: this.intervalSetEventName
                                , value: new $n2.date.DateInterval({
                                    min: this.minMarkerTime
                                    , max: this.maxMarkerTime
                                    , ongoing: false
                                })
                            })
                        }
                    })
                    slider.bind('resetmarkers', () => {
                        this.minMarkerTime = 0
                        this.maxMarkerTime = 0
                    })
                }
                
                if ( this.transcript.fromMediaDoc ){
                    this._getSubtitleSelectionDiv().empty();
                }
                
                if ( this.transcript && this.transcript.srtAttName ){
                    var $transcript = this._getSubtitleDiv();
                    $transcript.empty();
                    prep_transcript($transcript, this.transcript_array);
    
                } else {
                }
                if (this.currentTime !== 0) {
                    this.dispatchService.send(DH, {
                        type: "mediaTimeChanged",
                        name: this.name,
                        currentTime: this.currentTime,
                        origin: "text"
                    });
                }
    
            } else {
                _this._renderError('Can not compute URL for video');
            }
    
            function _rightClickCallback (e, $this, contextMenu, selections){
                var hoveredElem = e.target;
    
                var isEditorAvailable = _this._isAnnotationEditorAvailable();
                
                if( isEditorAvailable ){
                    for(var i =0;i<_this.transcript_array.length;i++) {
                        var transcriptElem = _this.transcript_array[i];
                        var $transcriptElem = $('#'+transcriptElem.id);
                        $transcriptElem.removeClass('sentence-highlight-pending');
                    }
    
                    if (! selections || selections.size() === 0) {
                        return;
                    }
                    
                    var ctxdata = [];
                    var idxOfHoverEl = selections.index(
                        $('div#'+ $(hoveredElem).attr('id'))
                    );
    
                    if (idxOfHoverEl >= 0){
                        selections.each(function(){
                            var $elmnt = $(this);
                            var curStart =$elmnt.attr('data-start');
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
                            .children().each(function(){
                                if ($(this).hasClass('selected')){
                                    $(this).removeClass('selected');
                                }
                            });
                        $(hoveredElem).addClass('selected');
                        
                        var $elmnt = $(hoveredElem);
                        var curStart =$elmnt.attr('data-start');
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
                    
                    contextMenu.data({value: ctxdata});
                    contextMenu[0].style.left = e.pageX + 'px';
                    contextMenu[0].style.top = e.pageY + 'px';
                    contextMenu.removeClass('transcript-context-menu-hide');
                }
            }
    
            function prep_transcript($transcript, transcript_array){
                var currentSelectSentences = undefined;
                
                var contextMenu = $('div.' + _this._contextMenuClass);
                if (contextMenu.length > 0){
                    contextMenu.remove();
                }
    
                var transcript_context_menu_list = $('<ul>');
                var context_menu_text = [
                    'widget.annotationEditor.contextMenu.timeLink',
                    'widget.annotationEditor.contextMenu.mapThemes',
                    'widget.annotationEditor.contextMenu.settings'
                ];
                $.each(context_menu_text, function(i){
                    $('<li/>')
                        .text(_loc(context_menu_text[i]))
                        .click(function(){
                            var senDataArr = contextMenu.data().value;
                            if (senDataArr && senDataArr.length == 1 ){
                                var currentTime = senDataArr[0].start;
                                if (typeof currentTime !== "undefined"){
                                    _this._updateCurrentTime(currentTime, 'startEditing');
                                }
                            }
    
                            if (senDataArr && senDataArr.length > 0){
                                _this._renderDrawer(context_menu_text[i], senDataArr);
                            }
    
                            $('div.' + _this._contextMenuClass).addClass("transcript-context-menu-hide");
                        })
                        .appendTo(transcript_context_menu_list);
                });
    
                contextMenu = $('<div>')
                    .addClass( _this._contextMenuClass)
                    .addClass("transcript-context-menu-hide")
                    .append(transcript_context_menu_list)
                    .appendTo(document.body);
    
                const tagsBySentenceSpanIds = {};
                for (var i = 0,e = transcript_array.length; i < e; i++) {
                    var transcriptElem = transcript_array[i];
                    var DELAY = 300, clicks = 0, timer = null;
                    var id = $n2.getUniqueId();
                    transcriptElem.id = id;
                    tagsBySentenceSpanIds[id] = {
                        start:transcriptElem.startTimeCode
                        ,end : transcriptElem.finTimeCode
                    }
    
                    $('<div>')
                        .attr('id', id)
                        .attr('data-start', transcriptElem.start)
                        .attr('data-fin', transcriptElem.fin)
                        .attr('data-startcode', transcriptElem.startTimeCode)
                        .attr('data-fincode', transcriptElem.finTimeCode)
                        .addClass('n2-transcriptWidget-sentence')
                        .addClass('n2transcript_sentence_' + $n2.utils.stringToHtmlId(id))
                        .html(transcriptElem.text+ " ")
                        .appendTo($transcript)
                }
    
                $('div#'+ _this.transcriptId).multiSelect({
                    unselectOn: 'head',
                    keepSelection: false,
                    stop: function($sel, $elem) {
                        currentSelectSentences = undefined;
                        currentSelectSentences = $sel;
                    }
                });
                
                $('div.n2widgetTranscript_transcript div').on('mouseup', function(e){
                    e.preventDefault();
                    var _that = this;
                    if (e.ctrlKey){
                        e.preventDefault();
                        return false;
                    }
    
                    clicks++;
                    if(clicks === 1) {
                        timer = setTimeout(function() {
                            switch(e.which){
                            case 1:
                                contextMenu.addClass('transcript-context-menu-hide');
                                if (e.ctrlKey || e.metaKey || e.shiftKey){
                                    
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
                        switch(e.which){
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
                .on('dblclick', function(e){
                    e.preventDefault();
                })
                .on ('contextmenu', function(e){
                    e.preventDefault();
                    return true;
                });
                
                _this.dispatchService.send(DH, {
                    type: 'resetDisplayedSentences'
                    ,data: tagsBySentenceSpanIds
                })
                
                $transcript.on('scroll', function(e){
                    e.stopPropagation();
                    contextMenu.addClass('transcript-context-menu-hide');
                    _this._closeDrawer();
                })
            }
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
                        this.currentTime = 0;
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
                        text: srtDoc.atlascine_subtitle.language,
                        lastUpdated: srtDoc.nunaliit_last_updated.time
                    })
                });
                menOpts.sort((a,b) => b.lastUpdated - a.lastUpdated);
            }

            if (menOpts.length > 0) {
                const subSelect = document.createElement("select");
                menOpts.forEach(option => {
                    subSelect.add(new Option(option.text, option.value));
                });
                subSelect.onchange = function() {
                    _this._handleSrtSelectionChanged(this.value)
                }
                const localeCode = $n2.l10n.getLocale()?.lang
                if (localeCode) {
                    const selectedIndex = [...subSelect.options].map(option => option.text).indexOf(localeCode)
                    if (selectedIndex > -1) subSelect.selectedIndex = selectedIndex
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
            if (currentTime !== 0) this.currentTime = currentTime;
            this.dispatchService.send(this.DH, {
                type: 'mediaTimeChanged'
                , name: this.name
                , currentTime: currentTime
                , origin: origin
            });
            if (!this.intervalSetEventName) return;
            if (typeof currentTime === 'number') {
                if (!this.transcriptEventControl.shouldEventEmit(currentTime)) return;
                if (this.minMarkerTime >= 0 && (this.maxMarkerTime > this.minMarkerTime)) return
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
