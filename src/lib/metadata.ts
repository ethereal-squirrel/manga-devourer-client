interface MangaData {
  metadata_id?: number;
  metadata_provider?: string;
  title?: string;
  titles?: string[];
  synopsis?: string;
  background?: string;
  coverImage?: string;
  authors?: string[];
  demographics?: string[];
  genres?: string[];
  themes?: string[];
  score?: number;
  url?: string;
  total_volumes?: number;
  total_chapters?: number;
  published_from?: string;
  published_to?: string;
  status?: string;
}

const getJikanUrl = (query: string, by: "id" | "q") => {
  return `https://api.jikan.moe/v4/manga${
    by === "id" ? `/${query}` : `?q=${query}`
  }`;
};

export const getJikanMetadata = async (query: string, by: "id" | "q") => {
  const url = getJikanUrl(query, by);

  const response = await fetch(url);
  const mangaResp = await response.json();

  let selectedManga: any = null;

  if (by === "q") {
    if (mangaResp.data.length === 0) {
      throw new Error("no results found");
    }

    selectedManga = mangaResp.data[0];
  } else {
    if (!mangaResp.data || !mangaResp.data.title) {
      throw new Error("no results found");
    }

    selectedManga = mangaResp.data;
  }

  const metadata: MangaData = {
    metadata_id: selectedManga.mal_id,
    metadata_provider: "jikan",
    title: selectedManga.title ? selectedManga.title : null,
    titles: selectedManga.titles ? selectedManga.titles : [],
    synopsis: selectedManga.synopsis ? selectedManga.synopsis : null,
    background: selectedManga.background ? selectedManga.background : null,
    coverImage:
      selectedManga.images && selectedManga.images.jpg
        ? selectedManga.images.jpg.image_url
        : null,
    authors: selectedManga.authors
      ? selectedManga.authors.map((author: any) => author.name)
      : [],
    demographics: selectedManga.demographics
      ? selectedManga.demographics.map((demographic: any) => demographic.name)
      : [],
    genres: selectedManga.genres
      ? selectedManga.genres.map((genre: any) => genre.name)
      : [],
    themes: selectedManga.themes
      ? selectedManga.themes.map((theme: any) => theme.name)
      : [],
    score: selectedManga.score ? selectedManga.score : null,
    url: selectedManga.url ? selectedManga.url : null,
    total_volumes: selectedManga.volumes ? selectedManga.volumes : null,
    total_chapters: selectedManga.chapters ? selectedManga.chapters : null,
    published_from: selectedManga.published.from
      ? selectedManga.published.from
      : null,
    published_to: selectedManga.published.to
      ? selectedManga.published.to
      : null,
    status: selectedManga.status ? selectedManga.status : null,
  };

  return metadata;
};
