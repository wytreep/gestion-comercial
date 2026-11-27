"""Utilidades compartidas para construir los .docx de entrega."""

from __future__ import annotations

from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_LINE_SPACING, WD_TAB_ALIGNMENT
from docx.opc.constants import RELATIONSHIP_TYPE as RT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor


BLACK = RGBColor(0x00, 0x00, 0x00)
GREY = RGBColor(0x59, 0x59, 0x59)
DARK = RGBColor(0x1F, 0x23, 0x28)
ACCENT = RGBColor(0x1F, 0x4E, 0x79)
LINK = RGBColor(0x05, 0x63, 0xC1)


def set_run_font(run, name: str, size: float | None = None, bold=None,
                 italic=None, color=None, small_caps=None, all_caps=None):
    run.font.name = name
    rpr = run._r.get_or_add_rPr()
    rfonts = rpr.find(qn("w:rFonts"))
    if rfonts is None:
        rfonts = OxmlElement("w:rFonts")
        rpr.insert(0, rfonts)
    for attr in ("w:ascii", "w:hAnsi", "w:eastAsia", "w:cs"):
        rfonts.set(qn(attr), name)
    if size is not None:
        run.font.size = Pt(size)
    if bold is not None:
        run.font.bold = bold
    if italic is not None:
        run.font.italic = italic
    if color is not None:
        run.font.color.rgb = color
    if small_caps is not None:
        run.font.small_caps = small_caps
    if all_caps is not None:
        run.font.all_caps = all_caps


def style_font(style, name: str, size: float, bold=False, italic=False,
               color=BLACK, small_caps=False):
    style.font.name = name
    rpr = style.element.get_or_add_rPr()
    rfonts = rpr.find(qn("w:rFonts"))
    if rfonts is None:
        rfonts = OxmlElement("w:rFonts")
        rpr.insert(0, rfonts)
    for attr in ("w:ascii", "w:hAnsi", "w:eastAsia", "w:cs"):
        rfonts.set(qn(attr), name)
    style.font.size = Pt(size)
    style.font.bold = bold
    style.font.italic = italic
    style.font.color.rgb = color
    style.font.small_caps = small_caps


def add_field(paragraph, instr: str, placeholder: str = ""):
    run = paragraph.add_run()
    begin = OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"), "begin")
    text = OxmlElement("w:instrText")
    text.set(qn("xml:space"), "preserve")
    text.text = f" {instr} "
    separate = OxmlElement("w:fldChar")
    separate.set(qn("w:fldCharType"), "separate")
    value = OxmlElement("w:t")
    value.text = placeholder
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    for element in (begin, text, separate, value, end):
        run._r.append(element)
    return run


def add_page_x_of_y(paragraph, prefix: str = "Página "):
    run = paragraph.add_run(prefix)
    set_run_font(run, paragraph.style.font.name or "Times New Roman", 8.5, color=GREY)
    add_field(paragraph, "PAGE", "1")
    run = paragraph.add_run(" de ")
    set_run_font(run, paragraph.style.font.name or "Times New Roman", 8.5, color=GREY)
    add_field(paragraph, "NUMPAGES", "1")


def add_toc(doc, levels: str = "1-3"):
    paragraph = doc.add_paragraph()
    paragraph.paragraph_format.space_after = Pt(6)
    run = paragraph.add_run()
    begin = OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = f' TOC \\o "{levels}" \\h \\z \\u '
    separate = OxmlElement("w:fldChar")
    separate.set(qn("w:fldCharType"), "separate")
    value = OxmlElement("w:t")
    value.text = "Actualice los campos (F9) para generar la tabla de contenido."
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    for element in (begin, instr, separate, value, end):
        run._r.append(element)


def mark_update_fields(doc):
    settings = doc.settings.element
    for existing in settings.findall(qn("w:updateFields")):
        settings.remove(existing)
    update = OxmlElement("w:updateFields")
    update.set(qn("w:val"), "true")
    settings.append(update)


def add_hyperlink(paragraph, url: str, text: str, font: str, size: float,
                  color=LINK):
    part = paragraph.part
    rel_id = part.relate_to(url, RT.HYPERLINK, is_external=True)
    hyperlink = OxmlElement("w:hyperlink")
    hyperlink.set(qn("r:id"), rel_id)
    run = OxmlElement("w:r")
    rpr = OxmlElement("w:rPr")
    rfonts = OxmlElement("w:rFonts")
    for attr in ("w:ascii", "w:hAnsi", "w:eastAsia", "w:cs"):
        rfonts.set(qn(attr), font)
    rpr.append(rfonts)
    color_el = OxmlElement("w:color")
    color_el.set(qn("w:val"), f"{color}")
    rpr.append(color_el)
    size_el = OxmlElement("w:sz")
    size_el.set(qn("w:val"), str(int(size * 2)))
    rpr.append(size_el)
    underline = OxmlElement("w:u")
    underline.set(qn("w:val"), "single")
    rpr.append(underline)
    run.append(rpr)
    value = OxmlElement("w:t")
    value.set(qn("xml:space"), "preserve")
    value.text = text
    run.append(value)
    hyperlink.append(run)
    paragraph._p.append(hyperlink)


def shade_cell(cell, fill: str):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), fill)
    tc_pr.append(shd)


def shade_paragraph(paragraph, fill: str):
    p_pr = paragraph._p.get_or_add_pPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), fill)
    p_pr.append(shd)


def set_table_borders(table, color: str = "A6A6A6", size: str = "4",
                      vertical: bool = True, horizontal: bool = True):
    tbl_pr = table._tbl.tblPr
    for existing in tbl_pr.findall(qn("w:tblBorders")):
        tbl_pr.remove(existing)
    borders = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        element = OxmlElement(f"w:{edge}")
        if not vertical and edge in ("left", "right", "insideV"):
            element.set(qn("w:val"), "none")
            element.set(qn("w:sz"), "0")
        elif not horizontal and edge == "insideH":
            element.set(qn("w:val"), "none")
            element.set(qn("w:sz"), "0")
        else:
            element.set(qn("w:val"), "single")
            element.set(qn("w:sz"), size)
        element.set(qn("w:space"), "0")
        element.set(qn("w:color"), color)
        borders.append(element)
    tbl_pr.append(borders)


def set_cell_bottom_border(cell, color: str = "A6A6A6", size: str = "4"):
    """Regla inferior explícita para la fila de encabezado (estilo APA/IEEE)."""
    tc_pr = cell._tc.get_or_add_tcPr()
    borders = tc_pr.find(qn("w:tcBorders"))
    if borders is None:
        borders = OxmlElement("w:tcBorders")
        tc_pr.append(borders)
    bottom = borders.find(qn("w:bottom"))
    if bottom is None:
        bottom = OxmlElement("w:bottom")
        borders.append(bottom)
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), size)
    bottom.set(qn("w:space"), "0")
    bottom.set(qn("w:color"), color)


def suppress_hyphenation(style):
    ppr = style.element.get_or_add_pPr()
    if ppr.find(qn("w:suppressAutoHyphens")) is None:
        ppr.append(OxmlElement("w:suppressAutoHyphens"))


def suppress_paragraph_hyphenation(paragraph):
    """Evita cortes como «noviem-bre» en celdas y leyendas estrechas."""
    ppr = paragraph._p.get_or_add_pPr()
    if ppr.find(qn("w:suppressAutoHyphens")) is None:
        ppr.insert_element_before(
            OxmlElement("w:suppressAutoHyphens"),
            "w:spacing", "w:ind", "w:jc", "w:rPr",
        )


def set_style_language(style, lang: str = "es-CO"):
    rpr = style.element.get_or_add_rPr()
    for existing in rpr.findall(qn("w:lang")):
        rpr.remove(existing)
    element = OxmlElement("w:lang")
    element.set(qn("w:val"), lang)
    element.set(qn("w:eastAsia"), lang)
    element.set(qn("w:bidi"), "ar-SA")
    rpr.append(element)


def enable_hyphenation(doc):
    """Activa la partición de palabras en la posición que exige el esquema OOXML.

    Si los elementos van al final del archivo, Word los ignora en silencio y la
    justificación deja huecos enormes entre palabras.
    """
    settings = doc.settings.element
    tags = (
        ("w:autoHyphenation", "true"),
        ("w:consecutiveHyphenLimit", "2"),
        ("w:hyphenationZone", "357"),
        ("w:doNotHyphenateCaps", "true"),
    )
    for tag, _ in tags:
        for existing in settings.findall(qn(tag)):
            settings.remove(existing)

    anchor = settings.find(qn("w:defaultTabStop"))
    if anchor is None:
        anchor = settings.find(qn("w:characterSpacingControl"))
    if anchor is None:
        anchor = settings.find(qn("w:zoom"))

    previous = anchor
    for tag, value in tags:
        element = OxmlElement(tag)
        element.set(qn("w:val"), value)
        if previous is None:
            settings.insert(0, element)
        else:
            previous.addnext(element)
        previous = element


def set_repeat_table_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    header = OxmlElement("w:tblHeader")
    header.set(qn("w:val"), "true")
    tr_pr.append(header)


def set_cant_split(row):
    tr_pr = row._tr.get_or_add_trPr()
    tr_pr.append(OxmlElement("w:cantSplit"))


def set_cell_margins(table, top=60, bottom=60, left=90, right=90):
    tbl_pr = table._tbl.tblPr
    mar = OxmlElement("w:tblCellMar")
    for name, value in (("top", top), ("left", left), ("bottom", bottom), ("right", right)):
        element = OxmlElement(f"w:{name}")
        element.set(qn("w:w"), str(value))
        element.set(qn("w:type"), "dxa")
        mar.append(element)
    tbl_pr.append(mar)


def set_table_width(table, percent: int = 100):
    tbl_pr = table._tbl.tblPr
    width = OxmlElement("w:tblW")
    width.set(qn("w:w"), str(percent * 50))
    width.set(qn("w:type"), "pct")
    tbl_pr.append(width)


def add_horizontal_rule(doc, color: str = "BFBFBF", size: str = "6",
                        space_before: float = 4, space_after: float = 8):
    paragraph = doc.add_paragraph()
    paragraph.paragraph_format.space_before = Pt(space_before)
    paragraph.paragraph_format.space_after = Pt(space_after)
    p_pr = paragraph._p.get_or_add_pPr()
    borders = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), size)
    bottom.set(qn("w:space"), "1")
    bottom.set(qn("w:color"), color)
    borders.append(bottom)
    p_pr.append(borders)
    return paragraph


def add_paragraph_border(paragraph, color: str = "D0D7DE", size: str = "4"):
    p_pr = paragraph._p.get_or_add_pPr()
    borders = OxmlElement("w:pBdr")
    for edge in ("top", "left", "bottom", "right"):
        element = OxmlElement(f"w:{edge}")
        element.set(qn("w:val"), "single")
        element.set(qn("w:sz"), size)
        element.set(qn("w:space"), "4")
        element.set(qn("w:color"), color)
        borders.append(element)
    p_pr.append(borders)


def add_left_border(paragraph, color: str = "1F4E79", size: str = "18"):
    p_pr = paragraph._p.get_or_add_pPr()
    borders = OxmlElement("w:pBdr")
    left = OxmlElement("w:left")
    left.set(qn("w:val"), "single")
    left.set(qn("w:sz"), size)
    left.set(qn("w:space"), "8")
    left.set(qn("w:color"), color)
    borders.append(left)
    p_pr.append(borders)


def add_header_footer(section, font: str, header_left: str, header_right: str,
                      footer_left: str, footer_right_prefix: str = "Página ",
                      first_page: bool = True):
    section.different_first_page_header_footer = first_page
    width = section.page_width - section.left_margin - section.right_margin

    header = section.header
    header.is_linked_to_previous = False
    paragraph = header.paragraphs[0]
    paragraph.text = ""
    paragraph.paragraph_format.tab_stops.add_tab_stop(
        width, WD_TAB_ALIGNMENT.RIGHT
    )
    run = paragraph.add_run(header_left)
    set_run_font(run, font, 8.5, color=GREY)
    run = paragraph.add_run("\t" + header_right)
    set_run_font(run, font, 8.5, color=GREY)
    add_paragraph_border(paragraph, color="D0D7DE", size="4")

    footer = section.footer
    footer.is_linked_to_previous = False
    paragraph = footer.paragraphs[0]
    paragraph.text = ""
    paragraph.paragraph_format.tab_stops.add_tab_stop(
        width, WD_TAB_ALIGNMENT.RIGHT
    )
    run = paragraph.add_run(footer_left)
    set_run_font(run, font, 8.5, color=GREY)
    run = paragraph.add_run("\t")
    set_run_font(run, font, 8.5, color=GREY)
    add_page_x_of_y(paragraph, footer_right_prefix)


def page_break(doc):
    doc.add_page_break()


def set_page_layout(section, page: str, margins: tuple[float, float, float, float],
                    header_distance: float = 1.25, footer_distance: float = 1.25):
    if page == "A4":
        section.page_width = Cm(21.0)
        section.page_height = Cm(29.7)
    else:
        section.page_width = Cm(21.59)
        section.page_height = Cm(27.94)
    top, bottom, left, right = margins
    section.top_margin = Cm(top)
    section.bottom_margin = Cm(bottom)
    section.left_margin = Cm(left)
    section.right_margin = Cm(right)
    section.header_distance = Cm(header_distance)
    section.footer_distance = Cm(footer_distance)


def table_from_rows(doc, headers: list[str], rows: list[list[str]], font: str,
                    size: float, widths: list[float] | None = None,
                    header_fill: str | None = "E7E6E6", align_center: bool = False,
                    bold_first_col: bool = False, vertical: bool = True,
                    horizontal: bool = True):
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style = "Table Grid"
    table.autofit = True
    set_table_width(table, 100)
    set_table_borders(table, vertical=vertical, horizontal=horizontal)
    set_cell_margins(table)

    header_cells = table.rows[0].cells
    for index, text in enumerate(headers):
        cell = header_cells[index]
        cell.text = ""
        paragraph = cell.paragraphs[0]
        paragraph.paragraph_format.space_after = Pt(0)
        paragraph.paragraph_format.line_spacing = 1.0
        paragraph.paragraph_format.left_indent = Cm(0)
        paragraph.paragraph_format.first_line_indent = Cm(0)
        suppress_paragraph_hyphenation(paragraph)
        run = paragraph.add_run(text)
        set_run_font(run, font, size, bold=True)
        if header_fill:
            shade_cell(cell, header_fill)
        paragraph.alignment = (
            WD_ALIGN_PARAGRAPH.CENTER if align_center else WD_ALIGN_PARAGRAPH.LEFT
        )
    if not horizontal:
        for cell in header_cells:
            set_cell_bottom_border(cell)
    set_repeat_table_header(table.rows[0])
    set_cant_split(table.rows[0])

    for values in rows:
        row = table.add_row()
        set_cant_split(row)
        for index, text in enumerate(values):
            cell = row.cells[index]
            cell.text = ""
            paragraph = cell.paragraphs[0]
            paragraph.paragraph_format.space_after = Pt(0)
            paragraph.paragraph_format.line_spacing = 1.0
            paragraph.paragraph_format.left_indent = Cm(0)
            paragraph.paragraph_format.first_line_indent = Cm(0)
            suppress_paragraph_hyphenation(paragraph)
            run = paragraph.add_run(str(text))
            set_run_font(run, font, size, bold=(bold_first_col and index == 0))
            paragraph.alignment = (
                WD_ALIGN_PARAGRAPH.CENTER if align_center else WD_ALIGN_PARAGRAPH.LEFT
            )

    if widths:
        table.autofit = False
        for row in table.rows:
            for index, width in enumerate(widths):
                row.cells[index].width = Cm(width)
    return table
