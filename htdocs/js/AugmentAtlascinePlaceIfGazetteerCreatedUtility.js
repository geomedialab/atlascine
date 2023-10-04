(function ($n2) {
    "use strict";
    const _loc = function (str, args) { return $n2.loc(str, 'atlascine.utility.augmentplacefromgazetteer', args); };

    class AugmentAtlascinePlaceIfGazetteerCreatedUtility {
        constructor(opts) {
            this.dispatchService = opts.dispatchService
            this.DH = "AugmentAtlascinePlaceIfGazetteerCreatedUtility";

            this.dispatchService.register(this.DH, "preDocCreation", (m, addr, dispatcher) => {
                this._handle(m, addr, dispatcher)
            })
        }

        _handle(m, addr, dispatcher) {
            if ('preDocCreation' === m.type) {
                if (m?.doc?.nunaliit_schema === "atlascine_place" && m?.extraData) {
                    const {
                        nunaliit_gazetteer: {
                            geonameId,
                            name
                        }
                    } = m.extraData
                    m.doc.atlascine_place = {
                        ...m.doc.atlascine_place,
                        name,
                        geonameId
                    }
                }
            }
        }
    }

    $n2.atlascine = {
        ...$n2.atlascine,
        AugmentAtlascinePlaceIfGazetteerCreatedUtility: AugmentAtlascinePlaceIfGazetteerCreatedUtility
    };

})(nunaliit2);
