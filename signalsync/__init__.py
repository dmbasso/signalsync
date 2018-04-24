# -*- coding: utf-8 -*-

from .qr import VisualTimestampScanner  # noqa


def marker_ranges(csv, scan_label="QR", ui=False):
    frames = []
    begin = None
    for frame, label in csv:
        if label != scan_label:
            continue
        if begin is None:
            begin = frame
        else:
            frames.append((begin, frame))
            begin = None
    if begin is not None and ui:
        import subprocess as sp
        sp.check_output([
            "zenity", "--error", "--text",
            "Odd number of %s markers - make sure each "
            "range has start and stop markers." % label
        ])
    return frames if begin is None else False


def load_csv(fobj):
    """Load a list of <frame:int, label:str> pairs from a csv file"""
    csv_raw = (l.strip().split(",", 2) for l in fobj)
    retv = [(int(p[0]), p[1]) for p in csv_raw if len(p) == 2]
    retv.sort()
    return retv


def save_csv(fobj, lst):
    """Save a list of <timestamp:float, frame:float> pairs as a csv file"""
    fobj.write("\n".join("%f,%d" % tuple(p) for p in lst))
