/** 
 * Name: donut-tag-legend.js
 */

; (function ($, $n2) {
    "use strict";

    // Localization
    const _loc = function (str, args) { return $n2.loc(str, "nunaliit2-couch", args); };

    class MapStoryFilterableLegendWidgetWithGraphic extends nunaliit2.filterableLegendWidget.filterableLegendWidgetWithGraphic {
        constructor(options) {
            super(options);
            this.cinemapModelId = options.cinemapModelId;
            this.DH = "MapStoryFilterableLegendWidgetWithGraphic";
            this.themeToColourMap = null;
            this.themeToWordMap = null;
            this.mediaDuration = 0;
            this.popup = null;
            this.preloadCallback = this._preloadOtherWidgetData;

            if (!this.cinemapModelId) {
                throw new Error("cinemapModelId must be specified");
            }

            this.cinemapSelectionSetEventName = `${this.cinemapModelId}_selectedChoices_set`;
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

                this._drawCustom();
            }
            else if (type === this.cinemapSelectionSetEventName) {
                this._preloadOtherWidgetData(this.dispatchService);
            }
        }

        _drawCustom() {
            this.drawCustom(this.prepareGraphicData(this.state.sourceModelDocuments));
        }

        _preloadOtherWidgetData(dispatchService) {
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
            const legendAllSelectedHeight = legendChildren[0].offsetHeight;
            allSelectionRow.style.height = legendAllSelectedHeight + "px";

            const xScale = D3V3.scale
            .linear()
            .domain([0, this.mediaDuration])
            .range([0, graphicWidth]);

            this.graphic.append(allSelectionRow);
            D3V3.select(allSelectionRow)
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
                            `<div>${[line.theme, line.placeTag].join(", ")}</div>`
                        );
                        popup.style("display", "block");
                    })
                    .on("mousemove", () => {
                        popup.style("top", (D3V3.event.pageY - 30) + "px")
                        .style("left", (D3V3.event.pageX - 50) + "px");
                    })
                    .on("mouseout", () => {
                        popup.style("display", "none");
                    });
                });
            });
        }

        prepareGraphicData(docs) {
            if (this.preloadCallback !== this._preloadOtherWidgetData) return {};

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
                        if (this.themeToWordMap[group].includes(theme)) {
                            groupedData[group].push({
                                transcriptEnd,
                                transcriptStart,
                                group,
                                theme,
                                placeTag
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
            const dedupedGroupedData = Object.keys(this.themeToWordMap)
            .sort((a, b) => a.localeCompare(b))
            .reduce((accumulator, current) => {
                accumulator[current] = [];
                return accumulator;
            }, {});
            Object.entries(groupedData).forEach(groupData => {
                const [mapTagName, unitArray] = groupData;
                const dedupedTimes = [...new Set(unitArray.map(unit => {
                    return `${unit.transcriptStart.toString()}|${unit.transcriptEnd.toString()}`;
                }))];
                dedupedTimes.forEach(time => {
                    const [start, end] = time.split("|");
                    let newUnit = {
                        transcriptStart: start,
                        transcriptEnd: end,
                        group: [],
                        theme: [],
                        placeTag: []
                    };
                    unitArray.forEach(oldUnit => {
                        if (start === oldUnit.transcriptStart.toString() && end === oldUnit.transcriptEnd.toString()) {
                            if (!newUnit.group.includes(oldUnit.group)) newUnit.group.push(oldUnit.group);
                            if (!newUnit.theme.includes(oldUnit.theme)) newUnit.theme.push(oldUnit.theme);
                            if (!newUnit.placeTag.includes(oldUnit.placeTag)) newUnit.placeTag.push(oldUnit.placeTag);
                        }
                    });
                    newUnit.group = newUnit.group.join(", ");
                    newUnit.theme = newUnit.theme.join(", ");
                    newUnit.placeTag = newUnit.placeTag.join(", ");
                    dedupedGroupedData[mapTagName].push(newUnit);
                })
            });
            return dedupedGroupedData;
        }
    }



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
        MapStoryFilterableLegendWidgetWithGraphic: MapStoryFilterableLegendWidgetWithGraphic,
        DonutFilterByGroupTag: DonutFilterByGroupTag
    });

})(jQuery, nunaliit2);
