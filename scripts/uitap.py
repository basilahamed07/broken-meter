#!/usr/bin/env python3
"""Tap or assert text on the Android screen using uiautomator. Usage: uitap.py tap|has|dump <text> [timeout]"""
import re, subprocess, sys, time, xml.etree.ElementTree as ET

def dump():
    subprocess.run(['adb', 'shell', 'uiautomator', 'dump', '/sdcard/ui.xml'], capture_output=True)
    out = subprocess.run(['adb', 'exec-out', 'cat', '/sdcard/ui.xml'], capture_output=True, text=True).stdout
    try:
        return ET.fromstring(out)
    except ET.ParseError:
        return None

def center(n):
    m = re.match(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]', n.get('bounds') or '')
    if m:
        x1, y1, x2, y2 = map(int, m.groups())
        return (x1 + x2) // 2, (y1 + y2) // 2
    return None

def find(root, text):
    nodes = list(root.iter('node'))
    # pass 1: exact text / content-desc match
    for n in nodes:
        if (n.get('text') or '') == text or (n.get('content-desc') or '') == text:
            c = center(n)
            if c:
                return c
    # pass 2: substring rule
    for n in nodes:
        t = n.get('text') or ''
        if text in t and len(t) < len(text) + 40:
            c = center(n)
            if c:
                return c
    return None

def find_exact(root, text):
    for n in root.iter('node'):
        if (n.get('text') or '') == text:
            c = center(n)
            if c:
                return c
    return None

def all_text(root):
    return [n.get('text') for n in root.iter('node') if n.get('text')]

mode = sys.argv[1]
if mode == 'dump':
    root = dump()
    print('\n'.join(all_text(root)) if root is not None else '(no ui dump)')
    sys.exit(0)
text = sys.argv[2]
timeout = int(sys.argv[3]) if len(sys.argv) > 3 else 20
end = time.time() + timeout
while time.time() < end:
    root = dump()
    if root is not None:
        if any("isn't responding" in (n.get('text') or '') for n in root.iter('node')):
            w = find_exact(root, 'Wait')
            if w:
                subprocess.run(['adb', 'shell', 'input', 'tap', str(w[0]), str(w[1])])
                time.sleep(1.5)
                continue
        pos = find(root, text)
        if pos:
            if mode == 'tap':
                subprocess.run(['adb', 'shell', 'input', 'tap', str(pos[0]), str(pos[1])])
            print(f'{mode} ok: {text!r} at {pos}')
            sys.exit(0)
    time.sleep(1.5)
print(f'{mode} FAILED: {text!r} not found. Screen text was:')
root = dump()
print('\n'.join(all_text(root)) if root is not None else '(no ui dump)')
sys.exit(1)
