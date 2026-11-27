#!/usr/bin/env python3
"""Genera los tomos Word (IEEE, ISO 690, APA 7) y el paquete legal.

Requisitos: python-docx, beautifulsoup4, markdown-it-py, Pillow, numpy y Chrome
para rasterizar los diagramas (tools/docgen/render_diagrams.py).

Uso:
    py -3 tools/docgen/render_diagrams.py
    py -3 tools/docgen/build_docs.py
"""

from __future__ import annotations

import json
import math
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable

import numpy as np
from bs4 import BeautifulSoup, NavigableString, Tag
from docx import Document
from docx.enum.section import WD_ORIENT, WD_SECTION
from docx.enum.style import WD_STYLE_TYPE
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor
from markdown_it import MarkdownIt
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from docx_common import (  # noqa: E402
    ACCENT,
    BLACK,
    DARK,
    GREY,
    LINK,
    add_field,
    add_header_footer,
    add_horizontal_rule,
    add_hyperlink,
    add_left_border,
    add_page_x_of_y,
    add_paragraph_border,
    add_toc,
    enable_hyphenation,
    mark_update_fields,
    page_break,
    set_cant_split,
    set_cell_margins,
    set_page_layout,
    set_repeat_table_header,
    set_run_font,
    set_style_language,
    set_table_borders,
    set_table_width,
    shade_cell,
    shade_paragraph,
    style_font,
    suppress_hyphenation,
    suppress_paragraph_hyphenation,
    table_from_rows,
)

ROOT = Path(__file__).resolve().parents[2]
DOCS = ROOT / "docs"
OUT = DOCS / "entregables" / "word"
LEGAL_SRC = DOCS / "legal"
ASSETS = OUT / "assets" / "diagrams"
MANIFEST = ASSETS / "manifest.json"
IMAGES_MANIFEST = OUT / "assets" / "images" / "manifest.json"

MD = MarkdownIt("commonmark", {"html": False, "linkify": True}).enable("table")

DATE = "24 de noviembre de 2026"
VERSION = "3.1.0"
IMAGES_INDEX: dict[str, dict] = {}
PROJECT = "Gestión Comercial"
SUBTITLE = "ERP multi-cliente para distribución y comercio"


# ---------------------------------------------------------------------------
# Ediciones
# ---------------------------------------------------------------------------

IEEE = dict(
    key="IEEE",
    label="IEEE",
    file="Gestion-Comercial-IEEE.docx",
    code="GC-DOC-IEEE-2026",
    page="Letter",
    margins=(1.9, 1.9, 1.6, 1.6),
    font="Times New Roman",
    size=10.0,
    line=1.0,
    after=4,
    first_indent=0.5,
    align=WD_ALIGN_PARAGRAPH.JUSTIFY,
    h1=(10.0, True, False, WD_ALIGN_PARAGRAPH.CENTER, 14, 8, True),
    h2=(10.0, False, True, WD_ALIGN_PARAGRAPH.LEFT, 10, 4, False),
    h3=(10.0, False, True, WD_ALIGN_PARAGRAPH.LEFT, 8, 3, False),
    h4=(10.0, False, True, WD_ALIGN_PARAGRAPH.LEFT, 6, 2, False),
    caption=8.0,
    table_size=8.5,
    table_fill=None,
    table_vertical=False,
    code_size=8.0,
    ref_size=8.5,
    ref_indent=0.63,
    list_indent=0.63,
    number="roman",
    in_text="numeric",
    fig_prefix="Fig.",
    table_label="TABLE",
    toc_title="Tabla de contenido",
    refs_title="Referencias",
    abstract_title="Abstract",
    keywords_title="Index Terms",
    note="Estilo IEEE: citas numéricas entre corchetes, referencias en orden de "
         "aparición, figuras «Fig. N» y tablas «TABLE N». Cuerpo en Times New Roman "
         "de 10 pt, a una columna y con numeración romana de secciones.",
)

ISO = dict(
    key="ISO",
    label="ISO 690",
    file="Gestion-Comercial-ISO690.docx",
    code="GC-DOC-ISO-2026",
    page="A4",
    margins=(2.5, 2.5, 2.5, 2.5),
    font="Arial",
    size=10.5,
    line=1.15,
    after=6,
    first_indent=0.0,
    align=WD_ALIGN_PARAGRAPH.LEFT,
    h1=(14.0, True, False, WD_ALIGN_PARAGRAPH.LEFT, 18, 8, False),
    h2=(12.0, True, False, WD_ALIGN_PARAGRAPH.LEFT, 12, 6, False),
    h3=(11.0, True, True, WD_ALIGN_PARAGRAPH.LEFT, 10, 4, False),
    h4=(10.5, True, False, WD_ALIGN_PARAGRAPH.LEFT, 8, 3, False),
    caption=9.0,
    table_size=9.0,
    table_fill="F2F2F2",
    table_vertical=True,
    code_size=8.5,
    ref_size=9.5,
    ref_indent=0.5,
    list_indent=0.6,
    number="decimal",
    in_text="numeric",
    fig_prefix="Figura",
    table_label="Tabla",
    toc_title="Índice",
    refs_title="Bibliografía",
    abstract_title="Resumen",
    keywords_title="Palabras clave",
    note="Estilo ISO 690: citas numéricas entre corchetes, referencias "
         "normalizadas y numeración decimal de secciones conforme a ISO 2145. "
         "Formato A4, Arial de 10,5 pt e interlineado de 1,15.",
)

APA = dict(
    key="APA",
    label="APA 7",
    file="Gestion-Comercial-APA7.docx",
    code="GC-DOC-APA-2026",
    page="Letter",
    margins=(2.54, 2.54, 2.54, 2.54),
    font="Times New Roman",
    size=12.0,
    line=2.0,
    after=0,
    first_indent=1.27,
    align=WD_ALIGN_PARAGRAPH.LEFT,
    h1=(12.0, True, False, WD_ALIGN_PARAGRAPH.CENTER, 12, 6, False),
    h2=(12.0, True, False, WD_ALIGN_PARAGRAPH.LEFT, 10, 4, False),
    h3=(12.0, True, True, WD_ALIGN_PARAGRAPH.LEFT, 8, 3, False),
    h4=(12.0, True, False, WD_ALIGN_PARAGRAPH.LEFT, 6, 2, False),
    caption=10.0,
    table_size=9.5,
    table_fill=None,
    table_vertical=False,
    table_horizontal=False,
    code_size=9.0,
    ref_size=12.0,
    ref_indent=1.27,
    list_indent=0.63,
    number="none",
    in_text="author-date",
    fig_prefix="Figura",
    table_label="Tabla",
    toc_title="Tabla de contenido",
    refs_title="Referencias",
    abstract_title="Resumen",
    keywords_title="Palabras clave",
    note="Estilo APA 7.ª edición: citas autor-fecha, referencias con sangría "
         "francesa, interlineado doble, Times New Roman de 12 pt y márgenes de "
         "2,54 cm. Los títulos de nivel 1 van centrados y en negrita.",
)

EDITIONS = [IEEE, ISO, APA]


# ---------------------------------------------------------------------------
# Referencias
# ---------------------------------------------------------------------------

REFS = [
    dict(key="iso25010", author="International Organization for Standardization",
         short="ISO", year="2011",
         title="ISO/IEC 25010:2011 Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE) — System and software quality models",
         publisher="ISO", place="Geneva", url="https://www.iso.org/standard/35733.html"),
    dict(key="iso27001", author="International Organization for Standardization",
         short="ISO", year="2022",
         title="ISO/IEC 27001:2022 Information security, cybersecurity and privacy protection — Information security management systems — Requirements",
         publisher="ISO", place="Geneva", url="https://www.iso.org/standard/27001"),
    dict(key="iso29148", author="International Organization for Standardization",
         short="ISO", year="2018",
         title="ISO/IEC/IEEE 29148:2018 Systems and software engineering — Life cycle processes — Requirements engineering",
         publisher="ISO", place="Geneva", url="https://www.iso.org/standard/72089.html"),
    dict(key="iso8601", author="International Organization for Standardization",
         short="ISO", year="2019",
         title="ISO 8601-1:2019 Date and time — Representations for information interchange — Part 1: Basic rules",
         publisher="ISO", place="Geneva", url="https://www.iso.org/standard/70907.html"),
    dict(key="asvs", author="OWASP Foundation", short="OWASP", year="2021",
         title="OWASP Application Security Verification Standard 4.0.3",
         publisher="OWASP Foundation", place="", url="https://owasp.org/www-project-application-security-verification-standard/"),
    dict(key="owasp10", author="OWASP Foundation", short="OWASP", year="2021",
         title="OWASP Top 10:2021 — The ten most critical web application security risks",
         publisher="OWASP Foundation", place="", url="https://owasp.org/Top10/"),
    dict(key="wcag", author="World Wide Web Consortium", short="W3C", year="2023",
         title="Web Content Accessibility Guidelines (WCAG) 2.2",
         publisher="W3C", place="", url="https://www.w3.org/TR/WCAG22/"),
    dict(key="rfc9110", author="Internet Engineering Task Force", short="IETF", year="2022",
         title="RFC 9110: HTTP Semantics",
         publisher="IETF", place="", url="https://www.rfc-editor.org/rfc/rfc9110.html"),
    dict(key="ley1581", author="Congreso de la República de Colombia", short="Congreso",
         year="2012",
         title="Ley 1581 de 2012, por la cual se dictan disposiciones generales para la protección de datos personales",
         publisher="Diario Oficial No. 48.587", place="Bogotá", url="https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=49981"),
    dict(key="decreto1377", author="Presidencia de la República de Colombia", short="Presidencia",
         year="2013",
         title="Decreto 1377 de 2013, por el cual se reglamenta parcialmente la Ley 1581 de 2012",
         publisher="Diario Oficial No. 48.834", place="Bogotá", url="https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=53646"),
    dict(key="ley527", author="Congreso de la República de Colombia", short="Congreso",
         year="1999",
         title="Ley 527 de 1999, por medio de la cual se define y reglamenta el acceso y uso de los mensajes de datos, del comercio electrónico y de las firmas digitales",
         publisher="Diario Oficial No. 43.673", place="Bogotá", url="https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=4276"),
    dict(key="mysql", author="Oracle Corporation", short="Oracle", year="2024",
         title="MySQL 8.0 Reference Manual", publisher="Oracle", place="",
         url="https://dev.mysql.com/doc/refman/8.0/en/"),
    dict(key="php", author="The PHP Group", short="PHP", year="2024",
         title="PHP Manual", publisher="The PHP Group", place="",
         url="https://www.php.net/manual/en/"),
    dict(key="react", author="Meta Platforms", short="Meta", year="2024",
         title="React Documentation", publisher="Meta Platforms", place="",
         url="https://react.dev/"),
    dict(key="docker", author="Docker Inc.", short="Docker", year="2024",
         title="Docker Documentation", publisher="Docker Inc.", place="",
         url="https://docs.docker.com/"),
    dict(key="git", author="Software Freedom Conservancy", short="SFC", year="2024",
         title="Git Documentation", publisher="Software Freedom Conservancy", place="",
         url="https://git-scm.com/doc"),
]

REF_INDEX = {ref["key"]: index + 1 for index, ref in enumerate(REFS)}


def apa_author(ref) -> str:
    return ref["author"]


def format_reference(ref, ed) -> str:
    if ed["key"] == "APA":
        parts = [f"{apa_author(ref)}. ({ref['year']}). {ref['title']}."]
        if ref["publisher"] and ref["publisher"] not in ref["title"]:
            parts.append(f" {ref['publisher']}.")
        if ref["url"]:
            parts.append(f" {ref['url']}")
        return "".join(parts)

    if ed["key"] == "IEEE":
        text = f'{ref["author"]}, "{ref["title"]},"'
        if ref["publisher"]:
            text += f" {ref['publisher']},"
        if ref["place"]:
            text += f" {ref['place']},"
        text += f" {ref['year']}."
        if ref["url"]:
            text += f" [Online]. Available: {ref['url']}"
        return text

    # ISO 690 numérico
    text = f'{ref["author"].upper()}. {ref["title"]}.'
    if ref["place"]:
        text += f" {ref['place']}:"
    if ref["publisher"]:
        text += f" {ref['publisher']},"
    text += f" {ref['year']}."
    if ref["url"]:
        text += f" Disponible en: {ref['url']}"
    return text


def in_text(keys: Iterable[str], ed) -> str:
    keys = list(keys)
    if ed["in_text"] == "numeric":
        return ", ".join(f"[{REF_INDEX[key]}]" for key in keys)
    parts = []
    for key in keys:
        ref = next(item for item in REFS if item["key"] == key)
        parts.append(f"{ref['short']}, {ref['year']}")
    return "(" + "; ".join(parts) + ")"


# ---------------------------------------------------------------------------
# Estilos y estructura
# ---------------------------------------------------------------------------

def add_custom_style(doc, name, base="Normal", size=10.0, bold=False, italic=False,
                     color=BLACK, font=None, space_before=0, space_after=0,
                     line=1.0, left=0.0, first=0.0, keep_next=False,
                     align=WD_ALIGN_PARAGRAPH.LEFT, hanging=False):
    style = doc.styles.add_style(name, WD_STYLE_TYPE.PARAGRAPH)
    style.base_style = doc.styles[base]
    if font:
        style_font(style, font, size, bold=bold, italic=italic, color=color)
    else:
        style.font.size = Pt(size)
        style.font.bold = bold
        style.font.italic = italic
        style.font.color.rgb = color
    fmt = style.paragraph_format
    fmt.space_before = Pt(space_before)
    fmt.space_after = Pt(space_after)
    fmt.line_spacing = line
    fmt.left_indent = Cm(left)
    fmt.first_line_indent = Cm(first)
    fmt.keep_with_next = keep_next
    fmt.alignment = align
    if hanging:
        fmt.left_indent = Cm(left)
        fmt.first_line_indent = Cm(-first)
    return style


def configure_document(doc, ed):
    section = doc.sections[0]
    set_page_layout(section, ed["page"], ed["margins"])
    ed["header_left"] = f"{PROJECT} — Documentación técnica"
    ed["header_right"] = f"Edición {ed['label']} · v{VERSION}"
    ed["footer_left"] = f"{ed['code']} · v{VERSION}"
    add_header_footer(
        section,
        ed["font"],
        ed["header_left"],
        ed["header_right"],
        ed["footer_left"],
    )

    normal = doc.styles["Normal"]
    style_font(normal, ed["font"], ed["size"])
    set_style_language(normal, "es-CO")
    enable_hyphenation(doc)
    normal.paragraph_format.alignment = ed["align"]
    normal.paragraph_format.line_spacing = ed["line"]
    normal.paragraph_format.space_after = Pt(ed["after"])
    normal.paragraph_format.space_before = Pt(0)
    normal.paragraph_format.first_line_indent = Cm(ed["first_indent"])

    for level in (1, 2, 3, 4):
        size, bold, italic, align, before, after, smallcaps = ed[f"h{level}"]
        style = doc.styles[f"Heading {level}"]
        style_font(style, ed["font"], size, bold=bold, italic=italic,
                   color=BLACK, small_caps=smallcaps)
        fmt = style.paragraph_format
        fmt.alignment = align
        fmt.space_before = Pt(before)
        fmt.space_after = Pt(after)
        fmt.line_spacing = 1.0
        fmt.keep_with_next = True
        fmt.first_line_indent = Cm(0)
        fmt.left_indent = Cm(0)
        suppress_hyphenation(style)

    caption = doc.styles["Caption"]
    style_font(caption, ed["font"], ed["caption"], italic=False, color=DARK)
    caption.paragraph_format.space_before = Pt(2)
    caption.paragraph_format.space_after = Pt(8)
    caption.paragraph_format.line_spacing = 1.0
    caption.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
    suppress_hyphenation(caption)

    add_custom_style(doc, "Gcom Code", size=ed["code_size"], font="Consolas",
                     space_before=3, space_after=6, line=1.0, left=0.3,
                     align=WD_ALIGN_PARAGRAPH.LEFT)
    add_custom_style(doc, "Gcom Quote", size=ed["size"] - 0.5, italic=True,
                     color=GREY, space_before=4, space_after=6, line=1.0,
                     left=1.0, align=WD_ALIGN_PARAGRAPH.LEFT)
    add_custom_style(doc, "Gcom Reference", size=ed["ref_size"],
                     space_before=0, space_after=4, line=1.0,
                     left=ed["ref_indent"], first=ed["ref_indent"], hanging=True,
                     align=WD_ALIGN_PARAGRAPH.LEFT)
    add_custom_style(doc, "Gcom Front Title", size=ed["size"] + 5, bold=True,
                     space_before=0, space_after=10, line=1.0,
                     align=WD_ALIGN_PARAGRAPH.LEFT)
    add_custom_style(doc, "Gcom Front Subtitle", size=ed["size"] + 1, color=GREY,
                     space_before=0, space_after=6, line=1.0,
                     align=WD_ALIGN_PARAGRAPH.LEFT)
    add_custom_style(doc, "Gcom Small", size=ed["caption"], color=GREY,
                     space_before=0, space_after=3, line=1.0,
                     align=WD_ALIGN_PARAGRAPH.LEFT)
    add_custom_style(doc, "Gcom Table Text", size=ed["table_size"],
                     space_before=0, space_after=0, line=1.0,
                     align=WD_ALIGN_PARAGRAPH.LEFT)

    # Entradas del índice: compactas para que 17 capítulos no ocupen 12 páginas.
    # Los estilos deben conservar el nombre y el id integrados de Word ("toc 1",
    # "TOC1") y no marcarse como personalizados; de lo contrario, al actualizar
    # el campo TOC Word aplica el interlineado de Normal (doble en APA).
    for level, (size, left, bold) in enumerate(
        ((ed["size"], 0.0, True), (ed["size"] - 0.5, 0.5, False),
         (ed["size"] - 1.0, 1.0, False)), start=1
    ):
        style_id = f"TOC{level}"
        style = next((s for s in doc.styles if s.style_id == style_id), None)
        if style is None:
            style = doc.styles.add_style(f"toc {level}", WD_STYLE_TYPE.PARAGRAPH)
            style.element.set(qn("w:styleId"), style_id)
        style.name = f"toc {level}"
        style.element.attrib.pop(qn("w:customStyle"), None)
        style.base_style = doc.styles["Normal"]
        style_font(style, ed["font"], size, bold=bold)
        fmt = style.paragraph_format
        fmt.left_indent = Cm(left)
        fmt.first_line_indent = Cm(0)
        fmt.space_before = Pt(3 if level == 1 else 0)
        fmt.space_after = Pt(0)
        fmt.line_spacing = 1.0
        fmt.alignment = WD_ALIGN_PARAGRAPH.LEFT
        suppress_hyphenation(style)

    doc.core_properties.title = f"{PROJECT} — Documentación ({ed['label']})"
    doc.core_properties.subject = SUBTITLE
    doc.core_properties.author = PROJECT
    doc.core_properties.keywords = "ERP, SaaS, arquitectura, seguridad, documentación"
    doc.core_properties.comments = f"Edición {ed['label']} generada desde docs/."


def table_opts(ed):
    return dict(header_fill=ed.get("table_fill", "E7E6E6"),
                vertical=ed.get("table_vertical", True),
                horizontal=ed.get("table_horizontal", True))


PAGE_SIZES = {
    "A4": (21.0, 29.7),
    "Letter": (21.59, 27.94),
}


def format_size(ed, fmt: str) -> tuple[float, float]:
    width, height = PAGE_SIZES[ed["page"]]
    if fmt == "landscape":
        width, height = height, width
    elif fmt == "a3":
        width, height = 42.0, 29.7
    return width, height


def usable_area(ed, fmt: str) -> tuple[float, float]:
    width, height = format_size(ed, fmt)
    top, bottom, left, right = ed["margins"]
    return width - left - right - 0.3, height - top - bottom - 0.3


def section_for_format(doc, ed, fmt: str):
    """Abre una sección con el tamaño de página que necesita una figura.

    Los diagramas anchos se insertan en página horizontal o en A3: así el texto
    no se reduce a 5 pt ni hay que cortar tablas por la mitad.
    """
    width, height = format_size(ed, fmt)
    section = doc.add_section(WD_SECTION.NEW_PAGE)
    section.orientation = (
        WD_ORIENT.LANDSCAPE if width > height else WD_ORIENT.PORTRAIT
    )
    section.page_width = Cm(width)
    section.page_height = Cm(height)
    top, bottom, left, right = ed["margins"]
    section.top_margin = Cm(top)
    section.bottom_margin = Cm(bottom)
    section.left_margin = Cm(left)
    section.right_margin = Cm(right)
    section.header_distance = Cm(1.25)
    section.footer_distance = Cm(1.25)
    add_header_footer(
        section,
        ed["font"],
        ed["header_left"],
        ed["header_right"],
        ed["footer_left"],
        first_page=False,
    )
    return section


def break_page(doc, state):
    if not state.get("fresh"):
        page_break(doc)
    state["fresh"] = False


def front_title(doc, text, subtitle=None):
    paragraph = doc.add_paragraph(style="Gcom Front Title")
    run = paragraph.add_run(text)
    set_run_font(run, paragraph.style.font.name or "Times New Roman",
                 paragraph.style.font.size.pt if paragraph.style.font.size else 14,
                 bold=True, color=BLACK)
    if subtitle:
        paragraph = doc.add_paragraph(style="Gcom Front Subtitle")
        run = paragraph.add_run(subtitle)
        set_run_font(run, paragraph.style.font.name or "Times New Roman",
                     paragraph.style.font.size.pt if paragraph.style.font.size else 10,
                     color=GREY)
    return paragraph


def cover_spacer(doc, count: int):
    """Espacios de portada con altura fija.

    Los párrafos vacíos heredan el interlineado de Normal (doble en APA) y
    empujaban la tabla de metadatos a una segunda página.
    """
    for _ in range(count):
        paragraph = doc.add_paragraph()
        paragraph.paragraph_format.space_before = Pt(0)
        paragraph.paragraph_format.space_after = Pt(0)
        paragraph.paragraph_format.line_spacing = Pt(14)


def add_cover(doc, ed):
    cover_spacer(doc, 5)
    paragraph = doc.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = paragraph.add_run("DOCUMENTACIÓN TÉCNICA, OPERATIVA Y COMERCIAL")
    set_run_font(run, ed["font"], 9.5, bold=True, color=GREY, all_caps=True)

    paragraph = doc.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    paragraph.paragraph_format.space_before = Pt(18)
    run = paragraph.add_run(PROJECT)
    set_run_font(run, ed["font"], 30, bold=True, color=ACCENT)

    paragraph = doc.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = paragraph.add_run(SUBTITLE)
    set_run_font(run, ed["font"], 15, italic=True, color=DARK)

    add_horizontal_rule(doc, color="1F4E79", size="12", space_before=10, space_after=14)

    paragraph = doc.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = paragraph.add_run(f"Edición {ed['label']}")
    set_run_font(run, ed["font"], 18, bold=True)

    paragraph = doc.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = paragraph.add_run(
        "Compendio de 17 capítulos, 4 anexos, 21 figuras y "
        "marco normativo"
    )
    set_run_font(run, ed["font"], 11, color=GREY)

    cover_spacer(doc, 4)

    data = [
        ("Código", ed["code"]),
        ("Versión", VERSION),
        ("Fecha", DATE),
        ("Autor", "[NOMBRE DEL AUTOR]"),
        ("Institución", "[INSTITUCIÓN / EMPRESA]"),
        ("Clasificación", "Uso interno · Documento académico"),
        ("Idioma", "Español"),
    ]
    table = doc.add_table(rows=0, cols=2)
    table.alignment = 1
    table.autofit = True
    for label, value in data:
        row = table.add_row()
        row.cells[0].text = ""
        row.cells[1].text = ""
        run = row.cells[0].paragraphs[0].add_run(label)
        set_run_font(run, ed["font"], 9.5, bold=True, color=GREY)
        run = row.cells[1].paragraphs[0].add_run(value)
        set_run_font(run, ed["font"], 9.5)
    for row in table.rows:
        row.cells[0].width = Cm(4.0)
        row.cells[1].width = Cm(9.0)

    paragraph = doc.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    paragraph.paragraph_format.space_before = Pt(18)
    run = paragraph.add_run(
        "Documento generado a partir de las fuentes Markdown del repositorio. "
        "Las cifras y estados reflejan el corte del 24 de noviembre de 2026."
    )
    set_run_font(run, ed["font"], 8, italic=True, color=GREY)


def add_document_control(doc, ed):
    front_title(doc, "Control del documento")
    paragraph = doc.add_paragraph(
        "Este ejemplar consolida la documentación del proyecto y aplica el estilo "
        f"{ed['label']}. La versión electrónica vive en docs/ y este archivo es una "
        "edición de entrega."
    )
    paragraph.paragraph_format.space_after = Pt(8)

    rows = [
        ["3.1.0", "24 nov 2026", "[AUTOR]", "[REVISOR]", "[APROBADOR]",
         "Compendio completo: documentación, diagramas, marco normativo y paquete legal."],
        ["3.0.0", "17 nov 2026", "[AUTOR]", "[REVISOR]", "[APROBADOR]",
         "Cierre funcional del ERP y despliegue en operación."],
        ["2.0.0", "3 nov 2026", "[AUTOR]", "[REVISOR]", "[APROBADOR]",
         "Documentación funcional, técnica y visual."],
    ]
    table_from_rows(
        doc,
        ["Versión", "Fecha", "Autor", "Revisión", "Aprobación", "Cambios"],
        rows,
        ed["font"],
        ed["table_size"] - 0.5,
        widths=[1.8, 2.2, 2.6, 2.6, 2.6, 4.7],
        **table_opts(ed),
    )
    doc.add_paragraph()

    front_title(doc, "Nota de estilo y citación")
    for text in [
        ed["note"],
        "Las referencias completas aparecen al final del tomo. Las citas en el "
        "texto remiten a esa lista y los diagramas conservan su código Mermaid "
        "fuente en los anexos digitales.",
        "Convenciones: fechas en formato largo (día, mes y año); importes en la "
        "moneda del cliente; nombres de archivos y rutas en tipografía "
        "monoespaciada; tablas y figuras numeradas de forma consecutiva.",
    ]:
        paragraph = doc.add_paragraph(text)
        paragraph.paragraph_format.space_after = Pt(6)

    front_title(doc, "Cómo citar este documento")
    paragraph = doc.add_paragraph()
    run = paragraph.add_run(
        f"{PROJECT}. ({DATE}). Documentación técnica, operativa y comercial "
        f"(Edición {ed['label']}, v{VERSION}) [Documento técnico]. "
        "[INSTITUCIÓN / EMPRESA]."
    )
    run.italic = True


def add_abstract(doc, ed):
    front_title(doc, "Resumen ejecutivo")
    abstract_es = (
        "Este compendio reúne la documentación funcional, técnica, operativa y "
        "comercial de Gestión Comercial, un ERP multi-cliente para distribución y "
        "comercio. Describe la arquitectura, el modelo de datos, los roles y "
        "permisos, los flujos de venta, cobro y cartera, la API REST, las finanzas, "
        "el despliegue con Docker, la seguridad, el modelo SaaS con una instancia "
        "por cliente y las decisiones de arquitectura. Incluye 21 figuras "
        "(15 diagramas y 6 mockups), "
        "tablas de trazabilidad, un marco normativo y un paquete legal para "
        "Colombia. El objetivo es que un lector técnico pueda instalar, operar y "
        "auditar el sistema, y que un lector comercial pueda explicar su alcance, "
        "sus límites y su modelo de servicio."
    )
    paragraph = doc.add_paragraph(abstract_es)
    paragraph.paragraph_format.space_after = Pt(8)

    front_title(doc, "Abstract")
    abstract_en = (
        "This compendium gathers the functional, technical, operational and "
        "commercial documentation of Gestión Comercial, a multi-client ERP for "
        "distribution and trade. It covers the architecture, data model, roles "
        "and permissions, sales, payments and receivables, the REST API, finance, "
        "Docker deployment, security, the SaaS model with one instance per client, "
        "and the architecture decisions. It includes 21 figures "
        "(15 diagrams and 6 mockups), traceability "
        "tables, a normative framework and a legal package for Colombia. The goal "
        "is to let a technical reader install, operate and audit the system, and a "
        "commercial reader explain its scope, limits and service model."
    )
    paragraph = doc.add_paragraph(abstract_en)
    paragraph.paragraph_format.space_after = Pt(8)

    paragraph = doc.add_paragraph()
    run = paragraph.add_run(f"{ed['keywords_title']}: ")
    set_run_font(run, ed["font"], ed["size"], bold=True)
    run = paragraph.add_run(
        "ERP; SaaS; arquitectura de software; PHP; MySQL; Docker; seguridad; "
        "protección de datos; ISO/IEC 25010; ISO/IEC 27001."
    )
    set_run_font(run, ed["font"], ed["size"])


def add_toc_page(doc, ed, figures, tables):
    front_title(doc, ed["toc_title"])
    add_toc(doc, "1-3")
    paragraph = doc.add_paragraph()
    paragraph.paragraph_format.space_before = Pt(8)
    run = paragraph.add_run(
        "En Word, pulse Ctrl+E o F9 sobre la tabla para actualizarla. El archivo "
        "se entrega con la actualización automática activada."
    )
    set_run_font(run, ed["font"], ed["caption"], italic=True, color=GREY)

    page_break(doc)
    front_title(doc, "Lista de figuras")
    add_item_list(doc, ed, figures, "Figura")
    doc.add_paragraph()
    front_title(doc, "Lista de tablas")
    add_item_list(doc, ed, tables, "Tabla")


def add_item_list(doc, ed, items, label):
    if not items:
        doc.add_paragraph("No hay elementos en esta edición.")
        return
    table = doc.add_table(rows=1, cols=3)
    table.style = "Table Grid"
    table.autofit = True
    set_table_borders(table, color="D9D9D9", vertical=False)
    set_cell_margins(table, top=20, bottom=20, left=80, right=80)
    headers = [f"{label}", "Título", "Página"]
    for index, text in enumerate(headers):
        cell = table.rows[0].cells[index]
        cell.text = ""
        cell.paragraphs[0].paragraph_format.left_indent = Cm(0)
        cell.paragraphs[0].paragraph_format.first_line_indent = Cm(0)
        suppress_paragraph_hyphenation(cell.paragraphs[0])
        run = cell.paragraphs[0].add_run(text)
        set_run_font(run, ed["font"], ed["caption"] - 0.5, bold=True)
    set_repeat_table_header(table.rows[0])

    for item in items:
        row = table.add_row()
        set_cant_split(row)
        cells = row.cells
        for cell in cells:
            cell.text = ""
            cell.paragraphs[0].paragraph_format.space_after = Pt(0)
            cell.paragraphs[0].paragraph_format.space_before = Pt(0)
            cell.paragraphs[0].paragraph_format.line_spacing = 1.0
            cell.paragraphs[0].paragraph_format.left_indent = Cm(0)
            cell.paragraphs[0].paragraph_format.first_line_indent = Cm(0)
            suppress_paragraph_hyphenation(cell.paragraphs[0])
        run = cells[0].paragraphs[0].add_run(str(item.number))
        set_run_font(run, ed["font"], ed["caption"] - 0.5)
        run = cells[1].paragraphs[0].add_run(item.caption)
        set_run_font(run, ed["font"], ed["caption"] - 0.5)
        add_field(cells[2].paragraphs[0], f"PAGEREF {item.bookmark} \\h", "—")
    widths = [1.5, 12.2, 1.6]
    table.autofit = False
    for row in table.rows:
        for index, width in enumerate(widths):
            row.cells[index].width = Cm(width)


# ---------------------------------------------------------------------------
# Metadatos de capítulos, figuras y tablas
# ---------------------------------------------------------------------------

@dataclass
class Chapter:
    path: Path
    title: str
    kind: str = "chapter"  # chapter | annex
    letter: str = ""
    items_figures: list = field(default_factory=list)
    items_tables: list = field(default_factory=list)


@dataclass
class Item:
    number: int
    caption: str
    bookmark: str
    width_cm: float = 0.0
    source: str = ""


def clean_title(text: str) -> str:
    text = re.sub(r"^\d+(?:\.\d+)*[.)]?\s*(?:[·•—–-]\s*)?", "", text).strip()
    text = re.sub(r"^ADR\s+0001\s*[—-]\s*", "ADR 0001 — ", text)
    text = re.sub(r"^ADR\s+0002\s*[—-]\s*", "ADR 0002 — ", text)
    if text.startswith("Documentación —"):
        return "Mapa documental"
    return text


def chapter_files() -> list[Chapter]:
    order = [
        "01-vision-general.md", "02-arquitectura.md", "03-modelo-datos.md",
        "04-roles-permisos.md", "05-manual-administrador.md",
        "06-manual-vendedor.md", "07-api.md", "08-finanzas.md",
        "09-despliegue.md", "10-roadmap.md", "11-mockups.md",
        "12-integracion-chulito.md", "13-guia-visual.md", "14-seguridad.md",
        "auditoria-2026-11-16.md", "progreso.md", "17-saas.md",
    ]
    chapters = []
    for name in order:
        path = DOCS / name
        soup = BeautifulSoup(MD.render(path.read_text(encoding="utf-8")), "html.parser")
        h1 = soup.find("h1")
        title = clean_title(h1.get_text(" ", strip=True)) if h1 else path.stem
        chapters.append(Chapter(path=path, title=title))
    for letter, name in [("A", "adr/0001-tipado-estricto-enums-y-money.md"),
                         ("B", "adr/0002-modelo-de-tenancy.md"),
                         ("C", "README.md")]:
        path = DOCS / name
        soup = BeautifulSoup(MD.render(path.read_text(encoding="utf-8")), "html.parser")
        h1 = soup.find("h1")
        title = clean_title(h1.get_text(" ", strip=True)) if h1 else path.stem
        chapters.append(Chapter(path=path, title=title, kind="annex", letter=letter))
    return chapters


def collect_items(chapters: list[Chapter], manifest: list[dict],
                  images: list[dict] | None = None):
    fig_no = 0
    tab_no = 0
    figures = []
    tables = []
    manifest_by_source: dict[str, list] = {}
    for entry in manifest:
        manifest_by_source.setdefault(entry["source"], []).append(entry)
    images_by_source = {entry["source"]: entry for entry in (images or [])}

    for chapter in chapters:
        rel = chapter.path.relative_to(DOCS).as_posix()
        soup = BeautifulSoup(MD.render(chapter.path.read_text(encoding="utf-8")), "html.parser")
        last_heading = chapter.title
        fig_index = 0
        fig_total = len(manifest_by_source.get(rel, []))
        for element in soup.find_all(True):
            if element.name in ("h1", "h2", "h3", "h4"):
                last_heading = clean_title(element.get_text(" ", strip=True))
            elif element.name == "table":
                tab_no += 1
                item = Item(tab_no, last_heading or chapter.title, f"_Tab{tab_no}")
                tables.append(item)
                chapter.items_tables.append(item)
            elif element.name == "pre" and element.find("code", class_="language-mermaid"):
                fig_index += 1
                fig_no += 1
                entries = manifest_by_source.get(rel, [])
                caption = entries[fig_index - 1]["caption"] if fig_index <= len(entries) else last_heading
                caption = clean_title(caption) or chapter.title
                css_width = entries[fig_index - 1].get("css_width") if fig_index <= len(entries) else None
                width_cm = (css_width * 2.54 / 96) if css_width else 0.0
                item = Item(fig_no, caption, f"_Fig{fig_no}", width_cm=width_cm)
                figures.append(item)
                chapter.items_figures.append(item)
            elif element.name == "img":
                src = element.get("src", "")
                rel_img = ""
                if src:
                    candidate = (chapter.path.parent / src).resolve()
                    try:
                        rel_img = candidate.relative_to(DOCS.resolve()).as_posix()
                    except ValueError:
                        rel_img = ""
                meta = images_by_source.get(rel_img)
                fig_no += 1
                caption = clean_title(element.get("alt") or "") or last_heading
                width_cm = (meta["css_width"] * 2.54 / 96) if meta else 0.0
                item = Item(fig_no, caption, f"_Fig{fig_no}", width_cm=width_cm)
                item.source = rel_img
                figures.append(item)
                chapter.items_figures.append(item)
    return figures, tables


# ---------------------------------------------------------------------------
# Numeración y renderizado
# ---------------------------------------------------------------------------

ROMAN = [
    ("M", 1000), ("CM", 900), ("D", 500), ("CD", 400), ("C", 100),
    ("XC", 90), ("L", 50), ("XL", 40), ("X", 10), ("IX", 9),
    ("V", 5), ("IV", 4), ("I", 1),
]


def roman(number: int) -> str:
    result = ""
    for symbol, value in ROMAN:
        while number >= value:
            result += symbol
            number -= value
    return result


def letter(number: int) -> str:
    return chr(ord("A") + number - 1)


class Numbering:
    def __init__(self, style: str, prefix: str = ""):
        self.style = style
        self.prefix = prefix
        self.chapter = 0
        self.section = 0
        self.subsection = 0
        self.annex_letter = ""

    def start_annex(self, letter: str) -> None:
        """Reinicia la numeración para un anexo: A.1, A.2, A.1.1..."""
        self.annex_letter = letter
        self.section = 0
        self.subsection = 0

    def h1(self) -> str:
        self.chapter += 1
        self.section = 0
        self.subsection = 0
        self.annex_letter = ""
        if self.style == "none":
            return ""
        if self.style == "roman":
            return f"{roman(self.chapter)}."
        if self.prefix:
            return f"{self.prefix}{self.chapter}."
        return f"{self.chapter}."

    def h2(self) -> str:
        self.section += 1
        self.subsection = 0
        if self.style == "none":
            return ""
        if self.annex_letter:
            return f"{self.annex_letter}.{self.section}"
        if self.style == "roman":
            return f"{letter(self.section)}."
        if self.prefix:
            return f"{self.prefix}{self.chapter}.{self.section}"
        return f"{self.chapter}.{self.section}"

    def h3(self) -> str:
        self.subsection += 1
        if self.style == "none":
            return ""
        if self.annex_letter:
            return f"{self.annex_letter}.{self.section}.{self.subsection}"
        if self.style == "roman":
            return f"{self.subsection})"
        if self.prefix:
            return f"{self.prefix}{self.chapter}.{self.section}.{self.subsection}"
        return f"{self.chapter}.{self.section}.{self.subsection}"


def add_heading(doc, text: str, level: int, ed, number: str = "", bookmark: bool = False):
    paragraph = doc.add_paragraph(style=f"Heading {level}")
    if number:
        run = paragraph.add_run(number + " ")
        set_run_font(run, ed["font"],
                     paragraph.style.font.size.pt if paragraph.style.font.size else ed["size"],
                     bold=paragraph.style.font.bold,
                     italic=paragraph.style.font.italic,
                     small_caps=paragraph.style.font.small_caps)
    run = paragraph.add_run(text)
    set_run_font(run, ed["font"],
                 paragraph.style.font.size.pt if paragraph.style.font.size else ed["size"],
                 bold=paragraph.style.font.bold,
                 italic=paragraph.style.font.italic,
                 small_caps=paragraph.style.font.small_caps)
    return paragraph


def add_bookmark(paragraph, name: str, bookmark_id: int):
    start = OxmlElement("w:bookmarkStart")
    start.set(qn("w:id"), str(bookmark_id))
    start.set(qn("w:name"), name)
    end = OxmlElement("w:bookmarkEnd")
    end.set(qn("w:id"), str(bookmark_id))
    paragraph._p.insert(0, start)
    paragraph._p.append(end)


def add_inline(doc, paragraph, node, ed, bold=False, italic=False, code=False):
    for child in node.children:
        if isinstance(child, NavigableString):
            # Los .md están cortados a 80 columnas: un salto de línea del fuente
            # no debe convertirse en un salto duro de Word, porque la línea
            # justificada quedaría estirada.
            text = re.sub(r"[ \t\r\n]+", " ", str(child))
            if not text:
                continue
            run = paragraph.add_run(text)
            set_run_font(run, "Consolas" if code else ed["font"],
                         ed["code_size"] if code else ed["size"],
                         bold=bold, italic=italic)
            if code:
                run.font.color.rgb = RGBColor(0x24, 0x29, 0x2F)
            continue
        if not isinstance(child, Tag):
            continue
        name = child.name.lower()
        if name in ("strong", "b"):
            add_inline(doc, paragraph, child, ed, bold=True, italic=italic, code=code)
        elif name in ("em", "i"):
            add_inline(doc, paragraph, child, ed, bold=bold, italic=True, code=code)
        elif name == "code":
            add_inline(doc, paragraph, child, ed, bold=bold, italic=italic, code=True)
        elif name == "a":
            href = child.get("href", "")
            text = child.get_text(" ", strip=True)
            if href.startswith("http") and text:
                add_hyperlink(paragraph, href, text, ed["font"], ed["size"])
            else:
                add_inline(doc, paragraph, child, ed, bold=bold, italic=italic, code=code)
        elif name == "br":
            paragraph.add_run().add_break()
        elif name == "img":
            src = child.get("src", "")
            image_path = (node.find_parent().get("data-path") or "")
            if src and Path(src).is_file():
                paragraph.add_run().add_picture(src, width=Cm(12))
        else:
            add_inline(doc, paragraph, child, ed, bold=bold, italic=italic, code=code)


def add_body_paragraph(doc, ed, node):
    paragraph = doc.add_paragraph(style="Normal")
    add_inline(doc, paragraph, node, ed)
    return paragraph


def add_list(doc, ed, list_tag, depth=0):
    ordered = list_tag.name == "ol"
    index = 0
    for item in list_tag.find_all("li", recursive=False):
        index += 1
        direct = [child for child in item.children
                  if not (isinstance(child, Tag) and child.name in ("ul", "ol"))]
        marker = f"{index}." if ordered else ("•" if depth == 0 else ("–" if depth == 1 else "·"))
        if direct:
            paragraph = doc.add_paragraph(style="Normal")
            left = ed["list_indent"] * (depth + 1) + 0.2
            paragraph.paragraph_format.left_indent = Cm(left)
            paragraph.paragraph_format.first_line_indent = Cm(-0.5)
            paragraph.paragraph_format.space_after = Pt(max(ed["after"] / 2, 1))
            paragraph.paragraph_format.line_spacing = ed["line"]
            paragraph.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
            run = paragraph.add_run(marker + "\t")
            set_run_font(run, ed["font"], ed["size"])
            for child in direct:
                if isinstance(child, Tag) and child.name == "p":
                    add_inline(doc, paragraph, child, ed)
                elif isinstance(child, NavigableString):
                    run = paragraph.add_run(re.sub(r"[ \t\r\n]+", " ", str(child)))
                    set_run_font(run, ed["font"], ed["size"])
                else:
                    add_inline(doc, paragraph, child, ed)
        for nested in item.find_all(["ul", "ol"], recursive=False):
            add_list(doc, ed, nested, depth + 1)


def add_code_block(doc, ed, code_text: str):
    paragraph = doc.add_paragraph(style="Gcom Code")
    shade_paragraph(paragraph, "F6F8FA")
    add_left_border(paragraph, color="D0D7DE", size="12")
    paragraph.paragraph_format.space_before = Pt(3)
    paragraph.paragraph_format.space_after = Pt(8)
    run = paragraph.add_run(code_text.rstrip("\n"))
    set_run_font(run, "Consolas", ed["code_size"])


def _caption_paragraph(paragraph):
    """Las leyendas no heredan la sangría de primera línea del cuerpo."""
    paragraph.paragraph_format.left_indent = Cm(0)
    paragraph.paragraph_format.first_line_indent = Cm(0)
    paragraph.paragraph_format.keep_with_next = True
    suppress_paragraph_hyphenation(paragraph)


def add_table_caption(doc, ed, item: Item, bookmark_id: int):
    if ed["key"] == "APA":
        paragraph = doc.add_paragraph()
        _caption_paragraph(paragraph)
        run = paragraph.add_run(f"Tabla {item.number}")
        set_run_font(run, ed["font"], ed["caption"], bold=True)
        paragraph.paragraph_format.space_before = Pt(8)
        paragraph.paragraph_format.space_after = Pt(2)
        add_bookmark(paragraph, item.bookmark, bookmark_id)
        paragraph = doc.add_paragraph()
        _caption_paragraph(paragraph)
        run = paragraph.add_run(item.caption)
        set_run_font(run, ed["font"], ed["caption"], italic=True)
        paragraph.paragraph_format.space_after = Pt(4)
    elif ed["key"] == "IEEE":
        paragraph = doc.add_paragraph()
        _caption_paragraph(paragraph)
        paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = paragraph.add_run(f"{ed['table_label']} {roman(item.number)}")
        set_run_font(run, ed["font"], ed["caption"], small_caps=True, bold=True)
        paragraph.paragraph_format.space_before = Pt(8)
        paragraph.paragraph_format.space_after = Pt(2)
        add_bookmark(paragraph, item.bookmark, bookmark_id)
        paragraph = doc.add_paragraph()
        _caption_paragraph(paragraph)
        paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = paragraph.add_run(item.caption)
        set_run_font(run, ed["font"], ed["caption"], italic=True)
        paragraph.paragraph_format.space_after = Pt(4)
    else:
        paragraph = doc.add_paragraph()
        _caption_paragraph(paragraph)
        run = paragraph.add_run(f"Tabla {item.number} — {item.caption}")
        set_run_font(run, ed["font"], ed["caption"], bold=True)
        paragraph.paragraph_format.space_before = Pt(8)
        paragraph.paragraph_format.space_after = Pt(3)
        add_bookmark(paragraph, item.bookmark, bookmark_id)


def add_figure(doc, ed, item: Item, parts: list[tuple[Path, float]],
               bookmark_id: int, max_h=21.0):
    total = len(parts)
    for index, (part, width_cm) in enumerate(parts, start=1):
        image = Image.open(part)
        width_px, height_px = image.size
        height_cm = width_cm * height_px / width_px
        if height_cm > max_h:
            height_cm = max_h
            width_cm = height_cm * width_px / height_px

        if ed["key"] == "APA":
            paragraph = doc.add_paragraph()
            _caption_paragraph(paragraph)
            label = f"Figura {item.number}" + (f" (continuación {index}/{total})" if total > 1 else "")
            run = paragraph.add_run(label)
            set_run_font(run, ed["font"], ed["caption"], bold=True)
            paragraph.paragraph_format.space_before = Pt(8)
            paragraph.paragraph_format.space_after = Pt(2)
            if index == 1:
                add_bookmark(paragraph, item.bookmark, bookmark_id)
            paragraph = doc.add_paragraph()
            _caption_paragraph(paragraph)
            run = paragraph.add_run(item.caption)
            set_run_font(run, ed["font"], ed["caption"], italic=True)
            paragraph.paragraph_format.space_after = Pt(4)
            paragraph = doc.add_paragraph()
            paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
            paragraph.add_run().add_picture(str(part), width=Cm(width_cm))
            paragraph.paragraph_format.space_after = Pt(8)
        else:
            paragraph = doc.add_paragraph()
            paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
            paragraph.paragraph_format.space_before = Pt(8)
            paragraph.paragraph_format.space_after = Pt(3)
            paragraph.paragraph_format.keep_with_next = True
            paragraph.add_run().add_picture(str(part), width=Cm(width_cm))
            caption = doc.add_paragraph(style="Caption")
            _caption_paragraph(caption)
            caption.alignment = WD_ALIGN_PARAGRAPH.CENTER if ed["key"] == "IEEE" else WD_ALIGN_PARAGRAPH.LEFT
            label = f"{ed['fig_prefix']} {item.number}"
            if total > 1:
                label += f" (continuación {index}/{total})" if index > 1 else f" (1/{total})"
            run = caption.add_run(f"{label}. {item.caption}")
            set_run_font(run, ed["font"], ed["caption"], italic=(ed["key"] == "IEEE"))
            if index == 1:
                add_bookmark(caption, item.bookmark, bookmark_id)
            caption.paragraph_format.space_after = Pt(10)


def add_references(doc, ed):
    add_heading(doc, ed["refs_title"], 1, ed)
    paragraph = doc.add_paragraph(
        f"Referencias presentadas en estilo {ed['label']}. Los enlaces se "
        "verificaron en la fecha de corte del documento."
    )
    paragraph.paragraph_format.space_after = Pt(10)
    if ed["key"] == "APA":
        ordered = sorted(REFS, key=lambda ref: (ref["author"].lower(), ref["year"], ref["title"]))
    else:
        ordered = sorted(REFS, key=lambda ref: REF_INDEX[ref["key"]])
    for ref in ordered:
        paragraph = doc.add_paragraph(style="Gcom Reference")
        text = format_reference(ref, ed)
        if ed["in_text"] == "numeric":
            text = f"[{REF_INDEX[ref['key']]}] {text}"
        run = paragraph.add_run(text)
        set_run_font(run, ed["font"], ed["ref_size"])


# ---------------------------------------------------------------------------
# Capítulos
# ---------------------------------------------------------------------------

def image_png(src: str, chapter: Chapter) -> Path:
    if not src:
        return Path()
    try:
        rel = (chapter.path.parent / src).resolve().relative_to(DOCS.resolve()).as_posix()
    except ValueError:
        return Path()
    meta = IMAGES_INDEX.get(rel)
    return ROOT / meta["png"] if meta else Path()


def insert_figure(doc, ed, item: Item, png: Path, bookmark_id: list[int], state: dict):
    fmt, parts = plan_figure(png, item, ed)
    if not parts:
        return
    bookmark_id[0] += 1
    if fmt != "portrait":
        section_for_format(doc, ed, fmt)
        add_figure(doc, ed, item, parts, bookmark_id[0],
                   max_h=usable_area(ed, fmt)[1] - 1.5)
        section_for_format(doc, ed, "portrait")
        state["fresh"] = True
    else:
        add_figure(doc, ed, item, parts, bookmark_id[0],
                   max_h=usable_area(ed, "portrait")[1] - 1.5)


def render_chapter(doc, ed, chapter: Chapter, numbering: Numbering,
                   bookmark_id: list[int], state: dict):
    soup = BeautifulSoup(MD.render(chapter.path.read_text(encoding="utf-8")), "html.parser")
    body = soup.body or soup
    fig_queue = list(chapter.items_figures)
    tab_queue = list(chapter.items_tables)

    h1 = body.find("h1")
    if h1:
        if chapter.kind == "annex":
            numbering.start_annex(chapter.letter)
            add_heading(doc, f"Anexo {chapter.letter}. {chapter.title}", 1, ed)
        else:
            add_heading(doc, chapter.title, 1, ed, number=numbering.h1())

    fig_cursor = 0
    for element in body.find_all(True, recursive=False):
        name = element.name
        if name == "h1":
            continue
        if name in ("h2", "h3", "h4", "h5", "h6"):
            level = min(int(name[1]), 4)
            number = {2: numbering.h2, 3: numbering.h3}.get(level, lambda: "")()
            text = element.get_text(" ", strip=True)
            add_heading(doc, clean_title(text) or text, level, ed, number=number)
        elif name == "p":
            image = element.find("img")
            if image is not None and fig_queue:
                item = fig_queue.pop(0)
                png = image_png(image.get("src", ""), chapter)
                insert_figure(doc, ed, item, png, bookmark_id, state)
            elif element.get_text(" ", strip=True):
                add_body_paragraph(doc, ed, element)
        elif name in ("ul", "ol"):
            add_list(doc, ed, element)
        elif name == "table":
            if not tab_queue:
                continue
            item = tab_queue.pop(0)
            bookmark_id[0] += 1
            add_table_caption(doc, ed, item, bookmark_id[0])
            headers = [th.get_text(" ", strip=True) for th in element.select("thead th")]
            rows = []
            for tr in element.select("tbody tr"):
                rows.append([td.get_text(" ", strip=True) for td in tr.find_all("td")])
            if not headers:
                first = element.find("tr")
                if first:
                    headers = [th.get_text(" ", strip=True) for th in first.find_all(["th", "td"])]
                    rows = rows[1:] if rows else rows
            table_from_rows(doc, headers, rows, ed["font"], ed["table_size"] - 0.5,
                            bold_first_col=False, **table_opts(ed))
            doc.add_paragraph().paragraph_format.space_after = Pt(2)
        elif name == "pre":
            code = element.find("code")
            classes = " ".join(code.get("class", [])) if code else ""
            if "language-mermaid" in classes:
                if not fig_queue:
                    continue
                item = fig_queue.pop(0)
                fig_cursor += 1
                png = ASSETS / f"{chapter.path.stem}-{fig_cursor:02d}.png"
                insert_figure(doc, ed, item, png, bookmark_id, state)
            else:
                add_code_block(doc, ed, code.get_text() if code else element.get_text())
        elif name == "blockquote":
            paragraph = doc.add_paragraph(style="Gcom Quote")
            add_inline(doc, paragraph, element, ed)
            add_left_border(paragraph)
        elif name == "hr":
            add_horizontal_rule(doc)
        elif name in ("div", "section", "article"):
            for child in element.find_all(True, recursive=False):
                if child.name == "p":
                    add_body_paragraph(doc, ed, child)


# ---------------------------------------------------------------------------
# Figuras: orientación y corte por rejilla
# ---------------------------------------------------------------------------

def _gutter_cuts(profile, count: int, length: int) -> list[int]:
    """Corta por la franja con menos tinta para no partir cajas ni etiquetas."""
    cuts = [0]
    for index in range(1, count):
        nominal = int(length * index / count)
        window = max(40, int(length / count * 0.22))
        low = max(cuts[-1] + 40, nominal - window)
        high = min(length - 40, nominal + window)
        if high <= low:
            cuts.append(nominal)
            continue
        cuts.append(low + int(np.argmin(profile[low:high])))
    cuts.append(length)
    return cuts


def grid_cells(path: Path, rows: int, cols: int) -> list[Path]:
    image = Image.open(path)
    width_px, height_px = image.size
    gray = np.asarray(image.convert("L"), dtype=np.int32)
    rows_cut = _gutter_cuts((255 - gray).sum(axis=1), rows, height_px)
    cols_cut = _gutter_cuts((255 - gray).sum(axis=0), cols, width_px)
    overlap_x = int(width_px * 0.012)
    overlap_y = int(height_px * 0.012)
    cells = []
    for row in range(rows):
        for col in range(cols):
            box = (
                max(0, cols_cut[col] - overlap_x),
                max(0, rows_cut[row] - overlap_y),
                min(width_px, cols_cut[col + 1] + overlap_x),
                min(height_px, rows_cut[row + 1] + overlap_y),
            )
            output = path.with_name(f"{path.stem}-g{row + 1}{col + 1}.png")
            image.crop(box).save(output, "PNG", optimize=True)
            cells.append(output)
    return cells


def plan_figure(path: Path, item: Item, ed) -> tuple[str, list[tuple[Path, float]]]:
    """Decide formato de página, tamaño y cortes de un diagrama.

    Devuelve (formato, [(imagen, ancho_cm)]). Nunca amplía por encima del
    tamaño natural y busca que el texto no baje de 6 pt.
    """
    if not path.exists():
        return "portrait", []
    with Image.open(path) as image:
        width_px, height_px = image.size
    ratio = height_px / width_px
    natural = item.width_cm or 15.5

    def place(fmt: str) -> float:
        width, height = usable_area(ed, fmt)
        height -= 1.5  # espacio para el pie de figura
        placed = min(natural, width, height / ratio)
        return placed

    for fmt in ("portrait", "landscape", "a3"):
        placed = place(fmt)
        if placed >= natural - 0.01 or 12.0 * placed / natural >= 6.0:
            return fmt, [(path, placed)]

    # Ni en A3 cabe con 6 pt: se parte en una rejilla sobre A3 horizontal.
    land_w, land_h = usable_area(ed, "a3")
    land_h -= 1.5
    chosen = (2, 2)
    for rows, cols in ((2, 1), (2, 2), (3, 2), (3, 3)):
        cell_w = natural / cols
        cell_h = natural * ratio / rows
        placed = min(land_w, cell_w, land_h * cell_w / cell_h)
        if 12.0 * placed / cell_w >= 6.0:
            chosen = (rows, cols)
            break

    rows, cols = chosen
    parts = []
    for cell in grid_cells(path, rows, cols):
        with Image.open(cell) as image:
            cell_w_px, cell_h_px = image.size
        width_cm = min(land_w, natural / cols)
        if width_cm * cell_h_px / cell_w_px > land_h:
            width_cm = land_h * cell_w_px / cell_h_px
        parts.append((cell, width_cm))
    return "a3", parts


# ---------------------------------------------------------------------------
# Marco normativo y anexos generados
# ---------------------------------------------------------------------------

def add_normative_framework(doc, ed, numbering: Numbering, bookmark_id: list[int],
                            table_item: Item):
    number = numbering.h1()
    add_heading(doc, "Marco normativo y método", 1, ed, number=number)
    paragraphs = [
        f"Este compendio reúne la documentación funcional, técnica, operativa y "
        f"comercial de {PROJECT}. Se ha estructurado siguiendo los principios de "
        f"calidad de producto de ISO/IEC 25010 {in_text(['iso25010'], ed)} y las "
        f"prácticas de gestión de seguridad de ISO/IEC 27001 {in_text(['iso27001'], ed)}.",
        f"Los requisitos, criterios de aceptación y trazabilidad se expresan "
        f"conforme a ISO/IEC/IEEE 29148 {in_text(['iso29148'], ed)}. Las fechas y "
        f"marcas de tiempo siguen ISO 8601 {in_text(['iso8601'], ed)} y se "
        f"presentan en formato largo para el lector humano.",
        f"La verificación de seguridad se apoya en OWASP ASVS "
        f"{in_text(['asvs'], ed)} y OWASP Top 10 {in_text(['owasp10'], ed)}; la "
        f"accesibilidad, en WCAG 2.2 {in_text(['wcag'], ed)}; y la semántica de la "
        f"API, en RFC 9110 {in_text(['rfc9110'], ed)}.",
        f"El tratamiento de datos personales se rige por la Ley 1581 de 2012 "
        f"{in_text(['ley1581'], ed)} y el Decreto 1377 de 2013 "
        f"{in_text(['decreto1377'], ed)}. Los mensajes de datos y la firma "
        f"electrónica se acogen a la Ley 527 de 1999 {in_text(['ley527'], ed)}.",
        f"La implementación se contrasta con las referencias oficiales de MySQL 8.0 "
        f"{in_text(['mysql'], ed)}, PHP 8.4 {in_text(['php'], ed)}, React "
        f"{in_text(['react'], ed)}, Docker {in_text(['docker'], ed)} y Git "
        f"{in_text(['git'], ed)}.",
    ]
    for text in paragraphs:
        paragraph = doc.add_paragraph(text)
        paragraph.paragraph_format.space_after = Pt(ed["after"] + 2)

    doc.add_paragraph()
    add_heading(doc, "Trazabilidad normativa", 2, ed, number=numbering.h2())
    rows = [
        ["ISO/IEC 25010", "Calidad del producto, atributos no funcionales y criterios de evaluación", in_text(["iso25010"], ed)],
        ["ISO/IEC 27001", "Gobierno y gestión de la seguridad de la información", in_text(["iso27001"], ed)],
        ["ISO/IEC/IEEE 29148", "Requisitos, criterios de aceptación y trazabilidad", in_text(["iso29148"], ed)],
        ["ISO 8601", "Fechas, horas y zonas horarias", in_text(["iso8601"], ed)],
        ["OWASP ASVS 4.0.3", "Verificación de seguridad de la aplicación", in_text(["asvs"], ed)],
        ["OWASP Top 10", "Riesgos de seguridad y pruebas de abuso", in_text(["owasp10"], ed)],
        ["WCAG 2.2", "Accesibilidad de la interfaz", in_text(["wcag"], ed)],
        ["RFC 9110", "Semántica HTTP y códigos de estado", in_text(["rfc9110"], ed)],
        ["Ley 1581 de 2012", "Protección de datos personales", in_text(["ley1581"], ed)],
        ["Decreto 1377 de 2013", "Reglamento de protección de datos", in_text(["decreto1377"], ed)],
        ["Ley 527 de 1999", "Mensajes de datos y firma electrónica", in_text(["ley527"], ed)],
        ["MySQL 8.0 / PHP 8.4", "Implementación de la base de datos y del backend", f"{in_text(['mysql'], ed)}; {in_text(['php'], ed)}"],
        ["React / Docker / Git", "Frontend, empaquetado y control de versiones", f"{in_text(['react'], ed)}; {in_text(['docker'], ed)}; {in_text(['git'], ed)}"],
    ]
    bookmark_id[0] += 1
    add_table_caption(doc, ed, table_item, bookmark_id[0])
    table_from_rows(doc, ["Referencia", "Uso en el documento", "Citación"], rows,
                    ed["font"], ed["table_size"] - 0.5, widths=[4.0, 7.6, 3.4],
                    **table_opts(ed))
    doc.add_paragraph()


def add_planned_diagrams(doc, ed, numbering: Numbering, bookmark_id: list[int],
                         table_item: Item):
    add_heading(doc, "Anexo D. Diagramas previstos", 1, ed)
    paragraph = doc.add_paragraph(
        "Los diagramas de esta sección todavía no forman parte del repositorio. "
        "Se incluye su especificación para que puedan elaborarse sin rehacer el "
        "análisis. Cuando se generen, se incorporarán a docs/ y a este anexo con "
        "la misma numeración."
    )
    paragraph.paragraph_format.space_after = Pt(8)
    rows = [
        ["D-01", "Flujo de CI/CD", "Commit, lint, tests, auditoría, build de imagen, etiqueta y despliegue por cliente.",
         "docs/10-roadmap.md; pipeline actual", "Pendiente"],
        ["D-02", "Tenencia por cliente", "Subdominio, borde TLS, pila por cliente, plano de control y respaldos.",
         "ADR 0002; docs/17-saas.md", "Pendiente"],
        ["D-03", "Respaldo y restauración", "Programación, cifrado, copia fuera del host, prueba y acta.",
         "docs/17-saas.md, sección 6", "Pendiente"],
        ["D-04", "Alta de un cliente", "Solicitud, DNS, secretos, pila, administrador, verificación y entrega.",
         "docs/17-saas.md, sección 4", "Pendiente"],
        ["D-05", "Modelo de amenazas", "Activos, actores, superficies, controles y riesgos residuales.",
         "docs/14-seguridad.md; OWASP ASVS", "Pendiente"],
        ["D-06", "Ciclo de un incidente", "Detección, contención, erradicación, recuperación y lecciones.",
         "Política de incidentes (paquete legal)", "Pendiente"],
    ]
    bookmark_id[0] += 1
    add_table_caption(doc, ed, table_item, bookmark_id[0])
    table_from_rows(doc, ["ID", "Diagrama", "Contenido mínimo", "Fuente", "Estado"],
                    rows, ed["font"], ed["table_size"] - 1.0,
                    widths=[1.2, 3.4, 7.4, 4.2, 2.0], **table_opts(ed))
    doc.add_paragraph()
    paragraph = doc.add_paragraph(
        "Criterio de aceptación: cada diagrama debe poder regenerarse desde un "
        "archivo .mmd versionado, citar la fuente que lo respalda y aparecer en la "
        "lista de figuras de las tres ediciones."
    )
    paragraph.italic = True


# ---------------------------------------------------------------------------
# Tomos
# ---------------------------------------------------------------------------

def build_tome(ed):
    doc = Document()
    configure_document(doc, ed)
    chapters = chapter_files()
    images = (
        json.loads(IMAGES_MANIFEST.read_text(encoding="utf-8"))
        if IMAGES_MANIFEST.exists()
        else []
    )
    IMAGES_INDEX.clear()
    IMAGES_INDEX.update({entry["source"]: entry for entry in images})
    figures, tables = collect_items(
        chapters, json.loads(MANIFEST.read_text(encoding="utf-8")), images
    )

    norm_item = Item(0, "Correspondencia entre normas, prácticas y secciones de la documentación", "_TabNormas")
    plan_item = Item(0, "Diagramas previstos y su especificación", "_TabPlan")
    tables.insert(0, norm_item)
    tables.append(plan_item)
    for index, item in enumerate(tables, start=1):
        item.number = index

    add_cover(doc, ed)
    page_break(doc)
    add_document_control(doc, ed)
    page_break(doc)
    add_abstract(doc, ed)
    page_break(doc)
    add_toc_page(doc, ed, figures, tables)

    numbering = Numbering(ed["number"])
    bookmark_id = [1000]
    state = {"fresh": False}

    break_page(doc, state)
    add_normative_framework(doc, ed, numbering, bookmark_id, norm_item)

    for chapter in chapters:
        break_page(doc, state)
        render_chapter(doc, ed, chapter, numbering, bookmark_id, state)

    break_page(doc, state)
    add_planned_diagrams(doc, ed, numbering, bookmark_id, plan_item)
    break_page(doc, state)
    add_references(doc, ed)

    mark_update_fields(doc)
    output = OUT / ed["file"]
    output.parent.mkdir(parents=True, exist_ok=True)
    doc.save(output)
    print(f"OK {output} ({len(figures)} figuras, {len(tables)} tablas)")
    return output


# ---------------------------------------------------------------------------
# Legal
# ---------------------------------------------------------------------------

LEGAL = [
    dict(file="01-aviso-legal.md", code="GC-LEG-01", title="Aviso legal",
         summary="Identificación del prestador, condiciones de acceso y responsabilidad.",
         signature=False),
    dict(file="02-politica-privacidad.md", code="GC-LEG-02",
         title="Política de privacidad y tratamiento de datos personales",
         summary="Responsable, finalidades, derechos de los titulares y medidas de seguridad.",
         signature=False),
    dict(file="03-terminos-condiciones.md", code="GC-LEG-03",
         title="Términos y condiciones de uso",
         summary="Acceso, licencia, uso aceptable, propiedad intelectual y terminación.",
         signature=False),
    dict(file="04-dpa.md", code="GC-LEG-04",
         title="Acuerdo de encargo de tratamiento de datos personales",
         summary="Roles, obligaciones, subencargados, seguridad y devolución de datos.",
         signature=True),
    dict(file="05-sla.md", code="GC-LEG-05", title="Acuerdo de nivel de servicio",
         summary="Horarios, severidades, tiempos de respuesta, disponibilidad y créditos.",
         signature=True),
    dict(file="06-politica-cookies.md", code="GC-LEG-06", title="Política de cookies",
         summary="Tipos de cookies, finalidad, consentimiento y gestión.",
         signature=False),
    dict(file="07-politica-seguridad.md", code="GC-LEG-07",
         title="Política de seguridad de la información",
         summary="Acceso, cifrado, respaldos, desarrollo seguro e incidentes.",
         signature=False),
    dict(file="08-politica-retencion.md", code="GC-LEG-08",
         title="Política de retención y eliminación de datos",
         summary="Plazos por categoría, conservación legal, borrado y certificación.",
         signature=False),
    dict(file="09-nda.md", code="GC-LEG-09", title="Acuerdo de confidencialidad",
         summary="Información confidencial, obligaciones, plazo y remedios.",
         signature=True),
    dict(file="10-contrato-servicio.md", code="GC-LEG-10",
         title="Contrato de prestación de servicios SaaS",
         summary="Objeto, licencia, precio, obligaciones, responsabilidad y terminación.",
         signature=True),
    dict(file="11-autorizacion-titular.md", code="GC-LEG-11",
         title="Autorización de tratamiento de datos personales",
         summary="Formato para titulares: finalidades, autorización y revocatoria.",
         signature=False),
    dict(file="12-politica-incidentes.md", code="GC-LEG-12",
         title="Política de gestión de incidentes de seguridad",
         summary="Clasificación, respuesta, notificación y lecciones aprendidas.",
         signature=False),
    dict(file="13-subencargados.md", code="GC-LEG-13",
         title="Anexo de subencargados del tratamiento",
         summary="Proveedores, servicio, ubicación y controles.",
         signature=False),
]


def configure_legal(doc, meta):
    ed = dict(APA)
    ed.update(dict(
        key="LEGAL", label="Legal", font="Times New Roman", size=11.0,
        line=1.15, after=6, first_indent=0.0, align=WD_ALIGN_PARAGRAPH.JUSTIFY,
        h1=(14.0, True, False, WD_ALIGN_PARAGRAPH.CENTER, 16, 8, False),
        h2=(12.0, True, False, WD_ALIGN_PARAGRAPH.LEFT, 12, 6, False),
        h3=(11.0, True, True, WD_ALIGN_PARAGRAPH.LEFT, 10, 4, False),
        h4=(11.0, True, False, WD_ALIGN_PARAGRAPH.LEFT, 8, 3, False),
        caption=9.0, table_size=9.0, code_size=8.5, ref_size=9.5,
        ref_indent=0.5, list_indent=0.6, number="none", in_text="numeric",
        fig_prefix="Figura", table_label="Tabla", toc_title="Contenido",
        refs_title="Referencias", abstract_title="Resumen",
        keywords_title="Palabras clave",
        note="Documento legal en borrador.",
    ))
    configure_document(doc, ed)
    section = doc.sections[0]
    add_header_footer(
        section, ed["font"],
        "[RAZÓN SOCIAL] · Documento legal",
        f"{meta['code']} · v1.0",
        f"{meta['code']} · v1.0 · Borrador para revisión jurídica",
    )
    doc.core_properties.title = meta["title"]
    doc.core_properties.subject = "Documento legal — borrador"
    doc.core_properties.author = "[RAZÓN SOCIAL]"
    return ed


def add_legal_cover(doc, ed, meta):
    for _ in range(5):
        doc.add_paragraph()
    paragraph = doc.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = paragraph.add_run("[RAZÓN SOCIAL]")
    set_run_font(run, ed["font"], 11, bold=True, color=GREY)
    paragraph = doc.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = paragraph.add_run("NIT [NIT] · [DOMICILIO] · [CIUDAD]")
    set_run_font(run, ed["font"], 9.5, color=GREY)

    add_horizontal_rule(doc, color="1F4E79", size="10", space_before=16, space_after=16)

    paragraph = doc.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = paragraph.add_run(meta["title"].upper())
    set_run_font(run, ed["font"], 20, bold=True, color=ACCENT)

    paragraph = doc.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = paragraph.add_run(meta["summary"])
    set_run_font(run, ed["font"], 11, italic=True, color=DARK)

    for _ in range(3):
        doc.add_paragraph()

    data = [
        ("Código", meta["code"]),
        ("Versión", "1.0 (borrador)"),
        ("Fecha", DATE),
        ("Clasificación", "Confidencial · Borrador"),
        ("Marco legal", "República de Colombia"),
        ("Revisión jurídica", "[ABOGADO / FIRMA]"),
    ]
    table = doc.add_table(rows=0, cols=2)
    table.alignment = 1
    for label, value in data:
        row = table.add_row()
        run = row.cells[0].paragraphs[0].add_run(label)
        set_run_font(run, ed["font"], 9.5, bold=True, color=GREY)
        run = row.cells[1].paragraphs[0].add_run(value)
        set_run_font(run, ed["font"], 9.5)
    for row in table.rows:
        row.cells[0].width = Cm(4.5)
        row.cells[1].width = Cm(9.0)

    paragraph = doc.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    paragraph.paragraph_format.space_before = Pt(22)
    run = paragraph.add_run(
        "BORRADOR. Este documento no constituye asesoría jurídica y debe ser "
        "revisado por un abogado habilitado antes de su firma o publicación."
    )
    set_run_font(run, ed["font"], 8.5, bold=True, color=RGBColor(0x9C, 0x00, 0x06))


def add_legal_front(doc, ed, meta):
    page_break(doc)
    front_title(doc, "Control del documento")
    rows = [
        ["1.0", DATE, "[AUTOR]", "[REVISOR]", "[ABOGADO]",
         "Versión inicial para revisión jurídica."],
        ["0.9", DATE, "[AUTOR]", "[REVISOR]", "—",
         "Borrador de trabajo."],
    ]
    table_from_rows(doc, ["Versión", "Fecha", "Autor", "Revisión", "Aprobación", "Cambios"],
                    rows, ed["font"], 8.5, widths=[1.5, 3.2, 2.3, 2.3, 2.3, 4.4],
                    **table_opts(ed))
    doc.add_paragraph()

    front_title(doc, "Partes")
    rows = [
        ["Prestador", "[RAZÓN SOCIAL], NIT [NIT], domiciliada en [DOMICILIO], representada por [REPRESENTANTE LEGAL]."],
        ["Cliente", "[RAZÓN SOCIAL DEL CLIENTE], NIT [NIT], domiciliada en [DOMICILIO], representada por [REPRESENTANTE LEGAL]."],
        ["Contacto", "[CORREO DE CONTACTO] · [TELÉFONO] · [SITIO WEB]"],
        ["Vigencia", "Desde [FECHA DE ENTRADA EN VIGOR] hasta [FECHA DE TERMINACIÓN]."],
    ]
    table_from_rows(doc, ["Rol", "Datos"], rows, ed["font"], 9.0, widths=[3.0, 12.5],
                    **table_opts(ed))
    doc.add_paragraph()

    paragraph = doc.add_paragraph()
    run = paragraph.add_run(
        "Advertencia: este es un documento modelo. Los espacios entre corchetes "
        "deben completarse y el texto debe adaptarse al contrato, al plan y a la "
        "legislación aplicable. No sustituye la revisión de un abogado."
    )
    set_run_font(run, ed["font"], 9, bold=True)
    shade_paragraph(paragraph, "FFF4CE")
    add_paragraph_border(paragraph, color="D4A72C", size="6")
    paragraph.paragraph_format.left_indent = Cm(0.3)
    paragraph.paragraph_format.right_indent = Cm(0.3)


def render_legal_body(doc, ed, text: str):
    soup = BeautifulSoup(MD.render(text), "html.parser")
    body = soup.body or soup
    for element in body.find_all(True, recursive=False):
        name = element.name
        if name == "h1":
            continue
        if name in ("h2", "h3", "h4"):
            add_heading(doc, element.get_text(" ", strip=True), int(name[1]), ed)
        elif name == "p":
            if element.get_text(" ", strip=True):
                add_body_paragraph(doc, ed, element)
        elif name in ("ul", "ol"):
            add_list(doc, ed, element)
        elif name == "table":
            headers = [th.get_text(" ", strip=True) for th in element.select("thead th")]
            rows = []
            for tr in element.select("tbody tr"):
                rows.append([td.get_text(" ", strip=True) for td in tr.find_all("td")])
            if not headers:
                first = element.find("tr")
                if first:
                    headers = [th.get_text(" ", strip=True) for th in first.find_all(["th", "td"])]
            table_from_rows(doc, headers, rows, ed["font"], ed["table_size"] - 0.5,
                            **table_opts(ed))
            doc.add_paragraph()
        elif name == "blockquote":
            paragraph = doc.add_paragraph(style="Gcom Quote")
            add_inline(doc, paragraph, element, ed)
            add_left_border(paragraph)
        elif name == "hr":
            add_horizontal_rule(doc)


def add_signatures(doc, ed, meta):
    page_break(doc)
    front_title(doc, "Firmas")
    paragraph = doc.add_paragraph(
        "Las partes firman en dos ejemplares de igual valor. La firma electrónica "
        "se reconoce conforme a la Ley 527 de 1999."
    )
    paragraph.paragraph_format.space_after = Pt(30)
    table = doc.add_table(rows=1, cols=2)
    table.autofit = True
    for index, role in enumerate(["EL PRESTADOR", "EL CLIENTE"]):
        cell = table.rows[0].cells[index]
        cell.text = ""
        for line, bold in [
            (role, True),
            ("", False),
            ("____________________________________", False),
            ("[NOMBRE DEL REPRESENTANTE LEGAL]", False),
            ("C.C. [NÚMERO]", False),
            ("Representante legal", False),
            ("", False),
            ("Fecha: __________________", False),
        ]:
            paragraph = cell.add_paragraph()
            run = paragraph.add_run(line)
            set_run_font(run, ed["font"], 10, bold=bold)
            paragraph.paragraph_format.space_after = Pt(2)
    doc.add_paragraph()
    paragraph = doc.add_paragraph(
        f"{meta['code']} · {meta['title']} · Versión 1.0 (borrador) · {DATE}"
    )
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = paragraph.runs[0]
    set_run_font(run, ed["font"], 8.5, color=GREY)


def build_legal(meta):
    source = LEGAL_SRC / meta["file"]
    if not source.exists():
        print(f"AVISO: falta {source}")
        return None
    doc = Document()
    ed = configure_legal(doc, meta)
    add_legal_cover(doc, ed, meta)
    add_legal_front(doc, ed, meta)
    page_break(doc)
    text = source.read_text(encoding="utf-8")
    render_legal_body(doc, ed, text)
    if meta["signature"]:
        add_signatures(doc, ed, meta)
    mark_update_fields(doc)
    output = OUT / "legal" / f"{meta['code']}-{meta['file'].replace('.md', '.docx')}"
    output.parent.mkdir(parents=True, exist_ok=True)
    doc.save(output)
    print(f"OK {output}")
    return output


def build_legal_index():
    doc = Document()
    meta = dict(code="GC-LEG-00", title="Índice del paquete legal",
                summary="Documentos contractuales, políticas y anexos.")
    ed = configure_legal(doc, meta)
    add_legal_cover(doc, ed, meta)
    page_break(doc)
    front_title(doc, "Contenido del paquete")
    rows = [[item["code"], item["title"], item["summary"]] for item in LEGAL]
    table_from_rows(doc, ["Código", "Documento", "Contenido"], rows, ed["font"], 8.5,
                    widths=[2.2, 5.6, 7.7], **table_opts(ed))
    doc.add_paragraph()
    paragraph = doc.add_paragraph(
        "Los trece documentos comparten placeholders de identificación. Antes de "
        "usarlos, complete [RAZÓN SOCIAL], [NIT], [DOMICILIO], [REPRESENTANTE "
        "LEGAL], [CORREO DE CONTACTO], [TELÉFONO], [SITIO WEB] y [FECHA DE "
        "ENTRADA EN VIGOR]. Todos son borradores para revisión jurídica."
    )
    paragraph.paragraph_format.space_after = Pt(8)
    mark_update_fields(doc)
    output = OUT / "legal" / "GC-LEG-00-Indice-legal.docx"
    output.parent.mkdir(parents=True, exist_ok=True)
    doc.save(output)
    print(f"OK {output}")
    return output


# ---------------------------------------------------------------------------
# Entrada
# ---------------------------------------------------------------------------

def main() -> int:
    if not MANIFEST.exists():
        print("Falta el manifiesto de diagramas. Ejecute render_diagrams.py primero.")
        return 1
    OUT.mkdir(parents=True, exist_ok=True)
    for ed in EDITIONS:
        build_tome(ed)
    build_legal_index()
    for meta in LEGAL:
        build_legal(meta)
    print("\nListo. Archivos en docs/entregables/word/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
