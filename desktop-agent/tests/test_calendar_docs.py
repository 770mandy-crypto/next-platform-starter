import datetime as dt

import pytest

import skills


@pytest.fixture(autouse=True)
def out_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(skills, "OUTPUT_DIR", tmp_path / "Agent")
    monkeypatch.setattr(skills, "SEARCH_DIRS", [tmp_path / "Documents"])
    monkeypatch.setattr(skills, "open_file", lambda p: None)
    (tmp_path / "Documents").mkdir()
    return tmp_path


ICS = """BEGIN:VCALENDAR
VERSION:2.0
PRODID:test
BEGIN:VEVENT
UID:1
DTSTART:{d}T090000
DTEND:{d}T100000
SUMMARY:פגישה עם רואה החשבון
LOCATION:תל אביב
END:VEVENT
BEGIN:VEVENT
UID:2
DTSTART;VALUE=DATE:{d}
SUMMARY:יום הולדת לאמא
RRULE:FREQ=YEARLY
END:VEVENT
END:VCALENDAR
"""


def test_calendar_needs_setup(monkeypatch):
    monkeypatch.delenv("CALENDAR_ICS_URL", raising=False)
    with pytest.raises(RuntimeError, match="not set up"):
        skills.calendar_list({})


def test_calendar_lists_hebrew_events(out_dir, monkeypatch):
    d = dt.date.today() + dt.timedelta(days=1)
    f = out_dir / "cal.ics"
    f.write_text(ICS.format(d=d.strftime("%Y%m%d")), encoding="utf-8")
    monkeypatch.setenv("CALENDAR_ICS_URL", str(f))
    out = skills.calendar_list({"days": 3})
    assert "פגישה עם רואה החשבון" in out and "תל אביב" in out and "09:00" in out
    assert "יום הולדת לאמא" in out and "all day" in out


def test_calendar_add_google_link(monkeypatch):
    monkeypatch.setenv("CALENDAR_PROVIDER", "google")
    out = skills.calendar_add({"title": "רופא שיניים", "start": "2026-12-01T10:30"}, open_after=False)
    assert "calendar.google.com" in out and "20261201T103000%2F20261201T113000" in out


def test_calendar_add_ics(out_dir, monkeypatch):
    import icalendar
    monkeypatch.setenv("CALENDAR_PROVIDER", "ics")
    skills.calendar_add({"title": "ישיבת צוות", "start": "2026-12-02T14:00", "end": "2026-12-02T15:30",
                         "location": "חדר 3"}, open_after=False)
    cal = icalendar.Calendar.from_ical((out_dir / "Agent" / "ישיבת צוות.ics").read_bytes())
    ev = cal.walk("VEVENT")[0]
    assert str(ev["SUMMARY"]) == "ישיבת צוות" and ev["DTEND"].dt.hour == 15


def test_calendar_rejects_backwards_event():
    with pytest.raises(ValueError):
        skills.calendar_add({"title": "x", "start": "2026-12-02T14:00", "end": "2026-12-02T13:00"}, open_after=False)


def test_write_then_read_hebrew_word_document(out_dir):
    skills.document_write({"filename": "סיכום פגישה", "title": "סיכום פגישה", "rtl": True, "sections": [
        {"heading": "החלטות", "paragraphs": ["הוחלט להשיק בינואר."], "bullets": ["לשלוח הצעת מחיר", "לקבוע פגישת המשך"]},
    ]}, open_after=False)
    path = out_dir / "Agent" / "סיכום פגישה.docx"
    assert path.exists()
    import docx
    p = [x for x in docx.Document(str(path)).paragraphs if x.text == "הוחלט להשיק בינואר."][0]
    assert p._p.pPr.find("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}bidi") is not None
    text = skills.document_read({"path": str(path)})
    assert "לשלוח הצעת מחיר" in text and "<document_content>" in text


def test_read_excel_and_pdf_and_text(out_dir):
    import openpyxl
    wb = openpyxl.Workbook()
    wb.active.append(["מוצר", "מחיר"])
    wb.active.append(["חולצה", 89])
    wb.save(out_dir / "Documents" / "מחירון.xlsx")
    assert "חולצה | 89" in skills.document_read({"path": "מחירון.xlsx"})

    from pypdf import PdfWriter
    w = PdfWriter()
    w.add_blank_page(200, 200)
    w.write(str(out_dir / "Documents" / "blank.pdf"))
    assert "[page 1]" in skills.document_read({"path": "blank.pdf"})

    (out_dir / "Documents" / "notes.txt").write_text("רשימת קניות: חלב, לחם", encoding="utf-8")
    assert "חלב" in skills.document_read({"path": "notes.txt"})


def test_file_search(out_dir):
    (out_dir / "Documents" / "חוזה שכירות.pdf").write_bytes(b"%PDF")
    (out_dir / "Documents" / "other.txt").write_text("x")
    out = skills.file_search({"name_contains": "חוזה"})
    assert "חוזה שכירות.pdf" in out and "other.txt" not in out
    assert "other.txt" in skills.file_search({"extension": "txt"})


def test_missing_document_is_clear_error():
    with pytest.raises(FileNotFoundError, match="file_search"):
        skills.document_read({"path": "nope.docx"})
