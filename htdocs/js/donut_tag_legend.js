/** 
 * Name: donut-tag-legend.js
 */

; (function ($, $n2) {
    "use strict";

    // Localization
    const _loc = function (str, args) { return $n2.loc(str, "nunaliit2-couch", args); };
    const ALL_CHOICES = "__ALL_SELECTED__";
    const TIMELINE_TOGGLE_RENDER = "__TOGGLE_TIMELINE_LOGIC__";

    class MapStoryFilterableLegendWidgetWithGraphic extends nunaliit2.filterableLegendWidget.filterableLegendWidgetWithGraphic {
        constructor(options) {
            super(options);
            this.cinemapModelId = options.cinemapModelId;
            this.downstreamModelId = options.downstreamModelId;
            this.DH = "MapStoryFilterableLegendWidgetWithGraphic";
            this.themeToColourMap = null;
            this.themeToWordMap = null;
            this.mediaDuration = 0;
            this.popup = null;
            this.panzoomState = null;
            this.timelineRenderState = true;
            this.preloadCallback = this._preloadOtherWidgetData;
            
            if (!this.cinemapModelId) {
                throw new Error("cinemapModelId must be specified");
            }
            if (!this.downstreamModelId) {
                throw new Error("downstreamModelId must be specified");
            }
            
            this.cinemapSelectionSetEventName = `${this.cinemapModelId}_selectedChoices_set`;
            this.downstreamSetEvent = `${this.downstreamModelId}_selectedChoices_set`;
            this.dispatchService.register(this.DH, this.cinemapSelectionSetEventName, this.dispatchHandler)
            this.dispatchService.register(this.DH, "transcriptVideoDurationChange", this.dispatchHandler);

            window.addEventListener("resize", () => { this._drawGraphic() })
            
            this._preloadOtherWidgetData(this.dispatchService);
        }

        _handle (message, addr, dispatcher) {
            const { type, value, modelId, state } = message;
            if (type === this.eventNames.changeAvailableChoices) {
                if (value) {
                    this.state.availableChoices = value;
                    this._drawLegend();
                    this._adjustSelectedItem();
                    this._drawGraphic();
                }
            } 
            else if (type === this.eventNames.changeSelectedChoices) {
                if (value) {
                    this.state.selectedChoices = value;
                    this.state.selectedChoiceIdMap = {};
                    this.state.selectedChoices.forEach((choiceText) => {
                        this.state.selectedChoiceIdMap[choiceText] = true;
                    });
                    this._adjustSelectedItem();
                    this._drawGraphic();
                }
            } 
            else if (type === this.eventNames.changeAllSelected) {
                if (typeof value === "boolean") {
                    if (value === this.state.allSelected) return;
                    this.state.allSelected = value;
                    this._adjustSelectedItem();
                }
            }
            else if (type === "modelStateUpdated" && this.hasPerformedInitialDraw) {
                if (modelId === this.sourceModelId) {
                    this._sourceModelUpdated(state);
                }
            }
            else if (type === "transcriptVideoDurationChange") {
                if (this.isGraphicNone) return;
                this.mediaDuration = value;

                if (this.graphicContainer === null) return;
                this.graphicContainer.innerHTML = "";
                const graphic = document.createElement("div");
                graphic.setAttribute("class", "n2_FilterableLegendWidgetGraphicArea");
                graphic.setAttribute("id", "filterableLegendWidgetGraphicArea");
                this.graphicContainer.append(graphic);
                this.graphic = graphic;
                this.graphic.classList.add("n2_CustomGraphic");

                if (!this.graphicVisibility) {
                    this.graphic.classList.add("filterableLegendWidgetGraphicAreaHidden");
                }

                this._drawGraphicToggle()
                this._drawCustom();
                this._alignVideoPlayerControls();
            }
            else if (type === this.cinemapSelectionSetEventName) {
                this._preloadOtherWidgetData(this.dispatchService);
            }
        }

        _drawLegend() {
            if (this.legendContainer === null) return;
            this.legendContainer.innerHTML = "";
            const legend = document.createElement("div");
            legend.setAttribute("class", "n2widgetLegend_outer");
            this.legend = legend; 
            
            let selectAllLabel = this.selectAllLabel || "All";
            selectAllLabel = _loc(selectAllLabel);
    
            const legendFragment = document.createDocumentFragment();
            this._drawLegendOption(legendFragment, ALL_CHOICES, selectAllLabel, null);
            this._drawLegendOption(legendFragment, TIMELINE_TOGGLE_RENDER, _loc("donut.legend.timeline.logic.label"), null);
    
            this.state.availableChoices.forEach(choice => {
                const label = choice.label || choice.id;
                const colour = choice.color;
                this._drawLegendOption(legendFragment, choice.id, _loc(label), colour);
            });
    
            legend.append(legendFragment);
            this.legendContainer.append(legend);
            this._alignVideoPlayerControls();       
        }

        _alignVideoPlayerControls() {
            const legendOffsetWidth = this.legend.offsetWidth;
            let buttonWidths = 0;
            [...document.querySelectorAll(".mejs__controls > div")].forEach(control => {
                const classList = [...control.classList];
                if (classList.includes("mejs__time-rail")) return;
                if (classList.includes("mejs__button")) {
                    let buttonWidth = Math.floor(legendOffsetWidth / 4) - 2;
                    buttonWidths += buttonWidth;
                    control.style.width = buttonWidth + "px";
                }
            });
        }

        _drawCustom() {
            const preparedData = this.prepareGraphicData(this.state.sourceModelDocuments);
            if (preparedData === undefined) return;
            this.drawCustom(preparedData);
            const filteredDonutPlaceIds = new Set();
            Object.keys(preparedData).forEach(key => {
                preparedData[key].forEach(unit => {
                    unit.originDonutDocs.forEach(id => filteredDonutPlaceIds.add(id));
                });
            });
            this.dispatchService.send(this.DH, {
                type: this.downstreamSetEvent,
                value: Array.from(filteredDonutPlaceIds)
            });
        }

        _drawGraphicToggle() {
            const minimize = "n2_filterableLegendWidgetWithGraphicMinimize";
            const maximize = "n2_filterableLegendWidgetWithGraphicMaximize";
            const hideClass = "filterableLegendWidgetGraphicAreaHidden";
            const toggleSpan = document.createElement("span");
            toggleSpan.setAttribute("id", "n2_filterableLegendWidgetWithGraphicToggle");
            if (this.graphicVisibility) {
                toggleSpan.classList.add(minimize);
            }
            else {
                toggleSpan.classList.add(maximize);
            }
            toggleSpan.addEventListener("click", () => {
                if (toggleSpan.classList.contains(minimize)) {
                    toggleSpan.classList.remove(minimize);
                    toggleSpan.classList.add(maximize);
                    this.graphic.classList.add(hideClass);
                    this.graphicVisibility = false;
                }
                else {
                    toggleSpan.classList.remove(maximize);
                    toggleSpan.classList.add(minimize);
                    this.graphic.classList.remove(hideClass);
                    this.graphicVisibility = true;
                    this._drawCustom();
                }
            });
            this.graphicContainer.append(toggleSpan);
            if (this.graphicToggle !== null) {
                if (this.graphicToggle !== undefined) {
                    this.graphicToggle.remove();
                }
                this.graphicToggle = null;
            }
            this.graphicToggle = toggleSpan;
        }

        _preloadOtherWidgetData(dispatchService) {
            /* Request the currently selected cinemap document ID */
            const message = {
                type: "modelGetInfo",
                modelId: this.cinemapModelId,
                modelInfo: null
            };
            dispatchService.synchronousCall(this.DH, message);
            const {
                modelInfo: {
                    parameters: {
                        selectedChoices: {
                            value
                        }
                    }
                }
            } = message;
            if (value.length < 1) return;

            /* Request the current cinemap document contents */
            const cinemapDocumentRequest = {
                type: "cacheRetrieveDocument",
                docId: value[0],
                doc: null
            };
            dispatchService.synchronousCall(this.DH, cinemapDocumentRequest);
            if (cinemapDocumentRequest.doc === null) return;
            const {
                atlascine_cinemap : {
                    tagColors,
                    tagGroups
                }
            } = cinemapDocumentRequest.doc;
            this.themeToColourMap = tagColors;
            this.themeToWordMap = tagGroups;
        }

        drawCustom(preparedData) {
            const D3V3 = window.d3;
            if (!D3V3) {
                alert("D3 V3 library is not available!");
                return;
            }
            // 10 * 2 because there's 10px left padding for the legend (and thus should be the same on the right side)
            // 5 for some padding * 2 on either side = 10
            const graphicWidth = document.querySelector(".n2_content_map").offsetWidth - this.legendContainer.offsetWidth - (10 * 2) - 10;
            this.graphic.style.width = graphicWidth + "px";

            // 20 because of the 10px top and bottom padding
            this.graphic.style.height = (this.legendContainer.offsetHeight - 20) + "px";

            const legendChildren = this.legend.children;
            if (!legendChildren || legendChildren.length < 1) return;

            const allSelectionRow = document.createElement("div");
            allSelectionRow.setAttribute("class", "timeline_map_tag_row");
            const timelineRenderRow = document.createElement("div");
            timelineRenderRow.setAttribute("class", "timeline_map_tag_row");
            const legendAllSelectedHeight = legendChildren[0].offsetHeight;
            allSelectionRow.style.height = legendAllSelectedHeight + "px";
            timelineRenderRow.style.height = legendAllSelectedHeight + "px";

            const xScale = D3V3.scale
            .linear()
            .domain([0, this.mediaDuration])
            .range([0, graphicWidth]);

            this.graphic.append(allSelectionRow);
            this.graphic.append(timelineRenderRow);
            D3V3.select(allSelectionRow)
            .append("svg")
            .attr("width", graphicWidth)
            .attr("height", legendAllSelectedHeight);
            D3V3.select(timelineRenderRow)
            .append("svg")
            .attr("width", graphicWidth)
            .attr("height", legendAllSelectedHeight);
            
            if (this.popup !== null && this.popup !== undefined) {
                this.popup.remove();
            }
            // Popup partially adapted from https://bl.ocks.org/arpitnarechania/4b4aa79b04d2e79f30765674b4c24ace
            const popup = D3V3.select("body")
            .append("div")
            .attr("class", "timeline_popup");
            popup.append("div").attr("class", "timeline_popup_tags");
            this.popup = popup;

            const availableChoices = this.state.availableChoices.map(choice => choice.id);

            if (preparedData === undefined) return;
            Object.entries(preparedData)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .forEach(entry => {
                if (legendChildren.length < 2) return;
                
                const [mapTag, themeArray] = entry;
                if (!availableChoices.includes(mapTag.toLowerCase())) return;

                let rowHeight = legendChildren[1].offsetHeight;
                
                const mapTagRow = document.createElement("div");
                mapTagRow.setAttribute("class", "timeline_map_tag_row");
                mapTagRow.setAttribute("data-map-tag", mapTag);
                mapTagRow.style.height = rowHeight + "px";
                this.graphic.append(mapTagRow);

                const svg = D3V3.select(mapTagRow)
                    .append("svg")
                    .attr("width", graphicWidth)
                    .attr("height", rowHeight)
                
                themeArray.forEach(themedLine => {
                    svg.selectAll("g")
                    .data([themedLine])
                    .enter()
                    .append("rect")
                        .attr("class", "timeline_bar")
                        .attr("height", rowHeight)
                        .attr("width", (line) => {
                            return xScale(line.transcriptEnd - line.transcriptStart);
                        })
                        .attr("x", (line) => {
                            return xScale(line.transcriptStart);
                        })
                        .style("fill", (line) => {
                            return this.themeToColourMap[line.group] || "#000";
                        })
                    .on("click", (line) => {
                        this.dispatchService.send(this.DH, {
                            type: "mapStoryTimelineBarClick",
                            name: this.name,
                            currentTime: line.transcriptStart,
                            origin: this.DH
                        });
                    })
                    .on("mouseover", (line) => {
                        popup.select(".timeline_popup_tags").html(
                            `<div>${line.placeTag} [${line.theme}]</div>`
                        );
                        popup.style("display", "block");
                    })
                    .on("mousemove", () => {
                        const popupHeight = popup?.[0]?.[0]?.offsetHeight || 20;
                        const popupWidth = popup?.[0]?.[0]?.offsetWidth || 50;
                        popup.style("top", (D3V3.event.pageY - (10 + popupHeight) + "px"))
                        .style("left", (D3V3.event.pageX - ((popupWidth / 2) - 5)) + "px");
                    })
                    .on("mouseout", () => {
                        popup.style("display", "none");
                    });
                });
            });
            if (this.panzoomState !== undefined) {
                if (this.panzoomState !== null) {
                    this.panzoomState.destroy();
                    this.graphicContainer.removeEventListener("wheel", this.panzoomState.zoomWithWheel);
                }
                this.panzoomState = $n2.n2es6.panzoom(this.graphic, {
                    contain: "outside",
                    cursor: "default",
                    panOnlyWhenZoom: true
                });
                this.graphicContainer.addEventListener("wheel", this.panzoomState.zoomWithWheel);
            }
        }

        _adjustSelectedItem() {
            if (!this.legend || !this.legend.hasChildNodes()) return;
            [...this.legend.children].forEach(selectionRow => {
                const choiceId = selectionRow.dataset.n2Choiceid;
                const checkbox = selectionRow.children[0];
                if (choiceId === TIMELINE_TOGGLE_RENDER) {
                    checkbox.checked = this.timelineRenderState;
                    if (this.timelineRenderState) {
                        selectionRow.children[1].style.color = "#ffffff";
                    }
                    else {
                        selectionRow.children[1].style.color = "#aaaaaa";
                    }
                    return;
                }
                if (this.state.allSelected || this.state.selectedChoiceIdMap[choiceId]) {
                    checkbox.checked = true;
                    selectionRow.children[1].style.color = "#ffffff";
                }
                else {
                    checkbox.checked = false;
                    selectionRow.children[1].style.color = "#aaaaaa";
                }
            });
        }

        _selectionChanged(choiceId) {
            if (choiceId === ALL_CHOICES) {
                if (this.state.allSelected) {
                    this.dispatchService.send(this.DH, {
                        type: this.eventNames.setSelectedChoices,
                        value: []
                    });
                }
                else {
                    this.dispatchService.send(this.DH, {
                        type: this.eventNames.setAllSelected,
                        value: true
                    });
                }
            }
            else {
                let selectedChoiceIds = [];
                if (this.state.selectedChoices.includes(choiceId)) {
                    selectedChoiceIds = this.state.selectedChoices.filter(choice => choice !== choiceId)
                }
                else if (choiceId === TIMELINE_TOGGLE_RENDER) {
                    selectedChoiceIds = this.state.selectedChoices;
                    this.timelineRenderState = !this.timelineRenderState;
                }
                else {
                    selectedChoiceIds = [...this.state.selectedChoices, choiceId];
                }
                this.dispatchService.send(this.DH, {
                    type: this.eventNames.setSelectedChoices,
                    value: selectedChoiceIds
                });
    
                if (this.state.selectedChoices.length === this.state.availableChoices.length) {
                    this.dispatchService.send(this.DH, {
                        type: this.eventNames.setAllSelected,
                        value: true
                    });
                }
            }
        }

        prepareGraphicData(docs) {
            if (this.preloadCallback !== this._preloadOtherWidgetData) return;

            // Timing issue
            if (this.themeToWordMap === null || this.themeToWordMap === undefined) return;
            const groupedData = Object.keys(this.themeToWordMap)
            .sort((a, b) => a.localeCompare(b))
            .reduce((accumulator, current) => {
                accumulator[current] = [];
                return accumulator;
            }, {});

            Object.values(docs).forEach(doc => {
                const {
                    _id,
                    _ldata: {
                        transcriptEnd,
                        transcriptStart,
                        timeLinkTags: {
                            groupTags,
                            themeTags,
                            placeTag
                        }
                    }
                } = doc;

                groupTags.forEach(group => {
                    themeTags.forEach(theme => {
                        if (this.themeToWordMap[group]?.includes(theme)) {
                            groupedData[group].push({
                                transcriptEnd,
                                transcriptStart,
                                group,
                                theme,
                                placeTag,
                                originDonutDoc: _id
                            });
                        }
                    });
                });
            });

            /*
                groupedData should now look like:
                {
                    map_tag_name: [
                        {
                            transcriptStart: ...,
                            transcriptEnd: ...,
                            group: ...,
                            theme: ...,
                            placeTag: ...
                        }
                    ]
                }
             */
            let dedupedGroupedData = Object.keys(this.themeToWordMap)
            .sort((a, b) => a.localeCompare(b))
            .reduce((accumulator, current) => {
                accumulator[current] = [];
                return accumulator;
            }, {});
            const tmpDataByGroup = $n2.deepCopy(dedupedGroupedData);
            const sameTimes = new Map();
            Object.entries(groupedData).forEach(groupData => {
                const [mapTagName, unitArray] = groupData;
                const dedupedTimes = [...new Set(unitArray.map(unit => {
                    return `${unit.transcriptStart.toString()}|${unit.transcriptEnd.toString()}`;
                }))];
                dedupedTimes.forEach(time => {
                    if (!sameTimes.has(time)) {
                        sameTimes.set(time, new Set());
                    }
                    const [start, end] = time.split("|");
                    let newUnit = {
                        transcriptStart: start,
                        transcriptEnd: end,
                        originDonutDocs: [],
                        group: [],
                        theme: [],
                        placeTag: []
                    };
                    unitArray.forEach(oldUnit => {
                        if (start === oldUnit.transcriptStart.toString() && end === oldUnit.transcriptEnd.toString()) {
                            newUnit.originDonutDocs.push(oldUnit.originDonutDoc);
                            if (!newUnit.group.includes(oldUnit.group)) {
                                newUnit.group.push(oldUnit.group);
                                sameTimes.set(time, sameTimes.get(time).add(oldUnit.group.toLowerCase().trim()));
                            }
                            if (!newUnit.theme.includes(oldUnit.theme)) newUnit.theme.push(oldUnit.theme);
                            if (!newUnit.placeTag.includes(oldUnit.placeTag)) newUnit.placeTag.push(oldUnit.placeTag);
                        }
                    });
                    newUnit.group = newUnit.group.join(", ");
                    newUnit.theme = newUnit.theme.join(", ");
                    newUnit.placeTag = newUnit.placeTag.join(", ");
                    dedupedGroupedData[mapTagName].push(newUnit);
                });
            });
            if (!this.timelineRenderState && this.state.selectedChoices.length > 1) {
                const allowedTime = [];
                const selChoices = this.state.selectedChoices;
                sameTimes.forEach((set, time) => {
                    if (selChoices.every(groupChoice => set.has(groupChoice))) {
                        allowedTime.push(time);
                    }
                });
                const self = this;
                allowedTime.forEach(timeKey => {
                    const [start, end] = timeKey.split("|");
                    Object.entries(dedupedGroupedData).forEach(([group, units]) => {
                        tmpDataByGroup[group] = tmpDataByGroup[group].concat(units.filter(unit => {
                            return (unit.transcriptStart === start
                                && unit.transcriptEnd === end
                                && self.state.selectedChoices.includes(unit.group.toLowerCase().trim()))
                        }));
                    });
                });
                dedupedGroupedData = { ...tmpDataByGroup };
                if (allowedTime.length === 0) {
                    Object.entries(dedupedGroupedData).forEach(([group, _]) => {
                        dedupedGroupedData[group] = [];
                    });
                }
            }
            return dedupedGroupedData;
        }
    }

    const DualFilteredDonutFilter = $n2.Class("DualFilteredDonutFilter", $n2.modelFilter.SelectableDocumentFilter, {

        selectedDocIds: [],
        selectionById: null,
        currentChoices: null,
        currentCallback: null,

        initialize: function(opts_) {
            var opts = $n2.extend({
                modelId: undefined
                , sourceModelId: undefined
                , dispatchService: undefined
                , schemaRepository: undefined
                , selectedDocIds: []
            }, opts_);

            if ($n2.isArray(opts.selectedDocIds)) {
                this.selectedDocIds = opts.selectedDocIds;
            } else {
                throw new Error('MultiDocumentFilter requires a selectedDocIds property');
            }

            $n2.modelFilter.SelectableDocumentFilter.prototype.initialize.call(this, opts);

            this.currentChoices = [];
            this.currentCallback = null;
        },

        _computeAvailableChoicesFromDocs: function(docs, callbackFn) {
            var _this = this;

            var choiceLabelById = [];
            docs.forEach(function (doc) {
                if (doc && doc._id) {
                    if (_this.selectedDocIds.indexOf(doc._id) >= 0) {
                        choiceLabelById.push(doc._id);
                    }
                }
            });

            var availableChoices = [];
            choiceLabelById.forEach(function (id) {
                var label = choiceLabelById[id];
                availableChoices.push({
                    id: id
                    , label: id
                });
            });

            availableChoices.sort(function (a, b) {
                if (a.label < b.label) return -1;
                if (a.label > b.label) return 1;
                return 0;
            });

            this.currentChoices = availableChoices;
            this.currentCallback = callbackFn;
            callbackFn(availableChoices);
            return null;
        },

        _isDocVisible: function (doc, selectedChoiceIdMap) {
            if (doc && doc._id) {
                if (selectedChoiceIdMap[doc._id]) return true;
                if (doc?._ldata?.timeLinkTags?.groupTags?.length === 0 ||
                    doc?._ldata?.timeLinkTags?.themeTags?.length === 0) return true;
            }
            return false;
        }
    });

    const DonutFilterByGroupTag = $n2.Class("DonutFilterByGroupTag", $n2.modelFilter.SelectableDocumentFilter, {

        dispatchService: null,

        initialize: function (opts_) {
            var opts = $n2.extend({
                modelId: null
                , sourceModelId: null
                , dispatchService: null
            }, opts_);

            this.disabled = opts.dispatchService;

            $n2.modelFilter.SelectableDocumentFilter.prototype.initialize.call(this, opts);

            $n2.log("DonutFilterByGroupTag", this);
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
            availableChoices.sort((a, b) => {
                return a.label.localeCompare(b.label)
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
                    this._setDonutFillColour(doc, selectedChoiceIdMap);
                    return true;
                }
                else if (doc._ldata.timeLinkTags
                    && doc._ldata.timeLinkTags.groupTags
                    && $n2.isArray(doc._ldata.timeLinkTags.groupTags)
                    && doc._ldata.timeLinkTags.groupTags.length) {
                    const groupTags = doc._ldata.timeLinkTags.groupTags;
                    for (var i = 0; i < groupTags.length; i += 1) {
                        var tag = groupTags[i].toLowerCase().trim();
                        if (selectedChoiceIdMap[tag]) {
                            this._setDonutFillColour(doc, selectedChoiceIdMap);
                            return true;
                        }
                    }
                }

                return false;
            }

            // All other docs in the source model, let them through the filter
            return true;
        },

        /*
            If selections are made on the filter, the donut/ring colour
            needs to change to always take the lastmost group tag that is also
            currently actively selected and set the donut/ring colour of that group.
         */
        _setDonutFillColour: function(doc, selections) {
            const groupTags = doc._ldata.timeLinkTags.groupTags;
            const tagGroupColors = doc._ldata.tagGroupColors;
            for (let i = groupTags.length - 1; i >= 0; i--) {
                const tag = groupTags[i].toLowerCase().trim();
                if (selections.hasOwnProperty(tag) && tagGroupColors.hasOwnProperty(tag)) {
                    doc._ldata.style.fillColor = tagGroupColors[tag];
                    break;
                }
            }
        }
    });

    Object.assign($n2.atlascine, {
        MapStoryFilterableLegendWidgetWithGraphic: MapStoryFilterableLegendWidgetWithGraphic,
        DonutFilterByGroupTag: DonutFilterByGroupTag,
        DualFilteredDonutFilter: DualFilteredDonutFilter
    });

})(jQuery, nunaliit2);
