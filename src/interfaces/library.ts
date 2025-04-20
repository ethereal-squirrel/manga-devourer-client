export interface Library {
  id: number;
  name: string;
  path: string;
  series: Series[];
  seriesCount: number;
}

export interface Series {
  id: number;
  fileCount: number;
  files: File[];
  libraryId: number;
  mangaData: any;
  path: string;
  title: string;
}

export interface File {
  id: number;
  chapter: number;
  currentPage: number;
  fileFormat: string;
  fileName: string;
  isRead: boolean;
  path: string;
  seriesId: number;
  totalPages: number;
  volume: number;
}
