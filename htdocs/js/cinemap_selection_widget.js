(function ($, $n2) {
    "use strict";

    const _loc = function (str, args) { return $n2.loc(str, "nunaliit2-couch", args); };

    const SingleFilterSelectionWidgetWithAutoSelectFirst = $n2.Class("SingleFilterSelectionWidgetWithAutoSelectFirst", $n2.widgetSelectableFilter.SingleFilterSelectionWidget, {
        initialize: function (opts_) {
            const opts = { ...opts_ };
            $n2.widgetSelectableFilter.SingleFilterSelectionWidget.prototype.initialize.call(this, opts);
        },

        _handle: function(m, addr, dispatcher){
            const {
                value,
                type
            } = m;

            if( this.availableChoicesChangeEventName === type ){
                if( value ){
                    this._setAvailableChoices(value);
                    this._throttledAvailableChoicesUpdated();
                    if (nunaliit2.storage.getLocalStorage().getItem(this.sourceModelId) === null) {
                        const selectEl = document.querySelector(`#${this.elemId} > select`);
                        const options = selectEl.options;
                        for (let i = 0; i < options.length; i++) {
                            if (options[i].value === "__UNKNOWN_CHOICE_SELECTED__") {
                                continue;
                            }
                            else {
                                selectEl.value = options[i].value;
                                this._selectionChanged();
                                break;
                            }
                        }
                    }
                };
                
            } else if( this.selectedChoicesChangeEventName === type ){
                if( value ){
                    this.selectedChoices = value;
                    
                    this.selectedChoiceIdMap = {};
                    this.selectedChoices.forEach((choiceId) => {
                        this.selectedChoiceIdMap[choiceId] = true;
                    });
                    
                    this._adjustSelectedItem();
                };
    
            } else if( this.allSelectedChangeEventName === type ){
                if( typeof value === "boolean" ){
                    this.allSelected = value;
                    
                    this._adjustSelectedItem();
                };
            };
        }

    });

    const SingleFilterSelectionWidgetWithAutoSelectFirstAndShareURLParsing = $n2.Class(
        "SingleFilterSelectionWidgetWithAutoSelectFirstAndShareURLParsing", $n2.widgetSelectableFilter.SingleFilterSelectionWidget, {
        initialize: function (opts_) {
            const opts = { ...opts_ };
            $n2.widgetSelectableFilter.SingleFilterSelectionWidget.prototype.initialize.call(this, opts);
            this.allChoices = "__ALL_CHOICES__";
            this.noChoice = "__NO_CHOICE_SELECTED__";
            this.unknownChoice = "__UNKNOWN_CHOICE_SELECTED__";
            this.DH = "SingleFilterSelectionWidgetWithAutoSelectFirstAndShareURLParsing";

            const f = (m, addr, dispatcher) => {
                this._handle(m, addr, dispatcher);
            };
            this.dispatchService.register(this.DH, "setHash", f);
        },

        _parseCinemapIdFromURL: () => {
            const urlObj = new URL(window.location.href);
            return urlObj.searchParams.get("cinemapId");
        },

        _updateURL: (cinemapId, cinemapTitle) => {
            const urlObj = new URL(window.location.href);
            urlObj.hash = "";
            urlObj.searchParams.set("cinemapId", cinemapId);
            window.history.pushState({}, cinemapTitle, `${urlObj.pathname}${urlObj.search}`)
        },

        _handle: function (m, addr, dispatcher) {
            const {
                value,
                type
            } = m;

            if (this.availableChoicesChangeEventName === type) {
                if (value) {
                    this._setAvailableChoices(value);
                    this._throttledAvailableChoicesUpdated();
                    const selectEl = document.querySelector(`#${this.elemId} > select`);
                    const options = selectEl.options;
                    const cinemapId = this._parseCinemapIdFromURL();
                    if (cinemapId !== null) {
                        /* If cinemapId is a query parameter in the URL, try and set the dropdown to it. */
                        const foundOption = [...options].find(option => option.value === cinemapId);
                        if (foundOption !== undefined) {
                            selectEl.value = foundOption.value;
                            this._selectionChanged();
                            return;
                        }
                        else {
                            new nunaliit2.mdc.MDCDialog({
                                dialogTitle: _loc("Cinemap Not Found"),
                                dialogHtmlContent: `${_loc("The cinemap was not found.")}<br>${cinemapId}`,
                                closeBtn: true
                            });
                            /* If it's not found, continue with the autoselect below. */
                        }
                    }
                    if (nunaliit2.storage.getLocalStorage().getItem(this.sourceModelId) === null) {
                        /* If it's your first time visiting, try and select the first option. */
                        for (let i = 0; i < options.length; i++) {
                            if (options[i].value === this.unknownChoice) {
                                continue;
                            }
                            else {
                                selectEl.value = options[i].value;
                                this._selectionChanged();
                                break;
                            }
                        }
                    }
                }

            }
            else if (this.selectedChoicesChangeEventName === type) {
                if (value) {
                    this.selectedChoices = value;
                    this.selectedChoiceIdMap = {};
                    this.selectedChoices.forEach((choiceId) => {
                        this.selectedChoiceIdMap[choiceId] = true;
                    });

                    this._adjustSelectedItem();
                }
            }
            else if (this.allSelectedChangeEventName === type) {
                if (typeof value === "boolean") {
                    this.allSelected = value;
                    this._adjustSelectedItem();
                }
            }
            else if ("setHash" === type) {
                const $elem = this._getElem();
                const $selector = $elem.find("select");
                const val = $selector.val();
                const selectEl = $selector[0];
                const optionText = selectEl[selectEl.selectedIndex].text;
                this._updateURL(val, optionText);
            }
        },

        _selectionChanged: function() {
            const $elem = this._getElem();
            const $selector = $elem.find("select");
            const val = $selector.val();

            if (this.allChoices === val) {
                this.dispatchService.send(this.DH, {
                    type: this.allSelectedSetEventName
                    , value: true
                });

            }
            else if (this.noChoice === val) {
                this.dispatchService.send(this.DH, {
                    type: this.selectedChoicesSetEventName
                    , value: []
                });
            }
            else if (this.unknownChoice === val) {
            }
            else {
                this.dispatchService.send(this.DH, {
                    type: this.selectedChoicesSetEventName
                    , value: [val]
                });
                const selectEl = $selector[0];
                const optionText = selectEl[selectEl.selectedIndex].text;
                this._updateURL(val, optionText);
            }
        }

    });

    $n2.atlascine = {
        ...$n2.atlascine
        , SingleFilterSelectionWidgetWithAutoSelectFirst: SingleFilterSelectionWidgetWithAutoSelectFirst
        , SingleFilterSelectionWidgetWithAutoSelectFirstAndShareURLParsing: SingleFilterSelectionWidgetWithAutoSelectFirstAndShareURLParsing
    };

})(jQuery, nunaliit2);
