(function ($, $n2) {
    "use strict";

    const SingleFilterSelectionWidgetWithAutoSelectFirst = $n2.Class('SingleFilterSelectionWidgetWithAutoSelectFirst', $n2.widgetSelectableFilter.SingleFilterSelectionWidget, {
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
                if( typeof value === 'boolean' ){
                    this.allSelected = value;
                    
                    this._adjustSelectedItem();
                };
            };
        }

    });

    $n2.atlascine = {
        ...$n2.atlascine,
        SingleFilterSelectionWidgetWithAutoSelectFirst: SingleFilterSelectionWidgetWithAutoSelectFirst
    };

})(jQuery, nunaliit2);
