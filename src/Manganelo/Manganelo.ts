import {
  Source,
  Manga,
  MangaStatus,
  Chapter,
  ChapterDetails,
  HomeSection,
  MangaTile,
  SearchRequest,
  LanguageCode,
  TagSection,
  PagedResults,
  SourceInfo,
  MangaUpdates,
  RequestHeaders,
  TagType
} from "paperback-extensions-common"

const MN_DOMAIN = 'https://manganelo.com'

export const ManganeloInfo: SourceInfo = {
  version: '2.0.1',
  name: 'Manganelo',
  icon: 'icon.png',
  author: 'Daniel Kovalevich',
  authorWebsite: 'https://github.com/DanielKovalevich',
  description: 'Extension that pulls manga from Manganelo, includes Advanced Search and Updated manga fetching',
  hentaiSource: false,
  websiteBaseURL: MN_DOMAIN,
  sourceTags: [
    {
      text: "Notifications",
      type: TagType.GREEN
    }
  ]
}

export class Manganelo extends Source {
  getMangaShareUrl(mangaId: string): string | null { return `${MN_DOMAIN}/manga/${mangaId}` }

  async getMangaDetails(mangaId: string): Promise<Manga> {

    let request = createRequestObject({
      url: `${MN_DOMAIN}/manga/`,
      method: 'GET',
      param: mangaId
    })

    let data = await this.requestManager.schedule(request, 1)

    let manga: Manga[] = []
    let $ = this.cheerio.load(data.data)
    let panel = $('.panel-story-info')
    let title = $('.img-loading', panel).attr('title') ?? ''
    let image = $('.img-loading', panel).attr('src') ?? ''
    let table = $('.variations-tableInfo', panel)
    let author = ''
    let artist = ''
    let rating = 0
    let status = MangaStatus.ONGOING
    let titles = [title]
    let follows = 0
    let views = 0
    let lastUpdate = ''
    let hentai = false

    let tagSections: TagSection[] = [createTagSection({ id: '0', label: 'genres', tags: [] })]

    for (let row of $('tr', table).toArray()) {
      if ($(row).find('.info-alternative').length > 0) {
        let alts = $('h2', table).text().split(/,|;/)
        for (let alt of alts) {
          titles.push(alt.trim())
        }
      }
      else if ($(row).find('.info-author').length > 0) {
        let autart = $('.table-value', row).find('a').toArray()
        author = $(autart[0]).text()
        if (autart.length > 1) {
          artist = $(autart[1]).text()
        }
      }
      else if ($(row).find('.info-status').length > 0) {
        status = $('.table-value', row).text() == 'Ongoing' ? MangaStatus.ONGOING : MangaStatus.COMPLETED
      }
      else if ($(row).find('.info-genres').length > 0) {
        let elems = $('.table-value', row).find('a').toArray()
        for (let elem of elems) {
          let text = $(elem).text()
          let id = $(elem).attr('href')?.split('/').pop()?.split('-').pop() ?? ''
          if (text.toLowerCase().includes('smut')) {
            hentai = true
          }
          tagSections[0].tags.push(createTag({ id: id, label: text }))
        }
      }
    }

    table = $('.story-info-right-extent', panel)
    for (let row of $('p', table).toArray()) {
      if ($(row).find('.info-time').length > 0) {
        let time = new Date($('.stre-value', row).text().replace(/(-*(AM)*(PM)*)/g, ''))
        lastUpdate = time.toDateString()
      }
      else if ($(row).find('.info-view').length > 0) {
        views = Number($('.stre-value', row).text().replace(/,/g, ''))
      }
    }

    rating = Number($('[property=v\\:average]', table).text())
    follows = Number($('[property=v\\:votes]', table).text())
    let summary = $('.panel-story-info-description', panel).text()

    return createManga({
      id: mangaId,
      titles: titles,
      image: image,
      rating: Number(rating),
      status: status,
      artist: artist,
      author: author,
      tags: tagSections,
      views: views,
      follows: follows,
      lastUpdate: lastUpdate,
      desc: summary,
      hentai: hentai
    })
  }

  async getChapters(mangaId: string): Promise<Chapter[]> {

    let request = createRequestObject({
      url: `${MN_DOMAIN}/manga/`,
      method: 'GET',
      param: mangaId
    })

    let data = await this.requestManager.schedule(request, 1)

    let $ = this.cheerio.load(data.data)
    let allChapters = $('.row-content-chapter', '.body-site')
    let chapters: Chapter[] = []
    for (let chapter of $('li', allChapters).toArray()) {
      let id: string = $('a', chapter).attr('href')?.split('/').pop() ?? ''
      let name: string = $('a', chapter).text() ?? ''
      let chNum: number = Number((/Chapter ([0-9]\d*(\.\d+)?)/g.exec(name) ?? [])[1] ?? '')
      let time: Date = new Date($('.chapter-time', chapter).attr('title') ?? '')
      chapters.push(createChapter({
        id: id,
        mangaId: mangaId,
        name: name,
        langCode: LanguageCode.ENGLISH,
        chapNum: chNum,
        time: time
      }))
    }
    return chapters
  }

  async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {

    let request = createRequestObject({
      url: `${MN_DOMAIN}/chapter/`,
      method: "GET",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        Cookie: 'content_lazyload=off'
      },
      param: `${mangaId}/${chapterId}`
    })

    let data = await this.requestManager.schedule(request, 1)

    let $ = this.cheerio.load(data.data)
    let pages: string[] = []
    for (let item of $('img', '.container-chapter-reader').toArray()) {
      pages.push($(item).attr('src') ?? '')
    }

    let chapterDetails = createChapterDetails({
      id: chapterId,
      mangaId: mangaId,
      pages: pages,
      longStrip: false
    })

    return chapterDetails
  }

  async filterUpdatedManga(mangaUpdatesFoundCallback: (updates: MangaUpdates) => void, time: Date, ids: string[]): Promise<void> {

    let loadNextPage: boolean = true
    let currPageNum: number = 1

    while (loadNextPage) {

      let request = createRequestObject({
        url: `${MN_DOMAIN}/genre-all/`,
        method: 'GET',
        headers: {
          "content-type": "application/x-www-form-urlencoded"
        },
        param: String(currPageNum)
      })

      let data = await this.requestManager.schedule(request, 1)

      let $ = this.cheerio.load(data.data)

      let foundIds: string[] = []

      let passedReferenceTime = false
      let panel = $('.panel-content-genres')
      for (let item of $('.content-genres-item', panel).toArray()) {
        let id = ($('a', item).first().attr('href') ?? '').split('/').pop() ?? ''
        let mangaTime = new Date($('.genres-item-time').first().text())
        // site has a quirk where if the manga what updated in the last hour
        // it will put the update time as tomorrow
        if (mangaTime > new Date(Date.now())) {
          mangaTime = new Date(Date.now() - 60000)
        }

        passedReferenceTime = mangaTime <= time
        if (!passedReferenceTime) {
          if (ids.includes(id)) {
            foundIds.push(id)
          }
        }
        else break
      }

      if (!passedReferenceTime) {
        currPageNum++
      }

      else {
        loadNextPage = false
      }

      mangaUpdatesFoundCallback(createMangaUpdates({
        ids: foundIds
      }))
    }
  }

  private constructGetViewMoreRequest(key: string, page: number) {
    let metadata = { page: page }
    let param = ''
    switch (key) {
      case 'latest_updates': {
        param = `/genre-all/${metadata.page}`
        break
      }
      case 'new_manga': {
        param = `/genre-all/${metadata.page}?type=newest`
        break
      }
      default: return undefined
    }

    return createRequestObject({
      url: `${MN_DOMAIN}`,
      method: 'GET',
      param: param,
      metadata: {
        key, page
      }
    })
  }

  async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {

    // Give Paperback a skeleton of what these home sections should look like to pre-render them
    let section1 = createHomeSection({ id: 'top_week', title: 'TOP OF THE WEEK' })
    let section2 = createHomeSection({ id: 'latest_updates', title: 'LATEST UPDATES', view_more: true })
    let section3 = createHomeSection({ id: 'new_manga', title: 'NEW MANGA', view_more: true })
    sectionCallback(section1)
    sectionCallback(section2)
    sectionCallback(section3)

    // Fill the homsections with data
    let request = createRequestObject({
      url: MN_DOMAIN,
      method: 'GET'
    })

    let data = await this.requestManager.schedule(request, 1)

    let $ = this.cheerio.load(data.data)
    let topManga: MangaTile[] = []
    let updateManga: MangaTile[] = []
    let newManga: MangaTile[] = []

    for (let item of $('.item', '.owl-carousel').toArray()) {
      let id = $('a', item).first().attr('href')?.split('/').pop() ?? ''
      let image = $('img', item).attr('src') ?? ''
      topManga.push(createMangaTile({
        id: id,
        image: image,
        title: createIconText({ text: $('a', item).first().text() }),
        subtitleText: createIconText({ text: $('[rel=nofollow]', item).text() })
      }))
    }

    for (let item of $('.content-homepage-item', '.panel-content-homepage').toArray()) {
      let id = $('a', item).first().attr('href')?.split('/').pop() ?? ''
      let image = $('img', item).attr('src') ?? ''
      let itemRight = $('.content-homepage-item-right', item)
      let latestUpdate = $('.item-chapter', itemRight).first()
      updateManga.push(createMangaTile({
        id: id,
        image: image,
        title: createIconText({ text: $('a', itemRight).first().text() }),
        subtitleText: createIconText({ text: $('.item-author', itemRight).text() }),
        primaryText: createIconText({ text: $('.genres-item-rate', item).text(), icon: 'star.fill' }),
        secondaryText: createIconText({ text: $('i', latestUpdate).text(), icon: 'clock.fill' })
      }))
    }

    for (let item of $('a', '.panel-newest-content').toArray()) {
      let id = $(item).attr('href')?.split('/').pop() ?? ''
      let image = $('img', item).attr('src') ?? ''
      let title = $('img', item).attr('alt') ?? ''
      newManga.push(createMangaTile({
        id: id,
        image: image,
        title: createIconText({ text: title })
      }))
    }

    section1.items = topManga
    section2.items = updateManga
    section3.items = newManga

    // Perform the callbacks again now that the home page sections are filled with data
    sectionCallback(section1)
    sectionCallback(section2)
    sectionCallback(section3)
  }

  async searchRequest(query: SearchRequest, metadata: any): Promise<PagedResults> {

    // Format the search query into a proper request
    let genres = (query.includeGenre ?? []).concat(query.includeDemographic ?? []).join('_')
    let excluded = (query.excludeGenre ?? []).concat(query.excludeDemographic ?? []).join('_')
    let status = ""
    switch (query.status) {
      case 0: status = 'completed'; break
      case 1: status = 'ongoing'; break
      default: status = ''
    }

    let keyword = (query.title ?? '').replace(/ /g, '_')
    if (query.author)
      keyword += (query.author ?? '').replace(/ /g, '_')
    let search: string = `s=all&keyw=${keyword}`
    search += `&g_i=${genres}&g_e=${excluded}`
    if (status) {
      search += `&sts=${status}`
    }

    let request = createRequestObject({
      url: `${MN_DOMAIN}/advanced_search?`,
      method: 'GET',
      metadata: metadata,
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      param: `${search}${metadata.page ? '&page=' + metadata.page : ''}` // If we have page information in our metadata, search for the provided page
    })

    let data = await this.requestManager.schedule(request, 1)

    let $ = this.cheerio.load(data.data)
    let panel = $('.panel-content-genres')
    let manga: MangaTile[] = []
    for (let item of $('.content-genres-item', panel).toArray()) {
      let id = $('.genres-item-name', item).attr('href')?.split('/').pop() ?? ''
      let title = $('.genres-item-name', item).text()
      let subTitle = $('.genres-item-chap', item).text()
      let image = $('.img-loading', item).attr('src') ?? ''
      let rating = $('.genres-item-rate', item).text()
      let updated = $('.genres-item-time', item).text()

      manga.push(createMangaTile({
        id: id,
        image: image,
        title: createIconText({ text: title }),
        subtitleText: createIconText({ text: subTitle }),
        primaryText: createIconText({ text: rating, icon: 'star.fill' }),
        secondaryText: createIconText({ text: updated, icon: 'clock.fill' })
      }))
    }

    metadata.page = metadata.page ? metadata.page++ : 2 // If the page value is null, we want page two. Otherwise, increment the page.

    return createPagedResults({
      results: manga,
      metadata: metadata
    })
  }


  async getTags(): Promise<TagSection[] | null> {

    let request = createRequestObject({
      url: `${MN_DOMAIN}/advanced_search?`,
      method: 'GET',
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      }
    })

    let data = await this.requestManager.schedule(request, 1)

    let $ = this.cheerio.load(data.data)
    let panel = $('.advanced-search-tool-genres-list')
    let genres = createTagSection({
      id: 'genre',
      label: 'Genre',
      tags: []
    })
    for (let item of $('span', panel).toArray()) {
      let id = $(item).attr('data-i') ?? ''
      let label = $(item).text()
      genres.tags.push(createTag({ id: id, label: label }))
    }
    return [genres]
  }

  async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults | null> {

    let param = ''
    switch (homepageSectionId) {
      case 'latest_updates': {
        param = `/genre-all/${metadata.page ? metadata.page : 1}`
        break
      }
      case 'new_manga': {
        param = `/genre-all/${metadata.page ? metadata.page : 1}?type=newest`
        break
      }
      default: return Promise.resolve(null)
    }

    let request = createRequestObject({
      url: `${MN_DOMAIN}`,
      method: 'GET',
      param: param,
      metadata: metadata
    })

    let data = await this.requestManager.schedule(request, 1)

    let $ = this.cheerio.load(data.data)
    let manga: MangaTile[] = []
    if (homepageSectionId == 'latest_updates' || homepageSectionId == 'new_manga') {
      let panel = $('.panel-content-genres')
      for (let item of $('.content-genres-item', panel).toArray()) {
        let id = ($('a', item).first().attr('href') ?? '').split('/').pop() ?? ''
        let image = $('img', item).attr('src') ?? ''
        let title = $('.genres-item-name', item).text()
        let subtitle = $('.genres-item-chap', item).text()
        let time = new Date($('.genres-item-time').first().text())
        if (time > new Date(Date.now())) {
          time = new Date(Date.now() - 60000)
        }
        let rating = $('.genres-item-rate', item).text()
        manga.push(createMangaTile({
          id: id,
          image: image,
          title: createIconText({ text: title }),
          subtitleText: createIconText({ text: subtitle }),
          primaryText: createIconText({ text: rating, icon: 'star.fill' }),
          secondaryText: createIconText({ text: time.toDateString(), icon: 'clock.fill' })
        }))
      }
    }
    else return Promise.resolve(null)

    if (!this.isLastPage($)) {
      metadata.page ? metadata.page++ : metadata.page = 2
    }
    else {
      metadata = undefined  // There are no more pages to continue on to, do not provide page metadata
    }

    return createPagedResults({
      results: manga,
      metadata: metadata
    })
  }

  globalRequestHeaders(): RequestHeaders {
    return {
      referer: MN_DOMAIN
    }
  }

  private isLastPage($: CheerioStatic): boolean {
    let current = $('.page-select').text()
    let total = $('.page-last').text()

    if (current) {
      total = (/(\d+)/g.exec(total) ?? [''])[0]
      return (+total) === (+current)
    }

    return true
  }
}