(function ($, $n2) {

    if (typeof (window.nunaliit_custom) === 'undefined') {
        window.nunaliit_custom = {};
    }

    var DH = 'atlascine';

    function handleUtilityCreate(m) {
        var options, key, value;
        if ('utilityCreate' === m.type) {
            if ('cinemaSelectionRedirector' === m.utilityType) {
                options = {};

                if (m.utilityOptions) {
                    for (key in m.utilityOptions) {
                        value = m.utilityOptions[key];
                        options[key] = value;
                    }
                }

                if (m && m.config) {
                    if (m.config.directory) {
                        options.dispatchService = m.config.directory.dispatchService;
                        options.eventService = m.config.directory.eventService;
                        options.customService = m.config.directory.customService;
                        options.showService = m.config.directory.showService;
                        options.atlasDb = m.config.atlasDb;
                    }
                }

                new $n2.atlascine.CinemaSelectionRedirector(options);
                m.created = true;
            } else if ('getSelectionUtility' === m.utilityType) {
                options = {};

                if (m.utilityOptions) {
                    for (key in m.utilityOptions) {
                        value = m.utilityOptions[key];
                        options[key] = value;
                    }
                }

                if (m && m.config) {
                    if (m.config.directory) {
                        options.dispatchService = m.config.directory.dispatchService;
                        options.eventService = m.config.directory.eventService;
                        options.customService = m.config.directory.customService;
                        options.showService = m.config.directory.showService;
                        options.atlasDb = m.config.atlasDb;
                    }
                }

                new $n2.atlascine.GetSelectionUtility(options);
                m.created = true;
            } else if ('tagUtility' === m.utilityType) {
                options = {};

                if (m.utilityOptions) {
                    for (key in m.utilityOptions) {
                        value = m.utilityOptions[key];
                        options[key] = value;
                    }
                }

                if (m && m.config) {
                    if (m.config.directory) {
                        options.dispatchService = m.config.directory.dispatchService;
                        options.eventService = m.config.directory.eventService;
                        options.customService = m.config.directory.customService;
                        options.showService = m.config.directory.showService;
                        options.atlasDb = m.config.atlasDb;
                    }
                }

                new $n2.atlascine.TagUtility(options);
                m.created = true;
            } else if ('colorUtility' === m.utilityType) {
                options = {};

                if (m.utilityOptions) {
                    for (key in m.utilityOptions) {
                        value = m.utilityOptions[key];
                        options[key] = value;
                    }
                }

                if (m && m.config) {
                    if (m.config.directory) {
                        options.dispatchService = m.config.directory.dispatchService;
                        options.eventService = m.config.directory.eventService;
                        options.customService = m.config.directory.customService;
                        options.showService = m.config.directory.showService;
                        options.atlasDb = m.config.atlasDb;
                    }
                }

                new $n2.atlascine.ColorUtility(options);
                m.created = true;
            } else if ('placeUtility' === m.utilityType) {
                options = {};

                if (m.utilityOptions) {
                    for (key in m.utilityOptions) {
                        value = m.utilityOptions[key];
                        options[key] = value;
                    }
                }

                if (m && m.config) {
                    if (m.config.directory) {
                        options.dispatchService = m.config.directory.dispatchService;
                        options.eventService = m.config.directory.eventService;
                        options.customService = m.config.directory.customService;
                        options.showService = m.config.directory.showService;
                        options.atlasDb = m.config.atlasDb;
                    }
                }

                new $n2.atlascine.PlaceUtility(options);
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
        var options, key, displayControl;
        if (m.displayType === 'cineMultiStoriesDisplay') {
            options = {};
            if (m.displayOptions) {
                for (key in m.displayOptions) {
                    options[key] = m.displayOptions[key];
                }
            }

            options.displayPanelName = m.displayId;

            if (m && m.config && m.config.directory) {
                options.dispatchService = m.config.directory.dispatchService;
                options.showService = m.config.directory.showService;
            }

            displayControl = new $n2.atlascine.CineMultiStoriesDisplay(options);
            m.onSuccess(displayControl);
        } else if (m.displayType === 'cineStoriesDisplay') {
            options = {};
            if (m.displayOptions) {
                for (key in m.displayOptions) {
                    options[key] = m.displayOptions[key];
                }
            }

            options.displayPanelName = m.displayId;

            if (m && m.config && m.config.directory) {
                options.dispatchService = m.config.directory.dispatchService;
                options.showService = m.config.directory.showService;
            }

            displayControl = new $n2.atlascine.CineStoriesDisplay(options);
            m.onSuccess(displayControl);
        }
    }

    function handleWidgetAvailableRequests(m) {
        if (m.widgetType === 'donutGroupTagLegendWidget') {
            m.isAvailable = true;
        } else if (m.widgetType === 'themeDonutGroupTagLegendWidget') {
            m.isAvailable = true;
        } else if (m.widgetType === 'themeTranscript') {
            m.isAvailable = true;
        }
    }

    function handleWidgetDisplayRequests(m) {
        var options, widgetOptions, containerId, config, key, value;
        if (m.widgetType === 'donutGroupTagLegendWidget') {
            widgetOptions = m.widgetOptions;
            containerId = m.containerId;
            config = m.config;

            options = {};

            if (widgetOptions) {
                for (key in widgetOptions) {
                    value = widgetOptions[key];
                    options[key] = value;
                }
            }

            options.containerId = containerId;

            if (config && config.directory) {
                options.dispatchService = config.directory.dispatchService;
                options.showService = config.directory.showService;
            }

            new $n2.atlascine.DonutGroupTagLegendWidget(options);
        } else if (m.widgetType === 'themeDonutGroupTagLegendWidget') {
            widgetOptions = m.widgetOptions;
            containerId = m.containerId;
            config = m.config;

            options = {};

            if (widgetOptions) {
                for (key in widgetOptions) {
                    value = widgetOptions[key];
                    options[key] = value;
                }
            }

            options.containerId = containerId;

            if (config && config.directory) {
                options.dispatchService = config.directory.dispatchService;
                options.showService = config.directory.showService;
            }

            new $n2.atlascine.ThemeDonutGroupTagLegendWidget(options);
        } else if (m.widgetType === 'themeTranscript') {
            var widgetOptions = m.widgetOptions;
            var containerClass = widgetOptions.containerClass;
            var config = m.config;
            var options = {};

            if (widgetOptions) {
                for (var key in widgetOptions) {
                    var value = widgetOptions[key];
                    options[key] = value;
                }
            }

            options.containerClass = containerClass;

            if (config && config.directory) {
                options.dispatchService = config.directory.dispatchService;
                options.attachmentService = config.directory.attachmentService;
            }

            new $n2.atlascine.ThemeTranscript(options);
        }
    }

    function handleModelEvents(m) {
        var options, key, value;
        if ('modelCreate' === m.type) {
            if ('cineTimeIndexTransform' === m.modelType) {
                options = {};

                if (m.modelOptions) {
                    for (key in m.modelOptions) {
                        value = m.modelOptions[key];
                        options[key] = value;
                    }
                }

                options.modelId = m.modelId;

                if (m && m.config) {
                    if (m.config.directory) {
                        options.dispatchService = m.config.directory.dispatchService;
                    }
                }

                new $n2.atlascine.CineTimeIndexTransform(options);
                m.created = true;
            } else if ('cineData2DonutTransform' === m.modelType) {
                options = {};
                if (m.modelOptions) {
                    for (key in m.modelOptions) {
                        value = m.modelOptions[key];
                        options[key] = value;
                    }
                }

                options.modelId = m.modelId;

                if (m && m.config) {
                    if (m.config.directory) {
                        options.dispatchService = m.config.directory.dispatchService;
                    }
                }

                new $n2.atlascine.CineData2DonutTransform(options);
                m.created = true;
            } else if ('themeIndexTransform' === m.modelType) {
                options = {};
                if (m.modelOptions) {
                    for (key in m.modelOptions) {
                        value = m.modelOptions[key];
                        options[key] = value;
                    }
                }

                options.modelId = m.modelId;

                if (m && m.config) {
                    if (m.config.directory) {
                        options.dispatchService = m.config.directory.dispatchService;
                    }
                }

                new $n2.atlascine.ThemeIndexTransform(options);
                m.created = true;
            } else if ('themeData2DonutTransform' === m.modelType) {
                options = {};
                if (m.modelOptions) {
                    for (key in m.modelOptions) {
                        value = m.modelOptions[key];
                        options[key] = value;
                    }
                }

                options.modelId = m.modelId;

                if (m && m.config) {
                    if (m.config.directory) {
                        options.dispatchService = m.config.directory.dispatchService;
                    }
                }

                new $n2.atlascine.ThemeData2DonutTransform(options);
                m.created = true;
            } else if ('cineMapFilter' === m.modelType) {
                options = {};
                if (m.modelOptions) {
                    for (key in m.modelOptions) {
                        value = m.modelOptions[key];
                        options[key] = value;
                    }
                }

                options.modelId = m.modelId;

                if (m && m.config) {
                    if (m.config.directory) {
                        options.dispatchService = m.config.directory.dispatchService;
                    }
                }

                new $n2.atlascine.CineMapFilter(options);
                m.created = true;
            } else if ('themeMapFilter' === m.modelType) {
                options = {};
                if (m.modelOptions) {
                    for (key in m.modelOptions) {
                        value = m.modelOptions[key];
                        options[key] = value;
                    }
                }

                options.modelId = m.modelId;

                if (m && m.config) {
                    if (m.config.directory) {
                        options.dispatchService = m.config.directory.dispatchService;
                    }
                }

                new $n2.atlascine.ThemeMapFilter(options);
                m.created = true;
            } else if ('donutFilter' === m.modelType) {
                options = {};
                if (m.modelOptions) {
                    for (key in m.modelOptions) {
                        value = m.modelOptions[key];
                        options[key] = value;
                    }
                }

                options.modelId = m.modelId;

                if (m && m.config) {
                    if (m.config.directory) {
                        options.dispatchService = m.config.directory.dispatchService;
                    }
                }

                new $n2.atlascine.DonutFilterByGroupTag(options);
                m.created = true;
            } else if ('themeDonutFilter' === m.modelType) {
                options = {};
                if (m.modelOptions) {
                    for (key in m.modelOptions) {
                        value = m.modelOptions[key];
                        options[key] = value;
                    }
                }

                options.modelId = m.modelId;

                if (m && m.config) {
                    if (m.config.directory) {
                        options.dispatchService = m.config.directory.dispatchService;
                    }
                }

                new $n2.atlascine.ThemeDonutFilterByGroupTag(options);
                m.created = true;
            }
        }
    }

    //	for an atlas to configure certain components before modules are displayed
    window.nunaliit_custom.configuration = function (config, callback) {

        config.directory.showService.options.preprocessDocument = function (doc) {
            return doc;
        };

        // Custom service
        if (config.directory.customService) {
            var customService = config.directory.customService;

            // Default table of content
            customService.setOption('defaultNavigationIdentifier', 'navigation.atlascine');

            // Default module
            customService.setOption('defaultModuleIdentifier', 'module.home');

            customService.setOption('moduleDisplayIntroFunction', function (opts_) {
                var opts = $n2.extend({
                    elem: null
                    , config: null
                    , moduleDisplay: null
                }, opts_);
                var $elem = opts.elem;
                var moduleDisplay = opts.moduleDisplay;
                var moduleId = moduleDisplay.getCurrentModuleId();
                if (moduleId === 'module.about' ||
                    moduleId === 'module.tutorial' ||
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
            var dispatchService = config.directory.dispatchService;

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
        }

        callback();
    };

    // Namespace that will contain all the imports
    $n2.atlascine = {};

    $n2.scripts.loadCustomScripts([
        'js/utilities.js',
        'js/theme_transcript.js',
        'js/cine_map_filter.js',
        'js/donut_tag_legend.js',
        'js/theme_map_filter.js',
        'js/cine_stories_display.js',
        'js/theme_index_transform.js',
        'js/theme_donut_tag_legend.js',
        'js/cine_time_index_transform.js',
        'js/cine_multi_stories_display.js',
        'js/cine_data_2_donut_transform.js',
        'js/cinema_selection_redirector.js',
        'js/theme_data_2_donut_transform.js',
    ]);

})(jQuery, nunaliit2);
