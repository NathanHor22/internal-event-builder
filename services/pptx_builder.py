"""
Builds a PowerPoint file from the structured slide content produced by slide_service.
Focus is entirely on content layout and narrative clarity — colours/branding are
intentionally minimal so Synapze designers can apply their own theme later.
"""
import os
import io
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.util import Inches, Pt

# ── Slide dimensions (widescreen 16:9) ────────────────────────────────────────
SLIDE_W = Inches(13.33)
SLIDE_H = Inches(7.5)

# ── Neutral colour palette — intentionally plain, easy to retheme ─────────────
C_BLACK      = RGBColor(0x1A, 0x1A, 0x1A)
C_DARK_GREY  = RGBColor(0x33, 0x33, 0x33)
C_MID_GREY   = RGBColor(0x66, 0x66, 0x66)
C_LIGHT_GREY = RGBColor(0xCC, 0xCC, 0xCC)
C_WHITE      = RGBColor(0xFF, 0xFF, 0xFF)
C_ACCENT     = RGBColor(0xCC, 0x78, 0x5C)   # Synapze terracotta
C_BG_DARK    = RGBColor(0x1E, 0x1E, 0x1E)
C_BG_LIGHT   = RGBColor(0xF5, 0xF5, 0xF5)

# ── Margin constants ──────────────────────────────────────────────────────────
MARGIN_L = Inches(0.8)
MARGIN_T = Inches(0.7)
CONTENT_W = SLIDE_W - Inches(1.6)
CONTENT_H = SLIDE_H - Inches(1.4)


def _solid_fill(shape, color: RGBColor):
    shape.fill.solid()
    shape.fill.fore_color.rgb = color


def _add_textbox(slide, text, left, top, width, height,
                 font_size=14, bold=False, color=C_BLACK,
                 align=PP_ALIGN.LEFT, wrap=True):
    txb = slide.shapes.add_textbox(left, top, width, height)
    tf = txb.text_frame
    tf.word_wrap = wrap
    p = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    run.font.size = Pt(font_size)
    run.font.bold = bold
    run.font.color.rgb = color
    return txb


def _add_label(slide, text, left, top, width, height,
               font_size=10, bold=False, color=C_MID_GREY, align=PP_ALIGN.LEFT):
    return _add_textbox(slide, text, left, top, width, height,
                        font_size=font_size, bold=bold, color=color, align=align)


def _add_bullet_textbox(slide, points, left, top, width, height,
                        font_size=13, color=C_DARK_GREY, bullet_char="•"):
    txb = slide.shapes.add_textbox(left, top, width, height)
    tf = txb.text_frame
    tf.word_wrap = True
    first = True
    for pt in points:
        p = tf.paragraphs[0] if first else tf.add_paragraph()
        first = False
        p.space_before = Pt(4)
        run = p.add_run()
        run.text = f"{bullet_char}  {pt}"
        run.font.size = Pt(font_size)
        run.font.color.rgb = color
    return txb


def _slide_bg(slide, color: RGBColor):
    bg = slide.background
    fill = bg.fill
    fill.solid()
    fill.fore_color.rgb = color


def _accent_bar(slide, width=Inches(0.06), height=Inches(1.2)):
    """Thin vertical accent bar on the left."""
    bar = slide.shapes.add_shape(
        1,  # MSO_SHAPE_TYPE.RECTANGLE
        MARGIN_L - Inches(0.25), MARGIN_T + Inches(0.2), width, height
    )
    _solid_fill(bar, C_ACCENT)
    bar.line.fill.background()


def _divider_line(slide, top, color=C_LIGHT_GREY, thickness=Pt(1)):
    line = slide.shapes.add_shape(1, MARGIN_L, top, CONTENT_W, Inches(0.01))
    _solid_fill(line, color)
    line.line.fill.background()


# ── Slide type renderers ───────────────────────────────────────────────────────

def _render_cover(slide, wizard_answers: dict, disclaimer: str):
    _slide_bg(slide, C_BG_DARK)

    # Prepared for label
    _add_textbox(slide, "PREPARED FOR", MARGIN_L, Inches(1.5), Inches(6), Inches(0.4),
                 font_size=9, bold=True, color=C_ACCENT)
    _add_textbox(slide, wizard_answers.get('client_name', '').upper(),
                 MARGIN_L, Inches(1.9), Inches(9), Inches(0.8),
                 font_size=28, bold=True, color=C_WHITE)

    # Presented by label
    _add_textbox(slide, "PRESENTED BY", MARGIN_L, Inches(2.9), Inches(6), Inches(0.4),
                 font_size=9, bold=True, color=C_ACCENT)
    _add_textbox(slide, "SYNAPZE SDN BHD", MARGIN_L, Inches(3.3), Inches(6), Inches(0.5),
                 font_size=18, bold=True, color=C_WHITE)

    # Event title
    _add_textbox(slide, wizard_answers.get('event_name', 'Event Title'),
                 MARGIN_L, Inches(4.2), Inches(11), Inches(1.0),
                 font_size=36, bold=True, color=C_WHITE)

    # Theme / tagline
    theme = wizard_answers.get('theme', '')
    if theme:
        _add_textbox(slide, theme, MARGIN_L, Inches(5.2), Inches(9), Inches(0.5),
                     font_size=16, color=C_LIGHT_GREY)

    # Date + location
    meta = []
    if wizard_answers.get('event_date'):
        meta.append(wizard_answers['event_date'])
    if wizard_answers.get('location'):
        meta.append(wizard_answers['location'])
    if meta:
        _add_textbox(slide, "  ·  ".join(meta), MARGIN_L, Inches(5.8), Inches(10), Inches(0.4),
                     font_size=12, color=C_MID_GREY)

    # Disclaimer box at bottom
    disc_top = Inches(6.5)
    disc_box = slide.shapes.add_shape(1, MARGIN_L, disc_top, CONTENT_W, Inches(0.75))
    _solid_fill(disc_box, RGBColor(0x2A, 0x2A, 0x2A))
    disc_box.line.fill.background()
    _add_textbox(slide, disclaimer,
                 MARGIN_L + Inches(0.1), disc_top + Inches(0.08),
                 CONTENT_W - Inches(0.2), Inches(0.65),
                 font_size=7, color=C_MID_GREY)


def _render_section_divider(slide, data: dict):
    _slide_bg(slide, C_BG_DARK)
    title = data.get('title', '')
    subtitle = data.get('subtitle', '')

    # Large accent rectangle on left
    bar = slide.shapes.add_shape(1, Inches(0), Inches(2.5), Inches(0.15), Inches(2.5))
    _solid_fill(bar, C_ACCENT)
    bar.line.fill.background()

    _add_textbox(slide, title, Inches(0.5), Inches(2.8), Inches(12), Inches(1.2),
                 font_size=42, bold=True, color=C_WHITE)
    if subtitle:
        _add_textbox(slide, subtitle, Inches(0.5), Inches(4.1), Inches(10), Inches(0.6),
                     font_size=18, color=C_LIGHT_GREY)


def _render_title_body(slide, data: dict):
    _slide_bg(slide, C_BG_LIGHT)
    _accent_bar(slide)

    title = data.get('title', '')
    body = data.get('body', '')
    points = data.get('key_points', [])

    _add_textbox(slide, title, MARGIN_L, MARGIN_T, CONTENT_W, Inches(0.65),
                 font_size=24, bold=True, color=C_BLACK)
    _divider_line(slide, MARGIN_T + Inches(0.7))

    y = MARGIN_T + Inches(0.85)
    if body:
        _add_textbox(slide, body, MARGIN_L, y, CONTENT_W, Inches(1.4),
                     font_size=13, color=C_DARK_GREY)
        y += Inches(1.5)

    if points:
        _add_bullet_textbox(slide, points, MARGIN_L, y, CONTENT_W,
                            SLIDE_H - y - Inches(0.4))


def _render_two_column(slide, data: dict):
    _slide_bg(slide, C_BG_LIGHT)
    _accent_bar(slide)

    title = data.get('title', '')
    _add_textbox(slide, title, MARGIN_L, MARGIN_T, CONTENT_W, Inches(0.65),
                 font_size=24, bold=True, color=C_BLACK)
    _divider_line(slide, MARGIN_T + Inches(0.7))

    col_w = (CONTENT_W - Inches(0.4)) / 2
    y = MARGIN_T + Inches(0.9)
    col_h = SLIDE_H - y - Inches(0.4)

    # Left column
    lh = data.get('left_heading', '')
    lb = data.get('left_body', '')
    lpts = data.get('left_points', [])
    if lh:
        _add_textbox(slide, lh, MARGIN_L, y, col_w, Inches(0.45),
                     font_size=14, bold=True, color=C_ACCENT)
    if lb:
        _add_textbox(slide, lb, MARGIN_L, y + Inches(0.5), col_w, col_h - Inches(0.5),
                     font_size=12, color=C_DARK_GREY)
    if lpts:
        _add_bullet_textbox(slide, lpts, MARGIN_L, y + Inches(0.5), col_w, col_h - Inches(0.5))

    # Separator
    sep = slide.shapes.add_shape(1, MARGIN_L + col_w + Inches(0.15), y,
                                  Inches(0.01), col_h)
    _solid_fill(sep, C_LIGHT_GREY)
    sep.line.fill.background()

    # Right column
    rh = data.get('right_heading', '')
    rb = data.get('right_body', '')
    rpts = data.get('right_points', [])
    rx = MARGIN_L + col_w + Inches(0.4)
    if rh:
        _add_textbox(slide, rh, rx, y, col_w, Inches(0.45),
                     font_size=14, bold=True, color=C_ACCENT)
    if rb:
        _add_textbox(slide, rb, rx, y + Inches(0.5), col_w, col_h - Inches(0.5),
                     font_size=12, color=C_DARK_GREY)
    if rpts:
        _add_bullet_textbox(slide, rpts, rx, y + Inches(0.5), col_w, col_h - Inches(0.5))


def _render_three_column(slide, data: dict):
    _slide_bg(slide, C_BG_LIGHT)
    _accent_bar(slide)

    title = data.get('title', '')
    _add_textbox(slide, title, MARGIN_L, MARGIN_T, CONTENT_W, Inches(0.65),
                 font_size=24, bold=True, color=C_BLACK)
    _divider_line(slide, MARGIN_T + Inches(0.7))

    columns = data.get('columns', [])
    n = len(columns)
    if n == 0:
        return
    gap = Inches(0.25)
    col_w = (CONTENT_W - gap * (n - 1)) / n
    y = MARGIN_T + Inches(0.9)
    col_h = SLIDE_H - y - Inches(0.4)

    for i, col in enumerate(columns):
        x = MARGIN_L + (col_w + gap) * i
        heading = col.get('heading', '')
        body = col.get('body', '')
        points = col.get('points', [])

        # Column background box
        bg = slide.shapes.add_shape(1, x, y, col_w, col_h)
        _solid_fill(bg, RGBColor(0xEE, 0xEE, 0xEE))
        bg.line.fill.background()

        pad = Inches(0.15)
        if heading:
            _add_textbox(slide, heading, x + pad, y + pad, col_w - pad*2, Inches(0.5),
                         font_size=13, bold=True, color=C_ACCENT)
        if body:
            _add_textbox(slide, body, x + pad, y + Inches(0.7), col_w - pad*2,
                         col_h - Inches(0.9), font_size=11, color=C_DARK_GREY)
        if points:
            _add_bullet_textbox(slide, points, x + pad, y + Inches(0.7),
                                col_w - pad*2, col_h - Inches(0.9), font_size=11)


def _render_stat_highlight(slide, data: dict):
    _slide_bg(slide, C_BG_DARK)

    title = data.get('title', '')
    stats = data.get('stats', [])
    supporting = data.get('supporting_text', '')

    _add_textbox(slide, title, MARGIN_L, MARGIN_T, CONTENT_W, Inches(0.65),
                 font_size=24, bold=True, color=C_WHITE)
    _divider_line(slide, MARGIN_T + Inches(0.7), color=RGBColor(0x44, 0x44, 0x44))

    n = len(stats)
    if n == 0:
        return
    gap = Inches(0.3)
    stat_w = (CONTENT_W - gap * (n - 1)) / n
    y = MARGIN_T + Inches(1.0)

    for i, stat in enumerate(stats):
        x = MARGIN_L + (stat_w + gap) * i
        # Box
        box = slide.shapes.add_shape(1, x, y, stat_w, Inches(2.5))
        _solid_fill(box, RGBColor(0x2A, 0x2A, 0x2A))
        box.line.fill.background()
        # Value
        _add_textbox(slide, stat.get('value', ''), x, y + Inches(0.4), stat_w, Inches(1.0),
                     font_size=36, bold=True, color=C_ACCENT, align=PP_ALIGN.CENTER)
        # Label
        _add_textbox(slide, stat.get('label', ''), x, y + Inches(1.5), stat_w, Inches(0.8),
                     font_size=11, color=C_LIGHT_GREY, align=PP_ALIGN.CENTER)

    if supporting:
        _add_textbox(slide, supporting, MARGIN_L, y + Inches(2.8), CONTENT_W, Inches(0.8),
                     font_size=12, color=C_LIGHT_GREY)


def _render_agenda(slide, data: dict):
    _slide_bg(slide, C_BG_LIGHT)
    _accent_bar(slide)

    title = data.get('title', 'Event Agenda')
    _add_textbox(slide, title, MARGIN_L, MARGIN_T, CONTENT_W, Inches(0.65),
                 font_size=24, bold=True, color=C_BLACK)
    _divider_line(slide, MARGIN_T + Inches(0.7))

    days = data.get('days', [])
    n = len(days)
    if n == 0:
        return
    gap = Inches(0.3)
    col_w = (CONTENT_W - gap * (n - 1)) / n
    y = MARGIN_T + Inches(0.9)

    for i, day in enumerate(days):
        x = MARGIN_L + (col_w + gap) * i
        label = day.get('label', f'Day {i+1}')
        items = day.get('items', [])

        _add_textbox(slide, label, x, y, col_w, Inches(0.45),
                     font_size=13, bold=True, color=C_ACCENT)

        row_y = y + Inches(0.55)
        for item in items:
            time_str = item.get('time', '')
            activity = item.get('activity', '')
            if time_str:
                _add_label(slide, time_str, x, row_y, Inches(1.2), Inches(0.3),
                           font_size=9, color=C_MID_GREY)
            _add_textbox(slide, activity, x + Inches(1.25), row_y, col_w - Inches(1.3),
                         Inches(0.35), font_size=11, color=C_DARK_GREY)
            row_y += Inches(0.38)
            if row_y > SLIDE_H - Inches(0.5):
                break


def _render_pillars(slide, data: dict):
    _slide_bg(slide, C_BG_LIGHT)
    _accent_bar(slide)

    title = data.get('title', '')
    intro = data.get('intro', '')
    pillars = data.get('pillars', [])

    _add_textbox(slide, title, MARGIN_L, MARGIN_T, CONTENT_W, Inches(0.65),
                 font_size=24, bold=True, color=C_BLACK)
    _divider_line(slide, MARGIN_T + Inches(0.7))

    y = MARGIN_T + Inches(0.85)
    if intro:
        _add_textbox(slide, intro, MARGIN_L, y, CONTENT_W, Inches(0.5),
                     font_size=13, color=C_MID_GREY)
        y += Inches(0.6)

    n = len(pillars)
    if n == 0:
        return
    gap = Inches(0.2)
    max_cols = min(n, 4)
    rows = (n + max_cols - 1) // max_cols
    col_w = (CONTENT_W - gap * (max_cols - 1)) / max_cols
    avail_h = SLIDE_H - y - Inches(0.4)
    row_h = (avail_h - gap * (rows - 1)) / rows

    for idx, pillar in enumerate(pillars):
        row = idx // max_cols
        col = idx % max_cols
        x = MARGIN_L + (col_w + gap) * col
        py = y + (row_h + gap) * row

        # Box
        box = slide.shapes.add_shape(1, x, py, col_w, row_h)
        _solid_fill(box, RGBColor(0xEE, 0xEE, 0xEE))
        box.line.fill.background()

        # Number badge
        num_w = Inches(0.5)
        num_box = slide.shapes.add_shape(1, x, py, num_w, Inches(0.38))
        _solid_fill(num_box, C_ACCENT)
        num_box.line.fill.background()
        _add_textbox(slide, pillar.get('number', str(idx + 1).zfill(2)),
                     x, py, num_w, Inches(0.38),
                     font_size=10, bold=True, color=C_WHITE, align=PP_ALIGN.CENTER)

        pad = Inches(0.12)
        _add_textbox(slide, pillar.get('heading', ''),
                     x + pad, py + Inches(0.42), col_w - pad*2, Inches(0.42),
                     font_size=12, bold=True, color=C_DARK_GREY)
        _add_textbox(slide, pillar.get('body', ''),
                     x + pad, py + Inches(0.9), col_w - pad*2, row_h - Inches(1.0),
                     font_size=10, color=C_MID_GREY)


def _render_about(slide, data: dict):
    """Fixed About Synapze slide."""
    _render_two_column(slide, data)


def _render_contact(slide, data: dict):
    _slide_bg(slide, C_BG_DARK)
    _add_textbox(slide, data.get('title', "Let's Build Something Together"),
                 MARGIN_L, Inches(1.5), CONTENT_W, Inches(1.2),
                 font_size=36, bold=True, color=C_WHITE)
    _divider_line(slide, Inches(2.9), color=C_ACCENT)
    _add_textbox(slide, data.get('tagline', ''), MARGIN_L, Inches(3.1), CONTENT_W, Inches(0.5),
                 font_size=16, color=C_ACCENT)
    _add_textbox(slide, data.get('website', ''), MARGIN_L, Inches(4.0), Inches(5), Inches(0.5),
                 font_size=14, color=C_WHITE)
    _add_textbox(slide, data.get('address', ''), MARGIN_L, Inches(4.6), CONTENT_W, Inches(0.8),
                 font_size=12, color=C_MID_GREY)


# ── Dispatch table ─────────────────────────────────────────────────────────────
_RENDERERS = {
    'section_divider': _render_section_divider,
    'title_body':      _render_title_body,
    'two_column':      _render_two_column,
    'three_column':    _render_three_column,
    'stat_highlight':  _render_stat_highlight,
    'agenda':          _render_agenda,
    'pillars':         _render_pillars,
    'about':           _render_about,
    'contact':         _render_contact,
}


def _render_key_visuals_images(prs, blank_layout, image_paths: list, wizard_answers: dict):
    """Adds a Key Visuals Reference slide with uploaded images in a grid."""
    slide = prs.slides.add_slide(blank_layout)
    _slide_bg(slide, C_BG_LIGHT)
    _accent_bar(slide)
    _add_textbox(slide, "Key Visuals Reference", MARGIN_L, MARGIN_T, CONTENT_W, Inches(0.65),
                 font_size=24, bold=True, color=C_BLACK)
    _divider_line(slide, MARGIN_T + Inches(0.7))

    concept = wizard_answers.get('key_visuals', '')
    if concept:
        _add_textbox(slide, concept, MARGIN_L, MARGIN_T + Inches(0.85), CONTENT_W, Inches(0.5),
                     font_size=12, color=C_MID_GREY)

    # Place images in a row
    y = MARGIN_T + Inches(1.5 if concept else 0.95)
    available_h = SLIDE_H - y - Inches(0.3)
    n = len(image_paths)
    gap = Inches(0.15)
    img_w = min((CONTENT_W - gap * (n - 1)) / n, Inches(3.5))
    img_h = min(available_h, Inches(3.2))
    x_start = MARGIN_L

    for i, img_path in enumerate(image_paths):
        x = x_start + (img_w + gap) * i
        try:
            slide.shapes.add_picture(img_path, x, y, img_w, img_h)
        except Exception:
            # If image fails, add a placeholder box
            ph = slide.shapes.add_shape(1, x, y, img_w, img_h)
            _solid_fill(ph, RGBColor(0xDD, 0xDD, 0xDD))
            ph.line.fill.background()


def build_pptx(slide_data: dict, image_paths: list = None) -> bytes:
    """
    Build a PPTX file from slide_data (output of slide_service.generate_slide_content).
    Returns raw bytes.
    """
    prs = Presentation()
    prs.slide_width  = SLIDE_W
    prs.slide_height = SLIDE_H

    blank_layout = prs.slide_layouts[6]  # Blank layout

    wizard_answers = slide_data.get('wizard_answers', {})
    disclaimer = slide_data.get('disclaimer', '')

    # 1 — Cover slide
    cover_slide = prs.slides.add_slide(blank_layout)
    _render_cover(cover_slide, wizard_answers, disclaimer)

    # 2 — Content slides
    for slide_def in slide_data.get('slides', []):
        s_type = slide_def.get('type', 'title_body')
        renderer = _RENDERERS.get(s_type, _render_title_body)
        sl = prs.slides.add_slide(blank_layout)
        renderer(sl, slide_def)

    # 3 — Key Visuals image slide (if images were uploaded)
    if image_paths:
        _render_key_visuals_images(prs, blank_layout, image_paths, wizard_answers)

    buf = io.BytesIO()
    prs.save(buf)
    return buf.getvalue()
