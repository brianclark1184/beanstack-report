"""Create a printable monthly Beanstack reading log from dated entries."""

from __future__ import annotations

import argparse
import calendar
import json
from datetime import datetime
from pathlib import Path

from reportlab.lib.pagesizes import letter
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas


PAGE_WIDTH, PAGE_HEIGHT = letter


def register_fonts() -> tuple[str, str]:
    regular = Path(r"C:\Windows\Fonts\comic.ttf")
    bold = Path(r"C:\Windows\Fonts\comicbd.ttf")
    if regular.exists() and bold.exists():
        pdfmetrics.registerFont(TTFont("Friendly", regular))
        pdfmetrics.registerFont(TTFont("Friendly-Bold", bold))
        return "Friendly", "Friendly-Bold"
    return "Helvetica", "Helvetica-Bold"


def shrink_to_fit(text: str, font: str, preferred: float, width: float) -> float:
    size = preferred
    while size > 6 and pdfmetrics.stringWidth(text, font, size) > width:
        size -= 0.25
    return size


def wrap_to_fit(
    text: str,
    font: str,
    preferred: float,
    width: float,
    max_lines: int = 2,
) -> tuple[list[str], float]:
    """Wrap text into a small fixed number of lines, shrinking when necessary."""
    size = preferred
    while size >= 6:
        words = text.split()
        lines: list[str] = []
        current = ""
        for word in words:
            candidate = word if not current else f"{current} {word}"
            if pdfmetrics.stringWidth(candidate, font, size) <= width:
                current = candidate
            else:
                if current:
                    lines.append(current)
                current = word
        if current:
            lines.append(current)
        if len(lines) <= max_lines:
            return lines, size
        size -= 0.25
    return [text], shrink_to_fit(text, font, 6, width)


def draw_centered(canvas: Canvas, text: str, x0: float, x1: float, y: float) -> None:
    canvas.drawCentredString((x0 + x1) / 2, y, text)


def draw_table(
    canvas: Canvas,
    rows: list[dict[str, object]],
    slot_count: int,
    table_top: float,
    table_bottom: float,
    friendly_bold: str,
) -> None:
    """Draw a table and fill only rows backed by Beanstack data."""
    if len(rows) > slot_count:
        raise ValueError("More Beanstack rows than available first-page slots")

    x_positions = [26, 122, 425, 507, 586]
    header_height = 44
    row_height = (table_top - header_height - table_bottom) / slot_count

    canvas.setLineWidth(1.25)
    for x in x_positions:
        canvas.line(x, table_bottom, x, table_top)
    canvas.line(x_positions[0], table_top, x_positions[-1], table_top)
    canvas.line(
        x_positions[0], table_top - header_height, x_positions[-1], table_top - header_height
    )
    for index in range(slot_count + 1):
        y = table_top - header_height - index * row_height
        canvas.line(x_positions[0], y, x_positions[-1], y)

    canvas.setFont(friendly_bold, 11)
    draw_centered(canvas, "Date", x_positions[0], x_positions[1], table_top - 27)
    draw_centered(canvas, "Book Title", x_positions[1], x_positions[2], table_top - 27)
    draw_centered(canvas, "Minutes", x_positions[2], x_positions[3], table_top - 27)
    canvas.setFont(friendly_bold, 8.5)
    draw_centered(
        canvas, "Did I log my", x_positions[3], x_positions[4], table_top - 18
    )
    draw_centered(canvas, "minutes?", x_positions[3], x_positions[4], table_top - 31)

    for index, record in enumerate(rows):
        top = table_top - header_height - index * row_height
        baseline = top - row_height / 2 - 3.5
        canvas.setFont("Helvetica", 8.5)
        draw_centered(
            canvas, str(record["date"]), x_positions[0], x_positions[1], baseline
        )

        # Beanstack may contain multiple sessions for the same title and date.
        # Show each title once while retaining the combined minutes for that day.
        titles = list(dict.fromkeys(record["titles"]))
        title = " + ".join(titles)
        title_lines, title_size = wrap_to_fit(
            title, "Helvetica", 8.5, x_positions[2] - x_positions[1] - 12
        )
        canvas.setFont("Helvetica", title_size)
        leading = title_size + 1
        first_baseline = baseline + (len(title_lines) - 1) * leading / 2
        for line_index, line in enumerate(title_lines):
            canvas.drawString(
                x_positions[1] + 6,
                first_baseline - line_index * leading,
                line,
            )
        canvas.setFont("Helvetica-Bold", 8.5)
        draw_centered(
            canvas,
            str(record["minutes"]),
            x_positions[2],
            x_positions[3],
            baseline,
        )
        draw_centered(canvas, "Yes", x_positions[3], x_positions[4], baseline)


def draw_monthly_log(
    output: Path,
    name: str,
    teacher: str,
    grade: str,
    month: int,
    year: int,
    page_one_slots: int,
    page_two_slots: int,
    entries: list[dict[str, object]],
) -> None:
    friendly, friendly_bold = register_fonts()
    records: list[dict[str, object]] = []
    for entry in entries:
        date = datetime.strptime(str(entry["date"]), "%m/%d/%Y")
        if date.month != month or date.year != year:
            continue
        records.append(
            {
                "date": f"{month}/{date.day}",
                "date_sort": date,
                "titles": [str(entry["title"]).strip()],
                "minutes": int(entry["minutes"]),
            }
        )
    records.sort(key=lambda record: record["date_sort"])
    if not records:
        raise ValueError("No Beanstack entries found for the requested month")
    output.parent.mkdir(parents=True, exist_ok=True)
    canvas = Canvas(str(output), pagesize=(PAGE_WIDTH, PAGE_HEIGHT))
    canvas.setTitle(f"Beanstack Reading Log - {calendar.month_name[month]} {year}")
    canvas.setAuthor("Beanstack reading-log formatter")
    canvas.setStrokeColorRGB(0, 0, 0)
    canvas.setFillColorRGB(0, 0, 0)

    # Name and month lines.
    canvas.setFont(friendly, 11)
    canvas.drawString(26, 761, "Name")
    canvas.line(62, 758, 338, 758)
    identity = name
    if teacher:
        identity += f" ({teacher})"
    if grade:
        identity += f" - {grade}"
    canvas.setFont(friendly_bold, shrink_to_fit(identity, friendly_bold, 11, 264))
    canvas.drawString(68, 762, identity)

    canvas.setFont(friendly, 11)
    canvas.drawString(370, 761, "Month")
    canvas.line(414, 758, 586, 758)
    month_text = f"{calendar.month_name[month]} {year}"
    canvas.setFont(friendly_bold, 11)
    canvas.drawString(420, 762, month_text)

    # Main title and goal area.
    canvas.setFont(friendly_bold, 28)
    draw_centered(canvas, "Beanstack Reading Log", 70, 570, 706)

    goal_text = canvas.beginText(32, 609)
    goal_text.setFont(friendly_bold, 46)
    goal_text.setTextRenderMode(1)
    goal_text.textLine("GOAL")
    canvas.drawText(goal_text)

    # Text rendering mode persists in PDF graphics state. Reset it so only the
    # large GOAL label is outlined; all remaining text must be solid and legible.
    canvas._code.append("0 Tr")

    canvas.setLineWidth(1.8)
    canvas.circle(224, 637, 7, stroke=1, fill=0)
    canvas.circle(224, 601, 7, stroke=1, fill=0)
    canvas.setFont(friendly, 14)
    canvas.drawString(242, 631, "Read 20 minutes each night")
    canvas.drawString(242, 595, "Read 300 minutes by the end of the month")

    draw_table(
        canvas,
        rows=records[:page_one_slots],
        slot_count=page_one_slots,
        table_top=557,
        table_bottom=28,
        friendly_bold=friendly_bold,
    )

    # Add as many table-only continuation pages as the remaining sessions need.
    # Preserve at least one continuation sheet even when page 1 has spare room.
    remaining = records[page_one_slots:]
    continuation_pages = max(1, (len(remaining) + page_two_slots - 1) // page_two_slots)
    for page_index in range(continuation_pages):
        start = page_index * page_two_slots
        page_rows = remaining[start : start + page_two_slots]
        canvas.showPage()
        canvas.setStrokeColorRGB(0, 0, 0)
        canvas.setFillColorRGB(0, 0, 0)
        draw_table(
            canvas,
            rows=page_rows,
            slot_count=page_two_slots,
            table_top=764,
            table_bottom=28,
            friendly_bold=friendly_bold,
        )

    canvas.save()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--entries", type=Path, required=True)
    parser.add_argument("--name", required=True)
    parser.add_argument("--teacher", default="")
    parser.add_argument("--grade", default="")
    parser.add_argument("--month", type=int, required=True)
    parser.add_argument("--year", type=int, required=True)
    parser.add_argument("--page-one-slots", type=int, default=19)
    parser.add_argument("--page-two-slots", type=int, default=25)
    args = parser.parse_args()

    entries = json.loads(args.entries.read_text(encoding="utf-8"))
    draw_monthly_log(
        output=args.output,
        name=args.name,
        teacher=args.teacher,
        grade=args.grade,
        month=args.month,
        year=args.year,
        page_one_slots=args.page_one_slots,
        page_two_slots=args.page_two_slots,
        entries=entries,
    )


if __name__ == "__main__":
    main()
