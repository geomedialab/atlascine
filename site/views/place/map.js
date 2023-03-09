function(doc) {
    if (doc && doc.atlascine_place && doc.atlascine_place.name) {
        emit(doc.atlascine_place.name, 1);
    }
}
