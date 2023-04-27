(function ($, $n2) {
    "use strict";

    var DH = 'atlascine';

    function createDocInfo(doc) {
        var docId = doc._id;
        if (doc.atlascine_cinemap) {
            return null;
        }
        var docInfo = {
            id: docId
            , sourceDoc: doc
            , published: false
        };

        docInfo.doc = {};
        for (var key in doc) {
            docInfo.doc[key] = doc[key];
        }
        return docInfo;
    }

    function updateDocInfo(docInfo, doc) {
        docInfo.sourceDoc = doc;

        docInfo.doc = {};
        for (var key in doc) {
            docInfo.doc[key] = doc[key];
        }
        return docInfo;
    }

    function findPlaceDocTags(tags) {
        var rst = undefined;
        tags.forEach(function (tag) {
            if ('place' === tag.type || 'location' === tag.type) {
                if (!rst) {
                    rst = [];
                }
                rst.push(tag);
            }
        })
        return rst;
    }

    function findTagsIncluded(tagsProfile, tag) {
        var rst = [];
        if (tagsProfile) {
            gen_path([], "", tagsProfile, rst, tag);
        }
        return rst;
    }

    function gen_path(path, curnode, tagsProfile, rst, tag) {
        var innertag, newPath;
        if (curnode === tag) {
            rst.push.apply(rst, path);
        }

        if (tagsProfile && $n2.isArray(tagsProfile)) {
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

    function isThemeInGroupTags(themes, groupTags) {
        var groupTagsMap = groupTags.reduce((acc, tag) => {
            acc[tag] = true;
            return acc;
        }, {});

        return themes ? themes.every(theme => theme in groupTagsMap) : false;
    }

    var ThemeIndexTransform = $n2.Class('ThemeIndexTransform', $n2.modelTime.TimeIntervalModel, {

        sourceModelId: null,

        docInfosByDocId: null,

        themeIndexByDocId: null,

        modelIsLoading: null,

        currentThemes: null,

        initialize: function (opts_) {
            var opts = $n2.extend({
                dispatchService: null,
                modelId: null,
                range: null,
                sourceModelId: null,
            }, opts_);

            $n2.modelTime.TimeIntervalModel.prototype.initialize.apply(this, arguments);

            var _this = this;

            this.sourceModelId = opts.sourceModelId;
            this.docInfosByDocId = {};
            this.themeIndexByDocId = {};
            this.cineThemeByDocId = {};
            this.modelIsLoading = false;
            this._placeDocIdMap = null;

            this.__DEFAULT_TAGSETTINGS__ = {
                globalScaleFactor: 1,
                globalTimeOffset: 0.5,
                globalDefaultPlaceZoomLevel: 10
            };

            if (this.dispatchService) {
                var f = function (m, addr, dispatcher) {
                    _this._handle(m, addr, dispatcher);
                };
                this.dispatchService.register(DH, 'modelGetInfo', f);
                this.dispatchService.register(DH, 'modelGetState', f);
                this.dispatchService.register(DH, 'modelStateUpdated', f);
                this.dispatchService.register(DH, 'PlaceUtility--replyPlaceDocIdMap', f);
                this.dispatchService.register(DH, 'PlaceUtility--updatePlaceDocIdMap', f);
                this.dispatchService.register(DH, 'themeChanged', f);

                var m = {
                    type: 'modelGetState',
                    modelId: this.sourceModelId
                };
                this.dispatchService.synchronousCall(DH, m);
                if (m.state) {
                    this._locationUpdated(m.state);
                }
            }

            $n2.log('ThemeIndexTransform', this);
        },

        _intervalUpdated: function () { },

        _handle: function (m) {
            if ('modelGetInfo' === m.type) {
                if (this.modelId === m.modelId) {
                    m.modelInfo = this._getModelInfo();
                }
            } else if ('PlaceUtility--replyPlaceDocIdMap' === m.type) {
                this._placeDocIdMap = m.map;
                if (this._placeDocIdMap) {
                    this._recomputeTransforms();
                }
            } else if ('PlaceUtility--updatePlaceDocIdMap' === m.type) {
                this._placeDocIdMap = m.map;
                if (this._placeDocIdMap) {
                    this._recomputeTransforms();
                }
            } else if ('themeChanged' === m.type) {
                this.currentThemes = m.data.themes;
                this._themeUpdated(m.data.state);
            } else if ('modelGetState' === m.type) {
                if (this.modelId === m.modelId) {
                    var added = [];
                    for (var docId in this.docInfosByDocId) {
                        var docInfo = this.docInfosByDocId[docId];
                        var doc = docInfo.doc;
                        added.push(doc);
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
                    this._locationUpdated(m.state);
                }
            }
        },

        _getModelInfo: function () {
            var info = {
                modelId: this.modelId
                , modelType: 'themeIndexTransform'
                , parameters: {}
            };

            this._addModelInfoParameters(info);
            return info;
        },

        _locationUpdated: function (sourceState) {
            if (sourceState.added.length === 0 && sourceState.updated.length === 0 && sourceState.removed.length === 0) return;
            var i, e, doc, docId, docInfo;

            if (typeof sourceState.loading === 'boolean'
                && this.modelIsLoading !== sourceState.loading) {
                this.modelIsLoading = sourceState.loading;
            }

            if (sourceState.added) {
                for (i = 0, e = sourceState.added.length; i < e; ++i) {
                    doc = sourceState.added[i];
                    docId = doc._id;
                    docInfo = createDocInfo(doc);

                    if (docInfo) {
                        this.docInfosByDocId[docId] = docInfo;
                    }
                }
            }

            if (sourceState.updated) {
                for (i = 0, e = sourceState.updated.length; i < e; ++i) {
                    doc = sourceState.updated[i];
                    docId = doc._id;
                    docInfo = this.docInfosByDocId[docId];
                    if (!docInfo) {
                        docInfo = createDocInfo(doc);

                        if (docInfo) {
                            this.docInfosByDocId[docId] = docInfo;
                        }
                    } else {
                        var newDocInfo = updateDocInfo(docInfo, doc);

                        this.docInfosByDocId[docId] = newDocInfo;
                        newDocInfo.updated = true;
                    }
                }
            }

            if (sourceState.removed) {
                for (i = 0, e = sourceState.removed.length; i < e; ++i) {
                    doc = sourceState.removed[i];
                    docId = doc._id;
                    docInfo = this.docInfosByDocId[docId];
                    if (docInfo) {
                        delete this.docInfosByDocId[docId];
                    }
                    delete this.themeIndexByDocId[docId];
                }
            }

            this._recomputeTransforms();
        },

        _themeUpdated: function (sourceState) {
            var i, e, doc, docId;
            if (typeof sourceState.loading === 'boolean' && this.modelIsLoading !== sourceState.loading) {
                this.modelIsLoading = sourceState.loading;
            }

            if (sourceState.removed) {
                for (i = 0, e = sourceState.removed.length; i < e; ++i) {
                    doc = sourceState.removed[i];
                    docId = doc._id;
                    if (doc.atlascine_cinemap) {
                        delete this.themeIndexByDocId[docId];
                    }
                }
            }

            if (sourceState.added) {
                for (i = 0, e = sourceState.added.length; i < e; ++i) {
                    doc = sourceState.added[i];
                    docId = doc._id;

                    if (doc.atlascine_cinemap) {
                        this.themeIndexByDocId[docId] = doc;
                    }
                }
            }

            if (sourceState.updated) {
                for (i = 0, e = sourceState.updated.length; i < e; ++i) {
                    doc = sourceState.updated[i];
                    docId = doc._id;
                    if (doc.atlascine_cinemap) {
                        this.themeIndexByDocId[docId] = doc;
                    }
                }
            }

            this._clearLocations();
            this._recomputeTransforms();
        },


        _clearLocations: function () {
            for (var docId in this.docInfosByDocId) {
                var docInfo = this.docInfosByDocId[docId];
                docInfo.cineIndex = undefined;
                docInfo.doc._n2CineIndex = undefined;
                docInfo.published = false;
            }
        },

        _recomputeTransforms: function () {
            var _this = this;
            var tagGroupsProfile, _scaleFactor, _timeOffset, _defaultPlaceZoomLevel;

            if (!this._placeDocIdMap) {
                var msg = {
                    type: 'PlaceUtility--getPlaceDocIdMap',
                    docId: undefined
                };
                _this.dispatchService.send(DH, msg);
                return;
            }

            var colors = $n2.atlascine.getColors();

            for (var indexId in this.themeIndexByDocId) {
                var indexDoc = this.themeIndexByDocId[indexId];
                if (indexDoc?.atlascine_cinemap?.published === false) continue;

                if (colors.length > 0) {
                    indexDoc._color = colors.shift();
                } else {
                    indexDoc._color = $n2.atlascine.getRandomColor();
                }

                if (indexDoc.atlascine_cinemap.tagGroups) {
                    tagGroupsProfile = indexDoc.atlascine_cinemap.tagGroups;
                }

                if (indexDoc.atlascine_cinemap.settings) {
                    _scaleFactor = indexDoc.atlascine_cinemap.settings.globalScaleFactor;
                    const offsetInSetting = indexDoc.atlascine_cinemap.settings.globalTimeOffset;
                    _timeOffset = offsetInSetting ? offsetInSetting : 0.5;
                    const defaultPlaceZoom = indexDoc.atlascine_cinemap.settings.globalDefaultPlaceZoomLevel;
                    _defaultPlaceZoomLevel = defaultPlaceZoom ? defaultPlaceZoom : 10;
                } else {
                    indexDoc.atlascine_cinemap.settings = _this.__DEFAULT_TAGSETTINGS__;
                    _scaleFactor = indexDoc.atlascine_cinemap.settings.globalScaleFactor;
                    _timeOffset = indexDoc.atlascine_cinemap.settings.globalTimeOffset;
                    _defaultPlaceZoomLevel = indexDoc.atlascine_cinemap.settings.globalDefaultPlaceZoomLevel;
                }

                if (indexDoc && indexDoc.atlascine_cinemap && indexDoc.atlascine_cinemap.timeLinks) {
                    indexDoc.atlascine_cinemap.timeLinks.forEach(function (timeLink) {
                        if (!timeLink || !timeLink.starttime || !timeLink.endtime || !timeLink.tags) return;

                        var referenceDocTags = timeLink.tags;
                        var placeTags = findPlaceDocTags(referenceDocTags);
                        if (placeTags) {
                            placeTags.forEach(function (tag) {
                                var timeLinkTags = {
                                    placeTag: '',
                                    groupTags: [],
                                    themeTags: []
                                };
                                var placeName = tag.value;
                                var _name = placeName.trim().toLowerCase();
                                var referencedDoc = _this._placeDocIdMap[_name];

                                if (_name) {
                                    timeLinkTags.placeTag = placeName;
                                }

                                if (!referencedDoc) return;

                                var referencedDocId = referencedDoc._id;
                                var referencedDocInfo = _this.docInfosByDocId[referencedDocId];
                                var start = undefined;
                                var end = undefined;

                                if (typeof timeLink.starttime === 'string') {
                                    start = $n2.atlascine.timestampToSeconds(timeLink.starttime);
                                }

                                if (typeof timeLink.endtime === 'string') {
                                    end = $n2.atlascine.timestampToSeconds(timeLink.endtime);
                                }

                                var tags = [];
                                if (referenceDocTags && $n2.isArray(referenceDocTags) && referenceDocTags.length > 0) {
                                    for (var tag of referenceDocTags) {
                                        var tagVal = tag.value;
                                        var tagGroupsProfileKeys = Object.keys(tagGroupsProfile);
                                        var tagsFromTagsGroup = findTagsIncluded(tagGroupsProfile, tagVal);
                                        if (tagsFromTagsGroup.length === 0) {
                                            tagsFromTagsGroup.push(tagVal);
                                        }

                                        if (tag.type != 'place' && timeLinkTags.themeTags.indexOf(tagVal) < 0) {
                                            timeLinkTags.themeTags.push(tagVal);

                                            for (var i = 0; i < tagGroupsProfileKeys.length; ++i) {
                                                var tagGroupName = tagGroupsProfileKeys[i];
                                                var tagGroupTags = tagGroupsProfile[tagGroupName];
                                                tagGroupTags = tagGroupTags.map(tag => tag.trim());

                                                if (tagGroupTags.indexOf(tagVal) >= 0 && timeLinkTags.groupTags.indexOf(tagGroupName) < 0) {
                                                    timeLinkTags.groupTags.push(tagGroupName);
                                                }
                                            }
                                        }
                                        tags.push.apply(tags, tagsFromTagsGroup);
                                    }
                                }

                                var isPlaceThemed = isThemeInGroupTags(_this.currentThemes, timeLinkTags.groupTags)

                                if (referencedDocInfo
                                    && typeof start === 'number'
                                    && typeof end === 'number'
                                    && $n2.isArray(tags)
                                    && isPlaceThemed
                                ) {
                                    if (!referencedDocInfo.cineIndex) {
                                        referencedDocInfo.cineIndex = [];
                                    }

                                    var indexInfo = {};
                                    indexInfo.origin = indexDoc._id;
                                    indexInfo.title = indexDoc.atlascine_cinemap.title;
                                    indexInfo.color = indexDoc._color;
                                    indexInfo.start = start;
                                    indexInfo.end = end;
                                    indexInfo.tags = tags
                                    indexInfo.timeLinkTags = timeLinkTags;
                                    indexInfo.scaleFactor = _scaleFactor;
                                    indexInfo.defaultPlaceZoomLevel = _defaultPlaceZoomLevel;
                                    referencedDocInfo.cineIndex.push(indexInfo);
                                }
                            });
                        }
                    });
                }
            }

            var added = [], updated = [], removed = [];
            for (var docId in this.docInfosByDocId) {
                var docInfo = this.docInfosByDocId[docId];
                if (docInfo.cineIndex) {
                    docInfo.doc._n2CineIndex = docInfo.cineIndex;
                    docInfo.published = true;
                    added.push(docInfo.doc);
                } else {
                    removed.push(docInfo.doc);
                }
            }
            this._reportStateUpdate(added, updated, removed);
        },

        _reportStateUpdate: function (added, updated, removed) {
            var stateUpdate = {
                added: added,
                updated: updated,
                removed: removed,
                loading: this.modelIsLoading
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
        ThemeIndexTransform: ThemeIndexTransform,
    });

})(jQuery, nunaliit2);
