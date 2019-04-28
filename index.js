import { exportResults, writeFileAsync } from "./src/fs_function";
import { asyncForEach, waitFor } from "./src/delay";
import cheerio from "cheerio";
const superagent = require("superagent");
require("superagent-proxy")(superagent);

const proxy_url = "219.85.183.27:8080";
const proxy = process.env.http_proxy || `http://${proxy_url}`;

const getWebSiteContent = async (url, forumCode, outputPath) => {
  const pageLinkList = [];

  const getWebSitePageUrl = async () => {
    try {
      const RequestHTML = await superagent.get(url).proxy(proxy);
      const $ = cheerio.load(RequestHTML.text);
      const forum_num = "threadbits_forum_" + forumCode;

      $(`#${forum_num} > tr > td:nth-child(2) > div > a`).each((index, value) => {
        console.log(`https://www.backpackers.com.tw/forum/${$(value).attr("href")}`);
        pageLinkList.push(`https://www.backpackers.com.tw/forum/${$(value).attr("href")}`);
      });
    } catch (error) {
      console.log("TCL: getWebSitePageUrl -> error", error);
    }
  };

  const RequestDataAsync = async url => {
    const crawlerResultList = [];
    try {
      const RequestHTML = await superagent.get(url).proxy(proxy);
      const $ = cheerio.load(RequestHTML.text);

      const title = $(
        "div:nth-child(1) > div:nth-child(2) > table > tbody > tr:nth-child(2) > td > div:nth-child(2) > strong"
      ).text();
      const content = $("div:nth-child(1) > div:nth-child(2) > table > tbody > tr:nth-child(2) > td > .vb_postbit").text();

      await crawlerResultList.push({
        article_title: title,
        content
      });

      await exportResults(crawlerResultList, outputPath);
      await console.log("Save Success! Time:", new Date().toTimeString().split(" ")[0]);
    } catch (error) {
      console.log("TCL: RequestDataAsync -> error", error);
    }
  };

  Promise.resolve()
    .then(() => getWebSitePageUrl())
    .then(() =>
      Promise.all(
        pageLinkList.map(async link => {
          await RequestDataAsync(link);
        })
      )
    );
};

const startCrawler = async (forum, totalCode) => {
  //const outputPath = `./output/${forum}_${Math.floor(Math.random() * (99 - 10 + 1)) + 10}.json`;
  const outputPath = `./output/${forum}.json`;
  writeFileAsync(outputPath, []);

  const list = [];
  for (let i = 1; i <= totalCode; i++) list.push(i);

  await asyncForEach(list, async num => {
    await waitFor(5000);
    await getWebSiteContent(
      `https://www.backpackers.com.tw/forum/forumdisplay.php?f=${forum}&order=desc&page=${num}`,
      forum,
      outputPath
    );
  });
};

startCrawler(75, 10);
