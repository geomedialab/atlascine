(function ($, $n2) {
    "use strict";

    var CineMapFilter = $n2.Class('CineMapFilter', $n2.modelFilter.SelectableDocumentFilter, {

        currentChoices: null,

        currentCallback: null,

        initialize: function (opts_) {
            var opts = $n2.extend({
                modelId: null
                , sourceModelId: null
                , dispatchService: null
            }, opts_);

            var _this = this;

            $n2.modelFilter.SelectableDocumentFilter.prototype.initialize.call(this, opts);

            this.currentChoices = [];
            this.currentCallback = null;

            if (this.dispatchService) {
                var f = function (m, addr, dispatcher) {
                    _this._handleLayerFilterEvents(m, addr, dispatcher);
                };
            }
        },

        _handleLayerFilterEvents: function (m, addr, dispatcher) { },

        _computeAvailableChoicesFromDocs: function (docs, callbackFn) {
            const availableChoices = [];
            docs.forEach(function (doc) {
                if (doc && doc.atlascine_cinemap) {
                    let label = doc.atlascine_cinemap.title;
                    if (!label) {
                        label = doc._id;
                    }
                    availableChoices.push({
                        id: doc._id,
                        label: doc.atlascine_cinemap.title || doc._id,
                        published: doc.atlascine_cinemap.published
                    });
                }
            });

            availableChoices.sort(function (a, b) {
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

        _isDocVisible: function (doc, selectedChoiceIdMap) {
            if (selectedChoiceIdMap[doc._id]) {
                if (doc && doc.atlascine_cinemap) {
                    return true;
                }
            }
            return false;
        }
    });

    Object.assign($n2.atlascine, {
        CineMapFilter: CineMapFilter,
    });

})(jQuery, nunaliit2);
