import * as cheerio from "cheerio";
import { DetailPlugin, DetailExtractResult } from "../types";

export const terraCaboVerdePlugin: DetailPlugin = {
  sourceId: "cv_terracaboverde",

  extract(html: string, baseUrl: string): DetailExtractResult {
    const $ = cheerio.load(html);
    const imageUrls: string[] = [];

    // Extract images from swiper carousel
    $(".swiper-slide img").each((_, el) => {
      const src = $(el).attr("src");
      if (src && src.startsWith("http") && !imageUrls.includes(src)) {
        imageUrls.push(src);
      }
    });

    // Also extract from lightbox hrefs
    $(".swiper-slide a[href*='.jpg'], .swiper-slide a[href*='.png']").each((_, el) => {
      const href = $(el).attr("href");
      if (href && href.startsWith("http") && !imageUrls.includes(href)) {
        imageUrls.push(href);
      }
    });

    // Extract title from h1 or page title
    let title: string | undefined;
    const h1 = $("h1").first().text().trim();
    if (h1 && h1.length > 5) {
      title = h1;
    }

    // Extract description - look for text after "Description" heading
    let description: string | undefined;
    const descHeading = $("h2:contains('Description')").first();
    if (descHeading.length) {
      const descContainer = descHeading.closest(".elementor-element").next(".elementor-widget-text-editor");
      if (descContainer.length) {
        description = descContainer.find("p").map((_, el) => $(el).text().trim()).get().join(" ");
      }
    }

    // Fallback: look for any substantial paragraph text
    if (!description || description.length < 30) {
      $(".elementor-widget-text-editor p").each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 50 && (!description || text.length > description.length)) {
          description = text;
        }
      });
    }

    return {
      success: true,
      title,
      description,
      imageUrls,
    };
  },
};
