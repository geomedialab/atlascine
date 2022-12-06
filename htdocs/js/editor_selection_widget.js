(function ($n2) {
    "use strict";
    const _loc = function (str, args) { return $n2.loc(str, 'atlascine.module.editor', args); };
    class EditorSelectionWidget {
        constructor(opts_) {
            const opts = {
                dispatchService: null,
                containerId: null,
                schemaChoices: null,
                targetContainer: null,
                ...opts_
            };

            this.DH = "EditorSelectionWidget";
            this.dispatchService = opts.dispatchService;
            this.containerId = opts.containerId;
            this.schemaChoices = opts.schemaChoices;
            this.targetContainerId = opts.targetContainerId;

            if (!this.containerId) {
                throw new Error("containerId must be specified");
            }

            if (!this.targetContainerId) {
                throw new Error("targetContainerId must be specified");
            }

            if (!this.dispatchService) {
                throw new Error("dispatchService must be provided");
            }
            
            this.elemContainer = document.getElementById(this.containerId);
            if (this.elemContainer === null) {
                throw new Error(`containerId ${this.containerId} could not be found`);
            }

            this.targetContainer = document.getElementById(this.targetContainerId);
            if (this.targetContainer === null) {
                throw new Error(`targetContainerId ${this.targetContainerId} could not be found`);
            }

            if (!Array.isArray(this.schemaChoices)) {
                throw new Error("schemaChoices must be an array");
            }

            if (!this.schemaChoices.every(choice => choice.hasOwnProperty("value"))) {
                throw new Error("For each choice in schemaChoices, it must have a 'value' property");
            }

            this.elementId = $n2.getUniqueId();

            this._initializeDispatchService();
            this._draw();
            this._initializeBehaviour();
        }

        _initializeDispatchService() {
            this.dispatchService.register(
                this.DH,
                "customEditorModuleListIntercept",
                () => {
                    this._createListQueryEvent()
                }
            );
        }

        _draw() {
            const div = document.createElement("div");
            div.setAttribute("id", this.elementId);
            div.setAttribute("class", "atlascine_editor_selection_widget");
            this.select = document.createElement("select");
            this.schemaChoices.forEach(choice => {
                const locChoice = _loc(choice);
                const option = new Option(locChoice, choice.value);
                this.select.add(option);
            });
            div.append(this.select);
            this.elemContainer.append(div);
        }

        _initializeBehaviour() {
            this.select.onchange = () => {
                this.dispatchService.synchronousCall(this.DH, {
                    type: "searchDeactivated"
                });
                this.dispatchService.send(this.DH, {
                    type: "userUnselect"
                });
                this.dispatchService.send(this.DH, {
                    type: "editCancel"
                });
                this._createListQueryEvent();
            }
        }

        _createListQueryEvent() {
            const queriedSchema = this.select.value;
            this.targetContainer = document.getElementById(this.targetContainerId);
            if (this.targetContainer === null) {
                return;
            }
            this.targetContainer.classList.add("n2show_documentList_wait");
            this.targetContainer.setAttribute("nunaliit-list-name", queriedSchema);
            this.dispatchService.send(this.DH, {
                type: "documentListQuery",
                listType: "custEditor",
                listName: queriedSchema
            })
        }
    }

    $n2.atlascine = {
        ...$n2.atlascine,
        EditorSelectionWidget: EditorSelectionWidget
    };

})(nunaliit2);
