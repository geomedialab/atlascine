(function ($, $n2) {

    if (typeof (window.nunaliit_custom) === 'undefined') {
        window.nunaliit_custom = {};
    }

    /* Suppress errors thrown by Panzoom due to conflict with Nunaliit */
    window.onerror = (ev, _, __, ___, ____) => {
        if (ev === "Uncaught TypeError: Failed to execute 'getComputedStyle' on 'Window': parameter 1 is not of type 'Element'.") {
            return true;
        }
    };

    const DH = 'atlascine';
    let globalAtlasDesign = null;
    let globalDispatchService = null;

    function handleUtilityCreate(m) {
        let options = {};
        if ('utilityCreate' === m.type) {
            if (m.utilityOptions) {
                options = { ...m.utilityOptions };
            }

            const cfg = m.config;
            if (cfg && cfg.directory) {
                options.dispatchService = cfg.directory.dispatchService;
                options.eventService = cfg.directory.eventService;
                options.customService = cfg.directory.customService;
                options.showService = cfg.directory.showService;
                options.atlasDb = cfg.atlasDb;
            }

            if (m.utilityType === 'cinemaSelectionRedirector') {
                new $n2.atlascine.CinemaSelectionRedirector(options);
                m.created = true;
            }
            else if (m.utilityType === 'getSelectionUtility') {
                new $n2.atlascine.GetSelectionUtility(options);
                m.created = true;
            }
            else if (m.utilityType === 'tagUtility') {
                new $n2.atlascine.TagUtility(options);
                m.created = true;
            }
            else if (m.utilityType === 'colorUtility') {
                new $n2.atlascine.ColorUtility(options);
                m.created = true;
            }
            else if (m.utilityType === 'placeUtility') {
                new $n2.atlascine.PlaceUtility(options);
                m.created = true;
            }
            else if (m.utilityType === 'ownLayerDocCreationUtility') {
                new $n2.atlascine.OwnLayerDocCreationUtility(options);
                m.created = true;
            }
            else if (m.utilityType === 'augmentAtlascinePlaceIfGazetteerCreatedUtility') {
                new $n2.atlascine.AugmentAtlascinePlaceIfGazetteerCreatedUtility(options);
                m.created = true;
            }
        }
    }

    function handleDisplayAvailable(m) {
        if (m.displayType === 'cineMultiStoriesDisplay') {
            m.isAvailable = true;
        } else if (m.displayType === 'cineStoriesDisplay') {
            m.isAvailable = true;
        }
    }

    function handleDisplayRender(m) {
        let options = {};
        if (m.displayOptions) {
            options = { ...m.displayOptions };
        }

        options.displayPanelName = m.displayId;

        if (m.config && m.config.directory) {
            options.dispatchService = m.config.directory.dispatchService;
            options.showService = m.config.directory.showService;
        }

        if (m.displayType === 'cineMultiStoriesDisplay') {
            const displayControl = new $n2.atlascine.CineMultiStoriesDisplay(options);
            m.onSuccess(displayControl);
        }
        else if (m.displayType === 'cineStoriesDisplay') {
            const displayControl = new $n2.atlascine.CineStoriesDisplay(options);
            m.onSuccess(displayControl);
        }
    }

    function handleWidgetAvailableRequests(m) {
        if (m.widgetType === 'donutGroupTagLegendWidget') {
            m.isAvailable = true;
        } else if (m.widgetType === 'themeDonutGroupTagLegendWidget') {
            m.isAvailable = true;
        } else if (m.widgetType === 'cineTranscript') {
            m.isAvailable = true;
        } else if (m.widgetType === 'themeTranscript') {
            m.isAvailable = true;
        } else if (m.widgetType === 'mapStoryFilterableLegendWidgetWithGraphic') {
            m.isAvailable = true;
        } else if (m.widgetType === 'singleFilterSelectionWidgetWithAutoSelectFirst') {
            m.isAvailable = true;
        } else if (m.widgetType === 'singleFilterSelectionWidgetWithAutoSelectFirstAndShareURLParsing') {
            m.isAvailable = true;
        } else if (m.widgetType === 'editorSelectionWidget') {
            m.isAvailable = true;
        }
    }

    function handleWidgetDisplayRequests(m) {
        let options = {};
        const cfg = m.config;
        const isDirectoryPresent = (cfg && cfg.directory);

        if (m.widgetOptions) {
            options = { ...m.widgetOptions };
        }

        if (isDirectoryPresent) {
            options.dispatchService = cfg.directory.dispatchService;
        }

        if (m.widgetType === 'themeDonutGroupTagLegendWidget') {
            if (isDirectoryPresent) {
                options.showService = cfg.directory.showService;
            }
            options.containerId = m.containerId;
            new $n2.atlascine.ThemeDonutGroupTagLegendWidget(options);
        }
        else if (m.widgetType === 'cineTranscript') {
            if (isDirectoryPresent) {
                options.attachmentService = cfg.directory.attachmentService;
            }
            new $n2.atlascine.CineTranscript(options);
        }
        else if (m.widgetType === 'themeTranscript') {
            if (isDirectoryPresent) {
                options.attachmentService = cfg.directory.attachmentService;
            }
            new $n2.atlascine.ThemeTranscript(options);
        }
        else if (m.widgetType === 'mapStoryFilterableLegendWidgetWithGraphic') {
            new $n2.atlascine.MapStoryFilterableLegendWidgetWithGraphic(options);
        }
        else if (m.widgetType === 'singleFilterSelectionWidgetWithAutoSelectFirst') {
            new $n2.atlascine.SingleFilterSelectionWidgetWithAutoSelectFirst(options);
        }
        else if (m.widgetType === 'singleFilterSelectionWidgetWithAutoSelectFirstAndShareURLParsing') {
            new $n2.atlascine.SingleFilterSelectionWidgetWithAutoSelectFirstAndShareURLParsing(options);
        }
        else if (m.widgetType === 'editorSelectionWidget') {
            new $n2.atlascine.EditorSelectionWidget(options);
        }
    }

    function handleDocumentListQuery(m) {
        if (globalAtlasDesign === null) return;
        const {
            listType,
            listName
        } = m;
        if (listType === "custEditor") {
            if (listName === "DEFAULT_REDIRECT_VALUE") {
                globalDispatchService.send("custEditor.redirect", {
                    type: "customEditorModuleListIntercept"
                });
            }
            else {
                globalAtlasDesign.queryView({
                    viewName: "nunaliit-schema",
                    keys: [listName],
                    include_docs: true,
                    reduce: false,
                    onSuccess: (res) => {
                        const msg = {
                            type: "documentListResults",
                            listName,
                            listType,
                            docs: null,
                            docIds: null
                        };
                        const resDocs = [];
                        res.forEach(row => {
                            resDocs.push(row.doc);
                        });
                        resDocs.sort((docA, docB) => {
                            if (docA.nunaliit_last_updated?.time > docB.nunaliit_last_updated?.time) return -1;
                            if (docA.nunaliit_last_updated?.time < docB.nunaliit_last_updated?.time) return 1;
                            return 0;
                        });
                        msg.docs = resDocs;
                        msg.docIds = resDocs.map(doc => doc.id);
                        globalDispatchService.send("custEditor." + listName, msg);
                    },
                    onError: () => {
                        $n2.reportErrorForced(`Failed to query the atlas for ${listName}`)
                    }
                });
            }
        }
    }

    function handleModelEvents(m) {
        if (m.type === 'modelCreate') {
            let options = {};

            if (m.modelOptions) {
                options = {...m.modelOptions};
            }

            options.modelId = m.modelId;

            if (m.config && m.config.directory) {
                options.dispatchService = m.config.directory.dispatchService;
            }

            if (m.modelType === 'cineTimeIndexTransform') {
                new $n2.atlascine.CineTimeIndexTransform(options);
                m.created = true;
            }
            else if (m.modelType === 'cineData2DonutTransform') {
                new $n2.atlascine.CineData2DonutTransform(options);
                m.created = true;
            }
            else if (m.modelType === 'themeIndexTransform') {
                new $n2.atlascine.ThemeIndexTransform(options);
                m.created = true;
            }
            else if (m.modelType === 'themeData2DonutTransform') {
                new $n2.atlascine.ThemeData2DonutTransform(options);
                m.created = true;
            }
            else if (m.modelType === 'cineMapFilter') {
                new $n2.atlascine.CineMapFilter(options);
                m.created = true;
            }
            else if (m.modelType === 'themeMapFilter') {
                new $n2.atlascine.ThemeMapFilter(options);
                m.created = true;
            }
            else if (m.modelType === 'donutFilter') {
                new $n2.atlascine.DonutFilterByGroupTag(options);
                m.created = true;
            }
            else if (m.modelType === 'themeDonutFilter') {
                new $n2.atlascine.ThemeDonutFilterByGroupTag(options);
                m.created = true;
            }
            else if (m.modelType === 'dualFilteredDonutFilter') {
                new $n2.atlascine.DualFilteredDonutFilter(options);
                m.created = true;
            }
        }
    }

    //  for an atlas to configure certain components before modules are displayed
    window.nunaliit_custom.configuration = function (config, callback) {
        globalAtlasDesign = config.atlasDesign;
        config.directory.showService.options.preprocessDocument = function (doc) {
            return doc;
        };

        // Custom service
        if (config.directory.customService) {
            const customService = config.directory.customService;

            // Default table of content
            customService.setOption('defaultNavigationIdentifier', 'navigation.atlascine');

            // Default module
            customService.setOption('defaultModuleIdentifier', 'module.home');

            /* The following disables loading of the right-side display pane unless it's one of the specified modules */
            customService.setOption('moduleDisplayIntroFunction', function (opts_) {
                const opts = $n2.extend({
                    elem: null
                    , config: null
                    , moduleDisplay: null
                }, opts_);
                const $elem = opts.elem;
                const moduleDisplay = opts.moduleDisplay;
                const moduleId = moduleDisplay.getCurrentModuleId();
                if (moduleId === 'module.about' ||
                    moduleId === 'module.tutorial' ||
                    moduleId === 'module.editor' ||
                    moduleId === 'module.home') {
                    moduleDisplay.module.displayIntro({
                        elem: $elem
                        , showService: config.directory.showService
                        , dispatchService: config.directory.dispatchService
                        , onLoaded: function () {
                            moduleDisplay._sendDispatchMessage({ type: 'loadedModuleContent' });
                        }
                    });
                } else {
                    return;
                }
            });
        }

        // Dispatch service
        if (config.directory.dispatchService) {
            globalDispatchService = config.directory.dispatchService;
            const dispatchService = config.directory.dispatchService;

            // Handler called when atlas starts
            dispatchService.register(DH, 'start', function () {
                if (typeof window.slideSwitch === 'function') {
                    window.slideSwitch();
                    setInterval(window.slideSwitch, 10000);
                }
            });

            // Handler called when the module content is loaded
            dispatchService.register(DH, 'loadedModuleContent', function () { });
            dispatchService.register(DH, 'modelCreate', handleModelEvents);
            dispatchService.register(DH, 'utilityCreate', handleUtilityCreate);
            dispatchService.register(DH, 'displayIsTypeAvailable', handleDisplayAvailable);
            dispatchService.register(DH, 'displayRender', handleDisplayRender);
            dispatchService.register(DH, 'widgetIsTypeAvailable', handleWidgetAvailableRequests);
            dispatchService.register(DH, 'widgetDisplay', handleWidgetDisplayRequests);
            dispatchService.register(DH, 'documentListQuery', handleDocumentListQuery);
        }

        callback();
    };

    // Namespace that will contain all the imports
    $n2.atlascine = {};

    $n2.scripts.loadCustomScripts([
        'js/utilities.js'
        , 'js/cinema_selection_redirector.js'
    ]);

    if ($n2.url.getParamValue("module") === "module.stories") {
        $n2.scripts.loadCustomScripts([
            'js/cine_transcript.js'
            , 'js/cine_map_filter.js'
            , 'js/donut_tag_legend.js'
            , 'js/cine_stories_display.js'
            , 'js/cine_time_index_transform.js'
            , 'js/cine_data_2_donut_transform.js'
            , 'js/cinemap_selection_widget.js'
        ]);
    }
    else if ($n2.url.getParamValue("module") === "module.multiStories") {
        $n2.scripts.loadCustomScripts([
            'js/theme_transcript.js'
            , 'js/theme_map_filter.js'
            , 'js/theme_index_transform.js'
            , 'js/theme_donut_tag_legend.js'
            , 'js/cine_multi_stories_display.js'
            , 'js/theme_data_2_donut_transform.js'
            , 'js/cinemap_selection_widget.js'
        ]);
    }
    else if ($n2.url.getParamValue("module") === "module.editor") {
        $n2.scripts.loadCustomScripts([
            'js/editor_selection_widget.js'
            , 'js/OwnLayerDocCreationUtility.js'
            , 'js/AugmentAtlascinePlaceIfGazetteerCreatedUtility.js'
        ]);
    }

})(jQuery, nunaliit2);
