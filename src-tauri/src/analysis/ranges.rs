//! Set operations on character ranges within one source. Ranges are half-open `[start, end)`.

pub type Range = (i64, i64);

/// Sorted, with overlapping or touching ranges joined and empty ones dropped.
pub fn merge(mut ranges: Vec<Range>) -> Vec<Range> {
    ranges.retain(|r| r.1 > r.0);
    ranges.sort_unstable();
    let mut out: Vec<Range> = Vec::with_capacity(ranges.len());
    for r in ranges {
        match out.last_mut() {
            Some(last) if r.0 <= last.1 => last.1 = last.1.max(r.1),
            _ => out.push(r),
        }
    }
    out
}

/// Text covered by both. Both inputs must already be merged.
pub fn intersect(a: &[Range], b: &[Range]) -> Vec<Range> {
    let (mut i, mut j, mut out) = (0, 0, Vec::new());
    while i < a.len() && j < b.len() {
        let start = a[i].0.max(b[j].0);
        let end = a[i].1.min(b[j].1);
        if start < end {
            out.push((start, end));
        }
        if a[i].1 < b[j].1 {
            i += 1;
        } else {
            j += 1;
        }
    }
    out
}

/// Text in `a` that `b` does not cover. Both inputs must already be merged.
pub fn subtract(a: &[Range], b: &[Range]) -> Vec<Range> {
    let mut out = Vec::new();
    let mut first = 0;
    for &(start, end) in a {
        while first < b.len() && b[first].1 <= start {
            first += 1;
        }
        let mut cursor = start;
        let mut k = first;
        while k < b.len() && b[k].0 < end {
            if b[k].0 > cursor {
                out.push((cursor, b[k].0));
            }
            cursor = cursor.max(b[k].1);
            k += 1;
        }
        if cursor < end {
            out.push((cursor, end));
        }
    }
    out
}

/// Stretches where a range of `a` lies within `gap` characters of `b`, each spanning both.
pub fn near(a: &[Range], b: &[Range], gap: i64) -> Vec<Range> {
    let mut out = Vec::new();
    for &(start, end) in a {
        let close: Vec<&Range> = b
            .iter()
            .filter(|r| r.0 <= end + gap && r.1 >= start - gap)
            .collect();
        if let (Some(lo), Some(hi)) = (
            close.iter().map(|r| r.0).min(),
            close.iter().map(|r| r.1).max(),
        ) {
            out.push((lo.min(start), hi.max(end)));
        }
    }
    merge(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    const A: &[Range] = &[(10, 30), (50, 60)];
    const B: &[Range] = &[(20, 40), (90, 100)];

    #[test]
    fn merges_overlapping_and_touching() {
        assert_eq!(
            merge(vec![(5, 8), (0, 3), (3, 5), (7, 9), (4, 4)]),
            vec![(0, 9)]
        );
    }

    #[test]
    fn combines_ranges() {
        assert_eq!(intersect(A, B), vec![(20, 30)]);
        assert_eq!(subtract(A, B), vec![(10, 20), (50, 60)]);
        assert_eq!(
            subtract(&[(0, 100)], &[(10, 20), (30, 40)]),
            vec![(0, 10), (20, 30), (40, 100)]
        );
        assert_eq!(near(A, B, 15), vec![(10, 60)]);
        assert_eq!(near(A, B, 5), vec![(10, 40)]);
        assert!(near(&[(0, 5)], B, 0).is_empty());
    }
}
