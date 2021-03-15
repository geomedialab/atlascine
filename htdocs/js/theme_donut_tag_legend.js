(function ($, $n2) {
    "use strict";

    var _loc = function (str, args) { return $n2.loc(str, 'nunaliit2-couch', args); };

    var DH = 'Theme Donut Tag Group Legend Filter';

    var ALL_CHOICES = '__ALL_CHOICES__';

    var ThemeDonutGroupTagLegendWidget = $n2.Class('ThemeDonutGroupTagLegendWidget', {

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

            if (this.dispatchService) {
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

            this._availableChoicesUpdated();

            $n2.log(this._classname, this);
        },

        _getElem: function () {
            return $('#' + this.elemId);
        },

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

        _availableChoicesUpdated: function () {
            var color;
            var $elem = this._getElem();
            $elem.empty();

            var $outer = $('<div>')
                .addClass('n2widgetLegend_outer')
                .appendTo($elem);

            var allChoicesLabel = _loc('All');
            if (this.allChoicesLabel) {
                allChoicesLabel = _loc(this.allChoicesLabel);
            }

            this._addLegendOption($outer, ALL_CHOICES, allChoicesLabel, color);

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
            this.allSelected = false;
            this._selectionChanged();
        },

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

        _selectionChanged: function (choiceId) {
            if (ALL_CHOICES === choiceId) {
                if (this.allSelected) {
                    this.dispatchService.send(DH, {
                        type: this.selectedChoicesSetEventName
                        , value: []
                    });
                } else {
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

        _handle: function (m) {
            var _this = this;

            if (this.availableChoicesChangeEventName === m.type) {
                if (m.value) {
                    this.availableChoices = m.value;
                    this._availableChoicesUpdated();
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

    var ThemeDonutFilterByGroupTag = $n2.Class('ThemeDonutFilterByGroupTag', $n2.modelFilter.SelectableDocumentFilter, {

        dispatchService: null,

        initialize: function (opts_) {
            var opts = $n2.extend({
                modelId: null
                , sourceModelId: null
                , dispatchService: null
            }, opts_);

            this.disabled = opts.dispatchService;

            $n2.modelFilter.SelectableDocumentFilter.prototype.initialize.call(this, opts);

            $n2.log('ThemeDonutFilterByGroupTag', this);
        },

        _computeAvailableChoicesFromDocs: function (docs, callbackFn) {
            var uniqueGroupTags;
            var tags = {};
            var availableChoices = [];

            docs.forEach(function (doc) {
                if (doc && doc._ldata) {
                    if (doc._storyTitle) {
                        for (var i = 0; i < doc._ldata.timeLinkTags.groupTags.length; i += 1) {
                            var tag = doc._ldata.timeLinkTags.groupTags[i].toLowerCase().trim();
                            if (Object.hasOwnProperty.call(tags, tag)) { } else {
                                tags[doc._storyTitle] = doc._color;
                            }
                        }
                    }
                }
            });

            uniqueGroupTags = Object.keys(tags);
            uniqueGroupTags.forEach(function (tag) {
                availableChoices.push({
                    id: tag,
                    label: tag,
                    color: tags[tag]
                });
            });

            this.currentCallback = callbackFn;
            callbackFn(availableChoices);

            return null;
        },

        _isDocVisible: function (doc, selectedChoiceIdMap, allSelected) {
            if (doc && doc._ldata) {
                if (allSelected) {
                    return true;
                } else if (doc._storyTitle && doc._storyTitle in selectedChoiceIdMap) {
                    return true;
                }
                return false;
            }
            return true;
        }
    });

    Object.assign($n2.atlascine, {
        ThemeDonutGroupTagLegendWidget: ThemeDonutGroupTagLegendWidget,
        ThemeDonutFilterByGroupTag: ThemeDonutFilterByGroupTag
    });

})(jQuery, nunaliit2);
