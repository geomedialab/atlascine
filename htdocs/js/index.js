var _loc = function (str, args) { return $n2.loc(str, 'nunaliit_index.js', args); };
var DH = 'index.js';
var atlasDoc;

function loadAtlasDocument(config) {
    config.directory.dispatchService.register(DH, 'documentContent', function (m) {
        // Wait for the atlas document to load before continuing initialization.
        if (m.docId === 'atlas' && !atlasDoc) {
            $n2.log("Received atlas document");
            atlasDoc = m.doc;
            main_init(config, atlasDoc);
        }
    });

    $n2.log("Requesting atlas document for default module. Waiting on response...");
    // Fetch the atlas document first, then the callback will run init.
    config.directory.dispatchService.send(DH, {
        type: 'requestDocument',
        docId: 'atlas'
    });
}

function main_init(config, atlasDoc) {
    // Get module name from URL parameters
    var moduleName = $n2.url.getParamValue('module', null);
    if (!moduleName) {
        if (config.directory && config.directory.customService) {
            moduleName = config.directory.customService.getOption('defaultModuleIdentifier');
        };
    };

    if (!moduleName) {
        if (atlasDoc && atlasDoc.nunaliit_atlas && atlasDoc.nunaliit_atlas.default_module) {
            moduleName = atlasDoc.nunaliit_atlas.default_module;
        }
    }

    $n2.log('module: ' + moduleName);

    // Get module bounding box
    var bounds = null;
    var bboxParam = $n2.url.getParamValue('bbox', null);
    if (bboxParam) {
        var bbox = bboxParam.split(',');
        bounds = [];
        for (var i = 0, e = bbox.length; i < e; ++i) {
            bounds.push(1 * bbox[i]);
        };
        $n2.log('bbox: ' + bboxParam);
    };

    // Get srs (applies to bounding box)
    var srsName = 'EPSG:4326';
    var srsParam = $n2.url.getParamValue('srs', null);
    if (srsParam) {
        srsName = '' + srsParam;
        $n2.log('srs: ' + srsName);
    };

    // Get navigation document
    var navigationName = $n2.url.getParamValue('navigation', null);
    if (!navigationName) {
        if (config.directory && config.directory.customService) {
            navigationName = config.directory.customService.getOption('defaultNavigationIdentifier');
        };
    };

    // Try to get it from the atlas document
    if (!navigationName) {
        navigationName = 'atlas';
    }

    // Compute search panel name
    var searchPanelName = null;
    var $searchPanel = $('.nunaliit_search_input');
    if ($searchPanel.length > 0) {
        searchPanelName = $searchPanel.attr('id');
        if (!searchPanelName) {
            searchPanelName = $n2.getUniqueId();
            $searchPanel.attr('id', searchPanelName);
        };
    };

    let isMobileWidth = window.matchMedia("only screen and (max-width: 759px)").matches;
    let isMobileHeight = window.matchMedia("only screen and (max-height: 499px)").matches;

    if (isMobileWidth || isMobileHeight) {
        new nunaliit2.mdc.MDCDialog({
            dialogTitle: _loc("global.resolution.warning.dialog.title"),
            dialogHtmlContent: `${_loc("global.resolution.warning.dialog.textContent")}`,
            closeBtn: true
        });
    }

    new $n2.couchModule.ModuleDisplay({
        moduleName: moduleName
        , config: config
        , titleName: 'title'
        , moduleTitleName: 'module_title'
        , loginPanels: $('#login1,#login2')
        , contentName: 'content'
        , navigationName: 'navigation'
        , navigationDoc: navigationName
        , languageSwitcherName: 'language_switcher'
        , helpButtonName: 'help_button'
        , searchPanelName: searchPanelName
        , onSuccess: function (moduleDisplay) {
            config.moduleDisplay = moduleDisplay;
            config.start();
            if (bounds) {
                config.directory.dispatchService.send('index.js', {
                    type: 'mapSetInitialExtent'
                    , extent: bounds
                    , srsName: srsName
                    , reset: true
                });
            }
            document.title = "Atlascine";
            prepareThemeToggle("theme_toggler")
        }
        , onError: function (err) { alert('Unable to display module(' + moduleName + '): ' + err); }
    });
};

function prepareThemeToggle(selector) {
    const NUNALIIT_COOKIE_NAME = "nunaliit-atlascine-theme";
    const cfg = [
        {
            name: "css.theme.legacy", files: [
            ]
        }
        , {
            name: "css.theme.light", files: [
                , "css/atlascine.css"
                , "css/light-mode.css"
            ]
        }
        , {
            name: "css.theme.dark", files: [
                , "css/atlascine.css"
                , "css/dark-mode.css"
            ]
        }
    ]
    const themeToggler = document.getElementById(selector);
    if (themeToggler === null) {
        $n2.logError(`Unable to create the theme toggler (Unable to find element with id: ${selector})`);
        return;
    }
    let themeCookie = getThemeCookie();
    if (themeCookie === null) themeCookie = "css.theme.legacy";
    const setExistingTheme = cfg.find(theme => theme.name === themeCookie);
    if (setExistingTheme !== undefined) {
        updateLinkElements(setExistingTheme.files);
    }
    $(themeToggler)
        .attr("href", "#")
        .click(() => {
            const dialog = new $n2.mdc.MDCDialog({
                dialogTitle: _loc("css.dialog.theme_selector.title")
                , closeBtn: true
            });
            const themeSelect = new $n2.mdc.MDCFormField({
                parentElem: $(`#${dialog.getContentId()}`)
            });
            const themeSelectId = themeSelect.getId();
            cfg.forEach(theme => {
                themeCookie = getThemeCookie();
                const isChecked = (themeCookie !== null && themeCookie === theme.name);
                const radio = new $n2.mdc.MDCRadio({
                    parentElem: $(`#${themeSelectId}`),
                    radioChecked: isChecked,
                    radioLabel: _loc(theme.name),
                    radioName: "themeSelect",
                    onRadioClick: function() {
                        const id = this.getAttribute("id");
                        $(`#${id}`).attr("checked", "checked");
                        setThemeCookie(theme.name);
                        updateLinkElements(theme.files);
                    }
                });
                const radioInput = $(`#${radio.getInputId()}`);
                radioInput.attr("n2-atlascine-theme", theme.name);
            });
        });
    
    function getThemeCookie() {
        return $n2.cookie.getCookie(NUNALIIT_COOKIE_NAME);
    }

    function setThemeCookie(cookieValue) {
        const oneYearLater = new Date();
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        $n2.cookie.setCookie({
            name: NUNALIIT_COOKIE_NAME
            , value: cookieValue
            , end: oneYearLater
            , path: "/"
        });
    }

    function updateLinkElements(paths) {
        const cssElement = document.getElementById("customStylesheetContainer");
        if (cssElement === null) {
            $n2.logError("Cannot find custom stylesheet container element, unable to switch themes")
            return;
        }
        cssElement.innerHTML = "";
        paths.forEach(path => {
            const link = document.createElement("link");
            link.setAttribute("rel", "stylesheet");
            link.setAttribute("type", "text/css");
            link.setAttribute("href", path);
            cssElement.append(link);
        });
    }
}

jQuery().ready(function () {
    nunaliitConfigure({
        configuredFunction: loadAtlasDocument
    });
});
