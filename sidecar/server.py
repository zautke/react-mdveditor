"""
URL Content Extraction Sidecar — FastAPI + Trafilatura

Exposes POST /extract  { url: str }  →  { title, author, date, siteName, content, images }

Trafilatura handles the heavy lifting: HTTP fetch, boilerplate removal,
ad filtering, and clean HTML extraction.

Run locally:  MDE_SIDECAR_INTERNAL_PORT=5280 bash run.sh
Via Docker:   docker compose up
"""

from __future__ import annotations

from copy import deepcopy
import re

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from lxml import etree
from lxml import html as lxml_html
from pydantic import BaseModel, HttpUrl

import trafilatura
from trafilatura.settings import use_config

# ── Trafilatura config ───────────────────────────────────────────────
_cfg = use_config()
_cfg.set("DEFAULT", "EXTRACTION_TIMEOUT", "30")

# ── FastAPI app ──────────────────────────────────────────────────────

app = FastAPI(title="mde-url-sidecar", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["*"],
)


class ExtractRequest(BaseModel):
    url: HttpUrl


class ExtractResponse(BaseModel):
    title: str | None = None
    author: str | None = None
    date: str | None = None
    siteName: str | None = None
    content: str = ""
    images: list[str] = []


def _first_present_attr(el: etree._Element, *names: str) -> str | None:
    for name in names:
        value = el.get(name)
        if value:
            return value
    return None


def _src_from_srcset(srcset: str | None) -> str | None:
    if not srcset:
        return None
    first = srcset.split(",", 1)[0].strip()
    if not first:
        return None
    return first.split()[0]


def _normalize_img(img: etree._Element) -> None:
    src = _first_present_attr(img, "data-lazy-src", "data-src", "src")
    srcset = _first_present_attr(img, "data-lazy-srcset", "data-srcset", "srcset")
    sizes = _first_present_attr(img, "data-lazy-sizes", "sizes")

    if (not src or src.startswith("data:image/")) and srcset:
        src = _src_from_srcset(srcset)

    if src:
        img.set("src", src)
    if srcset:
        img.set("srcset", srcset)
    if sizes:
        img.set("sizes", sizes)

    for attr in list(img.attrib):
        if attr.startswith("data-") or attr in {
            "class",
            "style",
            "loading",
            "decoding",
            "fetchpriority",
        }:
            del img.attrib[attr]


def _picture_to_img(picture: etree._Element) -> etree._Element | None:
    img = picture.xpath(".//img[1]")
    if not img:
        return None

    source = img[0]
    new_img = etree.Element("img")
    for attr in ("alt", "width", "height"):
        value = source.get(attr)
        if value:
            new_img.set(attr, value)

    source_nodes = picture.xpath(".//source")

    src = _first_present_attr(source, "data-lazy-src", "data-src", "src")
    srcset = _first_present_attr(source, "data-lazy-srcset", "data-srcset", "srcset")
    sizes = _first_present_attr(source, "data-lazy-sizes", "sizes")

    if not srcset:
        for source_node in reversed(source_nodes):
            srcset = _first_present_attr(
                source_node, "data-lazy-srcset", "data-srcset", "srcset"
            )
            if srcset:
                break

    if not sizes:
        for source_node in reversed(source_nodes):
            sizes = _first_present_attr(source_node, "data-lazy-sizes", "sizes")
            if sizes:
                break

    if (not src or src.startswith("data:image/")) and srcset:
        src = _src_from_srcset(srcset)

    if src:
        new_img.set("src", src)
    if srcset:
        new_img.set("srcset", srcset)
    if sizes:
        new_img.set("sizes", sizes)

    return new_img if new_img.get("src") else None


def _clean_fragment(root: etree._Element) -> etree._Element:
    if root.tag == "picture":
        replacement = _picture_to_img(root)
        if replacement is not None:
            root = replacement

    for picture in list(root.xpath(".//picture")):
        replacement = _picture_to_img(picture)
        parent = picture.getparent()
        if parent is None:
            continue
        if replacement is None:
            parent.remove(picture)
        else:
            parent.replace(picture, replacement)

    etree.strip_elements(root, "noscript", "script", "style", "svg", with_tail=False)

    if root.tag == "img":
        _normalize_img(root)

    for img in root.xpath(".//img"):
        _normalize_img(img)

    for el in root.iter():
        for attr in list(el.attrib):
            if attr.startswith("data-") or attr in {
                "class",
                "style",
                "onclick",
                "onmouseenter",
                "onmouseleave",
            }:
                del el.attrib[attr]

    return root


def _append_copy(parent: etree._Element, node: etree._Element) -> None:
    parent.append(_clean_fragment(deepcopy(node)))


def _extract_recipe_page_html(
    downloaded: str,
    title: str | None,
    author: str | None,
    date: str | None,
) -> str | None:
    try:
        doc = lxml_html.fromstring(downloaded)
    except (etree.ParserError, ValueError):
        return None

    page_title = doc.xpath(
        "//div[contains(concat(' ', normalize-space(@class), ' '), ' page-title ')]"
    )
    article_image = doc.xpath(
        "//div[contains(concat(' ', normalize-space(@class), ' '), ' article-image ')]"
    )
    recipe_body = doc.xpath(
        "//div[contains(concat(' ', normalize-space(@class), ' '), ' recipe-body ')]"
    )
    recipe_container = doc.xpath(
        "//div[starts-with(@id, 'wprm-recipe-container-') and contains(concat(' ', normalize-space(@class), ' '), ' wprm-recipe-container ')]"
    )

    if not recipe_body:
        return None

    root = etree.Element("div")
    header = etree.SubElement(root, "header")

    source_h1 = ""
    if page_title:
        source_h1 = page_title[0].xpath("normalize-space(.//h1[1])")
    source_h1 = source_h1 or title or "Web Article"

    h1 = etree.SubElement(header, "h1")
    h1.text = source_h1

    if page_title:
        teaser = page_title[0].xpath(
            "normalize-space(.//p[contains(concat(' ', normalize-space(@class), ' '), ' post-teaser ')][1])"
        )
        if teaser:
            lede = etree.SubElement(header, "p")
            lede.set("class", "lede")
            lede.text = teaser

        raw_byline = page_title[0].xpath(
            "normalize-space(.//div[contains(concat(' ', normalize-space(@class), ' '), ' author ')][1])"
        )
        if raw_byline:
            match = re.match(r"^(.*?)\s+by\s+(.+)$", raw_byline)
            if match:
                source_date = match.group(1).strip()
                source_author = match.group(2).strip()
                if source_date:
                    date = source_date
                if source_author:
                    author = source_author

    byline_parts = [part for part in [date, author] if part]
    if byline_parts:
        byline = etree.SubElement(header, "p")
        byline.set("class", "byline")
        byline.text = (
            " by ".join(byline_parts) if len(byline_parts) == 2 else byline_parts[0]
        )

    if article_image:
        hero_img = article_image[0].xpath(".//img[1]")
        if hero_img:
            figure = etree.SubElement(header, "figure")
            figure.append(_clean_fragment(deepcopy(hero_img[0])))

    article_section = etree.SubElement(root, "section")
    article_section.set("aria-label", "Article")
    for child in recipe_body[0]:
        _append_copy(article_section, child)

    if recipe_container:
        recipe_section = etree.SubElement(root, "section")
        recipe_section.set("aria-label", "Recipe")

        selectors = [
            ".//h2[contains(concat(' ', normalize-space(@class), ' '), ' wprm-recipe-name ')]",
            ".//div[contains(concat(' ', normalize-space(@class), ' '), ' wprm-recipe-summary ')]",
            ".//div[contains(@id, '-ingredients')]",
            ".//div[contains(@id, '-equipment')]",
            ".//div[contains(@id, '-instructions')]",
            ".//div[contains(@id, '-notes')]",
        ]
        for selector in selectors:
            for node in recipe_container[0].xpath(selector):
                _append_copy(recipe_section, node)

    return etree.tostring(root, encoding="unicode", method="html")


@app.post("/extract", response_model=ExtractResponse)
async def extract(req: ExtractRequest) -> ExtractResponse:
    """Fetch a URL and return cleaned article HTML."""
    url = str(req.url)

    # 1. Download the page
    downloaded = trafilatura.fetch_url(url, config=_cfg)
    if downloaded is None:
        raise HTTPException(status_code=502, detail=f"Could not fetch URL: {url}")

    # 2. Extract metadata
    metadata = trafilatura.extract_metadata(downloaded, default_url=url)

    # 3. Extract clean HTML content
    html_content = trafilatura.extract(
        downloaded,
        output_format="html",
        favor_precision=True,
        include_images=True,
        include_tables=True,
        include_comments=False,
        config=_cfg,
    )

    preserved_html = _extract_recipe_page_html(
        downloaded,
        metadata.title if metadata else None,
        metadata.author if metadata else None,
        metadata.date if metadata else None,
    )

    if preserved_html:
        html_content = preserved_html

    if html_content is None:
        raise HTTPException(
            status_code=422,
            detail="Could not extract meaningful content from this URL",
        )

    # 4. Collect image URLs from metadata
    images: list[str] = []
    if metadata and metadata.image:
        images.append(metadata.image)

    return ExtractResponse(
        title=metadata.title if metadata else None,
        author=metadata.author if metadata else None,
        date=metadata.date if metadata else None,
        siteName=metadata.sitename if metadata else None,
        content=html_content,
        images=images,
    )


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
