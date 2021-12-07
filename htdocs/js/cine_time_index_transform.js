(function ($, $n2) {
    "use strict";

    var DH = 'atlascine';

    var CineTimeIndexTransform = $n2.Class('CineTimeIndexTransform', $n2.modelTime.TimeIntervalModel, {

        sourceModelId: null,

        cinemapModelId: null,

        docInfosByDocId: null,

        cineIndexByDocId: null,

        modelIsLoading: null,

        initialize: function (opts_) {
            var opts = $n2.extend({
                dispatchService: null
                , modelId: null
                , range: null
                , sourceModelId: null
                , cinemapModelId: null
            }, opts_);

            $n2.modelTime.TimeIntervalModel.prototype.initialize.apply(this, arguments);

            var _this = this;

            this.sourceModelId = opts.sourceModelId;
            this.cinemapModelId = opts.cinemapModelId;
            this.docInfosByDocId = {};
            this.cineIndexByDocId = {};
            this.cineThemeByDocId = {};
            this.modelIsLoading = false;
            this._placeDocIdMap = undefined;

            this.__DEFAULT_TAGSETTINGS__ = {
                globalScaleFactor: 1
                , globalTimeOffset: 0.5
            };

            // Register to events
            if (this.dispatchService) {
                var f = function (m, addr, dispatcher) {
                    _this._handle(m, addr, dispatcher);
                };
                this.dispatchService.register(DH, 'modelGetInfo', f);
                this.dispatchService.register(DH, 'modelGetState', f);
                this.dispatchService.register(DH, 'modelStateUpdated', f);
                this.dispatchService.register(DH, 'PlaceUtility--replyPlaceDocIdMap', f);
                this.dispatchService.register(DH, 'PlaceUtility--updatePlaceDocIdMap', f);

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

            $n2.log('CineTimeIndexTransform', this);
        },

        _handle: function (m, addr, dispatcher) {
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
            } else if ('modelGetState' === m.type) {
                // Is this request intended for this time transform?
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
                    this._sourceModelUpdated(m.state);
                } else if (this.cinemapModelId === m.modelId) {
                    this._cinemapUpdate(m.state, true);
                }
            }
        },

        /**
          * Create's an object with model info, and returns it
          * @return {object} info - An object containing the current model's info.
          */
        _getModelInfo: function () {
            var info = {
                modelId: this.modelId
                , modelType: 'cineTimeIndexTransform'
                , parameters: {}
            };

            this._addModelInfoParameters(info);
            return info;
        },

        // Handle source model updates (add, update, and remove source states)
        _sourceModelUpdated: function (sourceState) {
            var i, e, doc, docId, docInfo;
            var removed = [];

            /**
              * Creates a new docInfo object
              * @param {object} doc - Nunaliit document object
              * @return {object} docInfo - object containing relevant doc information;
              * docId, source, a copy of the document, and if it's published.
              */
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

            /**
              * Updates docInfo object by, copying the contents from the doc into
              * the current docInfo object, and then returning this updated docInfo.
              * @param {object} docInfo - Current docInfo object
              * @param {object} doc - Nunaliit document object
              * @return {object} docInfo - Updated docInfo object
              */
            function updateDocInfo(docInfo, doc) {
                docInfo.sourceDoc = doc;

                docInfo.doc = {};
                for (var key in doc) {
                    docInfo.doc[key] = doc[key];
                }
                return docInfo;
            }

            if (typeof sourceState.loading === 'boolean'
                && this.modelIsLoading !== sourceState.loading) {
                this.modelIsLoading = sourceState.loading;
            }

            // Loop through all added documents
            if (sourceState.added) {
                for (i = 0, e = sourceState.added.length; i < e; ++i) {
                    doc = sourceState.added[i];
                    docId = doc._id;
                    docInfo = createDocInfo(doc);

                    // Save info
                    if (docInfo) {
                        this.docInfosByDocId[docId] = docInfo;
                    }
                }
            }

            // Loop through all updated documents
            if (sourceState.updated) {
                for (i = 0, e = sourceState.updated.length; i < e; ++i) {
                    doc = sourceState.updated[i];
                    docId = doc._id;
                    docInfo = this.docInfosByDocId[docId];
                    if (!docInfo) {
                        // If updated document doesn't exist in collection add it.
                        docInfo = createDocInfo(doc);

                        // Save info
                        if (docInfo) {
                            this.docInfosByDocId[docId] = docInfo;
                        }
                    } else {
                        // If updated document exists in collection, update it.
                        var newDocInfo = updateDocInfo(docInfo, doc);

                        this.docInfosByDocId[docId] = newDocInfo;
                        newDocInfo.updated = true;
                    }
                }
            }

            // Loop through all removed documents
            if (sourceState.removed) {
                for (i = 0, e = sourceState.removed.length; i < e; ++i) {
                    doc = sourceState.removed[i];
                    docId = doc._id;
                    docInfo = this.docInfosByDocId[docId];
                    if (docInfo) {
                        delete this.docInfosByDocId[docId];

                        if (docInfo.published) {
                            removed.push(doc);
                        }
                    }
                    delete this.cineIndexByDocId[docId];
                }
            }

            // Report changes in visibility
            this._recomputeTransforms(removed);
        },

        /**
         * Source model update function that's called when the cinemap model is updated.
         * @param {object} sourceState - Object containing cinemap model
         * @param {boolean} forceSingleCinemap - force single cinemap.
         */
        _cinemapUpdate: function (sourceState, forceSingleCinemap) {
            var i, e, doc, docId;
            var removed = [];
            var added = [];
            var updated = [];

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
                        this.cineIndexByDocId[docId] = doc;
                        updated.push(doc);
                    }
                }
            }

            // Loop through all removed documents
            // report cinemap changing
            this._reportStateUpdate(added, updated, removed);

            this._clearN2Index();

            // Report changes in visibility
            this._recomputeTransforms(removed);
        },

        // Clears the _n2CineIndex transformed object from document.
        _clearN2Index: function () {
            for (var docId in this.docInfosByDocId) {
                var docInfo = this.docInfosByDocId[docId];

                // Added or updated?
                if (docInfo.published) {
                    docInfo.newCineIndex = undefined;
                    docInfo.lastCineIndex = undefined;
                    // If not previously published, do it now
                    var doc = docInfo.doc;
                    doc._n2CineIndex = undefined;
                }
            }
        },

        _recomputeTransforms: function (removed) {
            var _this = this;
            var currentInterval = this.getInterval();
            var tagGroupsProfile = undefined;
            var tagColorProfile = undefined;
            var _scaleFactor, _timeOffset;

            /**
             * Finds all tags of type 'place' or 'location'.
             * @param {array} tags - list of tag objects
             * @return {array} rst - list of all place/location tag objects
             */
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

            /**
             * Finds all tag group associated with a specified tag.
             * @param {object} tagsProfile - A collection of tag groups with theme tags associated with those groups
             * @param {string} tag - tag to find in profile of tags.
             * @return {array} rst - list containing the tag and all associated tag groups
             */
            function findTagsIncluded(tagsProfile, tag) {
                var rst = [];
                if (tagsProfile) {
                    gen_path([], "", tagsProfile, rst, tag);
                }
                return rst;
            }

            /**
             * Recursive function to create a list of tags
             * @param {array} path - Current list of collected tags
             * @param {string} curnode - Current node.
             * @param {object} tagsProfile - A collection of tag groups with associated list of theme tags.
             * @param {array} rst - Results array that's updated when the tag === current node.
             * @param {string} tag - tag being searched for.
             */
            function gen_path(path, curnode, tagsProfile, rst, tag) {
                var innertag, newPath;
                if (curnode === tag) {
                    // pushes all tag items in path array into the results tag array
                    rst.push.apply(rst, path);
                }

                if (tagsProfile && $n2.isArray(tagsProfile)) {
                    for (innertag of tagsProfile) {
                        // make a copy of the path array
                        newPath = path.slice(0);
                        newPath.push(innertag);
                        gen_path(newPath, innertag, null, rst, tag);
                    }

                } else if (tagsProfile && typeof tagsProfile === 'object') {
                    for (innertag in tagsProfile) {
                        // make a copy of the path array
                        newPath = path.slice(0);
                        newPath.push(innertag);
                        gen_path(newPath, innertag, tagsProfile[innertag], rst, tag);
                    }
                }
            }

            /**
             * Retrieves the hex colour code string for the provided tags array
             * @param {object} colorProfile - Collection of group tags with associated colours
             * @param {array} tagsArr - A list of tags
             * @return {string} rst - The last encountered hex color code.
             */
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

            /**
             * Various checkes to see if the newly transformed CineIndex is equal to the previous CineIndex.
             * @param {object} lastCineIndex - Previous CineIndex object.
             * @param {object} newCineIndex - New CineIndex object.
             * @return {boolean} - true if equal, false if not.
             */
            function indicesAreEqual(lastCineIndex, newCineIndex) {
                var i, e;
                if (!lastCineIndex && !newCineIndex) {
                    // same
                    return true;
                }

                if (!lastCineIndex) {
                    return false;
                }

                if (!newCineIndex) {
                    return false;
                }

                if (lastCineIndex.length != newCineIndex.length) {
                    return false;
                }

                for (i = 0, e = lastCineIndex.length; i < e; ++i) {
                    var i1 = lastCineIndex[i];
                    var i2 = newCineIndex[i];

                    if (i1.start != i2.start) {
                        return false;
                    }

                    if (i1.end != i2.end) {
                        return false;
                    }

                    if (i1.origin !== i2.origin) {
                        return false;
                    }

                    if (i1.color !== i2.color) {
                        return false;
                    }

                    if (i1.tags.length !== i2.tags.length) {
                        return false;
                    }

                    for (i = 0, e = i2.length; i < e; i++) {
                        if (i2.tags[i] !== i1.tags[i]) {
                            return false;
                        }
                    }
                }
                return true;
            }

            if (!this._placeDocIdMap) {
                var msg = {
                    type: 'PlaceUtility--getPlaceDocIdMap',
                    docId: undefined
                };
                _this.dispatchService.send(DH, msg);
                // Break out of method
                return;
            }

            // Loop over the indices, computing a new cine index for each place document
            for (var indexId in this.cineIndexByDocId) {
                var indexDoc = this.cineIndexByDocId[indexId];

                // Get the tagGroupsProfile
                // tagGroupsProfile contains a collection of group tags and associated theme tags
                if (indexDoc.atlascine_cinemap.tagGroups) {
                    tagGroupsProfile = indexDoc.atlascine_cinemap.tagGroups;
                }

                // Get the tagColorProfile
                // tagColorProfile contains a collection of group tags with corresponding hex color codes.
                if (indexDoc.atlascine_cinemap.tagColors) {
                    tagColorProfile = indexDoc.atlascine_cinemap.tagColors;
                }

                // Get cinemap settings
                // Calculates the scale factor and time offset values for the cinemap
                if (indexDoc.atlascine_cinemap.settings) {
                    _scaleFactor = indexDoc.atlascine_cinemap.settings.globalScaleFactor;
                    var offsetInSetting = indexDoc.atlascine_cinemap.settings.globalTimeOffset;
                    _timeOffset = offsetInSetting ? offsetInSetting : 0.5;

                } else {
                    indexDoc.atlascine_cinemap.settings = _this.__DEFAULT_TAGSETTINGS__;
                    _scaleFactor = indexDoc.atlascine_cinemap.settings.globalScaleFactor;
                    _timeOffset = indexDoc.atlascine_cinemap.settings.globalTimeOffset;
                }

                // Iterate through each timeLink associated with the cinemap document
                // and generate an CineIndex object for each document.
                if (indexDoc
                    && indexDoc.atlascine_cinemap
                    && indexDoc.atlascine_cinemap.timeLinks) {
                    indexDoc.atlascine_cinemap.timeLinks.forEach(function (timeLink) {
                        // Find referenced document
                        if (!timeLink || !timeLink.starttime || !timeLink.endtime || !timeLink.tags) {
                            return;
                        }

                        var referenceDocTags = timeLink.tags;
                        var placeTags = findPlaceDocTags(referenceDocTags);
                        if (placeTags) {
                            placeTags.forEach(function (tag) {
                                // Create a data structure for collecting tags by type
                                var timeLinkTags = {
                                    placeTag: "",
                                    groupTags: [],
                                    themeTags: []
                                };
                                var placeName = tag.value;
                                var _name = placeName.trim().toLowerCase();
                                var referencedDoc = _this._placeDocIdMap[_name];

                                // Add place tag to timeLinkTags
                                if (_name) {
                                    timeLinkTags.placeTag = _name[0].toUpperCase() + _name.substring(1);
                                }

                                if (!referencedDoc) {
                                    return;
                                }

                                var referencedDocId = referencedDoc._id;
                                var referencedDocInfo = _this.docInfosByDocId[referencedDocId];
                                var start = undefined;
                                if (typeof (timeLink.starttime) === 'string') {
                                    start = $n2.atlascine.timestampToSeconds(timeLink.starttime);
                                }

                                var end = undefined;
                                if (typeof (timeLink.endtime) === 'string') {
                                    end = $n2.atlascine.timestampToSeconds(timeLink.endtime);
                                }

                                var tags = [];
                                if (referenceDocTags
                                    && $n2.isArray(referenceDocTags)
                                    && referenceDocTags.length > 0) {
                                    for (var tag of referenceDocTags) {
                                        var tagVal = tag.value;
                                        var tagGroupsProfileKeys = Object.keys(tagGroupsProfile);
                                        var tagsFromTagsGroup = findTagsIncluded(tagGroupsProfile, tagVal);
                                        if (tagsFromTagsGroup.length == 0) {
                                            tagsFromTagsGroup.push(tagVal);
                                        }

                                        // Store group and theme tags in timeLinkTags object.
                                        if (tag.type != 'place'
                                            && timeLinkTags.themeTags.indexOf(tagVal) < 0) {
                                            timeLinkTags.themeTags.push(tagVal);

                                            for (var i = 0; i < tagGroupsProfileKeys.length; i += 1) {
                                                var tagGroupName = tagGroupsProfileKeys[i];
                                                var tagGroupTags = tagGroupsProfile[tagGroupName];

                                                if (tagGroupTags.indexOf(tagVal) >= 0
                                                    && timeLinkTags.groupTags.indexOf(tagGroupName) < 0) {
                                                    timeLinkTags.groupTags.push(tagGroupName);
                                                }
                                            }
                                        }
                                        tags.push.apply(tags, tagsFromTagsGroup);
                                    }
                                }

                                // Compute effective start and end (intersection)
                                if (!currentInterval) {
                                    start = undefined;
                                    end = undefined;
                                } else if (end < currentInterval.min) {
                                    start = undefined;
                                    end = undefined;

                                } else if (typeof currentInterval.max === 'number'
                                    && start > currentInterval.max) {
                                    start = undefined;
                                    end = undefined;

                                } else {
                                    if (start < currentInterval.min) {
                                        start = currentInterval.min;
                                    }

                                    if (typeof currentInterval.max === 'number'
                                        && end > currentInterval.max - _timeOffset) {
                                        end = currentInterval.max;
                                    }
                                }

                                if (referencedDocInfo
                                    && typeof (start) === 'number'
                                    && typeof (end) === 'number'
                                    && $n2.isArray(tags)) {

                                    var color = findUniqueColorByTags(tagColorProfile, tags);
                                    if (!color) {
                                        //	start + '>>>'+ end + ', ' + placeName ,  referenceDocTags);
                                        color = '#e6e6e6';
                                    }

                                    if (!referencedDocInfo.newCineIndex) {
                                        referencedDocInfo.newCineIndex = [];
                                    }

                                    const tagGroupColors = Object.fromEntries(
                                        Object.entries(tagColorProfile).map(([tagName, tagColor]) => {
                                            return [tagName.toLowerCase(), tagColor]
                                        })
                                    );

                                    var indexInfo = {};
                                    indexInfo.origin = indexDoc._id;
                                    indexInfo.start = start;
                                    indexInfo.end = end;
                                    indexInfo.tags = tags;
                                    indexInfo.timeLinkTags = timeLinkTags;
                                    indexInfo.color = color;
                                    indexInfo.tagGroupColors = tagGroupColors;
                                    indexInfo.scaleFactor = _scaleFactor;
                                    referencedDocInfo.newCineIndex.push(indexInfo);
                                }
                            });
                        }
                    });
                }
            }

            // Detect which document changed and compute
            // additions and updates
            var added = [], updated = [], removed = [];
            for (var docId in this.docInfosByDocId) {
                var docInfo = this.docInfosByDocId[docId];

                var modified = false;
                // Update _n2CineIndex object, if it's different from the existing cine index value.
                if (!indicesAreEqual(docInfo.lastCineIndex, docInfo.newCineIndex)) {
                    modified = true;
                    docInfo.doc._n2CineIndex = docInfo.newCineIndex;
                }
                docInfo.lastCineIndex = docInfo.newCineIndex;
                docInfo.newCineIndex = undefined;

                // Added or updated?
                if (!docInfo.published) {
                    // If not previously published, do it now
                    docInfo.published = true;
                    added.push(docInfo.doc);

                } else if (modified) {
                    // If previously published and changed
                    updated.push(docInfo.doc);
                }
            }

            // Report changes in visibility, if necessary
            this._reportStateUpdate(added, updated, removed);
        },

        _intervalUpdated: function () {
            this._recomputeTransforms([]);
        },

        /**
         * Report update of model state
         * @param {array} added - List of added documents to the model
         * @param {array} updated - List of updated documents to the model
         * @param {array} removed - List of removed documents to the model
         */
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
        CineTimeIndexTransform: CineTimeIndexTransform
    });

})(jQuery, nunaliit2);

