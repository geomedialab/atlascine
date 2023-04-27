function(doc, onTransform, onSkip) {
    let updated = false;

    if (doc && doc.nunaliit_layers) {
        const removedPublic = doc.nunaliit_layers.filter(layer => !(layer.startsWith("public_") || layer === "public"));
        if (removedPublic.length < doc.nunaliit_layers.length) {
            removedPublic.push("atlascine");
            doc.nunaliit_layers = removedPublic;
            updated = true;
        }
    }

    updated ? onTransform() : onSkip();
}