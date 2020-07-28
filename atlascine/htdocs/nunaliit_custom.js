;(function($,$n2) {

	if (typeof(window.nunaliit_custom) === 'undefined' ) {
		window.nunaliit_custom = {};
	}

	var	_loc = function(str,args) { return $n2.loc(str,'cineAtlas',args); };
	var DH = 'atlascine';

	const THEME = 'classic';
	const COLORS =	{
		"classic":	["#ffa500","blue","red","green","cyan","magenta","yellow","#0f0"],
		"dark":		["#960","#003","#900","#060","#099","#909","#990","#090"],
		"pale":		["#fd0","#369","#f64","#3b7","#880","#b5d","#666"],
		"pastel":	["#fb4","#79c","#f66","#7d7","#acc","#fdd","#ff9","#b9b"],
		"neon":		["#ff0","#0ff","#0f0","#f0f","#f00","#00f"]
	}

	// Super Class for DonutTransform model
	var DataToDonutTransform = $n2.Class('DataToDonutTransform', {

		modelId: null,

		dispatchService: null,

		sourceModelId: null,

		modelIsLoading: null,

		dataDocInfosByDocId: null,

		docInfosByDocId: null,

		initialize: function(opts_) {
			var opts = $n2.extend({
				modelId: undefined
				,dispatchService: undefined
				,sourceModelId: undefined
			},opts_);

			var _this = this;

			this.modelId = opts.modelId;
			this.dispatchService = opts.dispatchService;
			this.sourceModelId = opts.sourceModelId;

			this.modelIsLoading = false;
			this.docInfosByDocId = {};
			this.datadocInfosByDocId = {};
			this.pendingDonutsByDocId = {};
			this.removedDonutsByDocId = {};
			this.locationColorCacheByDocId = {};
			this.colorArr = COLORS[THEME];

			// Register to events
			if (this.dispatchService) {
				var f = function(m, addr, dispatcher) {
					_this._handle(m, addr, dispatcher);
				};

				this.dispatchService.register(DH, 'modelGetInfo', f);
				this.dispatchService.register(DH, 'modelGetState', f);
				this.dispatchService.register(DH, 'modelStateUpdated', f);
				// Initialize state
				var m = {
					type:'modelGetState'
					,modelId: this.sourceModelId
				};
				this.dispatchService.synchronousCall(DH, m);
				if (m.state) {
					this._sourceModelUpdated(m.state);
				}
			}
			$n2.log(this._classname,this);
		},

		_handle: function(m, addr, dispatcher) {
			if ('modelGetInfo' === m.type) {
				if (this.modelId === m.modelId) {
					m.modelInfo = this._getModelInfo();
				}

			} else if ('modelGetState' === m.type) {
				if (this.modelId === m.modelId) {
					var added = [];
					for (var docId in this.docInfosByDocId) {
						var docInfo = this.docInfosByDocId[docId];
						var doc = docInfo.doc;
						if (docInfo.isDonut && doc) {
							added.push(doc);
						}
					}

					m.state = {
						added: added
						,updated: []
						,removed: []
						,loading: this.modelIsLoading
					};
				}

			} else if ('modelStateUpdated' === m.type) {
				// Does it come from our source?
				if (this.sourceModelId === m.modelId) {
					this._sourceModelUpdated(m.state);
				}
			}
		},

		_sourceModelUpdated: function(sourceState) {
			var i, e, doc, docId, docInfo;
			if (typeof sourceState.loading === 'boolean'
				&& this.modelIsLoading !== sourceState.loading) {
				this.modelIsLoading = sourceState.loading;
			}

			// Loop through all removed documents
			if (sourceState.removed) {
				for (i=0, e=sourceState.removed.length; i<e; ++i) {
					doc = sourceState.removed[i];
					docId = doc._id;
					docInfo = this.datadocInfosByDocId[docId];

					if (docInfo.isIndex) {
						//if cinemap is removed; a new cinemap should be added
						//at the same time above
						this._recomputeTransforms(doc, true);
					}

					if (docInfo) {
						if(docInfo.linkingDonutsId) {
							for (var donutDocId of docInfo.linkingDonutsId) {
								var donutDoc = this.docInfosByDocId[donutDocId];
								this.removedDonutsByDocId[donutDocId]= donutDoc;
								delete this.docInfosByDocId[donutDocId];
							}
						}

						delete this.datadocInfosByDocId[docId];
						//removed.push(doc);
					}
				}
			}

			// Loop through all added documents
			if (sourceState.added) {
				for (i=0, e=sourceState.added.length; i<e; ++i) {
					doc = sourceState.added[i];
					docId = doc._id;
					docInfo = createDocInfo(doc);
					// Save info
					if (docInfo.isIndex) {
						//break;
					}
					this.datadocInfosByDocId[docId] = docInfo;
					this._recomputeTransforms(doc);
				}
			}

			// Loop through all updated documents
			if (sourceState.updated) {
				for (i=0, e=sourceState.updated.length; i<e; ++i) {
					doc = sourceState.updated[i];
					docId = doc._id;
					docInfo = this.datadocInfosByDocId[docId];
					if (!docInfo ) {
						docInfo = createDocInfo(doc);
						this.datadocInfosByDocId[docId] = docInfo;

					} else {
						var newDocInfo = updateDocInfo(docInfo, doc);
						this.datadocInfosByDocId[docId] = newDocInfo;

					}
					this._recomputeTransforms(doc);
				}
			}
			// TODO Report changes (formatting the output);
		},

		//Abstract function
		_recomputeTransforms: function() {
			throw new Error('_recomputeTransform need to be implemented for'
				+ 'sourceDoc ==> donut doc transformation');
		},

		_reportStateUpdate: function(added, updated, removed) {
			var stateUpdate = {
				added: added
				,updated: updated
				,removed: removed
				,loading: this.modelIsLoading
			};

			if (this.dispatchService) {
				this.dispatchService.send(DH,{
					type: 'modelStateUpdated'
					,modelId: this.modelId
					,state: stateUpdate
				});
			}
		}
	});

//--------------------------------------------------------------------------------------
	/**
	 * This is a document transform. This means that it is a document model that
	 * changes documents visible to downstream models, widgets and canvas.
	 *
	 * This transform calculates the populated place point opacity and radius
	 * values based on which language varieties are selected (selected values
	 * may change based on the use of the language variety filter}
	 */
	var SearchResult2DonutTransform = $n2.Class('SearchResult2DonutTransform', DataToDonutTransform, {

		modelId: null,

		dispatchService: null,

		requestService: undefined,

		sourceModelId: null,

		modelIsLoading: null,

		docInfosByDocId: null,

		startTimeByDocId: null,

		currentFilterSelection: null,

		_placeDocIdMap: null,

		_placeDocInfoByDocId: null,

		initialize: function(opts_) {
			var opts = $n2.extend({
				modelId: undefined
				,dispatchService: undefined
				,sourceModelId: undefined
				,requestService: undefined
			},opts_);

			var _this = this;

			this.modelId = opts.modelId;
			this.dispatchService = opts.dispatchService;
			this.requestService = opts.requestService;
			this.docInfosByDocId = {};
			this.sourceModelId = opts.sourceModelId;

			this.pendingDonutsByDocId = {};
			this.removedDonutsByDocId = {};
			this.locationColorCacheByDocId = {};
			this.mediaColorByDocId = {};
			this.colorArr = COLORS[THEME];
			this._searchResults = undefined;
			this._placeDocIdMap = undefined;
			this._placeDocInfoByDocId = {};

			// Register to events
			if (this.dispatchService) {
				var f = function(m, addr, dispatcher) {
					_this._handle(m, addr, dispatcher);
				};

				this.dispatchService.register(DH, 'modelGetInfo', f);
				this.dispatchService.register(DH, 'modelGetState', f);
				this.dispatchService.register(DH, 'modelStateUpdated', f);
				this.dispatchService.register(DH, 'searchResultsForDisplayWidget', f);
				this.dispatchService.register(DH, 'PlaceUtility--replyPlaceDocIdMap', f);
				this.dispatchService.register(DH, 'PlaceUtility--updatePlaceDocIdMap', f);

				// Initialize state
				var m = {
					type:'modelGetState'
					,modelId: this.sourceModelId
				};

				this.dispatchService.synchronousCall(DH, m);
				if (m.state) {
					this._sourceModelUpdated(m.state);
				}
			}

			$n2.log(this._classname,this);
		},

		_handle: function(m, addr, dispatcher) {
			if ('modelGetInfo' === m.type) {
				if (this.modelId === m.modelId) {
					m.modelInfo = this._getModelInfo();
				}

			} else if ('modelGetState' === m.type) {
				if (this.modelId === m.modelId) {
					var added = [];
					for (var docId in this.docInfosByDocId) {
						var docInfo = this.docInfosByDocId[docId];
						var doc = docInfo.doc;
						if (docInfo.isDonut && doc) {
							added.push(doc);
						}
					}

					m.state = {
						added: added
						,updated: []
						,removed: []
						,loading: this.modelIsLoading
					};
				}

			} else if ('modelStateUpdated' === m.type) {
				// Does it come from our source?
				if (this.sourceModelId === m.modelId) {
					this._sourceModelUpdated(m.state);
				}

			} else if ('searchResultsForDisplayWidget' === m.type) {
				this._searchResults = m.results;
				this._recalculateDonuts ();

			} else if ('PlaceUtility--replyPlaceDocIdMap' === m.type) {
				this._placeDocIdMap = m.map;
				if (this._placeDocIdMap) {
					this._recalculateDonuts ();
				}

			} else if ('PlaceUtility--updatePlaceDocIdMap' === m.type) {
				this._placeDocIdMap = m.map;
				if (this._placeDocIdMap && Object.keys(this._placeDocIdMap).length !== 0) {
					this._recalculateDonuts ();
				}
			}
		},

		_recalculateDonuts: function() {
			var ele;
			var _this = this;
			this.pendingDonutsByDocId = {};
			this.removedDonutsByDocId = {};

			if (!this._placeDocIdMap) {
				var msg = {
					type: 'PlaceUtility--getPlaceDocIdMap',
					docId: undefined
				};
				_this.dispatchService.send(DH, msg);
				return;
			}

			this.removedDonutsByDocId = this.docInfosByDocId;
			if (!this._searchResults) {
				return;
			}
			var results = this._searchResults.slice(0);

			//Sorting the search results based on start time code
			results.sort(function(a, b) {
				var a_timeCode = a.value.starttime;
				var b_timeCode = b.value.endtime;
				var a_time = TimestampToSeconds( a_timeCode );
				var b_time = TimestampToSeconds( b_timeCode );
				if (typeof a_time === 'undefined' ||
					typeof b_time === 'undefined' ) 0;
				if (a_time < b_time) 1;
				if (a_time > b_time ) -1;

				return 0;
			});

			var cinemapIdExisted = {};
			var callbackRemaining = 0;
			for (var i=0,e=results.length;i<e; i++) {
				var result = results[i].value;
				var cinemapId = results[i].value.cinemapId;
				var value = results[i].value.value;
				var startTimeInMs = convertTimecodeToMs( result.starttime );
				var places = results[i].value.places || [];

				if (places.length > 0) {
					for (var j = 0,k=places.length; j<k; j++) {
						var pl = places[j];
						var placeName = pl;
						var _name = placeName.trim().toLowerCase();
						var placeDoc= _this._placeDocIdMap[_name];
						if (! placeDoc) {
							//$n2.log('PlaceUtility returns void referencedDocId for: ', placeName);
							continue;
						}

						var docId = placeDoc._id;
						var donutId = docId + '_donut_' + startTimeInMs + '_' + placeName;
						var donutDocInfo = {
							id: donutId
							,sourceDoc: placeDoc
							,published: false
							,isDonut: true
						};

						donutDocInfo.doc = {
							_id:  donutId
							,nunaliit_geom: placeDoc.nunaliit_geom
							,nunaliit_layers: placeDoc.nunaliit_layers
						}

						var ldata_tmp = {
							duration: 15,
							tags: [placeName, result.starttime, result.endtime],
							scaleFactor: 1,
							style: {
								name: 'alpha',
								fillColor: '#8b0000',
								opacity: 0.5
							}
						};

						donutDocInfo.doc._ldata = ldata_tmp ;
						_this.pendingDonutsByDocId[donutId] = donutDocInfo;

					}
				}
			}
			//report changes
			var added = [];
			var removed = [];
			var updated = [];
			_this.docInfosByDocId = {};
			var pendingDonutDocsByDocId = {};
			for (ele in _this.pendingDonutsByDocId) {
				pendingDonutDocsByDocId[ele] = _this.pendingDonutsByDocId[ele].doc;
			}

			var removedDonutDocsByDocId = {};
			for (ele in _this.removedDonutsByDocId) {
				removedDonutDocsByDocId[ele] = _this.removedDonutsByDocId[ele].doc;
			}

			//merge pending donuts docInfo into docInfosByDocId
			_this.docInfosByDocId =  _this.pendingDonutsByDocId;

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

			_this._reportStateUpdate(added, updated, removed);
			//TODO generate donut for each place tag / K color / give start-end time to _data.tags
		},

		_getModelInfo: function() {
			var modelInfo = {
				modelId: this.modelId
				,modelType: 'PopulatedPlaceTransform'
				,parameters: {}
			};
			return modelInfo;
		},

		_sourceModelUpdated: function(sourceState) {
			var i, e, doc, docId, docInfo;
			var _this = this;
			this.pendingDonutsByDocId = {};
			this.removedDonutsByDocId = {};

			if (typeof sourceState.loading === 'boolean'
				&& this.modelIsLoading !== sourceState.loading) {
				this.modelIsLoading = sourceState.loading;
			}

			// Loop through all removed documents
			if (sourceState.removed) {
				for (i=0, e=sourceState.removed.length; i<e; ++i) {
					doc = sourceState.removed[i];
					docId = doc._id;
					docInfo = this._placeDocInfoByDocId[docId];

					if (docInfo.isIndex) {
						//if cinemap is removed; a new cinemap should be added at the same time above
						this._recomputeTransforms(doc, true);
					}

					if (docInfo) {
						if(docInfo.linkingDonutsId) {
							for (var donutDocId of docInfo.linkingDonutsId) {
								var donutDoc = this._placeDocInfoByDocId[donutDocId];
								this.removedDonutsByDocId[donutDocId]= donutDoc;
								delete this._placeDocInfoByDocId[donutDocId];
							}
						}
						delete this._placeDocInfoByDocId[docId];
						//removed.push(doc);
					}
				}
			}

			// Loop through all added documents
			if (sourceState.added) {
				for (i=0, e=sourceState.added.length; i<e; ++i) {
					doc = sourceState.added[i];
					docId = doc._id;
					docInfo = createDocInfo(doc);

					// Save info
					this._placeDocInfoByDocId[docId] = docInfo;
					//this._recomputeTransforms(doc);
				}
			}

			// Loop through all updated documents
			if (sourceState.updated) {
				for (i=0, e=sourceState.updated.length; i<e; ++i) {
					doc = sourceState.updated[i];
					docId = doc._id;
					docInfo = this._placeDocInfoByDocId[docId];
					if (!docInfo ) {
						docInfo = createDocInfo(doc);
						this._placeDocInfoByDocId[docId] = docInfo;

					} else {
						var newDocInfo = updateDocInfo(docInfo, doc);
						this._placeDocInfoByDocId[docId] = newDocInfo;
					}
					//this._recomputeTransforms(doc);
				}
			}

			// Report changes
//
//			var added = [],
//				removed = [],
//				updated = [];
//			var pendingDonutDocsByDocId = {};
//			for (var ele in _this.pendingDonutsByDocId) {
//				pendingDonutDocsByDocId[ele] = _this.pendingDonutsByDocId[ele].doc;
//			}
//			var removedDonutDocsByDocId = {};
//			for (var ele in _this.removedDonutsByDocId) {
//				removedDonutDocsByDocId[ele] = _this.removedDonutsByDocId[ele].doc;
//			}
//			//merge pending donuts docInfo into docInfosByDocId
//			Object.assign(_this.docInfosByDocId, _this.pendingDonutsByDocId);
//
//
//			var updatedDonuts = [];
//			for (var ele in pendingDonutDocsByDocId) {
//				if (removedDonutDocsByDocId[ele]) {
//					updatedDonuts.push(pendingDonutDocsByDocId[ele]);
//					delete pendingDonutDocsByDocId[ele];
//					delete removedDonutDocsByDocId[ele];
//				}
//			}
//
//			var pendingDonuts = $n2.utils.values(pendingDonutDocsByDocId);
//			var removedDonuts = $n2.utils.values(removedDonutDocsByDocId);
//
//
//			removed.push.apply(removed, removedDonuts);
//			added.push.apply(added, pendingDonuts);
//			updated.push.apply(updated, updatedDonuts);
//
//			this._reportStateUpdate(added, updated, removed);

			function createDocInfo(doc) {
				var docId = doc._id;
				var docInfo = {
						id: docId
						,sourceDoc: doc
						,published: false
				}
				//docInfo.doc = Object.assign({}, doc);

				docInfo.linkingDonutsId = [];

				return docInfo;
			}

			function updateDocInfo(docInfo, doc) {
				docInfo.sourceDoc = doc;
				docInfo.doc = Object.assign({}, doc);

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

		_recomputeTransforms: function(doc, isClearance) {
			var _this = this;
			var docId = doc._id;
			var docInfo = this.docInfosByDocId[docId];
			if (isClearance &&
				docInfo.isIndex) {
				for (var id in this.docInfosByDocId) {
					docInfo = this.docInfosByDocId [id];
					if (docInfo.linkingDonutsId) {
						var oldDonutsId = docInfo.linkingDonutsId;
						if (oldDonutsId
							&& $n2.isArray(oldDonutsId)
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

			} else if(docInfo.linkingDonutsId) {
//				var locationColor = this.locationColorCacheByDocId [docId];
//				if (!locationColor) {
//					locationColor = this.getNextColor();
//					this.locationColorCacheByDocId [docId] = locationColor;
//				}
				this._populateDocInfosFromDoc(doc);
			}

			//Object.assign(this.docInfosByDocId, pendingDonutsByDocId);
		},

		getNextColor:function() {
			if (typeof this.color_available_idx === 'undefined') {
				this.color_available_idx = -1;
			}
			this.color_available_idx ++;
			var col_len = this.colorArr.length;
			return this.colorArr[ this.color_available_idx % col_len];
		},

		_populateDocInfosFromDoc: function(doc) {
			var docId = doc._id;

			var originalDocInfoWithDonutDocRefs = this.docInfosByDocId[docId];

			//remove the geometry info for the original doc
			delete originalDocInfoWithDonutDocRefs.doc['nunaliit_geom'];
			//this.pendingDonutsByDocId[docId] = originalDocInfoWithDonutDocRefs;
			var cnt = 0;
			var cineIndexArr = doc._n2CineIndex;

			if (cineIndexArr
				&& cineIndexArr.length >= 1) {
				for (var cidx of cineIndexArr) {
					var donutId = docId + '_donut_'+cnt.toString(16)
					var donutDocInfo = {
						id: donutId
						,sourceDoc: doc
						,published: false
						,isDonut: true
					}
					originalDocInfoWithDonutDocRefs.linkingDonutsId.push(donutId);

					donutDocInfo.doc = Object.assign({}, doc);
					donutDocInfo.doc._id = donutId;
					var l = cidx.start, r = cidx.end;
					var ldata_tmp = {
						start: cidx.start,
						tags: cidx.tags,
						scaleFactor: cidx.scaleFactor
					};

					ldata_tmp.duration = Math.max(r - l, 0);
					ldata_tmp.style = {
							name: 'alpha',
							fillColor: cidx.color,
							opacity: 0.5
					};

					donutDocInfo.doc._ldata = ldata_tmp ;

					// Remember start time given the doc id
					this.startTimeByDocId[donutId] = cidx.start;

					this.pendingDonutsByDocId[donutId] = donutDocInfo;
					cnt++;
				}
			}
		},

		_reportStateUpdate: function(added, updated, removed) {
			var stateUpdate = {
				added: added
				,updated: updated
				,removed: removed
				,loading: this.modelIsLoading
			};

			if (this.dispatchService) {
				this.dispatchService.send(DH,{
					type: 'modelStateUpdated'
					,modelId: this.modelId
					,state: stateUpdate
				});
			}
		}
	});

	// ------------------------------------------------------------------------
	/**
	 * This is a document transform. This means that it is a document model that
	 * changes documents visible to downstream models, widgets and canvas.
	 *
	 * This transform calculates the populated place point opacity and radius
	 * values based on which language varieties are selected (selected values
	 * may change based on the use of the language variety filter}
	 */
	var CineData2DonutTransform = $n2.Class('CineData2DonutTransform', {

		modelId: null,

		dispatchService: null,

		sourceModelId: null,

		modelIsLoading: null,

		docInfosByDocId: null,

		startTimeByDocId: null,

		currentFilterSelection: null,

		initialize: function(opts_) {
			var opts = $n2.extend({
				modelId: undefined
				,dispatchService: undefined
				,sourceModelId: undefined
			},opts_);

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
				var f = function(m, addr, dispatcher) {
					_this._handle(m, addr, dispatcher);
				};

				this.dispatchService.register(DH, 'modelGetInfo', f);
				this.dispatchService.register(DH, 'modelGetState', f);
				this.dispatchService.register(DH, 'modelStateUpdated', f);
				this.dispatchService.register(DH, 'cineStartTimeFromDocId', f);

				// Initialize state
				var m = {
					type:'modelGetState'
					,modelId: this.sourceModelId
				};

				this.dispatchService.synchronousCall(DH, m);
				if (m.state) {
					this._sourceModelUpdated(m.state);
				}
			}
			$n2.log(this._classname,this);
		},

		_handle: function(m, addr, dispatcher) {
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
						,updated: []
						,removed: []
						,loading: this.modelIsLoading
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

		_getModelInfo: function() {
			var modelInfo = {
				modelId: this.modelId
				,modelType: 'PopulatedPlaceTransform'
				,parameters: {}
			};

			return modelInfo;
		},

		_sourceModelUpdated: function(sourceState) {
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
				for (i=0, e=sourceState.removed.length; i<e; ++i) {
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
								this.removedDonutsByDocId[donutDocId]= donutDoc;
								delete this.docInfosByDocId[donutDocId];
							}
						}

						delete this.docInfosByDocId[docId];
						//removed.push(doc);
					}
				}
			}

			// Loop through all added documents
			if (sourceState.added) {
				for (i=0, e=sourceState.added.length; i<e; ++i) {
					doc = sourceState.added[i];
					docId = doc._id;
					docInfo = createDocInfo(doc);

					// Save info
					if (docInfo.isIndex) {
						//break;
					}
					this.docInfosByDocId[docId] = docInfo;
					this._recomputeTransforms(doc);
				}
			}

			// Loop through all updated documents
			if (sourceState.updated) {
				for (i=0, e=sourceState.updated.length; i<e; ++i) {
					doc = sourceState.updated[i];
					docId = doc._id;
					docInfo = this.docInfosByDocId[docId];

					if (!docInfo ) {
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

			//merge pending donuts docInfo into docInfosByDocId
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
					,sourceDoc: doc
					,published: false
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

		_recomputeTransforms: function(doc, isClearance) {
			var _this = this;
			var docId = doc._id;
			var docInfo = this.docInfosByDocId[docId];
			if (isClearance &&
				docInfo.isIndex) {
				for (var id in this.docInfosByDocId) {
					docInfo = this.docInfosByDocId [id];
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

			} else if(docInfo.linkingDonutsId) {
				//generates donut doc file based on this single index file
				this._populateDocInfosFromDoc(doc);
			}

			//Object.assign(this.docInfosByDocId, pendingDonutsByDocId);
		},

		getNextColor:function() {
			if (typeof this.color_available_idx === 'undefined') {
				this.color_available_idx = -1;
			}

			this.color_available_idx ++;
			var col_len = this.colorArr.length;
			return this.colorArr[ this.color_available_idx % col_len];
		},

		_populateDocInfosFromDoc: function(doc) {
			var docId = doc._id;
			var originalDocInfoWithDonutDocRefs = this.docInfosByDocId[docId];

			//remove the geometry info for the original doc
			delete originalDocInfoWithDonutDocRefs.doc['nunaliit_geom'];
			//this.pendingDonutsByDocId[docId] = originalDocInfoWithDonutDocRefs;
			var cnt = 0;
			var cineIndexArr = doc._n2CineIndex;

			if (cineIndexArr
				&& cineIndexArr.length >= 1) {
				for (var cidx of cineIndexArr) {
					var donutId = docId + '_donut_'+cnt.toString(16)
					var donutDocInfo = {
						id: donutId
						,sourceDoc: doc
						,published: false
						,isDonut: true
					}
					originalDocInfoWithDonutDocRefs.linkingDonutsId.push(donutId);

					donutDocInfo.doc = {
						nunaliit_geom: doc.nunaliit_geom
						,nunaliit_layers: doc.nunaliit_layers
					};

					donutDocInfo.doc._id = donutId;
					var l = cidx.start, r = cidx.end;
					var ldata_tmp = {
						start: cidx.start,
						tags: cidx.tags,
						scaleFactor: cidx.scaleFactor
					};

					// 15 is the magic number for the ring to be drawn on map
					// need to make sure duration calculated accordingly to make sure item to be drawn

					var lowerBound = Math.ceil(Math.max( (r-l)*cidx.scaleFactor, 15) / cidx.scaleFactor);
					ldata_tmp.duration = Math.max(r - l, lowerBound);
					ldata_tmp.style = {
						name: 'alpha',
						fillColor: cidx.color,
						opacity: 0.5
					};

					donutDocInfo.doc._ldata = ldata_tmp ;

					// Remember start time given the doc id
					this.startTimeByDocId[donutId] = cidx.start;

					this.pendingDonutsByDocId[donutId] = donutDocInfo;
					cnt++;
				}
			}
		},

		_reportStateUpdate: function(added, updated, removed) {
			var stateUpdate = {
				added: added
				,updated: updated
				,removed: removed
				,loading: this.modelIsLoading
			};

			if (this.dispatchService) {
				this.dispatchService.send(DH,{
					type: 'modelStateUpdated'
					,modelId: this.modelId
					,state: stateUpdate
				});
			}
		}
	});

	// ============ LookAheadService ========================
	function SplitSearchTerms(line) {
		if (!line ) return null;

		var map = $n2.couchUtils.extractSearchTerms(line, false);

		var searchTerms = [];
		for (var term in map) {
			var folded = map[term].folded;
			if (folded ) {
				searchTerms.push(folded);
			}
		}

		return searchTerms;
	}

	// -----------------------------------------------------------------------------
	// LookAheadService Class
	var LookAheadService = $n2.Class({

		designDoc: null,

		lookAheadLimit: null,

		lookAheadPrefixMin: null,

		lookAheadCacheSize: null,

		lookAheadMap: null,

		lookAheadCounter: null,

		constraint: null,

		initialize: function(opts_) {
			var opts = $n2.extend({
				designDoc: null
				,lookAheadLimit: 5
				,lookAheadPrefixMin: 3
				,lookAheadCacheSize: 10
				,constraint: null
			},opts_);

			this.designDoc = opts.designDoc;
			this.lookAheadLimit = opts.lookAheadLimit;
			this.lookAheadPrefixMin = opts.lookAheadPrefixMin;
			this.lookAheadCacheSize = opts.lookAheadCacheSize;
			this.constraint = opts.constraint;

			this.lookAheadMap = {};
			this.lookAheadCounter = 0;
		},

		setConstraint: function(constraint) {
			this.constraint = constraint;
		},

		queryPrefix: function(prefix,callback) {
			var _this = this;

			var words = this._retrievePrefix(prefix);
			if (words ) {
				callback(prefix,words);
				return;
			}

			// Figure out query view
			var viewName = 'tags';
			/*if (this.constraint) {
				viewName = 'text-lookahead-constrained';
			};*/

			// Figure out start and end keys
			var startKey = prefix;
			var endKey = prefix + '\u9999';
			if (this.constraint) {
				startKey = [this.constraint, prefix, null];
				endKey = [this.constraint, prefix + '\u9999', {}];
			}

			// Make request
			this.designDoc.queryView({
				viewName: viewName
				,startkey: startKey
				,group_level: 1
				,endkey: endKey
				,top: this.lookAheadLimit
				,group: undefined
				,onlyRows: false
				,reduce: true
				,onSuccess: function(response) {
					var rows = response.rows;

					var words = [];
					for (var i=0,e=rows.length; i<e; ++i) {
						words.push(rows[i].key);
					}

					// Cache these results
					_this._cachePrefix({
						prefix: prefix
						,words: words
						,full: response.all_rows
					});

					if (0 == words.length ) {
						callback(prefix,null);
					} else {
						callback(prefix,words);
					}
				}

				,onError: function() {
					callback(prefix,null);
				}
			});
		},

		queryTerms: function(terms,callback) {

			if (null === terms
				|| 0 == terms.length ) {
				callback(null);
				return;
			}

			var index = terms.length - 1;
			while( index >= 0 ) {
				var lastTerm = terms[index];
				if ('' === lastTerm ) {
					--index;
				} else {
					var previousWords = null;
					if (index > 0 ) {
						previousWords = terms.slice(0,index);
					}
					break;
				}
			}

			lastTerm = lastTerm.toLowerCase();

			if (!lastTerm ) {
				callback(null);
				return;
			}

			if (lastTerm.length < this.lookAheadPrefixMin ) {
				callback(null);
				return;
			}

			var previousWordsString = '';
			if (previousWords ) {
				previousWordsString = previousWords.join(' ') + ' ';
			}

			this.queryPrefix(lastTerm,function(prefix,words) {
				if (null === words ) {
					callback(null);
				} else {
					var results = [];
					for (var i=0,e=words.length; i<e; ++i) {
						results.push( previousWordsString + words[i] );
					}
					callback(results);
				}
			});
		},

		_cachePrefix: function(prefixResult) {

			// Save result under prefix
			this.lookAheadMap[prefixResult.prefix] = prefixResult;

			// Mark generation
			prefixResult.counter = this.lookAheadCounter;
			++(this.lookAheadCounter);

			// Trim cache
			var keysToDelete = [];
			var cachedMap = this.lookAheadMap; // faster access
			var limit = this.lookAheadCounter - this.lookAheadCacheSize;
			for (var key in cachedMap) {
				if (cachedMap[key].counter < limit ) {
					keysToDelete.push(key);
				}
			}

			for (var i=0,e=keysToDelete.length; i<e; ++i) {
				delete cachedMap[keysToDelete[i]];
			}
		},

		_retrievePrefix: function(prefix) {
			// Do we have exact match in cache?
			if (this.lookAheadMap[prefix] ) {
				return this.lookAheadMap[prefix].words;
			}

			// Look for complete results from shorter prefix
			var sub = prefix.substring(0,prefix.length-1);
			while( sub.length >= this.lookAheadPrefixMin ) {
				if (this.lookAheadMap[sub] && this.lookAheadMap[sub].full ) {
					var cachedWords = this.lookAheadMap[sub].words;
					var words = [];
					for (var i=0,e=cachedWords.length; i<e; ++i) {
						var word = cachedWords[i];
						if (word.length >= prefix.length ) {
							if (word.substr(0,prefix.length) === prefix ) {
								words.push(word);
							}
						}
					}
					return words;
				}
				sub = sub.substring(0,sub.length-1);
			}

			// Nothing of value found
			return null;
		},

		getJqAutoCompleteSource: function() {
			var _this = this;
			return function(request, cb) {
				_this._jqAutoComplete(request, cb);
			};
		},

		_jqAutoComplete: function(request, cb) {
			var terms = SplitSearchTerms(request.term);
			var callback = cb;
//			var callback = function(res) {
//				$n2.log('look ahead results',res);
//				cb(res);
//			}
			this.queryTerms(terms, callback);
		}
	});
	// -------------------------------------------------------------------------

	// ++++++++++++++++++++++++++++++++++++++++++++++
	// Converts time stamp to seconds
	var reTimeCode = /([0-9][0-9]):([0-9][0-9]):([0-9][0-9])((\,|\.)[0-9]+)?/i;
	var TimestampToSeconds = function(timestampStr) {
		var tmpTimecode = timestampStr.replace(/^\s+|\s+$/g,'');
		if (!tmpTimecode || tmpTimecode === '') {
			return undefined;
		}

		var matcher = reTimeCode.exec(tmpTimecode);
		if(!matcher ) {
			return undefined;
		}

		var seconds =  3600*matcher[1] + 60*matcher[2] + 1*matcher[3];

		return seconds;
	};

	// ++++++++++++++++++++++++++++++++++++++++++++++
	var CineTimeIndexTransform = $n2.Class('CineTimeIndexTransform',$n2.modelTime.TimeIntervalModel,{

		sourceModelId: null,

		cinemapModelId: null,

		docInfosByDocId: null,

		cineIndexByDocId: null,

		modelIsLoading: null,

		initialize: function(opts_) {
			var opts = $n2.extend({
				dispatchService: null
				,modelId: null
				,range: null
				,sourceModelId: null
				,cinemapModelId: null
			},opts_);

			$n2.modelTime.TimeIntervalModel.prototype.initialize.apply(this,arguments);

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
				,globalTimeOffset: 0.5
			};

			// Register to events
			if (this.dispatchService) {
				var f = function(m, addr, dispatcher) {
					_this._handle(m, addr, dispatcher);
				};
				this.dispatchService.register(DH, 'modelGetInfo', f);
				this.dispatchService.register(DH, 'modelGetState', f);
				this.dispatchService.register(DH, 'modelStateUpdated', f);
				this.dispatchService.register(DH, 'PlaceUtility--replyPlaceDocIdMap', f);
				this.dispatchService.register(DH, 'PlaceUtility--updatePlaceDocIdMap', f);

				// Initialize state
				var m = {
					type:'modelGetState'
					,modelId: this.sourceModelId
				};
				this.dispatchService.synchronousCall(DH, m);
				if (m.state) {
					this._sourceModelUpdated(m.state);
				}
			}

			$n2.log('CineTimeIndexTransform',this);
		},

		_handle: function(m, addr, dispatcher) {
			if ('modelGetInfo' === m.type) {
				if (this.modelId === m.modelId) {
					m.modelInfo = this._getModelInfo();
				}

			} else if ('PlaceUtility--replyPlaceDocIdMap' === m.type) {
				this._placeDocIdMap = m.map;
				if (this._placeDocIdMap) {
					this._recomputeTransforms ();
				}

			} else if('PlaceUtility--updatePlaceDocIdMap' === m.type) {
				this._placeDocIdMap = m.map;
				if (this._placeDocIdMap) {
					this._recomputeTransforms ();
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
						,updated: []
						,removed: []
						,loading: this.modelIsLoading
					};
				}

			} else if ('modelStateUpdated' === m.type) {
				// Does it come from our source?
				if (this.sourceModelId === m.modelId) {
					this._sourceModelUpdated(m.state);

				} else if(this.cinemapModelId === m.modelId) {
					this._cinemapUpdate(m.state, true);
				}
			}
		},

		/**
		  * Create's an object with model info, and returns it
		  * @return {object} info - An object containing the current model's info.
		  */
		_getModelInfo: function() {
			var info = {
				modelId: this.modelId
				,modelType: 'cineTimeIndexTransform'
				,parameters: {}
			};

			this._addModelInfoParameters(info);
			return info;
		},

		// Handle source model updates (add, update, and remove source states)
		_sourceModelUpdated: function(sourceState) {
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
					,sourceDoc: doc
					,published: false
				};

				docInfo.doc = {};
				for (var key in doc) {
					docInfo.doc[key] = doc[key];
				}

				// Is it a cine index?
//				if (doc.atlascine_cinemap) {
//					docInfo.isIndex = true;
//				} else {
//					docInfo.isIndex = false;
//				};
//
//				if (doc.atlascine_theme_color) {
//					docInfo.isTheme = true;
//				} else {
//					docInfo.isTheme = false;
//				};
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

				// Is it a cine index?
//				if (doc.atlascine_cinemap) {
//					docInfo.isIndex = true;
//				} else {
//					docInfo.isIndex = false;
//				};
//
//				if (doc.atlascine_theme_color) {
//					docInfo.isTheme = true;
//				} else {
//					docInfo.isTheme = false;
//				};
				return docInfo;
			}

			if (typeof sourceState.loading === 'boolean'
				&& this.modelIsLoading !== sourceState.loading) {
				this.modelIsLoading = sourceState.loading;
			}

			// Loop through all added documents
			if (sourceState.added) {
				for (i=0, e=sourceState.added.length; i<e; ++i) {
					doc = sourceState.added[i];
					docId = doc._id;
					docInfo = createDocInfo(doc);

					// Save info
					if (docInfo) {
						this.docInfosByDocId[docId] = docInfo;
					}
//					if (docInfo.isIndex) {
//						this.cineIndexByDocId[docId] = doc;
//					};
//					if (docInfo.isTheme) {
//						this.cineThemeByDocId[docId] = doc;
//					}
				}
			}

			// Loop through all updated documents
			if (sourceState.updated) {
				for (i=0, e=sourceState.updated.length; i<e; ++i) {
					doc = sourceState.updated[i];
					docId = doc._id;
					docInfo = this.docInfosByDocId[docId];
					if (!docInfo ) {
						// If updated document doesn't exist in collection add it.
						docInfo = createDocInfo(doc);

						// Save info
						if (docInfo) {
							this.docInfosByDocId[docId] = docInfo;
						}

//						if (docInfo.isIndex) {
//							this.cineIndexByDocId[docId] = doc;
//						};
//						if (docInfo.isTheme) {
//							this.cineThemeByDocId[docId] = doc;
//						}

					} else {
						// If updated document exists in collection, update it.
						var newDocInfo = updateDocInfo(docInfo, doc);

						this.docInfosByDocId[docId] = newDocInfo;
//						if (newDocInfo.isIndex) {
//							this.cineIndexByDocId[docId] = doc;
//						} else {
//							delete this.cineIndexByDocId[docId];
//						};
//						if (newDocInfo.isTheme) {
//							this.cineThemeByDocId[docId] = doc;
//						} else {
//							delete this.cineThemeByDocId[docId];
//						};

						newDocInfo.updated = true;
					}
				}
			}

			// Loop through all removed documents
			if (sourceState.removed) {
				for (i=0, e=sourceState.removed.length; i<e; ++i) {
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

		_cinemapUpdate: function(sourceState, forceSingleCinemap) {
			var i, e, doc, docId;
			var removed = [];
			var added = [];
			var updated = [];
			//this.cineIndexByDocId = {};

			if (typeof sourceState.loading === 'boolean'
				&& this.modelIsLoading !== sourceState.loading) {
				this.modelIsLoading = sourceState.loading;
			}

			if (sourceState.removed) {
				for (i=0, e=sourceState.removed.length; i<e; ++i) {
					doc = sourceState.removed[i];
					docId = doc._id;
					if (doc.atlascine_cinemap) {
						delete this.cineIndexByDocId[docId];
						removed.push(doc);
					}
				}
			}

			if (sourceState.added) {
				for (i=0, e=sourceState.added.length; i<e; ++i) {
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
				for (i=0, e=sourceState.updated.length; i<e; ++i) {
					doc = sourceState.updated[i];
					docId = doc._id;
					if (doc.atlascine_cinemap) {
						this.cineIndexByDocId[docId] = doc;
						updated.push(doc);
					}
				}
			}

			// Loop through all removed documents
			//report cinemap changing
			this._reportStateUpdate(added, updated, removed);

			this._clearN2Index();
			// Report changes in visibility
			this._recomputeTransforms(removed);
		},

		// Clears the _n2CineIndex transformed object from document.
		_clearN2Index: function() {
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

		_recomputeTransforms: function(removed) {
			var _this = this;
			var currentInterval = this.getInterval();
			var tagGroupsProfile = undefined;
			var tagColorProfile = undefined;
			var _scaleFactor, _timeOffset;

			function findPlaceDocTags (tags) {
				var rst = undefined;
				tags.forEach(function(tag) {
					if ('place' === tag.type || 'location' === tag.type) {
						if (!rst) {
							rst = [];
						}
						rst.push(tag);
					}
				})
				return rst;
			}

			function findTagsIncluded (tagsProfile, tag) {
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

				if(tagsProfile && Array.isArray(tagsProfile)) {
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

				for (i=0, e=lastCineIndex.length; i<e; ++i) {
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

					for (i = 0, e= i2.length; i<e; i++) {
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

			// Loop over the indices, computing a new index for each document
			for (var indexId in this.cineIndexByDocId) {
				var indexDoc = this.cineIndexByDocId[indexId];

				if (indexDoc.atlascine_cinemap.tagGroups) {
					tagGroupsProfile = indexDoc.atlascine_cinemap.tagGroups;
				}

				if (indexDoc.atlascine_cinemap.tagColors) {
					tagColorProfile = indexDoc.atlascine_cinemap.tagColors;
				}

				if (indexDoc.atlascine_cinemap.settings) {
					_scaleFactor = indexDoc.atlascine_cinemap.settings.globalScaleFactor;
					var offsetInSetting = indexDoc.atlascine_cinemap.settings.globalTimeOffset;
					_timeOffset = offsetInSetting ? offsetInSetting: 0.5;

				} else {
					indexDoc.atlascine_cinemap.settings = _this.__DEFAULT_TAGSETTINGS__;
					_scaleFactor = indexDoc.atlascine_cinemap.settings.globalScaleFactor;
					_timeOffset = indexDoc.atlascine_cinemap.settings.globalTimeOffset;
				}

				if (indexDoc
					&& indexDoc.atlascine_cinemap
					&& indexDoc.atlascine_cinemap.timeLinks) {
					indexDoc.atlascine_cinemap.timeLinks.forEach(function(timeLink) {
						// Find referenced document
						if (!timeLink || !timeLink.starttime || !timeLink.endtime || !timeLink.tags) {
							return;
						}

						var referenceDocTags = timeLink.tags;
						var placeTags = findPlaceDocTags (referenceDocTags);
						if (placeTags) {
							placeTags.forEach(function(tag) {
								var placeName = tag.value;
								var _name = placeName.trim().toLowerCase();
								var referencedDoc = _this._placeDocIdMap[_name];

								if (!referencedDoc) {
									//$n2.log('PlaceUtility returns void referencedDocId for: ', placeName);
									return;
								}

								var referencedDocId = referencedDoc._id;
								var referencedDocInfo = _this.docInfosByDocId[referencedDocId];
								var start = undefined;
								if (typeof(timeLink.starttime) === 'string') {
									start = TimestampToSeconds(timeLink.starttime);
								}

								var end = undefined;
								if (typeof(timeLink.endtime) === 'string') {
									end = TimestampToSeconds(timeLink.endtime);
								}

								var tags = [];
								if (referenceDocTags
									&& $n2.isArray(referenceDocTags)
									&& referenceDocTags.length > 0) {
									for (var tag of referenceDocTags) {
										var tagVal = tag.value;
										var tagsFromTagsGroup = findTagsIncluded(tagGroupsProfile, tagVal);
										if (tagsFromTagsGroup.length == 0) {
											tagsFromTagsGroup.push(tagVal);
										}
										tags.push.apply(tags,tagsFromTagsGroup);
									}
									//$n2.log(referencedDocId + 'tags from calculating: ', tags);
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
									&& typeof(start) === 'number'
									&& typeof(end) === 'number'
									&& $n2.isArray(tags)) {

									var color = findUniqueColorByTags(tagColorProfile, tags);
									if (!color) {
										//$n2.log('CineTimeIndexTransform cannot find the valid color, not render for: ',
										//	start + '>>>'+ end + ', ' + placeName ,  referenceDocTags);
										color = '#e6e6e6';
									}

									if (!referencedDocInfo.newCineIndex) {
										referencedDocInfo.newCineIndex = [];
									}

									var indexInfo = {};
									indexInfo.origin = indexDoc._id;
									indexInfo.start = start;
									indexInfo.end = end;
									indexInfo.tags = tags
									indexInfo.color = color;
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

		_intervalUpdated: function() {
			//var currentInterval = this.getInterval();
			//$n2.log('CineIndexTransform Interval',currentInterval);
			this._recomputeTransforms([]);
		},

		_reportStateUpdate: function(added, updated, removed) {
			var stateUpdate = {
				added: added
				,updated: updated
				,removed: removed
				,loading: this.modelIsLoading
			};

			if (this.dispatchService) {
				this.dispatchService.send(DH,{
					type: 'modelStateUpdated'
					,modelId: this.modelId
					,state: stateUpdate
				});
			}
		}
	});

	// ++++++++++++++++++++++++++++++++++++++++++++++
	var CineMapFilter = $n2.Class('CineMapFilter',$n2.modelFilter.SelectableDocumentFilter,{

		currentChoices: null,

		currentCallback: null,

		initialize: function(opts_) {
			var opts = $n2.extend({
				modelId: null
				,sourceModelId: null
				,dispatchService: null
			},opts_);

			var _this = this;

			$n2.modelFilter.SelectableDocumentFilter.prototype.initialize.call(this,opts);

			this.currentChoices = [];
			this.currentCallback = null;

			if (this.dispatchService) {
				var f = function(m, addr, dispatcher) {
					_this._handleLayerFilterEvents(m, addr, dispatcher);
				};
				//this.dispatchService.register(DH,'documentContent',f);
			}
		},

		_handleLayerFilterEvents: function(m, addr, dispatcher) {},

		_computeAvailableChoicesFromDocs: function(docs, callbackFn) {
			var choiceLabelsById = {};
			docs.forEach(function(doc) {
				if (doc
					&& doc.atlascine_cinemap) {
					var label = doc.atlascine_cinemap.title;
					if (!label) {
						label = doc._id;
					}

					choiceLabelsById[doc._id] = label;
				}
			});

			var availableChoices = [];
			for (var id in choiceLabelsById) {
				var label = choiceLabelsById[id];
				availableChoices.push({
					id: id
					,label: label
				});
			}

			availableChoices.sort(function(a,b) {
				if (a.label < b.label) {
					return -1;
				}

				if (a.label > b.label) {
					return 1;
				}

				return 0;
			});

			this.currentChoices = availableChoices;
			this.currentCallback = callbackFn;

			callbackFn(availableChoices);

			return null;
		},

		_isDocVisible: function(doc, selectedChoiceIdMap) {
			if (selectedChoiceIdMap[doc._id]) {
				if (doc && doc.atlascine_cinemap) {
					return true;
				}
			}

			return false;
		}
	});

//	++++++++++++++++++++++++++++++++++++++++++++++
	function handleModelEvents(m, addr, dispatcher) {
		var options, key, value;
		if ('modelCreate' === m.type) {
			if ('cineTimeIndexTransform' === m.modelType) {
				options = {};

				if (m.modelOptions) {
					for (key in m.modelOptions) {
						value = m.modelOptions[key];
						options[key] = value;
					}
				}

				options.modelId = m.modelId;

				if (m && m.config) {
					if (m.config.directory) {
						options.dispatchService = m.config.directory.dispatchService;
					}
				}

				new CineTimeIndexTransform(options);

				m.created = true;

			} else if ('cineData2DonutTransform' === m.modelType ) {
				options = {};
				if (m.modelOptions) {
					for (key in m.modelOptions) {
						value = m.modelOptions[key];
						options[key] = value;
					}
				}

				options.modelId = m.modelId;

				if (m && m.config) {
					if (m.config.directory) {
						options.dispatchService = m.config.directory.dispatchService;
					}
				}

				new CineData2DonutTransform(options);

				m.created = true;

			} else if ('cineMapFilter' === m.modelType ) {
				options = {};
				if (m.modelOptions) {
					for (key in m.modelOptions) {
						value = m.modelOptions[key];
						options[key] = value;
					}
				}

				options.modelId = m.modelId;

				if (m && m.config) {
					if (m.config.directory) {
						options.dispatchService = m.config.directory.dispatchService;
					}
				}

				new CineMapFilter(options);
				m.created = true;

			} else if ('searchResult2DonutTransform' === m.modelType) {
				options = {};
				if (m.modelOptions) {
					for (key in m.modelOptions) {
						value = m.modelOptions[key];
						options[key] = value;
					}
				}

				options.modelId = m.modelId;

				if (m && m.config) {
					if (m.config.directory) {
						options.dispatchService = m.config.directory.dispatchService;
						options.requestService = m.config.directory.requestService;
					}
				}

				new SearchResult2DonutTransform(options);

				m.created = true;
			}
		}
	}

	var TagUtility = $n2.Class('TagUtility', {

		name: null,

		dispatchService: null,

		eventService: null,

		atlasDb: null,

		customService: null,

		showService: null,

		sourceModelId: undefined,

		initialize: function(opts_) {
			var opts = $n2.extend({
				name: undefined
				,dispatchService: null
				,eventService: null
				,atlasDb: null
				,sourceModelId: null
				,customService: null
				,showService: null
			},opts_);

			var _this = this;

			this.name = opts.name;
			this.dispatchService = opts.dispatchService;
			this.eventService = opts.eventService;
			this.atlasDb = opts.atlasDb;
			this.customService = opts.customService;
			this.showService = opts.showService;
			this.sourceModelId = opts.sourceModelId;
			this.colorProfile = undefined;
			this.tagsBysentenceSpanIds = {};

			if (!this.dispatchService) {
				throw new Error('ColorUtility requires dispatchService');
			}

//			if (!this.eventService) {
//				throw new Error('GetSelectionUtility requires eventService');
//			};
//			if (!this.atlasDb) {
//				throw new Error('GetSelectionUtility requires atlasDb');
//			};

			// Keep track of current selection
//			this.currentSelectionNumber = 0;
//			this.currentFocusNumber = 0;

			if (this.dispatchService) {
				var f = function(m, addr, dispatcher) {
					_this._handle(m, addr, dispatcher);
				};

				this.dispatchService.register(DH, 'modelStateUpdated', f);
				this.dispatchService.register(DH, 'resetDisplayedSentences', f);
			}

			// Install on event service
//			this.originalEventHandler = this.eventService.getHandler();
//			this.eventService.register('userSelect');
//			this.eventService.register('userFocusOn');
//			this.eventService.setHandler(function(m, addr, dispatcher) {
//				_this._handleEvent(m, addr, dispatcher);
//			});

			var m = {
					type:'modelGetState'
					,modelId: this.sourceModelId
				};
				this.dispatchService.synchronousCall(DH, m);
				if (m.state) {
					this._sourceModelUpdated(m.state);
				}
			$n2.log(this._classname, this);
		},

		_handle: function(m, addr, dispatcher) {
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

		_reply: function(nextStop) {
			var _this = this;
			if (this.tagsBySentenceSpanIds) {
				this.dispatchService.send(DH, {
					type: 'replyColorForDisplayedSentences'
					,data: _this.tagsBySentenceSpanIds
				});
			}
		},

		_cinemapUpdate: function( sourceState) {
			var i, e, doc, docId;
			var forceSingleCinemap = true;
			var removed = [];
			var added = []
			,updated = []
			,cinemapChanged = false
			,cinemapUpdated = false;
			//this.cineIndexByDocId = {};

			if (typeof sourceState.loading === 'boolean'
				&& this.modelIsLoading !== sourceState.loading) {
				this.modelIsLoading = sourceState.loading;
			}

			if (sourceState.removed) {
				for (i=0, e=sourceState.removed.length; i<e; ++i) {
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
				for (i=0, e=sourceState.added.length; i<e; ++i) {
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
				for (i=0,e=sourceState.updated.length; i<e; ++i) {
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
						var original = this.tagsBySentenceSpanIds [spanId];
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
									tags.push.apply(tags,tagsFromTagsGroup );
									atleastOne = true;
								}
								//$n2.log(referencedDocId + 'tags from calculating: ', tags);
							}
						}

						var color = findUniqueColorByTags(tagColorProfile, tags);
						if (atleastOne && !color) {
							color = '#e6e6e6';
						}

						this.tagsBySentenceSpanIds [spanId] = $n2.extend(this.tagsBySentenceSpanIds [spanId],
							{
								color: color,
								tags: tags
							});
					}
				}
			}

			function findTimeLink(timeLinks, startTime, endTime) {
				var result = [];
				var timeLink;
				var target_start = convertTimecodeToMs(startTime);
				var target_end = convertTimecodeToMs(endTime);
				if (target_start && target_end) {
					for (var i=0,e=timeLinks.length; i<e; i++) {
						try {
							timeLink =timeLinks[i];
							var start_in_ms = convertTimecodeToMs(timeLink.starttime);
							var end_in_ms = convertTimecodeToMs(timeLink.endtime);
							if (start_in_ms &&
								end_in_ms &&
								start_in_ms === target_start &&
								end_in_ms === target_end) {
								result.push(timeLink);
							}

						} catch (err) {
							// $n2.log('Error: timelink formatting error');
							//console.log('Index:' + i + err.stack);
							continue;
						}
					}
				}

				return result;
			}

			function findTagsIncluded (tagsProfile, tag) {
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

				if(tagsProfile && Array.isArray(tagsProfile)) {
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

		_sourceModelUpdated: function( sourceState) {

		}

	});

	var reTimeCode_s = /([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2})((\,|\.)([0-9]+))?\s*/i;
	function convertTimecodeToMs (tmpTimecode) {
		var rst, matcher;
		try {
			if (!tmpTimecode) {
				throw new Error('Error: timecode is null');
			}
			matcher = reTimeCode_s.exec(tmpTimecode);
			rst = 3600000*matcher[1] + 60000*matcher[2] + 1000*matcher[3] + 1*matcher[6];
		} catch (err) {
			//$n2.log('Error: timecode parsing error');
		}

		return rst;
	}

	// ------------------------------------------------------------------------
	// ColorUtility Class
	var ColorUtility = $n2.Class('ColorUtility', {

		name: null,

		dispatchService: null,

		eventService: null,

		atlasDb: null,

		customService: null,

		showService: null,

		sourceModelId: undefined,

		initialize: function(opts_) {
			var opts = $n2.extend({
				name: undefined
				,dispatchService: null
				,eventService: null
				,atlasDb: null
				,sourceModelId: null
				,customService: null
				,showService: null
			},opts_);

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

//			if (!this.eventService) {
//				throw new Error('GetSelectionUtility requires eventService');
//			};
//			if (!this.atlasDb) {
//				throw new Error('GetSelectionUtility requires atlasDb');
//			};

			// Keep track of current selection
//			this.currentSelectionNumber = 0;
//			this.currentFocusNumber = 0;

			if (this.dispatchService) {
				var f = function(m, addr, dispatcher) {
					_this._handle(m, addr, dispatcher);
				};
				this.dispatchService.register(DH, 'colorUtilityAvailable', f);
				this.dispatchService.register(DH, 'colorUtility--getColor', f);
				this.dispatchService.register(DH, 'colorUtility--setGroup', f);
				this.dispatchService.register(DH, 'colorUtility--setGroupColorMapping', f);
				this.dispatchService.register(DH, 'colorUtility--colorProfileUpdate', f);
				this.dispatchService.register(DH, 'modelStateUpdated', f);
			}

			// Install on event service
//			this.originalEventHandler = this.eventService.getHandler();
//			this.eventService.register('userSelect');
//			this.eventService.register('userFocusOn');
//			this.eventService.setHandler(function(m, addr, dispatcher) {
//				_this._handleEvent(m, addr, dispatcher);
//			});

			var m = {
				type:'modelGetState'
				,modelId: this.sourceModelId
			};
			this.dispatchService.synchronousCall(DH, m);
			if (m.state) {
				this._sourceModelUpdated(m.state);
			}
			$n2.log(this._classname, this);
		},

		_handle: function(m, addr, dispatcher) {
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
						,unicode: unicode
						,color: rstcolor
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

		_getColor: function( tagsArr) {
			var colorProfile = this.colorProfile;
			var rst = 'pink';
//			if (colorProfile) {
//				for (var tag of tagsArr) {
//					if (tag in colorProfile
//						&& colorProfile[tag]
//						&& typeof colorProfile[tag] === "string"
//						&& colorProfile[tag] !== "") {
//						rst = colorProfile[tag];
//					}
//				}
//			}
			return rst;
		},

		_sourceModelUpdated: function( sourceState) {

		}
	});

	// ------------------------------------------------------------------------
	// GetSelectionUtility Class
	var GetSelectionUtility = $n2.Class('GetSelectionUtility', {

		name: null,

		dispatchService: null,

		eventService: null,

		atlasDb: null,

		customService: null,

		showService: null,

		initialize: function(opts_) {
			var opts = $n2.extend({
				name: undefined
				,dispatchService: null
				,eventService: null
				,atlasDb: null
				,customService: null
				,showService: null
			},opts_);

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

//			if (!this.eventService) {
//				throw new Error('GetSelectionUtility requires eventService');
//			};
//			if (!this.atlasDb) {
//				throw new Error('GetSelectionUtility requires atlasDb');
//			};

			// Keep track of current selection
//			this.currentSelectionNumber = 0;
//			this.currentFocusNumber = 0;

			if (this.dispatchService) {
				var f = function(m, addr, dispatcher) {
					_this._handle(m, addr, dispatcher);
				};
				this.dispatchService.register(DH, 'getSelectionUtilityAvailable', f);
				this.dispatchService.register(DH,'getSelectionUtility--getSelection',f);
			}

			// Install on event service
//			this.originalEventHandler = this.eventService.getHandler();
//			this.eventService.register('userSelect');
//			this.eventService.register('userFocusOn');
//			this.eventService.setHandler(function(m, addr, dispatcher) {
//				_this._handleEvent(m, addr, dispatcher);
//			});
			rangy.init();
			$n2.log(this._classname, this);
		},

		_getSelection() {
			var rangeSel =	rangy.getSelection().toHtml();
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

	// ------------------------------------------------------------------------
	// PlaceUtility Class
	var PlaceUtility = $n2.Class('PlaceUtility', {

		initialize: function(opts_) {
			var opts = $n2.extend({
				name: undefined
				,dispatchService: null
				,eventService: null
				,atlasDb: null
				,customService: null
				,showService: null
				,popupMaxLines: 12
				,suppressEmptySelection: false
				,forceEmptyFocus: false
				, sourceModelId: undefined
			},opts_);

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
				var f = function(m, addr, dispatcher) {
					_this._handle(m, addr, dispatcher);
				};
				this.dispatchService.register(DH, 'PlaceUtility--getExistingPlaces', f);
				this.dispatchService.register(DH, 'PlaceUtility--getPlaceDocIdMap',f);
				this.dispatchService.register(DH, 'modelStateUpdated', f);

				// Initialize state
				var m = {
					type:'modelGetState'
					,modelId: this.sourceModelId
				};
				this.dispatchService.synchronousCall(DH, m);
				if (m.state) {
					this._sourceModelUpdated(m.state);
				}
			}
			$n2.log(this._classname, this);
		},

		_handle: function(m, addr, dispatcher) {
			var _this = this;
			if ('PlaceUtility--getExistingPlaces' === m.type) {
				if (! _this._docIdByPlacename) {
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
//				var placeName = m.place;
//				var _name = placeName.trim().toLowerCase();
//				var trgDocId= this._docIdByPlacename[_name];
//				if (trgDocId) {
//					m.docId = trgDocId;
//				}
			}
		},

		reportCinemapPlaceUpdate: function() {
			var m = {
					type: 'PlaceUtility--updatePlaceDocIdMap'
					,map: this._docIdByPlacename
			}
			this.dispatchService.send(DH, m);
		},

		_sourceModelUpdated: function( sourceState) {
			var i, e, doc, docId, promise;
			var _this = this;
			if (sourceState.added) {
				for (i=0, e=sourceState.added.length; i<e; ++i) {
					doc = sourceState.added[i];
					docId = doc._id;
					promise = updateDocIdByPlacename(doc, 'ADD');
					// Save info
				}
			}

			// Loop through all updated documents
			if (sourceState.updated) {
				for (i=0, e=sourceState.updated.length; i<e; ++i) {
					doc = sourceState.updated[i];
					docId = doc._id;
					promise = updateDocIdByPlacename(doc, 'UPDATE');
					// Save info
				}
			}

			// Loop through all removed documents
			if (sourceState.removed) {
				for (i=0,e=sourceState.removed.length; i<e; ++i) {
					doc = sourceState.removed[i];
					docId = doc._id;
					promise = updateDocIdByPlacename(doc, 'REMOVE');
					// Save info
				}
			}

			_this.reportCinemapPlaceUpdate ();
			function updateDocIdByPlacename (doc, updateOp) {
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
						if (! _this._docIdByPlacename) {
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
						if (! _this._docIdByPlacename) {
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
	})

//	++++++++++++++++++++++++++++++++++++++++++++++
	function handleUtilityCreate(m, addr, dispatcher) {
		var options, key, value;
		if ('utilityCreate' === m.type) {
			if ('cinemaSelectionRedirector' === m.utilityType) {
				options = {};

				if (m.utilityOptions) {
					for (key in m.utilityOptions) {
						value = m.utilityOptions[key];
						options[key] = value;
					}
				}

				if (m && m.config) {
					if (m.config.directory) {
						options.dispatchService = m.config.directory.dispatchService;
						options.eventService = m.config.directory.eventService;
						options.customService = m.config.directory.customService;
						options.showService = m.config.directory.showService;
						options.atlasDb = m.config.atlasDb;
					}
				}

				new $n2.atlascineRedirector.CinemaSelectionRedirector(options);

				m.created = true;

			} else if ('multiStoriesSelectionRedirector' === m.utilityType) {
				options = {};

				if (m.utilityOptions) {
					for (key in m.utilityOptions) {
						value = m.utilityOptions[key];
						options[key] = value;
					}
				}

				if (m && m.config) {
					if (m.config.directory) {
						options.dispatchService = m.config.directory.dispatchService;
						options.eventService = m.config.directory.eventService;
						options.customService = m.config.directory.customService;
						options.showService = m.config.directory.showService;
						options.atlasDb = m.config.atlasDb;
					}
				}

				new $n2.atlascineRedirector.MultiStoriesSelectionRedirector(options);

				m.created = true;

			} else if ('getSelectionUtility' === m.utilityType) {
				options = {};

				if (m.utilityOptions) {
					for (key in m.utilityOptions) {
						value = m.utilityOptions[key];
						options[key] = value;
					}
				}

				if (m && m.config) {
					if (m.config.directory) {
						options.dispatchService = m.config.directory.dispatchService;
						options.eventService = m.config.directory.eventService;
						options.customService = m.config.directory.customService;
						options.showService = m.config.directory.showService;
						options.atlasDb = m.config.atlasDb;
					}
				}

				new GetSelectionUtility(options);

				m.created = true;
			} else if ('tagUtility' === m.utilityType) {
				options = {};

				if (m.utilityOptions) {
					for (key in m.utilityOptions) {
						value = m.utilityOptions[key];
						options[key] = value;
					}
				}

				if (m && m.config) {
					if (m.config.directory) {
						options.dispatchService = m.config.directory.dispatchService;
						options.eventService = m.config.directory.eventService;
						options.customService = m.config.directory.customService;
						options.showService = m.config.directory.showService;
						options.atlasDb = m.config.atlasDb;
					}
				}

				new TagUtility(options);
				m.created = true;

			} else if ('colorUtility' === m.utilityType) {
				options = {};

				if (m.utilityOptions) {
					for (key in m.utilityOptions) {
						value = m.utilityOptions[key];
						options[key] = value;
					}
				}

				if (m && m.config) {
					if (m.config.directory) {
						options.dispatchService = m.config.directory.dispatchService;
						options.eventService = m.config.directory.eventService;
						options.customService = m.config.directory.customService;
						options.showService = m.config.directory.showService;
						options.atlasDb = m.config.atlasDb;
					}
				}

				new ColorUtility(options);
				m.created = true;

			} else if ('placeUtility' === m.utilityType) {
				options = {};

				if (m.utilityOptions) {
					for (key in m.utilityOptions) {
						value = m.utilityOptions[key];
						options[key] = value;
					}
				}

				if (m && m.config) {
					if (m.config.directory) {
						options.dispatchService = m.config.directory.dispatchService;
						options.eventService = m.config.directory.eventService;
						options.customService = m.config.directory.customService;
						options.showService = m.config.directory.showService;
						options.atlasDb = m.config.atlasDb;
					}
				}

				new PlaceUtility(options);

				m.created = true;
			}
		}
	}

// ----------------------------------------------------------------------------
// CineDisplay Class
var CineDisplay = $n2.Class('CineDisplay',{

	dispatchService: null,

	showService: null,

	displayElemId: null,

	/**
	 * Name of the element holding the displayed elements
	 */
	displayPanelName: null,

	initialize: function(opts_) {
		var _this = this;

		var opts = $n2.extend({
			dispatchService: undefined
			,showService: undefined
			,displayPanelName: undefined
		}, opts_);

		this.dispatchService = opts.dispatchService;
		this.showService = opts.showService;
		this.displayPanelName = opts.displayPanelName;

		var dispatcher = this.dispatchService;
		if (dispatcher ) {
			var f = function(msg, addr, d) {
				_this._handleDispatch(msg, addr, d);
			};
			dispatcher.register(DH, 'selected', f);
			dispatcher.register(DH, 'unselected', f);
			dispatcher.register(DH, 'searchResults', f);
			dispatcher.register(DH, 'documentDeleted', f);
			dispatcher.register(DH, 'authLoggedIn', f);
			dispatcher.register(DH, 'authLoggedOut', f);
			dispatcher.register(DH, 'editClosed', f);
			dispatcher.register(DH, 'documentContent', f);
			dispatcher.register(DH, 'documentContentCreated', f);
			dispatcher.register(DH, 'documentContentUpdated', f);
		}

		// Create display dialog div
		this.displayElemId = $n2.getUniqueId();
		var $dialog = $('<div>')
			.attr('id',this.displayElemId)
			.addClass('cineDisplay_root')
			.appendTo( $('body'));
		var dialogOptions = {
			autoOpen: false
			,title: _loc('Search Results')
			,modal: false
			,close: function(event, ui) {
				$(this).empty();
				_this.dispatchService.send(DH,{
					type: 'searchDeactivated'
				});
			}
		};

		$dialog.dialog(dialogOptions);
		//$dialog.dialog("close");
		//$('body').addClass('n2_display_format_cine');

		$n2.log('CineDisplay',this);
	},

	_handleDispatch: function(m, addr, d) {
		if ('searchResults' == m.type) {
			this._displaySearchResults(m.results);

		} else if ('selected' == m.type) {
			var docIds = [];
			if (m.docId) {
				docIds.push(m.docId);
			}

			if (m.docIds) {
				for (var docId of m.docIds) {
					docIds.push(docId);
				}
			}
			this._displayDocuments(docIds);

		} else if ('unselected' == m.type) {
			var $elem = this._getDisplayDiv();
			$elem
			.empty().dialog("close");
		}
	},

	_getDisplayDiv: function() {
		var divId = this.displayElemId;
		return $('#'+divId);
	},

	_displayDocuments: function(docIds) {
		var $elem = this._getDisplayDiv();

		$elem.empty();

		for (var docId of docIds) {
			var $contentDiv = $('<div>')
				.addClass('n2s_handleHover')
				.attr('n2-docId',docId)
				.appendTo($elem);
			this.showService.printDocument($contentDiv, docId);
		}

		$elem.dialog("open");
	},

	/*
	 * Accepts search results and display them
	 */
	_displaySearchResults: function(results) {

		var _this = this;

		var $elem = this._getDisplayDiv();

		$elem.empty();

		var ids = [];
		if (results && results.sorted && results.sorted.length ) {
			for (var i=0,e=results.sorted.length; i<e; ++i) {
				ids.push(results.sorted[i].id);
			}
		}

		if (ids.length < 1) {

			$elem
				.text( _loc('Empty search results') );

		} else {
			for (var docId of ids) {
				var $contentDiv = $('<div>')
					.addClass('n2s_handleHover')
					.attr('n2-docId',docId)
					.appendTo($elem)
					.click(function() {
						var $contentElem = $(this);
						var docId = $contentElem.attr('n2-docId');
						if (docId) {
							_this.dispatchService.send(DH,{
								type: 'userSelect'
								,docId: docId
							});
						}
					});
				this.showService.printBriefDescription($contentDiv, docId);
			}
			//$elem.show();
		}

		var isOpen = $elem.dialog("isOpen");
		if (!isOpen) {
			$elem.dialog("open");
		}
	}
});

//------------------------------------------------
var CineDisplayGlobal = $n2.Class('CineDisplayGlobal',{

	dispatchService: null,

	showService: null,

	displayElemId: null,

	/**
	 * Name of the element holding the displayed elements
	 */
	displayPanelName: null,

	initialize: function(opts_) {
		var _this = this;

		var opts = $n2.extend({
			dispatchService: undefined
			,showService: undefined
			,displayPanelName: undefined
		}, opts_);

		this.dispatchService = opts.dispatchService;
		this.showService = opts.showService;
		this.displayPanelName = opts.displayPanelName;

		var dispatcher = this.dispatchService;
		if (dispatcher ) {
			var f = function(msg, addr, d) {
				_this._handleDispatch(msg, addr, d);
			};
			dispatcher.register(DH, 'selected', f);
			dispatcher.register(DH, 'unselected', f);
			dispatcher.register(DH, 'searchResults', f);
			dispatcher.register(DH, 'documentDeleted', f);
			dispatcher.register(DH, 'authLoggedIn', f);
			dispatcher.register(DH, 'authLoggedOut', f);
			dispatcher.register(DH, 'editClosed', f);
			dispatcher.register(DH, 'documentContent', f);
			dispatcher.register(DH, 'documentContentCreated', f);
			dispatcher.register(DH, 'documentContentUpdated', f);
		}

		// Create display dialog div
		this.displayElemId = $n2.getUniqueId();
		var $dialog = $('<div>')
			.attr('id',this.displayElemId)
			.addClass('cineDisplay_root')
			.appendTo( $('body'));
		var dialogOptions = {
			autoOpen: false
			,title: _loc('Search Results')
			,modal: false
			,close: function(event, ui) {
				$(this).empty();
				_this.dispatchService.send(DH,{
					type: 'searchDeactivated'
				});
			}
		};

		$dialog.dialog(dialogOptions);
		//$dialog.dialog("close");
		//$('body').addClass('n2_display_format_cine');

		$n2.log('CineDisplay',this);
	},

	_handleDispatch: function(m, addr, d) {
		if ('searchResults' == m.type) {
			this._displaySearchResults(m.results);

		} else if ('selected' == m.type) {
			var docIds = [];
			if (m.docId) {
				docIds.push(m.docId);
			}

			if (m.docIds) {
				for (var docId of m.docIds) {
					docIds.push(docId);
				}
			}
			this._displayDocuments(docIds);

		} else if ('unselected' == m.type) {
			var $elem = this._getDisplayDiv();
			$elem.empty().dialog("close");
		}
	},

	_getDisplayDiv: function() {
		var divId = this.displayElemId;
		return $('#'+divId);
	},

	_displayDocuments: function(docIds) {
		var $elem = this._getDisplayDiv();

		$elem.empty();

		for (var docId of docIds) {
			var $contentDiv = $('<div>')
				.addClass('n2s_handleHover')
				.attr('n2-docId',docId)
				.appendTo($elem);
			this.showService.printDocument($contentDiv, docId);
		}

		$elem.dialog("open");
	},

	/*
	 * Accepts search results and display them
	 */
	_displaySearchResults: function(results) {

		var _this = this;

		var $elem = this._getDisplayDiv();

		$elem.empty();

		var ids = [];
		if (results && results.sorted && results.sorted.length ) {
			for (var i=0,e=results.sorted.length; i<e; ++i) {
				ids.push(results.sorted[i].id);
			}
		}

		if (ids.length < 1) {
			$elem.text( _loc('Empty search results') );

		} else {
			for (var docId of ids) {
				var $contentDiv = $('<div>')
					.addClass('n2s_handleHover')
					.attr('n2-docId',docId)
					.appendTo($elem)
					.click(function() {
						var $contentElem = $(this);
						var docId = $contentElem.attr('n2-docId');
						if (docId) {
							_this.dispatchService.send(DH,{
								type: 'userSelect'
								,docId: docId
							});
						}
					});
				this.showService.printBriefDescription($contentDiv, docId);
			}
			//$elem.show();
		}

		var isOpen = $elem.dialog("isOpen");
		if (!isOpen) {
			$elem.dialog("open");
		}
	}
});

//============ SearchInput ========================
var SearchInput = $n2.Class({
	options: null

	,searchServer: null

	,textInputId: null

	,searchButtonId: null

	,keyPressedSinceLastSearch: null

	,dispatchHandle: null

	,initialize: function(opts_) {
		this.options = $n2.extend({
			textInput: null
			,designDoc: null
			,searchButton: null
			,initialSearchText: null
			,constraint: null
			,displayFn: null // one of displayFn or
			,dispatchService: null // dispatchService should be supplied
		},opts_);

		this.keyPressedSinceLastSearch = false;
		this.designDoc = this.options.designDoc;
//		if (this.options.dispatchService ) {
//			var f = function(m) {
//				_this._handle(m);
//			};
////			this.options.dispatchService.register(DH,'searchInitiate',f);
////			this.options.dispatchService.register(DH,'selected',f);
////			this.options.dispatchService.register(DH,'unselected',f);
////			this.options.dispatchService.register(DH,'searchActivated',f);
////			this.options.dispatchService.register(DH,'searchDeactivated',f);
//
//			// Activate/Deactivate Search Box
//			$('.searchIcon').click(function() {
//				if ($('.nunaliit_search_input').hasClass('search_active')) {
//					_this.options.dispatchService.send(DH,{
//						type: 'searchDeactivated'
//					});
//
//				} else if ($('.nunaliit_search_input').hasClass('search_inactive')) {
//					_this.options.dispatchService.send(DH,{
//						type: 'searchActivated'
//					});
//
//				} else {
//					_this.options.dispatchService.send(DH,{
//						type: 'searchActivated'
//					});
//				};
//			});
//		};

		// Figure out id. We should not hold onto a reference
		// to the input since it would create a circular reference.
		// This way, if the element is removed from the window tree,
		// it all cleans up easy.
		var $textInput = this.options.textInput;
		this.textInputId = $n2.utils.getElementIdentifier($textInput);
		this.options.textInput = null; // get rid of reference

		// Same for button
		if (this.options.searchButton ) {
			var $searchButton = this.options.searchButton;
			var searchButtonId = $searchButton.attr('id');
			if (!searchButtonId ) {
				searchButtonId = $n2.getUniqueId();
				$searchButton.attr('id',searchButtonId);
			}
			this.searchButtonId = searchButtonId;
			this.options.searchButton = null; // get rid of reference
		}

		if (!this.options.initialSearchText) {
			this.options.initialSearchText = '';
		}

		this._install();
	}

	,getTextInput: function() {
		return $('#'+this.textInputId);
	}

	,getSearchButton: function() {
		if (this.searchButtonId ) {
			return $('#'+this.searchButtonId);
		}
		return null;
	}

	,getSearchLine: function() {
		var $textInput = this.getTextInput();
		var line = $textInput.val();
		if (line && line.length > 0 ) {
			if (line === this.options.initialSearchText) {
				return '';

			} else {
				return line;
			}

		} else {
			return '';
		}
	}

	,performSearch: function(line) {

		var _this = this;

		if (this.options.dispatchService ) {
			this.options.dispatchService.send(DH, {
				type: 'searchInitiateForDisplayWidget'
				,searchLine: line
			});

		} else if (this.searchServer) {
			this.searchServer.submitRequest(
				line
				,{
					onSuccess: function(searchResults) {
						_this._processSearchResults(searchResults);
					}
					,onError: function(err) {
						_this._processSearchError(err);
					}
				}
			);
		}

		this.keyPressedSinceLastSearch = true;
		this._displayWait();
	}

	,_install: function() {

		var _this = this;

		var $textInput = this.getTextInput();

		if (this.options.initialSearchText ) {
			$textInput.val(this.options.initialSearchText);
		}

		if ($textInput.autocomplete ) {
			$textInput.autocomplete({
				source: this._getJqAutoCompleteSource(),
				select: function(event, ui) {
					var line = ui.item.value;
					if (line.length > 0 ) {
						_this._closeLookAhead();
						_this.performSearch(line);
						_this._closeLookAhead();
					}
				}
			});
		}

		$textInput.keydown(function(e) {
			_this._keyDown(e);
		});

		$textInput.focus(function(e) {
			_this._focus(e);
		});

		$textInput.blur(function(e) {
			_this._blur(e);
		});

		var $searchButton = this.getSearchButton();
		if ($searchButton ) {
			$searchButton.click(function(e) {
				_this._clickSearch(e);
			});
		}
	}

	,_focus: function(e) {
		var $textInput = this.getTextInput();
		if (this.options.initialSearchText ) {
			var value = $textInput.val();
			if(this.options.initialSearchText === value) {
				$textInput.val('');
			}
		}
		$textInput.select();
	}

	,_blur: function(e) {
		if (this.options.initialSearchText ) {
			var $textInput = this.getTextInput();

			var value = $textInput.val();
			if ('' === value ) {
				$textInput.val(this.options.initialSearchText);
			}
		}
	}

	,_keyDown: function(e) {
		var charCode = null;
		if (null === e ) {
			e = window.event; // IE
		}

		if (null !== e ) {
			if (e.keyCode ) {
				charCode = e.keyCode;
			}
		}

		this.keyPressedSinceLastSearch = true;

//		$n2.log('_keyDown',charCode,e);
		if (13 === charCode || null === charCode) {
			// carriage return or I'm not detecting key codes
			// and have to submit on each key press - yuck...
			var line = this.getSearchLine();
			if (line.length > 0 ) {
				this._closeLookAhead();
				this.performSearch(line);
				this._closeLookAhead();
			}
		}
	}

	,_clickSearch: function(e) {
		var line = this.getSearchLine();
		if (line.length > 0 ) {
			this._closeLookAhead();
			this.performSearch(line);
			this._closeLookAhead();
		}
	}

	,_closeLookAhead: function($textInput) {
		if (!$textInput ) {
			$textInput = this.getTextInput();
		}

		if ($textInput.autocomplete ) {
			// Close autocomplete
			$textInput.autocomplete('close');
		}
	}

	,_processSearchResults: function(searchResults) {
		if (this.options.displayFn ) {
			searchResults.type = 'results';
			this.options.displayFn(searchResults);

		} else if (this.options.dispatchService ) {
			this.options.dispatchService.send(DH, {
				type: 'searchResults'
				,results: searchResults
			});

		} else {
			$n2.log('Unable to return search results');
		}
	}

	,_processSearchError: function(err) {
		if (this.options.displayFn ) {
			var display = {
				type:'error'
				,error: err
			}

			this.options.displayFn(display);

		} else if (this.options.dispatchService ) {
			this.options.dispatchService.send(DH, {
				type: 'searchResults'
				,error: err
			});
		}
	}

	,_displayWait: function() {
		if (this.options.displayFn ) {
			this.options.displayFn({type:'wait'});
		}
	}

	,_getJqAutoCompleteSource: function() {
		var _this = this;
		return function(request, cb) {
			_this._jqAutoComplete(request, cb);
		}
	}

	,getLookAheadService: function() {
		if (!this.lookAheadService ) {
			this.lookAheadService = new LookAheadService({
				designDoc: this.designDoc
				,lookAheadLimit: 5
				,lookAheadPrefixMin: 3
				,lookAheadCacheSize: 10
				,constraint: null
			});
		}

		return this.lookAheadService;
	}

	,_jqAutoComplete: function(request, cb) {
		// Redirect to look ahead service, but intercept
		// result.
		var _this = this;
		var lookAheadService = this.getLookAheadService();
		lookAheadService._jqAutoComplete(request, function(res) {
			if (_this.keyPressedSinceLastSearch ) {
				cb(res);
			} else {
				// suppress since the result of look ahead service
				// comes after search was requested
				cb(null);
			}
		});
	}

	,_activateSearchBar: function() {
		$('.nunaliit_search_input')
			.addClass('search_active')
			.removeClass('search_inactive');

		// Move focus to search input box
		$('.nunaliit_search_input input').focus();
	}

	,_deactivateSearchBar: function() {
		$('.nunaliit_search_input')
			.addClass('search_inactive')
			.removeClass('search_active');
	}

	,_handle: function(m) {
		var $textInput;
		if ('searchInitiate' === m.type) {
			$textInput = this.getTextInput();
			$textInput.val(m.searchLine);
			this.options.dispatchService.send(DH,{
				type: 'searchActivated'
			});

		} else if ('selected' === m.type
			|| 'unselected' === m.type) {
			$textInput = this.getTextInput();
			if (this.options.initialSearchText ) {
				$textInput.val(this.options.initialSearchText);

				// Hide search bar after document selection
				this.options.dispatchService.synchronousCall(DH,{
					type: 'searchDeactivated'
				});

			} else {
				$textInput.val('');
			}

		} else if ('searchActivated' === m.type) {
			this._activateSearchBar();

		} else if ('searchDeactivated' === m.type) {
			this._deactivateSearchBar();
		}
	}
});

var DisplaySearchResultsWidget = $n2.Class('DisplaySearchResultsWidget',{

	//Element id for the root div node for whole widget
	elemId: null ,

	initialize: function(opts_) {
		var opts = $n2.extend({
			containerClass: undefined
			,dispatchService: undefined
			,sourceModelId: undefined
			,documentSource: undefined
			,requestService: undefined
			,designDoc: undefined
		},opts_);

		var _this = this;

		this.dispatchService = opts.dispatchService;
		this.sourceModelId = opts.sourceModelId;
		this.documentSource = opts.documentSource;
		this.requestService = opts.requestService;
		this.designDoc = opts.designDoc;
		this.elemId = $n2.getUniqueId();
		$('<div>')
			.attr('id', this.elemId)
			.appendTo($('.' + opts.containerClass));

		this.docsById = {};
		this.mediaIdToCinemapId = {};
		this._cachedMediaDoc = {};
		this._indexOfTags = null;

		this.searchResultDivId = $n2.getUniqueId();

		// Set up dispatcher
		if (this.dispatchService) {
			var f = function(m, addr, dispatcher) {
				_this._handle(m, addr, dispatcher);
			};

			this.dispatchService.register(DH, 'modelStateUpdated', f);
			this.dispatchService.register(DH, 'documentContent' , f);
			this.dispatchService.register(DH, 'searchInitiateForDisplayWidget', f);
			this.dispatchService.register(DH, 'searchResultsForDisplayWidget', f);
			if (this.sourceModelId) {
				// Initialize state
				var state = $n2.model.getModelState({
					dispatchService: this.dispatchService
					,modelId: this.sourceModelId
				});

				if (state) {
					this._sourceModelUpdated(state);
				}
			}
		}

		this._installSearchInput();
		$('<div>')
		.attr('id', _this.searchResultDivId )
		.appendTo($('#' + _this.elemId));
		$n2.log(this._classname, this);
	},

	_handle: function(m, addr, dispatcher) {
		var _this = this;
		if ('modelStateUpdated' === m.type) {
			if (this.sourceModelId === m.modelId) {
				this._sourceModelUpdated (m.state);
			}

		} else if ('searchInitiateForDisplayWidget' === m.type) {
			var searchTerms = m.searchLine;
			_this.execSearch(searchTerms);

		} else if ('searchResultsForDisplayWidget' === m.type) {
			var result = m.results;
			//$n2.log('search result ', result);
			var $resDiv = $('#' + _this.searchResultDivId);
			$resDiv.empty();
			_this._displayTagSearchResult($resDiv, result);

			//$resDiv.text(JSON.stringify(result, undefined, 2));
			//
		} else if ('documentContent' === m.type) {
			this._receiveDocumentContent(m.doc);
		}
	},

	_receiveDocumentContent: function(doc) {
		var cinemapId, mediaDocId;
		var _this = this;
		var docId = doc._id;
		if (!this._cachedMediaDoc[docId]) {
			this._cachedMediaDoc[docId] = doc;
		}

		if (doc.atlascine_cinemap) {
			var mediaRef = doc.atlascine_cinemap.media_doc_ref;
			cinemapId = doc._id;

			if (mediaRef) {
				mediaDocId = mediaRef.doc;
				this.mediaIdToCinemapId [mediaDocId] = cinemapId;
				this._requestDocumentWithId (mediaDocId);
			}

		} else if (doc.atlascine_media) {
			var $set = this._getResultDiv();
			var thumbnailName = null;
			if (doc.nunaliit_attachments
				&& doc.nunaliit_attachments.files) {
				for (var attName in doc.nunaliit_attachments.files) {
					var att = doc.nunaliit_attachments.files[attName];
					if (att.thumbnail) {
						thumbnailName = att.thumbnail;
					}
				}
			}

			if (thumbnailName) {
				var url = this.documentSource.getDocumentAttachmentUrl(doc,thumbnailName);
				if (url) {
					mediaDocId = doc._id;
					cinemapId = _this.mediaIdToCinemapId[mediaDocId];
					if (cinemapId) {
						$set.find('.n2card__media__' + $n2.utils.stringToHtmlId(cinemapId)).each(function() {
							var $div = $(this);
							$div.css({backgroundImage: 'url(' +url + ')'});

//						$div.empty();
//							$('<img>')
//								.attr('src',url)
//								.appendTo($div);
						});
					}
				}
			}
		}
	},

	_getResultDiv: function() {
		var rstDivId = this.searchResultDivId;
		return $('#' + rstDivId);
	},

	_displayTagSearchResult: function($elem, searchResult) {
		var $container = $elem;
		if (!searchResult || searchResult.length === 0) {
			$('<div>')
				.text("No matching tag")
				.appendTo($container);
			return;
		}
		var cinemapIdExisted = {};
		for (var i=0,e=searchResult.length;i<e; i++) {
			var cinemapId = searchResult[i].value.cinemapId;
			var value = searchResult[i].value.value;
			var places = searchResult[i].value.places || [];
			if (cinemapIdExisted[cinemapId]) {
				if (places.length > 0) {
					for (var j = 0,k=places.length; j<k; j++) {
						var pl = places[j];
						if (cinemapIdExisted[cinemapId].places.indexOf(pl) > -1) {

						} else {
							cinemapIdExisted[cinemapId].places.push(pl);
						}
					}
				}

			} else {
				cinemapIdExisted[cinemapId] = {
						cinemapId: cinemapId
						,value: value
						,places: places
				}
			}

		}

		for (var cinemapId in cinemapIdExisted) {
			new $n2.mdc.MDCCard ({
				parentElem: $container
				,imageGenerator: function() {
					return '<div class="mdc-card__media mdc-card__media--square n2card__media__'
						+ $n2.utils.stringToHtmlId(cinemapId)
						+ '"></div>'
				}

				,infoGenerator: function() {
					var rst = '<div>';
					for (var k in cinemapIdExisted[cinemapId]) {
						if (k && k.endsWith('time')) {
							continue;
						}

						rst += k + ' : ' + cinemapIdExisted[cinemapId][k] + '<br>';

					}
					rst += '</div>';
					return rst;
				}
			})

			this._requestDocumentWithId (cinemapId);
		}
//		var mdc_card_html = '<div class="mdc-card">'
//						+ '<div class="mdc-card__primary-action">'
//							+ '<div class="mdc-card__primary-action">'
//								+ '<div class="mdc-card__media mdc-card__media--square">'
//									+ '<div class="mdc-card__media-content">Title</div>'
//								+ '</div>'
//							+ '</div>'
//						+ '</div>'
//						+ '</div>';
//		var $mdc_card = $($.parseHTML(mdc_card_html));
//		$mdc_card.appendTo($container);
	},

	_requestDocumentWithId: function(docId) {
		//Looking in the cache
		var doc = this._cachedMediaDoc[docId];
		if (doc) {
			this._receiveDocumentContent(doc);
			return;
		}

		if (this.requestService) {
			this.requestService.requestDocument(docId);
		}
	},

	execSearch: function(searchTerms) {
/*		var _db = this._indexOfTags;
		var rst = _db[searchTerms];
		return rst;*/
		var _this = this;
		var startKey =	searchTerms;
		var endKey = searchTerms + '\u9999';
		this.designDoc.queryView({
			viewName: 'tags_detailed'
			,startkey: startKey
			,endkey: endKey
			,top: undefined
			,onlyRows: true
			,reduce: false
			,onSuccess: function(response) {

				//$n2.log('tags_detailed view responds:' , response);
				if (response &&
					Array.isArray(response) &&
					response.length > 0) {
					_this.dispatchService.send(DH, {
						type: 'searchResultsForDisplayWidget'
						,results: response
					});
				}
			}

			,onError: function() {
				callback(prefix, null);
			}
		})
	},

	_sourceModelUpdated: function(sourceState) {
		var i, e, doc, docId;
		if (sourceState.added) {
			for (i=0, e=sourceState.added.length; i<e; ++i) {
				doc = sourceState.added[i];
				docId = doc._id;

				this.docsById[docId] = doc;
			}
		}

		if (sourceState.updated) {
			for (i=0, e=sourceState.updated.length; i<e; ++i) {
				doc = sourceState.updated[i];
				docId = doc._id;

				this.docsById[docId] = doc;
			}
		}

		if (sourceState.removed) {
			for (i=0, e=sourceState.removed.length; i<e; ++i) {
				doc = sourceState.removed[i];
				docId = doc._id;

				delete this.docsById[docId];
			}
		}
		//this._indexUpdate();
	},

	_indexUpdate: function() {
		this._indexOfTags = {};

		for (var id in this.docsById) {
			var doc = this.docsById[id];
			var cinemaps = doc.atlascine_cinemap;
			var tl = cinemaps.timeLinks;
			if (tl) {
				for (var i=0,e=tl.length; i<e; i++) {
					var te = tl[i];
					var _tags = te.tags;
					var _tags_places = undefined;
					for (var j=0,k=_tags.length; j<k; j++) {
						var _tag = _tags[j];
						var key = _tag.value;
						var key_t = _tag.type;
						if (!this._indexOfTags[key]) {
							this._indexOfTags[key] = [];
						}

						if (!this._indexOfTags[key_t]) {
							this._indexOfTags[key_t] = [];
						}

						if (_tag.type === 'place' || _tag.type === 'location') {
							if (!_tags_places) {
								_tags_places = [];
							}
							_tags_places.push(_tag.value);
						}

						var _tagInfo =	{
							cinemapId: id
							,cinemapDoc: doc
							,type: _tag.type
							,value: _tag.value
							,places:_tags_places
							,starttime: te.starttime
							,endtime: te.endtime
						};
						this._indexOfTags[key].push(_tagInfo);
						this._indexOfTags[key_t].push(_tagInfo);
					}
				}

			} else {
				continue;
			}
		}
		$n2.log('The indexofTags', this._indexOfTags);
	},

	_installSearchInput: function() {
		var $elem = this._getElem();
		var searchInput = $('<input type="text">')
			.addClass('search_panel_input')
			.appendTo($elem);

		return new SearchInput({
			textInput: searchInput
			,dispatchService: this.dispatchService
			,designDoc: this.designDoc
		});
	},

	_getElem: function() {
		return $('#'+this.elemId);
	},

	/*
	 * This function should be called before any displaying is performed.
	 * This ensures that the div element in use still contains the required
	 * elements for performing display.
	 */
	_reclaimDisplayDiv: function() {
		var _this = this;

		var $set = this._getDisplayDiv();

		var $filters = $set.find('.n2DisplayTiled_filters');
		var $current = $set.find('.n2DisplayTiled_info');
		var $docs = $set.find('.n2DisplayTiled_documents');
		if ($filters.length < 1
			|| $current.length < 1
			|| $docs.length < 1) {
			$set.empty();
			$filters = $('<div>')
				.addClass('n2DisplayTiled_filters')
				.appendTo($set);
			$current = $('<div>')
				.addClass('n2DisplayTiled_info')
				.appendTo($set);
			$docs = $('<div>')
				.addClass('n2DisplayTiled_documents')
				.appendTo($set);

			// When the side panel must be re-claimed, then we must
			// forget what is currently displayed since it has to be
			// re-computed
			this.currentDetails = {};

			// Create grid
			this.grid = new Tiles.Grid($docs);
			this.grid.createTile = function(docId) {
				var $elem = $('<div>')
					.addClass('n2DisplayTiled_tile')
					.addClass('n2DisplayTiled_tile_' + $n2.utils.stringToHtmlId(docId))
					.attr('n2DocId',docId);

				$elem.hover(
					_this.hoverInFn
					,_this.hoverOutFn
				);

				var tile = new Tiles.Tile(docId, $elem);

				if (_this.currentDetails
					&& _this.currentDetails.docId === docId) {
					// Current document
					$elem.addClass('n2DisplayTiled_tile_current');
					_this._generateCurrentDocumentContent($elem, docId);

				} else {
					// Not current document
					_this._generateDocumentContent($elem, docId);
				}
				return tile;
			}

			// Create document filter
			this.filter = this.filterFactory.get($filters,function() {
				_this._documentFilterChanged();
			});
		}
	},

	_displaySearchResults: function(results) {

		this._reclaimDisplayDiv();

		var ids = [];
		if (results && results.sorted && results.sorted.length ) {
			for (var i=0,e=results.sorted.length; i<e; ++i) {
				ids.push(results.sorted[i].id);
			}
		}

		this._displayMultipleDocuments(ids, null);

		if (ids.length < 1) {
			var $set = this._getDisplayDiv();
			var $current = $set.find('.n2DisplayTiled_info');
			$current
				.text( _loc('Empty search results') )
				.show();
		}
	},

	_renderError: function(errMsg) {
		var $elem = this._getElem();

		$elem.empty();
		//If no valid tether transcript content to show, only logging into console
//
//		var label = _loc('Unable to display tether content({docId})',{
//			docId: this.docId
//		});
//		$('<span>')
//			.addClass('n2widgetTranscript_error')
//			.text(label)
//			.appendTo($elem);
//
		$n2.logError('Unable to display tether content({docId}): '+errMsg);
	}

});

function handleDisplayAvailable(m, addr, dispatcher) {
	if (m.displayType === 'cineDisplayGlobal') {
		m.isAvailable = true;
	} else if (m.displayType === 'cineDisplay') {
		m.isAvailable = true;
	}
}

function handleDisplayRender(m, addr, dispatcher) {
	var options, key, displayControl;
	if (m.displayType === 'cineDisplayGlobal') {
		options = {};
		if (m.displayOptions) {
			for (key in m.displayOptions) {
				options[key] = m.displayOptions[key];
			}
		}

		options.displayPanelName = m.displayId;

		if (m && m.config && m.config.directory) {
			options.dispatchService = m.config.directory.dispatchService;
			options.showService = m.config.directory.showService;
		}

		displayControl = new CineDisplayGlobal(options);
		m.onSuccess(displayControl);

	} else if (m.displayType === 'cineDisplay') {
		options = {};
		if (m.displayOptions) {
			for (key in m.displayOptions) {
				options[key] = m.displayOptions[key];
			}
		}

		options.displayPanelName = m.displayId;

		if (m && m.config && m.config.directory) {
			options.dispatchService = m.config.directory.dispatchService;
			options.showService = m.config.directory.showService;
		}

		displayControl = new CineDisplay(options);
		m.onSuccess(displayControl);
	}
}

function HandleWidgetAvailableRequests(m) {
	if (m.widgetType === 'displaySearchResultsWidget') {
		m.isAvailable = true;

	}
}

//--------------------------------------------------------------------------
function HandleWidgetDisplayRequests(m) {
	if (m.widgetType === 'displaySearchResultsWidget') {
		var widgetOptions = m.widgetOptions;
		var containerClass = widgetOptions.containerClass;
		var config = m.config;

		var options = {};

		if (widgetOptions) {
			for (var key in widgetOptions) {
				var value = widgetOptions[key];
				options[key] = value;
			}
		}

		options.containerClass = containerClass;

		if (config && config.directory) {
			options.dispatchService = config.directory.dispatchService;
			options.attachmentService = config.directory.attachmentService;
			options.documentSource = config.documentSource;
			options.requestService = config.directory.requestService;
			options.designDoc = config.siteDesign;
		}

		new DisplaySearchResultsWidget(options);
	}
}

//	++++++++++++++++++++++++++++++++++++++++++++++
//	This is the a custom function that can be installed and give opportunity
//	for an atlas to configure certain components before modules are displayed
	window.nunaliit_custom.configuration = function(config, callback) {

		config.directory.showService.options.preprocessDocument = function(doc) {

			return doc;
		};

		// Custom service
		if (config.directory.customService) {
			var customService = config.directory.customService;

			// Default table of content
			customService.setOption('defaultNavigationIdentifier','navigation.atlascine');

			// Default module
			customService.setOption('defaultModuleIdentifier','module.home');

			customService.setOption('moduleDisplayIntroFunction', function(opts_) {
				var opts = $n2.extend({
					elem: null
					,config: null
					,moduleDisplay: null
				},opts_);
				var $elem = opts.elem;
				var moduleDisplay = opts.moduleDisplay;
				var moduleId = moduleDisplay.getCurrentModuleId();
				if (moduleId === 'module.about' ||
						moduleId === 'module.tutorial' ||
						moduleId === 'module.home') {
						moduleDisplay.module.displayIntro({
							elem: $elem
							,showService: config.directory.showService
							,dispatchService: config.directory.dispatchService
							,onLoaded: function() {
							moduleDisplay._sendDispatchMessage({type:'loadedModuleContent'});
						}
					});
				} else {
					return;
				}
			});
		}

		// Dispatch service
		if (config.directory.dispatchService) {
			var dispatchService = config.directory.dispatchService;

			// Handler called when atlas starts
			dispatchService.register(DH,'start',function(m) {});

			// Handler called when the module content is loaded
			dispatchService.register(DH,'loadedModuleContent',function(m) {});

			dispatchService.register(DH,'modelCreate',handleModelEvents);

			dispatchService.register(DH,'utilityCreate',handleUtilityCreate);

			dispatchService.register(DH,'displayIsTypeAvailable',handleDisplayAvailable);
			dispatchService.register(DH,'displayRender',handleDisplayRender);

			dispatchService.register(DH,'widgetIsTypeAvailable', HandleWidgetAvailableRequests);
			dispatchService.register(DH,'widgetDisplay', HandleWidgetDisplayRequests);
		}

		callback();
	};

	$n2.scripts.loadCustomScripts([
		'js/redirector.js'
	]);

})(jQuery,nunaliit2);
