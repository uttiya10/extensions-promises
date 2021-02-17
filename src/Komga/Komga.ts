import { Chapter, ChapterDetails, Manga, PagedResults, SearchRequest, Source } from "paperback-extensions-common";
import { components } from "./komgaSchema";

export class Komga extends Source {

    baseUrl: string = "http://192.168.0.9:8080"
    username: string = "test@test.test"
    password: string = "testtest"

    /**
     * Returns a Authorization header value for a given account
     * @param username A given username for a komga account
     * @param password A given password for a komga account
     */
    generateAuthorizationHeader(username: string, password: string): string {
        let headerValue = `Basic ${username}:${password}`
        let buff = Buffer.from(headerValue, 'utf-8')
        return buff.toString('base64')
    }

    async getMangaDetails(mangaId: string): Promise<Manga> {
        const request = createRequestObject({
            url: `${this.baseUrl}/api/v1/series/${mangaId}`,
            method: 'GET',
            headers: {
                'authorization': this.generateAuthorizationHeader(this.username, this.password)
            }
        })

        let data = await this.requestManager.schedule(request, 1)
        let response = data.data as components["schemas"]["PageCollectionDto"]

        return createManga({
            id: mangaId,
            titles: [response.metadata.title],
            image: 
        })
    }


    getChapters(mangaId: string): Promise<Chapter[]> {
        throw new Error("Method not implemented.");
    }
    getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        throw new Error("Method not implemented.");
    }
    searchRequest(query: SearchRequest, metadata: any): Promise<PagedResults> {
        throw new Error("Method not implemented.");
    }

}