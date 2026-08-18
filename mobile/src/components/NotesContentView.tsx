import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { useTheme, withAlpha } from '@/theme';
import type { NotesContent, Section } from '@/lib/handwrittenNotes';

/**
 * Renders the section vocabulary the notes edge function emits — the same ten
 * shapes handled by src/components/handwritten/HandwrittenNotesView.tsx.
 *
 * Memoized because the Notes screen re-renders on a timer while it generates.
 *
 * A big topic arrives in batches with a 25-second pace between them, and the
 * countdown ticks the screen's state throughout. `content` does not change
 * during those ticks, but without memo the whole section tree — tables,
 * flowcharts, every bullet — was rebuilt on each one. That is the most
 * expensive thing on screen re-rendering repeatedly on the cheap phones this
 * app targets, for a number that changes in a label above it.
 */
function NotesContentViewBase({ content }: { content: NotesContent }) {
  const { colors } = useTheme();

  return (
    <View style={styles.root}>
      {content.highYieldTip ? (
        <View
          style={[
            styles.tip,
            {
              backgroundColor: withAlpha(colors.warning, 0.1),
              borderColor: withAlpha(colors.warning, 0.4),
            },
          ]}>
          <Text style={[styles.tipLabel, { color: colors.warning }]}>HIGH-YIELD</Text>
          <Text style={[styles.tipText, { color: colors.text }]}>{content.highYieldTip}</Text>
        </View>
      ) : null}

      {content.pyqYears && content.pyqYears.length > 0 ? (
        <View style={styles.pyqRow}>
          {content.pyqYears.map(year => (
            <View
              key={year}
              style={[styles.pyqBadge, { borderColor: withAlpha(colors.fuchsia, 0.5) }]}>
              <Text style={[styles.pyqText, { color: colors.fuchsia }]}>{year}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {content.sections.map((section, index) => (
        <SectionBlock key={`${section.title}-${index}`} section={section} />
      ))}
    </View>
  );
}

function SectionBlock({ section }: { section: Section }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.sectionHeader}>
        {section.icon ? <Text style={styles.sectionIcon}>{section.icon}</Text> : null}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
      </View>
      {section.pyqYears && section.pyqYears.length > 0 ? (
        <Text style={[styles.sectionYears, { color: colors.textMuted }]}>
          Asked: {section.pyqYears.join(', ')}
        </Text>
      ) : null}
      <SectionBody section={section} />
    </View>
  );
}

function SectionBody({ section }: { section: Section }) {
  const { colors } = useTheme();
  const p = section.payload ?? {};
  const asStrings = (value: unknown): string[] =>
    Array.isArray(value) ? value.map(item => String(item)) : [];

  switch (section.type) {
    case 'definition':
      return (
        <View style={[styles.definition, { borderLeftColor: colors.fuchsia }]}>
          <Text style={[styles.body, { color: colors.text }]}>{String(p.text ?? '')}</Text>
        </View>
      );

    case 'text':
      return <Text style={[styles.body, { color: colors.text }]}>{String(p.paragraph ?? '')}</Text>;

    case 'bullets':
      return (
        <View>
          {asStrings(p.items).map((item, i) => (
            <View key={i} style={styles.bulletRow}>
              <Text style={[styles.bulletDot, { color: colors.fuchsia }]}>•</Text>
              <Text style={[styles.body, styles.flex, { color: colors.text }]}>{item}</Text>
            </View>
          ))}
        </View>
      );

    case 'steps':
      return (
        <View>
          {asStrings(p.items).map((item, i) => (
            <View key={i} style={styles.bulletRow}>
              <View style={[styles.stepNum, { backgroundColor: withAlpha(colors.fuchsia, 0.18) }]}>
                <Text style={[styles.stepNumText, { color: colors.fuchsia }]}>{i + 1}</Text>
              </View>
              <Text style={[styles.body, styles.flex, { color: colors.text }]}>{item}</Text>
            </View>
          ))}
        </View>
      );

    case 'morphology':
      return (
        <View>
          {p.subtitle ? (
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>{String(p.subtitle)}</Text>
          ) : null}
          {asStrings(p.items).map((item, i) => (
            <View key={i} style={styles.bulletRow}>
              <Text style={[styles.bulletDot, { color: colors.cyan }]}>›</Text>
              <Text style={[styles.body, styles.flex, { color: colors.text }]}>{item}</Text>
            </View>
          ))}
        </View>
      );

    case 'comparison': {
      const rows = Array.isArray(p.rows) ? (p.rows as Record<string, unknown>[]) : [];
      return (
        <View>
          <View style={[styles.compareHead, { borderBottomColor: colors.border }]}>
            <Text style={[styles.compareCell, styles.compareHeadText, { color: colors.cyan }]}>
              {String(p.left ?? '')}
            </Text>
            <Text style={[styles.compareCell, styles.compareHeadText, { color: colors.fuchsia }]}>
              {String(p.right ?? '')}
            </Text>
          </View>
          {rows.map((row, i) => (
            <View
              key={i}
              style={[
                styles.compareRow,
                // Same reasoning as the table: no rule under the final row.
                i === rows.length - 1 ? styles.tableRowLast : null,
                { borderBottomColor: colors.border },
              ]}>
              <Text style={[styles.compareCell, styles.body, { color: colors.text }]}>
                {String(row.left ?? '')}
              </Text>
              <Text style={[styles.compareCell, styles.body, { color: colors.text }]}>
                {String(row.right ?? '')}
              </Text>
            </View>
          ))}
        </View>
      );
    }

    case 'table':
      return (
        <TableSection
          columns={asStrings(p.columns)}
          rows={Array.isArray(p.rows) ? (p.rows as unknown[]) : []}
        />
      );

    case 'flowchart':
      return (
        <View>
          {asStrings(p.steps).map((step, i, all) => (
            <View key={i}>
              <View
                style={[
                  styles.flowStep,
                  { backgroundColor: colors.cardElevated, borderColor: colors.border },
                ]}>
                <Text style={[styles.body, { color: colors.text }]}>{step}</Text>
              </View>
              {i < all.length - 1 ? (
                <Text style={[styles.flowArrow, { color: colors.fuchsia }]}>↓</Text>
              ) : null}
            </View>
          ))}
        </View>
      );

    case 'outcome':
      return (
        <View
          style={[
            styles.outcome,
            {
              backgroundColor: withAlpha(colors.success, 0.1),
              borderColor: withAlpha(colors.success, 0.4),
            },
          ]}>
          <Text style={[styles.body, { color: colors.text }]}>{String(p.text ?? '')}</Text>
        </View>
      );

    case 'revision':
      return (
        <View>
          {asStrings(p.items).map((item, i) => (
            <View key={i} style={styles.bulletRow}>
              <Text style={[styles.bulletDot, { color: colors.warning }]}>★</Text>
              <Text style={[styles.body, styles.flex, { color: colors.text }]}>{item}</Text>
            </View>
          ))}
        </View>
      );

    default:
      // Unknown section types still show their text rather than vanishing.
      return (
        <Text style={[styles.body, { color: colors.textMuted }]}>
          {typeof p.text === 'string' ? p.text : JSON.stringify(p)}
        </Text>
      );
  }
}

/** Narrower than this and a cell like "12–24 h" starts wrapping mid-value. */
const MIN_COLUMN_WIDTH = 88;

/**
 * A table that fits renders as a grid; one that does not renders as records.
 *
 * The version before this gave every column a fixed 140dp inside a horizontal
 * ScrollView with the indicator switched off. On a 390dp phone the card is
 * 326dp wide, so the four-column cardiac-markers table — "Marker / Rises /
 * Peaks / Returns", a shape the notes function emits constantly — drew its
 * fourth column past the card edge with nothing on screen to suggest it was
 * there. "Returns: 7–10 days" is the single most examinable cell in that table
 * and it was invisible unless you guessed to swipe a table sideways.
 *
 * Horizontal scrolling inside a vertically scrolling page is the wrong fix. It
 * competes with the page's own gesture, hides content behind an affordance
 * people miss, and makes comparing two rows require scrubbing back and forth.
 * So when the columns cannot fit, the table stops being a table: each row
 * becomes a small record with its first cell as the heading and the rest as
 * label/value pairs. Every value is on screen, nothing scrolls sideways, and
 * the reading order is the one a screen reader would use anyway.
 *
 * Which layout applies is decided from the measured width, not the screen size
 * — the same table is a grid on a tablet and records on a cheap 5-inch phone,
 * which is the point (apple-design: adapt to the container, don't make the
 * person adapt to the content).
 *
 * Width arrives on the first layout pass, so the first render assumes the
 * stacked case. That is the safe way round: stacked is always readable, so a
 * frame of it before the grid appears costs nothing, whereas assuming a grid
 * and then clipping is the bug being fixed.
 */
function TableSection({ columns, rows }: { columns: string[]; rows: unknown[] }) {
  const { colors } = useTheme();
  const [width, setWidth] = React.useState(0);

  const count = Math.max(
    columns.length,
    ...rows.map(row => (Array.isArray(row) ? row.length : 1)),
    1,
  );
  const asGrid = width > 0 && count * MIN_COLUMN_WIDTH <= width;

  return (
    <View onLayout={event => setWidth(event.nativeEvent.layout.width)}>
      {asGrid ? (
        <View>
          {columns.length > 0 ? (
            <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
              {columns.map(column => (
                <Text
                  key={column}
                  style={[styles.tableCell, styles.tableHead, { color: colors.textMuted }]}>
                  {column}
                </Text>
              ))}
            </View>
          ) : null}
          {rows.map((row, i) => (
            <View
              key={i}
              style={[
                styles.tableRow,
                // No rule under the final row: it would fence the table off
                // from the card it already sits inside.
                i === rows.length - 1 ? styles.tableRowLast : null,
                { borderBottomColor: colors.border },
              ]}>
              {(Array.isArray(row) ? row.map(String) : [String(row)]).map((cell, j) => (
                <Text key={j} style={[styles.tableCell, styles.body, { color: colors.text }]}>
                  {cell}
                </Text>
              ))}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.records}>
          {rows.map((row, i) => {
            const cells = Array.isArray(row) ? row.map(String) : [String(row)];
            const [head, ...rest] = cells;
            return (
              <View
                key={i}
                style={[
                  styles.record,
                  { backgroundColor: colors.cardElevated, borderColor: colors.border },
                ]}>
                <Text style={[styles.recordHead, { color: colors.text }]}>{head}</Text>
                {rest.map((cell, j) => (
                  <View key={j} style={styles.recordRow}>
                    <Text style={[styles.recordLabel, { color: colors.textMuted }]}>
                      {columns[j + 1] ?? ''}
                    </Text>
                    <Text style={[styles.body, styles.flex, { color: colors.text }]}>{cell}</Text>
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 12,
  },
  flex: {
    flex: 1,
  },
  tip: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  tipLabel: {
    fontSize: 10,
    letterSpacing: 1.6,
    fontWeight: '700',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 21,
  },
  pyqRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pyqBadge: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  pyqText: {
    fontSize: 11,
    fontWeight: '600',
  },
  section: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionIcon: {
    fontSize: 18,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  sectionYears: {
    fontSize: 11,
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 6,
  },
  definition: {
    borderLeftWidth: 3,
    paddingLeft: 12,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  bulletDot: {
    fontSize: 15,
    lineHeight: 21,
  },
  stepNum: {
    height: 20,
    width: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumText: {
    fontSize: 11,
    fontWeight: '700',
  },
  compareHead: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 8,
    marginBottom: 8,
  },
  compareHeadText: {
    fontWeight: '700',
    fontSize: 13,
  },
  compareRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
  },
  compareCell: {
    flex: 1,
    paddingRight: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableCell: {
    flex: 1,
    paddingRight: 12,
  },
  records: {
    gap: 8,
  },
  record: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    gap: 2,
  },
  recordHead: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  recordLabel: {
    width: 78,
    fontSize: 12,
    fontWeight: '600',
    paddingTop: 2,
  },
  tableHead: {
    fontSize: 12,
    fontWeight: '700',
  },
  flowStep: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  flowArrow: {
    textAlign: 'center',
    fontSize: 18,
    marginVertical: 2,
  },
  outcome: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
});

export const NotesContentView = memo(NotesContentViewBase);
