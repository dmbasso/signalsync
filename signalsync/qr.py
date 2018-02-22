# coding=utf-8

import re
import cv2
import zbar
import numpy as np


payload_re = re.compile(
    r"(?P<time>\d+(?:\.\d+)?)"          # 1234 | 1234.56
    r"#(?P<csum>\w+)"                   # #3f
    r"(?:&(?P<period>\d+\.\d+))?"       # &16.7
    r"(?:\s+(?P<data>.*))?$"            # ' asdasd'
)


class VisualTimestampScanner:
    def __init__(self, path, qr_frames=None):
        self.source = cv2.VideoCapture(path)
        self.qr_frames = qr_frames or []
        self.current_frame = 0  # first frame index
        self.total_ranges = len(self.qr_frames)
        self.last_symbol = None
        self.last_msg = None
        self.detected_frames = []

    def close(self, show=False):
        self.source.release()
        if show:
            cv2.destroyAllWindows()

    def _next_frame(self):
        while self.qr_frames and self.current_frame >= self.qr_frames[0][1]:
            self.qr_frames.pop(0)
        ret, frame = self.source.read()
        if not ret:
            return None
        if not self.qr_frames or self.current_frame < self.qr_frames[0][0]:
            if self.qr_frames:
                self.range_first = True
                self.source.set(
                    cv2.cv.CV_CAP_PROP_POS_FRAMES, self.qr_frames[0][0]
                )
                self.current_frame = self.qr_frames[0][0]
            return frame
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape
        scanner = zbar.ImageScanner()
        scanner.parse_config('enable')
        image = zbar.Image(w, h, 'Y800', gray.tostring())
        if scanner.scan(image):
            for symbol in image:
                if self.last_symbol != symbol.data:
                    self.last_symbol = symbol.data
                    self.check_symbol(self.last_symbol)
        self.current_frame += 1
        return frame

    def check_symbol(self, sym):
        if "#" not in sym:
            # deprecated code, check for 1{4,5}.* timestamps
            if not sym.startswith(("14", "15")):
                return  # timestamp out of range, invalid code
            time = sym
            msg = None
        else:
            m = payload_re.match(sym)
            if not m:
                return  # invalid code
            time, csum, period, msg = m.groups()
            try:
                verification = sum(int(c) for c in time.replace(".", ""))
                if int(csum, 16) != verification:
                    return  # checksum mismatch, invalid code
            except ValueError:
                return  # checksum is not a number, invalid code
        print("%r, %d" % (float(time), self.current_frame))
        if self.range_first:
            self.range_first = False
            print("ignoring first frame in range: %d" % self.current_frame)
        else:
            # time is an absolute float timestamp string
            item = [float(time), self.current_frame, float(period or 0)]
            if msg and msg != self.last_msg:
                self.last_msg = msg
                item.append(msg)
            self.detected_frames.append(item)

    def status(self):
        if not self.qr_frames:
            return 1.
        blocks = 1 - float(len(self.qr_frames)) / self.total_ranges
        bpct = float(self.current_frame - self.qr_frames[0][0])
        blen = self.qr_frames[0][1] - self.qr_frames[0][0]
        bpct /= blen or 1  # users might create empty blocks
        return blocks + bpct / self.total_ranges

    def scan(self, show=False, wait_key=False):
        self.range_first = True
        # last_msg = None
        while self.source.isOpened() and self.qr_frames:
            frame = self._next_frame()
            if frame is None:
                break
            yield self.status()
            if show:
                cv2.putText(
                    frame, str(self.current_frame - 1), (20, 40),
                    cv2.FONT_HERSHEY_DUPLEX, 1, (0, 255, 255), 1
                )
                if self.detected_frames:
                    cv2.putText(
                        frame, "%.3f %d" % tuple(self.detected_frames[-1][:2]),
                        (220, 40), cv2.FONT_HERSHEY_DUPLEX, 1, (0, 255, 0), 1
                    )
                cv2.imshow('frame', frame)
                key = cv2.waitKey(0 if wait_key else 1)
                if key & 0xFF in (27, ord('q')):
                    yield False

    def overview(self):
        tot_frames = int(self.source.get(cv2.cv.CV_CAP_PROP_FRAME_COUNT))
        fps = int(self.source.get(cv2.cv.CV_CAP_PROP_FPS))
        start = None
        ranges = []
        scan = (
            b + o
            for b in range(0, tot_frames, 3 * fps)
            for o in range(3)
        )
        for frame_idx in scan:
            if start and frame_idx - start < 3:
                continue  # 3s segment already in range
            self.source.set(cv2.cv.CV_CAP_PROP_POS_FRAMES, frame_idx)
            ret, frame = self.source.read()
            if not ret:
                break
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            h, w = gray.shape
            scanner = zbar.ImageScanner()
            scanner.parse_config('enable')
            image = zbar.Image(w, h, 'Y800', gray.tostring())
            if scanner.scan(image):
                if start is None:
                    start = frame_idx
            elif start is not None:
                ranges.append((start, frame_idx))
                start = None
            cv2.imshow('frame', gray)
            key = cv2.waitKey(1)
            if key & 0xFF in (27, ord('q')):
                break
        if start is not None:
            ranges.append((start, frame_idx))
        self.qr_frames = [(max(s - 3 * fps, 0), e) for (s, e) in ranges]
        self.total_ranges = len(ranges)
        self.source.set(cv2.cv.CV_CAP_PROP_POS_FRAMES, 0)

    def calc_timing(self):
        if not self.detected_frames:
            print("no detected frames")
            self.period, self.t_0 = 0, 0
            return
        A = np.vstack([
            [float(p[1]) for p in self.detected_frames],
            np.ones(len(self.detected_frames))
        ])
        self.period, self.t_0 = np.linalg.lstsq(
            A.T, [p[0] for p in self.detected_frames],
        )[0]

    def dump_analysis(self):
        return {
            k: getattr(self, k) for k in "t_0 period detected_frames".split()
        }

    def load_analysis(self, dct):
        for k in "t_0 period detected_frames".split():
            setattr(self, k, dct.get(k))

    def dump_markers(self, relative=False):
        ref = 0 if not relative else self.t_0
        return "\n".join(
            "%d,%.3f" % (p[1], p[0] - ref) for p in self.detected_frames
        )


if __name__ == '__main__':
    import os
    import sys
    import json
    args = sys.argv[1:]
    show = "-s" in args
    if show:
        args.remove("-s")
    wait = "-w" in args
    if wait:
        args.remove("-w")
    force = "-f" in args
    if force:
        args.remove("-f")
    videos = []
    for fname in args:
        if not os.path.exists(fname):
            print("Path %r not found, ignored." % fname)
            continue
        if not os.path.isdir(fname):
            videos.append(fname)
            continue
        videos.extend(os.path.join(fname, sub) for sub in os.listdir(fname))
    if not videos:
        print("No valid path given, assuming current directory.")
        videos = os.listdir(".")
    for video in videos:
        if not video.lower().endswith((".mp4", "webm")):
            continue
        timings_path = video[:-4] + ".ts.json"
        if not force and os.path.exists(timings_path):
            print("'%s' has already been processed." % video)
            continue
        vts = VisualTimestampScanner(video)
        vts.overview()
        last_status = None
        for status in vts.scan(show, wait):
            if status is False:
                exit(1)
            if last_status != status:
                # print(status)
                last_status = status
        vts.calc_timing()
        with open(timings_path, 'w') as out:
            json.dump(vts.dump_analysis(), out)
