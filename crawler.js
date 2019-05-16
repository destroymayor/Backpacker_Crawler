import cheerio from "cheerio";
import superagent from "superagent";
import superagentProxy from "superagent-proxy";
superagentProxy(superagent);

import { exportResults, readFileAsync, writeFileAsync } from "./src/fs_process";
import { asyncForEach, waitFor } from "./src/delay";
import userAgents from "./src/userAgents";
import requestNewProxy from "./src/getProxyIP";

const headerConfig = {
  "Content-Type": "text/plain",
  "User-Agent": userAgents[parseInt(Math.random() * userAgents.length)]
};

const getProxyIPs = async () => {
  const proxy = await readFileAsync("./ip.json").then(data => {
    return JSON.parse(data)[parseInt(Math.random() * JSON.parse(data).length)];
  });
  return proxy;
};

const getWebSiteContent = async (url, proxy, forumCode, page, outputPath) => {
  const pageLinkList = [];
  const getWebSitePageUrl = async ip => {
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
      console.log("try other proxy ip", ip);
      getWebSitePageUrl(ip);
      //console.log("TCL: getWebSitePageUrl -> error", error);
    }
  };

  const RequestDataAsync = async (url, ip, page, outputPath) => {
    const crawlerResultList = [];
    try {
      const RequestHTML = await superagent
        .get(url)
        .proxy(ip)
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
    } catch (error) {}
  };

  const ip = await getProxyIPs();
  Promise.resolve()
    .then(() => getWebSitePageUrl(ip))
    .then(() => {
      Promise.all(
        pageLinkList.map(async item => {
          await RequestDataAsync(item.link, ip, item.page, outputPath);
          return item.page;
        })
      ).then(page => console.log("第", page[0], "頁 Time:", new Date().toTimeString().split(" ")[0]));
    });
};

const startCrawler = async (forum, startPage, totalCode) => {
  const outputPath = `./output/${forum}.json`;
  writeFileAsync(outputPath, []);

  const ip = await getProxyIPs();
  const list = [];
  for (let i = startPage; i <= totalCode; i++) list.push(i);

  await asyncForEach(list, async pages => {
    await getWebSiteContent(
      `https://www.backpackers.com.tw/forum/forumdisplay.php?f=${forum}&order=desc&page=${pages}`,
      ip,
      forum,
      pages,
      outputPath
    );
    // await waitFor(Math.floor(Math.random() * (540000 - 300000 + 1) + 300000));
    await waitFor(5000);
  });
};

export default startCrawler;
