# coding=utf-8

import cv2
import zbar


class VisualTimestampScanner:
    def __init__(self, path, qr_frames):
        self.source = cv2.VideoCapture(path)
        # self.tot_frames = self.source.get(cv2.cv.CV_CAP_PROP_FRAME_COUNT)
        self.qr_frames = qr_frames
        self.current_frame = 0
        self.total_ranges = len(qr_frames)
        self.last_symbol = None
        self.detected_frames = []

    def close(self, show=False):
        self.source.release()
        if show:
            cv2.destroyAllWindows()

    def _next_frame(self):
        while self.qr_frames and self.current_frame >= self.qr_frames[0][1]:
            self.qr_frames.pop(0)
        self.current_frame += 1
        ret, frame = self.source.read()
        if not ret:
            return None
        if not self.qr_frames or self.current_frame < self.qr_frames[0][0]:
            if self.qr_frames:
                self.source.set(
                    cv2.cv.CV_CAP_PROP_POS_FRAMES, self.qr_frames[0][0] - 1
                )
                # it will be incremented in the next read, consistent
                # with the starting index 1 in Blender
                self.current_frame = self.qr_frames[0][0] - 1
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
        return frame

    def check_symbol(self, sym):
        if "#" not in sym:
            # deprecated code, check for 1{4,5}.* timestamps
            if not sym.startswith(("14", "15")):
                return  # timestamp out of range, invalid code
        else:
            code, csum = sym.split("#", 1)
            try:
                verification = sum(int(c) for c in code.replace(".", ""))
                if int(csum, 16) != verification:
                    return  # checksum mismatch, invalid code
            except ValueError:
                return  # checksum is not a number, invalid code
            sym = code
        # sym is an absolute float timestamp string
        self.detected_frames.append((sym, self.current_frame))

    def status(self):
        if not self.qr_frames:
            return 1.
        blocks = 1 - float(len(self.qr_frames)) / self.total_ranges
        bpct = float(self.current_frame - self.qr_frames[0][0])
        blen = self.qr_frames[0][1] - self.qr_frames[0][0]
        bpct /= blen or 1  # users might create empty blocks
        return blocks + bpct / self.total_ranges

    def scan(self, show=False):
        while self.source.isOpened() and self.qr_frames:
            frame = self._next_frame()
            yield self.status()
            if show:
                cv2.imshow('frame', frame)
                key = cv2.waitKey(1)
                if key & 0xFF in (27, ord('q')):
                    break
        if self.detected_frames:
            # discard the first one, start from transition
            self.detected_frames.pop(0)
