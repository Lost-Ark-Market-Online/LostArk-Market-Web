
export class CommonService {
  constructor() {

  }
  getImageUrl(filename: string) {
    return `/assets/item_icons/${filename}`;
  }
}