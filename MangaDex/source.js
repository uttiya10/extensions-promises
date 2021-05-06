(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Sources = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
"use strict";
/**
 * Request objects hold information for a particular source (see sources for example)
 * This allows us to to use a generic api to make the calls against any source
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Source = void 0;
class Source {
    constructor(cheerio) {
        // <-----------        OPTIONAL METHODS        -----------> //
        /**
         * Manages the ratelimits and the number of requests that can be done per second
         * This is also used to fetch pages when a chapter is downloading
         */
        this.requestManager = createRequestManager({
            requestsPerSecond: 2.5,
            requestTimeout: 5000
        });
        this.cheerio = cheerio;
    }
    /**
     * (OPTIONAL METHOD) This function is called when ANY request is made by the Paperback Application out to the internet.
     * By modifying the parameter and returning it, the user can inject any additional headers, cookies, or anything else
     * a source may need to load correctly.
     * The most common use of this function is to add headers to image requests, since you cannot directly access these requests through
     * the source implementation itself.
     *
     * NOTE: This does **NOT** influence any requests defined in the source implementation. This function will only influence requests
     * which happen behind the scenes and are not defined in your source.
     */
    globalRequestHeaders() { return {}; }
    globalRequestCookies() { return []; }
    /**
     * A stateful source may require user input.
     * By supplying this value to the Source, the app will render your form to the user
     * in the application settings.
     */
    getAppStatefulForm() { return createUserForm({ formElements: [] }); }
    /**
     * When the Advanced Search is rendered to the user, this skeleton defines what
     * fields which will show up to the user, and returned back to the source
     * when the request is made.
     */
    getAdvancedSearchForm() { return createUserForm({ formElements: [] }); }
    /**
     * (OPTIONAL METHOD) Given a manga ID, return a URL which Safari can open in a browser to display.
     * @param mangaId
     */
    getMangaShareUrl(mangaId) { return null; }
    /**
     * If a source is secured by Cloudflare, this method should be filled out.
     * By returning a request to the website, this source will attempt to create a session
     * so that the source can load correctly.
     * Usually the {@link Request} url can simply be the base URL to the source.
     */
    getCloudflareBypassRequest() { return null; }
    /**
     * (OPTIONAL METHOD) A function which communicates with a given source, and returns a list of all possible tags which the source supports.
     * These tags are generic and depend on the source. They could be genres such as 'Isekai, Action, Drama', or they can be
     * listings such as 'Completed, Ongoing'
     * These tags must be tags which can be used in the {@link searchRequest} function to augment the searching capability of the application
     */
    getTags() { return Promise.resolve(null); }
    /**
     * (OPTIONAL METHOD) A function which should scan through the latest updates section of a website, and report back with a list of IDs which have been
     * updated BEFORE the supplied timeframe.
     * This function may have to scan through multiple pages in order to discover the full list of updated manga.
     * Because of this, each batch of IDs should be returned with the mangaUpdatesFoundCallback. The IDs which have been reported for
     * one page, should not be reported again on another page, unless the relevent ID has been detected again. You do not want to persist
     * this internal list between {@link Request} calls
     * @param mangaUpdatesFoundCallback A callback which is used to report a list of manga IDs back to the API
     * @param time This function should find all manga which has been updated between the current time, and this parameter's reported time.
     *             After this time has been passed, the system should stop parsing and return
     */
    filterUpdatedManga(mangaUpdatesFoundCallback, time, ids) { return Promise.resolve(); }
    /**
     * (OPTIONAL METHOD) A function which should readonly allf the available homepage sections for a given source, and return a {@link HomeSection} object.
     * The sectionCallback is to be used for each given section on the website. This may include a 'Latest Updates' section, or a 'Hot Manga' section.
     * It is recommended that before anything else in your source, you first use this sectionCallback and send it {@link HomeSection} objects
     * which are blank, and have not had any requests done on them just yet. This way, you provide the App with the sections to render on screen,
     * which then will be populated with each additional sectionCallback method called. This is optional, but recommended.
     * @param sectionCallback A callback which is run for each independant HomeSection.
     */
    getHomePageSections(sectionCallback) { return Promise.resolve(); }
    /**
     * (OPTIONAL METHOD) This function will take a given homepageSectionId and metadata value, and with this information, should return
     * all of the manga tiles supplied for the given state of parameters. Most commonly, the metadata value will contain some sort of page information,
     * and this request will target the given page. (Incrementing the page in the response so that the next call will return relevent data)
     * @param homepageSectionId The given ID to the homepage defined in {@link getHomePageSections} which this method is to readonly moreata about
     * @param metadata This is a metadata parameter which is filled our in the {@link getHomePageSections}'s return
     * function. Afterwards, if the metadata value returned in the {@link PagedResults} has been modified, the modified version
     * will be supplied to this function instead of the origional {@link getHomePageSections}'s version.
     * This is useful for keeping track of which page a user is on, pagnating to other pages as ViewMore is called multiple times.
     */
    getViewMoreItems(homepageSectionId, metadata) { return Promise.resolve(null); }
    /**
     * (OPTIONAL METHOD) This function is to return the entire library of a manga website, page by page.
     * If there is an additional page which needs to be called, the {@link PagedResults} value should have it's metadata filled out
     * with information needed to continue pulling information from this website.
     * Note that if the metadata value of {@link PagedResults} is undefined, this method will not continue to run when the user
     * attempts to readonly morenformation
     * @param metadata Identifying information as to what the source needs to call in order to readonly theext batch of data
     * of the directory. Usually this is a page counter.
     */
    getWebsiteMangaDirectory(metadata) { return Promise.resolve(null); }
    // <-----------        PROTECTED METHODS        -----------> //
    // Many sites use '[x] time ago' - Figured it would be good to handle these cases in general
    convertTime(timeAgo) {
        var _a;
        let time;
        let trimmed = Number(((_a = /\d*/.exec(timeAgo)) !== null && _a !== void 0 ? _a : [])[0]);
        trimmed = (trimmed == 0 && timeAgo.includes('a')) ? 1 : trimmed;
        if (timeAgo.includes('minutes')) {
            time = new Date(Date.now() - trimmed * 60000);
        }
        else if (timeAgo.includes('hours')) {
            time = new Date(Date.now() - trimmed * 3600000);
        }
        else if (timeAgo.includes('days')) {
            time = new Date(Date.now() - trimmed * 86400000);
        }
        else if (timeAgo.includes('year') || timeAgo.includes('years')) {
            time = new Date(Date.now() - trimmed * 31556952000);
        }
        else {
            time = new Date(Date.now());
        }
        return time;
    }
    /**
     * When a function requires a POST body, it always should be defined as a JsonObject
     * and then passed through this function to ensure that it's encoded properly.
     * @param obj
     */
    urlEncodeObject(obj) {
        let ret = {};
        for (const entry of Object.entries(obj)) {
            ret[encodeURIComponent(entry[0])] = encodeURIComponent(entry[1]);
        }
        return ret;
    }
}
exports.Source = Source;

},{}],3:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./Source"), exports);

},{"./Source":2}],4:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./base"), exports);
__exportStar(require("./models"), exports);
__exportStar(require("./APIWrapper"), exports);

},{"./APIWrapper":1,"./base":3,"./models":25}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],6:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],7:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],8:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LanguageCode = void 0;
var LanguageCode;
(function (LanguageCode) {
    LanguageCode["UNKNOWN"] = "_unknown";
    LanguageCode["BENGALI"] = "bd";
    LanguageCode["BULGARIAN"] = "bg";
    LanguageCode["BRAZILIAN"] = "br";
    LanguageCode["CHINEESE"] = "cn";
    LanguageCode["CZECH"] = "cz";
    LanguageCode["GERMAN"] = "de";
    LanguageCode["DANISH"] = "dk";
    LanguageCode["ENGLISH"] = "gb";
    LanguageCode["SPANISH"] = "es";
    LanguageCode["FINNISH"] = "fi";
    LanguageCode["FRENCH"] = "fr";
    LanguageCode["WELSH"] = "gb";
    LanguageCode["GREEK"] = "gr";
    LanguageCode["CHINEESE_HONGKONG"] = "hk";
    LanguageCode["HUNGARIAN"] = "hu";
    LanguageCode["INDONESIAN"] = "id";
    LanguageCode["ISRELI"] = "il";
    LanguageCode["INDIAN"] = "in";
    LanguageCode["IRAN"] = "ir";
    LanguageCode["ITALIAN"] = "it";
    LanguageCode["JAPANESE"] = "jp";
    LanguageCode["KOREAN"] = "kr";
    LanguageCode["LITHUANIAN"] = "lt";
    LanguageCode["MONGOLIAN"] = "mn";
    LanguageCode["MEXIAN"] = "mx";
    LanguageCode["MALAY"] = "my";
    LanguageCode["DUTCH"] = "nl";
    LanguageCode["NORWEGIAN"] = "no";
    LanguageCode["PHILIPPINE"] = "ph";
    LanguageCode["POLISH"] = "pl";
    LanguageCode["PORTUGUESE"] = "pt";
    LanguageCode["ROMANIAN"] = "ro";
    LanguageCode["RUSSIAN"] = "ru";
    LanguageCode["SANSKRIT"] = "sa";
    LanguageCode["SAMI"] = "si";
    LanguageCode["THAI"] = "th";
    LanguageCode["TURKISH"] = "tr";
    LanguageCode["UKRAINIAN"] = "ua";
    LanguageCode["VIETNAMESE"] = "vn";
})(LanguageCode = exports.LanguageCode || (exports.LanguageCode = {}));

},{}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MangaStatus = void 0;
var MangaStatus;
(function (MangaStatus) {
    MangaStatus[MangaStatus["ONGOING"] = 1] = "ONGOING";
    MangaStatus[MangaStatus["COMPLETED"] = 0] = "COMPLETED";
})(MangaStatus = exports.MangaStatus || (exports.MangaStatus = {}));

},{}],11:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],12:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],13:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],14:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],15:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],16:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],17:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],18:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],19:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],20:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],21:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TagType = void 0;
/**
 * An enumerator which {@link SourceTags} uses to define the color of the tag rendered on the website.
 * Five types are available: blue, green, grey, yellow and red, the default one is blue.
 * Common colors are red for (Broken), yellow for (+18), grey for (Country-Proof)
 */
var TagType;
(function (TagType) {
    TagType["BLUE"] = "default";
    TagType["GREEN"] = "success";
    TagType["GREY"] = "info";
    TagType["YELLOW"] = "warning";
    TagType["RED"] = "danger";
})(TagType = exports.TagType || (exports.TagType = {}));

},{}],22:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],23:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],24:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],25:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./Chapter"), exports);
__exportStar(require("./ChapterDetails"), exports);
__exportStar(require("./HomeSection"), exports);
__exportStar(require("./Manga"), exports);
__exportStar(require("./MangaTile"), exports);
__exportStar(require("./RequestObject"), exports);
__exportStar(require("./SearchRequest"), exports);
__exportStar(require("./TagSection"), exports);
__exportStar(require("./SourceTag"), exports);
__exportStar(require("./Languages"), exports);
__exportStar(require("./Constants"), exports);
__exportStar(require("./MangaUpdate"), exports);
__exportStar(require("./PagedResults"), exports);
__exportStar(require("./ResponseObject"), exports);
__exportStar(require("./RequestManager"), exports);
__exportStar(require("./RequestHeaders"), exports);
__exportStar(require("./SourceInfo"), exports);
__exportStar(require("./TrackObject"), exports);
__exportStar(require("./OAuth"), exports);
__exportStar(require("./UserForm"), exports);

},{"./Chapter":5,"./ChapterDetails":6,"./Constants":7,"./HomeSection":8,"./Languages":9,"./Manga":10,"./MangaTile":11,"./MangaUpdate":12,"./OAuth":13,"./PagedResults":14,"./RequestHeaders":15,"./RequestManager":16,"./RequestObject":17,"./ResponseObject":18,"./SearchRequest":19,"./SourceInfo":20,"./SourceTag":21,"./TagSection":22,"./TrackObject":23,"./UserForm":24}],26:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MangaDex = exports.MangaDexInfo = void 0;
/* eslint-disable camelcase, @typescript-eslint/explicit-module-boundary-types, radix, unicorn/filename-case */
const paperback_extensions_common_1 = require("paperback-extensions-common");
const MANGADEX_DOMAIN = 'https://mangadex.org';
const MANGADEX_API = 'https://api.mangadex.org';
exports.MangaDexInfo = {
    author: 'nar1n',
    description: 'Extension that pulls manga from MangaDex"',
    icon: 'icon.png',
    name: 'MangaDex',
    version: '1.0.0',
    authorWebsite: 'https://github.com/nar1n',
    websiteBaseURL: MANGADEX_DOMAIN,
    hentaiSource: false,
    language: paperback_extensions_common_1.LanguageCode.ENGLISH,
    sourceTags: [
        {
            text: 'Recommended',
            type: paperback_extensions_common_1.TagType.BLUE,
        },
        {
            text: "Notifications",
            type: paperback_extensions_common_1.TagType.GREEN
        }
    ],
};
class MangaDex extends paperback_extensions_common_1.Source {
    constructor() {
        super(...arguments);
        this.languageMapping = {
            'en': 'gb',
            'pt-br': 'pt',
            'ru': 'ru',
            'fr': 'fr',
            'es-la': 'es',
            'pl': 'pl',
            'tr': 'tr',
            'it': 'it',
            'es': 'es',
            'id': 'id',
            'vi': 'vn',
            'hu': 'hu',
            'zh': 'cn',
            // 'ar': '', // Arabic
            'de': 'de',
            'zh-hk': 'hk',
            // 'ca': '', // Catalan
            'th': 'th',
            'bg': 'bg',
            // 'fa': '', // Faroese
            'uk': 'ua',
            'mn': 'mn',
            // 'he': '', // Hebrew
            'ro': 'ro',
            'ms': 'my',
            // 'tl': '', // Tagalog
            'ja': 'jp',
            'ko': 'kr',
            // 'hi': '', // Hindi
            // 'my': '', // Malaysian
            'cs': 'cz',
            'pt': 'pt',
            'nl': 'nl',
            // 'sv': '', // Swedish
            // 'bn': '', // Bengali
            'no': 'no',
            'lt': 'lt',
            // 'sr': '', // Serbian
            'da': 'dk',
            'fi': 'fi',
        };
        this.requestManager = createRequestManager({
            requestsPerSecond: 4,
            requestTimeout: 15000,
        });
    }
    getMangaShareUrl(mangaId) {
        return `${MANGADEX_DOMAIN}/manga/${mangaId}`;
    }
    getMangaUUIDs(numericIds, type = 'manga') {
        return __awaiter(this, void 0, void 0, function* () {
            const length = numericIds.length;
            let offset = 0;
            const UUIDsDict = {};
            while (true) {
                const request = createRequestObject({
                    url: `${MANGADEX_API}/legacy/mapping`,
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    data: {
                        'type': 'manga',
                        'ids': numericIds.slice(offset, offset + 500).map(x => Number(x))
                    }
                });
                offset += 500;
                const response = yield this.requestManager.schedule(request, 1);
                const json = typeof response.data === "string" ? JSON.parse(response.data) : response.data;
                for (const mapping of json) {
                    UUIDsDict[mapping.data.attributes.legacyId] = mapping.data.attributes.newId;
                }
                if (offset >= length) {
                    break;
                }
            }
            return UUIDsDict;
        });
    }
    getAuthors(authorIds) {
        return __awaiter(this, void 0, void 0, function* () {
            let url = `${MANGADEX_API}/author/?limit=100`;
            let index = 0;
            for (const author of authorIds) {
                url += `&ids[${index}]=${author}`;
                index += 1;
            }
            const request = createRequestObject({
                url,
                method: 'GET',
            });
            const response = yield this.requestManager.schedule(request, 1);
            const json = typeof response.data === "string" ? JSON.parse(response.data) : response.data;
            let authorsDict = {};
            for (const entry of json.results) {
                authorsDict[entry.data.id] = entry.data.attributes.name;
            }
            return authorsDict;
        });
    }
    getGroups(groupIds) {
        return __awaiter(this, void 0, void 0, function* () {
            const length = groupIds.length;
            let offset = 0;
            let groupsDict = {};
            while (true) {
                let url = `${MANGADEX_API}/group/?limit=100&offset=${offset}`;
                let index = 0;
                for (const group of groupIds.slice(offset, offset + 100)) {
                    url += `&ids[${index}]=${group}`;
                    index += 1;
                }
                offset += 100;
                const request = createRequestObject({
                    url,
                    method: 'GET',
                });
                const response = yield this.requestManager.schedule(request, 1);
                const json = typeof response.data === "string" ? JSON.parse(response.data) : response.data;
                for (const entry of json.results) {
                    groupsDict[entry.data.id] = entry.data.attributes.name;
                }
                if (offset >= length) {
                    break;
                }
            }
            return groupsDict;
        });
    }
    getMDHNodeURL(chapterId) {
        return __awaiter(this, void 0, void 0, function* () {
            const request = createRequestObject({
                url: `${MANGADEX_API}/at-home/server/${chapterId}`,
                method: 'GET',
            });
            const response = yield this.requestManager.schedule(request, 1);
            const json = typeof response.data === "string" ? JSON.parse(response.data) : response.data;
            return json.baseUrl;
        });
    }
    getImageLink(links, extraResults = false) {
        return __awaiter(this, void 0, void 0, function* () {
            /*
                Return a cover url determined using one of the providers passed in links
                extraResults: boolean, if the function should use extra requests to get a cover url
                
                Existing providers
                  'mu' => MangaUpdates
                  'mal' => MyAnimeList
                  'nu' => NovelUpdates
                  'raw' => Raw
                  'engtl' => Official Eng
                  'cdj' => CDJapan
                  'amz' => Amazon.co.jp
                  'ebj' => eBookJapan
                  'bw' => Bookwalker
                  'al' => AniList
                  'kt' => Kitsu
                  'ap' => Anime-Planet
                  'dj' => Doujinshi.org
                
                Implemented providers: Kitsu, MyAnimeList, AniList, MangaUpdates, Anime-Planet
             */
            if (links === null) {
                // Default cover
                return 'https://i.imgur.com/6TrIues.jpg';
            }
            // Kitsu
            if (links.kt !== undefined) {
                // Available sizes: tiny, small, medium, large
                return `https://media.kitsu.io/manga/poster_images/${links.kt}/small.jpg`;
            }
            if (extraResults) {
                // MyAnimeList
                if (links.mal !== undefined) {
                    // We use Jikan API to get the image link
                    // Doc: https://jikan.docs.apiary.io/#reference/0/manga
                    // Available sizes: small, large
                    const request = createRequestObject({
                        url: `https://api.jikan.moe/v3/manga/${links.mal}/pictures`,
                        method: 'GET',
                    });
                    const response = yield this.requestManager.schedule(request, 1);
                    const data = typeof response.data === "string" ? JSON.parse(response.data) : response.data;
                    if (data.pictures !== undefined) {
                        if (data.pictures.length > 0) {
                            return data.pictures[0].small;
                        }
                    }
                }
                // AniList
                if (links.al !== undefined) {
                    // Available sizes: medium, large, extraLarge
                    // Doc: https://anilist.gitbook.io/anilist-apiv2-docs/overview/graphql/getting-started
                    const query = "query ($id: Int) { Media (id: $id, type: MANGA) {coverImage {large}}}";
                    var variables = {
                        id: links.al
                    };
                    const request = createRequestObject({
                        url: 'https://graphql.anilist.co',
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                        },
                        data: JSON.stringify({
                            query: query,
                            variables: variables
                        })
                    });
                    const response = yield this.requestManager.schedule(request, 1);
                    const data = typeof response.data === "string" ? JSON.parse(response.data) : response.data;
                    // data has the format {"data": {"Media": {"coverImage": {"large": "URL"}}}}
                    return data.data.Media.coverImage.large;
                }
                // MangaUpdates
                if (links.mu !== undefined) {
                    // MangaUpdates does not have an API
                    const request = createRequestObject({
                        url: `https://www.mangaupdates.com/series.html?id=${links.mu}`,
                        method: 'GET',
                    });
                    const response = yield this.requestManager.schedule(request, 1);
                    const $ = this.cheerio.load(response.data);
                    const url = $('.sContent .img-fluid').attr('src');
                    if (url !== undefined) {
                        return url;
                    }
                }
                // Anime-Planet
                if (links.ap !== undefined) {
                    // Anime-Planet does not have an API
                    const request = createRequestObject({
                        url: `https://www.anime-planet.com/manga/${links.ap}`,
                        method: 'GET',
                    });
                    const response = yield this.requestManager.schedule(request, 1);
                    const $ = this.cheerio.load(response.data);
                    const path = $('.screenshots').attr('src');
                    if (path !== undefined) {
                        return `https://www.anime-planet.com${path}`;
                    }
                }
            }
            // Default cover
            return 'https://i.imgur.com/6TrIues.jpg';
        });
    }
    getMangaDetails(mangaId) {
        return __awaiter(this, void 0, void 0, function* () {
            let newMangaId;
            if (!mangaId.includes('-')) {
                // Legacy Id
                const UUIDsDict = yield this.getMangaUUIDs([mangaId]);
                newMangaId = UUIDsDict[mangaId];
            }
            else {
                newMangaId = mangaId;
            }
            const request = createRequestObject({
                url: `${MANGADEX_API}/manga/${newMangaId}`,
                method: 'GET',
            });
            const response = yield this.requestManager.schedule(request, 1);
            const json = typeof response.data === "string" ? JSON.parse(response.data) : response.data;
            const mangaDetails = json.data.attributes;
            const titles = [mangaDetails.title[Object.keys(mangaDetails.title)[0]]].concat(mangaDetails.altTitles.map((x) => this.decodeHTMLEntity(x[Object.keys(x)[0]])));
            const desc = this.decodeHTMLEntity(mangaDetails.description.en).replace(/\[\/{0,1}[bus]\]/g, ''); // Get rid of BBcode tags
            let status = paperback_extensions_common_1.MangaStatus.COMPLETED;
            if (mangaDetails.status == 'ongoing') {
                status = paperback_extensions_common_1.MangaStatus.ONGOING;
            }
            const tags = [];
            for (const tag of mangaDetails.tags) {
                const tagName = tag.attributes.name;
                tags.push(createTag({
                    id: tag.id,
                    label: Object.keys(tagName).map(keys => tagName[keys])[0]
                }));
            }
            let author = json.relationships.filter((x) => x.type == 'author').map((x) => x.id);
            let artist = json.relationships.filter((x) => x.type == 'artist').map((x) => x.id);
            const authors = author.concat(artist);
            if (authors.length != 0) {
                const authorsDict = yield this.getAuthors(authors);
                author = author.map((x) => this.decodeHTMLEntity(authorsDict[x])).join(', ');
                artist = artist.map((x) => this.decodeHTMLEntity(authorsDict[x])).join(', ');
            }
            return createManga({
                id: mangaId,
                titles,
                image: yield this.getImageLink(mangaDetails.links, true),
                author,
                artist,
                desc,
                rating: 5,
                status,
                tags: [createTagSection({
                        id: "tags",
                        label: "Tags",
                        tags: tags
                    })]
            });
        });
    }
    getChapters(mangaId) {
        return __awaiter(this, void 0, void 0, function* () {
            let newMangaId;
            if (!mangaId.includes('-')) {
                // Legacy Id
                const UUIDsDict = yield this.getMangaUUIDs([mangaId]);
                newMangaId = UUIDsDict[mangaId];
            }
            else {
                newMangaId = mangaId;
            }
            let chaptersUnparsed = [];
            let offset = 0;
            let groupIds = [];
            while (true) {
                const request = createRequestObject({
                    url: `${MANGADEX_API}/manga/${newMangaId}/feed?limit=500&offset=${offset}`,
                    method: 'GET',
                });
                const response = yield this.requestManager.schedule(request, 1);
                const json = typeof response.data === "string" ? JSON.parse(response.data) : response.data;
                offset += 500;
                for (const chapter of json.results) {
                    const chapterId = chapter.data.id;
                    const chapterDetails = chapter.data.attributes;
                    const name = this.decodeHTMLEntity(chapterDetails.title);
                    const chapNum = Number(chapterDetails === null || chapterDetails === void 0 ? void 0 : chapterDetails.chapter);
                    const volume = Number(chapterDetails === null || chapterDetails === void 0 ? void 0 : chapterDetails.volume);
                    let langCode = chapterDetails.translatedLanguage;
                    if (Object.keys(this.languageMapping).includes(langCode)) {
                        langCode = this.languageMapping[chapterDetails.translatedLanguage];
                    }
                    else {
                        langCode = '_unkown';
                    }
                    const time = new Date(chapterDetails.publishAt);
                    let groups = chapter.relationships.filter((x) => x.type == 'scanlation_group').map((x) => x.id);
                    for (const groupId of groups) {
                        if (!groupIds.includes(groupId)) {
                            groupIds.push(groupId);
                        }
                    }
                    chaptersUnparsed.push({
                        id: chapterId,
                        mangaId: mangaId,
                        name,
                        chapNum,
                        volume,
                        langCode,
                        groups,
                        time
                    });
                }
                if (json.total <= offset) {
                    break;
                }
            }
            const groupDict = yield this.getGroups(groupIds);
            const chapters = chaptersUnparsed.map((x) => {
                x.group = x.groups.map((x) => this.decodeHTMLEntity(groupDict[x])).join(', ') + '';
                delete x.groups;
                return createChapter(x);
            });
            return chapters;
        });
    }
    getChapterDetails(mangaId, chapterId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!chapterId.includes('-')) {
                // Numeric ID
                throw new Error('OLD ID: PLEASE REFRESH AND CLEAR ORPHANED CHAPTERS');
            }
            const serverUrl = yield this.getMDHNodeURL(chapterId);
            const request = createRequestObject({
                url: `${MANGADEX_API}/chapter/${chapterId}`,
                method: 'GET',
            });
            const response = yield this.requestManager.schedule(request, 1);
            const json = typeof response.data === "string" ? JSON.parse(response.data) : response.data;
            const chapterDetails = json.data.attributes;
            const pages = chapterDetails.data.map((x) => `${serverUrl}/data/${chapterDetails.hash}/${x}`);
            return createChapterDetails({
                id: chapterId,
                mangaId: mangaId,
                pages,
                longStrip: false
            });
        });
    }
    searchRequest(query, metadata) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            let offset = (_a = metadata === null || metadata === void 0 ? void 0 : metadata.offset) !== null && _a !== void 0 ? _a : 0;
            let results = [];
            const request = createRequestObject({
                url: `${MANGADEX_API}/manga?title=${encodeURIComponent((_b = query.title) !== null && _b !== void 0 ? _b : '')}&limit=100&offset=${offset}`,
                method: 'GET',
            });
            const response = yield this.requestManager.schedule(request, 1);
            if (response.status != 200) {
                return createPagedResults({ results });
            }
            const json = typeof response.data === "string" ? JSON.parse(response.data) : response.data;
            for (const manga of json.results) {
                const mangaId = manga.data.id;
                const mangaDetails = manga.data.attributes;
                const title = this.decodeHTMLEntity(mangaDetails.title[Object.keys(mangaDetails.title)[0]]);
                results.push(createMangaTile({
                    id: mangaId,
                    title: createIconText({ text: title }),
                    image: yield this.getImageLink(mangaDetails.links)
                }));
            }
            return createPagedResults({
                results,
                metadata: { offset: offset + 100 }
            });
        });
    }
    getHomePageSections(sectionCallback) {
        return __awaiter(this, void 0, void 0, function* () {
            const sections = [
                {
                    request: createRequestObject({
                        url: `${MANGADEX_API}/manga?limit=20`,
                        method: 'GET',
                    }),
                    section: createHomeSection({
                        id: 'recently_updated',
                        title: 'RECENTLY UPDATED TITLES',
                        view_more: true,
                    }),
                },
                {
                    request: createRequestObject({
                        url: `${MANGADEX_API}/manga?limit=20&publicationDemographic[0]=shounen`,
                        method: 'GET',
                    }),
                    section: createHomeSection({
                        id: 'shounen',
                        title: 'UPDATED SHOUNEN TITLES',
                        view_more: true,
                    }),
                },
                {
                    request: createRequestObject({
                        url: `${MANGADEX_API}/manga?limit=20&includedTags[0]=391b0423-d847-456f-aff0-8b0cfc03066b`,
                        method: 'GET',
                    }),
                    section: createHomeSection({
                        id: 'action',
                        title: 'UPDATED ACTION TITLES',
                        view_more: true,
                    }),
                }
            ];
            const promises = [];
            for (const section of sections) {
                // Let the app load empty sections
                sectionCallback(section.section);
                // Get the section data
                promises.push(this.requestManager.schedule(section.request, 1).then((response) => __awaiter(this, void 0, void 0, function* () {
                    const json = typeof response.data === "string" ? JSON.parse(response.data) : response.data;
                    let results = [];
                    for (const manga of json.results) {
                        const mangaId = manga.data.id;
                        const mangaDetails = manga.data.attributes;
                        const title = this.decodeHTMLEntity(mangaDetails.title[Object.keys(mangaDetails.title)[0]]);
                        results.push(createMangaTile({
                            id: mangaId,
                            title: createIconText({ text: title }),
                            image: yield this.getImageLink(mangaDetails.links, true)
                        }));
                    }
                    section.section.items = results;
                    sectionCallback(section.section);
                })));
            }
            // Make sure the function completes
            yield Promise.all(promises);
        });
    }
    getViewMoreItems(homepageSectionId, metadata) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            let offset = (_a = metadata === null || metadata === void 0 ? void 0 : metadata.offset) !== null && _a !== void 0 ? _a : 0;
            let collectedIds = (_b = metadata === null || metadata === void 0 ? void 0 : metadata.collectedIds) !== null && _b !== void 0 ? _b : [];
            let results = [];
            let url = '';
            switch (homepageSectionId) {
                case 'recently_updated': {
                    url = `${MANGADEX_API}/manga?limit=100&offset=${offset}`;
                    break;
                }
                case 'shounen': {
                    url = `${MANGADEX_API}/manga?limit=100&publicationDemographic[0]=shounen&offset=${offset}`;
                    break;
                }
                case 'action': {
                    url = `${MANGADEX_API}/manga?limit=100&includedTags[0]=391b0423-d847-456f-aff0-8b0cfc03066b&offset=${offset}`;
                    break;
                }
            }
            const request = createRequestObject({
                url,
                method: 'GET',
            });
            const response = yield this.requestManager.schedule(request, 1);
            const json = typeof response.data === "string" ? JSON.parse(response.data) : response.data;
            for (const manga of json.results) {
                const mangaId = manga.data.id;
                const mangaDetails = manga.data.attributes;
                const title = this.decodeHTMLEntity(mangaDetails.title[Object.keys(mangaDetails.title)[0]]);
                if (!collectedIds.includes(mangaId)) {
                    results.push(createMangaTile({
                        id: mangaId,
                        title: createIconText({ text: title }),
                        image: yield this.getImageLink(mangaDetails.links, true)
                    }));
                    collectedIds.push(mangaId);
                }
            }
            return createPagedResults({
                results,
                metadata: { offset: offset + 100, collectedIds }
            });
        });
    }
    filterUpdatedManga(mangaUpdatesFoundCallback, time, ids) {
        return __awaiter(this, void 0, void 0, function* () {
            let legacyIds = ids.filter(x => !x.includes('-'));
            let conversionDict = {};
            if (legacyIds.length != 0) {
                conversionDict = yield this.getMangaUUIDs(legacyIds);
                for (const key of Object.keys(conversionDict)) {
                    conversionDict[conversionDict[key]] = key;
                }
            }
            let offset = 0;
            let loadNextPage = true;
            let updatedManga = [];
            while (loadNextPage) {
                const updatedAt = time.toISOString().substr(0, time.toISOString().length - 5); // They support a weirdly truncated version of an ISO timestamp. A magic number of '5' seems to be always valid
                const request = createRequestObject({
                    url: `${MANGADEX_API}/manga?limit=100&offset=${offset}&updatedAtSince=${updatedAt}`,
                    method: 'GET',
                });
                const response = yield this.requestManager.schedule(request, 1);
                // If we have no content, there are no updates available
                if (response.status == 204) {
                    return;
                }
                const json = typeof response.data === "string" ? JSON.parse(response.data) : response.data;
                for (const manga of json.results) {
                    const mangaId = manga.data.id;
                    const mangaTime = new Date(manga.data.attributes.updatedAt);
                    if (mangaTime <= time) {
                        loadNextPage = false;
                    }
                    else if (ids.includes(mangaId)) {
                        updatedManga.push(mangaId);
                    }
                    else if (ids.includes(conversionDict[mangaId])) {
                        updatedManga.push(conversionDict[mangaId]);
                    }
                }
                if (loadNextPage) {
                    offset = offset + 100;
                }
            }
            if (updatedManga.length > 0) {
                mangaUpdatesFoundCallback(createMangaUpdates({
                    ids: updatedManga
                }));
            }
        });
    }
    decodeHTMLEntity(str) {
        return str.replace(/&#(\d+);/g, function (match, dec) {
            return String.fromCharCode(dec);
        })
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '\"');
    }
}
exports.MangaDex = MangaDex;

},{"paperback-extensions-common":4}]},{},[26])(26)
});
