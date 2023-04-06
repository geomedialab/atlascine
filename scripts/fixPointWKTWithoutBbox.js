/* Can set this instead of initing one every time */
window.wktReader = new OpenLayers.Format.WKT()

function(doc, onTransform, onSkip) {
    let updated = false
    let wktReader = window.wktReader
    if (wktReader === undefined) wktReader = new OpenLayers.Format.WKT()
    if (doc && doc.nunaliit_geom && doc.nunaliit_geom.wkt && doc.nunaliit_geom.bbox === undefined) {
        const wkt = wktReader.read(doc.nunaliit_geom.wkt)
        const bbox = wkt?.geometry?.getBounds()?.toArray()
        if (bbox !== undefined) {
            doc.nunaliit_geom.bbox = bbox
            updated = true
        }
    }
    updated ? onTransform() : onSkip()
}