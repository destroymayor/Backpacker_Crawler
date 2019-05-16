import cheerio from "cheerio";
import superagent from "superagent";
import superagentProxy from "superagent-proxy";
superagentProxy(superagent);

import { exportResults, readFileAsync, writeFileAsync } from "./src/fs_process";
import { asyncForEach, waitFor } from "./src/delay";
import userAgents from "./src/userAgents";

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

const RequestDataAsync = async (url, proxy, page, outputPath) => {
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
  } catch (error) {}
};

const getWebSitePageUrl = async (url, proxy, forumCode, page) => {
  const pageLinkList = [];
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
    console.log("getWebSitePageUrl error");
    return "error";
  }
};

const startCrawler = async (forum, startPage, totalCode) => {
  //const outputPath = `./output/${forum}_${Math.floor(Math.random() * (99 - 10 + 1)) + 10}.json`;
  const outputPath = `./output/${forum}.json`;
  writeFileAsync(outputPath, []);

  const list = [];
  for (let i = startPage; i <= totalCode; i++) list.push(i);

  let proxy_ip = await getProxyIPs();

  await asyncForEach(list, async pages => {
    let url = `https://www.backpackers.com.tw/forum/forumdisplay.php?f=${forum}&order=desc&page=${pages}`;

    console.log("start proxy ip", proxy_ip);

    await getWebSitePageUrl(url, proxy_ip, forum, pages).then(UrlList => {
      if (typeof UrlList == "string") {
      } else {
        Promise.all(
          UrlList.map(async item => {
            await RequestDataAsync(item.link, proxy_ip, item.page, outputPath);
            return item.page;
          })
        ).then(page => console.log("第", page[0], "頁 Time:", new Date().toTimeString().split(" ")[0]));
      }
    });

    //await waitFor(Math.floor(Math.random() * (540000 - 300000 + 1) + 300000));
    await waitFor(5000);
  });
};

export default startCrawler;
