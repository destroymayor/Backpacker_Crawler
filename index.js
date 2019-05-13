import cheerio from "cheerio";
import superagent from "superagent";

import { exportResults, writeFileAsync } from "./src/fs_process";
import { asyncForEach, waitFor } from "./src/delay";

const headerConfig = {
  "Content-Type": "text/plain",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.131 Safari/537.36"
};

const getWebSiteContent = async (url, forumCode, page, totalCode, outputPath) => {
  const pageLinkList = [];
  const getWebSitePageUrl = async () => {
    try {
      const RequestHTML = await superagent
        .get(url)
        .set(headerConfig)
        .timeout(5000);
      const $ = cheerio.load(RequestHTML.text);
      const forum_num = `#threadbits_forum_${forumCode}`;

      $(`${forum_num} > tr > td:nth-child(2) > div > a`).each((index, value) => {
        pageLinkList.push({ link: `https://www.backpackers.com.tw/forum/${$(value).attr("href")}`, page });
      });

      return pageLinkList;
    } catch (error) {
      console.log("TCL: getWebSitePageUrl -> error", error);
    }
  };

  const RequestDataAsync = async (url, page) => {
    const crawlerResultList = [];
    try {
      const RequestHTML = await superagent
        .get(url)
        .set(headerConfig)
        .timeout(5000);
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
    .then(() => {
      Promise.all(
        pageLinkList.map(async item => {
          await RequestDataAsync(item.link, item.page);
          return item.page;
        })
      );
    })
    .then(page => console.log("第", page, "頁 total =", totalCode, "Time:", new Date().toTimeString().split(" ")[0]))
    .catch(err => console.log("Promise.resolve", err));
};

const startCrawler = async (forum, startPage, totalCode) => {
  const outputPath = `./output/${forum}_${Math.floor(Math.random() * (99 - 10 + 1)) + 10}.json`;
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

startCrawler(116, 51, 369);
