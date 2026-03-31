import jsPDF from 'jspdf';

const readingLabels = {
    fasting: 'Fasting',
    breakfast: 'Breakfast',
    afterLunch: 'After lunch',
    afterDinner: 'After dinner',
};

const readingVariantStyle = (value, type) => {
    const num = Number(value);
    if (!value || Number.isNaN(num)) {
        return { fill: [241, 245, 249], text: [51, 65, 85] };
    }

    if (type === 'fasting') {
        if (num <= 90) return { fill: [236, 252, 231], text: [22, 101, 52] };
        if (num <= 110) return { fill: [254, 243, 199], text: [133, 77, 14] };
        return { fill: [254, 226, 230], text: [190, 24, 60] };
    }

    if (num <= 120) return { fill: [236, 252, 231], text: [22, 101, 52] };
    if (num <= 140) return { fill: [254, 243, 199], text: [133, 77, 14] };
    return { fill: [254, 226, 230], text: [190, 24, 60] };
};

const clampY = (doc, y, minDistance, pageHeight, margin) => {
    if (y + minDistance > pageHeight - margin) {
        doc.addPage();
        return margin;
    }
    return y;
};

const drawSectionHeader = (doc, title, margin, y) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(title, margin, y);
    return y + 18;
};

const drawReadingChip = (doc, x, y, width, record) => {
    const chipHeight = record ? 20 : 20;
    if (record) {
        const style = readingVariantStyle(record.reading_value, record.reading_type);
        // doc.setFillColor(...style.fill);
        // doc.setDrawColor(...style.fill);
        // doc.roundedRect(x, y, width, chipHeight, 5, 5, 'F');
        doc.setTextColor(...style.text);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(String(record.reading_value), x + 4, y + 12, { maxWidth: width - 8 });
        const details = [];
        if (record.reading_time) details.push(record.reading_time);
        if (record.insulin_dosage) details.push(record.insulin_dosage);
        // if (record.needle_changed) details.push('needle');
        if (details.length) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(71, 85, 105);
            doc.text(details.join(' • '), x + 4, y + 24, { maxWidth: width - 8 });
        }
    } else {
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text('-', x + 4, y + 12, { maxWidth: width - 8 });
    }
    return chipHeight;
};

const drawMealCell = (doc, x, y, width, record) => {
    const notes = record?.notes?.trim() || '-';
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    const lines = doc.splitTextToSize(notes, width - 6);
    doc.text(lines, x + 3, y + 12);
    return lines.length * 10 + 6;
};

const groupRecordsByDay = (records) => {
    const groups = new Map();
    const ordered = [...records].sort((a, b) => {
        if (a.record_date < b.record_date) return -1;
        if (a.record_date > b.record_date) return 1;
        if (a.reading_time < b.reading_time) return -1;
        if (a.reading_time > b.reading_time) return 1;
        return a.id - b.id;
    });

    ordered.forEach((record) => {
        const key = `${record.record_date}||${record.patient_name}`;
        if (!groups.has(key)) {
            groups.set(key, {
                record_date: record.record_date,
                patient_name: record.patient_name,
                reads: {},
            });
        }
        groups.get(key).reads[record.reading_type] = record;
    });

    return Array.from(groups.values()).sort((a, b) => {
        if (a.record_date > b.record_date) return 1;
        if (a.record_date < b.record_date) return -1;
        return a.patient_name.localeCompare(b.patient_name);
    });
};

export const generateDiabetesReportPdf = ({
    records,
    period,
    customStart,
    customEnd,
    patientFilter,
    recordTypeFilter,
    selectedStats,
}) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const margin = 36;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = margin;

    const today = new Date();
    const formatIso = (date) => date.toISOString().slice(0, 10);
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();

        return `${day}-${month}-${year}`;
    };
    const endLabel = period === 'custom' ? customEnd || formatIso(today) : formatIso(today);
    const startLabel = period === 'custom'
        ? customStart || '—'
        : period === 'week'
            ? formatIso(new Date(Date.now() - 6 * 86400000))
            : period === 'month'
                ? formatIso(new Date(Date.now() - 29 * 86400000))
                : records.length
                    ? records.reduce((min, record) => (record.record_date < min ? record.record_date : min), records[0].record_date)
                    : '—';
    const downloadName = patientFilter || 'All patients';
    const downloadType = recordTypeFilter ? (readingLabels[recordTypeFilter] || recordTypeFilter) : 'All types';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text('Diabetes Report', margin, y);
    y += 24;

    //   doc.setFont('helvetica', 'normal');
    //   doc.setFontSize(10);
    //   doc.setTextColor(71, 85, 105);
    //   doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
    //   y += 18;

    //   y = drawSectionHeader(doc, 'Report details', margin, y);
    //   y += 6;
    doc.setTextColor(55, 65, 81);
    doc.setFontSize(9);

    doc.text(
        `Start Date: ${startLabel}   |   End Date: ${endLabel}   |   Name: ${downloadName}   |   Type: ${downloadType}`,
        margin,
        y
    );

    y += 22;

    y = drawSectionHeader(doc, 'Insulin status changes', margin, y);
    y += 2;
    const insulinChanges = records.filter((record) => record.insulin_action && record.insulin_action !== 'none');
    if (!insulinChanges.length) {
        doc.setTextColor(71, 85, 105);
        doc.setFontSize(9);
        doc.text('No insulin changes recorded.', margin, y);
        y += 16;
    } else {
        insulinChanges.forEach((record) => {
            const line = `${formatDate(record.record_date)} ${record.reading_time || '00:00'} • ${readingLabels[record.reading_type] || record.reading_type}`;
            const action = `${record.insulin_action}${record.insulin_dosage ? ` ${record.insulin_dosage}` : ''}`;
            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text(line, margin, y);
            y += 12;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            const desc = doc.splitTextToSize(action, pageWidth - margin * 2);
            doc.text(desc, margin, y);
            y += desc.length * 10 + 8;
            y = clampY(doc, y, 30, pageHeight, margin);
        });
        y += 4;
    }

    y = drawSectionHeader(doc, 'Readings summary', margin, y);
    y += 2;
    Object.entries(selectedStats).forEach(([key, stat]) => {
        doc.setTextColor(71, 85, 105);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`${readingLabels[key]} — ${stat.low} - ${stat.high} (${stat.average})`, margin, y);
        y += 12;
    });
    y += 14;

    y = drawSectionHeader(doc, 'Records table', margin, y);
    y += 4;

    const grouped = groupRecordsByDay(records);
    const columns = [58, 58, 75, 58, 55, 58, 55, 58, 55];
    const headers = ['Date', 'Fasting', 'Last night meal', 'Breakfast', 'Meal', 'Lunch', 'Meal', 'Dinner', 'Meal'];
    let x = margin;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    headers.forEach((label, index) => {
        doc.text(label, x, y);
        x += columns[index];
    });
    y += 12;
    doc.setDrawColor(200);
    doc.setLineWidth(0.5);
    doc.line(margin, y - 4, margin + columns.reduce((sum, value) => sum + value, 0), y - 4);
    doc.setFont('helvetica', 'normal');

    grouped.forEach((group) => {
        const fasting = group.reads.fasting;
        const breakfast = group.reads.breakfast;
        const lunch = group.reads.afterLunch;
        const dinner = group.reads.afterDinner;
        const noteRecords = [fasting, breakfast, lunch, dinner];

        const mealHeights = noteRecords.map((record, noteIndex) => {
            const note = record?.notes?.trim() || 'No meal notes';
            const lines = doc.splitTextToSize(note, columns[2 + noteIndex * 2] - 6);
            return lines.length * 10 + 6;
        });
        const rowHeight = Math.max(32, ...mealHeights);
        y = clampY(doc, y, rowHeight + 10, pageHeight, margin);
        x = margin;

        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(formatDate(group.record_date), x, y + 10);
        x += columns[0];

        const readings = [fasting, breakfast, lunch, dinner];
        readings.forEach((record, index) => {
            drawReadingChip(doc, x, y - 6, columns[1 + index * 2], record);
            x += columns[1 + index * 2];
            drawMealCell(doc, x, y - 6, columns[2 + index * 2], record);
            x += columns[2 + index * 2];
        });

        y += rowHeight;
        doc.line(margin, y - 8, margin + columns.reduce((sum, value) => sum + value, 0), y - 8);
    });

    doc.save(`diabetes-report-${new Date().toISOString().slice(0, 10)}.pdf`);
};
