function(doc){

    if( doc && doc.atlascine_cinemap ){
      var id = doc._id;

      if (doc.atlascine_cinemap.timeLinks
        && doc.atlascine_cinemap.timeLinks.length ){
          var tls = doc.atlascine_cinemap.timeLinks;

          tls.forEach(function(tl){
            if( tl && tl.tags && tl.tags.length ){
                tl.tags.forEach(function(tag){
                  if( tag.type && tag.type !== 'unknown' ){
                      emit(tag.type, 1);
                  }
                  if( tag.value ){
                    emit(tag.value, 1);
                  }

                });

            }
          });
        }
      };
}
