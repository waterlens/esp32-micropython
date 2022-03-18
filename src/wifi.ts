type APDetail = [string, string, number, number, number, boolean];
type APInfo = [string];

export class WifiUtil {
  private list: APDetail[];
  constructor() {
    this.list = [];
  }

  getList() {
    return this.list;
  }

  getInfo(): string[] {
    let set = new Set<string>();
    this.list.forEach((item) => set.add(item[0]));
    return Array.from(set);
  }

  clear() {
    this.list = [];
  }

  sortByRSSI() {
    const cmp = (a: APDetail, b: APDetail) => {
      if (a[3] < b[3]) {
        return 1;
      }
      if (a[3] > b[3]) {
        return -1;
      }
      return 0;
    };
    this.list.sort(cmp);
  }

  removeEmpty() {
    this.list = this.list.filter((item) => item[0] !== "");
  }

  removeHidden() {
    this.list = this.list.filter((item) => item[5] === false);
  }

  addFromJSON(json: string) {
    JSON.parse(json).forEach(
      (item: [string, string, number, number, number, boolean]) => {
        this.list.push(item);
      }
    );
  }
}
