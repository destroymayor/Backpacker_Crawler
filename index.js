import cheerio from "cheerio";
import superagent from "superagent";

import { exportResults, writeFileAsync } from "./src/fs_process";
import { asyncForEach, waitFor } from "./src/delay";
import userAgents from "./src/userAgents";

const proxy = "http://180.183.96.150:8213";

//
// http://138.197.167.88:8080
// http://47.90.202.224:3128
// http://142.93.145.229:3128
// http://104.248.112.25:8080
// http://92.222.25.82:3128
// http://103.43.203.225:53281
// http://1.179.148.9:36656
// http://1.20.97.166:33587
// http://217.30.73.152:32368
// http://1.20.96.111:45555
// http://112.78.152.98:52377
// http://201.48.194.210:80
// http://41.169.15.99:48733
// http://81.24.88.136:41258
// http://125.27.10.245:43800
// http://187.163.36.54:59753
// http://103.9.124.210:8080
// http://185.85.116.61:8080
// http://185.85.117.109:8080
// http://185.85.116.71:8080
// http://185.85.116.90:8080
// http://185.85.116.33:8080
// http://185.85.116.9:8080
// http://103.65.193.195:52115
// http://103.9.190.206:44245
// http://103.233.123.177:8080
// http://195.24.154.3:51749
// http://37.221.157.98:43570
// http://181.10.238.7:58738
// http://109.248.249.37:8081
// http://182.93.94.98:46317
// http://137.74.109.229:3128

let userAgent = userAgents[parseInt(Math.random() * userAgents.length)];

const headerConfig = {
  "Content-Type": "text/plain",
  "User-Agent": userAgent
};

const getWebSiteContent = async (url, forumCode, page, totalCode, outputPath) => {
  const pageLinkList = [];
  const getWebSitePageUrl = async () => {
    try {
      const RequestHTML = await superagent
        .get(url)
        .proxy(proxy)
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
        .proxy(proxy)
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

startCrawler(116, 243, 369);
