(function ($n2) {
    "use strict";
    const _loc = function (str, args) { return $n2.loc(str, 'atlascine.own.layer.creation.utility', args); };

    const OwnLayerDocCreationUtility = $n2.Class("DonutFilterByGroupTag", $n2.utilities.AssignLayerOnDocumentCreation, {
        layerId: null,
        onlyWithGeometries: null,
        dispatchService: null,

        initialize: function (opts_) {
            const opts = $n2.extend({
                layerId: null
                , onlyWithGeometries: false
                , dispatchService: null
            }, opts_);

            $n2.utilities.AssignLayerOnDocumentCreation.prototype.initialize.call(this, opts);
            /* Don't need a layer - user doesn't have the role by default */
            delete this.layerId
            this.DH = "OwnLayerDocCreationUtility";
        },

        _handle: function (m, addr, dispatcher) {
            if ('preDocCreation' === m.type) {
                const createdDoc = m.doc;
                let addLayer = true;

                if (this.onlyWithGeometries) {
                    if (!createdDoc.hasOwnProperty("nunaliit_geom")) {
                        addLayer = false;
                    }
                }

                if (addLayer) {
                    if (!createdDoc.nunaliit_layers) {
                        createdDoc.nunaliit_layers = [];
                    }
                    if (this.layerId) {
                        let layers = this.layerId;
                        if (typeof layers === "string") layers = [layers];
                        createdDoc.nunaliit_layers = [...new Set(
                            [...createdDoc.nunaliit_layers, ...layers]
                        )];
                    }
                    const authMessage = {
                        type: "authIsLoggedIn"
                    };
                    this.dispatchService.synchronousCall(
                        this.DH,
                        authMessage
                    );
                    if (!authMessage.isLoggedIn) return;
                    const user = authMessage?.context?.name;
                    if (user === undefined) return;
                    createdDoc.nunaliit_layers.push(user);
                }

                if (createdDoc.nunaliit_schema) {
                    if (createdDoc.nunaliit_schema === "atlascine_cinemap") {
                        createdDoc.atlascine_cinemap = {
                            ...createdDoc.atlascine_cinemap,
                            timeLinks: [],
                            tagColors: {},
                            tagGroups: {}
                        }
                    }
                }
            }
        }

    });

    $n2.atlascine = {
        ...$n2.atlascine,
        OwnLayerDocCreationUtility: OwnLayerDocCreationUtility
    };

})(nunaliit2);
