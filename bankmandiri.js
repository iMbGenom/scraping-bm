const rp = require('request-promise')
const cheerio = require('cheerio')
const puppeteer = require('puppeteer')
const fs = require('fs')

const startingUrl = 'https://www.bankmega.com/'
let browser

async function scrapePromoCategories(url) {
    const page = await browser.newPage()
    await page.goto(url)
    const html = await page.evaluate(() => document.body.innerHTML)
    const $ = await cheerio.load(html)

    let result = []
    $("#subcatpromo").each((i, element) => {
        const totalCat = $(element).find("div").length
        for (let i=1; i<= totalCat; i++) {
            const catTitle = $(element).find(`div:nth-child(${i}) > img`).attr("title")
            const catId = $(element).find(`div:nth-child(${i}) > img`).attr("id")
            const catUrl = startingUrl + 'ajax.promolainnya.php?product=0&subcat=' + i
            result.push({
                catTitle: catTitle,
                catId: catId,
                catUrl: catUrl
            })
        }
    }).get()

    return result
}

async function scrapePromoByCategory(url) {
    const page = await browser.newPage()
    await page.goto(url)
    const html = await page.evaluate(() => document.body.innerHTML)
    const $ = await cheerio.load(html)

    let totalPage = 0
    $(".tablepaging").each((i, element) => {
        const totalTd = $(element).find("tbody > tr > td").length
        totalPage = totalTd - 2 // minus PrevPage dan NextPage
    }).get()

    let promo = []
    let detail = {}
    for (let inPage=1; inPage<=totalPage; inPage++) {
        const page = await browser.newPage()
        await page.goto(url + '&page=' + inPage)
        const html = await page.evaluate(() => document.body.innerHTML)
        const $ = await cheerio.load(html)

        $("#promolain").each(async (i, element) => {
            const totalList = $(element).find("li").length
            for (let i=1; i<= totalList; i++) {
                const url = startingUrl + $(element).find(`li:nth-child(${i}) > a`).attr("href")
                const title = $(element).find(`li:nth-child(${i}) > a > img `).attr("title")
                const image = startingUrl + $(element).find(`li:nth-child(${i}) > a > img `).attr("src")
                detail = await scrapePromoDetail(url)

                promo.push({
                    url,
                    title,
                    image,
                    inPage,
                    detail
                })
            }
        })
    }

    return promo
}

async function scrapePromoDetail(url) {
    const htmlResult = await rp.get(url)
    const $ = await cheerio.load(htmlResult)

    const title = $("#contentpromolain2 > div.titleinside").text().trim()
    const area = $("#contentpromolain2 > div.area").text().trim()
    const periode = $("#contentpromolain2 > div.periode").text().trim()
    const keterangan = startingUrl + $("#contentpromolain2 > div.keteranganinside > img").attr("src")
    
    return {
        title,
        area,
        periode,
        keterangan
    }
}

async function saveDataToJson(fileData, fileName) {
    fs.writeFile(fileName + '.json', JSON.stringify(fileData), 'utf8', (err) => {
        if (err) console.log(err)
        console.log('done')
    })
}

async function main() {
    let finalResult = []
    browser = await puppeteer.launch({ headless: false })
    let promoCategories = await scrapePromoCategories(startingUrl + 'promolainnya.php')

    let promoByCategory = {}
    const promo = await promoCategories.map(async (item, index, array) => {
        // const promoByCategory = await scrapePromoByCategory('https://www.bankmega.com/ajax.promolainnya.php?product=0&subcat=1')
        promoCategories[index].promo = await scrapePromoByCategory(item.catUrl)
        console.log(promoCategories)
        // finalResult.push(promoByCategory)
    })

    return
}

main()