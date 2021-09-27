/** 
 * Name: donut-tag-legend.js
 * -----------------------------------------------------------------------------
 * Description: A custom widget to filter donuts by tag groups. The widget
 * connects to a selection filter which creates a collection of available
 * choices based on donut documents stored in the model. This widget provides a
 * UI for users to filter donuts from the map based on those available choices.
 * 
 * This widget's design is inspired by both the
 * MultiFilterSelectionDropDownWidget and the LegendWidget which exist in
 * Nunaliit.
 * -----------------------------------------------------------------------------
 */

; (function ($, $n2) {
    "use strict";

    // Localization
    var _loc = function (str, args) { return $n2.loc(str, 'nunaliit2-couch', args); };

    // Define Dispatcher Handle
    var DH = 'Donut Tag Group Legend Filter';

    var ALL_CHOICES = '__ALL_CHOICES__';

    var DonutGroupTagLegendWidget = $n2.Class('DonutGroupTagLegendWidget', {

        dispatchService: null,

        showService: null,

        sourceModelId: null,

        elemId: null,

        selectedChoicesChangeEventName: null,

        selectedChoicesSetEventName: null,

        allSelectedChangeEventName: null,

        allSelectedSetEventName: null,

        availableChoicesChangeEventName: null,

        availableChoices: null,

        selectedChoices: null,

        selectedChoiceIdMap: null,

        allSelected: null,

        allChoicesLabel: null,

        /**
         * These are versions of functions that are throttled. These
         * functions touch the DOM structure and should not be called too
         * often as they affect performance.
         */
        _throttledAvailableChoicesUpdated: null,

        initialize: function (opts_) {
            var opts = $n2.extend({
                containerId: null
                , dispatchService: null
                , showService: null
                , sourceModelId: null
                , allChoicesLabel: null
            }, opts_);

            var _this = this;
            var paramInfo;

            this.dispatchService = opts.dispatchService;
            this.showService = opts.showService;
            this.sourceModelId = opts.sourceModelId;
            this.allChoicesLabel = opts.allChoicesLabel;

            this.availableChoices = [];
            this.selectedChoices = [];
            this.selectedChoiceIdMap = {};
            this._throttledAvailableChoicesUpdated = $n2.utils.throttle(this._availableChoicesUpdated, 1500);

            // Set up model listener
            if (this.dispatchService) {
                // Get model info
                var modelInfoRequest = {
                    type: 'modelGetInfo'
                    , modelId: this.sourceModelId
                    , modelInfo: null
                };
                this.dispatchService.synchronousCall(DH, modelInfoRequest);
                var sourceModelInfo = modelInfoRequest.modelInfo;

                if (sourceModelInfo
                    && sourceModelInfo.parameters
                    && sourceModelInfo.parameters.availableChoices) {
                    paramInfo = sourceModelInfo.parameters.availableChoices;
                    this.availableChoicesChangeEventName = paramInfo.changeEvent;

                    if (paramInfo.value) {
                        this.availableChoices = paramInfo.value;
                    }
                }

                if (sourceModelInfo
                    && sourceModelInfo.parameters
                    && sourceModelInfo.parameters.selectedChoices) {
                    paramInfo = sourceModelInfo.parameters.selectedChoices;
                    this.selectedChoicesChangeEventName = paramInfo.changeEvent;
                    this.selectedChoicesSetEventName = paramInfo.setEvent;

                    if (paramInfo.value) {
                        this.selectedChoices = paramInfo.value;
                        this.selectedChoiceIdMap = {};
                        this.selectedChoices.forEach(function (choiceId) {
                            _this.selectedChoiceIdMap[choiceId] = true;
                        });
                    }
                }

                if (sourceModelInfo
                    && sourceModelInfo.parameters
                    && sourceModelInfo.parameters.allSelected) {
                    paramInfo = sourceModelInfo.parameters.allSelected;
                    this.allSelectedChangeEventName = paramInfo.changeEvent;
                    this.allSelectedSetEventName = paramInfo.setEvent;

                    if (typeof paramInfo.value === 'boolean') {
                        this.allSelected = paramInfo.value;
                    }
                }

                var fn = function (m, addr, dispatcher) {
                    _this._handle(m, addr, dispatcher);
                };

                if (this.availableChoicesChangeEventName) {
                    this.dispatchService.register(DH, this.availableChoicesChangeEventName, fn);
                }

                if (this.selectedChoicesChangeEventName) {
                    this.dispatchService.register(DH, this.selectedChoicesChangeEventName, fn);
                }

                if (this.allSelectedChangeEventName) {
                    this.dispatchService.register(DH, this.allSelectedChangeEventName, fn);
                }
            }

            // Get container
            var containerId = opts.containerId;
            if (!containerId) {
                throw new Error('containerId must be specified');
            }
            var $container = $('#' + containerId);

            this.elemId = $n2.getUniqueId();

            $('<div>')
                .attr('id', this.elemId)
                .addClass('n2widgetLegend')
                .appendTo($container);

            this._throttledAvailableChoicesUpdated();

            $n2.log(this._classname, this);
        },

        // Get the element id for widget legend container.
        _getElem: function () {
            return $('#' + this.elemId);
        },

        /**
         * This function adds a new legend option, based on provided arguments.
         * @param {object} container - jQuery element reference to the
         * container for the legend entry items.
         * @param {string} choiceId - legend entry choiceId.
         * @param {string} label - legend entry label.
         * @param {string} color - donut icon hash color code.
         */
        _addLegendOption: function (container, choiceId, label, color) {
            var _this = this;
            var entryId = $n2.getUniqueId();
            var $div = $('<div>')
                .addClass('n2widgetLegend_legendEntry')
                .addClass('n2widgetLegend_optionSelected')
                .attr('data-n2-choiceId', choiceId)
                .css('cursor', 'pointer')
                .appendTo(container);

            $('<input>')
                .attr('type', 'checkbox')
                .attr('checked', 'checked')
                .attr('id', entryId)
                .click(function () {
                    _this._selectionChanged(choiceId);
                })
                .appendTo($div);

            var $chkboxLabel = $('<label>')
                .attr('for', entryId)
                .css('padding-left', '5px')
                .appendTo($div);

            var $symbolColumn = $('<div>')
                .addClass('n2widgetLegend_symbolColumn')
                .css('width', '25px')
                .appendTo($chkboxLabel);

            // Add SVG donut icon and update donut color.
            if (color) {
                var $donut = $('<svg version="1.1" viewBox="-7 -7 14 14" class="n2widgetLegend_svg"><circle r="5" stroke="#ff0000" stroke-width="2" fill-opacity="1" stroke-opacity="0.7" stroke-linecap="round" stroke-dasharray="solid" pointerEvents="visiblePainted" pointer-events="visiblePainted"></circle></svg>')
                    .appendTo($symbolColumn);

                $donut.find('circle')
                    .attr('stroke', color)
            }

            var $labelColumn = $('<div>')
                .addClass('n2widgetLegend_labelColumn')
                .appendTo($chkboxLabel);

            $('<div>')
                .addClass('n2widgetLegend_label')
                .text(label)
                .appendTo($labelColumn);
        },

        // Add legend entry options based on available choices provided by the
        // DonutFilterByGroupTag selectable document filter.
        _availableChoicesUpdated: function () {
            var color;
            var $elem = this._getElem();
            $elem.empty();

            var $outer = $('<div>')
                .addClass('n2widgetLegend_outer')
                .appendTo($elem);

            // Add All Choices Option
            var allChoicesLabel = _loc('All');
            if (this.allChoicesLabel) {
                allChoicesLabel = _loc(this.allChoicesLabel);
            }

            this._addLegendOption($outer, ALL_CHOICES, allChoicesLabel, color);

            // Loop through all available choices and add each as a legend item
            for (var i = 0, e = this.availableChoices.length; i < e; i += 1) {
                var label;
                var choice = this.availableChoices[i];

                if (!choice.label) {
                    label = choice.id;
                } else {
                    label = choice.label;
                }

                if (choice.color) {
                    color = choice.color;
                }

                this._addLegendOption($outer, choice.id, label, color);
            }

            this._adjustSelectedItem();
        },

        // Adjust appearance of selected legend items.
        _adjustSelectedItem: function () {
            var allSelected = this.allSelected;

            var selectedChoiceIdMap = {};
            this.selectedChoices.forEach(function (selectedChoice) {
                selectedChoiceIdMap[selectedChoice] = true;
            });

            var $elem = this._getElem();
            $elem.find('.n2widgetLegend_legendEntry').each(function () {
                var $legendEntry = $(this);
                var value = $legendEntry.attr('data-n2-choiceId');
                if (allSelected || selectedChoiceIdMap[value]) {
                    if ($legendEntry.find('input').prop('checked') !== true) {
                        $legendEntry.find('input').prop('checked', 'checked');
                    }

                    $legendEntry.find('label').css('color', '#ffffff');

                } else {
                    if ($legendEntry.find('input').prop('checked') === true) {
                        $legendEntry.find('input').prop('checked', false);
                    }

                    $legendEntry.find('label').css('color', '#aaaaaa');
                }
            });
        },

        // This is called when the selected option within the legend is changed
        _selectionChanged: function (choiceId) {
            if (ALL_CHOICES === choiceId) {
                if (this.allSelected) {
                    // Toggle off all selected if already selected
                    this.dispatchService.send(DH, {
                        type: this.selectedChoicesSetEventName
                        , value: []
                    });
                } else {
                    // Select all
                    this.dispatchService.send(DH, {
                        type: this.allSelectedSetEventName
                        , value: true
                    });
                }
            } else {
                var selectedChoiceIds = [];
                var removed = false;

                this.selectedChoices.forEach(function (selectedChoiceId) {
                    if (selectedChoiceId === choiceId) {
                        removed = true;
                    } else {
                        selectedChoiceIds.push(selectedChoiceId);
                    }
                });

                if (!removed) {
                    selectedChoiceIds.push(choiceId);
                }

                this.dispatchService.send(DH, {
                    type: this.selectedChoicesSetEventName
                    , value: selectedChoiceIds
                });
            }
        },

        _handle: function (m, addr, dispatcher) {
            var _this = this;

            if (this.availableChoicesChangeEventName === m.type) {
                if (m.value) {
                    this.availableChoices = m.value;
                    this._throttledAvailableChoicesUpdated();
                }

            } else if (this.selectedChoicesChangeEventName === m.type) {
                if (m.value) {
                    this.selectedChoices = m.value;
                    this.selectedChoiceIdMap = {};
                    this.selectedChoices.forEach(function (choiceId) {
                        _this.selectedChoiceIdMap[choiceId] = true;
                    });

                    this._adjustSelectedItem();
                }

            } else if (this.allSelectedChangeEventName === m.type) {
                if (typeof m.value === 'boolean') {
                    this.allSelected = m.value;
                    this._adjustSelectedItem();
                }
            }
        }
    });

    // Donut filter by group tag
    var DonutFilterByGroupTag = $n2.Class('DonutFilterByGroupTag', $n2.modelFilter.SelectableDocumentFilter, {

        dispatchService: null,

        initialize: function (opts_) {
            var opts = $n2.extend({
                modelId: null
                , sourceModelId: null
                , dispatchService: null
            }, opts_);

            this.disabled = opts.dispatchService;

            $n2.modelFilter.SelectableDocumentFilter.prototype.initialize.call(this, opts);

            $n2.log('DonutFilterByGroupTag', this);
        },

        /**
         * Computes the available choices used by filter.
         * @param {array} docs - An array of nunaliit documents
         * @param callbackFn - Callback function
         */
        _computeAvailableChoicesFromDocs: function (docs, callbackFn) {
            const tags = {};
            const availableChoices = [];

            // Get determine what tag group (tag,color) values are available to display in the legend
            docs.forEach(function (doc) {
                let tagGroupColors = {};

                if (doc && doc._ldata) {
                    if (doc._ldata.tagGroupColors) {
                        tagGroupColors = doc._ldata.tagGroupColors;
                    }

                    if (doc._ldata.timeLinkTags
                        && doc._ldata.timeLinkTags.groupTags
                        && $n2.isArray(doc._ldata.timeLinkTags.groupTags)
                        && doc._ldata.timeLinkTags.groupTags.length) {

                        doc._ldata.timeLinkTags.groupTags.forEach(tag => {
                            // Each tag is stored in lower case and trimed of white space 
                            // to reduce the number of tag duplicates
                            const reducedTag = tag.toLowerCase().trim();
                            if (!tags.hasOwnProperty(reducedTag) && tagGroupColors.hasOwnProperty(reducedTag)) {
                                tags[reducedTag] = tagGroupColors[reducedTag];
                            }
                        });
                    }
                }
            });

            // Generate availableChoices array based on the collection of years
            const uniqueGroupTags = Object.keys(tags);
            uniqueGroupTags.forEach(tag => {
                const label = tag[0].toUpperCase() + tag.substring(1);
                const color = tags[tag];
                availableChoices.push({
                    id: tag,
                    label: label,
                    color: color
                });
            });

            // Sort the availableChoices array
            availableChoices.sort(function (a, b) {
                if (a.label < b.label) {
                    return -1;
                }
                if (a.label > b.label) {
                    return 1;
                }
                return 0;
            });

            this.currentCallback = callbackFn;
            callbackFn(availableChoices);

            return null;
        },

        // Filter documents in source model based on the selected choice.
        _isDocVisible: function (doc, selectedChoiceIdMap, allSelected) {
            if (doc && doc._ldata) {
                // If the filter option allSelected is select in the widget
                // then all documents in the source model pass through the
                // filter. Otherwise each document needs to be checked to see
                // if its filters based on its contents.
                if (allSelected) {
                    return true;

                } else if (doc._ldata.timeLinkTags
                    && doc._ldata.timeLinkTags.groupTags
                    && $n2.isArray(doc._ldata.timeLinkTags.groupTags)
                    && doc._ldata.timeLinkTags.groupTags.length) {
                    for (var i = 0; i < doc._ldata.timeLinkTags.groupTags.length; i += 1) {
                        var tag = doc._ldata.timeLinkTags.groupTags[i].toLowerCase().trim();
                        if (selectedChoiceIdMap[tag]) {
                            return true;
                        }
                    }
                }

                return false;
            }

            // All other docs in the source model, let them through the filter
            return true;
        }
    });

    Object.assign($n2.atlascine, {
        DonutGroupTagLegendWidget: DonutGroupTagLegendWidget,
        DonutFilterByGroupTag: DonutFilterByGroupTag
    });

})(jQuery, nunaliit2);
