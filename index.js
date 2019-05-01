import cheerio from "cheerio";
import superagent from "superagent";
require("superagent-proxy")(superagent);

import { exportResults, writeFileAsync } from "./src/fs_process";
import { asyncForEach, waitFor } from "./src/delay";

const proxy_url = "219.85.183.27:8080";
const proxy = `http://${proxy_url}`;

const getWebSiteContent = async (url, forumCode, page, outputPath) => {
  const pageLinkList = [];
  const getWebSitePageUrl = async () => {
    try {
      const RequestHTML = await superagent.get(url).timeout(200000);
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
      const RequestHTML = await superagent.get(url).timeout(200000);
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
    .then(page => console.log("第", page[0], "頁 Time:", new Date().toTimeString().split(" ")[0]))
    .catch(err => console.log(err));
};

const startCrawler = async (forum, totalCode) => {
  const outputPath = `./output/${forum}_${Math.floor(Math.random() * (99 - 10 + 1)) + 10}.json`;
  //const outputPath = `./output/${forum}.json`;
  writeFileAsync(outputPath, []);

  const list = [];
  for (let i = 1; i <= totalCode; i++) list.push(i);

  await asyncForEach(list, async num => {
    await getWebSiteContent(
      `https://www.backpackers.com.tw/forum/forumdisplay.php?f=${forum}&order=desc&page=${num}`,
      forum,
      num,
      outputPath
    );
    await waitFor(300000);
  });
};

startCrawler(75, 239);
