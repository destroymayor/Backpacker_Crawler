import cheerio from "cheerio";
import superagent from "superagent";
require("superagent-proxy")(superagent);

import { exportResults, writeFileAsync } from "./src/fs_process";
import { asyncForEach, waitFor } from "./src/delay";

const proxy = `http://182.53.201.175:80`;

//
//
// http://180.183.133.160:8080
// http://185.25.21.50:8080
// http://79.170.192.143:60724
// http://101.109.255.18:59873
// http://31.41.175.84:59860
// http://195.201.23.192:3128
// http://118.97.36.18:8080
// http://212.232.6.15:53281
// http://107.0.141.230:3128
// http://94.244.191.219:3128
// http://171.5.29.77:8080
// http://213.160.150.239:47596
// http://212.72.138.155:43757
// http://118.175.93.98:55175
// http://5.104.23.74:58795
// http://95.77.16.197:34669
// http://188.214.232.2:8080
// http://41.89.162.8:32122
// http://94.74.140.8:8080

const getWebSiteContent = async (url, forumCode, page, totalCode, outputPath) => {
  const pageLinkList = [];
  const getWebSitePageUrl = async () => {
    try {
      const RequestHTML = await superagent.get(url).timeout(5000);
      const $ = cheerio.load(RequestHTML.text);
      const forum_num = `#threadbits_forum_${forumCode}`;

      $(`${forum_num} > tr > td:nth-child(2) > div > a`).each((index, value) => {
        pageLinkList.push({ link: `https://www.backpackers.com.tw/forum/${$(value).attr("href")}`, page });
      });
    } catch (error) {
      console.log("TCL: getWebSitePageUrl -> error", error);
    }
  };

  const RequestDataAsync = async (url, page) => {
    const crawlerResultList = [];
    try {
      const RequestHTML = await superagent.get(url).timeout(5000);
      const $ = cheerio.load(RequestHTML.text);

      const table_td = `div:nth-child(1) > div:nth-child(2) > table > tbody > tr:nth-child(2) > td`;

      const title = $(`${table_td} > div:nth-child(2) > strong`).text();
      const content = $(`${table_td} > .vb_postbit`).text();

      await crawlerResultList.push({
        article_title: title.replace(new RegExp("\n", "g"), ""),
        content: content.replace(new RegExp("\n", "g"), ""),
        page: `第${page}頁`
      });

      await exportResults(crawlerResultList, outputPath);
    } catch (error) {
      console.log("TCL: RequestDataAsync -> error", error);
    }
  };

  Promise.resolve()
    .then(() => getWebSitePageUrl())
    .then(() =>
      Promise.all(
        pageLinkList.map(async item => {
          await RequestDataAsync(item.link, item.page);
          return item.page;
        })
      )
    )
    .then(page => console.log("第", page[0], "頁 total =", totalCode, "Time:", new Date().toTimeString().split(" ")[0]))
    .catch(err => console.log("Promise.resolve", err));
};

const startCrawler = async (forum, startPage, totalCode) => {
  const outputPath = `./output/${forum}_${Math.floor(Math.random() * (99 - 10 + 1)) + 10}.json`;
  //const outputPath = `./output/${forum}.json`;
  writeFileAsync(outputPath, []);

  const list = [];
  for (let i = startPage; i <= totalCode; i++) list.push(i);

  await asyncForEach(list, async num => {
    await getWebSiteContent(
      `https://www.backpackers.com.tw/forum/forumdisplay.php?f=${forum}&order=desc&page=${num}`,
      forum,
      num,
      totalCode,
      outputPath
    );
    await waitFor(Math.floor(Math.random() * (540000 - 300000 + 1) + 300000));
  });
};

startCrawler(116, 37, 369);
