function(doc){

    if( doc && doc.atlascine_cinemap ){
      var id = doc._id;

      if (doc.atlascine_cinemap.timeLinks
        && doc.atlascine_cinemap.timeLinks.length ){
          var tls = doc.atlascine_cinemap.timeLinks;

          tls.forEach(function(tl){
            if( tl.tags && tl.tags.length ){
              var tl_places = undefined;
              tl.tags.forEach(function(tag){
                if (tag.type === 'place' || tag.type === 'location'){
                  if ( !tl_places ){
                    tl_places = [];
                  }
                  tl_places.push(tag.value);
                }


              });
              tl.tags.forEach(function(tag){
                var _tagInfo = {
                  cinemapId : id
                  ,type : tag.type
                  ,value : tag.value
                  ,places : tl_places
                  ,starttime: tl.starttime
                  ,endtime: tl.endtime
                }
                emit(tag.type, _tagInfo);
                  emit(tag.value, _tagInfo);
              });
            }
          });

        }
    }
}
