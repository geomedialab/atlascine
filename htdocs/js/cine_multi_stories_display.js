(function ($, $n2) {
    "use strict";

    var DH = 'atlascine';

    var _loc = function (str, args) { return $n2.loc(str, 'cineAtlas', args); };

    var CineMultiStoriesDisplay = $n2.Class('CineMultiStoriesDisplay', {

        dispatchService: null,

        showService: null,

        displayElemId: null,

        /**
         * Name of the element holding the displayed elements
         */
        displayPanelName: null,

        initialize: function (opts_) {
            var _this = this;

            var opts = $n2.extend({
                dispatchService: undefined
                , showService: undefined
                , displayPanelName: undefined
            }, opts_);

            this.dispatchService = opts.dispatchService;
            this.showService = opts.showService;
            this.displayPanelName = opts.displayPanelName;

            var dispatcher = this.dispatchService;
            if (dispatcher) {
                var f = function (msg, addr, d) {
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
                .attr('id', this.displayElemId)
                .addClass('cineDisplay_root')
                .appendTo($('body'));
            var dialogOptions = {
                autoOpen: false
                , title: _loc('Search Results')
                , modal: false
                , close: function (event, ui) {
                    $(this).empty();
                    _this.dispatchService.send(DH, {
                        type: 'searchDeactivated'
                    });
                }
            };

            $dialog.dialog(dialogOptions);

            $n2.log('CineMultiStoriesDisplay', this);
        },

        _handleDispatch: function (m, addr, d) {
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

        _getDisplayDiv: function () {
            var divId = this.displayElemId;
            return $('#' + divId);
        },

        _displayDocuments: function (docIds) {
            var $elem = this._getDisplayDiv();

            $elem.empty();

            for (var docId of docIds) {
                var $contentDiv = $('<div>')
                    .addClass('n2s_handleHover')
                    .attr('n2-docId', docId)
                    .appendTo($elem);
                this.showService.printDocument($contentDiv, docId);
            }

            $elem.dialog("open");
        },

        /*
         * Accepts search results and display them
         */
        _displaySearchResults: function (results) {
            var _this = this;

            var $elem = this._getDisplayDiv();

            $elem.empty();

            var ids = [];
            if (results && results.sorted && results.sorted.length) {
                for (var i = 0, e = results.sorted.length; i < e; ++i) {
                    ids.push(results.sorted[i].id);
                }
            }

            if (ids.length < 1) {
                $elem.text(_loc('Empty search results'));

            } else {
                for (var docId of ids) {
                    var $contentDiv = $('<div>')
                        .addClass('n2s_handleHover')
                        .attr('n2-docId', docId)
                        .appendTo($elem)
                        .click(function () {
                            var $contentElem = $(this);
                            var docId = $contentElem.attr('n2-docId');
                            if (docId) {
                                _this.dispatchService.send(DH, {
                                    type: 'userSelect'
                                    , docId: docId
                                });
                            }
                        });
                    this.showService.printBriefDescription($contentDiv, docId);
                }
            }

            var isOpen = $elem.dialog("isOpen");
            if (!isOpen) {
                $elem.dialog("open");
            }
        }
    });

    Object.assign($n2.atlascine, {
        CineMultiStoriesDisplay: CineMultiStoriesDisplay,
    });

})(jQuery, nunaliit2);
