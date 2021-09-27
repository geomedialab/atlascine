(function ($, $n2) {
    "use strict";

    var DH = 'atlascine';

    const THEME = 'classic';
    const COLORS = {
        "classic": ["#ffa500", "blue", "red", "green", "cyan", "magenta", "yellow", "#0f0"],
        "dark": ["#960", "#003", "#900", "#060", "#099", "#909", "#990", "#090"],
        "pale": ["#fd0", "#369", "#f64", "#3b7", "#880", "#b5d", "#666"],
        "pastel": ["#fb4", "#79c", "#f66", "#7d7", "#acc", "#fdd", "#ff9", "#b9b"],
        "neon": ["#ff0", "#0ff", "#0f0", "#f0f", "#f00", "#00f"]
    }

    /**
     * This is a document transform. This means that it is a document model that
     * changes documents visible to downstream models, widgets and canvas.
     *
     * This transform calculates the populated place point opacity and radius
     * values based on which language varieties are selected (selected values
     * may change based on the use of the language variety filter)
     */
    var CineData2DonutTransform = $n2.Class('CineData2DonutTransform', {

        modelId: null,

        dispatchService: null,

        sourceModelId: null,

        modelIsLoading: null,

        docInfosByDocId: null,

        startTimeByDocId: null,

        currentFilterSelection: null,

        initialize: function (opts_) {
            var opts = $n2.extend({
                modelId: undefined
                , dispatchService: undefined
                , sourceModelId: undefined
            }, opts_);

            var _this = this;

            this.modelId = opts.modelId;
            this.dispatchService = opts.dispatchService;
            this.sourceModelId = opts.sourceModelId;

            this.modelIsLoading = false;
            this.docInfosByDocId = {};
            this.startTimeByDocId = {};
            this.pendingDonutsByDocId = {};
            this.removedDonutsByDocId = {};
            this.locationColorCacheByDocId = {};
            this.colorArr = COLORS[THEME];

            // Register to events
            if (this.dispatchService) {
                var f = function (m, addr, dispatcher) {
                    _this._handle(m, addr, dispatcher);
                };

                this.dispatchService.register(DH, 'modelGetInfo', f);
                this.dispatchService.register(DH, 'modelGetState', f);
                this.dispatchService.register(DH, 'modelStateUpdated', f);
                this.dispatchService.register(DH, 'cineStartTimeFromDocId', f);

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
            var docId, doc, docInfo;
            if ('modelGetInfo' === m.type) {
                if (this.modelId === m.modelId) {
                    m.modelInfo = this._getModelInfo();
                }
            } else if ('modelGetState' === m.type) {
                if (this.modelId === m.modelId) {
                    var added = [];
                    for (docId in this.docInfosByDocId) {
                        docInfo = this.docInfosByDocId[docId];
                        doc = docInfo.doc;
                        if (docInfo.isDonut && doc) {
                            added.push(doc);
                        }
                    }

                    m.state = {
                        added: added
                        , updated: []
                        , removed: []
                        , loading: this.modelIsLoading
                    };
                }
            } else if ('modelStateUpdated' === m.type) {
                // Does it come from our source?
                if (this.sourceModelId === m.modelId) {
                    this._sourceModelUpdated(m.state);
                }
            } else if ('cineStartTimeFromDocId' === m.type) {
                docId = m.docId;
                if (docId
                    && this.startTimeByDocId) {
                    var startTime = this.startTimeByDocId[docId];
                    if (undefined !== startTime) {
                        m.startTime = startTime;
                    }
                }
            }
        },

        _getModelInfo: function () {
            var modelInfo = {
                modelId: this.modelId
                , modelType: 'cineData2DonutTransform'
                , parameters: {}
            };

            return modelInfo;
        },

        _sourceModelUpdated: function (sourceState) {
            var i, e, doc, docId, docInfo, ele;
            var _this = this;
            this.pendingDonutsByDocId = {};
            this.removedDonutsByDocId = {};

            if (typeof sourceState.loading === 'boolean'
                && this.modelIsLoading !== sourceState.loading) {
                this.modelIsLoading = sourceState.loading;
            }

            // Loop through all removed documents
            if (sourceState.removed) {
                for (i = 0, e = sourceState.removed.length; i < e; ++i) {
                    doc = sourceState.removed[i];
                    docId = doc._id;
                    docInfo = this.docInfosByDocId[docId];

                    if (docInfo.isIndex) {
                        //if cinemap is removed; a new cinemap should be added at the same time above
                        this._recomputeTransforms(doc, true);
                    }

                    if (docInfo) {
                        if (docInfo.linkingDonutsId) {
                            for (var donutDocId of docInfo.linkingDonutsId) {
                                var donutDoc = this.docInfosByDocId[donutDocId];
                                this.removedDonutsByDocId[donutDocId] = donutDoc;
                                delete this.docInfosByDocId[donutDocId];
                            }
                        }

                        delete this.docInfosByDocId[docId];
                    }
                }
            }

            // Loop through all added documents
            if (sourceState.added) {
                for (i = 0, e = sourceState.added.length; i < e; ++i) {
                    doc = sourceState.added[i];
                    docId = doc._id;
                    docInfo = createDocInfo(doc);

                    this.docInfosByDocId[docId] = docInfo;
                    this._recomputeTransforms(doc);
                }
            }

            // Loop through all updated documents
            if (sourceState.updated) {
                for (i = 0, e = sourceState.updated.length; i < e; ++i) {
                    doc = sourceState.updated[i];
                    docId = doc._id;
                    docInfo = this.docInfosByDocId[docId];

                    if (!docInfo) {
                        docInfo = createDocInfo(doc);
                        this.docInfosByDocId[docId] = docInfo;

                    } else {
                        var newDocInfo = updateDocInfo(docInfo, doc);
                        this.docInfosByDocId[docId] = newDocInfo;
                    }
                    this._recomputeTransforms(doc);
                }
            }
            // Report changes
            var added = [],
                removed = [],
                updated = [];
            var pendingDonutDocsByDocId = {};
            for (ele in _this.pendingDonutsByDocId) {
                pendingDonutDocsByDocId[ele] = _this.pendingDonutsByDocId[ele].doc;
            }

            var removedDonutDocsByDocId = {};
            for (ele in _this.removedDonutsByDocId) {
                removedDonutDocsByDocId[ele] = _this.removedDonutsByDocId[ele].doc;
            }

            $n2.extend(_this.docInfosByDocId, _this.pendingDonutsByDocId);

            var updatedDonuts = [];
            for (ele in pendingDonutDocsByDocId) {
                if (removedDonutDocsByDocId[ele]) {
                    updatedDonuts.push(pendingDonutDocsByDocId[ele]);
                    delete pendingDonutDocsByDocId[ele];
                    delete removedDonutDocsByDocId[ele];
                }
            }

            var pendingDonuts = $n2.utils.values(pendingDonutDocsByDocId);
            var removedDonuts = $n2.utils.values(removedDonutDocsByDocId);
            removed.push.apply(removed, removedDonuts);
            added.push.apply(added, pendingDonuts);
            updated.push.apply(updated, updatedDonuts);

            this._reportStateUpdate(added, updated, removed);

            function createDocInfo(doc) {
                var docId = doc._id;
                var docInfo = {
                    id: docId
                    , sourceDoc: doc
                    , published: false
                }
                docInfo.doc = Object.assign({}, doc);

                if (doc.atlascine_cinemap) {
                    docInfo.isIndex = true;

                } else {
                    docInfo.isIndex = false;
                }

                docInfo.linkingDonutsId = [];

                return docInfo;
            }

            function updateDocInfo(docInfo, doc) {
                docInfo.sourceDoc = doc;
                docInfo.doc = Object.assign({}, doc);
                if (doc.atlascine_cinemap) {
                    docInfo.isIndex = true;

                } else {
                    docInfo.isIndex = false;
                }

                var oldDonutsId = docInfo.linkingDonutsId;
                if (oldDonutsId
                    && Array.isArray(oldDonutsId)
                    && oldDonutsId.length > 0) {
                    for (var olddonutId of oldDonutsId) {
                        if (_this.docInfosByDocId[olddonutId]) {
                            _this.removedDonutsByDocId[olddonutId] = _this.docInfosByDocId[olddonutId];
                            delete _this.docInfosByDocId[olddonutId];
                        }
                    }
                    docInfo.linkingDonutsId = [];
                }

                if (doc._n2CineIndex
                    && Array.isArray(doc._n2CineIndex)
                    && doc._n2CineIndex.length > 0) {
                    docInfo.linkingDonutsId = [];
                }
                return docInfo;
            }
        },

        _recomputeTransforms: function (doc, isClearance) {
            var _this = this;
            var docId = doc._id;
            var docInfo = this.docInfosByDocId[docId];
            if (isClearance &&
                docInfo.isIndex) {
                for (var id in this.docInfosByDocId) {
                    docInfo = this.docInfosByDocId[id];
                    if (docInfo.linkingDonutsId) {
                        var oldDonutsId = docInfo.linkingDonutsId;
                        if (oldDonutsId
                            && Array.isArray(oldDonutsId)
                            && oldDonutsId.length > 0) {
                            for (var olddonutId of oldDonutsId) {
                                if (_this.docInfosByDocId[olddonutId]) {
                                    _this.removedDonutsByDocId[olddonutId] = _this.docInfosByDocId[olddonutId];
                                    delete _this.docInfosByDocId[olddonutId];
                                }
                            }
                            docInfo.linkingDonutsId = [];
                        }
                    }
                }

            } else if (docInfo.linkingDonutsId) {
                this._populateDocInfosFromDoc(doc);
            }
        },

        getNextColor: function () {
            if (typeof this.color_available_idx === 'undefined') {
                this.color_available_idx = -1;
            }

            this.color_available_idx++;
            var col_len = this.colorArr.length;
            return this.colorArr[this.color_available_idx % col_len];
        },

        _populateDocInfosFromDoc: function (doc) {
            var docId = doc._id;
            var originalDocInfoWithDonutDocRefs = this.docInfosByDocId[docId];

            // remove the geometry info for the original doc
            delete originalDocInfoWithDonutDocRefs.doc['nunaliit_geom'];
            var cnt = 0;
            var cineIndexArr = doc._n2CineIndex;

            if (cineIndexArr
                && cineIndexArr.length >= 1) {
                for (var cidx of cineIndexArr) {
                    var donutId = docId + '_donut_' + cnt.toString(16)
                    var donutDocInfo = {
                        id: donutId
                        , sourceDoc: doc
                        , published: false
                        , isDonut: true
                    }
                    originalDocInfoWithDonutDocRefs.linkingDonutsId.push(donutId);

                    donutDocInfo.doc = {
                        nunaliit_geom: doc.nunaliit_geom
                        , nunaliit_layers: doc.nunaliit_layers
                    };

                    donutDocInfo.doc._id = donutId;
                    var l = cidx.start, r = cidx.end;
                    var ldata_tmp = {
                        start: cidx.start,
                        tags: cidx.tags,
                        timeLinkTags: cidx.timeLinkTags,
                        scaleFactor: cidx.scaleFactor
                    };

                    ldata_tmp.tagGroupColors = cidx.tagGroupColors;

                    // 15 is the magic number for the ring to be drawn on map
                    // need to make sure duration calculated accordingly to make sure item to be drawn

                    var lowerBound = Math.ceil(Math.max((r - l) * cidx.scaleFactor, 15) / cidx.scaleFactor);
                    ldata_tmp.duration = Math.max(r - l, lowerBound);
                    ldata_tmp.style = {
                        name: 'alpha',
                        fillColor: cidx.color,
                        opacity: 0.5
                    };

                    donutDocInfo.doc._ldata = ldata_tmp;

                    // Remember start time given the doc id
                    this.startTimeByDocId[donutId] = cidx.start;

                    this.pendingDonutsByDocId[donutId] = donutDocInfo;
                    cnt++;
                }
            }
        },

        _reportStateUpdate: function (added, updated, removed) {
            var stateUpdate = {
                added: added
                , updated: updated
                , removed: removed
                , loading: this.modelIsLoading
            };

            if (this.dispatchService) {
                this.dispatchService.send(DH, {
                    type: 'modelStateUpdated'
                    , modelId: this.modelId
                    , state: stateUpdate
                });
            }
        }
    });

    Object.assign($n2.atlascine, {
        CineData2DonutTransform: CineData2DonutTransform,
    });

})(jQuery, nunaliit2);

