(function ($, $n2) {
    "use strict";

    var DH = 'atlascine';

    function getRandomColor() {
        var lum = -0.25;
        var hex = String('#' + Math.random().toString(16).slice(2, 8).toUpperCase()).replace(/[^0-9a-f]/gi, '');
        if (hex.length < 6) {
            hex = hex[1] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        var rgb = "#",
            c, i;
        for (i = 0; i < 3; i++) {
            c = parseInt(hex.substr(i * 2, 2), 16);
            c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
            rgb += ("00" + c).substr(c.length);
        }
        return rgb;
    }

    function getColors() {
        return [
            '#00FF00', '#4545E6', '#FF0000', '#14DBDB', '#FF5E5E',
            '#CC66FF', '#116B12', '#4643FA', '#95003A', '#007DB5',
            '#FF00F6', '#892BD6', '#774D00', '#90FB92', '#0076FF',
            '#D5FF00', '#DE492C', '#178A21', '#FF029D', '#FE8900',
            '#852469', '#7E2DD2', '#85A900', '#FF0056', '#A42400',
            '#0A8F69', '#EB3D34', '#5469F0', '#E0792F', '#DE6102',
            '#00B917', '#9E008E', '#2165FC', '#B03560', '#2B993D',
            '#029FD4', '#6AC404', '#E56FFE', '#788231', '#0E4CA1',
            '#2F968E', '#9E5B0E', '#463A94', '#9C750E', '#A10068',
            '#4C9E2E', '#C4549E', '#BFAE19', '#9C1903', '#008F9C',
            '#69C72A', '#7544B1', '#FF00B3', '#02B354', '#FF6E41',
            '#007546', '#B500FF', '#5FAD4E', '#A75740', '#399668',
         ];
     }

    function convertTimecodeToMs(tmpTimecode) {
        var reTimeCode_s = /([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2})((\,|\.)([0-9]+))?\s*/i;
        var rst, matcher;
        try {
            if (!tmpTimecode) {
                throw new Error('Error: timecode is null');
            }
            matcher = reTimeCode_s.exec(tmpTimecode);
            rst = 3600000 * matcher[1] + 60000 * matcher[2] + 1000 * matcher[3] + 1 * matcher[6];
        } catch (err) { }

        return rst;
    }

    var timestampToSeconds = function (timestampStr) {
        var reTimeCode = /([0-9][0-9]):([0-9][0-9]):([0-9][0-9])((\,|\.)[0-9]+)?/i;
        var tmpTimecode = timestampStr.replace(/^\s+|\s+$/g, '');
        if (!tmpTimecode || tmpTimecode === '') {
            return undefined;
        }

        var matcher = reTimeCode.exec(tmpTimecode);
        if (!matcher) {
            return undefined;
        }

        var seconds = 3600 * matcher[1] + 60 * matcher[2] + 1 * matcher[3];

        return seconds;
    };

    var TagUtility = $n2.Class('TagUtility', {

        name: null,

        dispatchService: null,

        eventService: null,

        atlasDb: null,

        customService: null,

        showService: null,

        sourceModelId: undefined,

        initialize: function (opts_) {
            var opts = $n2.extend({
                name: undefined
                , dispatchService: null
                , eventService: null
                , atlasDb: null
                , sourceModelId: null
                , customService: null
                , showService: null
            }, opts_);

            var _this = this;

            this.name = opts.name;
            this.dispatchService = opts.dispatchService;
            this.eventService = opts.eventService;
            this.atlasDb = opts.atlasDb;
            this.customService = opts.customService;
            this.showService = opts.showService;
            this.sourceModelId = opts.sourceModelId;
            this.colorProfile = undefined;
            this.tagsBySentenceSpanIds = {};

            if (!this.dispatchService) {
                throw new Error('ColorUtility requires dispatchService');
            }
            if (this.dispatchService) {
                var f = function (m, addr, dispatcher) {
                    _this._handle(m, addr, dispatcher);
                };

                this.dispatchService.register(DH, 'modelStateUpdated', f);
                this.dispatchService.register(DH, 'resetDisplayedSentences', f);
            }

            var m = {
                type: 'modelGetState'
                , modelId: this.sourceModelId
            };
            this.dispatchService.synchronousCall(DH, m);
            if (m.state) {
                this._sourceModelUpdated(m.state);
            }
            $n2.log(this._classname, this);
        },

        _handle: function (m, addr, dispatcher) {
            if ('tagUtilityAvailable' === m.type) {
                m.available = true;

            } else if ('modelStateUpdated' === m.type) {
                // Does it come from our source?
                    if (this.sourceModelId === m.modelId) {
                        this._cinemapUpdate(m.state);
                    }

            } else if ('resetDisplayedSentences' === m.type) {
                this.tagsBySentenceSpanIds = m.data;
                this._refresh();
                this._reply()
            }
        },

        _reply: function (nextStop) {
            var _this = this;
            if (this.tagsBySentenceSpanIds) {
                this.dispatchService.send(DH, {
                    type: 'replyColorForDisplayedSentences'
                    , data: _this.tagsBySentenceSpanIds
                });
            }
        },

        _cinemapUpdate: function (sourceState) {
            var i, e, doc, docId;
            var forceSingleCinemap = true;
            var removed = [];
            var added = [];
            var updated = [];
            var cinemapChanged = false;
            var cinemapUpdated = false;

            if (typeof sourceState.loading === 'boolean'
                && this.modelIsLoading !== sourceState.loading) {
                this.modelIsLoading = sourceState.loading;
            }

            if (sourceState.removed) {
                for (i = 0, e = sourceState.removed.length; i < e; ++i) {
                    doc = sourceState.removed[i];
                    docId = doc._id;
                    if (doc.atlascine_cinemap) {
                        delete this.cineIndexByDocId[docId];
                        cinemapChanged = true;
                        removed.push(doc);
                    }
                }
            }

            if (sourceState.added) {
                for (i = 0, e = sourceState.added.length; i < e; ++i) {
                    doc = sourceState.added[i];
                    docId = doc._id;
                    if (forceSingleCinemap) {
                        this.cineIndexByDocId = {};
                    }

                    if (doc.atlascine_cinemap) {
                        cinemapChanged = true;
                        this.cineIndexByDocId[docId] = doc;
                        added.push(doc);
                    }
                }
            }

            // Loop through all updated documents
            if (sourceState.updated) {
                for (i = 0, e = sourceState.updated.length; i < e; ++i) {
                    doc = sourceState.updated[i];
                    docId = doc._id;
                    if (doc.atlascine_cinemap) {
                        cinemapUpdated = true;
                        this.cineIndexByDocId[docId] = doc;
                        updated.push(doc);
                    }
                }
            }

            if (cinemapChanged) {
                this.tagsBySentenceSpanIds = null;
            }

            this._refresh();
            this._reply();
        },

        _refresh: function () {
            if (!this.tagsBySentenceSpanIds) {
                return;
            }

            for (var docId in this.cineIndexByDocId) {
                var indexDoc = this.cineIndexByDocId[docId];
                var timeLinks = indexDoc.atlascine_cinemap.timeLinks;
                var tagGroupsProfile = undefined;
                var tagColorProfile = undefined;
                if (indexDoc.atlascine_cinemap.tagGroups) {
                    tagGroupsProfile = indexDoc.atlascine_cinemap.tagGroups;
                }

                if (indexDoc.atlascine_cinemap.tagColors) {
                    tagColorProfile = indexDoc.atlascine_cinemap.tagColors;
                    if (!timeLinks) {
                        return;
                    }

                    for (var spanId in this.tagsBySentenceSpanIds) {
                        var original = this.tagsBySentenceSpanIds[spanId];
                        var start = original.start;
                        var end = original.end;
                        var tags = [];
                        var atleastOne = false;
                        var matchingLinks = findTimeLink(timeLinks, start, end);
                        for (var timeLink of matchingLinks) {
                            var referenceDocTags = timeLink.tags;

                            if (referenceDocTags
                                && Array.isArray(referenceDocTags)
                                && referenceDocTags.length > 0) {
                                for (var tag of referenceDocTags) {
                                    var tagVal = tag.value;
                                    var tagsFromTagsGroup = findTagsIncluded(tagGroupsProfile, tagVal);
                                    if (tagsFromTagsGroup.length == 0) {
                                        tagsFromTagsGroup.push(tagVal);
                                    }
                                    tags.push.apply(tags, tagsFromTagsGroup);
                                    atleastOne = true;
                                }
                            }
                        }

                        var color = findUniqueColorByTags(tagColorProfile, tags);
                        if (atleastOne && !color) {
                            color = '#e6e6e6';
                        }

                        this.tagsBySentenceSpanIds[spanId] = {
                            ...this.tagsBySentenceSpanIds[spanId]
                            , color
                            , tags
                        };
                    }
                }
            }

            function findTimeLink(timeLinks, startTime, endTime) {
                var result = [];
                var timeLink;
                var target_start = convertTimecodeToMs(startTime);
                var target_end = convertTimecodeToMs(endTime);
                if (target_start >= 0 && target_end) {
                    for (var i = 0, e = timeLinks.length; i < e; i++) {
                        try {
                            timeLink = timeLinks[i];
                            var start_in_ms = convertTimecodeToMs(timeLink.starttime);
                            var end_in_ms = convertTimecodeToMs(timeLink.endtime);
                            if (start_in_ms >= 0 &&
                                end_in_ms &&
                                start_in_ms === target_start &&
                                end_in_ms === target_end) {
                                result.push(timeLink);
                            }

                        } catch (err) {
                            continue;
                        }
                    }
                }

                return result;
            }

            function findTagsIncluded(tagsProfile, tag) {
                var rst = [];
                if (tagsProfile) {
                    Object.entries(tagsProfile).forEach(group => {
                        group[1].forEach(theme => {
                            if (tag === theme) {
                                rst.push(group[0])
                            }
                        });
                    });
                }
                return rst;
            }

            function gen_path(path, curnode, tagsProfile, rst, tag) {
                var innertag, newPath;
                if (curnode === tag) {
                    rst.push.apply(rst, path);
                }

                if (tagsProfile && Array.isArray(tagsProfile)) {
                    for (innertag of tagsProfile) {
                        newPath = path.slice(0);
                        newPath.push(innertag);
                        gen_path(newPath, innertag, null, rst, tag);
                    }

                } else if (tagsProfile && typeof tagsProfile === 'object') {
                    for (innertag in tagsProfile) {
                        newPath = path.slice(0);
                        newPath.push(innertag);
                        gen_path(newPath, innertag, tagsProfile[innertag], rst, tag);
                    }
                }
            }

            function findUniqueColorByTags(colorProfile, tagsArr) {
                var rst = undefined;
                if (colorProfile) {
                    for (var tag of tagsArr) {
                        if (tag in colorProfile
                            && colorProfile[tag]
                            && typeof colorProfile[tag] === "string"
                            && colorProfile[tag] !== "") {
                            rst = colorProfile[tag];
                        }
                    }
                }
                return rst;
            }

        },
        _sourceModelUpdated: function (sourceState) {

        }
    });

    var ColorUtility = $n2.Class('ColorUtility', {

        name: null,

        dispatchService: null,

        eventService: null,

        atlasDb: null,

        customService: null,

        showService: null,

        sourceModelId: undefined,

        initialize: function (opts_) {
            var opts = $n2.extend({
                name: undefined
                , dispatchService: null
                , eventService: null
                , atlasDb: null
                , sourceModelId: null
                , customService: null
                , showService: null
            }, opts_);

            var _this = this;

            this.name = opts.name;
            this.dispatchService = opts.dispatchService;
            this.eventService = opts.eventService;
            this.atlasDb = opts.atlasDb;
            this.customService = opts.customService;
            this.showService = opts.showService;
            this.sourceModelId = opts.sourceModelId;
            this.colorProfile = undefined;

            if (!this.dispatchService) {
                throw new Error('ColorUtility requires dispatchService');
            }

            if (this.dispatchService) {
                var f = function (m, addr, dispatcher) {
                    _this._handle(m, addr, dispatcher);
                };
                this.dispatchService.register(DH, 'colorUtilityAvailable', f);
                this.dispatchService.register(DH, 'colorUtility--getColor', f);
                this.dispatchService.register(DH, 'colorUtility--setGroup', f);
                this.dispatchService.register(DH, 'colorUtility--setGroupColorMapping', f);
                this.dispatchService.register(DH, 'colorUtility--colorProfileUpdate', f);
                this.dispatchService.register(DH, 'modelStateUpdated', f);
            }

            var m = {
                type: 'modelGetState'
                , modelId: this.sourceModelId
            };
            this.dispatchService.synchronousCall(DH, m);
            if (m.state) {
                this._sourceModelUpdated(m.state);
            }
            $n2.log(this._classname, this);
        },

        _handle: function (m, addr, dispatcher) {
            var _this = this;
            if ('colorUtilityAvailable' === m.type) {
                m.available = true;
            } else if ('colorUtility--getColor' === m.type) {
                // Does it come from one of our sources?
                var target = m.target;
                var unicode = m.unicode;
                var rstcolor = _this._getColor(target);
                if (rstcolor) {
                    _this.dispatchService.send({
                        type: 'colorUtility--replyColor'
                        , unicode: unicode
                        , color: rstcolor
                    });
                }

            } else if ('colorUtility--setGroup' === m.type) {
                // Does it come from one of our sources?
                var group = m.group;
                m.color = _this._getSelection();

            } else if ('colorUtility--setGroupColorMapping' === m.type) {
                // Does it come from one of our sources?
                var mapping = m.mapping;
                m.color = _this._getSelection();

            } else if ('colorUtility--colorProfileUpdate' === m.type) {
                _this.colorProfile = m.colorProfile;

            } else if ('modelStateUpdated' === m.type) {
                // Does it come from our source?
                if (this.sourceModelId === m.modelId) {
                    this._sourceModelUpdated(m.state);
                }
            }
        },

        _getColor: function (tagsArr) {
            var colorProfile = this.colorProfile;
            var rst = 'pink';
            return rst;
        },

        _sourceModelUpdated: function (sourceState) {

        }
    });

    var GetSelectionUtility = $n2.Class('GetSelectionUtility', {

        name: null,

        dispatchService: null,

        eventService: null,

        atlasDb: null,

        customService: null,

        showService: null,

        initialize: function (opts_) {
            var opts = $n2.extend({
                name: undefined
                , dispatchService: null
                , eventService: null
                , atlasDb: null
                , customService: null
                , showService: null
            }, opts_);

            var _this = this;

            this.name = opts.name;
            this.dispatchService = opts.dispatchService;
            this.eventService = opts.eventService;
            this.atlasDb = opts.atlasDb;
            this.customService = opts.customService;
            this.showService = opts.showService;


            if (typeof rangy === undefined) {
                throw new Error('GetSelectionUtility requires rangy(1.3.0)');
            }

            if (!this.dispatchService) {
                throw new Error('GetSelectionUtility requires dispatchService');
            }

            if (this.dispatchService) {
                var f = function (m, addr, dispatcher) {
                    _this._handle(m, addr, dispatcher);
                };
                this.dispatchService.register(DH, 'getSelectionUtilityAvailable', f);
                this.dispatchService.register(DH, 'getSelectionUtility--getSelection', f);
            }

            rangy.init();
            $n2.log(this._classname, this);
        },

        _getSelection() {
            var rangeSel = rangy.getSelection().toHtml();
            return $(rangeSel);
        },

        _handle(m, addr, dispatcher) {
            var _this = this;

            if ('getSelectionUtilityAvailable' === m.type) {

                m.available = true;

            } else if ('getSelectionUtility--getSelection' === m.type) {
                // Does it come from one of our sources?
                m.selection = _this._getSelection();
            }
        }
    });

    var PlaceUtility = $n2.Class('PlaceUtility', {

        initialize: function (opts_) {
            var opts = $n2.extend({
                name: undefined
                , dispatchService: null
                , eventService: null
                , atlasDb: null
                , customService: null
                , showService: null
                , popupMaxLines: 12
                , suppressEmptySelection: false
                , forceEmptyFocus: false
                , sourceModelId: undefined
            }, opts_);

            var _this = this;

            this.name = opts.name;
            this.dispatchService = opts.dispatchService;
            this.eventService = opts.eventService;
            this.atlasDb = opts.atlasDb;
            this.customService = opts.customService;
            this.showService = opts.showService;
            this.sourceModelId = opts.sourceModelId;
            this._docIdByPlacename = undefined;

            if (!this.dispatchService) {
                throw new Error('CinemaSelectionRedirector requires dispatchService');
            }

            if (this.dispatchService) {
                var f = function (m, addr, dispatcher) {
                    _this._handle(m, addr, dispatcher);
                };
                this.dispatchService.register(DH, 'PlaceUtility--getExistingPlaces', f);
                this.dispatchService.register(DH, 'PlaceUtility--getPlaceDocIdMap', f);
                this.dispatchService.register(DH, 'modelStateUpdated', f);

                // Initialize state
                var m = {
                    type: 'modelGetState'
                    , modelId: this.sourceModelId
                };
                this.dispatchService.synchronousCall(DH, m);
                if (m.state) {
                    this._sourceModelUpdated(m.state);
                }
            }
            $n2.log(this._classname, this);
        },

        _handle: function (m, addr, dispatcher) {
            var _this = this;
            if ('PlaceUtility--getExistingPlaces' === m.type) {
                if (!_this._docIdByPlacename) {
                    return;
                } else {
                    var exstPlaces = [];
                    for (var place in this._docIdByPlacename) {
                        exstPlaces.push(place);
                    }
                    m.existingPlaces = exstPlaces;
                }

            } else if ('modelStateUpdated' === m.type) {
                // Does it come from our source?
                if (this.sourceModelId === m.modelId) {
                    this._sourceModelUpdated(m.state);
                }

            } else if ('PlaceUtility--getPlaceDocIdMap' === m.type) {
                var m = {
                    type: 'PlaceUtility--replyPlaceDocIdMap',
                    map: this._docIdByPlacename
                }
                this.dispatchService.send(DH, m);
            }
        },

        reportCinemapPlaceUpdate: function () {
            var m = {
                type: 'PlaceUtility--updatePlaceDocIdMap'
                , map: this._docIdByPlacename
            }
            this.dispatchService.send(DH, m);
        },

        _sourceModelUpdated: function (sourceState) {
            var i, e, doc, docId, promise;
            var _this = this;
            if (sourceState.added) {
                for (i = 0, e = sourceState.added.length; i < e; ++i) {
                    doc = sourceState.added[i];
                    docId = doc._id;
                    promise = updateDocIdByPlacename(doc, 'ADD');
                    // Save info
                }
            }

            // Loop through all updated documents
            if (sourceState.updated) {
                for (i = 0, e = sourceState.updated.length; i < e; ++i) {
                    doc = sourceState.updated[i];
                    docId = doc._id;
                    promise = updateDocIdByPlacename(doc, 'UPDATE');
                    // Save info
                }
            }

            // Loop through all removed documents
            if (sourceState.removed) {
                for (i = 0, e = sourceState.removed.length; i < e; ++i) {
                    doc = sourceState.removed[i];
                    docId = doc._id;
                    promise = updateDocIdByPlacename(doc, 'REMOVE');
                    // Save info
                }
            }

            _this.reportCinemapPlaceUpdate();
            function updateDocIdByPlacename(doc, updateOp) {
                var placeAtt, name;
                switch (updateOp) {
                    case 'ADD':
                        placeAtt = doc.atlascine_place;
                        name = placeAtt.name;
                        if (name) {
                            name = name.trim().toLowerCase()

                        } else {
                            $n2.log('place document suppose to have atlascine_place.name attribute');
                            return;
                        }

                        if (name && doc.nunaliit_geom) {
                            if (!_this._docIdByPlacename) {
                                _this._docIdByPlacename = {};
                            }
                            _this._docIdByPlacename[name] = doc;
                        }

                        break;

                    case 'UPDATE':
                        placeAtt = doc.atlascine_place;
                        name = placeAtt.name;
                        if (name) {
                            name = name.trim().toLowerCase()

                        } else {
                            $n2.log('place document suppose to have atlascine_place.name attribute');
                            return;
                        }

                        if (name && doc.nunaliit_geom) {
                            if (!_this._docIdByPlacename) {
                                _this._docIdByPlacename = {};
                            }
                            _this._docIdByPlacename[name] = doc;
                        }
                        break;

                    case 'REMOVE':
                        placeAtt = doc.atlascine_place;
                        name = placeAtt.name;
                        if (name) {
                            name = name.trim().toLowerCase()

                        } else {
                            $n2.log('place document suppose to have atlascine_place.name attribute');
                            return;
                        }

                        delete _this._docIdByPlacename[name];
                        break;
                }
            }
        },
    });

    Object.assign($n2.atlascine, {
        TagUtility: TagUtility,
        ColorUtility: ColorUtility,
        GetSelectionUtility: GetSelectionUtility,
        PlaceUtility: PlaceUtility,
        convertTimecodeToMs: convertTimecodeToMs,
        timestampToSeconds: timestampToSeconds,
        getRandomColor: getRandomColor,
        getColors: getColors,
    });

})(jQuery, nunaliit2);
