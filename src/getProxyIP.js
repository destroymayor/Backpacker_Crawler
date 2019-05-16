import cheerio from "cheerio";
import superagent from "superagent";
import superagentProxy from "superagent-proxy";
superagentProxy(superagent);

import { writeFileAsync } from "./fs_process";
const requestProxyIp = () => {
  const getProxyUrl1 = async url => {
    const IP_proxy_RequestList = [];
    try {
      const RequestHTML = await superagent.get(url);
      const $ = cheerio.load(RequestHTML.text);

      $("#proxylisttable > tbody > tr").map((index, value) => {
        const IP_http =
          $(value)
            .children("td:nth-child(7)")
            .text() === "no"
            ? "http"
            : "https";
        const IP_url = $(value)
          .children("td:nth-child(1)")
          .text();
        const IP_port = $(value)
          .children("td:nth-child(2)")
          .text();

        const ip = `${IP_http}://${IP_url}:${IP_port}`;
        const lastChecked = $(value)
          .children("td:nth-child(8)")
          .text();

        IP_proxy_RequestList.push({ ip, lastChecked });
      });

      return IP_proxy_RequestList;
    } catch (error) {
      console.log("TCL: getWebSitePageUrl -> error", error);
    }
  };

  Promise.resolve()
    .then(() => getProxyUrl1("https://free-proxy-list.net/"))
    .then(list => {
      const resultList = [];
      Promise.all(
        list.map(async itemLink => {
          try {
            const testIp = await superagent
              .get("https://www.google.com.tw")
              .proxy(itemLink.ip)
              .timeout(5000);
            if (testIp.status == 200 && itemLink.lastChecked.includes("minutes ago")) {
              console.log(itemLink.lastChecked, "  -->", itemLink.ip);
              resultList.push(itemLink.ip);
            }
          } catch (error) {}
          await writeFileAsync("./ip.json", resultList);
        })
      );
    });
};

export default requestProxyIp;
