function(doc) {
    if (doc && doc.atlascine_cinemap && doc.atlascine_cinemap.tagGroups) {
        var groups = doc.atlascine_cinemap.tagGroups;
        for (var group in groups) {
            groups[group].forEach(function(theme) {
                emit(theme, 1);
            });
        }
    }
}
