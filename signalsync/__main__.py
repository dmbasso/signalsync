# -*- coding: utf-8 -*-

import sys
from . import VisualTimestampScanner, marker_ranges, load_csv, save_csv


def decode(ranges, video):
    assert ranges.endswith(".csv")
    csv = load_csv(open(ranges))
    range_list = marker_ranges(csv)
    if not range_list:
        raise ValueError("Odd number of QR markers in dec-ranges (or 0)")
    vts = VisualTimestampScanner(video, range_list)
    for p in vts.scan():
        print("frame %d (%d%%)" % (vts.current_frame, int(p * 100)))
    out = open("decoded " + ranges, 'w')
    save_csv(out, vts.detected_frames)


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("python -m signalsync dec-ranges.csv movie.[mp4|avi|...]")
        exit(1)
    decode(*sys.argv[1:])
