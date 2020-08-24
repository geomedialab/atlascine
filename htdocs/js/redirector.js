

;(function($,$n2) {

	"use strict";

	// Localization
	var _loc = function(str,args) {
		return $n2.loc(str,'nunaliit2-couch',args);
	};

	// Define Dispatcher Handle
	var DH = 'MultiStoriesSelectionRedirector';


	var MultiStoriesSelectionRedirector = $n2.Class( 'MultiStoriesSelectionRedirector', {

	});
//	++++++++++++++++++++++++++++++++++++++++++++++
	DH = 'CinemaSelectionRedirector';
	var CinemaSelectionRedirector = $n2.Class('CinemaSelectionRedirector',{

		/**
		 * Name used to synchronize time events
		 */
		name: null,

		dispatchService: null,

		eventService: null,

		atlasDb: null,

		customService: null,

		showService: null,

		originalEventHandler: null,

		currentSelectionNumber: null,

		currentFocusNumber: null,

		popupMaxLines: null,

		/**
		 * If set, when a selection translation returns empty,
		 * then do not send an empty selection. Simply ignore.
		 */
		suppressEmptySelection: null,

		/**
		 * By default, if a selection translation returns empty, then
		 * focus event is not sent. If this is set, force the focus event.
		 */
		forceEmptyFocus: null,

		initialize: function(opts_){
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
			},opts_);

			var _this = this;

			this.name = opts.name;
			this.dispatchService = opts.dispatchService;
			this.eventService = opts.eventService;
			this.atlasDb = opts.atlasDb;
			this.customService = opts.customService;
			this.showService = opts.showService;
			this.popupMaxLines = opts.popupMaxLines;

			this.suppressEmptySelection = false;
			if( opts.suppressEmptySelection ){
				this.suppressEmptySelection = true;
			};

			this.forceEmptyFocus = false;
			if( opts.forceEmptyFocus ){
				this.forceEmptyFocus = true;
			};

			if( !this.dispatchService ){
				throw new Error('CinemaSelectionRedirector requires dispatchService');
			};
			if( !this.eventService ){
				throw new Error('CinemaSelectionRedirector requires eventService');
			};
			if( !this.atlasDb ){
				throw new Error('CinemaSelectionRedirector requires atlasDb');
			};

			// Keep track of current selection
			this.currentSelectionNumber = 0;
			this.currentFocusNumber = 0;

			// Install on event service
			this.originalEventHandler = this.eventService.getHandler();
			this.eventService.register('userSelect');
			this.eventService.register('userFocusOn');
			this.eventService.setHandler(function(m, addr, dispatcher){
				_this._handleEvent(m, addr, dispatcher);
			});

			// Install map pop-up replacement
			if( this.customService && this.showService ){
				this.customService.setOption('mapFeaturePopupCallback', function(opts_){
					var opts = $n2.extend({
						feature: null
						,onSuccess: function(text){}
						, onError: function(err){}
					}, opts_);
					var feature = opts.feature;
					if (feature &&
						feature.data._ldata &&
						feature.data._ldata.timeLinkTags &&
						feature.data._ldata.timeLinkTags.themeTags) {
						var contentArr = feature.data._ldata.timeLinkTags.themeTags;
						if (feature.data._ldata.timeLinkTags.placeTag) {
							contentArr.push(feature.data._ldata.timeLinkTags.placeTag);
						}
						contentArr = contentArr.filter((a, b) => contentArr.indexOf(a) === b);
						var content = contentArr.join(', ');
						if (content && '' !== content ) {
							opts.onSuccess(content);
						}
						return;
					}
				});
			}
		},

		_retrieveDocuments: function(opts_){
			var opts = $n2.extend({
				docId: null
				,docIds: null
				,doc: null
				,docs: null
				,onSuccess: function(docs){}
				,onError: function(err){}
			}, opts_);

			var _this = this;

			if( opts.doc ){
				opts.onSuccess([opts.doc]);

			} else if( opts.docs ){
				opts.onSuccess( opts.docs );

			} else if( opts.docId ){
				retrieveDocumentFromIds([opts.docId]);

			} else if( opts.docIds ){
				retrieveDocumentFromIds(opts.docIds);
			};

			function retrieveDocumentFromIds(docIds){
				// Look up cache
				var docs = [];
				var missingDocIds = [];
				docIds.forEach(function(docId){
					var doc = undefined;

					if( _this.dispatchService ){
						var m = {
							type: 'cacheRetrieveDocument'
							,docId: docId
						};
						_this.dispatchService.synchronousCall(DH,m);
						doc = m.doc;
					};

					if( doc ){
						docs.push(doc);
					} else {
						missingDocIds.push(docId);
					};
				});

				if( missingDocIds.length < 1 ){
					// Got everything from cache
					opts.onSuccess(docs);
				} else {
					// Need to get documents from database
					_this.atlasDb.getDocuments({
						docIds: missingDocIds
						,onSuccess: function(missingDocs){
							missingDocs.forEach(function(doc){
								docs.push(doc);
							});
							opts.onSuccess(docs);
						}
						,onError: function(errorMsg){
							opts.onError(errorMsg);
						}
					});
				};
			};
		},

		_handleUserSelect: function(m, addr, dispatcher, selectionNumber){
//			this.dispatchService.send(DH, {
//				type:'userSelectCancelled'
//			});

			// Detect if this document has a start time associated with it
			var startTime = undefined;
			if( m && m.docId ) {
				// Must look up document with ldata information from docId
				var docId = m.docId;
				var syncRequest = {
					type: 'cineStartTimeFromDocId'
					,docId: docId
					,startTime: undefined
				};
				this.dispatchService.synchronousCall(DH,syncRequest);
				if( undefined !== syncRequest.startTime ){
					startTime = syncRequest.startTime;
				};
			};
			if( undefined !== startTime ){
				this.dispatchService.send(DH,{
					type: 'mediaTimeChanged'
					,name: this.name
					,currentTime: startTime
					,origin: 'model'
				});
				this.dispatchService.send(DH,{
					type: 'unselected'
				});

			} else {
				this._performOriginalHandler(m, addr, dispatcher);
			};
		},

		_handleUserFocus: function(m, addr, dispatcher, focusNumber){
			var _this = this;

			this._getDocumentsFromSelectedDocument({
				docId: m.docId
				,docIds: m.docIds
				,doc: m.doc
				,docs: m.docs
				,isFocus: true
				,onSuccess: function(selectedDocs, supplementDocIds){
					if( focusNumber === _this.currentFocusNumber ){
						var msg = {};

						// Copy attributes from original message
						for(var name in m){
							var value = m[name];
							msg[name] = value;
						};

						if( selectedDocs.length > 1 ){
							delete msg.docId;
							delete msg.docIds;
							delete msg.doc;
							delete msg.docs;

							msg.type = 'focusOn';
							msg.docIds = [];
							msg.docs = [];
							for(var i=0,e=selectedDocs.length; i<e; ++i){
								var doc = selectedDocs[i];
								msg.docs.push(doc);
								msg.docIds.push(doc._id);
							};
							_this.dispatchService.send(DH,msg);

						} else if ( selectedDocs.length > 0 ){
							delete msg.docId;
							delete msg.docIds;
							delete msg.doc;
							delete msg.docs;

							msg.type = 'focusOn';
							msg.doc = selectedDocs[0];
							msg.docId = selectedDocs[0]._id;
							_this.dispatchService.send(DH,msg);

						} else {
							// At this point, no document was found associated
							// with the focus. By default, ignore.
							if( _this.forceEmptyFocus ){
								msg.type = 'focusOn';
								_this.dispatchService.send(DH,msg);
							};
						};

						if( supplementDocIds && selectedDocs.length > 0 ){
							supplementDocIds.forEach(function(supplementDocId){
								_this.dispatchService.send(DH,{
									type: 'focusOnSupplement'
									,docId: supplementDocId
									,origin: selectedDocs[0]._id
								});
							});
						};
					};
				}
				,onError: function(err){
					// On error, perform default behaviour
					if( focusNumber === _this.currentFocusNumber ){
						this._performOriginalHandler(m, addr, dispatcher);
					};
				}
			});
		},

		_getDocumentsFromSelectedDocument: function(opts_){
			var opts = $n2.extend({
				docId: null
				,docIds: null
				,doc: null
				,docs: null
				,isSelect: false
				,isFocus: false
				,onSuccess: function(selectedDocs, supplementDocids){}
				,onError: function(err){}
			},opts_);

			var _this = this;

			this._retrieveDocuments({
				docId: opts.docId
				,docIds: opts.docIds
				,doc: opts.doc
				,docs: opts.docs
				,onSuccess: function(docs){

					_this.translateUserSelection({
						docs: docs
						,isSelect: opts.isSelect
						,isFocus: opts.isFocus
						,onSuccess: opts.onSuccess
						,onError: opts.onError
					});
				}
				,onError: function(err){
					// On error, continue with original selection
					$n2.log('Error while retrieving selected documents',err);
					opts.onError(err);
				}
			});
		},

		/*
		 * This is the work horse of the class. It defines the translation of selecting
		 * a document into another one.
		 *
		 * Basically, this methods accepts a number of documents (full document contents)
		 * and must return a number of documents that should be selected instead of the
		 * ones given in argument. Optionally, a number of supplemental document identifiers
		 * can be provided in the results.
		 *
		 * Supplemental selection/focus are useful to colour elements in a canvas to draw attention
		 * to it given a selection.
		 *
		 * For example, if an atlas is built in such a way that a geometry is drawn on a map
		 * representing a place, but a number of names are associated with that geometry. In that
		 * atlas, when the geometry is clicked, the atlas designer wants the associated name
		 * documents to be selected. Also, when a name document is selected, the associated map
		 * geometry is highlighted. In this example, this method should:
		 * 1. when presented with a geometry document, return a list of name documents
		 * 2. when presented with a name document, return the name document and a list of
		 *    supplemental document identifiers that represent the geometries
		 */
		translateUserSelection: function(opts_){
			var opts = $n2.extend({
				docs: null
				,isSelect: false
				,isFocus: false
				,onSuccess: function(selectedDocs, supplementDocids){}
				,onError: function(err){}
			},opts_);

			// Default behaviour is to perform no translation
			opts.onSuccess(opts.docs,[]);
		},

		_handleEvent: function(m, addr, dispatcher){
			var eventHandled = false;

			if( 'userSelect' === m.type ){
				this.currentSelectionNumber = this.currentSelectionNumber + 1;
				this._handleUserSelect(m, addr, dispatcher, this.currentSelectionNumber);
				eventHandled = true;

			} else if( 'userFocusOn' === m.type ){
				this.currentFocusNumber = this.currentFocusNumber + 1;
				this._handleUserFocus(m, addr, dispatcher, this.currentFocusNumber);
				eventHandled = true;
			};

			if( !eventHandled ){
				this._performOriginalHandler(m, addr, dispatcher);
			};
		},

		_performOriginalHandler: function(m, addr, dispatcher){
			this.originalEventHandler(m, addr, dispatcher);
		},

		_handleMapFeaturePopup: function(opts_){
			var opts = $n2.extend({
				feature: null
				,layerInfo: null
				,onSuccess: function(html){}
				,onError: function(err){}
			},opts_);

			var _this = this;
			var feature = opts.feature;

			var selectedDocs = [];

			if( feature.cluster ){
				feature.cluster.forEach(function(cf){
					var doc = cf.data;
					if( doc ){
						selectedDocs.push(doc);
					};
				});
			} else {
				var doc = feature.data;
				if( doc ){
					selectedDocs.push(doc);
				};
			};

			this._getDocumentsFromSelectedDocument({
				docs: selectedDocs
				,onSuccess: function(selectedDocs, supplementDocids){
					if( selectedDocs.length > 0 ) {
						showDocs(selectedDocs);
					} else {
						// display the geometry
						showDefault();
					};
				}
				,onError: showDefault // ignore errors
			});

			function showDefault(){
				var $div = $('<div></div>');
				var doc = feature.data;
				_this.showService.displayBriefDescription($div,{},doc);
				var html = $div.html();
				opts.onSuccess(html);
			};

			function showDocs(docs){
				var html = _this.generatePopupHtmlFromDocuments(docs);
				opts.onSuccess(html);
			};
		},

		generatePopupHtmlFromDocuments: function(docs){
			var _this = this;

			// Now that everything is categorized, print popup
			var maxLines = this.popupMaxLines;
			var $div = $('<div>');

			// Count lines that will be printed
			var numLines = docs.length;
			var numLinesNotPrinted = 0;
			if( numLines > maxLines ){
				--maxLines;
				numLinesNotPrinted = numLines - maxLines;
			};

			// Print briefs
			docs.forEach(function(doc){
				if( maxLines > 0 ){
					--maxLines;

					var $line = $('<div>')
						.addClass('n2redirect_popup_line n2redirect_popup_doc')
						.appendTo($div);
					_this.showService.displayBriefDescription($line,{},doc);
				};
			});

			// Print number of lines not printed
			if( numLinesNotPrinted > 0 ){
				var $line = $('<div>')
					.addClass('n2redirect_popup_line n2redirect_popup_overflow')
					.text( _loc('More lines... ({num})',{num:numLinesNotPrinted}) )
					.appendTo($div);
			};

			var html = $div.html();
			return html;
		}
	});
	$n2.atlascineRedirector = {
		CinemaSelectionRedirector: CinemaSelectionRedirector
		,MultiStoriesSelectionRedirector: MultiStoriesSelectionRedirector
	}
})(jQuery, nunaliit2);
