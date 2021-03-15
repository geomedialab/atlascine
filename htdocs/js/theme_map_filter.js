(function ($, $n2) {
    "use strict";

    var DH = 'atlascine';

    var ThemeMapFilter = $n2.Class('ThemeMapFilter', $n2.modelFilter.SelectableDocumentFilter, {
        dispatchService: null,
        selectedThemes: null,

        initialize: function (opts_) {
            var opts = $n2.extend({
                modelId: null,
                sourceModelId: null,
                dispatchService: null
            }, opts_);

            $n2.modelFilter.SelectableDocumentFilter.prototype.initialize.call(this, opts);

            this.dispatchService = opts.dispatchService;

            var localStorage = $n2.storage.getLocalStorage();
            var jsonSelection = localStorage.getItem(this.saveSelectionName);
            this.selectedThemes = JSON.parse(jsonSelection);
        },

        _computeAvailableChoicesFromDocs: function (docs) {
            var choiceLabelsById = {};
            docs.forEach(function (doc) {
                if (doc && doc.atlascine_cinemap) {
                    var tagGroups = doc.atlascine_cinemap.tagGroups;
                    if (typeof tagGroups === 'object') {
                        tagGroups = Object.keys(tagGroups);
                        tagGroups.forEach(tag => (choiceLabelsById[tag] = tag));
                    }
                }
            });

            var availableChoices = [];
            for (var id in choiceLabelsById) {
                var label = choiceLabelsById[id];
                availableChoices.push({
                    id: id,
                    label: label
                });
            }

            return availableChoices;
        },

        _selectionChanged: function (selectedChoiceIdMap) {
            this.selectedThemes = Object.keys(selectedChoiceIdMap);
        },

        _isDocVisible: function (doc, selectedChoiceIdMap) {
            if (typeof selectedChoiceIdMap === 'object') {
                var selectedTheme = Object.keys(selectedChoiceIdMap)[0];
                if (doc.atlascine_cinemap && doc.atlascine_cinemap.tagGroups) {
                    var tagGroups = Object.keys(doc.atlascine_cinemap.tagGroups);
                    return !!tagGroups.find(tag => tag === selectedTheme);
                }
            }
            return false;
        },

        _reportStateUpdate: function (added, updated, removed) {
            this.dispatchService.send(DH, {
                type: 'themeChanged',
                data: {
                    themes: this.selectedThemes,
                    state: {
                        added: added,
                        updated: updated,
                        removed: removed,
                        loading: this.modelIsLoading
                    }
                }
            });
            $n2.modelFilter.SelectableDocumentFilter.prototype._reportStateUpdate.call(this, added, updated, removed);
        }
    });

    Object.assign($n2.atlascine, {
        ThemeMapFilter: ThemeMapFilter,
    });

})(jQuery, nunaliit2);
